export default function Header() {
    return (
        <header className="bg-slate-900/50 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 max-w-4xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">🎯</div>
                        <div>
                            <h1 className="text-2xl font-bold text-gradient">
                                Placement Alerts
                            </h1>
                            <p className="text-sm text-gray-400">Real-time job notifications</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Powered by</span>
                        <span className="text-sm font-semibold text-blue-400">Telegram</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
