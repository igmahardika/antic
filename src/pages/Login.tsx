import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import { API_CONFIG } from "@/lib/config";
import { logger } from "@/lib/logger";

const Login: React.FC = () => {
	const navigate = useNavigate();
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async (
		username: string,
		password: string,
		recaptchaToken?: string,
	) => {
		setError("");
		setLoading(true);
		try {
			const response = await fetch(`${API_CONFIG.baseURL}/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password, recaptchaToken }),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				// Store authentication data
				localStorage.setItem("auth_token", data.token);
				localStorage.setItem("user", JSON.stringify(data.user));
				localStorage.setItem("session_id", data.sessionId);

				navigate("/summary-dashboard");
			} else {
				setError(data.error || "Username atau password salah");
			}
		} catch (err) {
			logger.error("Login error:", err);
			setError("Terjadi kesalahan koneksi, coba lagi");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10 w-full">
			<div className="w-full max-w-sm md:max-w-4xl">
				<LoginForm
					onLogin={handleLogin}
					error={error}
					loading={loading}
					description="Login to your HMS account"
				/>
			</div>
		</div>
	);
};

export default Login;
