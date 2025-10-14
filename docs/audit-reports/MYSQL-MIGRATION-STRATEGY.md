# MySQL Migration Strategy Audit

## Executive Summary

This comprehensive audit examines the migration strategy from IndexedDB to MySQL for the HMS (Helpdesk Management System) application. The current system uses IndexedDB with Dexie.js for client-side data persistence, while a MySQL backend already exists with comprehensive API endpoints. This audit provides a detailed migration strategy that ensures data integrity, minimal downtime, and seamless user experience.

## Current Architecture Analysis

### Frontend (IndexedDB + Dexie.js)
- **Database**: IndexedDB with Dexie.js ORM
- **Tables**: tickets, incidents, customers, users, vendors, uploadSessions
- **Data Flow**: Client-side reactive queries with `useLiveQuery`
- **Storage**: Browser-based, limited by browser quotas
- **Sync**: No automatic synchronization with backend

### Backend (MySQL + Express.js)
- **Database**: MySQL 8.0+ with connection pooling
- **API**: RESTful endpoints for all data operations
- **Authentication**: JWT with Redis session management
- **Security**: Rate limiting, input validation, audit logging
- **Caching**: Redis for session management and performance

## Migration Strategy Overview

### Phase 1: Preparation & Infrastructure
### Phase 2: Data Migration & Synchronization
### Phase 3: Frontend Adaptation
### Phase 4: Testing & Validation
### Phase 5: Production Deployment

## Detailed Migration Plan

### Phase 1: Preparation & Infrastructure

#### 1.1 Database Schema Alignment

**Current MySQL Schema:**
```sql
-- Users table (already exists)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('super admin', 'admin', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL
);

-- User sessions (Redis backup)
CREATE TABLE user_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id INT NOT NULL,
  session_data JSON,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User activity log
CREATE TABLE user_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Required MySQL Schema Extensions:**
```sql
-- Tickets table
CREATE TABLE tickets (
  id VARCHAR(255) PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  cause TEXT,
  handling TEXT,
  open_time DATETIME NOT NULL,
  close_time DATETIME NULL,
  duration_raw_hours DECIMAL(10,2) DEFAULT 0,
  duration_formatted VARCHAR(50),
  close_handling TEXT,
  handling_duration_raw_hours DECIMAL(10,2) DEFAULT 0,
  handling_duration_formatted VARCHAR(50),
  classification VARCHAR(100),
  sub_classification VARCHAR(100),
  status VARCHAR(50) DEFAULT 'open',
  handling1 TEXT,
  close_handling1 TEXT,
  handling_duration1_raw_hours DECIMAL(10,2) DEFAULT 0,
  handling_duration1_formatted VARCHAR(50),
  handling2 TEXT,
  close_handling2 TEXT,
  handling_duration2_raw_hours DECIMAL(10,2) DEFAULT 0,
  handling_duration2_formatted VARCHAR(50),
  handling3 TEXT,
  close_handling3 TEXT,
  handling_duration3_raw_hours DECIMAL(10,2) DEFAULT 0,
  handling_duration3_formatted VARCHAR(50),
  handling4 TEXT,
  close_handling4 TEXT,
  handling_duration4_raw_hours DECIMAL(10,2) DEFAULT 0,
  handling_duration4_formatted VARCHAR(50),
  handling5 TEXT,
  close_handling5 TEXT,
  handling_duration5_raw_hours DECIMAL(10,2) DEFAULT 0,
  handling_duration5_formatted VARCHAR(50),
  open_by VARCHAR(255),
  cabang VARCHAR(100),
  upload_timestamp BIGINT,
  rep_class VARCHAR(50),
  batch_id VARCHAR(255),
  file_name VARCHAR(255),
  file_hash VARCHAR(255),
  upload_session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_open_time (open_time),
  INDEX idx_name (name),
  INDEX idx_upload_timestamp (upload_timestamp),
  INDEX idx_cabang (cabang),
  INDEX idx_batch_id (batch_id),
  INDEX idx_file_hash (file_hash),
  INDEX idx_file_name (file_name)
);

