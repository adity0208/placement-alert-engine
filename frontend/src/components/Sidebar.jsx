import { useState } from 'react';
import { Target, Briefcase, Trophy, Radio, Menu, X, Hash, Sparkles } from 'lucide-react';
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
