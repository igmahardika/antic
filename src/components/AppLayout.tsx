import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, Grid, Users, FileText, HeartPulse, Upload, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useDataStore from '@/store/dataStore';

const navItems = [
  { to: '/summary', icon: <Home size={20} />, text: 'Summary' },
  { to: '/grid-view', icon: <Grid size={20} />, text: 'Grid View' },
  { to: '/kanban', icon: <BarChart2 size={20} />, text: 'Kanban' },
  { to: '/ticket-analytics', icon: <FileText size={20} />, text: 'Ticket Analysis' },
  { to: '/agent-analytics', icon: <Users size={20} />, text: 'Agent Analytics' },
  { to: '/customer-analysis', icon: <HeartPulse size={20} />, text: 'Customer Analysis' },
];

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialize = useDataStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-900">
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800 flex flex-col">
        <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-zinc-800">
          <h1 className="text-xl font-bold text-blue-600">Insight</h1>
        </div>
        <nav className="flex-grow px-4 py-4">
          <ul>
            {navItems.map((item) => (
              <li key={item.text}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-2 my-1 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.to
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.icon}
                  {item.text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-4 py-4 border-t border-gray-200 dark:border-zinc-800">
           <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* We can add a header here if needed */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout; 