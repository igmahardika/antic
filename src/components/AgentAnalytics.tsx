import React, { useState, useEffect } from 'react';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import GroupIcon from '@mui/icons-material/Group';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentStore } from '@/store/agentStore';
import { useAgentAnalytics } from './AgentAnalyticsContext';
import SummaryCard from './ui/SummaryCard';
import TimeFilter from './TimeFilter';
import { ListAlt as ListAltIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { Lightbulb as LightbulbIcon } from '@mui/icons-material';
import PageWrapper from './PageWrapper';
import type { AgentMetric } from '@/utils/agentKpi';
import { formatDurationDHM } from '@/lib/utils';
// Unused import - commented out
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend as RechartsLegend, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import * as RadixDialog from '@radix-ui/react-dialog';
// Unused import - commented out
// import dayjs from 'dayjs';

// Define the structure of the data this component will receive
export interface AgentAnalyticsData {
  agentName: string;
  ticketCount: number;
  totalDurationFormatted: string;
  avgDurationFormatted: string;
  minDurationFormatted: string;
  maxDurationFormatted: string;
}

// Unused function - commented out
// const getTrendPercentage = (dataArr) => {
//   if (!dataArr || dataArr.length < 2) return null;
//   const prev = dataArr[dataArr.length - 2];
//   const curr = dataArr[dataArr.length - 1];
//   if (prev === 0) return null;
//   const percent = ((curr - prev) / Math.abs(prev)) * 100;
//   return percent;
// };

// Unused array - commented out
// const AGENT_COLORS = [
//   'text-blue-500', 'text-green-500', 'text-orange-500', 'text-purple-500', 'text-red-500',
//   'text-pink-500', 'text-teal-500', 'text-yellow-500', 'text-indigo-500', 'text-emerald-500'
// ];
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
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-200 dark:border-zinc-700 p-4 max-h-52 overflow-y-auto min-w-[180px] text-xs" style={{ fontSize: '12px', lineHeight: '1.5' }}>
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

// Unused component - commented out
// const CustomMiniTooltip = ({ active, payload, label }: any) => {
//   if (!active || !payload || !payload.length) return null;
//   // Selalu render hanya satu value (payload[0]) untuk mini chart single series
//   let value = payload[0].value;
//   const lowerLabel = (label || '').toLowerCase();
//   let displayLabel = label;
//   if (lowerLabel.includes('frt')) {
//     value = typeof value === 'number' ? formatDurationDHM(value) : value;
//     displayLabel = 'FRT';
//   } else if (lowerLabel.includes('art')) {
//     value = typeof value === 'number' ? formatDurationDHM(value) : value;
//     displayLabel = 'ART';
//   } else if (lowerLabel.includes('fcr')) {
//     value = typeof value === 'number' ? value.toFixed(1) + '%' : value;
//     displayLabel = 'FCR';
//   } else if (lowerLabel.includes('sla')) {
//     value = typeof value === 'number' ? value.toFixed(1) + '%' : value;
//     displayLabel = 'SLA';
//   }
//   return (
//     <div className="bg-white dark:bg-zinc-900 rounded shadow px-3 py-2 text-xs">
//       <div className="font-bold mb-1">{label}</div>
//       <div><span className="font-semibold mr-2">{displayLabel}:</span><span className="font-mono">{value}</span></div>
//     </div>
//   );
// };

// Unused component - commented out
// function ScoreCircle({ score }: { score: number }) {
//   const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-400' : 'bg-red-500';
//   const icon = score >= 80 ? <EmojiEventsIcon className="text-white w-7 h-7 mb-1" /> : score >= 60 ? <StarIcon className="text-white w-7 h-7 mb-1" /> : <EmojiEventsIcon className="text-white w-7 h-7 mb-1" />;
//   return (
//     <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-full shadow-lg ${color}`}>
//       {icon}
//       <span className="text-2xl font-extrabold text-white leading-none">{score}</span>
//       <span className="text-xs font-semibold text-white/80">Score</span>
//     </div>
//   );
// }

// Komponen Box besar untuk Rank dan Backlog
function StatBox({ icon, value, label, bg, valueColor }: { icon: React.ReactNode, value: React.ReactNode, label: string, bg: string, valueColor?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-5 min-w-[220px] min-h-[90px]">
      <div className="flex flex-row items-center gap-4 mb-1">
        <div className={`w-12 h-12 min-w-12 min-h-12 rounded-xl flex items-center justify-center ${bg} shadow-lg`}>
          <span className="text-white" style={{ fontSize: 28 }}>{icon}</span>
        </div>
        <span className={`text-4xl font-extrabold ${valueColor || (bg === 'bg-yellow-400' ? 'text-yellow-400' : bg === 'bg-green-500' ? 'text-green-500' : bg === 'bg-red-500' ? 'text-red-500' : bg === 'bg-blue-500' ? 'text-blue-500' : '')}`}>{value}</span>
      </div>
      <div className="text-xs font-semibold text-gray-500 mt-1">{label}</div>
    </div>
  );
}

const AgentAnalytics = () => {
  // Semua hook di bagian paling atas
  const {
    agentAnalyticsData = {},
    startMonth, setStartMonth,
    endMonth, setEndMonth,
    selectedYear, setSelectedYear,
    allYearsInData,
    allTickets,
    agentMonthlyChart
  } = useAgentAnalytics() || {};
  const data = agentAnalyticsData || {};
  const agentMetrics = useAgentStore((state) => state.agentMetrics) as AgentMetric[];
  // Unused state - commented out
  // const [excelAgentData, setExcelAgentData] = useState<any[]>([]);
  const [debouncedTrendData, setDebouncedTrendData] = useState<any[]>([]);
  const [debouncedDatasets, setDebouncedDatasets] = useState<{ label: string; data: number[]; color?: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    console.log('Agent Metrics DEBUG:', agentMetrics);
  }, [agentMetrics]);

  // Ganti monthOptions agar selalu 12 bulan
  const monthOptions = MONTH_OPTIONS;

  // Unused variable - commented out
  // const summaryKpi = useMemo(() => {
  //   if (!agentMetrics || agentMetrics.length === 0) return null;
  //   const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  //   return {
  //     avgFRT: avg(agentMetrics.map(m => m.frt)),
  //     avgART: avg(agentMetrics.map(m => m.art)),
  //     avgFCR: avg(agentMetrics.map(m => m.fcr)),
  //     avgSLA: avg(agentMetrics.map(m => m.sla)),
  //     avgVol: avg(agentMetrics.map(m => m.vol)),
  //     avgBacklog: avg(agentMetrics.map(m => m.backlog)),
  //   };
  // }, [agentMetrics]);

  // Unused variable - commented out
  // const rechartsAgentTrendData = useMemo(() => {
  //   if (!data || !data.agentMonthlyChart || !Array.isArray(data.agentMonthlyChart.datasets)) return [];
  //   return toRechartsAgentTrend(data.agentMonthlyChart.labels, data.agentMonthlyChart.datasets);
  // }, [data]);
  const agentTrendDatasets: { label: string; data: number[]; color?: string }[] = data?.agentMonthlyChart?.datasets || [];
  const agentTrendLabels: string[] = data?.agentMonthlyChart?.labels || [];

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
          <MenuBookIcon className="w-16 h-16 mb-4" />
          <h3 className="text-xl md:text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">No agent data available</h3>
        <p>Please upload a file to see agent analytics.</p>
        </div>
    );
  }
  const { summary = {} } = data;
  // Unused variable - commented out
  // const sortedAgentList = [...filteredAgentList].sort((a, b) => (b.ticketCount || 0) - (a.ticketCount || 0));

  // Use agentMetrics as data source (excelAgentData functionality removed)
  const dataSource = agentMetrics;

  // --- Normalisasi & Scoring KPI sesuai formula baru ---
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
    const frtScore = normalizeNegative(agent.frtMinutes, 15) * 0.15;
    const artScore = normalizeNegative(agent.artMinutes, 30) * 0.15;
    const backlogScore = scoreBacklog(agent.backlog) * 0.05;
    const ticketScore = scoreTicket(agent.ticket, maxTicket) * 0.10;
    return fcrScore + slaScore + frtScore + artScore + backlogScore + ticketScore;
  }

  // Perhitungan AQS dan insight otomatis (score global agent)
  const maxTicket = Math.max(...dataSource.map(m => m.vol || 0), 1);
  const agentWithScore = dataSource.map(m => {
    const agentObj = {
      fcr: m.fcr || 0,
      sla: m.sla || 0,
      frtMinutes: m.frt || 0,
      artMinutes: m.art || 0,
      backlog: m.backlog || 0,
      ticket: m.vol || 0,
    };
    const score = Math.round(calculateAgentScore(agentObj, maxTicket));
    // Insight otomatis (bisa disesuaikan)
    let insight = '';
    if (agentObj.frtMinutes > 15) insight = 'Avg FRT di atas target.';
    if (agentObj.sla < 85) insight = 'SLA di bawah target.';
    return { ...m, score, insight };
  });
  // Urutkan agent berdasarkan score dari tertinggi ke terendah
  const sortedAgentWithScore = [...agentWithScore]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((a, i) => ({ ...a, rankNum: i + 1 }));

  // Helper: ambil tren score agent per bulan (score bulanan, bukan volume)
  function getAgentScoreTrend(agentName: string) {
    if (!data.agentMonthlyChart || !data.agentMonthlyChart.labels) return [];
    const idx = data.agentMonthlyChart.datasets.findIndex(ds => ds.label === agentName);
    if (idx === -1) return [];
    // Ambil data bulanan agent
    const volArr = data.agentMonthlyChart.datasets[idx]?.data || [];
    const frtArr = data.agentMonthlyChart.datasetsFRT?.find(ds => ds.label === agentName)?.data || [];
    const artArr = data.agentMonthlyChart.datasetsART?.find(ds => ds.label === agentName)?.data || [];
    const fcrArr = data.agentMonthlyChart.datasetsFCR?.find(ds => ds.label === agentName)?.data || [];
    const slaArr = data.agentMonthlyChart.datasetsSLA?.find(ds => ds.label === agentName)?.data || [];
    const backlogArr = data.agentMonthlyChart.datasetsBacklog?.find(ds => ds.label === agentName)?.data || [];
    // Cari max ticket untuk normalisasi
    const maxTicket = Math.max(...volArr, 1);
    // Hitung score bulanan dengan rumus baru
    return data.agentMonthlyChart.labels.map((_, i) => {
      const agentMonth = {
        fcr: fcrArr[i] || 0,
        sla: slaArr[i] || 0,
        frtMinutes: frtArr[i] || 0,
        artMinutes: artArr[i] || 0,
        backlog: backlogArr[i] || 0,
        ticket: volArr[i] || 0,
      };
      return Math.round(calculateAgentScore(agentMonth, maxTicket));
    });
  }

  // Helper: trend direction
  function getTrendDirection(values: number[]): 'up' | 'down' | 'flat' {
    if (!values || values.length < 2) return 'flat';
    const delta = values[values.length - 1] - values[values.length - 2];
    if (Math.abs(delta) < 1e-2) return 'flat';
    return delta > 0 ? 'up' : 'down';
  }
  // Helper: insight text per KPI
  function generateKpiInsight(kpi: string, trend: 'up' | 'down' | 'flat') {
    const messages: Record<string, Record<string, string>> = {
      ticket: {
        up: 'Volume meningkat. Siapkan tambahan agent.',
        down: 'Volume menurun. Workload menurun.',
        flat: 'Volume stabil. Workload konsisten.'
      },
      frt: {
        up: 'Respon awal melambat. Review SOP respon.',
        down: 'Respon awal membaik. Pertahankan performa.',
        flat: 'Respons awal stabil.'
      },
      art: {
        up: 'Durasi penyelesaian meningkat. Efisiensi perlu ditinjau.',
        down: 'Efisiensi membaik. Pertahankan.',
        flat: 'Efisiensi stabil.'
      },
      fcr: {
        up: 'Penyelesaian sekali kontak meningkat. Sangat baik!',
        down: 'Banyak case perlu tindak lanjut. Tingkatkan kualitas solusi.',
        flat: 'FCR stabil.'
      },
      sla: {
        up: 'Ketepatan layanan membaik. Good.',
        down: 'Delay meningkat. Perlu antisipasi jam sibuk.',
        flat: 'SLA stabil.'
      },
      backlog: {
        up: 'Backlog meningkat. Potensi beban berlebih.',
        down: 'Backlog turun. Kinerja penyelesaian baik.',
        flat: 'Backlog stabil.'
      }
    };
    return messages[kpi][trend];
  }

  // --- Refactor summaryCards sesuai struktur rekomendasi ---
  const topOverall = agentWithScore.reduce((a, b) => (b.score > a.score ? b : a), agentWithScore[0]);
  const fastestResponder = agentWithScore.reduce((a, b) => (b.frt < a.frt ? b : a), agentWithScore[0]);
  const fastestResolution = agentWithScore.reduce((a, b) => (b.art < a.art ? b : a), agentWithScore[0]);
  const bestSLA = agentWithScore.reduce((a, b) => (b.sla > a.sla ? b : a), agentWithScore[0]);
  const mostReliable = agentWithScore.filter(a => a.backlog === 0).reduce((a, b) => (b.fcr > a.fcr ? b : a), agentWithScore[0]);
  const mostEngaged = agentWithScore.reduce((a, b) => (b.vol > a.vol ? b : a), agentWithScore[0]);
  const agentWithDelta = agentWithScore.map(a => {
    const trend = getAgentScoreTrend(a.agent);
    const delta = trend.length > 1 ? trend[trend.length-1] - trend[trend.length-2] : 0;
    return { ...a, delta };
  });
  const mostImproved = agentWithDelta.reduce((a, b) => (b.delta > a.delta ? b : a), agentWithDelta[0]);
  const summaryCards = [
    {
      title: 'Total Active Agents',
      value: summary.totalAgents,
      icon: GroupIcon,
      description: 'Number of active agents',
    },
    {
      title: 'Top Overall Agent',
      value: topOverall?.agent,
      icon: EmojiEventsIcon,
      description: `Highest overall score (${topOverall?.score ?? '-'})`,
    },
    {
      title: 'Fastest Responder',
      value: fastestResponder?.agent,
      icon: AccessTimeIcon,
      description: `Lowest FRT (${fastestResponder?.frt ? formatDurationDHM(fastestResponder.frt) : '-'})`,
    },
    {
      title: 'Fastest Resolution',
      value: fastestResolution?.agent,
      icon: FlashOnIcon,
      description: `Lowest ART (${fastestResolution?.art ? formatDurationDHM(fastestResolution.art) : '-'})`,
    },
    {
      title: 'Best SLA Performer',
      value: bestSLA?.agent,
      icon: TrendingUpIcon,
      description: `Highest SLA (${bestSLA?.sla !== undefined ? bestSLA.sla.toFixed(1) + '%' : '-'})`,
    },
    {
      title: 'Most Reliable',
      value: mostReliable?.agent,
      icon: HowToRegIcon,
      description: `Highest FCR with 0 backlog (${mostReliable?.fcr !== undefined ? mostReliable.fcr.toFixed(1) + '%' : '-'})`,
    },
    {
      title: 'Most Improved Agent',
      value: mostImproved?.agent,
      icon: BarChartIcon,
      description: `Biggest score increase (${(mostImproved as any)?.delta !== undefined ? ((mostImproved as any).delta > 0 ? '+' : '') + (mostImproved as any).delta.toFixed(1) : '-'})`,
    },
    {
      title: 'Most Engaged',
      value: mostEngaged?.agent,
      icon: GroupIcon,
      description: `Most tickets handled (${mostEngaged?.vol ?? '-'})`,
    },
  ];

  // Unused function - commented out
  // const safeNum = v => (typeof v === 'number' && !isNaN(v)) ? v : null;
  // Unused function - commented out
  // const safeFixed = v => safeNum(v) !== null ? v.toFixed(1) : '-';

  // File upload functionality commented out - using main upload process instead
  // const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;
  //   // Excel processing moved to main UploadProcess component
  // };

  // Unused function - commented out
  // function transformExcelData(data: any[]) {
  //   // Group by agentName
  //   const agentMap: Record<string, any[]> = {};
  //   data.forEach(row => {
  //     const agentName = row['Agent'] || row['agentName'] || row['Open By'] || row['OPEN BY'] || 'Unknown';
  //     if (!agentMap[agentName]) agentMap[agentName] = [];
  //     agentMap[agentName].push(row);
  //   });
  //   return Object.entries(agentMap).map(([agentName, rows]) => {
  //     const ticketCount = rows.length;
  //     const durations = rows.map(r => {
  //       const open = dayjs(r['Waktu Open'] || r['OPEN TIME']);
  //       const close = dayjs(r['Waktu Close Ticket'] || r['CLOSE TIME']);
  //       return close.isValid() && open.isValid() ? close.diff(open, 'minute') : 0;
  //     }).filter(Boolean);
  //     const totalDuration = durations.reduce((a, b) => a + b, 0);
  //     const avgDuration = durations.length ? totalDuration / durations.length : 0;
  //     const minDuration = durations.length ? Math.min(...durations) : 0;
  //     const maxDuration = durations.length ? Math.max(...durations) : 0;
  //     return {
  //       agentName,
  //       ticketCount,
  //       totalDurationFormatted: formatDurationDHM(totalDuration),
  //       avgDurationFormatted: formatDurationDHM(avgDuration),
  //       minDurationFormatted: formatDurationDHM(minDuration),
  //       maxDurationFormatted: formatDurationDHM(maxDuration),
  //       // Tambahkan field lain sesuai kebutuhan
  //     };
  //   });
  // }

  return (
    <PageWrapper>
      {/* Page Title & Description */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Agent Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">Analysis of agent performance and activity in handling tickets during the selected period.</p>
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
          else if (s.title === 'Top Overall Agent') iconBg = "bg-blue-700";
          else if (s.title === 'Fastest Responder') iconBg = "bg-purple-500";
          else if (s.title === 'Fastest Resolution') iconBg = "bg-green-600";
          else if (s.title === 'Best SLA Performer') iconBg = "bg-yellow-400";
          else if (s.title === 'Most Reliable') iconBg = "bg-red-500";
          else if (s.title === 'Most Improved Agent') iconBg = "bg-indigo-500";
          else if (s.title === 'Most Engaged') iconBg = "bg-teal-500";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {sortedAgentWithScore.map((agent) => {
          // Unused variables - commented out
          // const closedCount = (dataSource.find(a => (a.agent === agent.agent || (a as any).agentName === agent.agent) && typeof (a as any).closedCount !== 'undefined') as any)?.closedCount ?? '-';
          // const scoreTrend = getAgentScoreTrend(agent.agent);
          // Dynamic style for score box
          let scoreBox = {
            bg: 'bg-yellow-400',
            icon: <StarIcon />, 
            valueColor: 'text-yellow-700',
          };
          if (agent.score >= 80) {
            scoreBox = {
              bg: 'bg-green-500',
              icon: <StarIcon />, 
              valueColor: 'text-green-700',
            };
          } else if (agent.score < 60) {
            scoreBox = {
              bg: 'bg-red-500',
              icon: <StarIcon />, 
              valueColor: 'text-red-600',
            };
          }
          return (
            <div key={agent.agent} className="relative bg-gradient-to-br from-white via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 rounded-2xl shadow-lg p-8 flex flex-col gap-6 hover:shadow-2xl transition-all border border-zinc-200 dark:border-zinc-800 items-center overflow-x-hidden" onClick={() => { setSelectedAgent(agent.agent); setModalOpen(true); }} style={{ cursor: 'pointer' }}>
              {/* Header */}
              <div className="flex items-center gap-4 w-full">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-400 to-purple-400 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {agent.agent?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100 truncate">{agent.agent}</div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Agent</div>
                </div>
              </div>
              {/* Dua box besar: Rank & Score */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8 w-full max-w-full">
                <div className="shrink-0 w-full sm:w-auto max-w-full">
                  <StatBox icon={<EmojiEventsIcon />} value={`#${agent.rankNum}`} label="Rank" bg="bg-blue-500" valueColor="text-blue-700" />
                  </div>
                <div className="shrink-0 w-full sm:w-auto max-w-full">
                  <StatBox icon={scoreBox.icon} value={agent.score ?? 0} label="Score" bg={scoreBox.bg} valueColor={scoreBox.valueColor} />
                </div>
              </div>
              {/* KPI grid */}
              <div className="grid grid-cols-3 md:grid-cols-3 grid-rows-2 gap-x-4 gap-y-2 w-full mt-2">
                <div className="flex flex-col items-center min-w-0">
                  <ListAltIcon className="text-blue-600 mb-1" fontSize="small" />
                  <div className="font-bold text-lg">{agent.vol ?? '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Tiket</div>
                </div>
                <div className="flex flex-col items-center min-w-0">
                  <AccessTimeIcon className="text-purple-600 mb-1" fontSize="small" />
                  <div className="font-bold text-lg">{agent.frt ? formatDurationDHM(agent.frt) : '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">FRT</div>
                </div>
                <div className="flex flex-col items-center min-w-0">
                  <AccessTimeIcon className="text-pink-600 mb-1" fontSize="small" />
                  <div className="font-bold text-lg">{agent.art ? formatDurationDHM(agent.art) : '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">ART</div>
                </div>
                <div className="flex flex-col items-center min-w-0">
                  <FlashOnIcon className="text-green-600 mb-1" fontSize="small" />
                  <div className="font-bold text-lg">{agent.fcr !== undefined ? `${agent.fcr.toFixed(1)}%` : '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">FCR</div>
                </div>
                <div className="flex flex-col items-center min-w-0">
                  <TrendingUpIcon className="text-yellow-500 mb-1" fontSize="small" />
                  <div className="font-bold text-lg">{agent.sla !== undefined ? `${agent.sla.toFixed(1)}%` : '-'}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">SLA</div>
                </div>
                <div className="flex flex-col items-center min-w-0">
                  <MoveToInboxIcon className="text-red-500 mb-1" fontSize="small" />
                  <div className="font-bold text-lg">{agent.backlog ?? 0}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Backlog</div>
                  </div>
              </div>
              {/* Progress bar score */}
              <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2 relative mt-2">
                <div className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${agent.score || 0}%`, background: 'linear-gradient(to right, #3b82f6, #22c55e, #fde047)' }} />
              </div>
              {/* Insight */}
              {agent.insight && (
                <div className="flex items-center gap-2 bg-yellow-50 dark:bg-zinc-900 rounded-lg px-3 py-2 mt-2 text-sm text-yellow-800 dark:text-yellow-200 shadow-inner">
                  <LightbulbIcon className="text-yellow-400" />
                  <span>{agent.insight}</span>
                </div>
              )}
            </div>
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
                      <stop offset="5%" stopColor={ds.color || TREND_COLORS[idx % TREND_COLORS.length]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={ds.color || TREND_COLORS[idx % TREND_COLORS.length]} stopOpacity={0.08}/>
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
      {/* Modal drilldown agent */}
      <RadixDialog.Root open={modalOpen} onOpenChange={open => { setModalOpen(open); if (!open) setSelectedAgent(open ? selectedAgent : null); }}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <RadixDialog.Content className="fixed right-0 top-0 h-full w-full md:w-[800px] max-w-full bg-white dark:bg-zinc-900 shadow-2xl z-50 overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agent Detail</div>
              <RadixDialog.Close asChild>
                <button className="text-blue-700 dark:text-blue-300 hover:text-red-500 text-4xl font-extrabold focus:outline-none transition-colors duration-150" aria-label="Close agent detail">&times;</button>
              </RadixDialog.Close>
            </div>
            {selectedAgent && (
              <>
                {/* Ambil data tren score agent terpilih */}
                {(() => {
                  const scoreTrendArr = getAgentScoreTrend(selectedAgent);
                  const chartData = Array.isArray(scoreTrendArr)
                    ? scoreTrendArr.map((score, i) => ({ month: data.agentMonthlyChart.labels?.[i] || `Month ${i+1}`, score }))
                    : [];
                  return (
                    <div className="mb-4">
                      <div className="font-bold text-lg mb-2">Score Trend</div>
                      <ResponsiveContainer width="100%" height={80}>
                        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" hide />
                          <YAxis domain={[0, 100]} hide />
                          <Tooltip />
                          <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScore)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
                {/* Header Insight */}
                {(() => {
                  const scoreTrendArr = getAgentScoreTrend(selectedAgent);
                  const avgScore = scoreTrendArr.length ? (scoreTrendArr.reduce((a, b) => a + b, 0) / scoreTrendArr.length).toFixed(1) : '-';
                  let trendBadge = null;
                  if (scoreTrendArr.length > 1) {
                    const diff = scoreTrendArr[scoreTrendArr.length - 1] - scoreTrendArr[scoreTrendArr.length - 2];
                    if (diff > 0) trendBadge = <Badge variant="success" className="ml-2">Trend Up</Badge>;
                    else if (diff < 0) trendBadge = <Badge variant="danger" className="ml-2">Trend Down</Badge>;
                    else trendBadge = <Badge variant="default" className="ml-2">Stable</Badge>;
                  }
                  // Cari bulan terbaik/terburuk
                  let bestMonth = null, worstMonth = null, bestValue = -Infinity, worstValue = Infinity;
                  if (scoreTrendArr.length && agentMonthlyChart && agentMonthlyChart.labels) {
                    scoreTrendArr.forEach((v, i) => {
                      if (v > bestValue) { bestValue = v; bestMonth = agentMonthlyChart.labels[i]; }
                      if (v < worstValue) { worstValue = v; worstMonth = agentMonthlyChart.labels[i]; }
                    });
                  }
                  // Overall trend
                  let mainTrend = '';
                  if (scoreTrendArr.length > 1) {
                    const first = scoreTrendArr[0], last = scoreTrendArr[scoreTrendArr.length-1];
                    if (last > first) mainTrend = 'Performa meningkat secara keseluruhan.';
                    else if (last < first) mainTrend = 'Performa menurun secara keseluruhan.';
                    else mainTrend = 'Performa relatif stabil.';
                  }
                  // --- KPI Breakdown ---
                  // Ambil data tren 3 bulan terakhir untuk setiap KPI
                  const getLastN = (arr: number[], n: number) => arr.slice(-n);
                  const ticketArr = agentMonthlyChart?.datasets?.find(ds => ds.label === selectedAgent)?.data || [];
                  const frtArr = agentMonthlyChart?.datasetsFRT?.find(ds => ds.label === selectedAgent)?.data || [];
                  const artArr = agentMonthlyChart?.datasetsART?.find(ds => ds.label === selectedAgent)?.data || [];
                  const fcrArr = agentMonthlyChart?.datasetsFCR?.find(ds => ds.label === selectedAgent)?.data || [];
                  const slaArr = agentMonthlyChart?.datasetsSLA?.find(ds => ds.label === selectedAgent)?.data || [];
                  const backlogArr = agentMonthlyChart?.datasetsBacklog?.find(ds => ds.label === selectedAgent)?.data || [];
                  // --- Tambahan: total tiket per bulan & persentase handle agent ---
                  const totalTicketPerMonth = agentMonthlyChart?.totalTicketsPerMonth || [];
                  // Persentase handle agent per bulan
                  const agentTicketShare = ticketArr.map((v, i) => {
                    const total = totalTicketPerMonth[i] || 1;
                    let percent = (v / total) * 100;
                    if (!isFinite(percent)) percent = 0;
                    if (percent > 100) return '100%+';
                    return Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(percent) + '%';
                  });
                  // Trend & insight per KPI
                  const kpiTrends = {
                    ticket: getTrendDirection(getLastN(ticketArr, 3)),
                    frt: getTrendDirection(getLastN(frtArr, 3)),
                    art: getTrendDirection(getLastN(artArr, 3)),
                    fcr: getTrendDirection(getLastN(fcrArr, 3)),
                    sla: getTrendDirection(getLastN(slaArr, 3)),
                    backlog: getTrendDirection(getLastN(backlogArr, 3)),
                  };
                  const kpiLabels = {
                    ticket: 'Ticket Volume',
                    frt: 'FRT',
                    art: 'ART',
                    fcr: 'FCR',
                    sla: 'SLA',
                    backlog: 'Backlog',
                  };
                  return (
                    <div className="space-y-2">
                      <div className="font-bold mb-2">Auto Insight</div>
                      <div>Average Score: <span className="font-bold">{avgScore}</span> {trendBadge}</div>
                      <div>Bulan terbaik: <span className="font-bold">{bestMonth} ({bestValue})</span></div>
                      <div>Bulan terburuk: <span className="font-bold">{worstMonth} ({worstValue})</span></div>
                      <div>{mainTrend}</div>
                      <div className="mt-2 font-bold">KPI Breakdown:</div>
                      <ul className="space-y-1">
                        {Object.keys(kpiTrends).map(kpi => (
                          <li key={kpi} className="flex items-center gap-2">
                            <Badge variant={kpiTrends[kpi]==='up' ? 'success' : kpiTrends[kpi]==='down' ? 'danger' : 'default'}>{kpiTrends[kpi] === 'up' ? 'Up' : kpiTrends[kpi] === 'down' ? 'Down' : 'Flat'}</Badge>
                            <span className="font-semibold">{kpiLabels[kpi]}:</span>
                            <span>{generateKpiInsight(kpi, kpiTrends[kpi])}</span>
                            {kpi === 'ticket' && agentTicketShare.length > 0 && (
                              <span className="ml-2 text-xs text-gray-500">({agentTicketShare.slice(-1)[0]} dari total tiket bulan ini)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                {/* Shift Highlight tetap di bawah */}
                <div className="mt-4">
                  <div className="font-bold mb-2">Shift Breakdown</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr className="bg-zinc-100 dark:bg-zinc-800">
                          <th className="px-2 py-1">Shift</th>
                          <th className="px-2 py-1">Ticket Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const shiftCount = { Pagi: 0, Siang: 0, Malam: 0 };
                          if (allTickets && selectedAgent) {
                            allTickets.filter(t => t.openBy === selectedAgent).forEach(t => {
                              if (!t.openTime) return;
                              const hour = new Date(t.openTime).getHours();
                              if (hour >= 6 && hour < 14) shiftCount.Pagi++;
                              else if (hour >= 14 && hour < 22) shiftCount.Siang++;
                              else shiftCount.Malam++;
                            });
                          }
                          return Object.entries(shiftCount).map(([shift, count]) => (
                            <tr key={shift} className="border-b">
                              <td className="px-2 py-1">{shift}</td>
                              <td className="px-2 py-1">{count}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
    </div>
              </>
            )}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </PageWrapper>
  );
};

export default AgentAnalytics; 