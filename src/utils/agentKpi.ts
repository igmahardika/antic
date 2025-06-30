/**
 * Utilities for agent KPI calculation and ranking.
 * All functions are pure and client-side only.
 */

export interface Ticket {
  ticket_id: string;
  WaktuOpen: Date | string;
  WaktuCloseTicket?: Date | string;
  ClosePenanganan?: Date | string;
  Penanganan2?: string;
  OpenBy: string;
  // ...
}

export interface AgentMetric {
  agent: string;
  frt: number;
  art: number;
  fcr: number;
  sla: number;
  vol: number;
  backlog: number;
  score: number;
  rank: 'A' | 'B' | 'C' | 'D';
}

/**
 * Drop rows with invalid/negative timestamps, cast all date strings to Date.
 */
export function sanitizeTickets(tickets: Ticket[]): Ticket[] {
  return tickets.filter(t => {
    const open = new Date(t.WaktuOpen);
    if (isNaN(open.getTime())) return false;
    if (t.WaktuCloseTicket && isNaN(new Date(t.WaktuCloseTicket).getTime())) return false;
    if (t.ClosePenanganan && isNaN(new Date(t.ClosePenanganan).getTime())) return false;
    if (t.WaktuCloseTicket && new Date(t.WaktuCloseTicket).getTime() < open.getTime()) return false;
    if (t.ClosePenanganan && new Date(t.ClosePenanganan).getTime() < open.getTime()) return false;
    return true;
  }).map(t => ({
    ...t,
    WaktuOpen: new Date(t.WaktuOpen),
    WaktuCloseTicket: t.WaktuCloseTicket ? new Date(t.WaktuCloseTicket) : undefined,
    ClosePenanganan: t.ClosePenanganan ? new Date(t.ClosePenanganan) : undefined,
  }));
}

/**
 * Group tickets by agent (OpenBy).
 */
export function groupByAgent(tickets: Ticket[]): Record<string, Ticket[]> {
  return tickets.reduce((acc, t) => {
    const agent = t.OpenBy || 'Unknown';
    if (!acc[agent]) acc[agent] = [];
    acc[agent].push(t);
    return acc;
  }, {} as Record<string, Ticket[]>);
}

/**
 * Calculate metrics for a single agent's tickets.
 */
export function calcMetrics(agentTickets: Ticket[]): AgentMetric {
  const agent = agentTickets[0]?.OpenBy || 'Unknown';
  const vol = agentTickets.length;
  const backlog = agentTickets.filter(t => !t.WaktuCloseTicket).length;
  let frtSum = 0, artSum = 0, frtCount = 0, artCount = 0, fcrCount = 0, slaCount = 0;
  agentTickets.forEach(t => {
    const open = t.WaktuOpen instanceof Date ? t.WaktuOpen : new Date(t.WaktuOpen);
    const close = t.WaktuCloseTicket ? (t.WaktuCloseTicket instanceof Date ? t.WaktuCloseTicket : new Date(t.WaktuCloseTicket)) : undefined;
    const closePen = t.ClosePenanganan ? (t.ClosePenanganan instanceof Date ? t.ClosePenanganan : new Date(t.ClosePenanganan)) : undefined;
    // FRT: ClosePenanganan - WaktuOpen (minutes)
    if (closePen && open && closePen.getTime() >= open.getTime()) {
      frtSum += (closePen.getTime() - open.getTime()) / 60000;
      frtCount++;
    }
    // ART: WaktuCloseTicket - WaktuOpen (minutes)
    if (close && open && close.getTime() >= open.getTime()) {
      artSum += (close.getTime() - open.getTime()) / 60000;
      artCount++;
    }
    // FCR: only 1 handling step (Penanganan2 is empty/null/undefined)
    if (!t.Penanganan2) fcrCount++;
    // SLA: ART <= 1440 min (24 hours)
    if (close && open && (close.getTime() - open.getTime()) / 60000 <= 1440) slaCount++;
  });
  const frt = frtCount ? frtSum / frtCount : 0;
  const art = artCount ? artSum / artCount : 0;
  const fcr = vol ? (fcrCount / vol) * 100 : 0;
  const sla = vol ? (slaCount / vol) * 100 : 0;
  const score = scoreAgent({ frt, art, fcr, sla, vol, backlog });
  const rankVal = rank(score);
  return { agent, frt, art, fcr, sla, vol, backlog, score, rank: rankVal };
}

/**
 * Normalize and score agent metrics (0-100, higher is better).
 * Weights: { frt:0.25, art:0.20, fcr:0.20, sla:0.15, vol:0.10, backlog:0.10 }
 * Lower frt/art = better (inverted).
 */
export function scoreAgent(m: Pick<AgentMetric, 'frt'|'art'|'fcr'|'sla'|'vol'|'backlog'>): number {
  // Normalization bounds (can be tuned)
  const frtNorm = m.frt <= 0 ? 100 : Math.max(0, 100 - Math.min(100, m.frt / 4)); // 0 min = 100, 400 min = 0
  const artNorm = m.art <= 0 ? 100 : Math.max(0, 100 - Math.min(100, m.art / 4)); // 0 min = 100, 400 min = 0
  const fcrNorm = Math.max(0, Math.min(100, m.fcr));
  const slaNorm = Math.max(0, Math.min(100, m.sla));
  const volNorm = Math.max(0, Math.min(100, (m.vol / 100) * 100)); // 100+ tickets = 100
  const backlogNorm = m.backlog === 0 ? 100 : Math.max(0, 100 - Math.min(100, (m.backlog / 10) * 100)); // 0 backlog = 100, 10+ = 0
  return (
    frtNorm * 0.25 +
    artNorm * 0.20 +
    fcrNorm * 0.20 +
    slaNorm * 0.15 +
    volNorm * 0.10 +
    backlogNorm * 0.10
  ) / 1.0;
}

/**
 * Rank score: ≥60 A, 50–59 B, 40–49 C, else D
 */
export function rank(score: number): 'A'|'B'|'C'|'D' {
  if (score >= 60) return 'A';
  if (score >= 50) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

/**
 * Calculate metrics for all agents.
 */
export function calcAllMetrics(tickets: Ticket[]): AgentMetric[] {
  const grouped = groupByAgent(tickets);
  return Object.values(grouped).map(calcMetrics);
} 