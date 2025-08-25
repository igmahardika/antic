import * as React from "react"
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { Link, useLocation, NavLink } from 'react-router-dom'
import HomeIcon from '@mui/icons-material/Home';
import TableChartIcon from '@mui/icons-material/TableChart';
import GroupIcon from '@mui/icons-material/Group';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonCheckIcon from '@mui/icons-material/HowToReg';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ModeToggle } from '../mode-toggle';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import LogoutIcon from '@mui/icons-material/Logout';
import ScienceIcon from '@mui/icons-material/Science';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import StorageIcon from '@mui/icons-material/Storage';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WarningIcon from '@mui/icons-material/Warning';

import { cn } from "@/lib/utils"

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn(
      "relative z-10 flex max-w-max flex-1 items-center justify-center",
      className
    )}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn(
      "group flex flex-1 list-none items-center justify-center space-x-1",
      className
    )}
    {...props}
  />
))
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName

const NavigationMenuItem = NavigationMenuPrimitive.Item

const navigationMenuTriggerStyle = cva(
  `group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-base font-semibold transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5271ff] focus-visible:ring-offset-2
  disabled:pointer-events-none disabled:opacity-50
  data-[active]:bg-[#5271ff] data-[active]:text-white data-[active]:shadow-2xl data-[active]:backdrop-blur-md
  data-[inactive]:bg-[rgba(82,113,255,0.10)] data-[inactive]:text-[#5271ff] data-[inactive]:border data-[inactive]:border-white/20 data-[inactive]:backdrop-blur-md data-[inactive]:shadow
  hover:bg-[#5271ff] hover:text-white`
)

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, style, ...props }, ref) => {
  // Paksa style inline jika tab aktif
  const isActive = props['data-state'] === 'active';
  const forcedStyle = isActive ? { background: '#5271ff', color: '#fff', boxShadow: '0 8px 32px 0 rgba(82,113,255,0.25)', backdropFilter: 'blur(8px)', ...style } : style;
  return (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
      className={cn(navigationMenuTriggerStyle(), 'group', className)}
      style={forcedStyle}
    {...props}
  >
      {props.children} {" "}
    <ExpandMoreIcon
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
  );
})
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ",
      className
    )}
    {...props}
  />
))
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName

const NavigationMenuLink = NavigationMenuPrimitive.Link

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
        className
      )}
      ref={ref}
      {...props}
    />
  </div>
))
NavigationMenuViewport.displayName =
  NavigationMenuPrimitive.Viewport.displayName

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
))
NavigationMenuIndicator.displayName =
  NavigationMenuPrimitive.Indicator.displayName

export function NavigationMenuBar() {
  const location = useLocation();
  const menus = [
    { name: 'Dashboard', path: '/' },
    { name: 'Data Grid', path: '/grid-view' },
    { name: 'Customer Analytics', path: '/kanban-board' },
    { name: 'Ticket Analytics', path: '/ticket-analytics' },
    { name: 'Agent Analytics', path: '/agent-analytics' },
    { name: 'Upload Data', path: '/upload' },
    { name: 'Master Data Agent', path: '/master-agent' },
    { name: 'Admin Panel', path: '/admin' },
  ];
  return (
    <nav className="flex gap-2 items-center">
      {menus.map(menu => (
        <Link
          key={menu.path}
          to={menu.path}
          className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200 ${location.pathname === menu.path ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}
        >
          {menu.name}
        </Link>
      ))}
    </nav>
  );
}

