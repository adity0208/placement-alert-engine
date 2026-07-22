import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('placement_theme');
        if (saved !== null) {
            return saved === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('placement_theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('placement_theme', 'light');
        }
    }, [isDark]);

    return (
        <button
            onClick={() => setIsDark(!isDark)}
            className="theme-toggle-btn"
            title={isDark ? "Switch to Warm Light Mode" : "Switch to Pitch Black Dark Mode"}
            aria-label="Toggle Theme"
        >
            {isDark ? (
                <>
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Light Mode</span>
                </>
            ) : (
                <>
                    <Moon className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Dark Mode</span>
                </>
            )}
        </button>
    );
}
