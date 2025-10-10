import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "./mode-toggle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import PersonIcon from "@mui/icons-material/Person";

const ModernHeader = () => {
	return (
		<header className="bg-card text-card-foreground  border-b-0 sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 shadow-lg rounded-b-2xl p-4 md:p-6">
			<div
				className="absolute left-0 right-0 h-1 bg-primary opacity-60 rounded-b-2xl"
				style={{ bottom: 0 }}
			/>
			<div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-16">
				<div className="flex flex-col md:flex-row items-center justify-between h-auto md:h-20 gap-4 md:gap-6">
					{/* Logo & Brand */}
					<div className="flex items-center gap-4 md:gap-6">
						<img
							src="/logo-b.png"
							alt="Helpdesk Management System Logo"
							className="h-12 w-auto drop-shadow-lg rounded-xl"
						/>
						<span className="text-xl font-extrabold text-primary tracking-tight">
							Insight Dashboard
						</span>
					</div>
					{/* Search Bar */}
					<div className="w-full md:flex-1 max-w-lg mx-0 md:mx-8 hidden md:block">
						<div className="relative w-full">
							<SearchIcon
								className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
								aria-label="Search"
							/>
							<Input
								type="text"
								placeholder="Search tickets, customers, or agents..."
								className="pl-12 bg-gray-50 dark:bg-gray-800 border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 rounded-xl text-base shadow"
							/>
						</div>
					</div>
					{/* Actions */}
					<div className="flex items-center space-x-3 md:space-x-4">
						<ModeToggle />
						<Button
							variant="ghost"
							size="icon"
							className="relative hover:bg-muted transition shadow-lg"
						>
							<NotificationsIcon
								className="w-5 h-5"
								aria-label="Notifications"
							/>
							<span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive border-2 border-white rounded-full shadow-lg animate-pulse"></span>
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="hover:bg-muted transition shadow-lg"
						>
							<SettingsIcon className="w-5 h-5" aria-label="Settings" />
						</Button>
						<div className="h-7 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
						<Button
							variant="ghost"
							size="icon"
							className="hover:bg-muted transition shadow-lg"
						>
							<PersonIcon className="w-5 h-5" aria-label="User" />
						</Button>
					</div>
				</div>
			</div>
		</header>
	);
};

export default ModernHeader;