export function SidebarNav({ onCollapseChange }: {
  onCollapseChange?: (collapsed: boolean) => void;
}) {
  // Struktur menu baru: nested
  const allMenus = [
    {
      name: 'Dashboard',
      path: '/',
                icon: <HomeIcon sx={{ fontSize: 16 }} />,
    },
    {
      name: 'Ticket',
      path: '/ticket',
      icon: <ConfirmationNumberIcon sx={{ fontSize: 16 }} />,
      children: [
        {
          name: 'Ticket Data',
          path: '/ticket/grid-view',
          icon: <TableChartIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Customer Analytics',
          path: '/ticket/kanban-board',
          icon: <GroupIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Ticket Analytics',
          path: '/ticket/ticket-analytics',
          icon: <BarChartIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Agent Analytics',
          path: '/ticket/agent-analytics',
          icon: <PersonCheckIcon sx={{ fontSize: 16 }} />,
        },
      ],
    },
    {
      name: 'Incident',
      path: '/incident',
      icon: <WarningIcon sx={{ fontSize: 16 }} />,
      children: [
        {
          name: 'Incident Data',
          path: '/incident/data',
          icon: <TableChartIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Incident Analytics',
          path: '/incident/analytics',
          icon: <BarChartIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Technical Support Analytics',
          path: '/incident/ts-analytics',
          icon: <ScienceIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Site Analytics',
          path: '/incident/site-analytics',
          icon: <GroupIcon sx={{ fontSize: 16 }} />,
        },
      ],
    },
    {
      name: 'Master Data',
      path: '/masterdata',
      icon: <StorageIcon sx={{ fontSize: 16 }} />,
      children: [
        {
          name: 'Agent Data',
          path: '/masterdata/data-agent',
          icon: <PersonIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Customer Data',
          path: '/masterdata/data-customer',
          icon: <GroupIcon sx={{ fontSize: 16 }} />,
        },
      ],
    },
    {
      name: 'Documentation',
      path: '/documentation',
      icon: <MenuBookIcon sx={{ fontSize: 16 }} />,
      children: [
        {
          name: 'Upload Data',
          path: '/documentation/upload',
          icon: <CloudUploadIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Formulas',
          path: '/documentation/admin-rumus',
          icon: <ScienceIcon sx={{ fontSize: 16 }} />,
        },
      ],
    },
    {
      name: 'Admin Panel',
      path: '/admin',
      icon: <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />,
    },
  ];
  // Selalu tampilkan semua menu, tanpa filter permission/role
  const allowedMenus: any[] = allMenus;
  let user: { username: string; role: string } = { username: '', role: 'user' };
  try {
    user = JSON.parse(localStorage.getItem('user') || '{"role":"user"}');
    // const permissions = JSON.parse(localStorage.getItem('menuPermissions') || '{}'); // Removed unused variable

    // allowedMenus = allMenus.filter(menu => allowed.includes(menu.name)); // This line is removed
  } catch {}
  // Responsive/collapse logic (hover only)
  const [autoCollapsed, setAutoCollapsed] = React.useState(false);
  const handleMouseEnter = () => {
    setAutoCollapsed(false);
    window.dispatchEvent(new CustomEvent('sidebar:collapse', { detail: { collapsed: false } }));
    if (onCollapseChange) onCollapseChange(false);
  };
  const handleMouseLeave = () => {
    setAutoCollapsed(true);
    window.dispatchEvent(new CustomEvent('sidebar:collapse', { detail: { collapsed: true } }));
    if (onCollapseChange) onCollapseChange(true);
  };

  // Modern sidebar style
  const sidebarClass = `h-full bg-white dark:bg-zinc-900 shadow-xl border-r border-gray-200 dark:border-zinc-800 flex flex-col top-0 left-0 transition-all duration-300 fixed z-40 md:static md:z-auto md:block`;

  // Fungsi render menu dan submenu
  const renderMenu = (menu: any, parent = false) => {
    if (menu.children && menu.children.length > 0) {
      return (
        <div key={menu.path} className={parent ? '' : 'mb-2'}>
          <div
            className={`group flex items-center gap-1.5 px-3 py-2.5 my-1 rounded-xl font-bold text-[14px] transition-all duration-200 text-zinc-700 dark:text-zinc-200 ${autoCollapsed ? 'justify-center px-2' : ''}`}
            title={menu.name}
          >
            {menu.icon}
            <span className={`${autoCollapsed ? 'hidden' : 'block'} transition-all duration-200`} style={{ whiteSpace: 'nowrap' }}>{menu.name}</span>
          </div>
          <div className={`${autoCollapsed ? 'hidden' : 'block'} ml-4`}> {/* Indent submenu */}
            {menu.children.map((child) => renderMenu(child, true))}
          </div>
        </div>
      );
    }
    return (
      <NavLink
        key={menu.path}
        to={menu.path}
        className={({ isActive }) =>
          `group flex items-center gap-1.5 px-3 py-2 my-1 rounded-xl font-medium text-[13px] transition-all duration-200 ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-zinc-800/60'} ${autoCollapsed ? 'justify-center px-2' : ''}`
        }
        title={menu.name}
      >
        {menu.icon}
        <span className={`${autoCollapsed ? 'hidden' : 'block'} transition-all duration-200`} style={{ whiteSpace: 'nowrap' }}>{menu.name}</span>
        {/* Tooltip for collapsed mode */}
        {autoCollapsed && (
          <span className="absolute left-full ml-1.5 px-1.5 py-0.5 rounded bg-zinc-900 text-white text-xs shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
            {menu.name}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={sidebarClass + ' relative'}
      style={{
        minHeight: '100vh',
        width: autoCollapsed ? '70px !important' : '260px !important',
        maxWidth: autoCollapsed ? '70px !important' : '260px !important',
        boxShadow: '0 4px 32px 0 rgba(0,0,0,0.07)',
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
        zIndex: 40,
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div>
        {/* Logo area */}
        <div className="flex flex-col items-center justify-center pt-5 pb-3 gap-2">
          <img
            src="/logo-a.png"
            alt="Helpdesk Management System Logo"
            className="max-w-[85%] h-14 object-contain mx-auto"
            style={{ display: autoCollapsed ? 'none' : 'block' }}
          />
        </div>
        {/* Menu */}
        <nav className="flex flex-col gap-1 px-1.5">
          {allowedMenus.map((menu) => renderMenu(menu))}
        </nav>
      </div>
      {/* Bottom section: Avatar/Profile & ModeToggle, modern layout */}
      <div className="absolute bottom-6 left-0 w-full flex flex-col items-center gap-4">
        {/* Avatar dengan dropdown profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center focus:outline-none group">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-lg font-bold">
                  {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48" align="center">
            <DropdownMenuLabel>
              <div className="font-semibold text-gray-900 dark:text-white text-sm text-center">{user.username || 'User'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize text-center">{user.role} Role</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { 
              try {
                const authToken = localStorage.getItem('auth_token');
                if (authToken) {
                  await fetch('http://localhost:3001/logout', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${authToken}`,
                      'Content-Type': 'application/json',
                    },
                  });
                }
              } catch (error) {
                console.error('Logout error:', error);
              } finally {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
                localStorage.removeItem('session_id');
                // DISABLED: Login redirect - Login page is disabled
                // window.location.href = '/login';
                window.location.href = '/summary-dashboard';
              }
            }} className="cursor-pointer text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/50 dark:focus:text-red-400 font-semibold">
              <LogoutIcon className="mr-2 h-3.5 w-3.5" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Mode Toggle dengan tooltip */}
        <div className="relative group">
          <ModeToggle />
          <span className="absolute left-1/2 -translate-x-1/2 mt-1.5 px-1.5 py-0.5 rounded bg-zinc-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            Toggle dark mode
          </span>
        </div>
      </div>
    </aside>
  );
}



export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
}
