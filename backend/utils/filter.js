/**
 * Filter and validate Telegram messages for job-related content
 */

// Keywords that indicate a job posting
const JOB_KEYWORDS = ['apply', 'portal', 'deadline', 'drive', 'registration', 'hiring', 'opportunity', 'vacancy'];

// Keywords that indicate rejection/selection (not job postings)
const REJECT_KEYWORDS = ['selected', 'shortlisted', 'congratulations', 'congrats', 'rejected', 'not selected'];

/**
 * Extract URLs from message text
 * @param {string} text - Message text
 * @returns {string|null} - First URL found or null
 */
function extractURL(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlRegex);
    return matches ? matches[0] : null;
}

/**
 * Check if message contains job-related keywords
 * @param {string} text - Message text (lowercase)
 * @returns {boolean}
 */
function hasJobKeywords(text) {
    return JOB_KEYWORDS.some(keyword => text.includes(keyword));
}

/**
 * Check if message contains rejection keywords
 * @param {string} text - Message text (lowercase)
 * @returns {boolean}
 */
function hasRejectKeywords(text) {
    return REJECT_KEYWORDS.some(keyword => text.includes(keyword));
}

/**
 * Generate a title from message text
 * @param {string} text - Message text
 * @returns {string} - Generated title (first 100 chars)
 */
function generateTitle(text) {
    // Take first line or first 100 characters
    const firstLine = text.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 97) + '...' : firstLine;
}

/**
 * Filter and process a Telegram message
 * @param {string} messageText - Raw message text
 * @returns {Object|null} - Processed job object or null if rejected
 */
export function filterMessage(messageText) {
    if (!messageText || typeof messageText !== 'string') {
        return null;
    }

    const text = messageText.trim();
    const textLower = text.toLowerCase();

    // Reject if contains rejection keywords
    if (hasRejectKeywords(textLower)) {
        console.log('❌ Message rejected: Contains rejection keywords');
        return null;
    }

    // Extract URL
    const url = extractURL(text);

    // Accept if has URL OR job keywords
    const hasURL = url !== null;
    const hasKeywords = hasJobKeywords(textLower);

    if (!hasURL && !hasKeywords) {
        console.log('❌ Message rejected: No URL or job keywords');
        return null;
    }

    // Generate title
    const title = generateTitle(text);

    console.log('✅ Message accepted:', title);

    return {
        title,
        message: text,
        link: url
    };
}

export default filterMessage;
