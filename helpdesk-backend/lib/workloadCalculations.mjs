// ============================================================
// Workload Analytics Calculation Logic
// ============================================================

/**
 * Calculate ticket complexity score
 * @param {object} ticket - Ticket data
 * @param {number} avgDuration - Average duration for normalization
 * @returns {object} Complexity breakdown and score
 */
export function calculateComplexityScore(ticket, avgDuration = 4) {
    // Category weight mapping
    const categoryWeights = {
        'Hardware': 1.5,
        'Software': 1.3,
        'Network': 1.8,
        'Account': 0.8,
        'Database': 1.6,
        'Security': 1.9,
        'Application': 1.4,
        'Other': 1.0
    };

    // Get category weight (default to 1.0 if not found)
    const categoryWeight = categoryWeights[ticket.category] || 1.0;

    // Duration factor (normalized to avg, capped at 3.0)
    const durationHours = parseFloat(ticket.duration_raw_hours) || 0;
    const durationFactor = Math.min(durationHours / avgDuration, 3.0);

    // Handling count factor (more handlings = more complex)
    let handlingCount = 0;
    for (let i = 1; i <= 5; i++) {
        if (ticket[`handling${i}`] && ticket[`handling${i}`].trim() !== '') {
            handlingCount++;
        }
    }
    const handlingCountFactor = Math.min(handlingCount / 2, 2.5);

    // Escalation factor (if ticket was handled by multiple people, it's more complex)
    const escalationFactor = handlingCount > 2 ? 1.3 : 1.0;

    // Weighted formula
    const complexityScore =
        (categoryWeight * 0.4) +
        (durationFactor * 0.3) +
        (handlingCountFactor * 0.2) +
        (escalationFactor * 0.1);

    return {
        complexity_score: Number(complexityScore.toFixed(2)),
        category_weight: Number(categoryWeight.toFixed(2)),
        duration_factor: Number(durationFactor.toFixed(2)),
        handling_count_factor: Number(handlingCountFactor.toFixed(2)),
        escalation_factor: Number(escalationFactor.toFixed(2))
    };
}

/**
 * Calculate agent utilization rate
 * @param {object} agent - Agent data with working hours and tickets
 * @returns {object} Utilization metrics
 */
export function calculateUtilizationRate(agent) {
    const {
        working_hours_per_day = 8,
        efficiency_rate = 1.0,
        total_handling_time = 0,
        days_in_period = 1
    } = agent;

    const totalWorkingHours = working_hours_per_day * days_in_period;
    const adjustedCapacity = totalWorkingHours * efficiency_rate;
    const utilization = (total_handling_time / adjustedCapacity) * 100;

    return {
        utilization_rate: Number(Math.min(utilization, 200).toFixed(2)), // Cap at 200% for display
        total_handling_time: Number(total_handling_time.toFixed(2)),
        available_capacity: Number(adjustedCapacity.toFixed(2)),
        remaining_capacity: Number(Math.max(0, adjustedCapacity - total_handling_time).toFixed(2))
    };
}

/**
 * Calculate queue metrics
 * @param {array} tickets - Array of ticket data
 * @returns {object} Queue statistics
 */
