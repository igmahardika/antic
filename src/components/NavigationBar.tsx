import React from 'react';
import { 
  Search as SearchIcon, 
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface NavigationBarProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ onMenuToggle, isSidebarOpen = true }) => {
  return (
    <nav className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-50 shadow-sm">
      {/* Left Section - Logo and Menu Toggle */}
      <div className="flex items-center gap-4">
        {/* Menu Toggle Button (for mobile) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuToggle}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <MenuIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Helpdesk Management
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              System Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search incidents, sites, or agents..."
            className="pl-10 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section - Notifications and User */}
      <div className="flex items-center gap-3">
        {/* Search Button (mobile) */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <SearchIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <NotificationsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
            3
          </Badge>
        </Button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-zinc-700">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Admin User
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Administrator
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
          >
            <AccountCircleIcon className="w-8 h-8 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
