import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/NewMessage.js';
import { filterMessage } from './utils/filter.js';
import { logger } from './utils/logger.js';
import Job from './models/Job.js';
import { broadcast } from './websocket.js';

let client = null;
let isConnected = false;
let reconnectAttempts = 0;
let eventHandlerAdded = false;
let hasHydrated = false; // Ensure hydration runs only once
const MAX_RECONNECT_DELAY = 60000; // 60 seconds

/**
 * Initialize and start Telegram listener
 */
export async function startTelegramListener() {
    const { API_ID, API_HASH, SESSION_STRING, TELEGRAM_GROUP_ID } = process.env;

    if (!API_ID || !API_HASH || !SESSION_STRING) {
        throw new Error('Missing Telegram credentials in environment variables');
    }

    if (!TELEGRAM_GROUP_ID) {
        throw new Error('TELEGRAM_GROUP_ID is required in environment variables');
    }

    // Validate and convert TELEGRAM_GROUP_ID
    const groupId = Number(TELEGRAM_GROUP_ID);
    if (isNaN(groupId)) {
        throw new Error(`Invalid TELEGRAM_GROUP_ID: ${TELEGRAM_GROUP_ID}. Must be a valid number.`);
    }

    logger.info(`Telegram group ID resolved: ${groupId}`);

    try {
        await connectTelegram(parseInt(API_ID), API_HASH, SESSION_STRING, groupId);
    } catch (error) {
        logger.error('Failed to start Telegram listener:', error.message);
        scheduleReconnect(parseInt(API_ID), API_HASH, SESSION_STRING, groupId);
    }
}

/**
 * Connect to Telegram
 */
