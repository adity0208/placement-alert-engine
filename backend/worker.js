import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
dotenv.config();

import { getRedisClient, closeRedis } from './lib/redis.js';
import { parseJobMessage } from './aiParser.js';
import { broadcast } from './websocket.js';
import Job from './models/Job.js';
import { logger } from './utils/logger.js';
import { QUEUE_NAME, closeQueue } from './lib/queue.js';
import { noticesIngestedTotal } from './lib/metrics.js';
import { startTelegramListener, stopTelegramListener } from './telegramListener.js';

/**
 * Process a single parse-message job from the BullMQ queue
 */
async function processMessage(job) {
  const { messageText, messageId, groupId, sourceName } = job.data;

  logger.info(`[Worker] Processing job ${job.id} — message ${messageId} from "${sourceName}"`);

  // Duplicate check (belt-and-suspenders; telegramListener already checks)
  const existing = await Job.findOne({ telegramMessageId: messageId, groupId });
  if (existing) {
    logger.info(`[Worker] Duplicate message ${messageId} in group ${groupId}. Skipping.`);
    return { skipped: true, reason: 'duplicate' };
  }

  // AI parse (Gemini → Groq → local regex)
  const parsed = await parseJobMessage(messageText);

  if (parsed.type === 'other') {
    logger.info(`[Worker] Message ${messageId} classified as "other". Discarding.`);
    return { skipped: true, reason: 'other' };
  }

  // Cross-channel link dedup
  if (parsed.applyLink) {
    const existingLink = await Job.findOne({ applyLink: parsed.applyLink, type: parsed.type });
    if (existingLink) {
      logger.info(`[Worker] Duplicate ${parsed.type} link: ${parsed.applyLink}. Skipping.`);
      return { skipped: true, reason: 'duplicate_link' };
    }
  }

  const resolvedTitle = parsed.type === 'job'
    ? ((parsed.jobRole && !/^(null|undefined|role)$/i.test(parsed.jobRole.trim())) ? parsed.jobRole.trim()
       : (parsed.companyName && !/^(null|undefined|placement opportunity)$/i.test(parsed.companyName.trim())) ? parsed.companyName.trim()
       : (parsed.title && !/^(null|undefined|job opportunity)$/i.test(parsed.title.trim()) && !/\bis hiring for\b/i.test(parsed.title)) ? parsed.title.trim()
       : 'Job Opportunity')
    : ((parsed.title && !/^(null|undefined)$/i.test(parsed.title.trim())) ? parsed.title.trim() : 'Hackathon Event');

  const jobData = {
    type: parsed.type,
    title: resolvedTitle,
    message: messageText,
    link: parsed.applyLink,
    companyName: parsed.companyName,
    jobRole: parsed.jobRole,
    deadline: parsed.deadline,
    applyLink: parsed.applyLink,
    eligibility: parsed.eligibility,
    experience: parsed.experience,
    targetBatch: parsed.targetBatch,
    organizer: parsed.organizer,
    prizePool: parsed.prizePool,
    sourceName,
    groupId,
    telegramMessageId: messageId,
    isAIParsed: true,
  };

  const newDoc = new Job(jobData);
  await newDoc.save();

  // Increment Prometheus metrics
  noticesIngestedTotal.inc({
    type: parsed.type,
    source: parsed.companyName ? 'gemini' : 'local'
  });

  logger.success(`[Worker] Saved ${parsed.type} "${jobData.title}" (job ${job.id})`);

  // Broadcast to WebSocket clients
  broadcast({
    _id: newDoc._id,
    type: newDoc.type,
    title: newDoc.title,
    message: newDoc.message,
    link: newDoc.link,
    createdAt: newDoc.createdAt,
    expiresAt: newDoc.expiresAt,
    timeRemaining: newDoc.timeRemaining,
    companyName: newDoc.companyName,
    jobRole: newDoc.jobRole,
    deadline: newDoc.deadline,
    applyLink: newDoc.applyLink,
    eligibility: newDoc.eligibility,
    experience: newDoc.experience,
    targetBatch: newDoc.targetBatch,
    organizer: newDoc.organizer,
    prizePool: newDoc.prizePool,
    sourceName: newDoc.sourceName,
    groupId: newDoc.groupId,
    isAIParsed: newDoc.isAIParsed,
  }, parsed.type);

  return { saved: true, type: parsed.type, id: newDoc._id };
}

let workerInstance = null;

export function startWorker() {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(QUEUE_NAME, processMessage, {
    connection: getRedisClient(),
    concurrency: parseInt(process.env.BULL_CONCURRENCY || '3', 10),
  });

  workerInstance.on('completed', (job, result) => {
    logger.success(`[Worker] Job ${job.id} completed: ${JSON.stringify(result)}`);
  });

  workerInstance.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
  });

  workerInstance.on('error', (err) => {
    logger.error('[Worker] Worker error:', err.message);
  });

  logger.success(`BullMQ worker started (concurrency: ${process.env.BULL_CONCURRENCY || 3})`);
  return workerInstance;
}

export async function stopWorker() {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    logger.info('BullMQ worker stopped');
  }
}

// Standalone runner for single-replica Kubernetes worker deployment
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  async function runStandaloneWorker() {
    try {
      logger.info('Starting standalone placement ingestion worker...');
      if (!process.env.MONGODB_URI) {
        logger.error('MONGODB_URI required for standalone worker');
        process.exit(1);
      }
      await mongoose.connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });
      logger.success('Worker connected to MongoDB');

      startWorker();

      // Start Telegram listener if credentials exist
      if (process.env.SESSION_STRING && process.env.API_ID) {
        startTelegramListener().catch(err => {
          logger.error('Worker telegram listener failed:', err.message);
        });
      } else {
        logger.warn('Worker: No Telegram credentials provided; listening to BullMQ queue only');
      }

      const shutdown = async (signal) => {
        logger.info(`Worker received ${signal}, shutting down...`);
        await stopTelegramListener().catch(() => {});
        await stopWorker().catch(() => {});
        await closeQueue().catch(() => {});
        await closeRedis().catch(() => {});
        await mongoose.connection.close().catch(() => {});
        process.exit(0);
      };

      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
    } catch (err) {
      logger.error('Failed to run standalone worker:', err.message);
      process.exit(1);
    }
  }

  runStandaloneWorker();
}

export default { startWorker, stopWorker };
