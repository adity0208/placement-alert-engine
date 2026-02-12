/**
 * Structured logging utility
 */

const LOG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS'
};

const COLORS = {
    INFO: '\x1b[36m',    // Cyan
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m',   // Red
    SUCCESS: '\x1b[32m', // Green
    RESET: '\x1b[0m'
};

/**
 * Format timestamp
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Log message with level and color
 */
function log(level, message, data = null) {
    const timestamp = getTimestamp();
    const color = COLORS[level] || COLORS.INFO;
    const reset = COLORS.RESET;

    let logMessage = `${color}[${timestamp}] [${level}]${reset} ${message}`;

    if (data) {
        logMessage += ` ${JSON.stringify(data)}`;
    }

    console.log(logMessage);
}

export const logger = {
    info: (message, data) => log(LOG_LEVELS.INFO, message, data),
    warn: (message, data) => log(LOG_LEVELS.WARN, message, data),
    error: (message, data) => log(LOG_LEVELS.ERROR, message, data),
    success: (message, data) => log(LOG_LEVELS.SUCCESS, message, data)
};

export default logger;
