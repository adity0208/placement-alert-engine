import { useState, useRef, useEffect } from 'react';
import { 
    Briefcase, 
    Calendar, 
    GraduationCap, 
    ExternalLink, 
    Copy, 
    Check, 
    X,
    Clock,
    MapPin,
    Banknote
} from 'lucide-react';
import { parseLabelledMessage } from '../utils/parseLabelledMessage';

const GENERIC_TITLES = [
    'placement opportunity',
    'new opportunity',
    'job opportunity',
    'placement drive',
    'hackathon event',
    'notification',
    'placement notice',
    'job post',
    'placement alert'
];

const PLACEHOLDERS = [
    'any batch',
    'students / freshers',
    'eligible students',
    'all students',
    'null',
    'undefined',
    'n/a',
    'all batches'
];

// Clean prefixes like "Company: Google" -> "Google"
function cleanPrefix(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/^(company\s*name|company|job\s*role|role|title|organization|host|organizer)\s*:\s*/i, '')
        .trim();
}

function isGeneric(str) {
    if (!str || typeof str !== 'string') return true;
    const clean = str.trim().toLowerCase();
    if (clean.length === 0) return true;
    if (/^https?:\/\//i.test(clean)) return true;
    if (/\bnull\b|\bundefined\b/i.test(clean)) return true;
    if (/\bis hiring for\b/i.test(clean)) return true;
    return GENERIC_TITLES.includes(clean);
}

function isValidMeta(val) {
    if (!val || typeof val !== 'string') return false;
    const clean = val.trim().toLowerCase();
    if (clean.length === 0) return false;
    return !PLACEHOLDERS.includes(clean);
}

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getMonogram(company) {
    if (!company) return null;
    const parts = company.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return company.slice(0, 2).toUpperCase();
}

// Convert links in message to clickable anchors
function renderFormattedMessage(message) {
    if (!message) return null;
    const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
    const parts = message.split(urlRegex);

    return parts.map((part, index) => {
        if (/^https?:\/\//i.test(part)) {
            return (
                <a
                    key={index}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}

export default function JobCard({ job }) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const triggerRef = useRef(null);

    const closeDetails = () => {
        setIsDetailsOpen(false);
        triggerRef.current?.focus();
    };

    // Keyboard support: Escape closes dialog and returns focus
    useEffect(() => {
        if (!isDetailsOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeDetails();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDetailsOpen]);

    const targetUrl = job.applyLink || job.link || null;

    const handleCopy = () => {
        if (!targetUrl) return;
        navigator.clipboard.writeText(targetUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // Primary Heading & Company determination:
    const rawRole = job.jobRole && !isGeneric(job.jobRole) ? cleanPrefix(job.jobRole) : null;
    const rawCompany = job.companyName && !isGeneric(job.companyName) ? cleanPrefix(job.companyName) : null;
    const titleClean = cleanPrefix(job.title);

    // If companyName or jobRole are missing or default, extract labelled values from message
    const isMissingData = !rawCompany || !rawRole;
    const extracted = isMissingData ? parseLabelledMessage(job.message) : null;

    const parsedRole = extracted?.jobRole && !isGeneric(extracted.jobRole) ? cleanPrefix(extracted.jobRole) : null;
    const parsedCompany = extracted?.companyName && !isGeneric(extracted.companyName) ? cleanPrefix(extracted.companyName) : null;

    const effectiveRole = rawRole || parsedRole;
    const effectiveCompany = rawCompany || parsedCompany;
    const extractedLocation = extracted?.location || null;
    const extractedStipend = extracted?.stipend || null;
    const extractedBatch = extracted?.batch || null;

    // Heading priority: Role (if present) > Company (if present) > default.
    // Subtitle: Company (if role was used as heading) or empty.
    let heading = '';
    let subtitle = '';

    if (effectiveRole) {
        heading = effectiveRole;
        if (effectiveCompany) {
            subtitle = effectiveCompany;
        }
    } else if (effectiveCompany) {
        heading = effectiveCompany;
        subtitle = '';
    } else if (titleClean && !isGeneric(titleClean)) {
        heading = titleClean;
        subtitle = '';
    } else if (job.message) {
        const meaningfulLine = job.message
            .split('\n')
            .map(line => line.replace(/https?:\/\/[^\s<>"]+/g, '').trim())
            .find(line => line.length > 5);

        if (meaningfulLine) {
            const cleanedLine = cleanPrefix(meaningfulLine);
            heading = cleanedLine.length > 70 
                ? `${cleanedLine.slice(0, 67)}...` 
                : cleanedLine;
        }
    }
    if (!heading) {
        heading = 'Role details in message';
    }

    const showMutedDetails = !subtitle && !effectiveCompany && !effectiveRole;

    // Monogram
    const monogram = effectiveCompany ? getMonogram(effectiveCompany) : (heading ? getMonogram(heading) : null);

    // Time
    const fullDate = job.createdAt ? new Date(job.createdAt).toLocaleString() : '';
    const relativeTime = formatRelativeTime(job.createdAt);

    // 3-line clamped preview text (stripping URLs)
    const previewText = (job.message || '')
        .replace(/https?:\/\/[^\s<>"]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return (
        <article className="job-card">
            {/* Header */}
            <div className="job-card-header">
                <div className="job-card-brand">
                    <div className="job-card-avatar" aria-hidden="true">
                        {monogram ? monogram : <Briefcase className="w-4 h-4 text-[var(--muted)]" />}
                    </div>
                    <div className="job-card-headings">
                        <h3 className="job-card-title" title={heading}>
                            {heading}
                        </h3>
                        {subtitle && (
                            <span className="job-card-company" title={subtitle}>
                                {subtitle}
                            </span>
                        )}
                        {showMutedDetails && (
                            <span className="job-card-company muted-details">
                                Details in message
                            </span>
                        )}
                    </div>
                </div>

                {relativeTime && (
                    <time 
                        className="job-card-time" 
                        dateTime={job.createdAt} 
                        title={fullDate}
                    >
                        {relativeTime}
                    </time>
                )}
            </div>

            {/* Body */}
            <div className="job-card-body">
                {/* Metadata badges strictly for existing fields */}
                <div className="job-card-badges">
                    {extractedLocation && (
                        <span className="job-meta-badge" title="Location">
                            <MapPin className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                            <span>{extractedLocation}</span>
                        </span>
                    )}

                    {extractedStipend && (
                        <span className="job-meta-badge" title="Stipend / CTC">
                            <Banknote className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                            <span>{extractedStipend}</span>
                        </span>
                    )}

                    {(isValidMeta(job.targetBatch) || (extractedBatch && !isValidMeta(job.targetBatch))) && (
                        <span className="job-meta-badge" title="Target Graduation Batch">
                            <GraduationCap className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                            <span>{isValidMeta(job.targetBatch) ? job.targetBatch : extractedBatch}</span>
                        </span>
                    )}

                    {isValidMeta(job.experience) && (
                        <span className="job-meta-badge" title="Experience Requirement">
                            <Briefcase className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                            <span>{job.experience}</span>
                        </span>
                    )}

                    {isValidMeta(job.eligibility) && (
                        <span className="job-meta-badge" title="Eligibility Criteria">
                            <span>{job.eligibility}</span>
                        </span>
                    )}

                    {isValidMeta(job.deadline) && (
                        <span className="job-meta-badge deadline-badge" title="Application Deadline">
                            <Clock className="w-3.5 h-3.5 text-[var(--warning)] shrink-0" />
                            <span>{job.deadline}</span>
                        </span>
                    )}
                </div>

                {/* 3-line clamped preview text */}
                {previewText && (
                    <p className="job-card-preview">
                        {previewText}
                    </p>
                )}

                {/* View Full Message button */}
                <button
                    ref={triggerRef}
                    type="button"
                    className="job-view-details-btn"
                    onClick={() => setIsDetailsOpen(true)}
                    aria-expanded={isDetailsOpen}
                >
                    View full message
                </button>
            </div>

            {/* Footer */}
            <footer className="job-card-footer">
                {targetUrl ? (
                    <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="job-apply-btn"
                    >
                        <span>Apply</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                ) : (
                    <button
                        type="button"
                        disabled
                        className="job-apply-btn disabled"
                        title="No application link in this notice"
                    >
                        <span>Apply</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!targetUrl}
                    className="job-copy-btn"
                    aria-label={copied ? "Application link copied" : "Copy application link"}
                    title={targetUrl ? (copied ? "Copied!" : "Copy application link") : "No link available"}
                >
                    {copied ? (
                        <Check className="w-4 h-4 text-[var(--live)]" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                    {copied && <span className="job-copy-tooltip">Copied</span>}
                </button>
            </footer>

            {/* Accessible Full Message Side Panel / Dialog */}
            {isDetailsOpen && (
                <div
                    className="message-dialog-backdrop"
                    onClick={closeDetails}
                    role="presentation"
                >
                    <div
                        className="message-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`dialog-title-${job._id}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="message-dialog-header">
                            <h3 id={`dialog-title-${job._id}`} className="message-dialog-title">
                                {heading}
                            </h3>
                            <button
                                type="button"
                                onClick={closeDetails}
                                className="message-dialog-close"
                                aria-label="Close message details"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </header>
                        <div className="message-dialog-body">
                            {renderFormattedMessage(job.message)}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}
