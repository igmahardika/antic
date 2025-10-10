import { NavLink } from "react-router-dom";
import {
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
} from "@/components/ui/collapsible";
import {
	User2,
	ChevronDown,
	ChevronUp,
	LogOut,
	CreditCard,
	Bell,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Icons from MUI used for existing menus
import HomeIcon from "@mui/icons-material/Home";
import TableChartIcon from "@mui/icons-material/TableChart";
import GroupIcon from "@mui/icons-material/Group";
import BarChartIcon from "@mui/icons-material/BarChart";
import PersonCheckIcon from "@mui/icons-material/HowToReg";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";
import WarningIcon from "@mui/icons-material/Warning";
import ScienceIcon from "@mui/icons-material/Science";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import StorageIcon from "@mui/icons-material/Storage";
import MenuBookIcon from "@mui/icons-material/MenuBook";

/**
 * A composable, themeable and customizable sidebar component built on top of
 * shadcn/ui. This component groups navigation items into sections and
 * demonstrates how to compose the primitive sidebar parts together.
 */
export default function AppSidebar() {
	// Define the menu structure used in the application. Each menu can have
	// optional children for nested routes. These definitions are reused below
	// when rendering the menu sections.
	const allMenus = [
		{
			name: "Dashboard",
			path: "/",
			icon: <HomeIcon sx={{ fontSize: 16 }} />,
		},
		{
			name: "Ticket",
			path: "/ticket",
			icon: <ConfirmationNumberIcon sx={{ fontSize: 16 }} />,
			children: [
				{
					name: "Ticket Data",
					path: "/ticket/grid-view",
					icon: <TableChartIcon sx={{ fontSize: 16 }} />,
				},
				{
					name: "Customer Analytics",
					path: "/ticket/kanban-board",
					icon: <GroupIcon sx={{ fontSize: 16 }} />,
				},
				{
					name: "Ticket Analytics",
					path: "/ticket/ticket-analytics",
					icon: <BarChartIcon sx={{ fontSize: 16 }} />,
				},
				{
					name: "Agent Analytics",
					path: "/ticket/agent-analytics",
					icon: <PersonCheckIcon sx={{ fontSize: 16 }} />,
				},
				{
					name: "Upload Data",
					path: "/ticket/upload",
					icon: <CloudUploadIcon sx={{ fontSize: 16 }} />,
				},
			],
		},
		{
			name: "Incident",
			path: "/incident",
			icon: <WarningIcon sx={{ fontSize: 16 }} />,
			children: [
				{
					name: "Incident Data",
					path: "/incident/data",
					icon: <TableChartIcon sx={{ fontSize: 16 }} />,
				},
				{
					name: "Incident Analytics",
					path: "/incident/analytics",
					icon: <BarChartIcon sx={{ fontSize: 16 }} />,
				},
				{
					name: "Technical Support Analytics",
					path: "/incident/ts-analytics",
					icon: <ScienceIcon sx={{ fontSize: 16 }} />,
				},
				{
					name: "Site Analytics",
					path: "/incident/site-analytics",
					icon: <GroupIcon sx={{ fontSize: 16 }} />,
				},
			],
		},
		{
			name: "Master Data",
			path: "/masterdata",
			icon: <StorageIcon sx={{ fontSize: 16 }} />,
			children: [
				{
					name: "Agent Data",
					path: "/masterdata/data-agent",
					icon: <PersonIcon sx={{ fontSize: 16 }} />,
				},
				{
					name: "Customer Data",
					path: "/masterdata/data-customer",
					icon: <GroupIcon sx={{ fontSize: 16 }} />,
				},
			],
		},
		{
			name: "Documentation",
			path: "/documentation",
			icon: <MenuBookIcon sx={{ fontSize: 16 }} />,
			children: [
				{
					name: "Formulas",
					path: "/documentation/admin-rumus",
					icon: <ScienceIcon sx={{ fontSize: 16 }} />,
				},
			],
		},
		{
			name: "Admin Panel",
			path: "/admin",
			icon: <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />,
		},
	];

	/**
	 * Helper function to render individual menu items. When a menu has
	 * children, a Collapsible is used to toggle the nested submenu. Otherwise
	 * a single `SidebarMenuItem` is returned.
	 */
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
											<NavLink
												to={child.path}
												className={({ isActive }) =>
													isActive ? "text-sidebar-primary" : undefined
												}
											>
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
					<NavLink
						to={menu.path}
						className={({ isActive }) =>
							isActive ? "text-sidebar-primary" : undefined
						}
					>
						{menu.icon}
						<span>{menu.name}</span>
					</NavLink>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	};

	// Partition the menus into logical groups. This mimics the example from
	// shadcn/ui where navigation is grouped by section. Feel free to adjust
	// these groupings based on your application's information architecture.
	const generalMenus = allMenus.filter((m) => m.name === "Dashboard");
	const managementMenus = allMenus.filter((m) =>
		["Ticket", "Incident", "Master Data"].includes(m.name),
	);
	const otherMenus = allMenus.filter((m) =>
		["Documentation", "Admin Panel"].includes(m.name),
	);

	return (
		<Sidebar collapsible="icon">
			{/* Header with application name. You can customize the title and subtitle
      here. */}
			<SidebarHeader>
				<div className="flex flex-col items-start px-4 py-5 gap-1">
					<span className="text-base font-medium leading-none">Helpdesk</span>
					<span className="text-xs text-muted-foreground">Management</span>
				</div>
			</SidebarHeader>

			<SidebarContent>
				{/* General section */}
				<SidebarGroup>
					<SidebarGroupLabel>General</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{generalMenus.map((menu) => renderMenu(menu))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				{/* Management section */}
				<SidebarGroup>
					<SidebarGroupLabel>Management</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{managementMenus.map((menu) => renderMenu(menu))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
				{/* Other section */}
				<SidebarGroup>
					<SidebarGroupLabel>Other</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{otherMenus.map((menu) => renderMenu(menu))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			{/* User menu in the footer. This demonstrates how to combine the
      sidebar components with dropdown menus and avatars. */}
			<SidebarFooter>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						{/* Wrap the trigger in a full-width menu button so it collapses
            gracefully when the sidebar is collapsed. */}
						<SidebarMenuButton asChild className="w-full">
							<button className="flex w-full items-center gap-3 px-4 py-3">
								<Avatar className="h-8 w-8">
									{/* Replace the src with your own avatar URL or use the
                  fallback initials if not available. */}
									<AvatarImage src="/logo-b.png" alt="User avatar" />
									<AvatarFallback>HD</AvatarFallback>
								</Avatar>
								<div className="flex flex-col flex-1 overflow-hidden">
									<span className="truncate">shadcn</span>
									<span className="truncate text-xs text-muted-foreground">
										m@example.com
									</span>
								</div>
								<ChevronUp className="ml-auto h-4 w-4" />
							</button>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						side="top"
						align="start"
						className="w-[--radix-popper-anchor-width]"
					>
						{/* Larger user info at the top of the dropdown */}
						<div className="flex items-center gap-3 px-4 py-3">
							<Avatar className="h-8 w-8">
								<AvatarImage src="/logo-b.png" alt="User avatar" />
								<AvatarFallback>HD</AvatarFallback>
							</Avatar>
							<div className="flex flex-col overflow-hidden">
								<span className="font-medium leading-none">shadcn</span>
								<span className="truncate text-xs text-muted-foreground">
									m@example.com
								</span>
							</div>
						</div>
						<DropdownMenuItem>
							<CreditCard className="mr-2 h-4 w-4" /> Upgrade to Pro
						</DropdownMenuItem>
						<DropdownMenuItem>
							<User2 className="mr-2 h-4 w-4" /> Account
						</DropdownMenuItem>
						<DropdownMenuItem>
							<CreditCard className="mr-2 h-4 w-4" /> Billing
						</DropdownMenuItem>
						<DropdownMenuItem>
							<Bell className="mr-2 h-4 w-4" /> Notifications
						</DropdownMenuItem>
						<DropdownMenuItem>
							<LogOut className="mr-2 h-4 w-4" /> Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
