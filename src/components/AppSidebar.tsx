import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

// Icons
import HomeIcon from '@mui/icons-material/Home';
import TableChartIcon from '@mui/icons-material/TableChart';
import GroupIcon from '@mui/icons-material/Group';
import BarChartIcon from '@mui/icons-material/BarChart';
import PersonCheckIcon from '@mui/icons-material/HowToReg';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import WarningIcon from '@mui/icons-material/Warning';
import ScienceIcon from '@mui/icons-material/Science';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import StorageIcon from '@mui/icons-material/Storage';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MessageIcon from '@mui/icons-material/Message';
// LogoutIcon removed - not used

export default function AppSidebar() {
  // Menu structure
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
        {
          name: 'Upload Data',
          path: '/ticket/upload',
          icon: <CloudUploadIcon sx={{ fontSize: 16 }} />,
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
      name: 'Escalation',
      path: '/escalation',
      icon: <TrendingUpIcon sx={{ fontSize: 16 }} />,
      children: [
        {
          name: 'Escalation Card',
          path: '/escalation/escalation-card',
          icon: <DashboardIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Escalation Data',
          path: '/escalation/escalation-data',
          icon: <TableChartIcon sx={{ fontSize: 16 }} />,
        },
        {
          name: 'Briefing',
          path: '/escalation/briefing',
          icon: <MessageIcon sx={{ fontSize: 16 }} />,
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

  // Get user info (commented out - not used)
  // let user: { username: string; role: string } = { username: '', role: 'user' };
  // try {
  //   user = JSON.parse(localStorage.getItem('user') || '{"role":"user"}');
  // } catch {}

  // Render menu items
  const renderMenu = (menu: any) => {
    if (menu.children && menu.children.length > 0) {
      return (
        <Collapsible key={menu.path} defaultOpen className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton>
                {menu.icon}
                <span>{menu.name}</span>
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {menu.children.map((child: any) => (
                  <SidebarMenuSubItem key={child.path}>
                    <SidebarMenuSubButton asChild>
                      <NavLink to={child.path}>
                        {child.icon}
                        <span>{child.name}</span>
                      </NavLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={menu.path}>
        <SidebarMenuButton asChild>
          <NavLink to={menu.path}>
            {menu.icon}
            <span>{menu.name}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    // Menambahkan properti collapsible="icon" agar sidebar menyusut menjadi ikon
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex flex-col items-center justify-center pt-5 pb-3 gap-2">
          <img
            src="/logo-b.png"
            alt="Helpdesk Management System Logo"
            className="max-w-[85%] h-14 object-contain mx-auto"
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allMenus.map((menu) => renderMenu(menu))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col items-center gap-4">
          {/* Avatar with dropdown profile */}
          {/* Mode Toggle */}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