async function connectTelegram(apiId, apiHash, sessionString, groupId) {
    try {
        logger.info('Connecting to Telegram...');

        const session = new StringSession(sessionString);
        client = new TelegramClient(session, apiId, apiHash, {
            connectionRetries: 3, // Reduced from 5 to fail faster
            autoReconnect: false, // Disable auto-reconnect to prevent error spam
        });

        await client.connect();
        isConnected = true;
        reconnectAttempts = 0;

        logger.success('Telegram client connected');

        // Add event handler only once
        if (!eventHandlerAdded) {
            client.addEventHandler((event) => handleNewMessage(event, groupId), new NewMessage({}));
            eventHandlerAdded = true;
            logger.success('Telegram message listener registered');
        }

        // Hydrate from history only once on initial startup
        if (!hasHydrated) {
            hasHydrated = true;
            await hydrateFromHistory(groupId);
        }

        // Handle disconnection
        client.on('disconnected', () => {
            isConnected = false;
            logger.warn('Telegram client disconnected');
            scheduleReconnect(apiId, apiHash, sessionString, groupId);
        });

    } catch (error) {
        isConnected = false;
        logger.error('Telegram connection error:', error.message);

        // Don't spam logs with connection errors
        if (reconnectAttempts < 3) {
            throw error; // Only throw on first few attempts
        } else {
            logger.warn('Telegram connection failed. App will continue without live updates.');
        }
    }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect(apiId, apiHash, sessionString, groupId) {
    if (isConnected) return;

    // Stop trying after 5 failed attempts
    if (reconnectAttempts >= 5) {
        logger.warn('Max reconnection attempts reached. Telegram features disabled. App will continue serving API.');
        return;
    }

    const delay = Math.min(
        1000 * Math.pow(2, reconnectAttempts),
        MAX_RECONNECT_DELAY
    );

    reconnectAttempts++;

    logger.info(`Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/5)...`);

    setTimeout(async () => {
        try {
            await connectTelegram(apiId, apiHash, sessionString, groupId);
        } catch (error) {
            scheduleReconnect(apiId, apiHash, sessionString, groupId);
        }
    }, delay);
}

/**
 * Hydrate database from Telegram message history
 * Fetches last 50 messages and stores them as jobs or notices
 * @param {Number} targetGroupId - Target group ID
 */
async function hydrateFromHistory(targetGroupId) {
    try {
        logger.info('Hydration started');

        // Fetch last 50 messages from the group
        const messages = await client.getMessages(targetGroupId, { limit: 50 });

        logger.info(`Fetched ${messages.length} messages from Telegram`);

        // Print last 7 messages for debugging
        console.log('\n========== LAST 7 MESSAGES FROM TELEGRAM ==========');
        const last7 = messages.slice(0, 7);
        last7.forEach((msg, index) => {
            if (msg.message) {
                console.log(`\n--- Message ${index + 1} (ID: ${msg.id}) ---`);
                console.log(msg.message.substring(0, 200) + (msg.message.length > 200 ? '...' : ''));
            }
        });
        console.log('\n===================================================\n');

        let processedCount = 0;
        let jobsStored = 0;
        let noticesStored = 0;

        for (const message of messages) {
            processedCount++;

            // Use message.message instead of message.text (GramJS property)
            const messageText = message.message?.trim();
            const messageId = message.id;

            // Debug log for each message
            logger.info(`[Hydration] Message ${messageId}: type=${typeof message.message}, length=${messageText?.length || 0}`);

            // Skip if no message text or empty
            if (!messageText || messageText.length === 0) {
                logger.warn(`[Hydration] Skipping message ${messageId}: empty or no text`);
                continue;
            }

            // No need to verify chatId - client.getMessages(targetGroupId) already filters by group

            // Check if message passes job filter
            const filteredJob = filterMessage(messageText);

            // ALWAYS store as notice (no filtering for notices)
            const noticeData = {
                type: 'notice',
                title: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''),
                message: messageText,
                link: null,
                telegramMessageId: messageId,
                groupId: Math.abs(targetGroupId),
                expiresAt: null
            };

            // Save notice to MongoDB
            try {
                const notice = new Job(noticeData);
                await notice.save();
                noticesStored++;
                logger.info(`[Hydration] Notice saved: ID=${messageId}`);
            } catch (error) {
                // Skip duplicates silently
                if (error.code !== 11000) {
                    logger.error(`Error storing notice ${messageId}:`, error.message);
                } else {
                    logger.warn(`[Hydration] Duplicate notice skipped: ID=${messageId}`);
                }
            }

            // If message also passes job filter, store it as a job too
            if (filteredJob) {
                const jobData = {
                    type: 'job',
                    ...filteredJob,
                    telegramMessageId: messageId + 1000000, // Different ID to avoid duplicate key error
                    groupId: Math.abs(targetGroupId)
                };

                try {
                    const job = new Job(jobData);
                    await job.save();
                    jobsStored++;
                    logger.info(`[Hydration] Job saved: ID=${messageId}`);
                } catch (error) {
                    if (error.code !== 11000) {
                        logger.error(`Error storing job ${messageId}:`, error.message);
                    } else {
                        logger.warn(`[Hydration] Duplicate job skipped: ID=${messageId}`);
                    }
                }
            }
        }

        // Keep only last 7 notices
        await cleanupOldNotices();

        logger.success(`\n========== HYDRATION SUMMARY ==========`);
        logger.success(`Total messages fetched: ${messages.length}`);
        logger.success(`Total messages processed: ${processedCount}`);
        logger.success(`Total notices saved: ${noticesStored}`);
        logger.success(`Total jobs saved: ${jobsStored}`);
        logger.success(`=======================================\n`);

    } catch (error) {
        logger.error('Hydration failed:', error.message);
        // Don't crash - continue with normal operation
    }
}

/**
 * Clean up old notices, keeping only the last 7
 */
