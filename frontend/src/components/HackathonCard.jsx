import { useState } from 'react';
import { 
    Trophy, 
    Clock, 
    Radio, 
    Building2, 
    Award, 
    Calendar, 
    ExternalLink, 
    Copy, 
    Check, 
    ChevronDown, 
    ChevronRight,
    AlertCircle
} from 'lucide-react';

// Strip repetitive raw LLM prefix labels
function cleanPrefix(text) {
    if (!text || typeof text !== 'string') return text;
    return text
        .replace(/^(hackathon\s*title|title|host|organizer|prize\s*pool|prizes?)\s*:\s*/i, '')
        .trim();
}

// Extract first URL found anywhere in a string
function extractUrl(text) {
    const urlRegex = /https?:\/\/[^\s<>"]+/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
}

export default function HackathonCard({ hackathon }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

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

    const handleCopy = () => {
        navigator.clipboard.writeText(hackathon?.message || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const title = cleanPrefix(hackathon?.title || 'Hackathon Event');
    const organizer = cleanPrefix(hackathon?.organizer || 'Contest Host');
    const prizePool = cleanPrefix(hackathon?.prizePool);
    const deadline = cleanPrefix(hackathon?.deadline);
    const sourceName = hackathon?.sourceName || 'Unknown Source';

    // Resolve URL
    const regLink = hackathon?.applyLink || hackathon?.link || extractUrl(hackathon?.message || '');

    // Strip salutations
    const displayMessage = (hackathon?.message || '').replace(/^dear\s+(b\.?tech\s+)?(\w+\s+)?students?,?\s*/i, '').trim();

    const avatarLetter = organizer ? organizer.charAt(0).toUpperCase() : 'H';

    return (
        <div className="job-card hackathon-card">
            {/* Top header row: Dynamic Brand Avatar + Title & Organizer */}
            <div className="job-card-top">
                <div className="company-avatar">
                    {avatarLetter}
                </div>
                <div className="job-header-info">
                    <span className="job-role-text flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-zinc-400" /> Hackathon Event
                    </span>
                    <h3 className="job-company-name">{title}</h3>
                </div>
            </div>

            {/* Sub-meta details row */}
            <div style={{ marginTop: '0.25rem' }}>
                <div className="job-meta">
                    <span className="meta-item">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {formatDate(hackathon?.createdAt)}
                    </span>
                    {sourceName && (
                        <span className="meta-item">
                            <Radio className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            {sourceName}
                        </span>
                    )}
                </div>

                {/* Tags row */}
                <div className="badge-container">
                    {organizer && (
                        <span className="premium-badge">
                            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>Organizer: {organizer}</span>
                        </span>
                    )}
                    {prizePool && (
                        <span className="premium-badge">
                            <Award className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>Prize Pool: {prizePool}</span>
                        </span>
                    )}
                    {deadline && (
                        <span className="premium-badge">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>Deadline: {deadline}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Accordion toggle */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="accordion-trigger flex items-center justify-between"
                aria-expanded={isExpanded}
            >
                <span>{isExpanded ? 'Hide Details' : 'Show Contest Description'}</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
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
                        <ExternalLink className="w-4 h-4 shrink-0 mr-1.5" />
                        Register Now
                    </a>
                ) : (
                    <button className="btn disabled" disabled>
                        <AlertCircle className="w-4 h-4 shrink-0 mr-1.5" />
                        Registration Link Not Found
                    </button>
                )}
                <button
                    onClick={handleCopy}
                    className="btn btn-secondary"
                >
                    {copied ? (
                        <>
                            <Check className="w-4 h-4 shrink-0 mr-1.5 text-emerald-500" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4 shrink-0 mr-1.5" />
                            Copy Info
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
