export default function ConnectionStatus({ connected, notificationPermission, onRequestPermission }) {
    return (
        <div className="mb-6 space-y-3">
            {/* WebSocket Status */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${connected
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-sm font-medium">
                    {connected ? '✅ Connected to server' : '❌ Disconnected - Reconnecting...'}
                </span>
            </div>

            {/* Notification Permission */}
            {notificationPermission !== 'granted' && (
                <div className="flex items-center justify-between px-4 py-3 rounded-lg border bg-yellow-500/10 border-yellow-500/30">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🔔</span>
                        <div>
                            <p className="text-sm font-medium text-yellow-400">Enable Notifications</p>
                            <p className="text-xs text-yellow-500/70">Get instant alerts for new jobs</p>
                        </div>
                    </div>
                    <button
                        onClick={onRequestPermission}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-lg text-sm font-semibold transition-colors"
                    >
                        Enable
                    </button>
                </div>
            )}
        </div>
    );
}
