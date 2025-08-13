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

  // Derived KPIs
  const kpis = useMemo(() => {
    const total = filteredTickets?.length || 0;
    const closed = (filteredTickets || []).filter((t: any) => (t.status || '').trim().toLowerCase() === 'closed').length;
    const closedRate = total > 0 ? ((closed / total) * 100).toFixed(1) + '%' : '0%';
    // SLA: close within 24h
    const slaClosed = (filteredTickets || []).filter((t: any) => {
      if (!t.openTime || !t.closeTime) return false;
      const d1 = new Date(t.openTime); const d2 = new Date(t.closeTime);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
      const diffMin = Math.abs(d2.getTime() - d1.getTime()) / 60000;
      return diffMin <= 1440;
    }).length;
    const slaPct = total > 0 ? ((slaClosed / total) * 100).toFixed(1) + '%' : '0%';
    // FRT/ART average in minutes if fields exist
    const frtVals: number[] = [];
    const artVals: number[] = [];
    (filteredTickets || []).forEach((t: any) => {
      if (t.openTime && t.closeHandling) {
        const a = new Date(t.openTime); const b = new Date(t.closeHandling);
        if (!isNaN(a.getTime()) && !isNaN(b.getTime())) frtVals.push(Math.abs(b.getTime() - a.getTime()) / 60000);
      }
      if (t.openTime && t.closeTime) {
        const a = new Date(t.openTime); const b = new Date(t.closeTime);
        if (!isNaN(a.getTime()) && !isNaN(b.getTime())) artVals.push(Math.abs(b.getTime() - a.getTime()) / 60000);
      }
    });
    const avg = (arr: number[]) => arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    const frtAvg = avg(frtVals);
    const artAvg = avg(artVals);
    const backlog = (filteredTickets || []).filter((t: any) => ((t.status || '').trim().toLowerCase() !== 'closed') && !t.closeTime).length;
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
    return metrics
      .map(m => ({
        agent: m.agent,
        tickets: m.vol,
        closed: Math.round((m.sla/100)*m.vol), // approximation; detailed closed count not in metric
        slaPct: m.sla,
        frtAvg: m.frt,
        artAvg: m.art,
        score: m.score,
        grade: rankBand(m.score),
      }))
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
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-zinc-900 dark:via-zinc-800/50 dark:to-zinc-700/50 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 dark:border-zinc-800 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-zinc-800/50 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur-lg opacity-20"></div>
                <div className="relative p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent">
                  Agent Leaderboard
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                  Top performing agents • Year {agentYear}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  className="appearance-none bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
                  value={agentYear}
                  onChange={e=>setAgentYear(e.target.value)}
                >
                  {allYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-gray-50 via-blue-50/50 to-purple-50/50 dark:from-zinc-800 dark:via-zinc-700/50 dark:to-zinc-600/50 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-600">
                  <th className="px-6 py-4 text-left font-bold text-gray-700 dark:text-gray-200 tracking-wide">Rank</th>
                  <th className="px-6 py-4 text-left font-bold text-gray-700 dark:text-gray-200 tracking-wide">Agent</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-200 tracking-wide">Tickets</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-200 tracking-wide">SLA%</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-200 tracking-wide">FRT (m)</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-200 tracking-wide">ART (m)</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-200 tracking-wide">Score</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-200 tracking-wide">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {agentLeaderboard.map((row, i)=> (
                  <tr key={row.agent} className={`group hover:bg-gradient-to-r hover:from-blue-50/60 hover:via-purple-50/40 hover:to-blue-50/60 dark:hover:from-blue-900/20 dark:hover:via-purple-900/10 dark:hover:to-blue-900/20 transition-all duration-300 ${
                    i < 3 ? 'bg-gradient-to-r from-amber-50/40 via-yellow-50/30 to-amber-50/40 dark:from-amber-900/10 dark:via-yellow-900/5 dark:to-amber-900/10' : 
                    i % 2 === 0 ? 'bg-gray-50/30 dark:bg-zinc-800/20' : ''
                  }`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`relative flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm shadow-lg transform group-hover:scale-105 transition-transform duration-200 ${
                          i === 0 ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-white shadow-amber-200 dark:shadow-amber-900/50' :
                          i === 1 ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-white shadow-gray-200 dark:shadow-gray-900/50' :
                          i === 2 ? 'bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600 text-white shadow-orange-200 dark:shadow-orange-900/50' :
                          'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-600 text-gray-600 dark:text-gray-300 shadow-gray-100 dark:shadow-zinc-900/50'
                        }`}>
                          <span className="relative z-10">{i+1}</span>
                          {i === 0 && (
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full blur-md opacity-30 animate-pulse"></div>
                          )}
                        </div>
                        {i < 3 && (
                          <div className="flex items-center">
                            <Trophy className={`h-5 w-5 ${
                              i === 0 ? 'text-amber-500 drop-shadow-sm' : 
                              i === 1 ? 'text-gray-400 drop-shadow-sm' : 
                              'text-orange-500 drop-shadow-sm'
                            }`} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <div className="font-bold text-gray-900 dark:text-gray-100 truncate max-w-36 text-base">
                          {row.agent}
                        </div>
                        {i < 3 && (
                          <div className={`text-xs font-semibold mt-1 ${
                            i === 0 ? 'text-amber-600 dark:text-amber-400' :
                            i === 1 ? 'text-gray-500 dark:text-gray-400' :
                            'text-orange-600 dark:text-orange-400'
                          }`}>
                            {i === 0 ? '🏆 Champion' : i === 1 ? '🥈 Runner Up' : '🥉 Third Place'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center px-3 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-800 dark:text-blue-200 shadow-sm">
                        {row.tickets}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`font-mono font-bold text-base ${
                          row.slaPct >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                          row.slaPct >= 80 ? 'text-blue-600 dark:text-blue-400' :
                          row.slaPct >= 70 ? 'text-amber-600 dark:text-amber-400' :
                          'text-rose-600 dark:text-rose-400'
                        }`}>
                          {row.slaPct.toFixed(1)}%
                        </span>
                        <div className="w-16 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${
                              row.slaPct >= 90 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' :
                              row.slaPct >= 80 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                              row.slaPct >= 70 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                              'bg-gradient-to-r from-rose-400 to-rose-600'
                            }`}
                            style={{ width: `${Math.min(100, row.slaPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-mono text-gray-700 dark:text-gray-300 font-medium">
                        {row.frtAvg.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="font-mono text-gray-700 dark:text-gray-300 font-medium">
                        {row.artAvg.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="font-mono font-bold text-base text-gray-900 dark:text-gray-100">
                          {row.score.toFixed(1)}
                        </span>
                        <div className="w-20 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 via-purple-600 to-blue-700 rounded-full transition-all duration-500 ease-out shadow-sm"
                            style={{ width: `${Math.min(100, row.score)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-lg transform group-hover:scale-105 transition-all duration-200 ${
                        row.grade === 'A' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-200 dark:shadow-emerald-900/50' :
                        row.grade === 'B' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-200 dark:shadow-blue-900/50' :
                        row.grade === 'C' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-200 dark:shadow-amber-900/50' :
                        'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-rose-200 dark:shadow-rose-900/50'
                      }`}>
                        {row.grade}
                      </span>
                    </td>
                  </tr>
                ))}
                {agentLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-700 dark:to-zinc-600 rounded-full blur-lg opacity-50"></div>
                          <div className="relative p-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700 rounded-full">
                            <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                          </div>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-1">No agent data available</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500">Upload ticket data to see the leaderboard</p>
                        </div>
                      </div>
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