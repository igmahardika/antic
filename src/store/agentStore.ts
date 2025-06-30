import { create } from 'zustand';
import { ITicket } from '@/lib/db';
import { calculateAgentKpis } from '@/utils/agentKpi';

export interface AgentMetric {
    vol: number;
    frt: number;
    art: number;
    fcr: number;
    sla: number;
    score: number;
}

export interface AgentKpi {
    agent: string;
    metric: AgentMetric;
    trends: {
        frt: number[];
        art: number[];
    };
}

interface AgentStoreState {
    agentKpis: AgentKpi[];
    calculateKpis: (tickets: ITicket[]) => void;
}

const useAgentStore = create<AgentStoreState>((set) => ({
    agentKpis: [],
    calculateKpis: (tickets) => {
        const kpis = calculateAgentKpis(tickets);
        set({ agentKpis: kpis });
    },
}));

export default useAgentStore; 