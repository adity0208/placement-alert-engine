import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, SearchX, Inbox } from 'lucide-react';
import JobCard from '../components/JobCard';

/**
 * Freshers eligibility rule:
 * Returns true if experience contains '0', 'fresher', or 'intern',
 * or targetBatch includes graduating batches (e.g., 2025, 2026, 2027, 2028),
 * or message text explicitly mentions fresher/intern/0-1 year keywords.
 */
function isFresherJob(job) {
    const exp = (job.experience || '').toLowerCase();
    const batch = (job.targetBatch || '').toLowerCase();
    const msg = (job.message || '').toLowerCase();

    if (exp.includes('fresher') || exp.includes('0-') || exp.includes('0 to') || exp.includes('intern')) {
        return true;
    }
    if (batch.includes('2025') || batch.includes('2026') || batch.includes('2027') || batch.includes('2028')) {
        return true;
    }
    if (/\b(freshers?|interns?|internship|0\s*-\s*[12]\s*years?)\b/i.test(msg)) {
        return true;
    }
    return false;
}

export default function JobsPage({ jobs = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterApplyLink, setFilterApplyLink] = useState(false);
    const [filterDeadline, setFilterDeadline] = useState(false);
    const [filterFreshers, setFilterFreshers] = useState(false);
    const [sortBy, setSortBy] = useState('newest');

    const searchInputRef = useRef(null);

    // Keyboard shortcut: Ctrl/Cmd + K focuses search bar (ignored if already in an input/textarea)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                const targetTag = e.target?.tagName;
                if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || e.target?.isContentEditable) {
                    return;
                }
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Check if any job has a parseable deadline to conditionally show the Sort option
    const hasAnyParseableDeadline = useMemo(() => {
        return jobs.some((j) => {
            if (!j.deadline) return false;
            const parsed = Date.parse(j.deadline);
            return !isNaN(parsed);
        });
    }, [jobs]);

    const isAnyFilterActive = Boolean(
        searchQuery.trim() ||
        filterApplyLink ||
        filterDeadline ||
        filterFreshers ||
        sortBy !== 'newest'
    );

    const clearAllFilters = () => {
        setSearchQuery('');
        setFilterApplyLink(false);
        setFilterDeadline(false);
        setFilterFreshers(false);
        setSortBy('newest');
        searchInputRef.current?.focus();
    };

    // Filter jobs combining search and active chips (AND logic)
    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesTitle = job.title && job.title.toLowerCase().includes(q);
                const matchesCompany = job.companyName && job.companyName.toLowerCase().includes(q);
                const matchesRole = job.jobRole && job.jobRole.toLowerCase().includes(q);
                const matchesMessage = job.message && job.message.toLowerCase().includes(q);
                if (!matchesTitle && !matchesCompany && !matchesRole && !matchesMessage) {
                    return false;
                }
            }

            // Has apply link chip
            if (filterApplyLink && !job.applyLink && !job.link) {
                return false;
            }

            // Has deadline chip
            if (filterDeadline && (!job.deadline || !job.deadline.trim())) {
                return false;
            }

            // Freshers chip
            if (filterFreshers && !isFresherJob(job)) {
                return false;
            }

            return true;
        });
    }, [jobs, searchQuery, filterApplyLink, filterDeadline, filterFreshers]);

    // Sort jobs
    const finalJobs = useMemo(() => {
        return [...filteredJobs].sort((a, b) => {
            if (sortBy === 'deadline' && hasAnyParseableDeadline) {
                const dateA = a.deadline ? Date.parse(a.deadline) : Infinity;
                const dateB = b.deadline ? Date.parse(b.deadline) : Infinity;
                const validA = !isNaN(dateA);
                const validB = !isNaN(dateB);
                if (validA && validB) return dateA - dateB;
                if (validA) return -1;
                if (validB) return 1;
            }
            // Default newest first
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });
    }, [filteredJobs, sortBy, hasAnyParseableDeadline]);

    return (
        <div className="page">
            <header className="page-header">
                <h2 className="page-title">
                    Active Jobs <span className="count-badge">{finalJobs.length}</span>
                </h2>
                <p className="page-subtitle">
                    Live recruitment drives and job openings parsed in real-time.
                </p>
            </header>

            {/* Jobs Toolbar: Single cohesive row on desktop */}
            <div className="jobs-toolbar">
                <div className="jobs-toolbar-row">
                    {/* Search box with Ctrl/Cmd+K shortcut */}
                    <div className="jobs-search-box">
                        <Search className="jobs-search-icon w-4 h-4" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="jobs-search-input"
                            placeholder="Search role, company, keyword"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                className="jobs-search-clear"
                                onClick={() => setSearchQuery('')}
                                aria-label="Clear search"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        ) : (
                            <kbd className="jobs-search-shortcut" title="Focus search (Ctrl+K or ⌘K)">
                                ⌘K
                            </kbd>
                        )}
                    </div>

                    <div className="toolbar-controls">
                        {/* Filter chips */}
                        <button
                            type="button"
                            className={`filter-chip ${filterApplyLink ? 'active' : ''}`}
                            onClick={() => setFilterApplyLink(!filterApplyLink)}
                            aria-pressed={filterApplyLink}
                        >
                            Has apply link
                        </button>

                        <button
                            type="button"
                            className={`filter-chip ${filterDeadline ? 'active' : ''}`}
                            onClick={() => setFilterDeadline(!filterDeadline)}
                            aria-pressed={filterDeadline}
                        >
                            Has deadline
                        </button>

                        <button
                            type="button"
                            className={`filter-chip ${filterFreshers ? 'active' : ''}`}
                            onClick={() => setFilterFreshers(!filterFreshers)}
                            aria-pressed={filterFreshers}
                        >
                            Freshers
                        </button>

                        {/* Sort dropdown */}
                        <select
                            className="sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            aria-label="Sort job notices"
                        >
                            <option value="newest">Newest first</option>
                            {hasAnyParseableDeadline && (
                                <option value="deadline">Deadline soon</option>
                            )}
                        </select>

                        {/* Clear all filters action */}
                        {isAnyFilterActive && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="btn-clear-filters"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Grid or Empty State */}
            {finalJobs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon-wrapper" aria-hidden="true">
                        {isAnyFilterActive ? (
                            <SearchX className="w-10 h-10 text-[var(--muted)]" />
                        ) : (
                            <Inbox className="w-10 h-10 text-[var(--muted)]" />
                        )}
                    </div>
                    <h3 className="empty-title">
                        {isAnyFilterActive ? 'No matching jobs' : 'No Active Jobs'}
                    </h3>
                    <p className="empty-description">
                        {isAnyFilterActive
                            ? 'No opportunities match your active filters or search terms.'
                            : 'New placement opportunities will appear here automatically.'}
                    </p>
                    {isAnyFilterActive && (
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="btn-clear-filters-action"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="jobs-grid">
                    {finalJobs.map((job) => (
                        <JobCard key={job._id || `${job.groupId}-${job.telegramMessageId}`} job={job} />
                    ))}
                </div>
            )}
        </div>
    );
}
