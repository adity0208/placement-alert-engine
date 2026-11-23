import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className }) {
    const [isDark, setIsDark] = useState(() => {
        try {
            const saved = localStorage.getItem('placement_theme');
            if (saved !== null) {
                return saved === 'dark';
            }
        } catch (e) {}
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        try {
            if (isDark) {
                root.classList.add('dark');
                localStorage.setItem('placement_theme', 'dark');
            } else {
                root.classList.remove('dark');
                localStorage.setItem('placement_theme', 'light');
            }
        } catch (e) {}
    }, [isDark]);

    return (
        <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={className || "footer-ghost-btn"}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {isDark ? (
                <Sun className="w-[18px] h-[18px] shrink-0" width={18} height={18} />
            ) : (
                <Moon className="w-[18px] h-[18px] shrink-0" width={18} height={18} />
            )}
        </button>
    );
}
