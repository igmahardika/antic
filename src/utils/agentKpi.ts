import { ITicket } from '@/lib/db';
import { AgentMetric, AgentKpi } from '@/store/agentStore';

function parseDate(dateStr: string | Date | null | undefined): Date | null {
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

function calculateFrt(ticket: ITicket): number | null {
    const open = parseDate(ticket.openTime);
    const firstResponse = parseDate(ticket.closeTime); // Simplified: using closeTime as first response
    if (open && firstResponse) {
        return (firstResponse.getTime() - open.getTime()) / (1000 * 60);
    }
    return null;
}

function calculateArt(ticket: ITicket): number | null {
    const open = parseDate(ticket.openTime);
    const resolution = parseDate(ticket.closeTime); // Simplified: using closeTime for resolution
    if (open && resolution) {
        return (resolution.getTime() - open.getTime()) / (1000 * 60);
    }
    return null;
}

function calculateKpiMetrics(tickets: ITicket[]): AgentMetric {
    if (tickets.length === 0) return { vol: 0, frt: 0, art: 0, fcr: 0, sla: 0, score: 0 };

    let totalFrt = 0, frtCount = 0, totalArt = 0, artCount = 0, fcrSuccess = 0, slaMet = 0;

    tickets.forEach(ticket => {
        const frt = calculateFrt(ticket);
        if (frt !== null) {
            totalFrt += frt;
            frtCount++;
            if (frt <= 1440) slaMet++; // SLA: FRT <= 24 hours
        }
        const art = calculateArt(ticket);
        if (art !== null) {
            totalArt += art;
            artCount++;
        }
        if (ticket.fcr === 'Yes') fcrSuccess++;
    });

    const metrics = {
        vol: tickets.length,
        frt: frtCount > 0 ? totalFrt / frtCount : 0,
        art: artCount > 0 ? totalArt / artCount : 0,
        fcr: tickets.length > 0 ? (fcrSuccess / tickets.length) * 100 : 0,
        sla: frtCount > 0 ? (slaMet / frtCount) * 100 : 0,
    };
    
    // Simplified scoring
    const score = (metrics.fcr * 0.4) + (metrics.sla * 0.3) + ((1 - metrics.frt / 1440) * 100 * 0.15) + ((1 - metrics.art / 1440) * 100 * 0.15);
    return { ...metrics, score: Math.max(0, Math.min(100, score)) };
}

export function calculateAgentKpis(tickets: ITicket[]): AgentKpi[] {
    const agentData: { [key: string]: ITicket[] } = {};
    tickets.forEach(ticket => {
        const agentName = ticket.openBy || 'Unassigned';
        if (!agentData[agentName]) agentData[agentName] = [];
        agentData[agentName].push(ticket);
    });

    return Object.keys(agentData).map(agent => {
        const agentTickets = agentData[agent];
        const metric = calculateKpiMetrics(agentTickets);

        const monthlyTrend: { [key: string]: { totalFRT: number; countFRT: number; totalART: number; countART: number } } = {};
        agentTickets.forEach(t => {
            const openTime = parseDate(t.openTime);
            if (openTime) {
                const month = openTime.toISOString().slice(0, 7);
                if (!monthlyTrend[month]) {
                    monthlyTrend[month] = { totalFRT: 0, countFRT: 0, totalART: 0, countART: 0 };
                }
                const frt = calculateFrt(t);
                if (frt !== null) {
                    monthlyTrend[month].totalFRT += frt;
                    monthlyTrend[month].countFRT++;
                }
                const art = calculateArt(t);
                if (art !== null) {
                    monthlyTrend[month].totalART += art;
                    monthlyTrend[month].countART++;
                }
            }
        });

        const sortedMonths = Object.keys(monthlyTrend).sort();
        const frtTrend = sortedMonths.map(m => monthlyTrend[m].countFRT > 0 ? monthlyTrend[m].totalFRT / monthlyTrend[m].countFRT : 0);
        const artTrend = sortedMonths.map(m => monthlyTrend[m].countART > 0 ? monthlyTrend[m].totalART / monthlyTrend[m].countART : 0);

        return {
            agent,
            metric,
            trends: { frt: frtTrend, art: artTrend },
        };
    }).sort((a, b) => b.metric.score - a.metric.score);
} 