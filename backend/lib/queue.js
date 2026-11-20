import { Queue } from 'bullmq';
import { getRedisClient } from './redis.js';
import { logger } from '../utils/logger.js';

const QUEUE_NAME = 'parse-message';

let messageQueue = null;

export function getMessageQueue() {
  if (!messageQueue) {
    messageQueue = new Queue(QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
    logger.success(`BullMQ queue "${QUEUE_NAME}" initialized`);
  }
  return messageQueue;
}

export async function enqueueMessage(payload) {
  const queue = getMessageQueue();
  const job = await queue.add('parse', payload, {
    jobId: `${payload.groupId}-${payload.messageId}`, // Idempotent job ID
  });
  logger.info(`Enqueued message job ${job.id} from group ${payload.groupId}`);
  return job;
}

export async function closeQueue() {
  if (messageQueue) {
    await messageQueue.close();
    messageQueue = null;
    logger.info('BullMQ queue closed');
  }
}

export { QUEUE_NAME };
