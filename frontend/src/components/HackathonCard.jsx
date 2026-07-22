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

    // Stable dynamic HSL color generator for organizer avatars
    const getAvatarColor = (name) => {
        if (!name) return 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        return `hsl(${h}, 60%, 40%)`;
    };

    // Stable color generator for origin sources
    const getSourceColor = (name) => {
        if (!name) return 'var(--text-muted)';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        return `hsl(${h}, 45%, 45%)`;
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

    const avatarBg = getAvatarColor(organizer);
    const avatarLetter = organizer.charAt(0).toUpperCase();
    const sourceColor = getSourceColor(sourceName);

    return (
        <div className="job-card hackathon-card">
            {/* Top header row: Dynamic Brand Avatar + Title & Organizer */}
            <div className="job-card-top">
                <div className="company-avatar" style={{ background: avatarBg }}>
                    {avatarLetter}
                </div>
                <div className="job-header-info">
                    <span className="job-role-text">🏆 Hackathon Event</span>
                    <h3 className="job-company-name">{title}</h3>
                </div>
            </div>

            {/* Sub-meta details row */}
            <div className="job-header" style={{ marginTop: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                <div className="job-meta">
                    <span className="meta-item">
                        🕒 {formatDate(hackathon?.createdAt)}
                    </span>
                    {sourceName && (
                        <span 
                            className="premium-badge source-badge" 
                            style={{ 
                                borderColor: sourceColor, 
                                color: sourceColor,
                                background: `${sourceColor}0a`
                            }}
                        >
                            📡 {sourceName}
                        </span>
                    )}
                </div>

                {/* Tags row */}
                <div className="badge-container">
                    {organizer && (
                        <span className="premium-badge eligibility-badge">
                            🏢 Organizer: {organizer}
                        </span>
                    )}
                    {prizePool && (
                        <span className="premium-badge experience-badge" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)' }}>
                            💰 Prize Pool: {prizePool}
                        </span>
                    )}
                    {deadline && (
                        <span className="premium-badge deadline-badge">
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
