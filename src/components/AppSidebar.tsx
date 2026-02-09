import { NavLink } from "react-router-dom";
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
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

import { menuConfig as allMenus } from "@/config/menuConfig";

export default function AppSidebar() {
	// Menu structure is imported from menuConfig

	// Get user info and permissions
	let user: { username: string; role: string } = { username: '', role: 'user' };
	let permissions: any[] = [];
	try {
		user = JSON.parse(localStorage.getItem('user') || '{"role":"user"}');
		permissions = JSON.parse(localStorage.getItem('menuPermissions') || '[]');
	} catch { }

	// Filter menus based on user permissions
	const getFilteredMenus = (userRole: string, permissions: any[]) => {
		const userPermissions = permissions.find(p => p.role === userRole);
		if (!userPermissions) return allMenus; // Show all if no permissions found

		return allMenus.filter(menu => {
			if (menu.children) {
				menu.children = menu.children.filter(child =>
					userPermissions.menus.includes(child.name)
				);
				return menu.children.length > 0;
			}
			return userPermissions.menus.includes(menu.name);
		});
	};

	const allowedMenus = getFilteredMenus(user.role, permissions);

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
							{allowedMenus.map((menu) => renderMenu(menu))}
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
