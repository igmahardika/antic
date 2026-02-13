// API service untuk komunikasi dengan backend MySQL
import { Incident } from "@/types/incident";
import { logger } from "@/lib/logger";
// Allow empty string for relative paths (proxied)
// Allow empty string for relative paths (proxied)
const API_BASE_URL = "";



// Helper function untuk mengambil auth token
const getAuthToken = (): string | null => {
	return localStorage.getItem("auth_token");
};

// Helper function untuk membuat headers dengan auth
/*
const getAuthHeaders = (): HeadersInit => {
	const token = getAuthToken();
	return {
		"Content-Type": "application/json",
		...(token && { Authorization: `Bearer ${token}` }),
	};
};
*/

// Mock authentication for disabled login
const getMockAuthHeaders = (): HeadersInit => {
	const token = getAuthToken();
	if (!token) {
		// Provide mock authentication headers when no token exists
		return {
			"Content-Type": "application/json",
			Authorization: "Bearer mock-token-disabled-login",
		};
	}
	return {
		"Content-Type": "application/json",
		...(token && { Authorization: `Bearer ${token}` }),
	};
};

// Generic API call function with retry mechanism
export async function apiCall<T>(
	endpoint: string,
	options: RequestInit = {},
	retries: number = 3,
): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const response = await fetch(url, {
				...options,
				headers: {
					...getMockAuthHeaders(),
					...options.headers,
				},
			});

			// Handle redirects (301, 302, etc.)
			if (response.redirected) {
				logger.warn(`API call redirected from ${url} to ${response.url}`);
			}

			// Check response content type
			const contentType = response.headers.get("content-type");
			const isJson = contentType && contentType.includes("application/json");

			if (!response.ok) {
				if (isJson) {
					const errorData = await response.json().catch(() => ({}));

					// Handle validation errors with details
					if (errorData.details && Array.isArray(errorData.details)) {
						const validationMessages = errorData.details
							.map((detail: any) => `${detail.field}: ${detail.message}`)
							.join(", ");
						throw new Error(`Validation failed: ${validationMessages}`);
					}

					throw new Error(
						errorData.error || errorData.message || `HTTP error! status: ${response.status}`,
					);
				} else {
					const text = await response.text();
					console.error("Non-JSON API Error Response:", text.substring(0, 500));
					throw new Error(
						`API Error ${response.status}: Server returned ${contentType || "unknown type"
						}`,
					);
				}
			}

			if (isJson) {
				return await response.json();
			} else {
				const text = await response.text();
				console.warn(
					"Received non-JSON success response:",
					text.substring(0, 200),
				);
				return text as unknown as T;
			}
		} catch (error) {
			// Handle CORS and network errors
			if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
				if (attempt === retries) {
					throw new Error(`Network error: Unable to connect to API server after ${retries} attempts. Please check your internet connection and try again.`);
				}
				// Wait before retry
				await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
				continue;
			}

			// Handle CORS preflight errors
			if (error instanceof TypeError && error.message.includes('Preflight response is not successful')) {
				if (attempt === retries) {
					throw new Error(`CORS error: API server is not responding correctly after ${retries} attempts. Please contact administrator.`);
				}
				// Wait before retry
				await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
				continue;
			}

			// For other errors, don't retry
			throw error;
		}
	}

	throw new Error(`API call failed after ${retries} attempts`);
}

// User Management API
export interface User {
	id: number;
	username: string;
	role: "super admin" | "admin" | "user";
	created_at?: string;
	last_login?: string;
	is_active?: boolean;
}

export interface MenuPermission {
	id: number;
	role: "super admin" | "admin" | "user";
	menus: string[];
	created_at?: string;
	updated_at?: string;
}

