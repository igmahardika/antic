import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/login-form';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username);
        if (data.role === 'admin') {
          navigate('/admin-panel');
        } else {
          navigate('/summary-dashboard');
        }
      } else {
        setError(data.error || 'Username atau password salah');
      }
    } catch (err) {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-400 via-white to-pink-200 dark:from-gray-900 dark:via-gray-950 dark:to-blue-900 font-inter p-0">
      <div className="w-full max-w-lg px-4 flex flex-col items-center justify-center">
        <div className="rounded-3xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-lg p-10 md:p-14 flex flex-col gap-0 items-center">
          <img src="/logo-a.png" alt="Logo" className="h-32 w-32 mb-2 rounded-full object-contain bg-transparent" style={{background: 'transparent'}} />
          <p className="text-center text-black text-base font-medium mb-10 mt-0">Insightful Ticket Analytics & Agent Performance</p>
          <LoginForm onLogin={handleLogin} error={error} loading={loading} hideTitle />
        </div>
      </div>
    </div>
  );
};

export default Login; 