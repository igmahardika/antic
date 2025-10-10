/**
 * React hooks for API interactions with caching and state management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import apiClient, { User, LoginCredentials, RegisterData } from "../lib/api";
import { logger } from "@/lib/logger";

interface UseApiState<T> {
	data: T | null;
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

interface UseApiOptions {
	immediate?: boolean;
	cache?: boolean;
	cacheTTL?: number;
	retryOnError?: boolean;
	retryDelay?: number;
	maxRetries?: number;
}

/**
 * Generic hook for API calls with caching and error handling
 */
export function useApi<T>(
	apiCall: () => Promise<T>,
	dependencies: any[] = [],
	options: UseApiOptions = {},
): UseApiState<T> {
	const {
		immediate = true,
		cache = true,
		retryOnError = true,
		retryDelay = 1000,
		maxRetries = 3,
	} = options;

	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const retryCount = useRef(0);
	const isMounted = useRef(true);

	const fetchData = useCallback(async () => {
		if (!isMounted.current) return;

		setLoading(true);
		setError(null);

		try {
			const result = await apiCall();
			if (isMounted.current) {
				setData(result);
				retryCount.current = 0;
			}
		} catch (err) {
			if (!isMounted.current) return;

			const errorMessage =
				err instanceof Error ? err.message : "An error occurred";
			setError(errorMessage);

			// Retry logic
			if (retryOnError && retryCount.current < maxRetries) {
				retryCount.current++;
				logger.info(
					`🔄 Retrying API call (${retryCount.current}/${maxRetries}) after ${retryDelay}ms`,
				);

				setTimeout(() => {
					if (isMounted.current) {
						fetchData();
					}
				}, retryDelay * retryCount.current);
			}
		} finally {
			if (isMounted.current) {
				setLoading(false);
			}
		}
	}, [apiCall, retryOnError, retryDelay, maxRetries]);

	useEffect(() => {
		if (immediate) {
			fetchData();
		}
	}, [fetchData, immediate, ...dependencies]);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	return {
		data,
		loading,
		error,
		refetch: fetchData,
	};
}

/**
 * Hook for authentication
 */
export function useAuth() {
	const [user, setUser] = useState<User | null>(apiClient.getCurrentUser());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const login = useCallback(async (credentials: LoginCredentials) => {
		setLoading(true);
		setError(null);

		try {
			const response = await apiClient.login(credentials);
			if (response.success) {
				setUser(response.user);
				return response;
			} else {
				throw new Error(response.error || "Login failed");
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Login failed";
			setError(errorMessage);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const register = useCallback(async (userData: RegisterData) => {
		setLoading(true);
		setError(null);

		try {
			const response = await apiClient.register(userData);
			if (!response.success) {
				throw new Error(response.error || "Registration failed");
			}
			return response;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Registration failed";
			setError(errorMessage);
			throw err;
		} finally {
			setLoading(false);
		}
	}, []);

	const logout = useCallback(async () => {
		setLoading(true);
		try {
			await apiClient.logout();
			setUser(null);
		} catch (err) {
			logger.error("Logout error:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	const refreshUser = useCallback(async () => {
		if (!apiClient.isAuthenticated()) {
			setUser(null);
			return;
		}

		try {
			const profile = await apiClient.getProfile(false); // Don't use cache
			setUser(profile);
		} catch (err) {
			logger.error("Failed to refresh user:", err);
			setUser(null);
		}
	}, []);

	return {
		user,
		loading,
		error,
		login,
		register,
		logout,
		refreshUser,
		isAuthenticated: !!user && apiClient.isAuthenticated(),
	};
}

/**
 * Hook for fetching users with caching
 */
export function useUsers(options: UseApiOptions = {}) {
	return useApi(
		() => apiClient.getUsers(options.cache !== false),
		[],
		{ cache: true, cacheTTL: 600000, ...options }, // 10 minutes default cache
	);
}

/**
 * Hook for user profile
 */
export function useProfile(options: UseApiOptions = {}) {
	return useApi(
		() => apiClient.getProfile(options.cache !== false),
		[],
		{ cache: true, cacheTTL: 300000, ...options }, // 5 minutes default cache
	);
}

/**
 * Hook for user activity
 */
export function useUserActivity(userId: number, options: UseApiOptions = {}) {
	return useApi(
		() => apiClient.getUserActivity(userId, options.cache !== false),
		[userId],
		{ cache: true, cacheTTL: 60000, ...options }, // 1 minute default cache
	);
}

/**
 * Hook for health check
 */
export function useHealthCheck(options: UseApiOptions = {}) {
	return useApi(() => apiClient.healthCheck(), [], {
		cache: false,
		immediate: false,
		...options,
	});
}

/**
 * Hook for cache management
 */
export function useCache() {
	const clearUserCache = useCallback(() => {
		apiClient.clearUserCache();
		logger.info("🗑️ User cache cleared");
	}, []);

	const clearAllCache = useCallback(() => {
		apiClient.clearAllCache();
		logger.info("🗑️ All cache cleared");
	}, []);

	const getCacheInfo = useCallback(() => {
		return apiClient.getCacheInfo();
	}, []);

	return {
		clearUserCache,
		clearAllCache,
		getCacheInfo,
	};
}

/**
 * Hook for real-time data with periodic refresh
 */
export function useRealTimeData<T>(
	apiCall: () => Promise<T>,
	interval: number = 30000, // 30 seconds default
	dependencies: any[] = [],
): UseApiState<T> {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const intervalRef = useRef<NodeJS.Timeout>();

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const result = await apiCall();
			setData(result);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "An error occurred";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [apiCall]);

	useEffect(() => {
		// Initial fetch
		fetchData();

		// Set up interval for periodic updates
		intervalRef.current = setInterval(fetchData, interval);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [fetchData, interval, ...dependencies]);

	return {
		data,
		loading,
		error,
		refetch: fetchData,
	};
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate<T>(initialData: T | null = null) {
	const [data, setData] = useState<T | null>(initialData);
	const [originalData, setOriginalData] = useState<T | null>(initialData);

	const optimisticUpdate = useCallback(
		(newData: T) => {
			setOriginalData(data);
			setData(newData);
		},
		[data],
	);

	const revert = useCallback(() => {
		setData(originalData);
		setOriginalData(null);
	}, [originalData]);

	const commit = useCallback(() => {
		setOriginalData(null);
	}, []);

	return {
		data,
		setData,
		optimisticUpdate,
		revert,
		commit,
		hasOptimisticUpdate: originalData !== null,
	};
}
