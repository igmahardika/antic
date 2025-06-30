import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo: jika username 'admin', role admin, selain itu user
    const role = username.trim().toLowerCase() === 'admin' ? 'admin' : 'user';
    localStorage.setItem('user', JSON.stringify({ username, role }));
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-blue-300 to-green-200" style={{fontFamily: 'Poppins, Arial, sans-serif'}}>
      <div className="relative w-full max-w-md md:max-w-lg bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 flex flex-col gap-8 border border-zinc-200 dark:border-zinc-700">
        {/* Logo only, centered, no text */}
        <div className="flex flex-col items-center mb-2">
          <img src="/logo-a.png" alt="Insight Logo" className="w-40 h-40 object-contain bg-transparent" />
        </div>
        {/* Login Form */}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              autoComplete="username"
              required
            />
          </div>
          <div className="relative">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition pr-12"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-gray-400 hover:text-blue-500 focus:outline-none"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              aria-label="Toggle password visibility"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.336-3.234.938-4.675M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.121-2.121A9.969 9.969 0 0122 12c0 5.523-4.477 10-10 10a9.969 9.969 0 01-7.071-2.929m2.121-2.121A9.969 9.969 0 012 12c0-5.523 4.477-10 10-10a9.969 9.969 0 017.071 2.929" /></svg>
              )}
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-400 to-green-400 hover:from-blue-500 hover:to-green-500 text-white font-bold rounded-lg py-3 mt-2 shadow-lg transition text-lg tracking-wide"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login; 