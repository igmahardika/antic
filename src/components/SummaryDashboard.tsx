import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SummaryCard from '@/components/ui/SummaryCard';
import { CheckCircle2, Clock3, Users, Timer, Zap, Trophy } from 'lucide-react';
import { sanitizeTickets, calcAllMetrics, Ticket as AgentTicket, rank as rankBand } from '@/utils/agentKpi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend as RechartsLegend, Tooltip as RechartsTooltip } from 'recharts';

const SummaryDashboard = ({ ticketAnalyticsData, filteredTickets }: any) => {
  // Prepare monthly data
  const monthlyStatsData = ticketAnalyticsData?.monthlyStatsData;
  const stats = ticketAnalyticsData?.stats || [];

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

  return (
    <div className="grid grid-cols-1 gap-8">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Zap />}
          iconBg="bg-indigo-500"
          title="Total Tickets"
          value={stats[0]?.value || '-'}
          description={stats[0]?.description || ''}
        />
        <SummaryCard
          icon={<CheckCircle2 />}
          iconBg="bg-emerald-500"
          title="Closed Tickets"
          value={stats[2]?.value || '-'}
          description={stats[2]?.description || '100% resolution rate'}
        />
        <SummaryCard
          icon={<Clock3 />}
          iconBg="bg-amber-500"
          title="Avg Duration"
          value={stats[1]?.value || '-'}
          description="average resolution time"
        />
        <SummaryCard
          icon={<Users />}
          iconBg="bg-sky-500"
          title="Active Agents"
          value={stats[3]?.value || '-'}
          description={stats[3]?.description || 'handling tickets'}
        />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<CheckCircle2 />}
          iconBg="bg-emerald-500"
          title="Closed Rate"
          value={kpis.closedRate}
          description="closed / total"
        />
        <SummaryCard
          icon={<Timer />}
          iconBg="bg-cyan-500"
          title="SLA ≤ 24h"
          value={kpis.slaPct}
          description="percentage closed within 24h"
        />
        <SummaryCard
          icon={<Timer />}
          iconBg="bg-rose-500"
          title="Avg FRT (min)"
          value={kpis.frtAvg.toFixed(1)}
          description="first response time"
        />
        <SummaryCard
          icon={<Timer />}
          iconBg="bg-violet-500"
          title="Avg ART (min)"
          value={kpis.artAvg.toFixed(1)}
          description="resolution time"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Monthly Area Chart */}
      <Card className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl border p-2">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-1">
          <div className="flex flex-col gap-1">
            <CardTitle className="font-extrabold text-xl text-zinc-900 dark:text-zinc-100">Tickets per Month</CardTitle>
            {latestMonthlyValue !== null && (
              <Badge className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full w-fit font-semibold shadow-md">Latest: {latestMonthlyValue}</Badge>
            )}
          </div>
          <div className="mt-2 md:mt-0">
            <select
              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedYear as string}
              onChange={e => setSelectedYear(e.target.value)}
            >
              {allYears.map(year => (
                <option key={year as string} value={year as string}>{year as string}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="pl-2">
          {filteredMonthlyStatsData && filteredMonthlyStatsData.labels && filteredMonthlyStatsData.labels.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={toRechartsData(filteredMonthlyStatsData.labels, filteredMonthlyStatsData.datasets)} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip />
                <RechartsLegend />
                <Area type="monotone" dataKey="incoming" stroke="#6366F1" fill="url(#colorIncoming)" name="Incoming Tickets" strokeWidth={3} />
                <Area type="monotone" dataKey="closed" stroke="#22C55E" fill="url(#colorClosed)" name="Closed Tickets" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-12">No data for this chart</div>
          )}
        </CardContent>
      </Card>
      {/* Yearly Area Chart */}
      <Card className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl border p-2">
        <CardHeader className="flex flex-col gap-1 pb-1">
          <CardTitle className="font-extrabold text-xl text-zinc-900 dark:text-zinc-100">Tickets per Year</CardTitle>
          {latestYearlyValue !== null && (
            <Badge className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full w-fit font-semibold shadow-md">Latest: {latestYearlyValue}</Badge>
          )}
        </CardHeader>
        <CardContent className="pl-2">
          {yearlyStatsData && yearlyStatsData.labels && yearlyStatsData.labels.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={toRechartsData(yearlyStatsData.labels, yearlyStatsData.datasets)} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncomingY" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorClosedY" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip />
                <RechartsLegend />
                <Area type="monotone" dataKey="incoming" stroke="#6366F1" fill="url(#colorIncomingY)" name="Incoming Tickets" strokeWidth={3} />
                <Area type="monotone" dataKey="closed" stroke="#22C55E" fill="url(#colorClosedY)" name="Closed Tickets" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-12">No data for this chart</div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Agent Leaderboard (per Year) */}
      <Card className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl border p-2">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-1">
          <CardTitle className="font-extrabold text-xl text-zinc-900 dark:text-zinc-100">Agent Leaderboard</CardTitle>
          <div className="flex items-center gap-2">
            <select
              className="border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              value={agentYear}
              onChange={e=>setAgentYear(e.target.value)}
            >
              {allYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-gray-100 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-16">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 min-w-[180px]">Agent</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 w-20">Tickets</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 w-20">SLA%</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 w-24">Avg FRT</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 w-24">Avg ART</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 w-20">Score</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 w-16">Grade</th>
                </tr>
              </thead>
              <tbody>
                {agentLeaderboard.map((row, i)=> (
                  <tr key={row.agent} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors duration-200">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100">#{i+1}</span>
                      {i < 3 && (
                        <Trophy 
                          className={`${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : 'text-orange-400'}`} 
                          size={18} 
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                      {row.agent}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                      {row.tickets.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                      {row.slaPct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                      {row.frtAvg.toFixed(1)}m
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                      {row.artAvg.toFixed(1)}m
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                      {row.score.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold min-w-[32px] ${
                        row.grade === 'A' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                          : row.grade === 'B' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                          : row.grade === 'C' 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                      }`}>
                        {row.grade}
                      </span>
                    </td>
                  </tr>
                ))}
                {agentLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                      No data available for selected year
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryDashboard; 