export const userAPI = {
	// Get all users
	async getUsers(): Promise<User[]> {
		const response = await apiCall<{ success: boolean; users: User[] }>(
			"/api/users",
		);
		return response.users;
	},

	// Add new user
	async addUser(userData: {
		username: string;
		password: string;
		role: string;
	}): Promise<void> {
		await apiCall("/api/users", {
			method: "POST",
			body: JSON.stringify(userData),
		});
	},

	// Update user
	async updateUser(
		id: number,
		userData: { username: string; password?: string; role: string },
	): Promise<void> {
		await apiCall(`/api/users/${id}`, {
			method: "PUT",
			body: JSON.stringify(userData),
		});
	},

	// Delete user
	async deleteUser(id: number): Promise<void> {
		await apiCall(`/api/users/${id}`, {
			method: "DELETE",
		});
	},
};

export const menuPermissionAPI = {
	// Get menu permissions
	async getPermissions(): Promise<MenuPermission[]> {
		const response = await apiCall<{
			success: boolean;
			permissions: MenuPermission[];
		}>("/api/menu-permissions");
		return response.permissions.map((p) => ({
			...p,
			menus: typeof p.menus === "string" ? JSON.parse(p.menus) : p.menus,
		}));
	},

	// Update menu permissions
	async updatePermissions(role: string, menus: string[]): Promise<void> {
		await apiCall("/api/menu-permissions", {
			method: "POST",
			body: JSON.stringify({ role, menus }),
		});
	},
};

// Auth API
export const authAPI = {
	async login(
		username: string,
		password: string,
		recaptchaToken?: string,
	): Promise<{
		success: boolean;
		token: string;
		user: User;
		sessionId: string;
	}> {
		return apiCall("/api/login", {
			method: "POST",
			body: JSON.stringify({ username, password, recaptchaToken }),
		});
	},

	async logout(): Promise<void> {
		await apiCall("/api/logout", {
			method: "POST",
		});
	},
};

// Tickets API
export interface Ticket {
	id: string;
	customer_id: string;
	name: string;
	category?: string;
	description?: string;
	cause?: string;
	handling?: string;
	open_time: string;
	close_time?: string;
	duration_raw_hours?: number;
	duration_formatted?: string;
	close_handling?: string;
	handling_duration_raw_hours?: number;
	handling_duration_formatted?: string;
	classification?: string;
	sub_classification?: string;
	status?: string;
	handling1?: string;
	close_handling1?: string;
	handling_duration1_raw_hours?: number;
	handling_duration1_formatted?: string;
	handling2?: string;
	close_handling2?: string;
	handling_duration2_raw_hours?: number;
	handling_duration2_formatted?: string;
	handling3?: string;
	close_handling3?: string;
	handling_duration3_raw_hours?: number;
	handling_duration3_formatted?: string;
	handling4?: string;
	close_handling4?: string;
	handling_duration4_raw_hours?: number;
	handling_duration4_formatted?: string;
	handling5?: string;
	close_handling5?: string;
	handling_duration5_raw_hours?: number;
	handling_duration5_formatted?: string;
	open_by?: string;
	cabang?: string;
	upload_timestamp?: number;
	rep_class?: string;
	created_at?: string;
	updated_at?: string;
}

export interface Customer {
	id: string;
	nama: string;
	jenis_klien?: string;
	layanan?: string;
	kategori?: string;
	created_at?: string;
	updated_at?: string;
}

export const ticketAPI = {
	// Get all tickets
	async getTickets(params?: {
		page?: number;
		limit?: number;
		search?: string;
		category?: string;
		status?: string;
		cabang?: string;
	}): Promise<{ tickets: Ticket[]; pagination: any }> {
		const queryParams = new URLSearchParams();
		if (params?.page) queryParams.append("page", params.page.toString());
		if (params?.limit) queryParams.append("limit", params.limit.toString());
		if (params?.search) queryParams.append("search", params.search);
		if (params?.category) queryParams.append("category", params.category);
		if (params?.status) queryParams.append("status", params.status);
		if (params?.cabang) queryParams.append("cabang", params.cabang);

		const response = await apiCall<{
			success: boolean;
			tickets: Ticket[];
			pagination: any;
		}>(`/api/tickets?${queryParams.toString()}`);

		if (!response) return { tickets: [], pagination: {} };
		return { tickets: response.tickets || [], pagination: response.pagination || {} };
	},

	// Get available ticket years
	async getTicketYears(): Promise<{ success: boolean; years: number[] }> {
		return apiCall("/api/tickets/years");
	},

	// Add new ticket
	async addTicket(ticketData: any): Promise<void> {
		await apiCall("/api/tickets", {
			method: "POST",
			body: JSON.stringify(ticketData),
		});
	},

	// Bulk insert tickets with metadata support
	async bulkInsertTickets(
		tickets: any[],
		metadata?: {
			batchId?: string;
			fileName?: string;
			uploadTimestamp?: number;
		},
	): Promise<{ success: number; failed: number }> {
		try {
			const response = await apiCall<{
				success: boolean;
				message: string;
				created: number;
			}>("/api/tickets/bulk", {
				method: "POST",
				body: JSON.stringify({
					tickets,
					metadata: metadata || {},
				}),
			});

			return {
				success: response.created || tickets.length,
				failed: 0,
			};
		} catch (error) {
			console.error("Bulk insert failed:", error);
			throw error;
		}
	},
};

