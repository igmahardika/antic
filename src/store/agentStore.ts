import { create } from 'zustand';
import { AgentMetric, Ticket, sanitizeTickets, calcAllMetrics } from '@/utils/agentKpi';

interface AgentStore {
  tickets: Ticket[];
  agentMetrics: AgentMetric[];
  setTickets: (tickets: Ticket[]) => void;
  setAgentMetrics: (tickets: Ticket[]) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  tickets: [],
  agentMetrics: [],
  setTickets: (tickets) => {
    set({ tickets });
    set({ agentMetrics: calcAllMetrics(sanitizeTickets(tickets)) });
  },
  setAgentMetrics: (tickets) => {
    set({ agentMetrics: calcAllMetrics(sanitizeTickets(tickets)) });
  },
})); 