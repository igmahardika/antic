import * as React from "react"
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Untuk SSR/first render, fallback ke localStorage
  React.useEffect(() => {
    if (!theme) {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') setTheme('dark');
      if (stored === 'light') setTheme('light');
    }
  }, [theme, setTheme]);

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      aria-label="Toggle dark mode"
      onClick={handleToggle}
      className="relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none flex items-center bg-gray-200 dark:bg-zinc-800"
      style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)' }}
    >
      {/* Track */}
      <span className="sr-only">Toggle theme</span>
      {/* Knob */}
      <span
        className={`absolute top-1 left-1 transition-all duration-300 flex items-center justify-center rounded-full shadow-md"
          ${isDark ? 'translate-x-6 bg-gradient-to-tr from-blue-500 to-blue-400' : 'translate-x-0 bg-gradient-to-tr from-orange-400 to-orange-500'}`}
        style={{ width: '24px', height: '24px' }}
      >
        {isDark ? (
          <Brightness7Icon className="w-5 h-5 text-blue-100" />
        ) : (
          <Brightness4Icon className="w-5 h-5 text-white" />
        )}
      </span>
    </button>
  );
} 