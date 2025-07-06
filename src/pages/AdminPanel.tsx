import React, { useState, useEffect, useRef } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { db, IUser, IMenuPermission } from '../lib/db';

const allRoles = ['super admin', 'admin', 'user'] as const;
type Role = typeof allRoles[number];
const allMenus = [
  'Dashboard',
  'Data Grid',
  'Customer Analytics',
  'Ticket Analytics',
  'Agent Analytics',
  'Upload Data',
  'Master Data Agent',
  'Rumus Analytics',
  'Admin Panel',
];

// Utility hash password
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = React.useState<IUser[]>([]);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [role, setRole] = React.useState<Role>('user');
  const [success, setSuccess] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [pendingAdd, setPendingAdd] = React.useState(false);
  const [pendingEdit, setPendingEdit] = React.useState(false);
  const [editUserIdx, setEditUserIdx] = React.useState<number | null>(null);
  const [editUsername, setEditUsername] = React.useState('');
  const [editPassword, setEditPassword] = React.useState('');
  const [editRole, setEditRole] = React.useState<Role>('user');
  const [showEditPassword, setShowEditPassword] = React.useState(false);
  const [menuPermissions, setMenuPermissions] = React.useState<IMenuPermission[]>([]);
  const [selectedRoleForEditing, setSelectedRoleForEditing] = React.useState<Role>('user');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load users and permissions from IndexedDB
  React.useEffect(() => {
    (async () => {
      const users = await db.users.toArray();
      if (users.length === 0) {
        // Add default admin if not exists
        const hashed = await hashPassword('k0s0ng-w43');
        await db.users.add({ username: 'admin', password: hashed, role: 'admin' });
        setUsers(await db.users.toArray());
      } else {
        setUsers(users);
      }
      setMenuPermissions(await db.menuPermissions.toArray());
    })();
  }, []);

  // Add user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setPendingAdd(true);
    const hashed = await hashPassword(password);
    await db.users.add({ username, password: hashed, role });
    setUsers(await db.users.toArray());
    setUsername('');
    setPassword('');
    setRole('user');
    setSuccess(true);
    setPendingAdd(false);
    setTimeout(() => setSuccess(false), 1500);
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
    setPendingEdit(true);
    const user = users[editUserIdx];
    let newPassword = user.password;
    if (editPassword) newPassword = await hashPassword(editPassword);
    await db.users.update(user.id!, { username: editUsername, password: newPassword, role: editRole });
    setUsers(await db.users.toArray());
    setPendingEdit(false);
    closeEditModal();
  };
  // Delete user
  const handleDeleteUser = async (id?: number) => {
    if (!id) return;
    await db.users.delete(id);
    setUsers(await db.users.toArray());
  };

  // Menu permissions logic
  const getMenusForRole = (role: Role) => menuPermissions.find(mp => mp.role === role)?.menus || [];
  const handlePermissionChange = async (menu: string, role: Role) => {
    let perm = menuPermissions.find(mp => mp.role === role);
    if (!perm) {
      perm = { role, menus: [menu] };
      await db.menuPermissions.add(perm);
    } else {
      const menus = perm.menus.includes(menu)
        ? perm.menus.filter(m => m !== menu)
        : [...perm.menus, menu];
      await db.menuPermissions.update(perm.id!, { menus });
    }
    setMenuPermissions(await db.menuPermissions.toArray());
  };

  // Export users & permissions
  const handleExport = async () => {
    const users = await db.users.toArray();
    const menuPermissions = await db.menuPermissions.toArray();
    const data = { users, menuPermissions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'antic-users-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import users & permissions
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data.users) && Array.isArray(data.menuPermissions)) {
        await db.users.clear();
        await db.menuPermissions.clear();
        await db.users.bulkAdd(data.users);
        await db.menuPermissions.bulkAdd(data.menuPermissions);
        setUsers(await db.users.toArray());
        setMenuPermissions(await db.menuPermissions.toArray());
        alert('Import berhasil!');
      } else {
        alert('File tidak valid.');
      }
    } catch {
      alert('File tidak valid.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Admin Panel</h1>
      <div className="flex gap-4 mb-6">
        <button onClick={handleExport} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded shadow">Export User Data</button>
        <label className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded shadow cursor-pointer">
          Import User Data
          <input type="file" accept="application/json" ref={fileInputRef} onChange={handleImport} className="hidden" />
        </label>
      </div>
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
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300 focus:outline-none">
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Role</label>
                <select
                  id="role"
                  value={role}
                  onChange={e => setRole(e.target.value as Role)}
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {allMenus.map(menu => (
                <div key={menu} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`perm-${selectedRoleForEditing}-${menu}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={getMenusForRole(selectedRoleForEditing).includes(menu)}
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
                    <th className="px-6 py-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
                  {users.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-500 dark:text-gray-400 py-6">No users yet.</td></tr>
                  ) : (
                    users.map((user, idx) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">********</td>
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
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Edit User</h3>
            <form className="flex flex-col gap-4" onSubmit={handleEditUser}>
              <div>
                <label htmlFor="edit-username" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Username</label>
                <input
                  id="edit-username"
                  type="text"
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                    className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-10"
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
                  className="w-full rounded-lg bg-gray-50 dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
    </>
  );
};

export default AdminPanel; 