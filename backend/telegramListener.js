import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/NewMessage.js';
import { logger } from './utils/logger.js';
import Job from './models/Job.js';
import { broadcast } from './websocket.js';
import { parseJobMessage } from './aiParser.js';

let client = null;
let isConnected = false;
let reconnectAttempts = 0;
let eventHandlerAdded = false;
let hasHydrated = false; // Ensure hydration runs only once
const MAX_RECONNECT_DELAY = 60000; // 60 seconds

// Memory cache of resolved targets: { [chatId]: { id, sourceName, input } }
let resolvedTargets = {};

/**
 * Initialize and start Telegram listener
 */
export async function startTelegramListener() {
    const { API_ID, API_HASH, SESSION_STRING, TELEGRAM_TARGETS } = process.env;

    if (!API_ID || !API_HASH || !SESSION_STRING) {
        throw new Error('Missing Telegram credentials in environment variables');
    }

    if (!TELEGRAM_TARGETS) {
        throw new Error('TELEGRAM_TARGETS is required in environment variables');
    }

    try {
        await connectTelegram(parseInt(API_ID), API_HASH, SESSION_STRING, TELEGRAM_TARGETS);
    } catch (error) {
        logger.error('Failed to start Telegram listener:', error.message);
        scheduleReconnect(parseInt(API_ID), API_HASH, SESSION_STRING, TELEGRAM_TARGETS);
    }
}

/**
 * Resolve target channels/groups from config
 */
async function resolveTargets(targetsString) {
    const targets = targetsString.split(',').map(t => t.trim()).filter(Boolean);
    const map = {};

    for (const target of targets) {
        try {
            logger.info(`Resolving target entity: "${target}"...`);
            let queryTarget = target;
            if (/^-?\d+$/.test(target)) {
                queryTarget = Number(target);
            }

            const entity = await client.getEntity(queryTarget);
            const entityId = entity.id.toString();
            const sourceName = entity.title || entity.username || target;

            map[entityId] = {
                id: entityId,
                sourceName: sourceName,
                input: target
            };
            
            logger.success(`Resolved target: "${target}" -> ID: ${entityId} ("${sourceName}")`);
        } catch (error) {
            logger.error(`Failed to resolve Telegram target "${target}":`, error.message);
            // Fallback for numeric IDs if lookups fail (Dialogs not loaded)
            if (/^-?\d+$/.test(target)) {
                const cleanId = target.replace('-100', '');
                map[target] = {
                    id: target,
                    sourceName: `Group ${target}`,
                    input: target
                };
                map[cleanId] = map[target];
                logger.warn(`Registered fallback numeric target: ${target}`);
            }
        }
    }
    return map;
}

/**
 * Match incoming message chatId or peerId to a resolved target
 */
function findMatchedTarget(message) {
    if (!message) return null;

    const chatIdStr = message.chatId ? message.chatId.toString() : null;
    let peerIdStr = null;

    if (message.peerId) {
        const idVal = message.peerId.channelId || message.peerId.chatId || message.peerId.userId;
        peerIdStr = idVal ? idVal.toString() : null;
    }

    const candidateIds = [chatIdStr, peerIdStr].filter(Boolean);

    for (const cid of candidateIds) {
        if (resolvedTargets[cid]) {
            return resolvedTargets[cid];
        }
        
        // Handles negative variations
        const negCid = cid.startsWith('-') ? cid.substring(1) : '-' + cid;
        if (resolvedTargets[negCid]) {
            return resolvedTargets[negCid];
        }

        // Handles GramJS -100 offset variations
        const cleanCid = cid.replace('-100', '');
        const keys = Object.keys(resolvedTargets);
        for (const key of keys) {
            const cleanKey = key.replace('-100', '');
            if (cleanCid === cleanKey) {
                return resolvedTargets[key];
            }
        }
    }
    return null;
}

/**
 * Connect to Telegram
 */