-- Incidents table
CREATE TABLE incidents (
  id VARCHAR(255) PRIMARY KEY,
  no_case VARCHAR(100) NOT NULL,
  priority VARCHAR(50),
  site VARCHAR(255),
  ncal VARCHAR(50),
  status VARCHAR(50),
  level VARCHAR(50),
  start_time DATETIME NOT NULL,
  end_time DATETIME NULL,
  duration_min DECIMAL(10,2) DEFAULT 0,
  ts VARCHAR(255),
  start_pause1 DATETIME NULL,
  end_pause1 DATETIME NULL,
  start_pause2 DATETIME NULL,
  end_pause2 DATETIME NULL,
  total_duration_pause_min DECIMAL(10,2) DEFAULT 0,
  total_duration_vendor_min DECIMAL(10,2) DEFAULT 0,
  batch_id VARCHAR(255),
  file_name VARCHAR(255),
  file_hash VARCHAR(255),
  upload_session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_start_time (start_time),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_site (site),
  INDEX idx_no_case (no_case),
  INDEX idx_batch_id (batch_id),
  INDEX idx_file_hash (file_hash),
  INDEX idx_file_name (file_name)
);

-- Customers table
CREATE TABLE customers (
  id VARCHAR(255) PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  jenis_klien VARCHAR(100),
  layanan VARCHAR(100),
  kategori VARCHAR(100),
  batch_id VARCHAR(255),
  file_name VARCHAR(255),
  file_hash VARCHAR(255),
  upload_session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nama (nama),
  INDEX idx_jenis_klien (jenis_klien),
  INDEX idx_layanan (layanan),
  INDEX idx_kategori (kategori),
  INDEX idx_batch_id (batch_id),
  INDEX idx_file_hash (file_hash),
  INDEX idx_file_name (file_name)
);

-- Vendors table
CREATE TABLE vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
);

-- Upload sessions table
CREATE TABLE upload_sessions (
  id VARCHAR(255) PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_hash VARCHAR(255) NOT NULL,
  file_size BIGINT DEFAULT 0,
  upload_timestamp BIGINT NOT NULL,
  record_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  data_type ENUM('tickets', 'incidents', 'customers') NOT NULL,
  status ENUM('uploading', 'completed', 'failed', 'deleted') NOT NULL,
  error_log JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_file_name (file_name),
  INDEX idx_file_hash (file_hash),
  INDEX idx_upload_timestamp (upload_timestamp),
  INDEX idx_data_type (data_type),
  INDEX idx_status (status)
);

-- Menu permissions table
CREATE TABLE menu_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('super admin', 'admin', 'user') NOT NULL,
  menus JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role)
);
```

#### 1.2 API Endpoint Extensions

**Required New Endpoints:**
```typescript
// Incidents API
GET    /api/incidents                    // Get all incidents
POST   /api/incidents                    // Create incident
POST   /api/incidents/bulk               // Bulk insert incidents
PUT    /api/incidents/:id                // Update incident
DELETE /api/incidents/:id                // Delete incident

// Vendors API
GET    /api/vendors                      // Get all vendors
POST   /api/vendors                      // Create vendor
PUT    /api/vendors/:id                  // Update vendor
DELETE /api/vendors/:id                  // Delete vendor

// Upload Sessions API
GET    /api/upload-sessions             // Get upload history
POST   /api/upload-sessions             // Create upload session
PUT    /api/upload-sessions/:id         // Update upload session
DELETE /api/upload-sessions/:id         // Delete upload session

// Migration API
POST   /api/migration/incidents/bulk    // Bulk migrate incidents
POST   /api/migration/vendors/bulk      // Bulk migrate vendors
GET    /api/migration/status            // Migration status
```

#### 1.3 Data Migration Scripts

**Migration Script Structure:**
```typescript
// src/lib/migrationService.ts
export class MigrationService {
  private apiClient: APIClient;
  private db: Dexie;
  
  constructor() {
    this.apiClient = new APIClient();
    this.db = new TicketDB();
  }

  async migrateTickets(): Promise<MigrationResult> {
    // Implementation for ticket migration
  }

  async migrateIncidents(): Promise<MigrationResult> {
    // Implementation for incident migration
  }

  async migrateCustomers(): Promise<MigrationResult> {
    // Implementation for customer migration
  }

  async migrateVendors(): Promise<MigrationResult> {
    // Implementation for vendor migration
  }

  async migrateUploadSessions(): Promise<MigrationResult> {
    // Implementation for upload session migration
  }

