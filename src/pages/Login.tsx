import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // TODO: Implement actual login logic
    console.log('Login attempt');
    navigate('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-zinc-900">
      <div className="p-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-zinc-700">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 dark:text-gray-100 mb-6">
          Welcome Back
        </h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
        </div>
        <Button onClick={handleLogin} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-base">
          Log In
        </Button>
      </div>
    </div>
  );
};

export default Login; 