async function connectTelegram(apiId, apiHash, sessionString, targetsString) {
    try {
        logger.info('Connecting to Telegram...');

        const session = new StringSession(sessionString);
        client = new TelegramClient(session, apiId, apiHash, {
            connectionRetries: 3,
            autoReconnect: false,
        });

        await client.connect();
        isConnected = true;
        reconnectAttempts = 0;

        logger.success('Telegram client connected');

        // Resolve targets in memory
        resolvedTargets = await resolveTargets(targetsString);

        // Add event handler only once
        if (!eventHandlerAdded) {
            client.addEventHandler(handleNewMessage, new NewMessage({}));
            eventHandlerAdded = true;
            logger.success('Telegram message listener registered');
        }

        // Hydrate database from Telegram target histories
        if (!hasHydrated) {
            hasHydrated = true;
            await hydrateFromHistory();
        }

        // Handle disconnection
        client.on('disconnected', () => {
            isConnected = false;
            logger.warn('Telegram client disconnected');
            scheduleReconnect(apiId, apiHash, sessionString, targetsString);
        });

    } catch (error) {
        isConnected = false;
        logger.error('Telegram connection error:', error.message);

        if (reconnectAttempts < 3) {
            throw error;
        } else {
            logger.warn('Telegram connection failed. App will continue without live updates.');
        }
    }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect(apiId, apiHash, sessionString, targetsString) {
    if (isConnected) return;

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
            await connectTelegram(apiId, apiHash, sessionString, targetsString);
        } catch (error) {
            scheduleReconnect(apiId, apiHash, sessionString, targetsString);
        }
    }, delay);
}

/**
 * Hydrate database from Telegram target message histories
 */
