import { useState } from 'react';

// Extract first URL found anywhere in a string
function extractUrl(text) {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
}

export default function HackathonCard({ hackathon }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const title = hackathon?.title || 'Hackathon Event';
    const organizer = hackathon?.organizer || 'Contest Host';
    const prizePool = hackathon?.prizePool;
    const deadline = hackathon?.deadline;
    const sourceName = hackathon?.sourceName || 'Unknown Source';

    // Resolve URL
    const regLink = hackathon?.applyLink || hackathon?.link || extractUrl(hackathon?.message || '');

    // Strip salutations
    const displayMessage = (hackathon?.message || '').replace(/^dear\s+(b\.?tech\s+)?(\w+\s+)?students?,?\s*/i, '').trim();

    const avatarLetter = organizer ? organizer.charAt(0).toUpperCase() : '🏆';

    return (
        <div className="job-card hackathon-card">
            {/* Top header row: Dynamic Brand Avatar + Title & Organizer */}
            <div className="job-card-top">
                <div className="company-avatar">
                    {avatarLetter}
                </div>
                <div className="job-header-info">
                    <span className="job-role-text">🏆 Hackathon Event</span>
                    <h3 className="job-company-name">{title}</h3>
                </div>
            </div>

            {/* Sub-meta details row */}
            <div style={{ marginTop: '0.25rem' }}>
                <div className="job-meta">
                    <span className="meta-item">
                        🕒 {formatDate(hackathon?.createdAt)}
                    </span>
                    {sourceName && (
                        <span className="meta-item">
                            📡 {sourceName}
                        </span>
                    )}
                </div>

                {/* Tags row */}
                <div className="badge-container">
                    {organizer && (
                        <span className="premium-badge">
                            🏢 Organizer: {organizer}
                        </span>
                    )}
                    {prizePool && (
                        <span className="premium-badge">
                            💰 Prize Pool: {prizePool}
                        </span>
                    )}
                    {deadline && (
                        <span className="premium-badge">
                            📅 Deadline: {deadline}
                        </span>
                    )}
                </div>
            </div>

            {/* Accordion toggle */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="accordion-trigger"
                aria-expanded={isExpanded}
            >
                {isExpanded ? '▼ Hide Details' : '▶ Show Contest Description'}
            </button>

            <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                <p className="job-accordion-text">{displayMessage}</p>
            </div>

            {/* Bottom Actions */}
            <div className="job-actions">
                {regLink ? (
                    <a
                        href={regLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        🔗 Register Now
                    </a>
                ) : (
                    <button className="btn disabled" disabled>
                        ❌ Registration Link Not Found
                    </button>
                )}
                <button
                    onClick={() => navigator.clipboard.writeText(hackathon?.message || '')}
                    className="btn btn-secondary"
                >
                    📋 Copy Info
                </button>
            </div>
        </div>
    );
}
