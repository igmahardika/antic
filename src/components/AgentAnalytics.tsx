import React, { useMemo, useState } from 'react';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { BookUser, Trophy, Zap, Users, ArrowUpRight, ArrowDownRight, Clock, Award, BarChart, Inbox, Star, UserCheck, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentStore } from '@/store/agentStore';
import { useAnalytics } from './AnalyticsContext';
import SummaryCard from './ui/SummaryCard';
import TimeFilter from './TimeFilter';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import BarChartIcon from '@mui/icons-material/BarChart';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend as RechartsLegend } from 'recharts';

// Define the structure of the data this component will receive
export interface AgentAnalyticsData {
  agentName: string;
  ticketCount: number;
  totalDurationFormatted: string;
  avgDurationFormatted: string;
  minDurationFormatted: string;
  maxDurationFormatted: string;
}

const getTrendPercentage = (dataArr) => {
  if (!dataArr || dataArr.length < 2) return null;
  const prev = dataArr[dataArr.length - 2];
  const curr = dataArr[dataArr.length - 1];
  if (prev === 0) return null;
  const percent = ((curr - prev) / Math.abs(prev)) * 100;
  return percent;
};

// Tambahkan array warna untuk icon dan trendline
const AGENT_COLORS = [
  'text-blue-500', 'text-green-500', 'text-orange-500', 'text-purple-500', 'text-red-500',
  'text-pink-500', 'text-teal-500', 'text-yellow-500', 'text-indigo-500', 'text-emerald-500'
];
const TREND_COLORS = [
  '#6366F1', '#22C55E', '#F59E42', '#8B5CF6', '#EF4444', '#F472B6', '#14B8A6', '#EAB308', '#0EA5E9', '#10B981'
];

const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Helper to convert agent trend data to recharts format
function toRechartsAgentTrend(labels: string[], datasets: { label: string, data: number[], color?: string }[]) {
  // Each dataset is an agent, each label is a month
  return labels.map((label, i) => {
    const entry: any = { label };
    datasets.forEach(ds => {
      entry[ds.label] = ds.data[i];
    });
    return entry;
  });
}

