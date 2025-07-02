import { create } from 'zustand';
import { AgentMetric, Ticket, sanitizeTickets, calcAllMetrics } from '@/utils/agentKpi';

interface AgentStore {
  tickets: Ticket[];
  agentMetrics: AgentMetric[];
  setTickets: (tickets: Ticket[]) => void;
  setAgentMetrics: (tickets: Ticket[]) => void;
}

// Fungsi mapping field tiket agar sesuai agentKpi
function mapTicketFieldsForAgentKpi(ticket) {
  let status = ticket.status || ticket.STATUS;
  if (typeof status === 'string') {
    const s = status.trim().toLowerCase();
    if (s === 'close ticket' || s === 'closed') status = 'Closed';
    else if (s === 'open ticket' || s === 'open') status = 'Open';
  }
  const WaktuOpen = ticket['OPEN TIME'] || ticket.openTime;
  const WaktuCloseTicket = ticket['CLOSE TIME'] || ticket.closeTime;
  const ClosePenanganan =
    ticket['CLOSE PENANGANAN'] ||
    ticket.closeHandling ||
    ticket['CLOSE PENANGANAN 1'] ||
    ticket.closeHandling1;
  const Penanganan2 =
    ticket['PENANGANAN 2'] ||
    ticket.Penanganan2 ||
    ticket['CLOSE PENANGANAN 2'] ||
    ticket.closeHandling2;
  const OpenBy = ticket['OPEN BY'] || ticket.openBy;

  const mapped = {
    ...ticket,
    WaktuOpen,
    WaktuCloseTicket,
    ClosePenanganan,
    Penanganan2,
    OpenBy,
    status,
  };
  // Debug: log satu tiket hasil mapping
  if (typeof window !== 'undefined' && window && !(window as any).__agentKpiDebugged) {
    console.log('Mapped ticket for agentKpi:', mapped);
    (window as any).__agentKpiDebugged = true;
  }
  return mapped;
}

export const useAgentStore = create<AgentStore>((set) => ({
  tickets: [],
  agentMetrics: [],
  setTickets: (tickets) => {
    set({ tickets });
    set({ agentMetrics: calcAllMetrics(sanitizeTickets(tickets.map(mapTicketFieldsForAgentKpi))) });
  },
  setAgentMetrics: (tickets) => {
    set({ agentMetrics: calcAllMetrics(sanitizeTickets(tickets.map(mapTicketFieldsForAgentKpi))) });
  },
})); 