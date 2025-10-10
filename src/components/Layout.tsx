import React, { useState } from "react";
import { SidebarNav } from "./ui/navigation-menu";
import PageWrapper from "./PageWrapper";

const Layout = ({ children }: { children: React.ReactNode }) => {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const sidebarWidth = sidebarCollapsed ? 64 : 256; // px

	return (
		<div className="min-h-screen flex transition-all duration-300 bg-gradient-to-r from-white to-blue-100 dark:from-black dark:to-blue-950">
			<SidebarNav
				isMobileOpen={isMobileOpen}
				setIsMobileOpen={setIsMobileOpen}
				onCollapseChange={setSidebarCollapsed}
			/>
			<main
				className="flex-1 transition-all duration-300"
				style={{ paddingLeft: sidebarCollapsed ? 64 : 256 }}
			>
				<PageWrapper maxW="4xl">{children}</PageWrapper>
			</main>
		</div>
	);
};

export default Layout;
