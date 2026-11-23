import { useState, useRef, useEffect } from 'react';
import { 
    Briefcase, 
    Trophy, 
    TrendingUp, 
    Radio, 
    Hash, 
    Mail, 
    Search, 
    X, 
    PanelLeftClose, 
    PanelLeftOpen, 
    Menu 
} from 'lucide-react';
import LogoMark from './LogoMark';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({
    currentPage,
    setCurrentPage,
    jobsCount,
    hackathonsCount,
    connectionState,
    sources = [],
    selectedSource = 'all',
    setSelectedSource,
    sourceCounts,
    totalCount,
    isCollapsed = false,
    toggleCollapse
}) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const menuBtnRef = useRef(null);
    const sidebarRef = useRef(null);

    let statusColorClass, statusLabel;
    if (connectionState === 'connected') {
        statusColorClass = 'status-connected';
        statusLabel = 'Live';
    } else if (connectionState === 'connecting') {
        statusColorClass = 'status-connecting';
        statusLabel = 'Reconnecting';
    } else {
        statusColorClass = 'status-offline';
        statusLabel = 'Offline';
    }

    // Keyboard shortcut: Ctrl+B or Cmd+B to toggle collapse (ignored while typing in input/textarea/select)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
                const tag = document.activeElement?.tagName?.toLowerCase();
                const isEditable = document.activeElement?.isContentEditable;
                if (tag === 'input' || tag === 'textarea' || tag === 'select' || isEditable) {
                    return;
                }
                e.preventDefault();
                toggleCollapse?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleCollapse]);

    // Keyboard support: Escape closes mobile drawer and returns focus
    useEffect(() => {
        if (!isMobileOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsMobileOpen(false);
                menuBtnRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileOpen]);

    // Focus management: when drawer opens on mobile, focus first interactive element
    useEffect(() => {
        if (isMobileOpen) {
            const firstInteractive = sidebarRef.current?.querySelector('button:not([disabled]), [href], input');
            firstInteractive?.focus();
        }
    }, [isMobileOpen]);

    const handleNavClick = (page) => {
        setCurrentPage(page);
        if (isMobileOpen) {
            setIsMobileOpen(false);
            menuBtnRef.current?.focus();
        }
    };

    const handleSourceClick = (source) => {
        setSelectedSource(source);
        if (isMobileOpen) {
            setIsMobileOpen(false);
            menuBtnRef.current?.focus();
        }
    };

    const visibleSources = sources.filter(source =>
        source.toLowerCase().includes(searchFilter.toLowerCase().trim())
    );

    return (
        <>
            {/* Top mobile navigation bar for screens < 768px */}
            <header className="mobile-header">
                <div className="flex items-center gap-2">
                    <button
                        ref={menuBtnRef}
                        type="button"
                        onClick={() => setIsMobileOpen(prev => !prev)}
                        className="mobile-menu-btn"
                        aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={isMobileOpen}
                        aria-controls="sidebar-drawer"
                    >
                        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                    <div className="mobile-brand">
                        <LogoMark size={24} />
                        <span className="font-semibold text-sm">Placement Alerts</span>
                    </div>
                </div>

                <div
                    className={`status-dot-wrapper ${statusColorClass}`}
                    title={`Status: ${statusLabel}`}
                    aria-label={`Connection status: ${statusLabel}`}
                    role="status"
                >
                    <span className="status-dot-core" />
                    <span className="sr-only">Status: {statusLabel}</span>
                </div>
            </header>

            {/* Mobile backdrop overlay */}
            {isMobileOpen && (
                <div
                    className="mobile-backdrop"
                    onClick={() => {
                        setIsMobileOpen(false);
                        menuBtnRef.current?.focus();
                    }}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar drawer (mobile) / desktop rail */}
            <aside
                ref={sidebarRef}
                id="sidebar-drawer"
                className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
                aria-label="Sidebar navigation"
            >
                {/* 1. HEADER (56px, bottom border) */}
                <div className="sidebar-header">
                    {isCollapsed ? (
                        <div className="collapsed-header-inner">
                            <div className="collapsed-logo-badge" title={`Status: ${statusLabel}`}>
                                <LogoMark size={24} />
                                <span
                                    className={`status-dot-corner ${statusColorClass}`}
                                    aria-label={`Connection status: ${statusLabel}`}
                                    role="status"
                                >
                                    <span className="sr-only">Status: {statusLabel}</span>
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={toggleCollapse}
                                className="footer-ghost-btn"
                                title="Expand sidebar"
                                aria-label="Expand sidebar"
                                aria-expanded={false}
                            >
                                <PanelLeftOpen className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="sidebar-header-brand">
                                <LogoMark size={24} />
                                <span className="sidebar-title">Placement Alerts</span>
                            </div>

                            <div className="sidebar-header-actions">
                                <div
                                    className={`status-dot-wrapper ${statusColorClass}`}
                                    title={`Status: ${statusLabel}`}
                                    aria-label={`Connection status: ${statusLabel}`}
                                    role="status"
                                >
                                    <span className="status-dot-core" />
                                    <span className="sr-only">Status: {statusLabel}</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={toggleCollapse}
                                    className="footer-ghost-btn desktop-only"
                                    title="Collapse sidebar"
                                    aria-label="Collapse sidebar"
                                    aria-expanded={true}
                                >
                                    <PanelLeftClose className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* 2. BODY (flex-1, min-h-0) */}
                <div className="sidebar-body">
                    {/* a. Workspace Nav */}
                    <div className="sidebar-section">
                        {!isCollapsed && <div className="section-label">WORKSPACE</div>}

                        <nav className="workspace-nav" aria-label="Workspace">
                            <button
                                type="button"
                                className={`workspace-nav-item ${currentPage === 'jobs' ? 'active' : ''}`}
                                onClick={() => handleNavClick('jobs')}
                                aria-current={currentPage === 'jobs' ? 'page' : undefined}
                                title={isCollapsed ? `Jobs (${jobsCount})` : undefined}
                                aria-label={isCollapsed ? `Jobs (${jobsCount})` : undefined}
                            >
                                <Briefcase className="w-4 h-4 shrink-0 nav-item-icon" />
                                {!isCollapsed && (
                                    <>
                                        <span className="nav-item-label">Jobs</span>
                                        {jobsCount > 0 && <span className="nav-item-count">{jobsCount}</span>}
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className={`workspace-nav-item ${currentPage === 'hackathons' ? 'active' : ''}`}
                                onClick={() => handleNavClick('hackathons')}
                                aria-current={currentPage === 'hackathons' ? 'page' : undefined}
                                title={isCollapsed ? `Hackathons (${hackathonsCount})` : undefined}
                                aria-label={isCollapsed ? `Hackathons (${hackathonsCount})` : undefined}
                            >
                                <Trophy className="w-4 h-4 shrink-0 nav-item-icon" />
                                {!isCollapsed && (
                                    <>
                                        <span className="nav-item-label">Hackathons</span>
                                        {hackathonsCount > 0 && <span className="nav-item-count">{hackathonsCount}</span>}
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                className={`workspace-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                                onClick={() => handleNavClick('dashboard')}
                                aria-current={currentPage === 'dashboard' ? 'page' : undefined}
                                title={isCollapsed ? "Dashboard" : undefined}
                                aria-label={isCollapsed ? "Dashboard" : undefined}
                            >
                                <TrendingUp className="w-4 h-4 shrink-0 nav-item-icon" />
                                {!isCollapsed && (
                                    <span className="nav-item-label">Dashboard</span>
                                )}
                            </button>
                        </nav>
                    </div>

                    {/* b & c. Sources section (hidden in collapsed rail on desktop) */}
                    {!isCollapsed && (
                        <div className="sidebar-sources-section">
                            <div className="sources-header-row">
                                <span className="section-label">SOURCES</span>
                                {selectedSource !== 'all' && (
                                    <button
                                        type="button"
                                        onClick={() => handleSourceClick('all')}
                                        className="sources-reset-all-btn"
                                        aria-label="Reset to all channels"
                                    >
                                        All
                                    </button>
                                )}
                            </div>

                            <div className="sources-search-wrapper">
                                <Search className="sources-search-icon" aria-hidden="true" width={15} height={15} />
                                <input
                                    type="text"
                                    className="sources-search-input"
                                    placeholder="Filter channels"
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    aria-label="Filter channels"
                                />
                                {searchFilter && (
                                    <button
                                        type="button"
                                        className="sources-search-clear"
                                        onClick={() => setSearchFilter('')}
                                        aria-label="Clear filter"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <div className="sources-list-container">
                                {/* First row: All channels */}
                                <button
                                    type="button"
                                    className={`channel-row ${selectedSource === 'all' ? 'active' : ''}`}
                                    onClick={() => handleSourceClick('all')}
                                    aria-current={selectedSource === 'all' ? 'true' : undefined}
                                    title="All channels"
                                >
                                    <Radio className="w-3.5 h-3.5 shrink-0 channel-row-icon" />
                                    <span className="channel-row-name min-w-0 truncate">All channels</span>
                                    {typeof totalCount === 'number' && (
                                        <span className="channel-row-count">{totalCount}</span>
                                    )}
                                </button>

                                {/* Channel items */}
                                {visibleSources.map((source) => {
                                    const count = sourceCounts && typeof sourceCounts[source] === 'number'
                                        ? sourceCounts[source]
                                        : null;
                                    const isSelected = selectedSource === source;

                                    return (
                                        <button
                                            key={source}
                                            type="button"
                                            className={`channel-row ${isSelected ? 'active' : ''}`}
                                            onClick={() => handleSourceClick(source)}
                                            aria-current={isSelected ? 'true' : undefined}
                                            title={source}
                                        >
                                            <Hash className="w-3.5 h-3.5 shrink-0 channel-row-icon" />
                                            <span className="channel-row-name min-w-0 truncate" title={source}>
                                                {source}
                                            </span>
                                            {count !== null && (
                                                <span className="channel-row-count">{count}</span>
                                            )}
                                        </button>
                                    );
                                })}

                                {visibleSources.length === 0 && searchFilter && (
                                    <div className="sources-empty-state">
                                        No matching channels
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. FOOTER (48px, top border) */}
                <footer className={`sidebar-footer ${isCollapsed ? 'collapsed' : ''}`}>
                    <ThemeToggle className="footer-ghost-btn" />

                    <a
                        href="https://github.com/adity0208"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-ghost-btn"
                        title="GitHub Profile"
                        aria-label="GitHub Profile"
                    >
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                    </a>

                    <a
                        href="https://www.linkedin.com/in/aditya-kushwaha-512581259/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-ghost-btn"
                        title="LinkedIn Profile"
                        aria-label="LinkedIn Profile"
                    >
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.261-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                        </svg>
                    </a>

                    <a
                        href="mailto:2k22.cse.2213616@gmail.com?subject=Inquiry%20regarding%20Placement%20Alert%20Engine"
                        className="footer-ghost-btn"
                        title="Get in touch"
                        aria-label="Get in touch"
                    >
                        <Mail className="w-[18px] h-[18px] shrink-0" width={18} height={18} />
                    </a>
                </footer>
            </aside>
        </>
    );
}
