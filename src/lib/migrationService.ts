// Migration service untuk memindahkan data dari IndexedDB ke MySQL
import { db } from './db';
import { userAPI, menuPermissionAPI } from './api';

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

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export interface MigrationProgress {
  step: string;
  current: number;
  total: number;
  message: string;
}

export class MigrationService {
  private onProgress?: (progress: MigrationProgress) => void;

  constructor(onProgress?: (progress: MigrationProgress) => void) {
    this.onProgress = onProgress;
  }

  private reportProgress(step: string, current: number, total: number, message: string) {
    if (this.onProgress) {
      this.onProgress({ step, current, total, message });
    }
  }

  // Migrate tickets from IndexedDB to MySQL
  async migrateTickets(): Promise<void> {
    try {
      this.reportProgress('tickets', 0, 0, 'Loading tickets from IndexedDB...');
      
      const tickets = await db.tickets.toArray();
      
      if (tickets.length === 0) {
        this.reportProgress('tickets', 0, 0, 'No tickets found in IndexedDB');
        return;
      }

      this.reportProgress('tickets', 0, tickets.length, `Found ${tickets.length} tickets to migrate`);

      // Convert IndexedDB format to MySQL format
      const convertedTickets = tickets.map(ticket => ({
        id: ticket.id,
        customerId: ticket.customerId,
        name: ticket.name,
        category: ticket.category,
        description: ticket.description,
        cause: ticket.cause,
        handling: ticket.handling,
        openTime: ticket.openTime,
        closeTime: ticket.closeTime,
        duration: ticket.duration,
        closeHandling: ticket.closeHandling,
        handlingDuration: ticket.handlingDuration,
        classification: ticket.classification,
        subClassification: ticket.subClassification,
        status: ticket.status,
        handling1: ticket.handling1,
        closeHandling1: ticket.closeHandling1,
        handlingDuration1: ticket.handlingDuration1,
        handling2: ticket.handling2,
        closeHandling2: ticket.closeHandling2,
        handlingDuration2: ticket.handlingDuration2,
        handling3: ticket.handling3,
        closeHandling3: ticket.closeHandling3,
        handlingDuration3: ticket.handlingDuration3,
        handling4: ticket.handling4,
        closeHandling4: ticket.closeHandling4,
        handlingDuration4: ticket.handlingDuration4,
        handling5: ticket.handling5,
        closeHandling5: ticket.closeHandling5,
        handlingDuration5: ticket.handlingDuration5,
        openBy: ticket.openBy,
        cabang: ticket.cabang,
        uploadTimestamp: ticket.uploadTimestamp,
        repClass: ticket.repClass
      }));

      // Send tickets in batches to avoid timeout
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < convertedTickets.length; i += batchSize) {
        batches.push(convertedTickets.slice(i, i + batchSize));
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.reportProgress('tickets', i * batchSize, tickets.length, 
          `Migrating batch ${i + 1}/${batches.length} (${batch.length} tickets)`);
        
        await apiCall('/api/tickets/bulk', {
          method: 'POST',
          body: JSON.stringify({ tickets: batch }),
        });
      }

      this.reportProgress('tickets', tickets.length, tickets.length, 
        `Successfully migrated ${tickets.length} tickets`);

    } catch (error) {
      console.error('Ticket migration error:', error);
      throw new Error(`Failed to migrate tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Migrate customers from IndexedDB to MySQL
  async migrateCustomers(): Promise<void> {
    try {
      this.reportProgress('customers', 0, 0, 'Loading customers from IndexedDB...');
      
      const customers = await db.customers.toArray();
      
      if (customers.length === 0) {
        this.reportProgress('customers', 0, 0, 'No customers found in IndexedDB');
        return;
      }

      this.reportProgress('customers', 0, customers.length, `Found ${customers.length} customers to migrate`);

      // Convert IndexedDB format to MySQL format
      const convertedCustomers = customers.map(customer => ({
        id: customer.id,
        nama: customer.nama,
        jenisKlien: customer.jenisKlien,
        layanan: customer.layanan,
        kategori: customer.kategori
      }));

      // Send customers in batches
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < convertedCustomers.length; i += batchSize) {
        batches.push(convertedCustomers.slice(i, i + batchSize));
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.reportProgress('customers', i * batchSize, customers.length, 
          `Migrating batch ${i + 1}/${batches.length} (${batch.length} customers)`);
        
        await apiCall('/api/customers/bulk', {
          method: 'POST',
          body: JSON.stringify({ customers: batch }),
        });
      }

      this.reportProgress('customers', customers.length, customers.length, 
        `Successfully migrated ${customers.length} customers`);

    } catch (error) {
      console.error('Customer migration error:', error);
      throw new Error(`Failed to migrate customers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Full migration process
  async migrateAll(): Promise<void> {
    try {
      console.log('🚀 Starting full migration from IndexedDB to MySQL...');
      
      // Check if user is authenticated
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please login first.');
      }

      // Migrate customers first (tickets may reference customers)
      await this.migrateCustomers();
      
      // Then migrate tickets
      await this.migrateTickets();
      
      console.log('✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  // Check if migration is needed
  async checkMigrationStatus(): Promise<{
    indexedDbTickets: number;
    indexedDbCustomers: number;
    indexedDbUsers: number;
    needsMigration: boolean;
  }> {
    try {
      const [tickets, customers, users] = await Promise.all([
        db.tickets.count(),
        db.customers.count(),
        db.users.count()
      ]);

      return {
        indexedDbTickets: tickets,
        indexedDbCustomers: customers,
        indexedDbUsers: users,
        needsMigration: tickets > 0 || customers > 0
      };
    } catch (error) {
      console.error('Failed to check migration status:', error);
      return {
        indexedDbTickets: 0,
        indexedDbCustomers: 0,
        indexedDbUsers: 0,
        needsMigration: false
      };
    }
  }
}

export default MigrationService;