// Strip common salutation patterns from the start of notice messages
function stripSalutation(text) {
    if (!text) return text;
    return text.replace(/^dear\s+\w+\s+students?,?\s*/i, '').trim();
}

// Format a full date-time string for the title tooltip, e.g. "Apr 18, 2026 at 11:47 PM"
function formatFullDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).replace(',', ',').replace(' at ', ' at ');
}

export default function NoticeCard({ notice }) {
    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        // Show relative time if less than 24 hours
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 0) return `${hours}h ago`;
            if (minutes > 0) return `${minutes}m ago`;
            return 'Just now';
        }

        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // "New" badge: notice arrived within the last 5 minutes
    const isNew = (Date.now() - new Date(notice.createdAt)) < 5 * 60 * 1000;

    const cleanMessage = stripSalutation(notice.message);
    const relativeTime = formatRelativeTime(notice.createdAt);
    const fullDateTime = formatFullDateTime(notice.createdAt);

    return (
        <div className="notice-card">
            <div className="notice-bubble">
                {isNew && <span className="notice-new-badge">New</span>}
                <p className="notice-message">{cleanMessage}</p>
                <span className="notice-time" title={fullDateTime}>
                    {relativeTime}
                </span>
            </div>
        </div>
    );
}