  async validateMigration(): Promise<ValidationResult> {
    // Implementation for migration validation
  }
}
```

### Phase 2: Data Migration & Synchronization

#### 2.1 Data Export from IndexedDB

**Export Strategy:**
```typescript
// Export all data from IndexedDB
const exportData = async () => {
  const tickets = await db.tickets.toArray();
  const incidents = await db.incidents.toArray();
  const customers = await db.customers.toArray();
  const vendors = await db.vendors.toArray();
  const uploadSessions = await db.uploadSessions.toArray();
  
  return {
    tickets,
    incidents,
    customers,
    vendors,
    uploadSessions,
    exportTimestamp: Date.now()
  };
};
```

#### 2.2 Data Transformation

**Data Transformation Pipeline:**
```typescript
// Transform IndexedDB data to MySQL format
const transformTickets = (tickets: ITicket[]) => {
  return tickets.map(ticket => ({
    id: ticket.id,
    customer_id: ticket.customerId,
    name: ticket.name,
    category: ticket.category,
    description: ticket.description,
    cause: ticket.cause,
    handling: ticket.handling,
    open_time: ticket.openTime,
    close_time: ticket.closeTime,
    duration_raw_hours: ticket.duration?.rawHours || 0,
    duration_formatted: ticket.duration?.formatted || '',
    close_handling: ticket.closeHandling,
    handling_duration_raw_hours: ticket.handlingDuration?.rawHours || 0,
    handling_duration_formatted: ticket.handlingDuration?.formatted || '',
    classification: ticket.classification,
    sub_classification: ticket.subClassification,
    status: ticket.status || 'open',
    handling1: ticket.handling1,
    close_handling1: ticket.closeHandling1,
    handling_duration1_raw_hours: ticket.handlingDuration1?.rawHours || 0,
    handling_duration1_formatted: ticket.handlingDuration1?.formatted || '',
    handling2: ticket.handling2,
    close_handling2: ticket.closeHandling2,
    handling_duration2_raw_hours: ticket.handlingDuration2?.rawHours || 0,
    handling_duration2_formatted: ticket.handlingDuration2?.formatted || '',
    handling3: ticket.handling3,
    close_handling3: ticket.closeHandling3,
    handling_duration3_raw_hours: ticket.handlingDuration3?.rawHours || 0,
    handling_duration3_formatted: ticket.handlingDuration3?.formatted || '',
    handling4: ticket.handling4,
    close_handling4: ticket.closeHandling4,
    handling_duration4_raw_hours: ticket.handlingDuration4?.rawHours || 0,
    handling_duration4_formatted: ticket.handlingDuration4?.formatted || '',
    handling5: ticket.handling5,
    close_handling5: ticket.closeHandling5,
    handling_duration5_raw_hours: ticket.handlingDuration5?.rawHours || 0,
    handling_duration5_formatted: ticket.handlingDuration5?.formatted || '',
    open_by: ticket.openBy,
    cabang: ticket.cabang,
    upload_timestamp: ticket.uploadTimestamp,
    rep_class: ticket.repClass,
    batch_id: ticket.batchId,
    file_name: ticket.fileName,
    file_hash: ticket.fileHash,
    upload_session_id: ticket.uploadSessionId
  }));
};
```

#### 2.3 Bulk Data Import

**Chunked Migration:**
```typescript
const migrateDataInChunks = async (data: any[], endpoint: string, chunkSize: number = 100) => {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }

  const results = [];
  for (const chunk of chunks) {
    try {
      const result = await apiClient.post(endpoint, { data: chunk });
      results.push({ success: true, count: chunk.length, result });
    } catch (error) {
      results.push({ success: false, count: chunk.length, error });
    }
  }

  return results;
};
```

### Phase 3: Frontend Adaptation

#### 3.1 API Client Implementation

**New API Client:**
```typescript
// src/lib/mysqlApiClient.ts
export class MySQLAPIClient {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Tickets API
  async getTickets(params?: TicketQueryParams): Promise<TicketResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.cabang) queryParams.append('cabang', params.cabang);

    return this.request<TicketResponse>(`/api/tickets?${queryParams.toString()}`);
  }

  async createTicket(ticket: CreateTicketRequest): Promise<void> {
    await this.request('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
  }

  async bulkInsertTickets(tickets: CreateTicketRequest[]): Promise<void> {
    await this.request('/api/tickets/bulk', {
      method: 'POST',
      body: JSON.stringify({ tickets }),
    });
  }

  // Incidents API
  async getIncidents(params?: IncidentQueryParams): Promise<IncidentResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.site) queryParams.append('site', params.site);

    return this.request<IncidentResponse>(`/api/incidents?${queryParams.toString()}`);
  }

  async createIncident(incident: CreateIncidentRequest): Promise<void> {
    await this.request('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(incident),
    });
  }

  async bulkInsertIncidents(incidents: CreateIncidentRequest[]): Promise<void> {
    await this.request('/api/incidents/bulk', {
      method: 'POST',
      body: JSON.stringify({ incidents }),
    });
  }

  // Customers API
  async getCustomers(params?: CustomerQueryParams): Promise<CustomerResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.jenisKlien) queryParams.append('jenisKlien', params.jenisKlien);
    if (params?.layanan) queryParams.append('layanan', params.layanan);
    if (params?.kategori) queryParams.append('kategori', params.kategori);

    return this.request<CustomerResponse>(`/api/customers?${queryParams.toString()}`);
  }

  async createCustomer(customer: CreateCustomerRequest): Promise<void> {
    await this.request('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  async bulkInsertCustomers(customers: CreateCustomerRequest[]): Promise<void> {
    await this.request('/api/customers/bulk', {
      method: 'POST',
      body: JSON.stringify({ customers }),
    });
  }

  // Vendors API
  async getVendors(params?: VendorQueryParams): Promise<VendorResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    return this.request<VendorResponse>(`/api/vendors?${queryParams.toString()}`);
  }

  async createVendor(vendor: CreateVendorRequest): Promise<void> {
    await this.request('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(vendor),
    });
  }

  async updateVendor(id: number, vendor: UpdateVendorRequest): Promise<void> {
    await this.request(`/api/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vendor),
    });
  }

  async deleteVendor(id: number): Promise<void> {
    await this.request(`/api/vendors/${id}`, {
      method: 'DELETE',
    });
  }

  // Upload Sessions API
  async getUploadSessions(params?: UploadSessionQueryParams): Promise<UploadSessionResponse> {
    const queryParams = new URLSearchParams();
    if (params?.dataType) queryParams.append('dataType', params.dataType);
    if (params?.status) queryParams.append('status', params.status);

    return this.request<UploadSessionResponse>(`/api/upload-sessions?${queryParams.toString()}`);
  }

  async createUploadSession(session: CreateUploadSessionRequest): Promise<void> {
    await this.request('/api/upload-sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  async updateUploadSession(id: string, session: UpdateUploadSessionRequest): Promise<void> {
    await this.request(`/api/upload-sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(session),
    });
  }

  async deleteUploadSession(id: string): Promise<void> {
    await this.request(`/api/upload-sessions/${id}`, {
      method: 'DELETE',
    });
  }
}
```

#### 3.2 Context Adaptation

**New MySQL Context:**
```typescript
// src/contexts/MySQLDataContext.tsx
export const MySQLDataContext = createContext<MySQLDataContextType | null>(null);

