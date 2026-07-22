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
    let statusColor, statusText, dotClass;
    if (connectionState === 'connected') {
        statusColor = 'connected';
        statusText = 'Live';
        dotClass = 'pulse';
    } else if (connectionState === 'connecting') {
        statusColor = 'connecting';
        statusText = 'Connecting...';
        dotClass = 'pulse';
    } else {
        statusColor = 'disconnected';
        statusText = 'Reconnecting...';
        dotClass = '';
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">🎯</div>
                <h1 className="sidebar-title">Placement Alerts</h1>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-nav-section-title">CATEGORIES</div>
                
                <button
                    className={`nav-item ${currentPage === 'jobs' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('jobs')}
                >
                    <span className="nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                    </span>
                    <span className="nav-label">Jobs</span>
                    {jobsCount > 0 && <span className="badge">{jobsCount}</span>}
                </button>

                <button
                    className={`nav-item ${currentPage === 'hackathons' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('hackathons')}
                >
                    <span className="nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z"></path>
                            <path d="M6 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z"></path>
                            <path d="M18 8H6"></path>
                            <path d="M18 16H6"></path>
                        </svg>
                    </span>
                    <span className="nav-label">Hackathons</span>
                    {hackathonsCount > 0 && <span className="badge">{hackathonsCount}</span>}
                </button>

                {/* Sources filtering section */}
                <div className="sidebar-separator" />
                <div className="sidebar-nav-section-title">TARGET SOURCES</div>
                
                <button
                    className={`nav-item source-item ${selectedSource === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedSource('all')}
                >
                    <span className="source-dot all-dot" />
                    <span className="nav-label">All Channels</span>
                </button>

                <div className="sources-scroll-container">
                    {sources.map((source) => (
                        <button
                            key={source}
                            className={`nav-item source-item ${selectedSource === source ? 'active' : ''}`}
                            onClick={() => setSelectedSource(source)}
                            title={source}
                        >
                            <span className="source-dot hash-dot">#</span>
                            <span className="nav-label source-label-truncate">{source}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <div className="sidebar-footer">
                <div
                    className={`sidebar-conn-indicator ${statusColor}`}
                    title={statusText}
                >
                    <span className={`status-dot ${dotClass}`} />
                    <span className="sidebar-conn-label">
                        {statusText}
                    </span>
                </div>
            </div>
        </aside>
    );
}
