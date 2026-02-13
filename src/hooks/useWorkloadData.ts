import { useQuery } from "@tanstack/react-query";
import {
    TimeFilter,
    AgentWorkload,
    TSWorkload,
    aggregateTicketWorkload,
    aggregateIncidentWorkload,
} from "@/utils/workloadUtils";

/**
 * Hook to fetch and aggregate ticket workload data
 */
export function useTicketWorkload(timeFilter: TimeFilter) {
    return useQuery({
        queryKey: ['ticket-workload', timeFilter],
        queryFn: async (): Promise<AgentWorkload[]> => {
            const { cacheService } = await import("@/services/cacheService");
            const tickets = await cacheService.getTickets();
            return aggregateTicketWorkload(tickets, timeFilter);
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}

/**
 * Hook to fetch and aggregate incident workload data
 */
export function useIncidentWorkload(timeFilter: TimeFilter) {
    return useQuery({
        queryKey: ['incident-workload', timeFilter],
        queryFn: async (): Promise<TSWorkload[]> => {
            const { cacheService } = await import("@/services/cacheService");
            const incidents = await cacheService.getIncidents();
            return aggregateIncidentWorkload(incidents, timeFilter);
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });
}
