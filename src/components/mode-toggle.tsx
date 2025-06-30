import * as React from "react"
import { Moon, Sun } from "lucide-react"

export function ModeToggle() {
  const [theme, setTheme] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:scale-105 active:scale-95 min-w-[90px]`}
      aria-label="Toggle theme"
      type="button"
    >
      <span className="relative flex items-center justify-center w-7 h-7">
        <Sun className={`absolute w-6 h-6 text-yellow-400 transition-all duration-300 ${theme === 'dark' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
        <Moon className={`absolute w-6 h-6 text-blue-500 transition-all duration-300 ${theme === 'dark' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
      </span>
      <span className="text-base font-semibold text-gray-700 dark:text-gray-200 select-none">
        {theme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  )
} 