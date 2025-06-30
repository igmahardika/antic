import { ITicket } from './db';
import { formatDurationDHM, analyzeKeywords, generateAnalysisConclusion } from './utils';
import { calculateAgentKpis } from '@/utils/agentKpi';
import { format } from 'date-fns';
import useAgentStore, { AgentKpi, AgentMetric } from '@/store/agentStore';

// This file contains the data processing functions previously in Dashboard.tsx

// Mapper function to solve type mismatch between DB and KPI utility
function mapITicketToKpiTicket(ticket: ITicket): any { // Using 'any' for simplicity, could define a specific 'KpiTicket' interface
  return {
    ticket_id: ticket.id,
    WaktuOpen: ticket.openTime,
    WaktuCloseTicket: ticket.closeTime,
    ClosePenanganan: ticket.closeHandling,
    Penanganan2: ticket.handling2, // FCR is based on this
    OpenBy: ticket.openBy,
  };
}

export function processSummaryData(tickets: ITicket[]) {
    const totalTickets = tickets.length;
    const closedTickets = tickets.filter(t => t.status === 'Closed').length;

    const monthlyStats: { [key: string]: { incoming: number, closed: number } } = {};
    const yearlyStats: { [key: string]: { incoming: number, closed: number } } = {};

    tickets.forEach(ticket => {
        try {
            const d = new Date(ticket.openTime);
            if (isNaN(d.getTime())) return;

            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const monthYear = `${yyyy}-${mm}`;

            // Monthly
            if (!monthlyStats[monthYear]) {
                monthlyStats[monthYear] = { incoming: 0, closed: 0 };
            }
            monthlyStats[monthYear].incoming++;
            if (ticket.status === 'Closed') {
                monthlyStats[monthYear].closed++;
            }

            // Yearly
            const yearStr = String(yyyy);
            if (!yearlyStats[yearStr]) {
                yearlyStats[yearStr] = { incoming: 0, closed: 0 };
            }
            yearlyStats[yearStr].incoming++;
            if (ticket.status === 'Closed') {
                yearlyStats[yearStr].closed++;
            }
        } catch(e) { /* ignore */ }
    });
    
    const monthNamesIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sortedMonthlyKeys = Object.keys(monthlyStats).sort();
    const sortedYearlyKeys = Object.keys(yearlyStats).sort();

    const monthlyData = {
        labels: sortedMonthlyKeys.map(key => {
            const [yyyy, mm] = key.split('-');
            return `${monthNamesIndo[parseInt(mm, 10) - 1]} ${yyyy}`;
        }),
        datasets: [
            { label: 'Incoming Tickets', data: sortedMonthlyKeys.map(key => monthlyStats[key].incoming) },
            { label: 'Closed Tickets', data: sortedMonthlyKeys.map(key => monthlyStats[key].closed) },
        ],
    };

    const yearlyData = {
        labels: sortedYearlyKeys,
        datasets: [
            { label: 'Incoming Tickets', data: sortedYearlyKeys.map(key => yearlyStats[key].incoming) },
            { label: 'Closed Tickets', data: sortedYearlyKeys.map(key => yearlyStats[key].closed) },
        ],
    };

    return {
        stats: [
            { title: "Total Tickets", value: totalTickets, description: "All tickets in period" },
            { title: "Closed Tickets", value: closedTickets, description: "Resolved tickets" },
            { title: "Open Tickets", value: totalTickets - closedTickets, description: "Pending tickets" },
            { title: "Satisfaction", value: "95%", description: "Based on survey" }, // Placeholder
        ],
        monthlyStatsData: monthlyData,
        yearlyStatsData: yearlyData,
    };
}

export function processKanbanData(allTickets: ITicket[], filteredTickets: ITicket[]) {
    // This function processes data specifically for the Kanban/Customer view.
    // It groups tickets by customer and calculates some stats.
    const customerData = new Map<string, { tickets: ITicket[], class: string }>();

    allTickets.forEach(ticket => {
        if (!ticket.name) return;
        if (!customerData.has(ticket.name)) {
            customerData.set(ticket.name, { tickets: [], class: 'C' }); // Default class
        }
        customerData.get(ticket.name)!.tickets.push(ticket);
    });

    const kanbanCustomers = Array.from(customerData.entries()).map(([name, data]) => {
        const totalTickets = data.tickets.length;
        const openTickets = data.tickets.filter(t => t.status !== 'Closed').length;
        return {
            id: name,
            name: name,
            totalTickets,
            openTickets,
            rep_class: data.class,
            tickets: data.tickets,
        };
    });

    // We only show customers that have tickets in the filtered period.
    const filteredCustomerNames = new Set(filteredTickets.map(t => t.name));
    const finalData = kanbanCustomers.filter(c => filteredCustomerNames.has(c.name));
    
    return { kanbanData: finalData };
}

