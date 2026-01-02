import { describe, test, expect } from 'vitest';

interface Ticket {
  customerId?: string;
  name?: string;
  description?: string;
  cause?: string;
  handling?: string;
  handlingDuration?: {
    rawHours: number;
  };
}

interface CustomerSummary {
  name: string;
  ticketCount?: number;
  totalHandlingDuration?: number;
  customerId?: string;
  tickets?: Ticket[];
}

// Test for risk classification
describe('Risk Classification', () => {
  test('classifies customer risk correctly', () => {
    const RISK_THRESHOLDS = {
      PERSISTENT: 3,
      CHRONIC: 10,
      EXTREME: 18
    } as const;

    const getRiskClassification = (ticketCount: number): string => {
      if (ticketCount >= RISK_THRESHOLDS.EXTREME) return 'Ekstrem';
      if (ticketCount >= RISK_THRESHOLDS.CHRONIC) return 'Kronis';
      if (ticketCount >= RISK_THRESHOLDS.PERSISTENT) return 'Persisten';
      return 'Normal';
    };

    expect(getRiskClassification(1)).toBe('Normal');
    expect(getRiskClassification(3)).toBe('Persisten');
    expect(getRiskClassification(10)).toBe('Kronis');
    expect(getRiskClassification(18)).toBe('Ekstrem');
    expect(getRiskClassification(25)).toBe('Ekstrem');
  });

  test('handles edge cases in risk classification', () => {
    const getRiskClassification = (ticketCount: number): string => {
      const RISK_THRESHOLDS = {
        PERSISTENT: 3,
        CHRONIC: 10,
        EXTREME: 18
      } as const;

      if (ticketCount >= RISK_THRESHOLDS.EXTREME) return 'Ekstrem';
      if (ticketCount >= RISK_THRESHOLDS.CHRONIC) return 'Kronis';
      if (ticketCount >= RISK_THRESHOLDS.PERSISTENT) return 'Persisten';
      return 'Normal';
    };

    expect(getRiskClassification(0)).toBe('Normal');
    expect(getRiskClassification(-1)).toBe('Normal');
    expect(getRiskClassification(2.9)).toBe('Normal');
    expect(getRiskClassification(3.1)).toBe('Persisten');
  });
});

// Test for customer data aggregation
describe('Customer Data Aggregation', () => {
  test('aggregates customer ticket data correctly', () => {
    const aggregateCustomerData = (tickets: Ticket[]) => {
      const customerMap: Record<string, any> = {};

      tickets.forEach(ticket => {
        const customerId = ticket.customerId || 'Unknown Customer';
        if (customerId === 'Unknown Customer') return;

        if (!customerMap[customerId]) {
          customerMap[customerId] = {
            name: ticket.name,
            customerId: customerId,
            tickets: [],
            totalHandlingDuration: 0,
            descriptions: [],
            causes: [],
            handlings: []
          };
        }

        customerMap[customerId].tickets.push(ticket);
        customerMap[customerId].totalHandlingDuration += ticket.handlingDuration?.rawHours || 0;
        customerMap[customerId].descriptions.push(ticket.description);
        customerMap[customerId].causes.push(ticket.cause);
        customerMap[customerId].handlings.push(ticket.handling);
      });

      return Object.values(customerMap);
    };

    const tickets = [
      {
        customerId: 'CUST001',
        name: 'Customer A',
        description: 'Network issue',
        cause: 'Hardware failure',
        handling: 'Replaced router',
        handlingDuration: { rawHours: 2.5 }
      },
      {
        customerId: 'CUST001',
        name: 'Customer A',
        description: 'Slow internet',
        cause: 'Configuration issue',
        handling: 'Updated settings',
        handlingDuration: { rawHours: 1.0 }
      },
      {
        customerId: 'CUST002',
        name: 'Customer B',
        description: 'Login problem',
        cause: 'Password issue',
        handling: 'Reset password',
        handlingDuration: { rawHours: 0.5 }
      }
    ];

    const result = aggregateCustomerData(tickets);

    expect(result).toHaveLength(2);
    expect(result[0].customerId).toBe('CUST001');
    expect(result[0].tickets).toHaveLength(2);
    expect(result[0].totalHandlingDuration).toBe(3.5);
    expect(result[0].descriptions).toHaveLength(2);
  });
});

