import { describe, test, expect } from 'vitest';

// Test for date parsing functionality
describe('Date Parsing', () => {
  test('parses dates correctly', () => {
    const parseDateSafe = (dateString: string): Date | null => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    };

    expect(parseDateSafe('2024-01-01')).toBeInstanceOf(Date);
    expect(parseDateSafe('2024/01/01')).toBeInstanceOf(Date);
    expect(parseDateSafe('01/01/2024')).toBeInstanceOf(Date);
    expect(parseDateSafe('invalid-date')).toBeNull();
    expect(parseDateSafe('')).toBeNull();
    expect(parseDateSafe(null as any)).toBeNull();
  });

  test('extracts month and year from date string', () => {
    const parseDateForFilter = (dateString: string) => {
      if (!dateString) return { month: '', year: '' };

      let month = '';
      let year = '';

      try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          month = String(date.getMonth() + 1).padStart(2, '0');
          year = String(date.getFullYear());
          return { month, year };
        }
      } catch (error) {
        // Continue to string parsing
      }

      // Try to extract from string patterns
      const isoMatch = dateString.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
      if (isoMatch) {
        year = isoMatch[1];
        month = isoMatch[2].padStart(2, '0');
        return { month, year };
      }

      return { month, year };
    };

    const result1 = parseDateForFilter('2024-01-15');
    expect(result1.month).toBe('01');
    expect(result1.year).toBe('2024');

    const result2 = parseDateForFilter('2024/12/25');
    expect(result2.month).toBe('12');
    expect(result2.year).toBe('2024');

    const result3 = parseDateForFilter('invalid');
    expect(result3.month).toBe('');
    expect(result3.year).toBe('');
  });
});

// Test for duration validation
describe('Duration Validation', () => {
  test('validates duration correctly', () => {
    const isValidDuration = (duration: number): boolean => {
      return duration > 0 && duration <= 24; // Max 24 hours
    };

    expect(isValidDuration(2.5)).toBe(true);
    expect(isValidDuration(0)).toBe(false);
    expect(isValidDuration(-1)).toBe(false);
    expect(isValidDuration(24)).toBe(true);
    expect(isValidDuration(25)).toBe(false);
  });

  test('gets duration color based on value', () => {
    const getDurationColor = (duration: number): string => {
      if (!duration || duration === 0) return 'text-gray-500';
      if (duration > 24) return 'text-red-500';
      if (duration > 8) return 'text-amber-500';
      return 'text-green-500';
    };

    expect(getDurationColor(0)).toBe('text-gray-500');
    expect(getDurationColor(2)).toBe('text-green-500');
    expect(getDurationColor(10)).toBe('text-amber-500');
    expect(getDurationColor(25)).toBe('text-red-500');
  });
});

// Test for data filtering
describe('Data Filtering', () => {
  test('filters tickets by date range', () => {
    const filterTicketsByDateRange = (tickets: any[], startDate: Date, endDate: Date) => {
      return tickets.filter(ticket => {
        if (!ticket.openTime) return false;
        const ticketDate = new Date(ticket.openTime);
        if (isNaN(ticketDate.getTime())) return false;
        return ticketDate >= startDate && ticketDate <= endDate;
      });
    };

    const tickets = [
      { openTime: '2024-01-01' },
      { openTime: '2024-01-15' },
      { openTime: '2024-02-01' },
      { openTime: '2024-03-01' }
    ];

    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const result = filterTicketsByDateRange(tickets, startDate, endDate);
    expect(result).toHaveLength(2);
  });

  test('filters tickets by status', () => {
    const filterTicketsByStatus = (tickets: any[], status: string) => {
      return tickets.filter(ticket => 
        (ticket.status || '').toLowerCase() === status.toLowerCase()
      );
    };

    const tickets = [
      { status: 'Open' },
      { status: 'Closed' },
      { status: 'Open' },
      { status: 'In Progress' }
    ];

    const openTickets = filterTicketsByStatus(tickets, 'open');
    expect(openTickets).toHaveLength(2);

    const closedTickets = filterTicketsByStatus(tickets, 'closed');
    expect(closedTickets).toHaveLength(1);
  });
});

// Test for pagination
describe('Pagination', () => {
  test('calculates pagination correctly', () => {
    const calculatePagination = (totalItems: number, itemsPerPage: number, currentPage: number) => {
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
      
      return {
        totalPages,
        startIndex,
        endIndex,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      };
    };

    const result = calculatePagination(100, 10, 3);
    
    expect(result.totalPages).toBe(10);
    expect(result.startIndex).toBe(20);
    expect(result.endIndex).toBe(30);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(true);
  });

  test('handles edge cases in pagination', () => {
    const calculatePagination = (totalItems: number, itemsPerPage: number, currentPage: number) => {
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
      
      return {
        totalPages,
        startIndex,
        endIndex,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      };
    };

    // Empty dataset
    const emptyResult = calculatePagination(0, 10, 1);
    expect(emptyResult.totalPages).toBe(0);
    expect(emptyResult.hasNextPage).toBe(false);
    expect(emptyResult.hasPrevPage).toBe(false);

    // Single page
    const singlePageResult = calculatePagination(5, 10, 1);
    expect(singlePageResult.totalPages).toBe(1);
    expect(singlePageResult.hasNextPage).toBe(false);
    expect(singlePageResult.hasPrevPage).toBe(false);
  });
});

// Test for data sorting
describe('Data Sorting', () => {
  test('sorts tickets by date', () => {
    const sortTicketsByDate = (tickets: any[], ascending = true) => {
      return tickets.sort((a, b) => {
        const dateA = new Date(a.openTime);
        const dateB = new Date(b.openTime);
        
        if (ascending) {
          return dateA.getTime() - dateB.getTime();
        } else {
          return dateB.getTime() - dateA.getTime();
        }
      });
    };

    const tickets = [
      { openTime: '2024-01-15' },
      { openTime: '2024-01-01' },
      { openTime: '2024-01-10' }
    ];

    const ascending = sortTicketsByDate(tickets, true);
    expect(ascending[0].openTime).toBe('2024-01-01');
    expect(ascending[2].openTime).toBe('2024-01-15');

    const descending = sortTicketsByDate(tickets, false);
    expect(descending[0].openTime).toBe('2024-01-15');
    expect(descending[2].openTime).toBe('2024-01-01');
  });

  test('sorts tickets by duration', () => {
    const sortTicketsByDuration = (tickets: any[], ascending = true) => {
      return tickets.sort((a, b) => {
        const durationA = a.duration?.rawHours || 0;
        const durationB = b.duration?.rawHours || 0;
        
        if (ascending) {
          return durationA - durationB;
        } else {
          return durationB - durationA;
        }
      });
    };

    const tickets = [
      { duration: { rawHours: 2.5 } },
      { duration: { rawHours: 1.0 } },
      { duration: { rawHours: 3.5 } }
    ];

    const ascending = sortTicketsByDuration(tickets, true);
    expect(ascending[0].duration.rawHours).toBe(1.0);
    expect(ascending[2].duration.rawHours).toBe(3.5);
  });
});
