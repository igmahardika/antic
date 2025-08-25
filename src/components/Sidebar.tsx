import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  BugReport as BugReportIcon,
  LocationOn as LocationOnIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon className="w-5 h-5" />,
    path: '/'
  },
  {
    id: 'incident-analytics',
    label: 'Incident Analytics',
    icon: <BugReportIcon className="w-5 h-5" />,
    path: '/incident-analytics'
  },
  {
    id: 'ts-analytics',
    label: 'TS Analytics',
    icon: <AnalyticsIcon className="w-5 h-5" />,
    path: '/ts-analytics'
  },
  {
    id: 'site-analytics',
    label: 'Site Analytics',
    icon: <LocationOnIcon className="w-5 h-5" />,
    path: '/site-analytics'
  },
  {
    id: 'agent-analytics',
    label: 'Agent Analytics',
    icon: <PeopleIcon className="w-5 h-5" />,
    path: '/agent-analytics'
  },
  {
    id: 'customer-data',
    label: 'Customer Data',
    icon: <BusinessIcon className="w-5 h-5" />,
    path: '/customer-data'
  },
  {
    id: 'incident-data',
    label: 'Incident Data',
    icon: <AssessmentIcon className="w-5 h-5" />,
    path: '/incident-data'
  },
  {
    id: 'admin-panel',
    label: 'Admin Panel',
    icon: <SettingsIcon className="w-5 h-5" />,
    path: '/admin-panel'
  }
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Helpdesk
              </h2>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-12 px-4 text-left",
                    isActive 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  )}
                  onClick={() => handleNavigation(item.path)}
                >
                  <div className={cn(
                    "flex items-center justify-center w-5 h-5",
                    isActive ? "text-white" : "text-gray-500 dark:text-gray-400"
                  )}>
                    {item.icon}
                  </div>
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-200 dark:border-zinc-800 p-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                Admin User
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Online
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
