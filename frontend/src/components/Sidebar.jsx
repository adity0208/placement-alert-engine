export default function Sidebar({ currentPage, setCurrentPage, jobsCount, noticesCount, connected }) {
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
                    <span className="nav-icon">💼</span>
                    <span className="nav-label">Jobs</span>
                    {jobsCount > 0 && <span className="badge">{jobsCount}</span>}
                </button>

                <button
                    className={`nav-item ${currentPage === 'notices' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('notices')}
                >
                    <span className="nav-icon">📢</span>
                    <span className="nav-label">Notices</span>
                    {noticesCount > 0 && <span className="badge">{noticesCount}</span>}
                </button>
            </nav>

            <div className="sidebar-footer">
                <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
                    <div className={`status-dot ${connected ? 'pulse' : ''}`} />
                    <span className="status-text">
                        {connected ? 'Connected' : 'Reconnecting...'}
                    </span>
                </div>
            </div>
        </aside>
    );
}
