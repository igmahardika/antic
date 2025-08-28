import * as React from "react"
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Improved theme detection with proper system theme handling
  const isDark = React.useMemo(() => {
    if (!mounted) return false; // Return false during SSR
    if (theme === "dark") return true;
    if (theme === "light") return false;
    if (theme === "system") {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, [theme, mounted]);

  // Listen for system theme changes
  React.useEffect(() => {
    if (!mounted) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === "system") {
        // Force re-render when system theme changes
        setTheme("system");
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, setTheme, mounted]);

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        aria-label="Toggle dark mode"
        className="relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none flex items-center bg-gray-200 dark:bg-zinc-800"
        style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)' }}
      >
        <span className="sr-only">Toggle theme</span>
        <span
          className="absolute top-1 left-1 transition-all duration-300 flex items-center justify-center rounded-full shadow-md bg-gradient-to-tr from-orange-400 to-orange-500"
          style={{ width: '24px', height: '24px' }}
        >
          <Brightness4Icon className="w-5 h-5 text-white" />
        </span>
      </button>
    );
  }

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