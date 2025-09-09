import type { CustomerOption } from '@/types/escalation';
import { db } from '@/lib/db';

// Fetch customers from IndexedDB (same data as customer data page)
export async function fetchCustomers(): Promise<CustomerOption[]> {
  try {
    // Get all customers from IndexedDB
    const customers = await db.customers.toArray();
    
    // Transform to CustomerOption format
    return customers.map(customer => ({
      id: customer.id,
      name: customer.nama
    }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    // Fallback to dummy data if IndexedDB fails
    return [
      { id: 'CUST-001', name: 'PT Nusantara Net' },
      { id: 'CUST-002', name: 'CV Sinar Jaya' },
      { id: 'CUST-003', name: 'Universitas Semarang' }
    ];
  }
}