export const customerAPI = {
	// Get all customers
	async getCustomers(params?: {
		page?: number;
		limit?: number;
		search?: string;
		jenisKlien?: string;
		layanan?: string;
		kategori?: string;
	}): Promise<{ customers: Customer[]; pagination: any }> {
		const queryParams = new URLSearchParams();
		if (params?.page) queryParams.append("page", params.page.toString());
		if (params?.limit) queryParams.append("limit", params.limit.toString());
		if (params?.search) queryParams.append("search", params.search);
		if (params?.jenisKlien) queryParams.append("jenisKlien", params.jenisKlien);
		if (params?.layanan) queryParams.append("layanan", params.layanan);
		if (params?.kategori) queryParams.append("kategori", params.kategori);

		const response = await apiCall<{
			success: boolean;
			customers: Customer[];
			pagination: any;
		}>(`/api/customers?${queryParams.toString()}`);
		return { customers: response.customers, pagination: response.pagination };
	},

	// Add new customer
	async addCustomer(customerData: {
		id: string;
		nama: string;
		jenisKlien?: string;
		layanan?: string;
		kategori?: string;
	}): Promise<void> {
		await apiCall("/api/customers", {
			method: "POST",
			body: JSON.stringify(customerData),
		});
	},

	// Bulk insert customers
	async bulkInsertCustomers(
		customers: any[],
		metadata?: {
			batchId?: string;
			fileName?: string;
		},
	): Promise<{ success: number; failed: number }> {
		await apiCall("/api/customers/bulk", {
			method: "POST",
			body: JSON.stringify({ customers, metadata }),
		});
		return { success: customers.length, failed: 0 };
	},

	// Delete all customers (Reset)
	async deleteAllCustomers(): Promise<void> {
		await apiCall("/api/customers/all", {
			method: "DELETE",
		});
	},
};

