export interface AgentPerformanceData {
  durations: number[];
  closed: number;
}

export interface AgentAnalyticsRow {
  agentName: string;
  ticketCount: number;
  totalDurationFormatted: string;
  avgDurationFormatted: string;
  minDurationFormatted: string;
  maxDurationFormatted: string;
  closedCount: number;
  closedPercent: string;
  resolutionRate: string;
}

export interface Ticket {
  id: string;
  status?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  severity?: string | null;
  handlingDuration?: { rawHours?: number | null } | null;
}