export function processTicketAnalytics(tickets: ITicket[]) {
    if (!tickets || tickets.length === 0) return null;

    // --- Stats Cards Data ---
    const totalTickets = tickets.length;
    const closedTickets = tickets.filter(t => t.status === 'Closed').length;
    const totalDurationHours = tickets.reduce((acc, t) => acc + (t.duration?.rawHours || 0), 0);
    const avgDuration = totalTickets > 0 ? totalDurationHours / totalTickets : 0;
    const activeAgents = new Set(tickets.map(t => t.openBy).filter(Boolean)).size;

    const stats = [
        { title: 'Total Tickets', value: totalTickets },
        { title: 'Avg Duration', value: formatDurationDHM(avgDuration) },
        { title: 'Closed Tickets', value: closedTickets },
        { title: 'Active Agents', value: activeAgents },
    ];

    // --- Category & Classification Data ---
    const categoryData: { [key: string]: { count: number, totalDuration: number, subs: { [key: string]: number } } } = {};
    const classificationData: { [key: string]: { count: number, trendline: any } } = {};

    tickets.forEach(t => {
        const category = t.category || 'Uncategorized';
        const subCategory = t.subClassification || 'N/A';
        const classification = t.classification || 'Unclassified';

        if (!categoryData[category]) categoryData[category] = { count: 0, totalDuration: 0, subs: {} };
        categoryData[category].count++;
        categoryData[category].totalDuration += t.duration?.rawHours || 0;
        categoryData[category].subs[subCategory] = (categoryData[category].subs[subCategory] || 0) + 1;
        
        if (!classificationData[classification]) classificationData[classification] = { count: 0, trendline: null /* Placeholder */ };
        classificationData[classification].count++;
    });

    const topComplaintsTable = Object.entries(categoryData).map(([category, data]) => ({
        category,
        count: data.count,
        avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
        avgDurationFormatted: formatDurationDHM(data.count > 0 ? data.totalDuration / data.count : 0),
        topSubCategory: Object.entries(data.subs).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A',
    })).map(c => ({
        ...c,
        impactScore: (c.count * 0.6) + (c.avgDuration * 0.4) // Simple impact score
    })).sort((a,b) => b.impactScore - a.impactScore).slice(0, 10);
    
    const complaintsData = {
        labels: Object.keys(categoryData).slice(0, 7),
        datasets: [{ data: Object.values(categoryData).map(d => d.count).slice(0, 7) }]
    };

    // Monthly Trendline Data
    const monthlyStats: { [key: string]: { incoming: number, closed: number } } = {};
    tickets.forEach(ticket => {
        const d = new Date(ticket.openTime);
        if (isNaN(d.getTime())) return;
        const monthYear = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyStats[monthYear]) monthlyStats[monthYear] = { incoming: 0, closed: 0 };
        monthlyStats[monthYear].incoming++;
        if (ticket.status === 'Closed') monthlyStats[monthYear].closed++;
    });
    const sortedMonthlyKeys = Object.keys(monthlyStats).sort();
    const monthNamesIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyStatsData = {
        labels: sortedMonthlyKeys.map(key => {
            const [yyyy, mm] = key.split('-');
            return `${monthNamesIndo[parseInt(mm, 10) - 1]} ${yyyy.slice(-2)}`;
        }),
        datasets: [
            { label: 'Incoming', data: sortedMonthlyKeys.map(key => monthlyStats[key].incoming) },
            { label: 'Closed', data: sortedMonthlyKeys.map(key => monthlyStats[key].closed) },
        ],
    };
    
    // Keyword Analysis
    const descriptions = tickets.map(t => t.description).filter(Boolean);
    const conclusion = generateAnalysisConclusion({
        description: analyzeKeywords(descriptions, 3).map(k => k[0]),
        cause: analyzeKeywords(tickets.map(t => t.cause).filter(Boolean), 3).map(k => k[0]),
        handling: analyzeKeywords(tickets.map(t => t.handling).filter(Boolean), 3).map(k => k[0]),
    });
    const allKeywordsText = tickets.map(t => `${t.description} ${t.cause} ${t.handling}`).join(' ');
    const keywordAnalysis = {
        conclusion: conclusion,
        keywords: analyzeKeywords([allKeywordsText], 20)
    };
    
    return {
        stats,
        topComplaintsTable,
        complaintsData,
        classificationData,
        monthlyStatsData,
        keywordAnalysis,
    };
}

export function processAgentAnalytics(tickets: ITicket[]) {
     if (!tickets || tickets.length === 0) {
        return { agentKpis: [], overallKpis: null };
    }
    
    const kpiTickets = tickets.map(mapITicketToKpiTicket);
    
    // Group by agent BEFORE calculating KPIs
    const groupedByAgent: Record<string, any[]> = kpiTickets.reduce((acc, t) => {
        const agent = t.OpenBy || 'Unknown';
        if (!acc[agent]) acc[agent] = [];
        acc[agent].push(t);
        return acc;
    }, {});

    const agentKpis = Object.values(groupedByAgent).map(agentTickets => {
        return calculateAgentKpis(agentTickets);
    }).filter(kpi => kpi); // Filter out potential null/undefined results

    return { agentKpis, overallKpis: null };
}

export function processCustomerAnalysis(tickets: ITicket[]) {
    if (!tickets || tickets.length === 0) {
        return {
            customerData: [],
            classSummary: { Normal: 0, Persisten: 0, Kronis: 0, Ekstrem: 0 },
        };
    }

    const customerTickets: { [key: string]: { tickets: ITicket[], name: string } } = {};
    tickets.forEach(ticket => {
        if (!ticket.customerId) return;
        if (!customerTickets[ticket.customerId]) {
            customerTickets[ticket.customerId] = { tickets: [], name: ticket.name };
        }
        customerTickets[ticket.customerId].tickets.push(ticket);
    });

    const customerData = Object.entries(customerTickets).map(([customerId, data]) => {
        const ticketCount = data.tickets.length;
        let classification = 'Normal';
        if (ticketCount > 5) classification = 'Ekstrem';
        else if (ticketCount >= 4) classification = 'Kronis';
        else if (ticketCount >= 2) classification = 'Persisten';

        return {
            customerId,
            customerName: data.name,
            ticketCount,
            classification,
            tickets: data.tickets.map(t => t.id),
        };
    });
    
    const classSummary = customerData.reduce((acc, customer) => {
        acc[customer.classification] = (acc[customer.classification] || 0) + 1;
        return acc;
    }, { Normal: 0, Persisten: 0, Kronis: 0, Ekstrem: 0 } as { [key: string]: number });

    return { customerData: customerData.sort((a,b) => b.ticketCount - a.ticketCount), classSummary };
} 