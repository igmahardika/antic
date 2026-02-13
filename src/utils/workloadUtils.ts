/**
 * Workload data aggregation utilities
 */

export interface TimeFilter {
    type: 'month-range' | 'year' | 'all-years';
    startMonth?: number;  // 1-12
    endMonth?: number;    // 1-12
    year?: number | 'all';
}

export interface AgentWorkload {
    agentName: string;
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    avgResolutionTime: number; // in minutes
    complexityScore: number;
    utilizationRate: number;
}

export interface TSWorkload {
    tsName: string;
    totalIncidents: number;
    openIncidents: number;
    closedIncidents: number;
    avgHandlingTime: number; // in minutes
    sitesHandled: number;
    incidentTypes: string[];
}

/**
 * Filter data by time period
 */
export function filterByTime<T extends { created?: string; created_at?: string; date?: string }>(
    data: T[],
    filter: TimeFilter
): T[] {
    if (filter.type === 'all-years') {
        return data;
    }

    return data.filter(item => {
        const dateStr = item.created || item.created_at || item.date;
        if (!dateStr) return false;

        const date = new Date(dateStr);
        const itemYear = date.getFullYear();
        const itemMonth = date.getMonth() + 1; // 1-12

        if (filter.type === 'year') {
            return filter.year === 'all' || itemYear === filter.year;
        }

        if (filter.type === 'month-range') {
            if (filter.year && filter.year !== 'all' && itemYear !== filter.year) {
                return false;
            }
            const start = filter.startMonth || 1;
            const end = filter.endMonth || 12;
            return itemMonth >= start && itemMonth <= end;
        }

        return true;
    });
}

/**
 * Aggregate ticket workload per agent
 */
export function aggregateTicketWorkload(
    tickets: any[],
    timeFilter: TimeFilter
): AgentWorkload[] {
    const filtered = filterByTime(tickets, timeFilter);

    const agentMap = new Map<string, {
        total: number;
        open: number;
        closed: number;
        resolutionTimes: number[];
    }>();

    filtered.forEach(ticket => {
        const agent = ticket.agent || ticket.assigned_to || 'Unassigned';

        if (!agentMap.has(agent)) {
            agentMap.set(agent, { total: 0, open: 0, closed: 0, resolutionTimes: [] });
        }

        const stats = agentMap.get(agent)!;
        stats.total++;

        if (ticket.status === 'Open' || ticket.status === 'In Progress') {
            stats.open++;
        } else if (ticket.status === 'Closed' || ticket.status === 'Resolved') {
            stats.closed++;

            // Calculate resolution time if available
            if (ticket.created_at && ticket.updated_at) {
                const created = new Date(ticket.created_at).getTime();
                const resolved = new Date(ticket.updated_at).getTime();
                const resolutionMinutes = (resolved - created) / (1000 * 60);
                stats.resolutionTimes.push(resolutionMinutes);
            }
        }
    });

    return Array.from(agentMap.entries()).map(([agentName, stats]) => {
        const avgResolutionTime = stats.resolutionTimes.length > 0
            ? stats.resolutionTimes.reduce((a, b) => a + b, 0) / stats.resolutionTimes.length
            : 0;

        return {
            agentName,
            totalTickets: stats.total,
            openTickets: stats.open,
            closedTickets: stats.closed,
            avgResolutionTime,
            complexityScore: 0, // Placeholder, will be calculated later
            utilizationRate: stats.total > 0 ? (stats.closed / stats.total) * 100 : 0,
        };
    }).sort((a, b) => b.totalTickets - a.totalTickets);
}

/**
 * Aggregate incident workload per TS
 */
export function aggregateIncidentWorkload(
    incidents: any[],
    timeFilter: TimeFilter
): TSWorkload[] {
    const filtered = filterByTime(incidents, timeFilter);

    const tsMap = new Map<string, {
        total: number;
        open: number;
        closed: number;
        handlingTimes: number[];
        sites: Set<string>;
        types: Set<string>;
    }>();

    filtered.forEach(incident => {
        const ts = incident.technical_support || incident.ts_name || 'Unassigned';

        if (!tsMap.has(ts)) {
            tsMap.set(ts, {
                total: 0,
                open: 0,
                closed: 0,
                handlingTimes: [],
                sites: new Set(),
                types: new Set(),
            });
        }

        const stats = tsMap.get(ts)!;
        stats.total++;

        if (incident.site) stats.sites.add(incident.site);
        if (incident.incident_type) stats.types.add(incident.incident_type);

        if (incident.status === 'Open' || incident.status === 'In Progress') {
            stats.open++;
        } else if (incident.status === 'Closed' || incident.status === 'Resolved') {
            stats.closed++;

            // Calculate handling time
            if (incident.incident_start && incident.incident_end) {
                const start = new Date(incident.incident_start).getTime();
                const end = new Date(incident.incident_end).getTime();
                const handlingMinutes = (end - start) / (1000 * 60);
                stats.handlingTimes.push(handlingMinutes);
            }
        }
    });

    return Array.from(tsMap.entries()).map(([tsName, stats]) => {
        const avgHandlingTime = stats.handlingTimes.length > 0
            ? stats.handlingTimes.reduce((a, b) => a + b, 0) / stats.handlingTimes.length
            : 0;

        return {
            tsName,
            totalIncidents: stats.total,
            openIncidents: stats.open,
            closedIncidents: stats.closed,
            avgHandlingTime,
            sitesHandled: stats.sites.size,
            incidentTypes: Array.from(stats.types),
        };
    }).sort((a, b) => b.totalIncidents - a.totalIncidents);
}
