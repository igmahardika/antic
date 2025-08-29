import React, { useRef } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { userAPI, menuPermissionAPI, User, MenuPermission } from '../lib/api';
import MigrationPanel from '../components/MigrationPanel';
import PageWrapper from '../components/PageWrapper';

const allRoles = ['super admin', 'admin', 'user'] as const;
type Role = typeof allRoles[number];
const allMenus = [
  // Dashboard & Overview
  'Dashboard',
  
  // Ticket Management
  'Data Grid',
  'Kanban Board',
  'Ticket Analytics',
  'Agent Analytics',
  
  // Incident Management
  'Incident Data',
  'Incident Analytics',
  'Technical Support Analytics',
  'Site Analytics',
  
  // Master Data
  'Agent Data',
  'Customer Data',
  
  // Documentation & Tools
  'Upload Data',
  'Formulas',
  
  // Administration
  'Admin Panel',
];

// Note: Password hashing is now handled by the backend API

const AdminPanel: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<Role>('user');
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [pendingAdd, setPendingAdd] = React.useState(false);
  // const [pendingEdit, setPendingEdit] = React.useState(false); // Removed unused state
  const [editUserIdx, setEditUserIdx] = React.useState<number | null>(null);
  const [editUsername, setEditUsername] = React.useState('');
  const [editPassword, setEditPassword] = React.useState('');
  const [editRole, setEditRole] = React.useState<Role>('user');
  const [showEditPassword, setShowEditPassword] = React.useState(false);
  const [menuPermissions, setMenuPermissions] = React.useState<MenuPermission[]>([]);
  const [selectedRoleForEditing, setSelectedRoleForEditing] = React.useState<Role>('user');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load users and permissions from MySQL API
  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, permissionsData] = await Promise.all([
        userAPI.getUsers(),
        menuPermissionAPI.getPermissions()
      ]);
      setUsers(usersData);
      setMenuPermissions(permissionsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please check your connection.');
    }
  };

  // Add user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setPendingAdd(true);
    setError('');
    
    try {
      await userAPI.addUser({ username, password, role });
      await loadData(); // Reload data
      setUsername('');
      setPassword('');
      setRole('user');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to add user:', err);
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setPendingAdd(false);
    }
  };

  // Edit user
  const openEditModal = (idx: number) => {
    setEditUserIdx(idx);
    setEditUsername(users[idx].username);
    setEditPassword('');
    setEditRole(users[idx].role as Role);
  };
  const closeEditModal = () => {
    setEditUserIdx(null);
    setEditUsername('');
    setEditPassword('');
    setEditRole('user');
  };
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editUserIdx === null) return;
    
    setError('');
    
    try {
      const user = users[editUserIdx];
      const updateData: { username: string; password?: string; role: string } = {
        username: editUsername,
        role: editRole
      };
      
      if (editPassword && editPassword.trim()) {
        updateData.password = editPassword;
      }
      
      await userAPI.updateUser(user.id, updateData);
      await loadData(); // Reload data
      closeEditModal();
    } catch (err) {
      console.error('Failed to update user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };
  // Delete user
  const handleDeleteUser = async (id?: number) => {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await userAPI.deleteUser(id);
      await loadData(); // Reload data
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  // Menu permissions logic
  const getMenusForRole = (role: Role) => menuPermissions.find(mp => mp.role === role)?.menus || [];
  
  const handlePermissionChange = async (menu: string, role: Role) => {
    try {
      const currentMenus = getMenusForRole(role);
      const newMenus = currentMenus.includes(menu)
        ? currentMenus.filter(m => m !== menu)
        : [...currentMenus, menu];
      
      await menuPermissionAPI.updatePermissions(role, newMenus);
      await loadData(); // Reload data
    } catch (err) {
      console.error('Failed to update permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to update permissions');
    }
  };

  // Export users & permissions
  const handleExport = async () => {
    try {
      const data = { users, menuPermissions };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'helpdesk-users-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
      setError('Failed to export data');
    }
  };

  // Import users & permissions (Note: This feature is disabled for MySQL version)
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // For security reasons, bulk import is disabled in MySQL version
    alert('Import feature is disabled for security reasons in the MySQL version. Please add users manually through the admin panel.');
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <PageWrapper>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-100  text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={() => setError('')} 
              className="text-red-700 hover:text-red-900 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="flex gap-4 mb-6">
        <button onClick={handleExport} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded shadow">Export User Data</button>
        <label className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded shadow cursor-pointer">
          Import User Data
          <input type="file" accept="application/json" ref={fileInputRef} onChange={handleImport} className="hidden" />
        </label>
      </div>
      {/* Migration Panel */}
      <div className="mb-8">
        <MigrationPanel />
      </div>
      
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Management */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Add User Form Card */}
          <div className="bg-background text-foreground rounded-xl shadow-lg p-6">
            <h2 className="text-lg md:text-xl font-bold mb-2 text-card-foreground">Add New User</h2>
            <form className="flex flex-col gap-4" onSubmit={handleAddUser}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700  px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Username must be 3-50 characters, alphanumeric with _ or - only
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700  px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300 focus:outline-none">
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Password must be 8+ characters with uppercase, lowercase, number, and special character (@$!%*?&)
                </div>
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Role</label>
                <select
                  id="role"
                  value={role}
                  onChange={e => setRole(e.target.value as Role)}
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700  px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                >
                  {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg py-2.5 mt-2 shadow-md hover:shadow-lg transition-all text-sm"
                disabled={pendingAdd}
              >
                Add User
              </button>
              {error && <div className="text-red-500 text-center font-semibold text-sm mt-2">{error}</div>}
              {success && <div className="text-green-500 text-center font-semibold text-sm mt-2"><CheckCircleIcon className="w-4 h-4 inline mr-1" /> User added successfully!</div>}
            </form>
          </div>
        </div>
        {/* Right Column: Role and User List */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Role Management Card */}
          <div className="bg-background text-foreground rounded-xl shadow-lg p-6">
            <h2 className="text-lg md:text-xl font-bold mb-2 text-card-foreground">Role Menu Permissions</h2>
            <div className="mb-4">
              <label htmlFor="role-select" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Edit permissions for role:</label>
              <select
                id="role-select"
                value={selectedRoleForEditing}
                onChange={e => setSelectedRoleForEditing(e.target.value as Role)}
                className="w-full sm:w-auto rounded-lg bg-gray-50 dark:bg-zinc-700  px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Menu Permissions Guide:</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Super Admin:</strong> Full access to all features<br/>
                <strong>Admin:</strong> Access to most features except user management<br/>
                <strong>User:</strong> Limited access to view data and basic features
              </div>
            </div>
            
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const allMenuNames = allMenus;
                  menuPermissionAPI.updatePermissions(selectedRoleForEditing, allMenuNames);
                  loadData();
                }}
                className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded shadow transition-all"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  menuPermissionAPI.updatePermissions(selectedRoleForEditing, []);
                  loadData();
                }}
                className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded shadow transition-all"
              >
                Deselect All
              </button>
            </div>
            <div className="mb-3 flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Selected: <span className="font-semibold text-blue-600">{getMenusForRole(selectedRoleForEditing).length}</span> of <span className="font-semibold">{allMenus.length}</span> menus
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Dashboard & Overview */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-600 pb-1">
                  Dashboard & Overview
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allMenus.slice(0, 1).map(menu => (
                    <div key={menu} className={`flex items-center p-3 rounded-lg border transition-all ${
                      getMenusForRole(selectedRoleForEditing).includes(menu)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        id={`perm-${selectedRoleForEditing}-${menu}`}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={getMenusForRole(selectedRoleForEditing).includes(menu)}
                        onChange={() => handlePermissionChange(menu, selectedRoleForEditing)}
                      />
                      <label htmlFor={`perm-${selectedRoleForEditing}-${menu}`} className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer flex-1">
                        {menu}
                      </label>
                      {getMenusForRole(selectedRoleForEditing).includes(menu) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ticket Management */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-600 pb-1">
                  Ticket Management
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allMenus.slice(1, 5).map(menu => (
                    <div key={menu} className={`flex items-center p-3 rounded-lg border transition-all ${
                      getMenusForRole(selectedRoleForEditing).includes(menu)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        id={`perm-${selectedRoleForEditing}-${menu}`}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={getMenusForRole(selectedRoleForEditing).includes(menu)}
                        onChange={() => handlePermissionChange(menu, selectedRoleForEditing)}
                      />
                      <label htmlFor={`perm-${selectedRoleForEditing}-${menu}`} className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer flex-1">
                        {menu}
                      </label>
                      {getMenusForRole(selectedRoleForEditing).includes(menu) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Incident Management */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-600 pb-1">
                  Incident Management
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allMenus.slice(5, 9).map(menu => (
                    <div key={menu} className={`flex items-center p-3 rounded-lg border transition-all ${
                      getMenusForRole(selectedRoleForEditing).includes(menu)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        id={`perm-${selectedRoleForEditing}-${menu}`}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={getMenusForRole(selectedRoleForEditing).includes(menu)}
                        onChange={() => handlePermissionChange(menu, selectedRoleForEditing)}
                      />
                      <label htmlFor={`perm-${selectedRoleForEditing}-${menu}`} className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer flex-1">
                        {menu}
                      </label>
                      {getMenusForRole(selectedRoleForEditing).includes(menu) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Master Data */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-600 pb-1">
                  Master Data
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allMenus.slice(9, 11).map(menu => (
                    <div key={menu} className={`flex items-center p-3 rounded-lg border transition-all ${
                      getMenusForRole(selectedRoleForEditing).includes(menu)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        id={`perm-${selectedRoleForEditing}-${menu}`}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={getMenusForRole(selectedRoleForEditing).includes(menu)}
                        onChange={() => handlePermissionChange(menu, selectedRoleForEditing)}
                      />
                      <label htmlFor={`perm-${selectedRoleForEditing}-${menu}`} className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer flex-1">
                        {menu}
                      </label>
                      {getMenusForRole(selectedRoleForEditing).includes(menu) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Documentation & Tools */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-600 pb-1">
                  Documentation & Tools
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allMenus.slice(11, 13).map(menu => (
                    <div key={menu} className={`flex items-center p-3 rounded-lg border transition-all ${
                      getMenusForRole(selectedRoleForEditing).includes(menu)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}>
                  <input
                    type="checkbox"
                    id={`perm-${selectedRoleForEditing}-${menu}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={getMenusForRole(selectedRoleForEditing).includes(menu)}
                    onChange={() => handlePermissionChange(menu, selectedRoleForEditing)}
                  />
                      <label htmlFor={`perm-${selectedRoleForEditing}-${menu}`} className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer flex-1">
                    {menu}
                  </label>
                      {getMenusForRole(selectedRoleForEditing).includes(menu) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Administration */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-600 pb-1">
                  Administration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allMenus.slice(13, 14).map(menu => (
                    <div key={menu} className={`flex items-center p-3 rounded-lg border transition-all ${
                      getMenusForRole(selectedRoleForEditing).includes(menu)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        id={`perm-${selectedRoleForEditing}-${menu}`}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={getMenusForRole(selectedRoleForEditing).includes(menu)}
                        onChange={() => handlePermissionChange(menu, selectedRoleForEditing)}
                      />
                      <label htmlFor={`perm-${selectedRoleForEditing}-${menu}`} className="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer flex-1">
                        {menu}
                      </label>
                      {getMenusForRole(selectedRoleForEditing).includes(menu) && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                </div>
              ))}
                </div>
              </div>
            </div>
          </div>
          {/* User List Card */}
          <div className="bg-background text-foreground rounded-xl shadow-lg p-6">
            <h2 className="text-lg md:text-xl font-bold mb-2 text-card-foreground">User List</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-zinc-700 text-xs text-gray-600 dark:text-gray-300 uppercase">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Username</th>
                    <th className="px-6 py-3 font-semibold">Password</th>
                    <th className="px-6 py-3 font-semibold">Role</th>
                    <th className="px-6 py-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                  {users.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-500 dark:text-gray-400 py-6">No users yet.</td></tr>
                  ) : (
                    users.map((user, idx) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-card-foreground">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">********</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'super admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' : user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'}`}>{user.role}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center flex gap-2 justify-center">
                          <button
                            onClick={() => openEditModal(idx)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-white rounded px-3 py-1 text-xs font-semibold shadow transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-500 hover:bg-red-600 text-white rounded px-3 py-1 text-xs font-semibold shadow transition-all"
                          >
                            Delete
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background text-foreground rounded-xl shadow-lg p-8 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-card-foreground">Edit User</h3>
            <form className="flex flex-col gap-4" onSubmit={handleEditUser}>
              <div>
                <label htmlFor="edit-username" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Username</label>
                <input
                  id="edit-username"
                  type="text"
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700  px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-password" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    id="edit-password"
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700  px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
                  />
                  <button type="button" onClick={() => setShowEditPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300 focus:outline-none">
                    {showEditPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="edit-role" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Role</label>
                <select
                  id="edit-role"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as Role)}
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700  px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                >
                  {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-4 mt-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg py-2.5 px-6 shadow-md transition-all text-sm">Save</button>
                <button type="button" onClick={closeEditModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg py-2.5 px-6 shadow-md transition-all text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default AdminPanel; 