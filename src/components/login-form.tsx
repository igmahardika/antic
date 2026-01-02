import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";

interface LoginFormProps extends React.ComponentProps<"div"> {
	onLogin: (
		username: string,
		password: string,
		recaptchaToken?: string,
	) => void;
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
		if (!loading && username && password) {
			onLogin(username, password, "disabled");
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0 border-0 shadow-lg">
				<CardContent className="grid p-0 md:grid-cols-2">
					<form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6">
						{!hideTitle && (
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-2xl font-bold text-foreground">
									Welcome back
								</h1>
								<p className="text-muted-foreground text-balance text-sm">
									{description || "Login to your HMS account"}
								</p>
							</div>
						)}

						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="username" className="text-sm font-medium">
									Username
								</Label>
								<Input
									id="username"
									type="text"
									placeholder="Enter your username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									required
									autoFocus
									disabled={loading}
									className="h-11"
								/>
							</div>

							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<Label htmlFor="password" className="text-sm font-medium">
										Password
									</Label>
									<a
										href="#"
										className="text-sm text-muted-foreground underline-offset-2 hover:underline"
										onClick={(e) => {
											e.preventDefault();
											// TODO: Implement forgot password
										}}
									>
										Forgot your password?
									</a>
								</div>
								<Input
									id="password"
									type="password"
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									disabled={loading}
									className="h-11"
								/>
							</div>

							{error && (
								<div className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-md">
									{error}
								</div>
							)}

							<Button
								type="submit"
								disabled={loading || !username || !password}
								className="w-full h-11"
								size="lg"
							>
								{loading ? "Logging in..." : "Login"}
							</Button>
						</div>
					</form>

					{/* Right side with image/background */}
					<div className="bg-muted relative hidden md:block">
						<div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 dark:from-blue-900/30 dark:via-purple-900/30 dark:to-pink-900/30" />
						<div className="relative h-full w-full flex items-center justify-center p-8">
							<div className="text-center space-y-4">
								<img
									src="/logo-b.png"
									alt="HMS Logo"
									className="h-24 w-24 mx-auto object-contain"
								/>
								<h2 className="text-xl font-semibold text-foreground">
									Helpdesk Management System
								</h2>
								<p className="text-sm text-muted-foreground max-w-xs">
									Insightful Ticket Analytics & Agent Performance
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

		</div>
	);
}