export const MySQLDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiClient = useMemo(() => new MySQLAPIClient(API_BASE_URL), []);

  // Load tickets
  const loadTickets = useCallback(async (params?: TicketQueryParams) => {
    try {
      setLoading(true);
      const response = await apiClient.getTickets(params);
      setTickets(response.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Load incidents
  const loadIncidents = useCallback(async (params?: IncidentQueryParams) => {
    try {
      setLoading(true);
      const response = await apiClient.getIncidents(params);
      setIncidents(response.incidents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Load customers
  const loadCustomers = useCallback(async (params?: CustomerQueryParams) => {
    try {
      setLoading(true);
      const response = await apiClient.getCustomers(params);
      setCustomers(response.customers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Load vendors
  const loadVendors = useCallback(async (params?: VendorQueryParams) => {
    try {
      setLoading(true);
      const response = await apiClient.getVendors(params);
      setVendors(response.vendors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Load upload sessions
  const loadUploadSessions = useCallback(async (params?: UploadSessionQueryParams) => {
    try {
      setLoading(true);
      const response = await apiClient.getUploadSessions(params);
      setUploadSessions(response.uploadSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load upload sessions');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Create ticket
  const createTicket = useCallback(async (ticket: CreateTicketRequest) => {
    try {
      await apiClient.createTicket(ticket);
      await loadTickets(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    }
  }, [apiClient, loadTickets]);

  // Bulk insert tickets
  const bulkInsertTickets = useCallback(async (tickets: CreateTicketRequest[]) => {
    try {
      await apiClient.bulkInsertTickets(tickets);
      await loadTickets(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk insert tickets');
    }
  }, [apiClient, loadTickets]);

  // Create incident
  const createIncident = useCallback(async (incident: CreateIncidentRequest) => {
    try {
      await apiClient.createIncident(incident);
      await loadIncidents(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create incident');
    }
  }, [apiClient, loadIncidents]);

  // Bulk insert incidents
  const bulkInsertIncidents = useCallback(async (incidents: CreateIncidentRequest[]) => {
    try {
      await apiClient.bulkInsertIncidents(incidents);
      await loadIncidents(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk insert incidents');
    }
  }, [apiClient, loadIncidents]);

  // Create customer
  const createCustomer = useCallback(async (customer: CreateCustomerRequest) => {
    try {
      await apiClient.createCustomer(customer);
      await loadCustomers(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    }
  }, [apiClient, loadCustomers]);

  // Bulk insert customers
  const bulkInsertCustomers = useCallback(async (customers: CreateCustomerRequest[]) => {
    try {
      await apiClient.bulkInsertCustomers(customers);
      await loadCustomers(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk insert customers');
    }
  }, [apiClient, loadCustomers]);

  // Create vendor
  const createVendor = useCallback(async (vendor: CreateVendorRequest) => {
    try {
      await apiClient.createVendor(vendor);
      await loadVendors(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor');
    }
  }, [apiClient, loadVendors]);

  // Update vendor
  const updateVendor = useCallback(async (id: number, vendor: UpdateVendorRequest) => {
    try {
      await apiClient.updateVendor(id, vendor);
      await loadVendors(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
    }
  }, [apiClient, loadVendors]);

  // Delete vendor
  const deleteVendor = useCallback(async (id: number) => {
    try {
      await apiClient.deleteVendor(id);
      await loadVendors(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
    }
  }, [apiClient, loadVendors]);

  // Create upload session
  const createUploadSession = useCallback(async (session: CreateUploadSessionRequest) => {
    try {
      await apiClient.createUploadSession(session);
      await loadUploadSessions(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create upload session');
    }
  }, [apiClient, loadUploadSessions]);

  // Update upload session
  const updateUploadSession = useCallback(async (id: string, session: UpdateUploadSessionRequest) => {
    try {
      await apiClient.updateUploadSession(id, session);
      await loadUploadSessions(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update upload session');
    }
  }, [apiClient, loadUploadSessions]);

  // Delete upload session
  const deleteUploadSession = useCallback(async (id: string) => {
    try {
      await apiClient.deleteUploadSession(id);
      await loadUploadSessions(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete upload session');
    }
  }, [apiClient, loadUploadSessions]);

  const value: MySQLDataContextType = {
    // Data
    tickets,
    incidents,
    customers,
    vendors,
    uploadSessions,
    loading,
    error,
    
    // Actions
    loadTickets,
    loadIncidents,
    loadCustomers,
    loadVendors,
    loadUploadSessions,
    createTicket,
    bulkInsertTickets,
    createIncident,
    bulkInsertIncidents,
    createCustomer,
    bulkInsertCustomers,
    createVendor,
    updateVendor,
    deleteVendor,
    createUploadSession,
    updateUploadSession,
    deleteUploadSession,
  };

  return (
    <MySQLDataContext.Provider value={value}>
      {children}
    </MySQLDataContext.Provider>
  );
};

export const useMySQLData = () => {
  const context = useContext(MySQLDataContext);
  if (!context) {
    throw new Error('useMySQLData must be used within a MySQLDataProvider');
  }
  return context;
};
```

#### 3.3 Component Adaptation

**Updated Components:**
```typescript
// src/components/MySQLDataProvider.tsx
export const MySQLDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MySQLDataProvider>
      <MySQLDataContext>
        {children}
      </MySQLDataContext>
    </MySQLDataProvider>
  );
};

// src/components/MySQLTicketAnalytics.tsx
export const MySQLTicketAnalytics: React.FC = () => {
  const { tickets, loading, error, loadTickets } = useMySQLData();
  const [filters, setFilters] = useState<TicketQueryParams>({});

  useEffect(() => {
    loadTickets(filters);
  }, [loadTickets, filters]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* Ticket analytics UI */}
    </div>
  );
};
```

### Phase 4: Testing & Validation

#### 4.1 Data Integrity Testing

**Test Suite:**
```typescript
// src/__tests__/migration.test.ts
describe('MySQL Migration', () => {
  let migrationService: MigrationService;
  let apiClient: MySQLAPIClient;

  beforeEach(() => {
    migrationService = new MigrationService();
    apiClient = new MySQLAPIClient(API_BASE_URL);
  });

  test('should migrate tickets successfully', async () => {
    const result = await migrationService.migrateTickets();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBeGreaterThan(0);
  });

  test('should migrate incidents successfully', async () => {
    const result = await migrationService.migrateIncidents();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBeGreaterThan(0);
  });

  test('should migrate customers successfully', async () => {
    const result = await migrationService.migrateCustomers();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBeGreaterThan(0);
  });

  test('should migrate vendors successfully', async () => {
    const result = await migrationService.migrateVendors();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBeGreaterThan(0);
  });

  test('should migrate upload sessions successfully', async () => {
    const result = await migrationService.migrateUploadSessions();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBeGreaterThan(0);
  });

  test('should validate migration data integrity', async () => {
    const result = await migrationService.validateMigration();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

#### 4.2 Performance Testing

**Performance Benchmarks:**
```typescript
// src/__tests__/performance.test.ts
describe('MySQL Performance', () => {
  test('should load tickets within acceptable time', async () => {
    const start = performance.now();
    const response = await apiClient.getTickets({ limit: 1000 });
    const end = performance.now();
    
    expect(end - start).toBeLessThan(2000); // 2 seconds
    expect(response.tickets).toHaveLength(1000);
  });

  test('should bulk insert tickets efficiently', async () => {
    const tickets = generateMockTickets(1000);
    const start = performance.now();
    await apiClient.bulkInsertTickets(tickets);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(5000); // 5 seconds
  });
});
```

### Phase 5: Production Deployment

#### 5.1 Deployment Strategy

**Blue-Green Deployment:**
1. **Blue Environment**: Current IndexedDB system
2. **Green Environment**: New MySQL system
3. **Switch**: Gradual traffic migration
4. **Rollback**: Instant rollback capability

#### 5.2 Monitoring & Alerting

**Key Metrics:**
- Database connection pool usage
- API response times
- Error rates
- Data synchronization status
- User experience metrics

#### 5.3 Rollback Plan

**Rollback Triggers:**
- High error rates (>5%)
- Performance degradation (>50%)
- Data integrity issues
- User complaints

**Rollback Process:**
1. Switch traffic back to IndexedDB
2. Validate data integrity
3. Notify stakeholders
4. Investigate issues
5. Plan remediation

## Migration Timeline

### Week 1-2: Preparation
- Database schema creation
- API endpoint development
- Migration script development
- Testing environment setup

### Week 3-4: Development
- Frontend API client implementation
- Context adaptation
- Component updates
- Unit testing

### Week 5-6: Testing
- Integration testing
- Performance testing
- Data integrity validation
- User acceptance testing

### Week 7-8: Deployment
- Staging deployment
- Production deployment
- Monitoring setup
- Go-live

## Risk Assessment

### High Risk
- **Data Loss**: Mitigation through comprehensive backups
- **Performance Issues**: Mitigation through load testing
- **User Experience**: Mitigation through gradual rollout

### Medium Risk
- **API Compatibility**: Mitigation through thorough testing
- **Authentication Issues**: Mitigation through session management
- **Data Synchronization**: Mitigation through validation scripts

### Low Risk
- **UI Changes**: Mitigation through component updates
- **Configuration**: Mitigation through environment management

## Success Criteria

### Technical
- ✅ All data migrated successfully
- ✅ API response times < 2 seconds
- ✅ Error rates < 1%
- ✅ Data integrity maintained

### Business
- ✅ Zero data loss
- ✅ Minimal user disruption
- ✅ Improved performance
- ✅ Enhanced scalability

## Conclusion

The MySQL migration strategy provides a comprehensive approach to transitioning from IndexedDB to MySQL while maintaining data integrity and user experience. The phased approach ensures minimal risk and allows for thorough testing at each stage.

**Key Benefits:**
- **Scalability**: MySQL can handle larger datasets
- **Performance**: Better query performance and indexing
- **Reliability**: Server-side data persistence
- **Security**: Enhanced security with server-side validation
- **Backup**: Automated backup and recovery

**Next Steps:**
1. Review and approve migration plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Establish monitoring and alerting
5. Execute migration timeline

The migration will significantly improve the application's scalability, performance, and reliability while maintaining the current user experience.