async function cleanupOldNotices() {
    try {
        const notices = await Job.find({ type: 'notice' })
            .sort({ createdAt: -1 })
            .skip(7);

        if (notices.length > 0) {
            const idsToDelete = notices.map(n => n._id);
            await Job.deleteMany({ _id: { $in: idsToDelete } });
            logger.info(`Cleaned up ${notices.length} old notice(s)`);
        }
    } catch (error) {
        logger.error('Error cleaning up notices:', error.message);
    }
}

/**
 * Handle incoming Telegram messages
 * @param {Object} event - Telegram message event
 * @param {Number} targetGroupId - Target group ID to filter
 */
async function handleNewMessage(event, targetGroupId) {
    try {
        const message = event.message;

        // Use message.message instead of message.text (GramJS property)
        const messageText = message.message?.trim();
        const messageId = message.id;

        // Debug log
        logger.info(`[Real-time] Message ${messageId}: type=${typeof message.message}, length=${messageText?.length || 0}`);

        // Skip if no message text or empty
        if (!messageText || messageText.length === 0) {
            logger.warn(`[Real-time] Skipping message ${messageId}: empty or no text`);
            return;
        }

        // Filter by group ID
        const chatId = message.chatId?.value || message.peerId?.channelId?.value;
        if (!chatId || Number(chatId) !== Math.abs(targetGroupId)) {
            logger.warn(`[Real-time] Skipping message ${messageId}: not from target group`);
            return; // Not from target group
        }

        logger.info(`[Real-time] New message from target group (ID: ${messageId})`);

        // ALWAYS store as notice (no filtering for notices)
        const noticeData = {
            type: 'notice',
            title: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''),
            message: messageText,
            link: null,
            telegramMessageId: messageId,
            groupId: Math.abs(targetGroupId),
            expiresAt: null
        };

        // Save notice to database
        try {
            const notice = new Job(noticeData);
            await notice.save();

            logger.success(`Notice saved to database (ID: ${notice._id})`);

            // Broadcast notice to WebSocket clients
            broadcast({
                _id: notice._id,
                type: notice.type,
                title: notice.title,
                message: notice.message,
                link: notice.link,
                createdAt: notice.createdAt,
                expiresAt: notice.expiresAt,
                timeRemaining: notice.timeRemaining
            }, 'notice');

            // Cleanup old notices (keep only last 7)
            await cleanupOldNotices();

        } catch (error) {
            // Handle duplicate key error (code 11000)
            if (error.code === 11000) {
                logger.warn(`Duplicate notice detected (Message ID: ${messageId}), skipping...`);
            } else {
                logger.error('Error saving notice to database:', error.message);
            }
        }

        // Check if message also passes job filter
        const filteredJob = filterMessage(messageText);

        if (filteredJob) {
            // Also store as job
            const jobData = {
                type: 'job',
                ...filteredJob,
                telegramMessageId: messageId + 1000000, // Different ID to avoid duplicate key error
                groupId: Math.abs(targetGroupId)
            };

            try {
                const job = new Job(jobData);
                await job.save();

                logger.success(`Job saved to database (ID: ${job._id})`);

                // Broadcast job to WebSocket clients
                broadcast({
                    _id: job._id,
                    type: job.type,
                    title: job.title,
                    message: job.message,
                    link: job.link,
                    createdAt: job.createdAt,
                    expiresAt: job.expiresAt,
                    timeRemaining: job.timeRemaining
                }, 'job');

            } catch (error) {
                if (error.code === 11000) {
                    logger.warn(`Duplicate job detected (Message ID: ${messageId}), skipping...`);
                } else {
                    logger.error('Error saving job to database:', error.message);
                }
            }
        }

    } catch (error) {
        logger.error('Error handling message:', error.message);
    }
}

/**
 * Gracefully disconnect Telegram client
 */
export async function stopTelegramListener() {
    if (client && isConnected) {
        logger.info('Disconnecting Telegram client...');
        await client.disconnect();
        isConnected = false;
        logger.success('Telegram client disconnected');
    }
}

export default { startTelegramListener, stopTelegramListener };