async function hydrateFromHistory() {
    try {
        logger.info('Hydration started');

        const uniqueTargets = Object.values(resolvedTargets).reduce((acc, current) => {
            const exists = acc.find(item => item.id === current.id);
            if (!exists) acc.push(current);
            return acc;
        }, []);

        let processedCount = 0;
        let jobsStored = 0;
        let hackathonsStored = 0;
        let aiParsedCount = 0; // Guard for free-tier Gemini API (max 3 total per startup)

        for (const target of uniqueTargets) {
            logger.info(`Hydrating from target: "${target.sourceName}" (ID: ${target.id})...`);

            let queryTarget = target.id;
            if (/^-?\d+$/.test(target.id)) {
                queryTarget = Number(target.id);
            } else if (target.input) {
                queryTarget = target.input;
            }

            let messages = [];
            try {
                messages = await client.getMessages(queryTarget, { limit: 50 }); // Fetch last 50 messages to cover 3-day active window
            } catch (err) {
                logger.error(`Failed to fetch messages for target "${target.sourceName}":`, err.message);
                continue;
            }

            logger.info(`Fetched ${messages.length} messages from "${target.sourceName}"`);

            for (const message of messages) {
                processedCount++;
                const messageText = message.message?.trim();
                const messageId = message.id;

                if (!messageText || messageText.length === 0) {
                    continue;
                }

                // Check duplicate check to prevent double parsing
                const existing = await Job.findOne({
                    telegramMessageId: messageId,
                    groupId: target.id
                });

                if (existing) {
                    logger.info(`[Hydration] Already processed message ${messageId} in group ${target.id}. Skipping.`);
                    continue;
                }

                // Determine whether to use high-fidelity AI parser or fast local fallback parser
                const useAI = (aiParsedCount < 3) && !!process.env.GEMINI_API_KEY;

                if (useAI) {
                    logger.info(`[Hydration] Slot ${aiParsedCount + 1}/3: Parsing message ${messageId} from "${target.sourceName}" via Gemini...`);
                } else {
                    logger.info(`[Hydration] Parsing message ${messageId} from "${target.sourceName}" via Local Fallback...`);
                }

                const parsed = await parseJobMessage(messageText, !useAI);

                if (parsed && parsed.type !== 'other') {
                    // Check for duplicate job/hackathon links across channels
                    if (parsed.applyLink) {
                        const existingLink = await Job.findOne({
                            applyLink: parsed.applyLink,
                            type: parsed.type
                        });
                        if (existingLink) {
                            logger.info(`[Hydration] Duplicate ${parsed.type} link detected: ${parsed.applyLink}. Skipping.`);
                            continue;
                        }
                    }
                    const jobData = {
                        type: parsed.type, // 'job' or 'hackathon'
                        title: parsed.type === 'job' 
                            ? `${parsed.companyName} is hiring for ${parsed.jobRole || 'Role'}`
                            : parsed.title,
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
                        sourceName: target.sourceName,
                        groupId: target.id,
                        telegramMessageId: messageId,
                        isAIParsed: useAI
                    };

                    try {
                        const item = new Job(jobData);
                        await item.save();
                        
                        if (parsed.type === 'job') jobsStored++;
                        else hackathonsStored++;

                        logger.info(`[Hydration] Saved ${parsed.type}: "${jobData.title}" (AI Parsed: ${useAI})`);
                    } catch (error) {
                        if (error.code !== 11000) {
                            logger.error(`Error saving message ${messageId}:`, error.message);
                        }
                    }

                    if (useAI) {
                        aiParsedCount++;
                        // Rate limit wait window
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }
            }
        }

        logger.success(`\n========== HYDRATION SUMMARY ==========`);
        logger.success(`Total messages processed: ${processedCount}`);
        logger.success(`Total jobs saved: ${jobsStored}`);
        logger.success(`Total hackathons saved: ${hackathonsStored}`);
        logger.success(`=======================================\n`);

    } catch (error) {
        logger.error('Hydration failed:', error.message);
    }
}

/**
 * Handle incoming Telegram messages in real-time
 */
async function handleNewMessage(event) {
    try {
        const message = event.message;
        const messageText = message.message?.trim();
        const messageId = message.id;

        if (!messageText || messageText.length === 0) return;

        // Find matched target
        const matched = findMatchedTarget(message);
        if (!matched) {
            logger.info(`[Real-time] Skipping message ${messageId}: not from any target target`);
            return;
        }

        logger.info(`[Real-time] New message from target "${matched.sourceName}" (ID: ${messageId})`);

        // Check if already processed
        const existing = await Job.findOne({
            telegramMessageId: messageId,
            groupId: matched.id
        });

        if (existing) {
            logger.warn(`[Real-time] Duplicate message ${messageId} detected in group ${matched.id}. Skipping.`);
            return;
        }

        // Call Gemini AI parser to classify and parse
        logger.info(`[Real-time] Classifying message ${messageId} via Gemini AI...`);
        const parsed = await parseJobMessage(messageText);

        if (parsed.type === 'other') {
            logger.info(`[Real-time] Message classified as "other". Discarding.`);
            return;
        }

        // Check for duplicate job/hackathon links across channels
        if (parsed.applyLink) {
            const existingLink = await Job.findOne({
                applyLink: parsed.applyLink,
                type: parsed.type
            });
            if (existingLink) {
                logger.warn(`[Real-time] Duplicate ${parsed.type} link detected: ${parsed.applyLink}. Skipping.`);
                return;
            }
        }

        const jobData = {
            type: parsed.type, // 'job' or 'hackathon'
            title: parsed.type === 'job' 
                ? `${parsed.companyName} is hiring for ${parsed.jobRole || 'Role'}`
                : parsed.title,
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
            sourceName: matched.sourceName,
            groupId: matched.id,
            telegramMessageId: messageId,
            isAIParsed: true
        };

        const newDoc = new Job(jobData);
        await newDoc.save();

        logger.success(`[Real-time] Saved parsed ${parsed.type} to DB (ID: ${newDoc._id})`);

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
            isAIParsed: newDoc.isAIParsed
        }, parsed.type);

    } catch (error) {
        logger.error('Error handling real-time message:', error.message);
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