// Test for keyword analysis
describe('Keyword Analysis', () => {
  test('analyzes keywords from customer data', () => {
    const analyzeKeywords = (texts: string[], limit = 10) => {
      const wordCount: Record<string, number> = {};

      texts.forEach(text => {
        if (!text) return;

        const words = text.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 2);

        words.forEach(word => {
          wordCount[word] = (wordCount[word] || 0) + 1;
        });
      });

      return Object.entries(wordCount)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, limit);
    };

    const descriptions = [
      'Network connection is slow and unstable',
      'Network issue with internet connectivity',
      'Slow network performance affecting work',
      'Internet connection problem with router'
    ];

    const result = analyzeKeywords(descriptions, 5);

    expect(result.length).toBeLessThanOrEqual(5);
    expect(result[0][0]).toBe('network');
    expect(result[0][1]).toBe(3);
  });
});

// Test for customer sorting
describe('Customer Sorting', () => {
  test('sorts customers by ticket count', () => {
    const sortCustomersByTicketCount = (customers: CustomerSummary[]) => {
      return customers.sort((a, b) => (b.ticketCount || 0) - (a.ticketCount || 0));
    };

    const customers = [
      { name: 'Customer A', ticketCount: 5 },
      { name: 'Customer B', ticketCount: 10 },
      { name: 'Customer C', ticketCount: 3 }
    ];

    const result = sortCustomersByTicketCount(customers);

    expect(result[0].name).toBe('Customer B');
    expect(result[0].ticketCount).toBe(10);
    expect(result[2].name).toBe('Customer C');
    expect(result[2].ticketCount).toBe(3);
  });

  test('sorts customers by total duration', () => {
    const sortCustomersByDuration = (customers: CustomerSummary[]) => {
      return customers.sort((a, b) => (b.totalHandlingDuration || 0) - (a.totalHandlingDuration || 0));
    };

    const customers = [
      { name: 'Customer A', totalHandlingDuration: 5.5 },
      { name: 'Customer B', totalHandlingDuration: 12.0 },
      { name: 'Customer C', totalHandlingDuration: 3.2 }
    ];

    const result = sortCustomersByDuration(customers);

    expect(result[0].name).toBe('Customer B');
    expect(result[0].totalHandlingDuration).toBe(12.0);
    expect(result[2].name).toBe('Customer C');
    expect(result[2].totalHandlingDuration).toBe(3.2);
  });
});

// Test for data validation
describe('Data Validation', () => {
  test('validates customer data structure', () => {
    const validateCustomerData = (customer: unknown): boolean => {
      if (!customer || typeof customer !== 'object') return false;
      const c = customer as CustomerSummary;
      return !!(
        c.customerId &&
        c.name &&
        Array.isArray(c.tickets) &&
        typeof c.totalHandlingDuration === 'number'
      );
    };

    const validCustomer = {
      customerId: 'CUST001',
      name: 'Customer A',
      tickets: [],
      totalHandlingDuration: 5.5
    };

    const invalidCustomer = {
      customerId: 'CUST002',
      name: 'Customer B',
      tickets: null,
      totalHandlingDuration: 'invalid'
    };

    expect(validateCustomerData(validCustomer)).toBe(true);
    expect(validateCustomerData(invalidCustomer)).toBe(false);
    expect(validateCustomerData(null)).toBe(false);
    expect(validateCustomerData(undefined)).toBe(false);
  });
});

// Test for pagination with large datasets
describe('Pagination for Large Datasets', () => {
  test('implements pagination for customer data', () => {
    const paginateCustomers = (customers: CustomerSummary[], pageSize: number, currentPage: number) => {
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedCustomers = customers.slice(startIndex, endIndex);

      return {
        customers: paginatedCustomers,
        totalPages: Math.ceil(customers.length / pageSize),
        currentPage,
        hasNextPage: currentPage < Math.ceil(customers.length / pageSize),
        hasPrevPage: currentPage > 1
      };
    };

    const customers = Array.from({ length: 100 }, (_, i) => ({
      customerId: `CUST${i.toString().padStart(3, '0')}`,
      name: `Customer ${i}`,
      ticketCount: Math.floor(Math.random() * 20)
    }));

    const result = paginateCustomers(customers, 10, 3);

    expect(result.customers).toHaveLength(10);
    expect(result.totalPages).toBe(10);
    expect(result.currentPage).toBe(3);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(true);
  });
});
