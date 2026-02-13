import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import { authAPI, menuPermissionAPI } from "@/lib/api";
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
			// Menggunakan authAPI yang sudah terstandarisasi
			const data = await authAPI.login(username, password, recaptchaToken);

			if (data && data.token) {
				// Store authentication data
				localStorage.setItem("auth_token", data.token);
				localStorage.setItem("user", JSON.stringify(data.user));
				localStorage.setItem("session_id", data.sessionId);

				// Fetch menu permissions using standardized API
				try {
					const permissions = await menuPermissionAPI.getPermissions();
					// Transform to match existing storage format if necessary
					// getPermissions returns MenuPermission[]
					// Store all permissions so AppSidebar can find the matching role
					localStorage.setItem("menuPermissions", JSON.stringify(permissions));
				} catch (permErr) {
					logger.error("Failed to load menu permissions:", permErr);
					// Continue to navigate even if permissions fail
				}

				navigate("/summary-dashboard");
			} else {
				setError("Username atau password salah");
			}
		} catch (err: any) {
			logger.error("Login error:", err);
			setError(err.message || "Terjadi kesalahan koneksi, coba lagi");
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
