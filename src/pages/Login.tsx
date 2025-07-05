import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/login-form';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (username: string, password: string) => {
    setError('');
    setLoading(true);
    setTimeout(() => {
      try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find((u: any) => u.username === username && u.password === password);
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          navigate('/summary-dashboard');
        } else {
          setError('Username atau password salah');
        }
      } catch (err) {
        setError('Terjadi kesalahan, coba lagi');
      } finally {
        setLoading(false);
      }
    }, 500);
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