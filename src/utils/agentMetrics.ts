/**
 * Agent Performance Metrics - Standardized Calculations
 * Based on ITIL and HDI (Help Desk Institute) best practices
 */

import { ITicket } from "@/lib/db";

// ============================================
// CONFIGURABLE TARGETS (Can be adjusted per organization)
// ============================================

export const AGENT_TARGETS = {
    // Efficiency Targets
    AHT_HOURS: 24, // Average Handle Time target in hours
    FRT_HOURS: 4, // First Response Time target in hours
    ART_HOURS: 48, // Average Resolution Time target in hours

    // Quality Targets (Percentages)
    FCR_RATE: 75, // First Contact Resolution target %
    SLA_RATE: 85, // SLA Compliance target %
    ESCALATION_RATE: 25, // Maximum acceptable escalation rate %

    // Productivity Targets
    TICKETS_PER_MONTH: 50, // Minimum tickets per month
    TICKETS_PER_DAY: 5, // Approximate daily target

    // SLA Time Threshold (for compliance calculation)
    SLA_THRESHOLD_HOURS: 24, // Ticket must be handled within this time for SLA compliance
} as const;

// CPI Weights (must sum to 1.0)
export const CPI_WEIGHTS = {
    EFFICIENCY: 0.25,
    QUALITY: 0.30,
    RESOLUTION: 0.20,
    RELIABILITY: 0.15,
    PRODUCTIVITY: 0.10,
} as const;

