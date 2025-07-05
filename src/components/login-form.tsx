import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";

interface LoginFormProps extends React.ComponentProps<"div"> {
  onLogin: (username: string, password: string) => void;
  error?: string;
  loading?: boolean;
  description?: string;
  hideTitle?: boolean;
}

export function LoginForm({
  className,
  onLogin,
  error,
  loading,
  description,
  hideTitle,
  ...props
}: LoginFormProps) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading) onLogin(username, password);
  };

  return (
    <div className={cn("flex flex-col gap-8 w-full", className)} {...props}>
      {!hideTitle && (
        <>
          <h1 className="text-2xl md:text-3xl font-extrabold text-center text-gray-900 dark:text-white tracking-tight">Login to your account</h1>
          <p className="text-center text-gray-500 dark:text-gray-400 text-base font-medium -mt-2 mb-2">{description || 'Masuk ke dashboard Insight Ticket'}</p>
        </>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-7 w-full">
        <div className="grid gap-2">
          <Label htmlFor="username" className="font-semibold text-base text-gray-900 dark:text-white">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="Masukkan username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoFocus
            className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-sm bg-white/80 dark:bg-zinc-800/80"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password" className="font-semibold text-base text-gray-900 dark:text-white">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition shadow-sm bg-white/80 dark:bg-zinc-800/80"
          />
        </div>
        {error && <div className="text-red-500 text-center font-semibold text-sm -mt-2">{error}</div>}
        <Button
          type="submit"
          className="w-full mt-2 bg-[#5B7CFA] hover:bg-[#4666d8] text-white font-bold rounded-xl py-3 text-base tracking-wide uppercase shadow-none focus:ring-2 focus:ring-blue-400 focus:outline-none"
          disabled={loading}
        >
          {loading ? "Loading..." : "Login"}
        </Button>
      </form>
    </div>
  );
} 