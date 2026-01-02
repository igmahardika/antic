import { describe, test, expect } from 'vitest';

interface Ticket {
  status?: string;
  closeTime?: string | null;
  openTime?: string;
  category?: string | null;
}

// Test for ticket status determination
describe('Ticket Status Logic', () => {
  test('determines open tickets correctly', () => {
    const isOpenTicket = (ticket: Ticket): boolean => {
      const status = (ticket.status || '').trim().toLowerCase();
      return status === 'open ticket' || status === 'open' || !ticket.closeTime;
    };

    const openTicket = {
      status: 'Open Ticket',
      closeTime: null
    };

    const closedTicket = {
      status: 'Closed',
      closeTime: '2024-01-01'
    };

    const ticketWithoutStatus = {
      status: '',
      closeTime: null
    };

    expect(isOpenTicket(openTicket)).toBe(true);
    expect(isOpenTicket(closedTicket)).toBe(false);
    expect(isOpenTicket(ticketWithoutStatus)).toBe(true);
  });

  test('determines closed tickets correctly', () => {
    const isClosedTicket = (ticket: Ticket): boolean => {
      const status = (ticket.status || '').trim().toLowerCase();
      return status === 'closed' || status === 'close ticket' || status === 'close';
    };

    const closedTicket = {
      status: 'Closed'
    };

    const openTicket = {
      status: 'Open Ticket'
    };

    const closeTicketStatus = {
      status: 'Close Ticket'
    };

    expect(isClosedTicket(closedTicket)).toBe(true);
    expect(isClosedTicket(openTicket)).toBe(false);
    expect(isClosedTicket(closeTicketStatus)).toBe(true);
  });
});

// Test for resolution rate calculation
describe('Resolution Rate Calculation', () => {
  test('calculates resolution rate correctly', () => {
    const calculateResolutionRate = (closedTickets: number, totalTickets: number): number => {
      if (totalTickets === 0) return 0;
      return (closedTickets / totalTickets) * 100;
    };

    expect(calculateResolutionRate(80, 100)).toBe(80);
    expect(calculateResolutionRate(0, 100)).toBe(0);
    expect(calculateResolutionRate(100, 100)).toBe(100);
    expect(calculateResolutionRate(50, 0)).toBe(0);
  });

  test('handles edge cases in resolution rate', () => {
    const calculateResolutionRate = (closedTickets: number, totalTickets: number): number => {
      if (totalTickets === 0) return 0;
      return (closedTickets / totalTickets) * 100;
    };

    // More closed than total (should not happen but test edge case)
    expect(calculateResolutionRate(150, 100)).toBe(150);

    // Negative values
    expect(calculateResolutionRate(-10, 100)).toBe(-10);
    expect(calculateResolutionRate(50, -100)).toBe(-50);
  });
});

// Test for monthly statistics calculation
describe('Monthly Statistics', () => {
  test('calculates monthly ticket counts correctly', () => {
    const calculateMonthlyStats = (tickets: Ticket[]) => {
      const monthlyStats: Record<string, { incoming: number; closed: number }> = {};

      tickets.forEach(ticket => {
        if (!ticket.openTime) return;

        const date = new Date(ticket.openTime);
        if (isNaN(date.getTime())) return;

        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyStats[monthYear]) {
          monthlyStats[monthYear] = { incoming: 0, closed: 0 };
        }

        monthlyStats[monthYear].incoming++;

        if (ticket.status === 'Closed') {
          monthlyStats[monthYear].closed++;
        }
      });

      return monthlyStats;
    };

    const tickets = [
      { openTime: '2024-01-01', status: 'Closed' },
      { openTime: '2024-01-15', status: 'Open' },
      { openTime: '2024-02-01', status: 'Closed' },
      { openTime: '2024-02-15', status: 'Closed' }
    ];

    const result = calculateMonthlyStats(tickets);

    expect(result['2024-01'].incoming).toBe(2);
    expect(result['2024-01'].closed).toBe(1);
    expect(result['2024-02'].incoming).toBe(2);
    expect(result['2024-02'].closed).toBe(2);
  });
});

// Test for complaint categorization
describe('Complaint Categorization', () => {
  test('categorizes complaints correctly', () => {
    const categorizeComplaints = (tickets: Ticket[]) => {
      const complaints: Record<string, number> = {};

      tickets.forEach(ticket => {
        const category = ticket.category || 'Lainnya';
        complaints[category] = (complaints[category] || 0) + 1;
      });

      return complaints;
    };

    const tickets = [
      { category: 'Network' },
      { category: 'Hardware' },
      { category: 'Network' },
      { category: 'Software' },
      { category: null }, // Should default to 'Lainnya'
      { category: 'Hardware' }
    ];

    const result = categorizeComplaints(tickets);

    expect(result['Network']).toBe(2);
    expect(result['Hardware']).toBe(2);
    expect(result['Software']).toBe(1);
    expect(result['Lainnya']).toBe(1);
  });
});

// Test for keyword analysis
describe('Keyword Analysis', () => {
  test('analyzes keywords correctly', () => {
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

    const texts = [
      'Network connection is slow',
      'Network issue with internet',
      'Slow network performance',
      'Internet connection problem'
    ];

    const result = analyzeKeywords(texts, 5);

    expect(result.length).toBeLessThanOrEqual(5);
    expect(result[0][0]).toBe('network');
    expect(result[0][1]).toBe(3);
  });
});

// Test for data validation
describe('Data Validation', () => {
  test('validates ticket data for analytics', () => {
    const validateTicketForAnalytics = (ticket: unknown): boolean => {
      // Basic check for object
      if (!ticket || typeof ticket !== 'object') return false;

      const t = ticket as Ticket;
      return !!(
        t.openTime &&
        typeof t.status === 'string'
      );
    };

    const validTicket = {
      openTime: '2024-01-01',
      status: 'Closed',
      category: 'Network'
    };

    const invalidTicket = {
      openTime: null,
      status: 'Closed'
    };

    expect(validateTicketForAnalytics(validTicket)).toBe(true);
    expect(validateTicketForAnalytics(invalidTicket)).toBe(false);
  });
});
