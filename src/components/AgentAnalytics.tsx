import React, { useMemo, useState, useEffect } from 'react';
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
import { shallow } from 'zustand/shallow';
import type { AgentMetric } from '@/utils/agentKpi';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

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
const CustomTooltip = ({ active = false, payload = [], label = '' } = {}) => {
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
  const agentMetrics = useAgentStore((state) => state.agentMetrics) as AgentMetric[];

  useEffect(() => {
    console.log('Agent Metrics DEBUG:', agentMetrics);
  }, [agentMetrics]);

  // Ganti monthOptions agar selalu 12 bulan
  const monthOptions = MONTH_OPTIONS;

  // Calculate global summary metrics
  const summaryKpi = useMemo(() => {
    if (!agentMetrics || agentMetrics.length === 0) return null;
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      avgFRT: avg(agentMetrics.map(m => m.frt)),
      avgART: avg(agentMetrics.map(m => m.art)),
      avgFCR: avg(agentMetrics.map(m => m.fcr)),
      avgSLA: avg(agentMetrics.map(m => m.sla)),
      avgVol: avg(agentMetrics.map(m => m.vol)),
      avgBacklog: avg(agentMetrics.map(m => m.backlog)),
    };
  }, [agentMetrics]);

  // Prepare per-agent monthly data for trendline (for recharts)
  const rechartsAgentTrendData = useMemo(() => {
    if (!data || !data.agentMonthlyChart || !Array.isArray(data.agentMonthlyChart.datasets)) return [];
    return toRechartsAgentTrend(data.agentMonthlyChart.labels, data.agentMonthlyChart.datasets);
  }, [data]);
  const agentTrendDatasets: { label: string; data: number[]; color?: string }[] = data?.agentMonthlyChart?.datasets || [];
  const agentTrendLabels: string[] = data?.agentMonthlyChart?.labels || [];

  const [debouncedTrendData, setDebouncedTrendData] = useState<any[]>([]);
  const [debouncedDatasets, setDebouncedDatasets] = useState<{ label: string; data: number[]; color?: string }[]>([]);

  // Debounce & windowing for trend data
  useEffect(() => {
    const timer = setTimeout(() => {
      // Windowing: hanya render 24 data terakhir (misal: 2 tahun jika bulanan)
      const windowedLabels = agentTrendLabels.slice(-24);
      const windowedDatasets = agentTrendDatasets.map(ds => ({
        ...ds,
        data: ds.data.slice(-24)
      }));
      setDebouncedTrendData(toRechartsAgentTrend(windowedLabels, windowedDatasets));
      setDebouncedDatasets(windowedDatasets);
    }, 300);
    return () => clearTimeout(timer);
  }, [agentTrendLabels, agentTrendDatasets]);

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

  const safeAgentMetrics = Array.isArray(agentMetrics) ? agentMetrics : [];

  // Helper: validasi angka
  const safeNum = v => (typeof v === 'number' && !isNaN(v)) ? v : null;
  const safeFixed = v => safeNum(v) !== null ? v.toFixed(1) : '-';

  const [excelAgentData, setExcelAgentData] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      const processed = transformExcelData(jsonData);
      setExcelAgentData(processed);
    };
    reader.readAsArrayBuffer(file);
  };

  function formatDurationDHM(minutes: number) {
    if (!minutes || isNaN(minutes)) return '-';
    const d = dayjs.duration(minutes, 'minutes');
    const h = d.hours();
    const m = d.minutes();
    return `${h > 0 ? h + 'h ' : ''}${m}m`;
  }

  function transformExcelData(data: any[]) {
    // Group by agentName
    const agentMap: Record<string, any[]> = {};
    data.forEach(row => {
      const agentName = row['Agent'] || row['agentName'] || row['Open By'] || row['OPEN BY'] || 'Unknown';
      if (!agentMap[agentName]) agentMap[agentName] = [];
      agentMap[agentName].push(row);
    });
    return Object.entries(agentMap).map(([agentName, rows]) => {
      const ticketCount = rows.length;
      const durations = rows.map(r => {
        const open = dayjs(r['Waktu Open'] || r['OPEN TIME']);
        const close = dayjs(r['Waktu Close Ticket'] || r['CLOSE TIME']);
        return close.isValid() && open.isValid() ? close.diff(open, 'minute') : 0;
      }).filter(Boolean);
      const totalDuration = durations.reduce((a, b) => a + b, 0);
      const avgDuration = durations.length ? totalDuration / durations.length : 0;
      const minDuration = durations.length ? Math.min(...durations) : 0;
      const maxDuration = durations.length ? Math.max(...durations) : 0;
      return {
        agentName,
        ticketCount,
        totalDurationFormatted: formatDurationDHM(totalDuration),
        avgDurationFormatted: formatDurationDHM(avgDuration),
        minDurationFormatted: formatDurationDHM(minDuration),
        maxDurationFormatted: formatDurationDHM(maxDuration),
        // Tambahkan field lain sesuai kebutuhan
      };
    });
  }

  // Gunakan excelAgentData jika ada, jika tidak gunakan data dari store
  const dataSource = excelAgentData.length > 0 ? excelAgentData : safeAgentMetrics;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {summaryCards.map(s => {
          let iconBg;
          if (s.title === 'Total Active Agents') iconBg = "bg-blue-700";
          else if (s.title === 'Most Active Agent') iconBg = "bg-purple-500";
          else if (s.title === 'Most Efficient Agent') iconBg = "bg-green-600";
          else if (s.title === 'Highest Resolution Rate') iconBg = "bg-yellow-400";
          else iconBg = "bg-gray-500";

          return (
            <SummaryCard
              key={s.title}
              icon={<s.icon className="w-7 h-7 text-white" />}
              title={s.title}
              value={s.value}
              description={s.description}
              iconBg={iconBg}
            />
          );
        })}
      </div>
      {/* Per-Agent Cards with Trendline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedAgentList.map((agent, index) => {
          // Find metric for this agent
          const metric = dataSource.find(m => m.agent === agent.agentName);
          const rankBadge = metric && metric.rank ? metric.rank : '-';
          const rankTitle = metric && metric.rank ? (
            metric.rank === 'A' ? `Excellent (Score: ${safeFixed(metric.score ?? 0)})` :
            metric.rank === 'B' ? `Good (Score: ${safeFixed(metric.score ?? 0)})` :
            metric.rank === 'C' ? `Average (Score: ${safeFixed(metric.score ?? 0)})` :
            `Needs Improvement (Score: ${safeFixed(metric.score ?? 0)})`
          ) : 'No data';
          const rankClass = metric && metric.rank ? (
            metric.rank === 'A' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-2 border-green-200 dark:border-green-700' :
            metric.rank === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700' :
            metric.rank === 'C' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border-2 border-yellow-200 dark:border-yellow-700' :
            'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-2 border-red-200 dark:border-red-700'
          ) : 'bg-gray-200 text-gray-500 border-2 border-gray-300';

          const durationMetrics = [
            { label: 'Total', value: agent.totalDurationFormatted || '-', description: 'Total Handling Duration' },
            { label: 'Rata-rata', value: agent.avgDurationFormatted || '-', description: 'Average Handling Duration' },
            { label: 'Tercepat', value: agent.minDurationFormatted || '-', description: 'Fastest Handling Duration' },
            { label: 'Terlama', value: agent.maxDurationFormatted || '-', description: 'Longest Handling Duration' },
          ];

          // KPI metrics, always show
          const kpiMetrics = [
            { label: 'FRT', value: metric?.frt ?? 'N/A', icon: AccessTimeIcon },
            { label: 'ART', value: metric?.art ?? 'N/A', icon: AccessTimeIcon },
            { label: 'FCR', value: metric?.fcr !== undefined && safeNum(metric.fcr) !== null ? `${metric.fcr.toFixed(1)}%` : 'N/A', icon: MilitaryTechIcon },
            { label: 'SLA', value: metric?.sla !== undefined && safeNum(metric.sla) !== null ? `${metric.sla.toFixed(1)}%` : 'N/A', icon: MilitaryTechIcon },
            { label: 'Volume', value: metric?.vol ?? 'N/A', icon: BarChartIcon },
            { label: 'Backlog', value: metric?.backlog ?? 'N/A', icon: MoveToInboxIcon, isRed: true },
          ];

          return (
            <Card key={index} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 flex flex-col gap-6">
              {/* Agent Header */}
              <CardHeader className="flex flex-row items-center justify-between gap-4 p-0">
                <div className="flex items-center gap-4 min-w-0">
                  <CardTitle className="text-xl font-extrabold text-blue-600 dark:text-blue-400 truncate">{agent.agentName}</CardTitle>
                  <span className="rounded-md px-3 py-1 text-sm font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">{agent.ticketCount} Tickets</span>
                </div>
                {/* Rank Badge */}
                <span
                  className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-xl shadow-inner ${rankClass}`}
                  title={rankTitle}
                >
                  {rankBadge}
                </span>
              </CardHeader>

              <CardContent className="p-0 space-y-4">
                {/* Duration Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {durationMetrics.map(m => (
                    <div key={m.label} className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 font-semibold">{m.label}</p>
                      <p className="text-lg font-bold font-mono">{m.value}</p>
                    </div>
                  ))}
                </div>
                {/* KPI Metrics */}
                <div className="grid grid-cols-3 xl:grid-cols-6 gap-4">
                  {kpiMetrics.map(kpi => (
                    <div key={kpi.label} className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-3 text-center">
                      <kpi.icon className={`w-5 h-5 mb-1 mx-auto ${kpi.isRed ? 'text-red-500' : 'text-blue-500'}`} />
                      <p className={`text-lg font-bold font-mono ${kpi.isRed ? 'text-red-500' : ''}`}>{kpi.value}</p>
                      <p className="text-xs text-gray-500 font-semibold">{kpi.label}</p>
                    </div>
                  ))}
                </div>
                {/* Score Progress Bar */}
                {metric && metric.score !== undefined ? (
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${safeNum(metric.score) !== null ? metric.score : 0}%` }}></div>
                  </div>
                ) : (
                  <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2.5" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Trendline Chart for All Agents */}
      {debouncedTrendData.length > 0 && (
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 mt-6">
          <CardHeader>
            <CardTitle>Agent Ticket Trends per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={debouncedTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {debouncedDatasets.map((ds, idx) => (
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
                {debouncedDatasets.map((ds, idx) => (
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
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="mb-4" />
    </div>
  );
};

export default AgentAnalytics; 