import {
  sanitizeTickets,
  groupByAgent,
  calcMetrics,
  scoreAgent,
  rank,
  calcAllMetrics,
  Ticket
} from './agentKpi';

describe('agentKpi utilities', () => {
  const raw: Ticket[] = [
    { ticket_id: '1', WaktuOpen: '2024-01-01T08:00:00Z', WaktuCloseTicket: '2024-01-01T09:00:00Z', ClosePenanganan: '2024-01-01T08:10:00Z', OpenBy: 'Alice' },
    { ticket_id: '2', WaktuOpen: '2024-01-01T10:00:00Z', WaktuCloseTicket: '2024-01-01T12:00:00Z', ClosePenanganan: '2024-01-01T10:20:00Z', OpenBy: 'Alice', Penanganan2: 'step2' },
    { ticket_id: '3', WaktuOpen: '2024-01-02T08:00:00Z', WaktuCloseTicket: '2024-01-02T09:00:00Z', ClosePenanganan: '2024-01-02T08:05:00Z', OpenBy: 'Bob' },
    { ticket_id: '4', WaktuOpen: 'invalid', WaktuCloseTicket: '2024-01-02T09:00:00Z', ClosePenanganan: '2024-01-02T08:05:00Z', OpenBy: 'Bob' }, // invalid
    { ticket_id: '5', WaktuOpen: '2024-01-03T08:00:00Z', WaktuCloseTicket: '2024-01-03T07:00:00Z', ClosePenanganan: '2024-01-03T08:05:00Z', OpenBy: 'Bob' }, // negative close
    { ticket_id: '6', WaktuOpen: '2024-01-03T08:00:00Z', OpenBy: 'Bob' }, // open ticket
  ];

  it('sanitizeTickets drops invalid/negative and casts dates', () => {
    const clean = sanitizeTickets(raw);
    expect(clean.length).toBe(4);
    expect(clean.every(t => t.WaktuOpen instanceof Date)).toBe(true);
  });

  it('groupByAgent groups by OpenBy', () => {
    const clean = sanitizeTickets(raw);
    const grouped = groupByAgent(clean);
    expect(Object.keys(grouped)).toContain('Alice');
    expect(Object.keys(grouped)).toContain('Bob');
    expect(grouped['Alice'].length).toBe(2);
    expect(grouped['Bob'].length).toBe(2);
  });

  it('calcMetrics computes correct metrics', () => {
    const clean = sanitizeTickets(raw);
    const grouped = groupByAgent(clean);
    const alice = calcMetrics(grouped['Alice']);
    expect(alice.agent).toBe('Alice');
    expect(alice.vol).toBe(2);
    expect(alice.backlog).toBe(0);
    expect(alice.fcr).toBeCloseTo(50, 1); // 1/2 tickets only 1 step
    expect(alice.sla).toBe(100);
    expect(alice.rank).toMatch(/[ABCD]/);
  });

  it('scoreAgent and rank work as expected', () => {
    const score = scoreAgent({ frt: 10, art: 20, fcr: 100, sla: 100, vol: 10, backlog: 0 });
    expect(typeof score).toBe('number');
    expect(['A', 'B', 'C', 'D']).toContain(rank(score));
  });

  it('calcAllMetrics returns all agents', () => {
    const clean = sanitizeTickets(raw);
    const all = calcAllMetrics(clean);
    expect(all.length).toBe(2);
    expect(all[0]).toHaveProperty('agent');
    expect(all[0]).toHaveProperty('score');
    expect(['A', 'B', 'C', 'D']).toContain(all[0].rank);
  });
}); 