export function calculateQueueMetrics(tickets) {
    const now = new Date();

    // Filter open tickets
    const openTickets = tickets.filter(t => t.status !== 'Closed' && t.status !== 'closed');

    // Calculate wait times (open_time → first handling)
    let totalWaitTime = 0;
    let assignedCount = 0;

    const agingBuckets = {
        fresh: 0,    // < 4h
        aging: 0,    // 4-24h
        old: 0,      // 24-48h
        critical: 0  // > 48h
    };

    openTickets.forEach(ticket => {
        const openTime = new Date(ticket.open_time);
        const ageHours = (now - openTime) / (1000 * 60 * 60);

        // Categorize by age
        if (ageHours < 4) agingBuckets.fresh++;
        else if (ageHours < 24) agingBuckets.aging++;
        else if (ageHours < 48) agingBuckets.old++;
        else agingBuckets.critical++;

        // Calculate wait time if ticket has been handled
        if (ticket.handling1 && ticket.close_handling1) {
            const firstHandling = new Date(ticket.close_handling1);
            const waitHours = (firstHandling - openTime) / (1000 * 60 * 60);
            if (waitHours >= 0) { // Valid wait time
                totalWaitTime += waitHours;
                assignedCount++;
            }
        }
    });

    const avgWaitTime = assignedCount > 0 ? totalWaitTime / assignedCount : 0;

    // Queue velocity (tickets resolved in last 24h)
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const resolvedLast24h = tickets.filter(t => {
        if (!t.close_time) return false;
        const closeTime = new Date(t.close_time);
        return closeTime >= last24h;
    }).length;

    const queueVelocity = resolvedLast24h / 24; // tickets per hour

    return {
        total_in_queue: openTickets.length,
        avg_wait_time: Number(avgWaitTime.toFixed(2)),
        queue_velocity: Number(queueVelocity.toFixed(2)),
        aging_breakdown: agingBuckets,
        resolved_last_24h: resolvedLast24h
    };
}

/**
 * Simple moving average forecast
 * @param {array} historicalData - Array of {date, count} objects
 * @param {number} daysAhead - Number of days to forecast
 * @returns {array} Forecast predictions
 */
export function forecastWorkload(historicalData, daysAhead = 7) {
    if (!historicalData || historicalData.length < 7) {
        return [];
    }

    // Calculate 7-day moving average
    const last7Days = historicalData.slice(-7);
    const movingAvg = last7Days.reduce((sum, d) => sum + d.count, 0) / 7;

    // Calculate linear trend from last 30 days (if available)
    const last30Days = historicalData.slice(-Math.min(30, historicalData.length));
    let trend = 0;

    if (last30Days.length >= 7) {
        // Simple linear regression slope
        const n = last30Days.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = last30Days.reduce((sum, d) => sum + d.count, 0);
        const sumXY = last30Days.reduce((sum, d, i) => sum + (i * d.count), 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    // Generate forecast
    const forecast = [];
    const baseDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= daysAhead; i++) {
        const forecastDate = new Date(baseDate);
        forecastDate.setDate(forecastDate.getDate() + i);

        const prediction = movingAvg + (trend * i);
        const confidenceLow = prediction * 0.8;
        const confidenceHigh = prediction * 1.2;

        forecast.push({
            date: forecastDate.toISOString().split('T')[0],
            predicted_count: Math.round(Math.max(0, prediction)),
            confidence_low: Math.round(Math.max(0, confidenceLow)),
            confidence_high: Math.round(confidenceHigh)
        });
    }

    return forecast;
}

/**
 * Calculate capacity metrics for team
 * @param {array} agents - Array of agent capacity data
 * @param {number} currentTickets - Current open tickets
 * @returns {object} Capacity analysis
 */
export function calculateCapacityMetrics(agents, currentTickets) {
    const activeAgents = agents.filter(a => a.is_active);

    const totalMaxConcurrent = activeAgents.reduce((sum, a) =>
        sum + (a.max_concurrent_tickets || 10), 0
    );

    const totalDailyCapacity = activeAgents.reduce((sum, a) =>
        sum + ((a.working_hours_per_day || 8) * (a.efficiency_rate || 1.0)), 0
    );

    const utilizationPct = (currentTickets / totalMaxConcurrent) * 100;

    // Determine status color
    let status = 'healthy';
    if (utilizationPct >= 90) status = 'overloaded';
    else if (utilizationPct >= 70) status = 'near_capacity';

    return {
        total_agents: activeAgents.length,
        total_max_concurrent: totalMaxConcurrent,
        total_daily_capacity: Number(totalDailyCapacity.toFixed(2)),
        current_tickets: currentTickets,
        utilization_pct: Number(Math.min(utilizationPct, 200).toFixed(2)),
        remaining_capacity: Math.max(0, totalMaxConcurrent - currentTickets),
        status: status,
        recommended_agents: Math.ceil(currentTickets / 10) // Assume 10 tickets per agent target
    };
}
