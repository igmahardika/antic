import React, { useState, useEffect } from 'react';

interface User {
  username: string;
  password: string;
  role: 'admin' | 'user';
}

type Menu = 'Dashboard' | 'Data Grid' | 'Customer Analytics' | 'Ticket Analytics' | 'Agent Analytics' | 'Upload Data' | 'Admin Panel';
type Role = 'admin' | 'user';
type Permissions = {
  [key in Role]: Menu[];
};

const allMenus: Menu[] = ['Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics', 'Agent Analytics', 'Upload Data', 'Admin Panel'];

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [success, setSuccess] = useState(false);

  const [permissions, setPermissions] = useState<Permissions>(() => {
    try {
      const savedPermissions = localStorage.getItem('menuPermissions');
      if (savedPermissions) {
        return JSON.parse(savedPermissions);
      }
    } catch (e) {
      console.error("Failed to parse permissions from localStorage", e);
    }
    // Default permissions
    return {
      admin: ['Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics', 'Agent Analytics', 'Upload Data', 'Admin Panel'],
      user: ['Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics', 'Agent Analytics', 'Upload Data'],
    };
  });

  const [selectedRoleForEditing, setSelectedRoleForEditing] = useState<Role>('user');

  useEffect(() => {
    // Save permissions to localStorage whenever they change
    try {
      localStorage.setItem('menuPermissions', JSON.stringify(permissions));
    } catch (e) {
      console.error("Failed to save permissions to localStorage", e);
    }
  }, [permissions]);

  const handlePermissionChange = (menu: Menu, role: Role) => {
    setPermissions(prev => {
      const currentPermissions = prev[role];
      const newPermissions = currentPermissions.includes(menu)
        ? currentPermissions.filter(m => m !== menu)
        : [...currentPermissions, menu];
      return { ...prev, [role]: newPermissions };
    });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setUsers([...users, { username, password, role }]);
    setUsername('');
    setPassword('');
    setRole('user');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1500);
  };

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Admin Panel</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: User Management */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Add User Form Card */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Add New User</h2>
            <form className="flex flex-col gap-4" onSubmit={handleAddUser}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Username</label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Role</label>
                <select
                  id="role"
                  value={role}
                  onChange={e => setRole(e.target.value as 'admin' | 'user')}
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg py-2.5 mt-2 shadow-md hover:shadow-lg transition-all text-sm"
              >
                Add User
              </button>
              {success && <div className="text-green-500 text-center font-semibold text-sm mt-2">✓ User added successfully!</div>}
            </form>
          </div>
        </div>

        {/* Right Column: Role and User List */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Role Management Card */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Role Menu Permissions</h2>
            <div className="mb-4">
              <label htmlFor="role-select" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Edit permissions for role:</label>
              <select
                id="role-select"
                value={selectedRoleForEditing}
                onChange={e => setSelectedRoleForEditing(e.target.value as Role)}
                className="w-full sm:w-auto rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {allMenus.map(menu => (
                <div key={menu} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`perm-${selectedRoleForEditing}-${menu}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={permissions[selectedRoleForEditing]?.includes(menu) || false}
                    onChange={() => handlePermissionChange(menu, selectedRoleForEditing)}
                  />
                  <label htmlFor={`perm-${selectedRoleForEditing}-${menu}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-200">
                    {menu}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* User List Card */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">User List</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-zinc-700 text-xs text-gray-600 dark:text-gray-300 uppercase">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Username</th>
                    <th className="px-6 py-3 font-semibold">Password</th>
                    <th className="px-6 py-3 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                  {users.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-gray-500 dark:text-gray-400 py-6">No users yet.</td></tr>
                  ) : (
                    users.map((user, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">********</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'}`}>
                            {user.role}
                          </span>
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
    </>
  );
};

export default AdminPanel; 