// CPI Level Thresholds
export const CPI_LEVELS = {
    PLATINUM: { min: 85, label: "Platinum", color: "#E5E4E2" },
    GOLD: { min: 70, label: "Gold", color: "#FFD700" },
    SILVER: { min: 50, label: "Silver", color: "#C0C0C0" },
    BRONZE: { min: 0, label: "Bronze", color: "#CD7F32" },
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AgentMetrics {
    // Basic Info
    agentName: string;
    tenure: number; // days since first ticket
    totalTickets: number;

    // Efficiency Metrics (in hours)
    avgAHT: number; // Average Handle Time
    avgFRT: number; // First Response Time
    avgART: number; // Average Resolution Time

    // Quality Metrics (percentages)
    fcrRate: number; // First Contact Resolution Rate
    slaRate: number; // SLA Compliance Rate
    escalationRate: number; // Tickets that required escalation

    // Volume Metrics
    ticketsPerDay: number;
    activedays: number;

    // Shift Distribution
    shiftDistribution: {
        pagi: number;
        siang: number;
        malam: number;
    };

    // Category Distribution
    categoryDistribution: Record<string, number>;

    // Escalation Depth (1-5)
    escalationDepth: {
        level1: number; // No escalation
        level2: number;
        level3: number;
        level4: number;
        level5: number;
    };

    // Score Components
    scores: {
        efficiency: number;
        quality: number;
        resolution: number;
        reliability: number;
        productivity: number;
        cpi: number;
    };

    // CPI Level
    cpiLevel: {
        label: string;
        color: string;
    };
}

export interface MetricStatus {
    value: number | string;
    target: string;
    status: "on-target" | "warning" | "critical";
    trend?: "up" | "down" | "stable";
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Determine shift based on hour of day
 */
export function getShiftFromHour(hour: number): "pagi" | "siang" | "malam" {
    if (hour >= 6 && hour < 14) return "pagi";
    if (hour >= 14 && hour < 22) return "siang";
    return "malam";
}

/**
 * Get CPI level based on score
 */
export function getCPILevel(cpi: number): { label: string; color: string } {
    if (cpi >= CPI_LEVELS.PLATINUM.min)
        return { label: CPI_LEVELS.PLATINUM.label, color: CPI_LEVELS.PLATINUM.color };
    if (cpi >= CPI_LEVELS.GOLD.min)
        return { label: CPI_LEVELS.GOLD.label, color: CPI_LEVELS.GOLD.color };
    if (cpi >= CPI_LEVELS.SILVER.min)
        return { label: CPI_LEVELS.SILVER.label, color: CPI_LEVELS.SILVER.color };
    return { label: CPI_LEVELS.BRONZE.label, color: CPI_LEVELS.BRONZE.color };
}

/**
 * Format hours to HH:MM:SS string
 */
export function formatHoursToHMS(hours: number): string {
    if (!hours || isNaN(hours) || hours < 0) return "00:00:00";
    const totalSeconds = Math.floor(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Get metric status indicator
 */
export function getMetricStatus(
    value: number,
    target: number,
    type: "min" | "max"
): "on-target" | "warning" | "critical" {
    if (type === "min") {
        // Higher is better (FCR, SLA)
        if (value >= target) return "on-target";
        if (value >= target * 0.8) return "warning";
        return "critical";
    } else {
        // Lower is better (AHT, Escalation)
        if (value <= target) return "on-target";
        if (value <= target * 1.25) return "warning";
        return "critical";
    }
}

// ============================================
// CORE CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate all agent metrics from tickets
 */
export function calculateAgentMetrics(
    agentName: string,
    tickets: ITicket[]
): AgentMetrics {
    const agentTickets = tickets.filter((t) => t.openBy === agentName);
    const totalTickets = agentTickets.length;

    if (totalTickets === 0) {
        return getEmptyMetrics(agentName);
    }

    // Calculate tenure (days between first and last ticket)
    const dates = agentTickets
        .map((t) => new Date(t.openTime).getTime())
        .filter((d) => !isNaN(d));
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const tenure = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));

    // Calculate average durations (in hours)
    const ahtValues: number[] = [];
    const frtValues: number[] = [];
    const artValues: number[] = [];

    agentTickets.forEach((t) => {
        // AHT: Total handling duration
        if (t.handlingDuration?.rawHours > 0 && t.handlingDuration.rawHours < 720) {
            ahtValues.push(t.handlingDuration.rawHours);
        }

        // FRT: First response duration
        if (t.handlingDuration1?.rawHours > 0 && t.handlingDuration1.rawHours < 720) {
            frtValues.push(t.handlingDuration1.rawHours);
        }

        // ART: Duration from open to close
        if (t.duration?.rawHours > 0 && t.duration.rawHours < 720) {
            artValues.push(t.duration.rawHours);
        }
    });

    const avgAHT = ahtValues.length > 0
        ? ahtValues.reduce((a, b) => a + b, 0) / ahtValues.length
        : 0;

    const avgFRT = frtValues.length > 0
        ? frtValues.reduce((a, b) => a + b, 0) / frtValues.length
        : 0;

    const avgART = artValues.length > 0
        ? artValues.reduce((a, b) => a + b, 0) / artValues.length
        : 0;

    // Calculate FCR Rate (tickets without escalation)
    const fcrTickets = agentTickets.filter((t) => {
        const hasEscalation = t.handling2 && t.handling2.trim() !== "";
        return !hasEscalation;
    });
    const fcrRate = (fcrTickets.length / totalTickets) * 100;

    // Calculate SLA Rate (tickets handled within threshold)
    const slaCompliant = agentTickets.filter((t) => {
        if (!t.openTime || !t.closeHandling) return false;
        const open = new Date(t.openTime);
        const handling = new Date(t.closeHandling);
        if (isNaN(open.getTime()) || isNaN(handling.getTime())) return false;
        const diffHours = (handling.getTime() - open.getTime()) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= AGENT_TARGETS.SLA_THRESHOLD_HOURS;
    });
    const slaRate = (slaCompliant.length / totalTickets) * 100;

    // Calculate Escalation Rate
    const escalatedTickets = agentTickets.filter((t) => {
        return [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5].some(
            (h) => h && h.trim() !== ""
        );
    });
    const escalationRate = (escalatedTickets.length / totalTickets) * 100;

    // Calculate shift distribution
    const shiftDistribution = { pagi: 0, siang: 0, malam: 0 };
    agentTickets.forEach((t) => {
        const date = new Date(t.openTime);
        if (!isNaN(date.getTime())) {
            const shift = getShiftFromHour(date.getHours());
            shiftDistribution[shift]++;
        }
    });

    // Calculate category distribution
    const categoryDistribution: Record<string, number> = {};
    agentTickets.forEach((t) => {
        const cat = t.category || "Unknown";
        categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });

    // Calculate escalation depth
    const escalationDepth = { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 };
    agentTickets.forEach((t) => {
        if (t.closeHandling5 && t.closeHandling5.trim()) escalationDepth.level5++;
        else if (t.closeHandling4 && t.closeHandling4.trim()) escalationDepth.level4++;
        else if (t.closeHandling3 && t.closeHandling3.trim()) escalationDepth.level3++;
        else if (t.closeHandling2 && t.closeHandling2.trim()) escalationDepth.level2++;
        else escalationDepth.level1++;
    });

    // Calculate active days and tickets per day
    const uniqueDays = new Set(
        agentTickets.map((t) => new Date(t.openTime).toDateString())
    ).size;
    const ticketsPerDay = uniqueDays > 0 ? totalTickets / uniqueDays : 0;

    // Calculate scores
    const scores = calculateScores({
        avgAHT,
        avgFRT,
        fcrRate,
        slaRate,
        escalationRate,
        totalTickets,
        tenure,
    });

    return {
        agentName,
        tenure,
        totalTickets,
        avgAHT,
        avgFRT,
        avgART,
        fcrRate,
        slaRate,
        escalationRate,
        ticketsPerDay,
        activedays: uniqueDays,
        shiftDistribution,
        categoryDistribution,
        escalationDepth,
        scores,
        cpiLevel: getCPILevel(scores.cpi),
    };
}

/**
 * Calculate score components
 */
function calculateScores(params: {
    avgAHT: number;
    avgFRT: number;
    fcrRate: number;
    slaRate: number;
    escalationRate: number;
    totalTickets: number;
    tenure: number;
}): AgentMetrics["scores"] {
    const { avgAHT, fcrRate, slaRate, escalationRate, totalTickets, tenure } = params;

    // Dynamic AHT target based on tenure
    const tenureMonths = tenure / 30;
    const expectedAHT =
        tenureMonths < 1
            ? 60 // New: 60 min = 1 hour
            : tenureMonths < 3
                ? 45 // 45 min
                : tenureMonths < 6
                    ? 35 // 35 min
                    : 30; // Veteran: 30 min

    // Efficiency Score (25%)
    // Based on AHT vs expected (in minutes for comparison)
    const ahtMinutes = avgAHT * 60;
    const efficiency = Math.max(
        0,
        Math.min(100, 100 - ((ahtMinutes - expectedAHT) / expectedAHT) * 50)
    );

    // Quality Score (30%)
    // Weighted combination of SLA and FCR
    const quality = slaRate * 0.6 + fcrRate * 0.4;

    // Resolution Score (20%)
    // FCR minus escalation penalty
    const resolution = Math.max(0, Math.min(100, fcrRate - escalationRate * 0.5));

    // Reliability Score (15%)
    // Inverse of escalation rate
    const reliability = Math.max(0, 100 - escalationRate * 2);

    // Productivity Score (10%)
    // Based on monthly ticket volume
    const monthlyTickets = (totalTickets / tenure) * 30;
    const productivity = Math.min(100, (monthlyTickets / AGENT_TARGETS.TICKETS_PER_MONTH) * 100);

    // Calculate CPI
    const cpi = Math.round(
        efficiency * CPI_WEIGHTS.EFFICIENCY +
        quality * CPI_WEIGHTS.QUALITY +
        resolution * CPI_WEIGHTS.RESOLUTION +
        reliability * CPI_WEIGHTS.RELIABILITY +
        productivity * CPI_WEIGHTS.PRODUCTIVITY
    );

    return {
        efficiency: Math.round(efficiency),
        quality: Math.round(quality),
        resolution: Math.round(resolution),
        reliability: Math.round(reliability),
        productivity: Math.round(productivity),
        cpi,
    };
}

/**
 * Get empty metrics for agent with no tickets
 */
function getEmptyMetrics(agentName: string): AgentMetrics {
    return {
        agentName,
        tenure: 0,
        totalTickets: 0,
        avgAHT: 0,
        avgFRT: 0,
        avgART: 0,
        fcrRate: 0,
        slaRate: 0,
        escalationRate: 0,
        ticketsPerDay: 0,
        activedays: 0,
        shiftDistribution: { pagi: 0, siang: 0, malam: 0 },
        categoryDistribution: {},
        escalationDepth: { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
        scores: {
            efficiency: 0,
            quality: 0,
            resolution: 0,
            reliability: 0,
            productivity: 0,
            cpi: 0,
        },
        cpiLevel: { label: "Bronze", color: CPI_LEVELS.BRONZE.color },
    };
}

/**
 * Get weekly breakdown of tickets for trend analysis
 */
export function getWeeklyBreakdown(
    agentName: string,
    tickets: ITicket[]
): Array<{
    week: number;
    startDate: string;
    ticketCount: number;
    avgAHT: number;
    fcrRate: number;
    slaRate: number;
}> {
    const agentTickets = tickets.filter((t) => t.openBy === agentName);

    if (agentTickets.length === 0) return [];

    // Group by week
    const weekMap = new Map<number, ITicket[]>();

    agentTickets.forEach((t) => {
        const date = new Date(t.openTime);
        if (isNaN(date.getTime())) return;

        // Get week number (ISO week)
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

        if (!weekMap.has(weekNum)) weekMap.set(weekNum, []);
        weekMap.get(weekNum)!.push(t);
    });

    // Calculate metrics per week
    return Array.from(weekMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([week, weekTickets]) => {
            const ahtValues = weekTickets
                .filter((t) => t.handlingDuration?.rawHours > 0)
                .map((t) => t.handlingDuration.rawHours);

            const avgAHT =
                ahtValues.length > 0
                    ? ahtValues.reduce((a, b) => a + b, 0) / ahtValues.length
                    : 0;

            const fcrCount = weekTickets.filter(
                (t) => !t.handling2 || t.handling2.trim() === ""
            ).length;
            const fcrRate = (fcrCount / weekTickets.length) * 100;

            const slaCount = weekTickets.filter((t) => {
                if (!t.openTime || !t.closeHandling) return false;
                const open = new Date(t.openTime);
                const handling = new Date(t.closeHandling);
                const diffHours = (handling.getTime() - open.getTime()) / (1000 * 60 * 60);
                return diffHours > 0 && diffHours <= AGENT_TARGETS.SLA_THRESHOLD_HOURS;
            }).length;
            const slaRate = (slaCount / weekTickets.length) * 100;

            // Get start date of week
            const firstTicket = weekTickets.sort(
                (a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime()
            )[0];
            const startDate = new Date(firstTicket.openTime).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
            });

            return {
                week,
                startDate,
                ticketCount: weekTickets.length,
                avgAHT,
                fcrRate,
                slaRate,
            };
        });
}