export interface Vendor {
	id: number;
	name: string;
	description?: string;
	contactPerson?: string;
	email?: string;
	phone?: string;
	isActive: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export const vendorAPI = {
	// Get all vendors
	async getVendors(): Promise<{ vendors: Vendor[] }> {
		const response = await apiCall<{ success: boolean; vendors: Vendor[] }>(
			"/api/vendors",
		);
		return { vendors: response.vendors };
	},

	// Add new vendor
	async addVendor(vendorData: Omit<Vendor, "id" | "createdAt" | "updatedAt">): Promise<void> {
		await apiCall("/api/vendors", {
			method: "POST",
			body: JSON.stringify(vendorData),
		});
	},

	// Update vendor
	async updateVendor(id: number, vendorData: Partial<Vendor>): Promise<void> {
		await apiCall(`/api/vendors/${id}`, {
			method: "PUT",
			body: JSON.stringify(vendorData),
		});
	},

	// Delete vendor
	async deleteVendor(id: number): Promise<void> {
		await apiCall(`/api/vendors/${id}`, {
			method: "DELETE",
		});
	},

	// Toggle vendor status
	async toggleActive(id: number, isActive: boolean): Promise<void> {
		await apiCall(`/api/vendors/${id}/status`, {
			method: "PATCH",
			body: JSON.stringify({ isActive }),
		});
	},
};

export type { Incident };

export const incidentAPI = {
	// Get all incidents
	async getIncidents(params?: {
		page?: number;
		limit?: number;
		search?: string;
		priority?: string;
		ncal?: string;
		status?: string;
		month?: string; // YYYY-MM
	}): Promise<{ incidents: Incident[]; total: number; pagination: any }> {
		const queryParams = new URLSearchParams();
		if (params?.page) queryParams.append("page", params.page.toString());
		if (params?.limit) queryParams.append("limit", params.limit.toString());
		if (params?.search) queryParams.append("search", params.search);
		if (params?.priority) queryParams.append("priority", params.priority);
		if (params?.ncal) queryParams.append("ncal", params.ncal);
		if (params?.status) queryParams.append("status", params.status);
		if (params?.month) queryParams.append("month", params.month);

		const response = await apiCall<{
			success: boolean;
			incidents: any[];
			total?: number;
			pagination?: any;
		}>(`/api/incidents?${queryParams.toString()}`);

		// Map snake_case from DB to camelCase for frontend
		const incidents = (response.incidents || []).map((inc: any) => ({
			id: inc.id,
			noCase: inc.no_case,
			priority: inc.priority,
			site: inc.site,
			ncal: inc.ncal,
			status: inc.status,
			level: inc.level,
			ts: inc.ts,
			odpBts: inc.odp_bts,
			startTime: inc.start_time,
			endTime: inc.end_time,
			startEscalationVendor: inc.start_escalation_vendor,
			durationMin: inc.duration_min,
			durationVendorMin: inc.duration_vendor_min,
			totalDurationPauseMin: inc.total_duration_pause_min,
			totalDurationVendorMin: inc.total_duration_vendor_min,
			startPause1: inc.start_pause1,
			endPause1: inc.end_pause1,
			startPause2: inc.start_pause2,
			endPause2: inc.end_pause2,
			problem: inc.problem,
			penyebab: inc.penyebab,
			actionTerakhir: inc.action_terakhir,
			note: inc.note,
			klasifikasiGangguan: inc.klasifikasi_gangguan,
			powerBefore: inc.power_before,
			powerAfter: inc.power_after,
			batchId: inc.batch_id,
			uploadSessionId: inc.upload_session_id,
			fileName: inc.file_name,
			importedAt: inc.imported_at || inc.created_at
		}));

		return {
			incidents: incidents as unknown as Incident[],
			total: response.total || incidents.length,
			pagination: response.pagination || {}
		};
	},

	// Bulk insert incidents
	async bulkInsertIncidents(
		incidents: any[],
		metadata?: {
			batchId?: string;
			fileName?: string;
			uploadSessionId?: string;
		},
	): Promise<{ success: number; failed: number }> {
		const response = await apiCall<{
			success: boolean;
			message: string;
			created: number;
		}>("/api/incidents/bulk", {
			method: "POST",
			body: JSON.stringify({ incidents, metadata }),
		});
		return { success: response.created || incidents.length, failed: 0 };
	},

	// Delete all incidents (Reset)
	async deleteAllIncidents(): Promise<void> {
		await apiCall("/api/incidents/all", {
			method: "DELETE",
		});
	},

	// Get incident statistics
	async getIncidentStats(params?: {
		month?: string;
	}): Promise<{
		total: number;
		open: number;
		closed: number;
		avgDuration: number;
		avgNetDuration: number;
		ncalCounts: Record<string, number>;
	}> {
		const queryParams = new URLSearchParams();
		if (params?.month) queryParams.append("month", params.month);

		const response = await apiCall<{
			success: boolean;
			stats: any;
		}>(`/api/incidents/stats?${queryParams.toString()}`);

		return response.stats;
	},

	// Get available months
	async getIncidentMonths(): Promise<string[]> {
		const response = await apiCall<{
			success: boolean;
			months: string[];
		}>("/api/incidents/months");
		return response.months || [];
	},
};

export const uploadSessionAPI = {
	async createSession(session: any): Promise<void> {
		await apiCall("/api/upload-sessions", {
			method: "POST",
			body: JSON.stringify(session),
		});
	},
	async updateSession(id: string, updates: any): Promise<void> {
		await apiCall(`/api/upload-sessions/${id}`, {
			method: "PUT",
			body: JSON.stringify(updates),
		});
	},
};

// =============================================================================
// Workload Analytics API
// =============================================================================

export interface CapacityMetrics {
	total_agents: number;
	total_max_concurrent: number;
	total_daily_capacity: number;
	current_tickets: number;
	utilization_pct: number;
	remaining_capacity: number;
	status: 'healthy' | 'near_capacity' | 'overloaded';
	recommended_agents: number;
}

export interface UtilizationData {
	agent_name: string;
	ticket_count: number;
	utilization_rate: number;
	total_handling_time: number;
	available_capacity: number;
	remaining_capacity: number;
}

export interface QueueMetrics {
	total_in_queue: number;
	avg_wait_time: number;
	queue_velocity: number;
	aging_breakdown: {
		fresh: number;
		aging: number;
		old: number;
		critical: number;
	};
	resolved_last_24h: number;
}

export interface ForecastData {
	date: string;
	predicted_count: number;
	confidence_low: number;
	confidence_high: number;
}

export interface ComplexityAnalysis {
	avg_complexity: number;
	min_complexity: number;
	max_complexity: number;
	distribution: {
		simple: number;
		medium: number;
		complex: number;
	};
	total_analyzed: number;
}

export interface AgentCapacity {
	id: number;
	agent_name: string;
	max_concurrent_tickets: number;
	working_hours_per_day: number;
	efficiency_rate: number;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export const workloadAPI = {
	async getCapacityMetrics(): Promise<CapacityMetrics> {
		const response = await apiCall<{ success: boolean; metrics: CapacityMetrics }>(
			'/api/workload/capacity'
		);
		return response.metrics;
	},

	async getUtilizationRates(period: number = 30): Promise<UtilizationData[]> {
		const response = await apiCall<{ success: boolean; data: UtilizationData[] }>(
			`/api/workload/utilization?period=${period}`
		);
		return response.data;
	},

	async getQueueMetrics(): Promise<QueueMetrics> {
		const response = await apiCall<{ success: boolean; metrics: QueueMetrics }>(
			'/api/workload/queue-metrics'
		);
		return response.metrics;
	},

	async getForecast(days: number = 7): Promise<{ forecast: ForecastData[]; historical: Array<{ date: string; count: number }> }> {
		const response = await apiCall<{
			success: boolean;
			forecast: ForecastData[];
			historical: Array<{ date: string; count: number }>
		}>(
			`/api/workload/forecast?days=${days}`
		);
		return { forecast: response.forecast, historical: response.historical };
	},

	async getComplexityAnalysis(): Promise<ComplexityAnalysis> {
		const response = await apiCall<{ success: boolean; analysis: ComplexityAnalysis }>(
			'/api/workload/complexity-analysis'
		);
		return response.analysis;
	},

	async recalculateComplexity(): Promise<{ message: string }> {
		const response = await apiCall<{ success: boolean; message: string }>(
			'/api/workload/recalculate-complexity',
			{ method: 'POST' }
		);
		return { message: response.message };
	},

	async getAgentCapacity(): Promise<AgentCapacity[]> {
		const response = await apiCall<{ success: boolean; agents: AgentCapacity[] }>(
			'/api/agent-capacity'
		);
		return response.agents;
	},

	async updateAgentCapacity(
		agentName: string,
		updates: Partial<Omit<AgentCapacity, 'id' | 'agent_name' | 'created_at' | 'updated_at'>>
	): Promise<{ message: string }> {
		const response = await apiCall<{ success: boolean; message: string }>(
			`/api/agent-capacity/${encodeURIComponent(agentName)}`,
			{
				method: 'PUT',
				body: JSON.stringify(updates),
			}
		);
		return { message: response.message };
	},
};

export default {
	userAPI,
	menuPermissionAPI,
	authAPI,
	ticketAPI,
	customerAPI,
	incidentAPI,
	uploadSessionAPI,
	vendorAPI,
	workloadAPI,
};
