import type { CustomerOption } from '@/types/escalation';
import { db } from '@/lib/db';

// Get the last 2 months in YYYY-MM format
function getLastTwoMonths(): string[] {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
  
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = lastMonth.toISOString().slice(0, 7);
  
  return [lastMonthStr, currentMonth];
}

// Fetch customers from IndexedDB (optimized to only load last 2 months)
export async function fetchCustomers(): Promise<CustomerOption[]> {
  try {
    // Get last 2 months
    const lastTwoMonths = getLastTwoMonths();
    
    // Get all customers from IndexedDB
    const allCustomers = await db.customers.toArray();
    
    // Filter customers from last 2 months only
    const recentCustomers = allCustomers.filter(customer => {
      const month = (customer.id || '').split('-')[0];
      return lastTwoMonths.includes(month);
    });
    
    // Get unique customers by name (in case same customer appears in multiple months)
    const uniqueCustomers = new Map<string, CustomerOption>();
    recentCustomers.forEach(customer => {
      if (!uniqueCustomers.has(customer.nama)) {
        uniqueCustomers.set(customer.nama, {
          id: customer.id,
          name: customer.nama
        });
      }
    });
    
    // Convert Map to Array and sort by name
    const result = Array.from(uniqueCustomers.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    console.log(`Loaded ${result.length} unique customers from last 2 months (${lastTwoMonths.join(', ')})`);
    
    return result;
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
