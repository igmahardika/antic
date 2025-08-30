import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SummaryCard from '@/components/ui/SummaryCard';
import PageWrapper from '@/components/PageWrapper';
import { formatDurationDHM } from '@/lib/utils';

// MUI Icons for consistency with project standards
import FlashOnIcon from '@mui/icons-material/FlashOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import TimerIcon from '@mui/icons-material/Timer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WarningIcon from '@mui/icons-material/Warning';
import ScienceIcon from '@mui/icons-material/Science';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';


import { sanitizeTickets, calcAllMetrics, Ticket as AgentTicket, rank as rankBand } from '@/utils/agentKpi';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { calculateIncidentStats, normalizeNCAL } from '@/utils/incidentUtils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const SummaryDashboard = ({ ticketAnalyticsData, filteredTickets }: any) => {
  // Get incident data for comprehensive dashboard
  const allIncidents = useLiveQuery(() => db.incidents.toArray(), []);
  
  // Prepare monthly data
  const monthlyStatsData = ticketAnalyticsData?.monthlyStatsData;
  const stats = ticketAnalyticsData?.stats || [];

  // Incident statistics
  const incidentStats = useMemo(() => {
    if (!allIncidents || allIncidents.length === 0) {
      return {
        total: 0,
        open: 0,
        closed: 0,
        avgDuration: 0,
        ncalCompliance: 0,
        vendorPerformance: 0,
        siteReliability: 0
      };
    }

    const stats = calculateIncidentStats(allIncidents);
    const total = stats.total;
    const closed = stats.closed;
    const open = stats.open;
    
    // Calculate NCAL compliance
    const ncalCompliant = allIncidents.filter(inc => {
      const ncal = normalizeNCAL(inc.ncal);
      const duration = inc.durationMin || 0;
      const targets = { 'NCAL1': 60, 'NCAL2': 120, 'NCAL3': 240, 'NCAL4': 480 };
      return duration <= (targets[ncal] || 240);
    }).length;
    
    const ncalCompliance = total > 0 ? (ncalCompliant / total) * 100 : 0;

    // Calculate vendor performance
    const vendorIncidents = allIncidents.filter(inc => 
      (inc.ts || '').toLowerCase().includes('waneda') || 
      (inc.ts || '').toLowerCase().includes('lintas') ||
      (inc.ts || '').toLowerCase().includes('fiber')
    );
    const vendorSLA = vendorIncidents.filter(inc => {
      const duration = inc.durationMin || 0;
      return duration <= 240; // 4 hours SLA
    }).length;
    const vendorPerformance = vendorIncidents.length > 0 ? (vendorSLA / vendorIncidents.length) * 100 : 0;

    // Calculate site reliability
    const siteGroups = allIncidents.reduce((acc, inc) => {
      const site = inc.site || 'Unknown';
      if (!acc[site]) acc[site] = [];
      acc[site].push(inc);
      return acc;
    }, {} as Record<string, any[]>);

    const siteReliabilityScores = Object.values(siteGroups).map(incidents => {
      const resolved = incidents.filter(inc => inc.status?.toLowerCase() === 'done').length;
      return incidents.length > 0 ? (resolved / incidents.length) * 100 : 0;
    });

    const siteReliability = siteReliabilityScores.length > 0 
      ? siteReliabilityScores.reduce((a, b) => a + b, 0) / siteReliabilityScores.length 
      : 0;

    return {
      total,
      open,
      closed,
      avgDuration: stats.avgDuration,
      ncalCompliance,
      vendorPerformance,
      siteReliability
    };
  }, [allIncidents]);

  // Derived KPIs - Konsisten dengan TicketAnalytics
  const kpis = useMemo(() => {
    const total = filteredTickets?.length || 0;
    
    // Closed tickets: status yang mengandung 'close' (konsisten dengan TicketAnalytics)
    const closed = (filteredTickets || []).filter((t: any) => {
      const status = (t.status || '').trim().toLowerCase();
      return status.includes('close');
    }).length;
    
    const closedRate = total > 0 ? ((closed / total) * 100).toFixed(1) + '%' : '0%';
    
    // SLA: close within 24h (1440 minutes)
    const slaClosed = (filteredTickets || []).filter((t: any) => {
      if (!t.openTime || !t.closeTime) return false;
      const d1 = new Date(t.openTime); 
      const d2 = new Date(t.closeTime);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
      const diffMin = Math.abs(d2.getTime() - d1.getTime()) / 60000;
      return diffMin <= 1440;
    }).length;
    const slaPct = total > 0 ? ((slaClosed / total) * 100).toFixed(1) + '%' : '0%';
    
    // FRT/ART average in minutes (konsisten dengan AgentAnalytics)
    const frtVals: number[] = [];
    const artVals: number[] = [];
    (filteredTickets || []).forEach((t: any) => {
      // FRT: ClosePenanganan - WaktuOpen
      if (t.openTime && t.closeHandling) {
        const a = new Date(t.openTime); 
        const b = new Date(t.closeHandling);
        if (!isNaN(a.getTime()) && !isNaN(b.getTime()) && b.getTime() >= a.getTime()) {
          frtVals.push((b.getTime() - a.getTime()) / 60000);
        }
      }
      // ART: WaktuCloseTicket - WaktuOpen
      if (t.openTime && t.closeTime) {
        const a = new Date(t.openTime); 
        const b = new Date(t.closeTime);
        if (!isNaN(a.getTime()) && !isNaN(b.getTime()) && b.getTime() >= a.getTime()) {
          artVals.push((b.getTime() - a.getTime()) / 60000);
        }
      }
    });
    const avg = (arr: number[]) => arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    const frtAvg = avg(frtVals);
    const artAvg = avg(artVals);
    
    // Backlog: tiket yang tidak closed dan tidak ada closeTime
    const backlog = (filteredTickets || []).filter((t: any) => {
      const status = (t.status || '').trim().toLowerCase();
      return !status.includes('close') && !t.closeTime;
    }).length;
    
    return { total, closed, closedRate, slaPct, frtAvg, artAvg, backlog };
  }, [filteredTickets]);

  // Extract all years from monthlyStatsData.labels
  const allYears: string[] = useMemo(() => {
    if (!monthlyStatsData || !monthlyStatsData.labels) return [];
    const years = new Set<string>();
    monthlyStatsData.labels.forEach(label => {
      const year = label.split(' ').pop();
      if (year) years.add(year);
    });
    return Array.from(years).sort();
  }, [monthlyStatsData]);

  // State for selected year (default: last year in data)
  const [selectedYear, setSelectedYear] = useState(() => {
    if (allYears.length > 0) return allYears[allYears.length - 1];
    return '';
  });

  // Update selectedYear if allYears changes
  React.useEffect(() => {
    if (allYears.length > 0 && !allYears.includes(selectedYear)) {
      setSelectedYear(allYears[allYears.length - 1]);
    }
  }, [allYears, selectedYear]);

  // Filter monthly data for selected year
  const filteredMonthlyStatsData = useMemo(() => {
    if (!monthlyStatsData || !monthlyStatsData.labels || !selectedYear) return null;
    // Find indices for selected year
    const indices = monthlyStatsData.labels
      .map((label, idx) => (label.endsWith(selectedYear) ? idx : -1))
      .filter(idx => idx !== -1);
    if (indices.length === 0) return null;
    return {
      labels: indices.map(idx => monthlyStatsData.labels[idx].replace(' ' + selectedYear, '')),
      datasets: monthlyStatsData.datasets.map(ds => ({
        ...ds,
        data: indices.map(idx => ds.data[idx]),
        fill: true,
        backgroundColor: ds.backgroundColor,
        borderColor: ds.borderColor,
        label: ds.label,
      })),
    };
  }, [monthlyStatsData, selectedYear]);

  // Prepare yearly data by aggregating monthlyStatsData
  const yearlyStatsData = useMemo(() => {
    if (!monthlyStatsData || !monthlyStatsData.labels || !monthlyStatsData.datasets) return null;
    // Extract year from each label (format: 'Month YYYY')
    const yearMap = {};
    monthlyStatsData.labels.forEach((label, idx) => {
      const year = label.split(' ').pop();
      if (!yearMap[year]) yearMap[year] = [];
      yearMap[year].push(idx);
    });
    const years = Object.keys(yearMap).sort();
    const datasets = monthlyStatsData.datasets.map(ds => ({
      ...ds,
      data: years.map(year => yearMap[year].reduce((sum, idx) => sum + (ds.data[idx] || 0), 0)),
      backgroundColor: ds.backgroundColor,
      borderColor: ds.borderColor,
      label: ds.label,
    }));
    return {
      labels: years,
      datasets,
    };
  }, [monthlyStatsData]);

  // Agent leaderboard by year (computed from filteredTickets)
  const [agentYear, setAgentYear] = useState<string>('');
  React.useEffect(() => {
    if (allYears.length > 0 && !agentYear) setAgentYear(allYears[allYears.length - 1]);
  }, [allYears, agentYear]);

  const agentLeaderboard = useMemo(() => {
    if (!agentYear) return [] as any[];
    const raw: AgentTicket[] = (Array.isArray(filteredTickets) ? filteredTickets : []).filter((t: any) => {
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      return !isNaN(d.getTime()) && String(d.getFullYear()) === String(agentYear);
    }).map((t: any) => ({
      ticket_id: String(t.id || ''),
      WaktuOpen: t.openTime,
      WaktuCloseTicket: t.closeTime,
      ClosePenanganan: t.closeHandling,
      Penanganan2: t.handling2,
      OpenBy: t.openBy || t.name || 'Unknown',
      status: t.status,
    }));
    const sanitized = sanitizeTickets(raw);
    const metrics = calcAllMetrics(sanitized);
    
    // Gunakan perhitungan score yang sama dengan AgentAnalytics
    const maxTicket = Math.max(...metrics.map(m => m.vol || 0), 1);
    
    function normalizePositive(actual: number, target: number) {
      return Math.min((actual / target) * 100, 120);
    }
    function normalizeNegative(actual: number, target: number) {
      if (!actual) return 0;
      return Math.min((target / actual) * 100, 120);
    }
    function scoreBacklog(backlog: number) {
      if (backlog === 0) return 100;
      if (backlog <= 10) return Math.max(100 - backlog * 5, 0);
      return 0;
    }
    function scoreTicket(ticket: number, maxTicket: number) {
      if (!maxTicket) return 100;
      return Math.min((ticket / maxTicket) * 100, 120);
    }
    function calculateAgentScore(agent: any, maxTicket: number) {
      const fcrScore = normalizePositive(agent.fcr, 75) * 0.3;
      const slaScore = normalizePositive(agent.sla, 85) * 0.25;
      const frtScore = normalizeNegative(agent.frt, 60) * 0.15; // Target 60 minutes
      const artScore = normalizeNegative(agent.art, 1440) * 0.15; // Target 1440 minutes
      const backlogScore = scoreBacklog(agent.backlog) * 0.05;
      const ticketScore = scoreTicket(agent.vol, maxTicket) * 0.10;
      return fcrScore + slaScore + frtScore + artScore + backlogScore + ticketScore;
    }
    
    return metrics
      .map(m => {
        const score = Math.round(calculateAgentScore(m, maxTicket));
        return {
          agent: m.agent,
          tickets: m.vol,
          slaPct: m.sla,
          frtAvg: m.frt,
          artAvg: m.art,
          score: score,
          grade: rankBand(score),
        };
      })
      .sort((a,b)=> b.score - a.score)
      .slice(0, 10);
  }, [filteredTickets, agentYear, allYears]);

  // Get latest value for badge display
  const latestMonthlyValue = useMemo(() => {
    if (!filteredMonthlyStatsData || !filteredMonthlyStatsData.datasets || filteredMonthlyStatsData.datasets.length === 0) return null;
    const ds = filteredMonthlyStatsData.datasets[0];
    const lastIdx = ds.data.length - 1;
    return typeof ds.data[lastIdx] === 'number' ? ds.data[lastIdx] : null;
  }, [filteredMonthlyStatsData]);
  const latestYearlyValue = useMemo(() => {
    if (!yearlyStatsData || !yearlyStatsData.datasets || yearlyStatsData.datasets.length === 0) return null;
    const ds = yearlyStatsData.datasets[0];
    const lastIdx = ds.data.length - 1;
    return typeof ds.data[lastIdx] === 'number' ? ds.data[lastIdx] : null;
  }, [yearlyStatsData]);

  // Helper: convert chart.js-like data to recharts format
  function toRechartsData(labels: string[], datasets: any[]) {
    // Assume 2 datasets: [incoming, closed]
    return labels.map((label, i) => ({
      label,
      incoming: datasets[0]?.data[i] ?? 0,
      closed: datasets[1]?.data[i] ?? 0,
    }));
  }

  // Helper: normalize agent name for photo lookup
  function getAgentPhotoPath(agentName: string): string {
    // Special handling for Difa' Fathir Aditya
    if (agentName.includes('Difa')) {
      return `/agent-photos/Difa' Fathir Aditya.png`;
    }
    
    // For other agents, use the original name
    return `/agent-photos/${agentName}.png`;
  }

  // Helper: get agent initials for avatar fallback
  function getAgentInitials(agentName: string): string {
    if (!agentName) return '?';
    const names = agentName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return agentName[0]?.toUpperCase() || '?';
  }

  // Incident trends data
  const incidentTrendsData = useMemo(() => {
    if (!allIncidents || allIncidents.length === 0) return [];
    
    const monthlyData = allIncidents.reduce((acc, inc) => {
      if (!inc.startTime) return acc;
      const date = new Date(inc.startTime);
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const key = `${month} ${year}`;
      
      if (!acc[key]) acc[key] = { month: key, incidents: 0, resolved: 0, avgDuration: 0, durations: [] };
      acc[key].incidents++;
      acc[key].durations.push(inc.durationMin || 0);
      
      if (inc.status?.toLowerCase() === 'done') {
        acc[key].resolved++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(monthlyData).map(item => ({
      ...item,
      avgDuration: item.durations.length > 0 ? item.durations.reduce((a: number, b: number) => a + b, 0) / item.durations.length : 0,
      resolutionRate: item.incidents > 0 ? (item.resolved / item.incidents) * 100 : 0
    })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [allIncidents]);

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-card-foreground">
            Summary Dashboard
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Comprehensive overview of ticket management and incident analytics performance
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
      {/* KPI Row 1 - Ticket Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          icon={<FlashOnIcon className="w-5 h-5 text-white" />}
          iconBg="bg-indigo-500"
          title="Total Tickets"
          value={stats[0]?.value || '-'}
          description={stats[0]?.description || ''}
        />
        <SummaryCard
          icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
          iconBg="bg-green-500"
          title="Closed Tickets"
          value={stats[2]?.value || '-'}
          description={stats[2]?.description || '100% resolution rate'}
        />
        <SummaryCard
          icon={<AccessTimeIcon className="w-5 h-5 text-white" />}
          iconBg="bg-amber-500"
          title="Avg Duration"
          value={stats[1]?.value ? `${Math.round(parseFloat(stats[1].value))}m` : '-'}
          description="average resolution time"
        />
        <SummaryCard
          icon={<GroupIcon className="w-5 h-5 text-white" />}
          iconBg="bg-sky-500"
          title="Active Agents"
          value={stats[3]?.value || '-'}
          description={stats[3]?.description || 'handling tickets'}
        />
      </div>

      {/* KPI Row 2 - Ticket Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
          iconBg="bg-green-500"
          title="Closed Rate"
          value={kpis.closedRate}
          description="closed / total"
        />
        <SummaryCard
          icon={<TimerIcon className="w-5 h-5 text-white" />}
          iconBg="bg-cyan-500"
          title="SLA ≤ 24h"
          value={kpis.slaPct}
          description="percentage closed within 24h"
        />
        <SummaryCard
          icon={<TimerIcon className="w-5 h-5 text-white" />}
          iconBg="bg-blue-500"
          title="Avg FRT"
          value={`${Math.round(kpis.frtAvg)}m`}
          description="first response time"
        />
        <SummaryCard
          icon={<TimerIcon className="w-5 h-5 text-white" />}
          iconBg="bg-indigo-500"
          title="Avg ART"
          value={`${Math.round(kpis.artAvg)}m`}
          description="resolution time"
        />
      </div>

      {/* KPI Row 3 - Incident Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          icon={<WarningIcon className="w-5 h-5 text-white" />}
          iconBg="bg-orange-500"
          title="Total Incidents"
          value={incidentStats.total.toLocaleString()}
          description="network incidents"
        />
        <SummaryCard
          icon={<ScienceIcon className="w-5 h-5 text-white" />}
          iconBg="bg-purple-500"
          title="NCAL Compliance"
          value={`${incidentStats.ncalCompliance.toFixed(1)}%`}
          description="within SLA targets"
        />
        <SummaryCard
          icon={<LocationOnIcon className="w-5 h-5 text-white" />}
          iconBg="bg-emerald-500"
          title="Site Reliability"
          value={`${incidentStats.siteReliability.toFixed(1)}%`}
          description="site performance"
        />
        <SummaryCard
          icon={<TrendingUpIcon className="w-5 h-5 text-white" />}
          iconBg="bg-blue-500"
          title="Vendor Performance"
          value={`${incidentStats.vendorPerformance.toFixed(1)}%`}
          description="vendor SLA compliance"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Monthly Ticket Trends */}
        <Card className="p-2">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-1">
            <div className="flex flex-col gap-1">
              <CardTitle className="font-extrabold text-lg">Tickets per Month</CardTitle>
              {latestMonthlyValue !== null && (
                <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">Latest: {latestMonthlyValue}</Badge>
              )}
            </div>
            <div className="mt-2 md:mt-0">
              <select
                className="rounded px-2 py-1 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedYear as string}
                onChange={e => setSelectedYear(e.target.value)}
              >
                {allYears.map(year => (
                  <option key={year as string} value={year as string}>{year as string}</option>
                ))}
              </select>
            </div>
          </CardHeader>
                      <CardContent className="p-6">
              {filteredMonthlyStatsData && filteredMonthlyStatsData.labels && filteredMonthlyStatsData.labels.length > 0 ? (
                <div className="aspect-video">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={toRechartsData(filteredMonthlyStatsData.labels, filteredMonthlyStatsData.datasets)} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="label" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={8} 
                        minTickGap={24}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={8} 
                        minTickGap={24}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          color: '#374151'
                        }}
                      />
                      <RechartsLegend />
                      <Area type="monotone" dataKey="incoming" stroke="#6366F1" fill="url(#colorIncoming)" name="Incoming Tickets" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="closed" stroke="#22C55E" fill="url(#colorClosed)" name="Closed Tickets" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">No data for this chart</div>
              )}
            </CardContent>
        </Card>

        {/* Incident Trends */}
        <Card className="p-2">
          <CardHeader className="flex flex-col gap-1 pb-1">
            <CardTitle className="font-extrabold text-lg">Incident Trends</CardTitle>
            <Badge className="bg-orange-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">
              Total: {incidentStats.total}
            </Badge>
          </CardHeader>
          <CardContent className="p-6">
            {incidentTrendsData.length > 0 ? (
              <div className="aspect-video">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incidentTrendsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      color: '#374151'
                    }}
                  />
                  <RechartsLegend />
                  <Line type="monotone" dataKey="incidents" stroke="#F59E0B" strokeWidth={2} name="Incidents" />
                  <Line type="monotone" dataKey="resolutionRate" stroke="#10B981" strokeWidth={2} name="Resolution Rate %" />
                </LineChart>
              </ResponsiveContainer>
                </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">No incident data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Yearly Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Yearly Ticket Trends */}
        <Card className="p-2">
          <CardHeader className="flex flex-col gap-1 pb-1">
            <CardTitle className="font-extrabold text-lg">Tickets per Year</CardTitle>
            {latestYearlyValue !== null && (
              <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">Latest: {latestYearlyValue}</Badge>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {yearlyStatsData && yearlyStatsData.labels && yearlyStatsData.labels.length > 0 ? (
              <div className="aspect-video">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={toRechartsData(yearlyStatsData.labels, yearlyStatsData.datasets)} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncomingY" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorClosedY" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="label" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    minTickGap={24}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    minTickGap={24}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      color: '#374151'
                    }}
                  />
                  <RechartsLegend />
                  <Area type="monotone" dataKey="incoming" stroke="#6366F1" fill="url(#colorIncomingY)" name="Incoming Tickets" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="closed" stroke="#22C55E" fill="url(#colorClosedY)" name="Closed Tickets" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
                </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">No data for this chart</div>
            )}
          </CardContent>
        </Card>

        {/* NCAL Performance */}
        <Card className="p-2">
          <CardHeader className="flex flex-col gap-1 pb-1">
            <CardTitle className="font-extrabold text-lg">NCAL Performance</CardTitle>
            <Badge className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">
              Compliance: {incidentStats.ncalCompliance.toFixed(1)}%
            </Badge>
          </CardHeader>
          <CardContent className="p-6">
            {allIncidents && allIncidents.length > 0 ? (
              <div className="aspect-video">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(calculateIncidentStats(allIncidents).ncalCounts).map(([ncal, count]) => ({
                  ncal,
                  count,
                                     compliance: allIncidents.filter(inc => {
                     const incNcal = normalizeNCAL(inc.ncal);
                     if (incNcal !== ncal) return false;
                     const duration = inc.durationMin || 0;
                     const targets: Record<string, number> = { 'NCAL1': 60, 'NCAL2': 120, 'NCAL3': 240, 'NCAL4': 480 };
                     return duration <= (targets[ncal] || 240);
                   }).length / (count as number) * 100
                }))} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="ncal" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <RechartsTooltip 
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      color: '#374151'
                    }}
                  />
                  <RechartsLegend />
                  <Bar dataKey="count" fill="#8B5CF6" name="Incidents" />
                  <Bar dataKey="compliance" fill="#10B981" name="Compliance %" />
                </BarChart>
              </ResponsiveContainer>
                </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">No incident data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Agent Leaderboard - Card Layout */}
      <Card className="p-2">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-1">
          <CardTitle className="font-extrabold text-lg">Agent Leaderboard</CardTitle>
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              value={agentYear}
              onChange={e=>setAgentYear(e.target.value)}
            >
              {allYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentLeaderboard.map((row, i) => (
              <div 
                key={row.agent} 
                className={`relative bg-gradient-to-br rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                  i === 0 
                    ? 'from-yellow-400 to-orange-500 text-white' 
                    : i === 1 
                    ? 'from-slate-400 to-slate-600 text-white'
                    : i === 2 
                    ? 'from-amber-600 to-orange-600 text-white'
                    : 'from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-700 text-gray-900 dark:text-gray-100'
                }`}
              >
                {/* Rank Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <span className="font-bold text-lg">#{i+1}</span>
                  {i < 3 && (
                    <EmojiEventsIcon 
                      className={`${i === 0 ? 'text-amber-200' : i === 1 ? 'text-gray-200' : 'text-orange-200'}`} 
                      sx={{ fontSize: 20 }} 
                    />
                  )}
                </div>

                {/* Agent Info */}
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className={`w-16 h-16 border-4 ${
                    i < 3 ? 'border-white/30' : 'border-gray-200 dark:border-gray-600'
                  }`}>
                    <AvatarImage 
                      src={getAgentPhotoPath(row.agent)} 
                      alt={row.agent}
                      className="object-cover"
                    />
                    <AvatarFallback className={`font-bold text-lg ${
                      i < 3 ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                    }`}>
                      {getAgentInitials(row.agent)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg truncate ${
                      i < 3 ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {row.agent}
                    </h3>
                    <p className={`text-sm opacity-80 ${
                      i < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {row.tickets} tickets • {row.slaPct.toFixed(1)}% SLA
                    </p>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      i < 3 ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {row.tickets.toLocaleString()}
                    </div>
                    <div className={`text-xs opacity-80 ${
                      i < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Tickets
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      i < 3 
                        ? 'text-white' 
                        : row.slaPct >= 85 ? 'text-green-600' : row.slaPct >= 70 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {row.slaPct.toFixed(1)}%
                    </div>
                    <div className={`text-xs opacity-80 ${
                      i < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      SLA
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      i < 3 
                        ? 'text-white' 
                        : row.frtAvg <= 60 ? 'text-green-600' : row.frtAvg <= 120 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {row.frtAvg.toFixed(0)}m
                    </div>
                    <div className={`text-xs opacity-80 ${
                      i < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      FRT
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      i < 3 
                        ? 'text-white' 
                        : row.artAvg <= 1440 ? 'text-green-600' : row.artAvg <= 2880 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {row.artAvg.toFixed(0)}m
                    </div>
                    <div className={`text-xs opacity-80 ${
                      i < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      ART
                    </div>
                  </div>
                </div>

                {/* Score & Grade */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-center">
                    <div className={`text-xl font-bold ${
                      i < 3 
                        ? 'text-white' 
                        : row.score >= 80 ? 'text-green-600' : row.score >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {row.score.toFixed(1)}
                    </div>
                    <div className={`text-xs opacity-80 ${
                      i < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Score
                    </div>
                  </div>
                  <div className="text-center">
                    <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${
                      row.grade === 'A' 
                        ? 'bg-green-600 text-white' 
                        : row.grade === 'B' 
                        ? 'bg-blue-600 text-white' 
                        : row.grade === 'C' 
                        ? 'bg-amber-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {row.grade}
                    </span>
                    <div className={`text-xs opacity-80 mt-1 ${
                      i < 3 ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      Grade
                    </div>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="mt-4">
                  <div className={`w-full bg-opacity-20 rounded-full h-2 ${
                    i < 3 ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-600'
                  }`}>
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        i < 3 
                          ? 'bg-white/80' 
                          : row.score >= 80 ? 'bg-green-600' : row.score >= 60 ? 'bg-amber-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(row.score, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {agentLeaderboard.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">
                No data available for selected year
              </div>
            )}
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

export default SummaryDashboard; 