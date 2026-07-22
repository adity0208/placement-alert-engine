import { useState, useEffect } from 'react';

// Extract first URL found anywhere in a string
function extractUrl(text) {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
}

// Extract audience from salutation
function extractAudience(message) {
    if (!message) return null;
    const match = message.match(/^dear\s+(b\.?tech\s+)?(\w+\s+)?students?,?\s*/i);
    if (!match) return null;
    
    const prefix = match[0].toLowerCase();
    if (prefix.includes('b.tech') || prefix.includes('btech')) return 'B.Tech';
    if (prefix.includes('mca')) return 'MCA';
    return 'All Students';
}

// Parse a human-friendly company/title from the raw Telegram message
function parseTitle(message) {
    if (!message) return 'Job Opportunity';

    // If the entire title field is a URL, skip it — handled separately
    if (/^https?:\/\//i.test(message.trim())) return 'Job Opportunity';

    let titleStr = '';

    // Pattern: "<CompanyName> job post" (case-insensitive)
    const jobPostMatch = message.match(/([A-Za-z0-9&.,'\- ]+?)\s+job\s+post/i);
    if (jobPostMatch) {
        titleStr = jobPostMatch[1].trim();
    } else {
        // Pattern: "hiring at <CompanyName>" or "opening at <CompanyName>"
        const hiringAtMatch = message.match(/(?:hiring|opening)\s+at\s+([A-Za-z0-9&.,'\- ]+?)[\s,.\n]/i);
        if (hiringAtMatch) {
            titleStr = hiringAtMatch[1].trim();
        } else {
            // Pattern: "from <CompanyName>" near the start
            const fromMatch = message.match(/from\s+([A-Za-z0-9&.,'\- ]+?)[\s,.\n]/i);
            if (fromMatch) {
                const candidate = fromMatch[1].trim();
                if (candidate.length > 2 && candidate.length < 40) titleStr = candidate;
            }
        }
    }

    if (!titleStr) {
        // Fallback: strip salutation and take first 6 meaningful words
        const stripped = message.replace(/^dear\s+(b\.?tech\s+)?(\w+\s+)?students?,?\s*/i, '').trim();
        const words = stripped.split(/\s+/).slice(0, 6);
        titleStr = words.join(' ') + (stripped.split(/\s+/).length > 6 ? '…' : '');
    }

    // Unconditionally strip salutation from the start of the extracted title
    titleStr = titleStr.replace(/^dear\s+(b\.?tech\s+)?(\w+\s+)?students?,?\s*/i, '').trim();

    if (/^(kindly|please)\b/i.test(titleStr)) {
        titleStr = 'Placement Notice';
    } else if (titleStr.length > 0) {
        // Capitalize properly
        titleStr = titleStr.charAt(0).toUpperCase() + titleStr.slice(1);
    }

    return titleStr || 'Placement Notice';
}

export default function JobCard({ job }) {
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isExpiringSoon, setIsExpiringSoon] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            if (!job || !job.expiresAt) return;
            const now = new Date();
            const expiry = new Date(job.expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeRemaining('Expired');
                setIsExpiringSoon(false);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeRemaining(`${hours}h ${minutes}m`);
            setIsExpiringSoon(hours < 6);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [job?.expiresAt]);

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

    // Stable dynamic HSL color generator for company avatars
    const getCompanyColor = (name) => {
        if (!name) return 'linear-gradient(135deg, var(--accent-primary), #8b5cf6)';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        return `hsl(${h}, 60%, 40%)`;
    };

    // Stable HSL color generator for source labels
    const getSourceColor = (name) => {
        if (!name) return 'var(--text-muted)';
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash % 360);
        return `hsl(${h}, 45%, 45%)`;
    };

    // Determine raw title URL checks for fallback
    const rawTitle = job?.title || '';
    const isTitleUrl = /^https?:\/\//i.test(rawTitle.trim());

    // Resolve presentation text using structured AI fields with bulletproof fallbacks
    const isAI = !!job?.isAIParsed;
    const companyName = isAI ? (job.companyName || "New Opportunity") : (isTitleUrl ? "Job Opportunity" : parseTitle(job?.message || rawTitle));
    const jobRole = isAI ? (job.jobRole || "Placement Drive") : "Placement Alert";
    const eligibility = isAI ? job.eligibility : extractAudience(job?.message || rawTitle);
    const deadline = isAI ? job.deadline : null;
    const experience = job?.experience;
    const targetBatch = job?.targetBatch;
    const sourceName = job?.sourceName;

    // Resolve application URL
    const applyLink = job?.applyLink || job?.link || extractUrl(job?.message || '') || (isTitleUrl ? rawTitle : null);

    // Strip salutation for a clean presentation
    const displayMessage = (job?.message || '').replace(/^dear\s+(b\.?tech\s+)?(\w+\s+)?students?,?\s*/i, '').trim();

    const avatarBg = getCompanyColor(companyName);
    const avatarLetter = companyName.charAt(0).toUpperCase();
    const sourceColor = getSourceColor(sourceName);

    return (
        <div className={`job-card ${isExpiringSoon ? 'expiring-soon' : ''}`}>
            {/* Top header row: Dynamic Brand Avatar + Role / Company details */}
            <div className="job-card-top">
                <div className="company-avatar" style={{ background: avatarBg }}>
                    {avatarLetter}
                </div>
                <div className="job-header-info">
                    <span className="job-role-text">{jobRole}</span>
                    <h3 className="job-company-name">{companyName}</h3>
                </div>
            </div>

            {/* Sub-meta details row */}
            <div className="job-header" style={{ marginTop: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                <div className="job-meta">
                    <span className="meta-item">
                        🕒 {formatDate(job?.createdAt)}
                    </span>
                    {timeRemaining && (
                        <span className={`meta-item timer ${timeRemaining === 'Expired' ? 'expired' : ''}`}>
                            ⚡ {timeRemaining}
                        </span>
                    )}
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

                {/* Highly visual tag pills */}
                <div className="badge-container">
                    {targetBatch && (
                        <span className="premium-badge batch-badge" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.08)' }}>
                            🎓 Batch: {targetBatch}
                        </span>
                    )}
                    {experience && (
                        <span className="premium-badge experience-badge" style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.08)' }}>
                            💼 Experience: {experience}
                        </span>
                    )}
                    {eligibility && (
                        <span className="premium-badge eligibility-badge">
                            📋 Criteria: {eligibility}
                        </span>
                    )}
                    {deadline && (
                        <span className="premium-badge deadline-badge">
                            📅 Deadline: {deadline}
                        </span>
                    )}
                </div>
            </div>

            {/* Accordion collapsable toggle */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="accordion-trigger"
                aria-expanded={isExpanded}
            >
                {isExpanded ? '▼ Hide Details' : '▶ Show Message Details'}
            </button>

            <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                <p className="job-accordion-text">{displayMessage}</p>
            </div>

            {/* Lower row buttons */}
            <div className="job-actions">
                {applyLink ? (
                    <a
                        href={applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        🔗 Apply Now
                    </a>
                ) : (
                    <button className="btn disabled" disabled>
                        ❌ Link Not Found
                    </button>
                )}
                <button
                    onClick={() => navigator.clipboard.writeText(job?.message || '')}
                    className="btn btn-secondary"
                >
                    📋 Copy
                </button>
            </div>
        </div>
    );
}
