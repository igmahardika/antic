import React, { useState, useEffect } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';



interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

type Menu = 'Dashboard' | 'Data Grid' | 'Customer Analytics' | 'Ticket Analytics' | 'Agent Analytics' | 'Upload Data' | 'Rumus Analytics' | 'Admin Panel';
type Role = 'admin' | 'user';
type Permissions = {
  [key in Role]: Menu[];
};

const allMenus: Menu[] = ['Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics', 'Agent Analytics', 'Upload Data', 'Rumus Analytics', 'Admin Panel'];

// Utility hash password
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAdd, setPendingAdd] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(false);

  // Edit modal state
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<Role>('user');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Helper: get token
  const getToken = () => localStorage.getItem('token') || '';
  const getRole = () => localStorage.getItem('role') || '';

  // Fetch users from backend
  const fetchUsers = async () => {
    const token = getToken();
    const res = await fetch('http://localhost:3001/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      navigate('/login');
      return;
    }
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    // Hanya admin yang boleh akses
    if (getRole() !== 'admin') {
      navigate('/summary-dashboard');
      return;
    }
    fetchUsers();
  }, []);

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

  // Open edit modal
  const openEditModal = (user: User) => {
    setEditUserId(user.id);
    setEditUsername(user.username);
    setEditPassword('');
    setEditRole(user.role);
  };
  const closeEditModal = () => {
    setEditUserId(null);
    setEditUsername('');
    setEditPassword('');
    setEditRole('user');
  };

  // Edit user
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editUserId === null) return;
    setPendingEdit(true);
    const token = getToken();
    const body: any = { username: editUsername, role: editRole };
    if (editPassword) body.password = editPassword;
    const res = await fetch(`http://localhost:3001/users/${editUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) {
      navigate('/login');
      return;
    }
    if (res.ok) {
      fetchUsers();
      closeEditModal();
    }
    setPendingEdit(false);
  };

  useEffect(() => {
    // Save permissions to localStorage whenever they change
    try {
      localStorage.setItem('menuPermissions', JSON.stringify(permissions));
    } catch (e) {
      console.error("Failed to save permissions to localStorage", e);
    }
  }, [permissions]);

  // Simpan users ke localStorage setiap kali users berubah
  useEffect(() => {
    try {
      localStorage.setItem('users', JSON.stringify(users));
    } catch (e) {
      console.error('Failed to save users to localStorage', e);
    }
  }, [users]);

  const handlePermissionChange = (menu: Menu, role: Role) => {
    setPermissions(prev => {
      const currentPermissions = prev[role];
      const newPermissions = currentPermissions.includes(menu)
        ? currentPermissions.filter(m => m !== menu)
        : [...currentPermissions, menu];
      return { ...prev, [role]: newPermissions };
    });
  };

  // Add user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setPendingAdd(true);
    const token = getToken();
    const res = await fetch('http://localhost:3001/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username, password, role }),
    });
    if (res.status === 401 || res.status === 403) {
      navigate('/login');
      return;
    }
    if (res.ok) {
      setUsername('');
      setPassword('');
      setRole('user');
      setSuccess(true);
      fetchUsers();
      setTimeout(() => setSuccess(false), 1500);
    }
    setPendingAdd(false);
  };

  // Delete user
  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    const token = getToken();
    const res = await fetch(`http://localhost:3001/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      navigate('/login');
      return;
    }
    fetchUsers();
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
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'}`}>{user.role}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center flex gap-2 justify-center">
                          <button
                            onClick={() => openEditModal(user)}
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
      {editUserId !== null && (
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
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
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