export default function Sidebar({ currentPage, setCurrentPage, jobsCount, noticesCount, connectionState }) {
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
                <button
                    className={`nav-item ${currentPage === 'jobs' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('jobs')}
                >
                    <span className="nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                        </svg>
                    </span>
                    <span className="nav-label">Jobs</span>
                    {jobsCount > 0 && <span className="badge">{jobsCount}</span>}
                </button>

                <button
                    className={`nav-item ${currentPage === 'notices' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('notices')}
                >
                    <span className="nav-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="2" x2="12" y2="4"></line>
                            <line x1="12" y1="20" x2="12" y2="22"></line>
                            <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"></line>
                            <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"></line>
                            <line x1="2" y1="12" x2="4" y2="12"></line>
                            <line x1="20" y1="12" x2="22" y2="12"></line>
                            <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"></line>
                            <line x1="17.66" y1="4.93" x2="19.07" y2="6.34"></line>
                            <path d="M12 8v4l3 3"></path>
                        </svg>
                    </span>
                    <span className="nav-label">Notices</span>
                    {noticesCount > 0 && <span className="badge">{noticesCount}</span>}
                </button>
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
