// API service untuk komunikasi dengan backend MySQL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper function untuk mengambil auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Helper function untuk membuat headers dengan auth
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Mock authentication for disabled login
const getMockAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  if (!token) {
    // Provide mock authentication headers when no token exists
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer mock-token-disabled-login',
    };
  }
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getMockAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Handle validation errors with details
    if (errorData.details && Array.isArray(errorData.details)) {
      const validationMessages = errorData.details.map((detail: any) => 
        `${detail.field}: ${detail.message}`
      ).join(', ');
      throw new Error(`Validation failed: ${validationMessages}`);
    }
    
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// User Management API
export interface User {
  id: number;
  username: string;
  role: 'super admin' | 'admin' | 'user';
  created_at?: string;
  last_login?: string;
  is_active?: boolean;
}

export interface MenuPermission {
  id: number;
  role: 'super admin' | 'admin' | 'user';
  menus: string[];
  created_at?: string;
  updated_at?: string;
}

export const userAPI = {
  // Get all users
  async getUsers(): Promise<User[]> {
    const response = await apiCall<{ success: boolean; users: User[] }>('/api/users');
    return response.users;
  },

  // Add new user
  async addUser(userData: { username: string; password: string; role: string }): Promise<void> {
    await apiCall('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Update user
  async updateUser(id: number, userData: { username: string; password?: string; role: string }): Promise<void> {
    await apiCall(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Delete user
  async deleteUser(id: number): Promise<void> {
    await apiCall(`/api/users/${id}`, {
      method: 'DELETE',
    });
  },
};

export const menuPermissionAPI = {
  // Get menu permissions
  async getPermissions(): Promise<MenuPermission[]> {
    const response = await apiCall<{ success: boolean; permissions: MenuPermission[] }>('/api/menu-permissions');
    return response.permissions.map(p => ({
      ...p,
      menus: typeof p.menus === 'string' ? JSON.parse(p.menus) : p.menus
    }));
  },

  // Update menu permissions
  async updatePermissions(role: string, menus: string[]): Promise<void> {
    await apiCall('/api/menu-permissions', {
      method: 'POST',
      body: JSON.stringify({ role, menus }),
    });
  },
};

// Auth API
export const authAPI = {
  async login(username: string, password: string): Promise<{
  success: boolean;
  token: string;
  user: User;
  sessionId: string;
  }> {
    return apiCall('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout(): Promise<void> {
    await apiCall('/logout', {
      method: 'POST',
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
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.cabang) queryParams.append('cabang', params.cabang);

    const response = await apiCall<{ success: boolean; tickets: Ticket[]; pagination: any }>(
      `/api/tickets?${queryParams.toString()}`
    );
    return { tickets: response.tickets, pagination: response.pagination };
  },

  // Add new ticket
  async addTicket(ticketData: any): Promise<void> {
    await apiCall('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  },

  // Bulk insert tickets
  async bulkInsertTickets(tickets: any[]): Promise<void> {
    await apiCall('/api/tickets/bulk', {
      method: 'POST',
      body: JSON.stringify({ tickets }),
    });
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
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.jenisKlien) queryParams.append('jenisKlien', params.jenisKlien);
    if (params?.layanan) queryParams.append('layanan', params.layanan);
    if (params?.kategori) queryParams.append('kategori', params.kategori);

    const response = await apiCall<{ success: boolean; customers: Customer[]; pagination: any }>(
      `/api/customers?${queryParams.toString()}`
    );
    return { customers: response.customers, pagination: response.pagination };
  },

  // Add new customer
  async addCustomer(customerData: { id: string; nama: string; jenisKlien?: string; layanan?: string; kategori?: string }): Promise<void> {
    await apiCall('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  },

  // Bulk insert customers
  async bulkInsertCustomers(customers: any[]): Promise<void> {
    await apiCall('/api/customers/bulk', {
      method: 'POST',
      body: JSON.stringify({ customers }),
    });
  },
};

export default {
  userAPI,
  menuPermissionAPI,
  authAPI,
  ticketAPI,
  customerAPI,
};