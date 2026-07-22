import { useState } from 'react';
import { Target, Briefcase, Trophy, Radio, Menu, X, Hash, Code2, Mail } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({
    currentPage,
    setCurrentPage,
    jobsCount,
    hackathonsCount,
    connectionState,
    sources = [],
    selectedSource,
    setSelectedSource
}) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    let statusColor, statusText;
    if (connectionState === 'connected') {
        statusColor = 'connected';
        statusText = 'Live';
    } else if (connectionState === 'connecting') {
        statusColor = 'connecting';
        statusText = 'Connecting...';
    } else {
        statusColor = 'disconnected';
        statusText = 'Reconnecting...';
    }

    const handleNavClick = (page) => {
        setCurrentPage(page);
        setIsMobileOpen(false);
    };

    const handleSourceClick = (source) => {
        setSelectedSource(source);
        setIsMobileOpen(false);
    };
    return (
        <>
            {/* Top mobile navbar bar for PWA / mobile screens */}
            <div className="mobile-header">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMobileOpen(!isMobileOpen)}
                        className="mobile-menu-btn"
                        aria-label="Toggle navigation menu"
                    >
                        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                    <div className="mobile-brand">
                        <Target className="w-5 h-5 shrink-0" />
                        <span className="font-bold text-sm">Placement Alerts</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`sidebar-conn-indicator ${statusColor} mobile-conn-badge`}>
                        <span className="status-dot" />
                        <span className="sidebar-conn-label">{statusText}</span>
                    </div>
                </div>
            </div>

            {/* Mobile backdrop overlay */}
            {isMobileOpen && (
                <div
                    className="mobile-backdrop"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar drawer container */}
            <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo-wrapper">
                        <Target className="w-5 h-5 shrink-0" />
                    </div>
                    <h1 className="sidebar-title">Placement Alerts</h1>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-nav-section-title">CATEGORIES</div>

                    <button
                        className={`nav-item ${currentPage === 'jobs' ? 'active' : ''}`}
                        onClick={() => handleNavClick('jobs')}
                    >
                        <span className="nav-icon">
                            <Briefcase className="w-4 h-4" />
                        </span>
                        <span className="nav-label">Jobs</span>
                        {jobsCount > 0 && <span className="badge">{jobsCount}</span>}
                    </button>

                    <button
                        className={`nav-item ${currentPage === 'hackathons' ? 'active' : ''}`}
                        onClick={() => handleNavClick('hackathons')}
                    >
                        <span className="nav-icon">
                            <Trophy className="w-4 h-4" />
                        </span>
                        <span className="nav-label">Hackathons</span>
                        {hackathonsCount > 0 && <span className="badge">{hackathonsCount}</span>}
                    </button>

                    {/* Sources filtering section */}
                    <div className="sidebar-separator" />
                    <div className="sidebar-nav-section-title">TARGET SOURCES</div>

                    <button
                        className={`nav-item source-item ${selectedSource === 'all' ? 'active' : ''}`}
                        onClick={() => handleSourceClick('all')}
                    >
                        <Radio className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="nav-label">All Channels</span>
                    </button>

                    <div className="sources-scroll-container">
                        {sources.map((source) => (
                            <button
                                key={source}
                                className={`nav-item source-item ${selectedSource === source ? 'active' : ''}`}
                                onClick={() => handleSourceClick(source)}
                                title={source}
                            >
                                <Hash className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span className="nav-label source-label-truncate">{source}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    {/* Developer & Contact Section */}
                    <div className="dev-contact-section">
                        <div className="dev-contact-header">
                            <Code2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>DEVELOPER & CONTACT</span>
                        </div>

                        <a
                            href="mailto:2k22.cse.2213616@gmail.com?subject=Inquiry%20regarding%20Placement%20Alert%20Engine"
                            className="dev-contact-btn"
                        >
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span>Get in Touch</span>
                        </a>

                        <div className="dev-social-links">
                            <a
                                href="https://github.com/adity0208"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="dev-social-icon"
                                title="GitHub Profile"
                                aria-label="GitHub Profile"
                            >
                                <svg style={{ width: '1rem', height: '1rem', flexShrink: 0, fill: 'currentColor' }} viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                            </a>
                            <a
                                href="https://www.linkedin.com/in/aditya-kushwaha-512581259/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="dev-social-icon"
                                title="LinkedIn Profile"
                                aria-label="LinkedIn Profile"
                            >
                                <svg style={{ width: '1rem', height: '1rem', flexShrink: 0, fill: 'currentColor' }} viewBox="0 0 24 24">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.261-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                </svg>
                            </a>
                            <a
                                href="mailto:2k22.cse.2213616@gmail.com"
                                className="dev-social-icon"
                                title="Send Direct Email"
                                aria-label="Send Direct Email"
                            >
                                <Mail className="w-4 h-4 shrink-0" />
                            </a>
                        </div>
                    </div>

                    <ThemeToggle />

                    <div
                        className={`sidebar-conn-indicator ${statusColor}`}
                        title={statusText}
                    >
                        <span className="status-dot" />
                        <span className="sidebar-conn-label">
                            {statusText}
                        </span>
                    </div>
                </div>
            </aside>
        </>
    );
}
