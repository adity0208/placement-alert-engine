import { WebSocketServer } from 'ws';
import { logger } from './utils/logger.js';

let wss = null;
const clients = new Set();

/**
 * Initialize WebSocket server
 * @param {Object} server - HTTP server instance
 */
export function initWebSocket(server) {
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
        clients.add(ws);
        logger.success(`WebSocket client connected (Total: ${clients.size})`);

        // Send welcome message
        safeSend(ws, {
            type: 'connection',
            message: 'Connected to Placement Alert System',
            timestamp: new Date().toISOString()
        });

        // Handle incoming messages (ping/pong for keep-alive)
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                if (data.type === 'ping') {
                    safeSend(ws, { type: 'pong', timestamp: new Date().toISOString() });
                }
            } catch (error) {
                logger.error('Error parsing WebSocket message:', error.message);
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            clients.delete(ws);
            logger.info(`WebSocket client disconnected (Total: ${clients.size})`);
        });

        // Handle errors
        ws.on('error', (error) => {
            logger.error('WebSocket client error:', error.message);
            clients.delete(ws);
        });
    });

    // Keep-alive ping every 30 seconds
    setInterval(() => {
        cleanupDeadConnections();
    }, 30000);

    logger.success('WebSocket server initialized');
}

/**
 * Safely send message to a WebSocket client
 * @param {WebSocket} ws - WebSocket client
 * @param {Object} data - Data to send
 */
function safeSend(ws, data) {
    if (ws.readyState === ws.OPEN) {
        try {
            ws.send(JSON.stringify(data));
        } catch (error) {
            logger.error('Error sending to WebSocket client:', error.message);
            clients.delete(ws);
        }
    }
}

/**
 * Remove dead connections from the clients Set
 */
function cleanupDeadConnections() {
    const deadConnections = [];

    clients.forEach((ws) => {
        if (ws.readyState !== ws.OPEN) {
            deadConnections.push(ws);
        } else {
            // Send ping to keep connection alive
            try {
                ws.ping();
            } catch (error) {
                deadConnections.push(ws);
            }
        }
    });

    deadConnections.forEach((ws) => {
        clients.delete(ws);
    });

    if (deadConnections.length > 0) {
        logger.info(`Cleaned up ${deadConnections.length} dead connection(s)`);
    }
}

/**
 * Broadcast a new job to all connected clients
 * @param {Object} job - Job object to broadcast
 * @param {String} messageType - Type of message ('job' or 'notice')
 */
export function broadcast(job, messageType = 'job') {
    if (!wss) {
        logger.warn('WebSocket server not initialized');
        return;
    }

    const message = {
        type: messageType === 'job' ? 'new_job' : 'new_hackathon',
        data: job,
        timestamp: new Date().toISOString()
    };

    let successCount = 0;
    const deadConnections = [];

    clients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
            try {
                ws.send(JSON.stringify(message));
                successCount++;
            } catch (error) {
                logger.error('Error broadcasting to client:', error.message);
                deadConnections.push(ws);
            }
        } else {
            deadConnections.push(ws);
        }
    });

    // Clean up dead connections
    deadConnections.forEach((ws) => {
        clients.delete(ws);
    });

    logger.info(`Broadcasted ${messageType} to ${successCount}/${clients.size} client(s)`);
}

/**
 * Get current number of connected clients
 * @returns {number}
 */
export function getClientCount() {
    return clients.size;
}

export default { initWebSocket, broadcast, getClientCount };
