export default function Header() {
    return (
        <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 max-w-4xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">🎯</div>
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                                Placement Alerts
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)]">Real-time job notifications</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)]">Powered by</span>
                        <span className="text-sm font-semibold color-[var(--text-primary)]">Telegram</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