// Custom Tooltip for AreaChart
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900/95 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 p-4 max-h-52 overflow-y-auto min-w-[180px] text-xs" style={{ fontSize: '12px', lineHeight: '1.5' }}>
      <div className="font-bold text-sm mb-2 text-gray-900 dark:text-gray-100">{label}</div>
      <ul className="space-y-1">
        {payload.map((entry, idx) => (
          <li key={idx} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: entry.color }}></span>
            <span className="font-semibold" style={{ color: entry.color }}>{entry.name}:</span>
            <span className="ml-1 font-mono text-gray-800 dark:text-gray-200">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const AgentAnalytics = () => {
  const {
    agentAnalyticsData,
    startMonth, setStartMonth,
    endMonth, setEndMonth,
    selectedYear, setSelectedYear,
    allYearsInData
  } = useAnalytics();
  const data = agentAnalyticsData;
  const agentMetrics = useAgentStore(state => state.agentMetrics);

  // Ganti monthOptions agar selalu 12 bulan
  const monthOptions = MONTH_OPTIONS;

  // Calculate global summary metrics
  const summaryKpi = useMemo(() => {
    if (!agentMetrics || agentMetrics.length === 0) return null;
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      avgFRT: avg(agentMetrics.map(m => m.frt)),
      avgART: avg(agentMetrics.map(m => m.art)),
      avgFCR: avg(agentMetrics.map(m => m.fcr)),
      avgSLA: avg(agentMetrics.map(m => m.sla)),
    };
  }, [agentMetrics]);

  // Prepare per-agent monthly data for trendline (for recharts)
  const rechartsAgentTrendData = useMemo(() => {
    if (!data || !data.agentMonthlyChart || !Array.isArray(data.agentMonthlyChart.datasets)) return [];
    return toRechartsAgentTrend(data.agentMonthlyChart.labels, data.agentMonthlyChart.datasets);
  }, [data]);
  const agentTrendDatasets = data?.agentMonthlyChart?.datasets || [];
  const agentTrendLabels = data?.agentMonthlyChart?.labels || [];

  // Filtering logic for all years
  let filteredAgentList = [];
  if (data && Array.isArray(data.agentList)) {
    if (selectedYear === 'ALL') {
      filteredAgentList = data.agentList;
    } else {
      filteredAgentList = data.agentList; // You can add more granular filtering if needed
    }
  }
  const isDataReady = data && data.summary && filteredAgentList.length > 0;
  if (!isDataReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Agent Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Analisis performa dan aktivitas agent dalam menangani tiket pada periode terpilih.</p>
        <BookUser className="w-16 h-16 mb-4" />
        <h3 className="text-xl md:text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">No agent data available</h3>
        <p>Please upload a file to see agent analytics.</p>
      </div>
    );
  }
  const { summary = {}, agentMonthlyChart = {} } = data;
  const sortedAgentList = [...filteredAgentList].sort((a, b) => (b.ticketCount || 0) - (a.ticketCount || 0));

  const summaryCards = [
    { title: 'Total Active Agents', value: summary.totalAgents, icon: GroupIcon, description: 'Agents handling tickets' },
    { title: 'Most Active Agent', value: summary.busiestAgentName, icon: EmojiEventsIcon, description: 'Highest ticket volume' },
    { title: 'Most Efficient Agent', value: summary.mostEfficientAgentName, icon: FlashOnIcon, description: 'Lowest avg. handling time' },
    { title: 'Highest Resolution Rate', value: summary.highestResolutionAgentName, icon: MilitaryTechIcon, description: 'Best ticket closing rate' },
  ];

  return (
    <div className="w-full">
      {/* Page Title & Description */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Agent Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">Analisis performa dan aktivitas agent dalam menangani tiket pada periode terpilih.</p>
      </div>
      <div className="flex justify-center mb-6">
        <TimeFilter
          startMonth={startMonth}
          setStartMonth={setStartMonth}
          endMonth={endMonth}
          setEndMonth={setEndMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          monthOptions={monthOptions}
          allYearsInData={allYearsInData}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
        <SummaryCard
          icon={<HowToRegIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
          label="Total Agents"
          value={summary.totalAgents}
          description="Jumlah agent terdaftar"
          bg="bg-white/60 backdrop-blur-md border border-white/30"
          iconBg="bg-blue-600/90"
        />
        <SummaryCard
          icon={<FlashOnIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
          label="Most Efficient Agent"
          value={summary.mostEfficientAgentName}
          description="Agent dengan waktu penanganan tercepat"
          bg="bg-white/60 backdrop-blur-md border border-white/30"
          iconBg="bg-green-600/90"
        />
        <SummaryCard
          icon={<MilitaryTechIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
          label="Top Performer"
          value={summary.topPerformer}
          description="Agent dengan rank terbaik"
          bg="bg-white/60 backdrop-blur-md border border-white/30"
          iconBg="bg-yellow-600/90"
        />
        <SummaryCard
          icon={<EmojiEventsIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
          label="Most Active Agent"
          value={summary.busiestAgentName}
          description="Agent dengan volume tiket terbanyak"
          bg="bg-white/60 backdrop-blur-md border border-white/30"
          iconBg="bg-purple-600/90"
        />
        <SummaryCard
          icon={<GroupIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
          label="Active Agents"
          value={summary.activeAgents}
          description="Agent yang aktif bulan ini"
          bg="bg-white/60 backdrop-blur-md border border-white/30"
          iconBg="bg-pink-600/90"
        />
      </div>
      {/* Per-Agent Cards with Trendline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sortedAgentList.map((agent, index) => {
          // Find metric for this agent
          const metric = agentMetrics.find(m => m.agent === agent.agentName);

          // Helper: validasi angka
          const safeNum = v => (typeof v === 'number' && !isNaN(v)) ? v : null;
          const safeFixed = v => safeNum(v) !== null ? v.toFixed(1) : '-';

          const durationMetrics = [
            { label: 'Total', value: agent.totalDurationFormatted || '-', description: 'Total Handling Duration' },
            { label: 'Rata-rata', value: agent.avgDurationFormatted || '-', description: 'Average Handling Duration' },
            { label: 'Tercepat', value: agent.minDurationFormatted || '-', description: 'Fastest Handling Duration' },
            { label: 'Terlama', value: agent.maxDurationFormatted || '-', description: 'Longest Handling Duration' },
          ];

          // Rank badge logic
          const rankBadge = metric ? metric.rank : '-';
          const rankTitle = metric ? (
            metric.rank === 'A' ? `Excellent (Score: ${safeFixed(metric.score)})` :
            metric.rank === 'B' ? `Good (Score: ${safeFixed(metric.score)})` :
            metric.rank === 'C' ? `Average (Score: ${safeFixed(metric.score)})` :
            `Needs Improvement (Score: ${safeFixed(metric.score)})`
          ) : 'No data';
          const rankClass = metric ? (
            metric.rank === 'A' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-2 border-green-200 dark:border-green-700' :
            metric.rank === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700' :
            metric.rank === 'C' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border-2 border-yellow-200 dark:border-yellow-700' :
            'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-2 border-red-200 dark:border-red-700'
          ) : 'bg-gray-200 text-gray-500 border-2 border-gray-300';

          // KPI metrics, always show
          const kpiMetrics = [
            { label: 'FRT', value: safeFixed(metric?.frt), icon: AccessTimeIcon },
            { label: 'ART', value: safeFixed(metric?.art), icon: AccessTimeIcon },
            { label: 'FCR', value: metric?.fcr !== undefined && safeNum(metric.fcr) !== null ? `${metric.fcr.toFixed(1)}%` : '-', icon: MilitaryTechIcon },
            { label: 'SLA', value: metric?.sla !== undefined && safeNum(metric.sla) !== null ? `${metric.sla.toFixed(1)}%` : '-', icon: MilitaryTechIcon },
            { label: 'Volume', value: metric?.vol ?? '-', icon: BarChartIcon },
            { label: 'Backlog', value: metric?.backlog ?? '-', icon: MoveToInboxIcon, isRed: true },
          ];

          return (
            <div key={index} className="bg-white/95 dark:bg-zinc-900/95 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-zinc-800 flex flex-col gap-8 transition-all duration-300">
              {/* Agent Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-extrabold text-blue-600 dark:text-blue-400 truncate max-w-[20ch]">{agent.agentName}</h3>
                  <span className="rounded-md px-3 py-1 text-xs sm:text-sm md:text-base font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 truncate max-w-[12ch]">{agent.ticketCount} Tickets</span>
                </div>
                {/* Rank Badge (selalu tampil) */}
                <span
                  className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-xl shadow-inner ${rankClass}`}
                  title={rankTitle}
                >
                  {rankBadge}
                </span>
              </div>
              {/* Duration Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-2">
                {durationMetrics.map(m => (
                  <div key={m.label} className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-4 flex flex-col items-center text-center border border-gray-100 dark:border-zinc-800">
                    <AccessTimeIcon className="w-5 h-5 text-gray-400 mb-2"/>
                    <p className="text-xs md:text-sm text-gray-500 font-semibold break-words">{m.label}</p>
                    <p className="text-base md:text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100 font-mono truncate max-w-[12ch]">{m.value}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1 break-words whitespace-normal">{m.description}</p>
                  </div>
                ))}
              </div>
              {/* KPI Metrics (selalu tampil) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-2">
                {kpiMetrics.map(kpi => (
                  <div key={kpi.label} className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-4 flex flex-col items-center text-center border border-gray-100 dark:border-zinc-800 min-w-[140px]">
                    <kpi.icon className={`w-5 h-5 mb-2 ${kpi.isRed ? 'text-red-500' : 'text-blue-500'}`} />
                    <p className={`text-base md:text-lg lg:text-xl font-bold font-mono truncate max-w-[10ch] ${kpi.isRed ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>{kpi.value}</p>
                    <p className="text-xs text-gray-500 font-semibold mt-1 break-words">{kpi.label}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 break-words whitespace-normal">
                      {kpi.label === 'FRT' && 'Rata-rata waktu respons pertama (menit)'}
                      {kpi.label === 'ART' && 'Rata-rata waktu tiket selesai (menit)'}
                      {kpi.label === 'FCR' && 'Persentase tiket selesai di penanganan pertama'}
                      {kpi.label === 'SLA' && 'Persentase tiket selesai ≤ 24 jam'}
                      {kpi.label === 'Volume' && 'Jumlah tiket yang ditangani'}
                      {kpi.label === 'Backlog' && 'Tiket yang belum selesai'}
                    </p>
                  </div>
                ))}
              </div>
              {/* Score Progress Bar */}
              {metric ? (
                <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${safeNum(metric.score) !== null ? metric.score : 0}%` }}></div>
                </div>
              ) : (
                <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2.5" />
              )}
            </div>
          );
        })}
      </div>
      {/* Trendline Chart for All Agents (pindah ke bawah, solid) */}
      {rechartsAgentTrendData.length > 0 && (
        <Card className="mb-8 mt-16 bg-white dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Agent Ticket Trends per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={rechartsAgentTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {agentTrendDatasets.map((ds, idx) => (
                    <linearGradient key={ds.label} id={`colorAgent${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ds.color || TREND_COLORS[idx % TREND_COLORS.length]} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={ds.color || TREND_COLORS[idx % TREND_COLORS.length]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <RechartsLegend />
                {agentTrendDatasets.map((ds, idx) => (
                  <Area
                    key={ds.label}
                    type="monotone"
                    dataKey={ds.label}
                    stroke={ds.color || TREND_COLORS[idx % TREND_COLORS.length]}
                    fill={`url(#colorAgent${idx})`}
                    name={ds.label}
                    strokeWidth={3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgentAnalytics; 