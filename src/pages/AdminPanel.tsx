import React, { useRef, useEffect } from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { userAPI, menuPermissionAPI, User, MenuPermission } from "../lib/api";
import MigrationPanel from "../components/MigrationPanel";
import PageWrapper from "../components/PageWrapper";
import { logger } from "@/lib/logger";

const allRoles = ["super admin", "admin", "user"] as const;
type Role = (typeof allRoles)[number];
const allMenus = [
	// Dashboard & Overview
	"Dashboard",

	// Ticket Management
	"Ticket Data",
	"Customer Analytics",
	"Ticket Analytics",
	"Agent Analytics",
	"Upload Data",

	// Incident Management
	"Incident Data",
	"Incident Analytics",
	"Technical Support Analytics",
	"Site Analytics",

	// Master Data
	"Agent Data",
	"Customer Data",

	// Documentation & Tools
	"Formulas",

	// Administration
	"Admin Panel",
];

// Note: Password hashing is now handled by the backend API

const AdminPanel: React.FC = () => {
	const [users, setUsers] = React.useState<User[]>([]);
	const [username, setUsername] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [role, setRole] = React.useState<Role>("user");
	const [success, setSuccess] = React.useState(false);
	const [error, setError] = React.useState("");
	const [showPassword, setShowPassword] = React.useState(false);
	const [pendingAdd, setPendingAdd] = React.useState(false);
	// const [pendingEdit, setPendingEdit] = React.useState(false); // Removed unused state
	const [editUserIdx, setEditUserIdx] = React.useState<number | null>(null);
	const [editUsername, setEditUsername] = React.useState("");
	const [editPassword, setEditPassword] = React.useState("");
	const [editRole, setEditRole] = React.useState<Role>("user");
	const [showEditPassword, setShowEditPassword] = React.useState(false);
	const [menuPermissions, setMenuPermissions] = React.useState<
		MenuPermission[]
	>([]);
	const [selectedRoleForEditing, setSelectedRoleForEditing] =
		React.useState<Role>("user");
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Load users and permissions from MySQL API
	useEffect(() => {
		loadData();
	}, []);

	// Memory leak prevention for success message
	useEffect(() => {
		if (success) {
			const timer = setTimeout(() => setSuccess(false), 3000);
			return () => clearTimeout(timer);
		}
	}, [success]);

	const loadData = async () => {
		try {
			const [usersData, permissionsData] = await Promise.all([
				userAPI.getUsers(),
				menuPermissionAPI.getPermissions(),
			]);
			setUsers(usersData);
			setMenuPermissions(permissionsData);
		} catch (err) {
			logger.error("Failed to load data:", err);
			
			// Provide more specific error messages
			if (err instanceof Error) {
				if (err.message.includes('CORS error')) {
					setError("API server CORS configuration issue. Please contact administrator.");
				} else if (err.message.includes('Network error')) {
					setError("Unable to connect to API server. Please check your internet connection.");
				} else if (err.message.includes('HTTP error! status: 301')) {
					setError("API endpoint redirect issue. Please refresh the page and try again.");
				} else {
					setError(`Failed to load data: ${err.message}`);
				}
			} else {
				setError("Failed to load data. Please check your connection.");
			}
		}
	};

	// Add user
	const handleAddUser = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!username || !password) return;

		setPendingAdd(true);
		setError("");

		try {
			await userAPI.addUser({ username, password, role });
			await loadData(); // Reload data
			setUsername("");
			setPassword("");
			setRole("user");
			setSuccess(true);
		} catch (err) {
			logger.error("Failed to add user:", err);
			setError(err instanceof Error ? err.message : "Failed to add user");
		} finally {
			setPendingAdd(false);
		}
	};

	// Edit user
	const openEditModal = (idx: number) => {
		setEditUserIdx(idx);
		setEditUsername(users[idx].username);
		setEditPassword("");
		setEditRole(users[idx].role as Role);
	};
	const closeEditModal = () => {
		setEditUserIdx(null);
		setEditUsername("");
		setEditPassword("");
		setEditRole("user");
	};

	// Keyboard navigation for modal
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			closeEditModal();
		}
	};
	const handleEditUser = async (e: React.FormEvent) => {
		e.preventDefault();
		if (editUserIdx === null) return;

		// Client-side username validation
		const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
		if (!usernameRegex.test(editUsername)) {
			setError(
				"Username must be 3-50 characters, alphanumeric with _ or - only",
			);
			return;
		}

		// Client-side password validation (if password is provided)
		if (editPassword && editPassword.trim()) {
			const passwordRegex =
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/;
			if (!passwordRegex.test(editPassword)) {
				setError(
					"Password must be 8+ characters with uppercase, lowercase, number, and special character (@$!%*?&)",
				);
				return;
			}
		}

		setError("");

		try {
			const user = users[editUserIdx];
			const updateData: { username: string; password?: string; role: string } =
				{
					username: editUsername,
					role: editRole,
				};

			if (editPassword && editPassword.trim()) {
				updateData.password = editPassword;
			}

			await userAPI.updateUser(user.id, updateData);
			await loadData(); // Reload data
			closeEditModal();
		} catch (err) {
			logger.error("Failed to update user:", err);
			setError(err instanceof Error ? err.message : "Failed to update user");
		}
	};
	// Delete user
	const handleDeleteUser = async (id?: number) => {
		if (!id) return;

		if (!confirm("Are you sure you want to delete this user?")) return;

		try {
			await userAPI.deleteUser(id);
			await loadData(); // Reload data
		} catch (err) {
			logger.error("Failed to delete user:", err);
			setError(err instanceof Error ? err.message : "Failed to delete user");
		}
	};

	// Menu permissions logic
	const getMenusForRole = (role: Role) =>
		menuPermissions.find((mp) => mp.role === role)?.menus || [];

	const handlePermissionChange = async (menu: string, role: Role) => {
		try {
			const currentMenus = getMenusForRole(role);
			const newMenus = currentMenus.includes(menu)
				? currentMenus.filter((m) => m !== menu)
				: [...currentMenus, menu];

			await menuPermissionAPI.updatePermissions(role, newMenus);
			await loadData(); // Reload data
		} catch (err) {
			logger.error("Failed to update permissions:", err);
			setError(
				err instanceof Error ? err.message : "Failed to update permissions",
			);
		}
	};

	// Export users & permissions
	const handleExport = async () => {
		try {
			const data = { users, menuPermissions };
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "helpdesk-users-export.json";
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			logger.error("Failed to export data:", err);
			setError("Failed to export data");
		}
	};

	// Import users & permissions (Note: This feature is disabled for MySQL version)
	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// For security reasons, bulk import is disabled in MySQL version
		setError(
			"Import feature is disabled for security reasons in the MySQL version. Please add users manually through the admin panel.",
		);

		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	return (
		<PageWrapper maxW="4xl">
			{/* Header Section */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-card-foreground mb-2">
					Admin Panel
				</h1>
				<p className="text-sm text-muted-foreground">
					Manage users, roles, and system permissions
				</p>
			</div>

			{/* Error Display */}
			{error && (
				<div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-6">
					<div className="flex justify-between items-center">
						<span className="text-sm">{error}</span>
						<button
							onClick={() => setError("")}
							className="text-red-700 hover:text-red-900 font-bold text-lg"
						>
							×
						</button>
					</div>
				</div>
			)}

			{/* Export/Import Buttons */}
			<div className="flex gap-3 mb-6">
				<button
					onClick={handleExport}
					aria-label="Export user data to JSON file"
					className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm"
				>
					Export User Data
				</button>
				<label className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm cursor-pointer">
					Import User Data
					<input
						type="file"
						accept="application/json"
						ref={fileInputRef}
						onChange={handleImport}
						aria-label="Import user data from JSON file"
						className="hidden"
					/>
				</label>
			</div>

			{/* Migration Panel */}
			<div className="mb-8">
				<MigrationPanel />
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
				{/* Left Column: User Management */}
				<div className="xl:col-span-1">
					{/* Add User Form Card */}
					<div className="bg-background text-foreground rounded-xl shadow-sm p-6">
						<h2 className="text-lg font-bold mb-4 text-card-foreground">
							Add New User
						</h2>
						<form className="space-y-4" onSubmit={handleAddUser}>
							<div>
								<label
									htmlFor="username"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									Username
								</label>
								<input
									id="username"
									type="text"
									placeholder="Enter username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
									required
								/>
								<div className="text-xs text-muted-foreground mt-1">
									Username must be 3-50 characters, alphanumeric with _ or -
									only
								</div>
							</div>
							<div>
								<label
									htmlFor="password"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									Password
								</label>
								<div className="relative">
									<input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder="Enter password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
										required
									/>
									<button
										type="button"
										onClick={() => setShowPassword((v) => !v)}
										aria-label={showPassword ? "Hide password" : "Show password"}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground focus:outline-none"
									>
										{showPassword ? (
											<VisibilityOffIcon className="w-4 h-4" />
										) : (
											<VisibilityIcon className="w-4 h-4" />
										)}
									</button>
								</div>
								<div className="text-xs text-muted-foreground mt-1">
									Password must be 8+ characters with uppercase, lowercase,
									number, and special character (@$!%*?&)
								</div>
							</div>
							<div>
								<label
									htmlFor="role"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									Role
								</label>
								<select
									id="role"
									value={role}
									onChange={(e) => setRole(e.target.value as Role)}
									className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
									required
								>
									{allRoles.map((r) => (
										<option key={r} value={r}>
											{r}
										</option>
									))}
								</select>
							</div>
							<button
								type="submit"
								className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2.5 mt-2 shadow-sm transition-colors text-sm"
								disabled={pendingAdd}
							>
								{pendingAdd ? "Adding..." : "Add User"}
							</button>
							{success && (
								<div className="text-green-600 text-center font-medium text-sm mt-2 flex items-center justify-center gap-1">
									<CheckCircleIcon className="w-4 h-4" /> User added
									successfully!
								</div>
							)}
						</form>
					</div>
				</div>

				{/* Right Column: Role and User List */}
				<div className="xl:col-span-2 space-y-6">
					{/* Role Management Card */}
					<div className="bg-background text-foreground rounded-xl shadow-sm p-6">
						<h2 className="text-lg font-bold mb-4 text-card-foreground">
							Role Menu Permissions
						</h2>
						<div className="mb-4">
							<label
								htmlFor="role-select"
								className="block text-sm font-medium text-muted-foreground mb-2"
							>
								Edit permissions for role:
							</label>
							<select
								id="role-select"
								value={selectedRoleForEditing}
								onChange={(e) =>
									setSelectedRoleForEditing(e.target.value as Role)
								}
								className="w-full sm:w-auto rounded-lg bg-muted px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
							>
								{allRoles.map((r) => (
									<option key={r} value={r}>
										{r}
									</option>
								))}
							</select>
						</div>

						<div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
							<div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
								Menu Permissions Guide:
							</div>
							<div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
								<div>
									<strong>Super Admin:</strong> Full access to all features
								</div>
								<div>
									<strong>Admin:</strong> Access to most features except user
									management
								</div>
								<div>
									<strong>User:</strong> Limited access to view data and basic
									features
								</div>
							</div>
						</div>

						<div className="mb-4 flex gap-2">
							<button
								type="button"
								onClick={() => {
									const allMenuNames = allMenus;
									menuPermissionAPI.updatePermissions(
										selectedRoleForEditing,
										allMenuNames,
									);
									loadData();
								}}
								aria-label={`Select all permissions for ${selectedRoleForEditing} role`}
								className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
							>
								Select All
							</button>
							<button
								type="button"
								onClick={() => {
									menuPermissionAPI.updatePermissions(
										selectedRoleForEditing,
										[],
									);
									loadData();
								}}
								aria-label={`Deselect all permissions for ${selectedRoleForEditing} role`}
								className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
							>
								Deselect All
							</button>
						</div>
						<div className="mb-4 flex justify-between items-center">
							<div className="text-sm text-muted-foreground">
								Selected:{" "}
								<span className="font-semibold text-blue-600">
									{getMenusForRole(selectedRoleForEditing).length}
								</span>{" "}
								of <span className="font-semibold">{allMenus.length}</span>{" "}
								menus
							</div>
						</div>

						<div className="space-y-6">
							{/* Dashboard & Overview */}
							<div>
								<h4 className="text-sm font-semibold text-card-foreground mb-3 pb-2">
									Dashboard & Overview
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{allMenus.slice(0, 1).map((menu) => (
										<div
											key={menu}
											className={`flex items-center p-3 rounded-lg transition-all ${
												getMenusForRole(selectedRoleForEditing).includes(menu)
													? "bg-blue-50 dark:bg-blue-900/20"
													: "bg-muted"
											}`}
										>
											<input
												type="checkbox"
												id={`perm-${selectedRoleForEditing}-${menu}`}
												className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												checked={getMenusForRole(
													selectedRoleForEditing,
												).includes(menu)}
												onChange={() =>
													handlePermissionChange(menu, selectedRoleForEditing)
												}
											/>
											<label
												htmlFor={`perm-${selectedRoleForEditing}-${menu}`}
												className="ml-3 block text-sm font-medium text-card-foreground cursor-pointer flex-1"
											>
												{menu}
											</label>
											{getMenusForRole(selectedRoleForEditing).includes(
												menu,
											) && (
												<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Ticket Management */}
							<div>
								<h4 className="text-sm font-semibold text-card-foreground mb-3 pb-2">
									Ticket Management
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{allMenus.slice(1, 5).map((menu) => (
										<div
											key={menu}
											className={`flex items-center p-3 rounded-lg transition-all ${
												getMenusForRole(selectedRoleForEditing).includes(menu)
													? "bg-blue-50 dark:bg-blue-900/20"
													: "bg-muted"
											}`}
										>
											<input
												type="checkbox"
												id={`perm-${selectedRoleForEditing}-${menu}`}
												className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												checked={getMenusForRole(
													selectedRoleForEditing,
												).includes(menu)}
												onChange={() =>
													handlePermissionChange(menu, selectedRoleForEditing)
												}
											/>
											<label
												htmlFor={`perm-${selectedRoleForEditing}-${menu}`}
												className="ml-3 block text-sm font-medium text-card-foreground cursor-pointer flex-1"
											>
												{menu}
											</label>
											{getMenusForRole(selectedRoleForEditing).includes(
												menu,
											) && (
												<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Incident Management */}
							<div>
								<h4 className="text-sm font-semibold text-card-foreground mb-3 pb-2">
									Incident Management
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{allMenus.slice(5, 9).map((menu) => (
										<div
											key={menu}
											className={`flex items-center p-3 rounded-lg transition-all ${
												getMenusForRole(selectedRoleForEditing).includes(menu)
													? "bg-blue-50 dark:bg-blue-900/20"
													: "bg-muted"
											}`}
										>
											<input
												type="checkbox"
												id={`perm-${selectedRoleForEditing}-${menu}`}
												className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												checked={getMenusForRole(
													selectedRoleForEditing,
												).includes(menu)}
												onChange={() =>
													handlePermissionChange(menu, selectedRoleForEditing)
												}
											/>
											<label
												htmlFor={`perm-${selectedRoleForEditing}-${menu}`}
												className="ml-3 block text-sm font-medium text-card-foreground cursor-pointer flex-1"
											>
												{menu}
											</label>
											{getMenusForRole(selectedRoleForEditing).includes(
												menu,
											) && (
												<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Master Data */}
							<div>
								<h4 className="text-sm font-semibold text-card-foreground mb-3 pb-2">
									Master Data
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{allMenus.slice(9, 11).map((menu) => (
										<div
											key={menu}
											className={`flex items-center p-3 rounded-lg transition-all ${
												getMenusForRole(selectedRoleForEditing).includes(menu)
													? "bg-blue-50 dark:bg-blue-900/20"
													: "bg-muted"
											}`}
										>
											<input
												type="checkbox"
												id={`perm-${selectedRoleForEditing}-${menu}`}
												className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												checked={getMenusForRole(
													selectedRoleForEditing,
												).includes(menu)}
												onChange={() =>
													handlePermissionChange(menu, selectedRoleForEditing)
												}
											/>
											<label
												htmlFor={`perm-${selectedRoleForEditing}-${menu}`}
												className="ml-3 block text-sm font-medium text-card-foreground cursor-pointer flex-1"
											>
												{menu}
											</label>
											{getMenusForRole(selectedRoleForEditing).includes(
												menu,
											) && (
												<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Documentation & Tools */}
							<div>
								<h4 className="text-sm font-semibold text-card-foreground mb-3 pb-2">
									Documentation & Tools
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{allMenus.slice(11, 13).map((menu) => (
										<div
											key={menu}
											className={`flex items-center p-3 rounded-lg transition-all ${
												getMenusForRole(selectedRoleForEditing).includes(menu)
													? "bg-blue-50 dark:bg-blue-900/20"
													: "bg-muted"
											}`}
										>
											<input
												type="checkbox"
												id={`perm-${selectedRoleForEditing}-${menu}`}
												className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												checked={getMenusForRole(
													selectedRoleForEditing,
												).includes(menu)}
												onChange={() =>
													handlePermissionChange(menu, selectedRoleForEditing)
												}
											/>
											<label
												htmlFor={`perm-${selectedRoleForEditing}-${menu}`}
												className="ml-3 block text-sm font-medium text-card-foreground cursor-pointer flex-1"
											>
												{menu}
											</label>
											{getMenusForRole(selectedRoleForEditing).includes(
												menu,
											) && (
												<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Administration */}
							<div>
								<h4 className="text-sm font-semibold text-card-foreground mb-3 pb-2">
									Administration
								</h4>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{allMenus.slice(13, 14).map((menu) => (
										<div
											key={menu}
											className={`flex items-center p-3 rounded-lg transition-all ${
												getMenusForRole(selectedRoleForEditing).includes(menu)
													? "bg-blue-50 dark:bg-blue-900/20"
													: "bg-muted"
											}`}
										>
											<input
												type="checkbox"
												id={`perm-${selectedRoleForEditing}-${menu}`}
												className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												checked={getMenusForRole(
													selectedRoleForEditing,
												).includes(menu)}
												onChange={() =>
													handlePermissionChange(menu, selectedRoleForEditing)
												}
											/>
											<label
												htmlFor={`perm-${selectedRoleForEditing}-${menu}`}
												className="ml-3 block text-sm font-medium text-card-foreground cursor-pointer flex-1"
											>
												{menu}
											</label>
											{getMenusForRole(selectedRoleForEditing).includes(
												menu,
											) && (
												<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
											)}
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* User List Card */}
					<div className="bg-background text-foreground rounded-xl shadow-sm p-6">
						<h2 className="text-lg font-bold mb-4 text-card-foreground">
							User List
						</h2>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead className="bg-muted text-xs text-muted-foreground uppercase">
									<tr>
										<th className="px-4 py-3 font-semibold text-left">
											Username
										</th>
										<th className="px-4 py-3 font-semibold text-left">
											Password
										</th>
										<th className="px-4 py-3 font-semibold text-left">Role</th>
										<th className="px-4 py-3 font-semibold text-center">
											Action
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-muted">
									{users.length === 0 ? (
										<tr>
											<td
												colSpan={4}
												className="text-center text-muted-foreground py-8"
											>
												No users yet.
											</td>
										</tr>
									) : (
										users.map((user, idx) => (
											<tr
												key={user.id}
												className="hover:bg-muted/50 transition-colors"
											>
												<td className="px-4 py-3 text-card-foreground">
													{user.username}
												</td>
												<td className="px-4 py-3 text-muted-foreground">
													********
												</td>
												<td className="px-4 py-3">
													<span
														className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
															user.role === "super admin"
																? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
																: user.role === "admin"
																	? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"
																	: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
														}`}
													>
														{user.role}
													</span>
												</td>
												<td className="px-4 py-3 text-center">
													<div className="flex gap-2 justify-center">
						<button
							onClick={() => openEditModal(idx)}
							aria-label={`Edit user ${user.username}`}
							className="bg-yellow-400 hover:bg-yellow-500 text-white rounded px-3 py-1 text-xs font-semibold shadow-sm transition-colors"
						>
							Edit
						</button>
						<button
							onClick={() => handleDeleteUser(user.id)}
							aria-label={`Delete user ${user.username}`}
							className="bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1 text-xs font-semibold shadow-sm transition-colors"
						>
							Delete
						</button>
													</div>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>

			{/* Modal Edit User */}
			{editUserIdx !== null && (
				<div 
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
					role="dialog"
					aria-modal="true"
					aria-labelledby="edit-user-title"
					onKeyDown={handleKeyDown}
					tabIndex={-1}
				>
					<div className="bg-background text-foreground rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
						<h3 id="edit-user-title" className="text-lg font-bold mb-4 text-card-foreground">
							Edit User
						</h3>
						<form className="space-y-4" onSubmit={handleEditUser}>
							<div>
								<label
									htmlFor="edit-username"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									Username
								</label>
								<input
									id="edit-username"
									type="text"
									value={editUsername}
									onChange={(e) => setEditUsername(e.target.value)}
									className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="edit-password"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									Password
								</label>
								<div className="relative">
									<input
										id="edit-password"
										type={showEditPassword ? "text" : "password"}
										value={editPassword}
										onChange={(e) => setEditPassword(e.target.value)}
										placeholder="Leave blank to keep current password"
										className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-card-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
									/>
									<button
										type="button"
										onClick={() => setShowEditPassword((v) => !v)}
										aria-label={showEditPassword ? "Hide password" : "Show password"}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground focus:outline-none"
									>
										{showEditPassword ? (
											<VisibilityOffIcon className="w-4 h-4" />
										) : (
											<VisibilityIcon className="w-4 h-4" />
										)}
									</button>
								</div>
							</div>
							<div>
								<label
									htmlFor="edit-role"
									className="block text-sm font-medium text-muted-foreground mb-2"
								>
									Role
								</label>
								<select
									id="edit-role"
									value={editRole}
									onChange={(e) => setEditRole(e.target.value as Role)}
									className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
									required
								>
									{allRoles.map((r) => (
										<option key={r} value={r}>
											{r}
										</option>
									))}
								</select>
							</div>
							<div className="flex gap-3 pt-2">
								<button
									type="submit"
									className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2.5 shadow-sm transition-colors text-sm"
								>
									Save
								</button>
								<button
									type="button"
									onClick={closeEditModal}
									className="flex-1 bg-muted hover:bg-muted/80 text-card-foreground font-semibold rounded-lg py-2.5 shadow-sm transition-colors text-sm"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</PageWrapper>
	);
};

export default AdminPanel;
