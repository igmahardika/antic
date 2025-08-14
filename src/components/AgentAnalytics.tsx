import React, { useState, useEffect, useMemo } from 'react';
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
import { enableBacklogDebug } from '@/utils/agentKpi';
import { formatDurationDHM } from '@/lib/utils';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  Clock, 
  Users, 
  BarChart3,
  Calendar,
  Star,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
// Unused import - commented out
// import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend as RechartsLegend, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
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

// Agent Report Interfaces
interface MonthlyPerformance {
  month: string;
  tickets: number;
  frt: number;
  art: number;
  fcr: number;
  sla: number;
  score: number;
  grade: string;
}

interface Milestone {
  date: string;
  type: 'achievement' | 'improvement' | 'milestone';
  title: string;
  description: string;
  value?: number;
}

interface KPIAnalysis {
  frt: { trend: string; avg: number; best: number; worst: number; target: number; };
  art: { trend: string; avg: number; best: number; worst: number; target: number; };
  fcr: { trend: string; avg: number; best: number; worst: number; target: number; };
  sla: { trend: string; avg: number; best: number; worst: number; target: number; };
  volume: { trend: string; total: number; avg: number; peak: number; };
}

interface ShiftAnalysis {
  pagi: { count: number; percentage: number; avgScore: number; };
  siang: { count: number; percentage: number; avgScore: number; };
  malam: { count: number; percentage: number; avgScore: number; };
  optimal: string;
}

interface CategoryAnalysis {
  categories: Array<{ name: string; count: number; avgScore: number; percentage: number; }>;
  strongest: string;
  weakest: string;
}

interface AgentReport {
  agentName: string;
  startDate: Date;
  endDate: Date;
  totalMonths: number;
  overallScore: number;
  grade: string;
  rank: number;
  totalTickets: number;
  monthlyPerformance: MonthlyPerformance[];
  milestones: Milestone[];
  kpiAnalysis: KPIAnalysis;
  shiftAnalysis: ShiftAnalysis;
  categoryAnalysis: CategoryAnalysis;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
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
  
  // Get cutoff dates for filtering
  const { cutoffStart, cutoffEnd } = useMemo(() => {
    if (!startMonth || !endMonth || !selectedYear) return { cutoffStart: null, cutoffEnd: null };
    const y = Number(selectedYear);
    const mStart = Number(startMonth) - 1;
    const mEnd = Number(endMonth) - 1;
    const cutoffStart = new Date(y, mStart, 1, 0, 0, 0, 0);
    const cutoffEnd = new Date(y, mEnd + 1, 0, 23, 59, 59, 999);
    return { cutoffStart, cutoffEnd };
  }, [startMonth, endMonth, selectedYear]);
  const data = agentAnalyticsData || {};
  const agentMetrics = useAgentStore((state) => state.agentMetrics) as AgentMetric[];
  // Unused state - commented out
  // const [excelAgentData, setExcelAgentData] = useState<any[]>([]);
  const [debouncedTrendData, setDebouncedTrendData] = useState<any[]>([]);
  const [debouncedDatasets, setDebouncedDatasets] = useState<{ label: string; data: number[]; color?: string }[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [backlogDebugEnabled, setBacklogDebugEnabled] = useState(false);

  // Export functions
  const exportToPDF = (report: AgentReport) => {
    // TODO: Implement PDF export using @react-pdf/renderer
    console.log('Exporting to PDF:', report);
    alert('PDF export feature coming soon!');
  };

  const exportToExcel = (report: AgentReport) => {
    // TODO: Implement Excel export using xlsx library
    console.log('Exporting to Excel:', report);
    alert('Excel export feature coming soon!');
  };

  useEffect(() => {
    console.log('Agent Metrics DEBUG:', agentMetrics);
  }, [agentMetrics]);

  // Function to toggle backlog debugging
  const toggleBacklogDebug = () => {
    const newState = !backlogDebugEnabled;
    setBacklogDebugEnabled(newState);
    enableBacklogDebug(newState);
  };

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
    // Update FRT target to 60 minutes (1 hour)
    const frtScore = normalizeNegative(agent.frtMinutes, 60) * 0.15;
    // Update ART target to 1440 minutes (24 hours)
    const artScore = normalizeNegative(agent.artMinutes, 1440) * 0.15;
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

  // Generate comprehensive Agent Report
  function generateAgentReport(agentName: string): AgentReport {
    if (!data.agentMonthlyChart || !allTickets) {
      return null;
    }

    // Get agent's monthly data
    const volArr = data.agentMonthlyChart.datasets?.find(ds => ds.label === agentName)?.data || [];
    const frtArr = data.agentMonthlyChart.datasetsFRT?.find(ds => ds.label === agentName)?.data || [];
    const artArr = data.agentMonthlyChart.datasetsART?.find(ds => ds.label === agentName)?.data || [];
    const fcrArr = data.agentMonthlyChart.datasetsFCR?.find(ds => ds.label === agentName)?.data || [];
    const slaArr = data.agentMonthlyChart.datasetsSLA?.find(ds => ds.label === agentName)?.data || [];
    const scoreArr = getAgentScoreTrend(agentName);

    // Agent's tickets
    const agentTickets = allTickets.filter(t => t.openBy === agentName);
    const ticketDates = agentTickets.map(t => new Date(t.openTime)).filter(d => !isNaN(d.getTime()));
    
    // Career timeline
    const startDate = ticketDates.length > 0 ? new Date(Math.min(...ticketDates.map(d => d.getTime()))) : new Date();
    const endDate = ticketDates.length > 0 ? new Date(Math.max(...ticketDates.map(d => d.getTime()))) : new Date();
    const totalMonths = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    // Overall metrics
    const agentMetric = dataSource.find(m => m.agent === agentName);
    const overallScore = agentMetric?.score || 0;
    const grade = agentMetric?.rank || 'D';
    const rank = sortedAgentWithScore.findIndex(a => a.agent === agentName) + 1;
    const totalTickets = agentMetric?.vol || 0;

    // Monthly performance
    const monthlyPerformance: MonthlyPerformance[] = data.agentMonthlyChart.labels?.map((label, i) => ({
      month: label,
      tickets: volArr[i] || 0,
      frt: frtArr[i] || 0,
      art: artArr[i] || 0,
      fcr: fcrArr[i] || 0,
      sla: slaArr[i] || 0,
      score: scoreArr[i] || 0,
      grade: scoreArr[i] >= 75 ? 'A' : scoreArr[i] >= 60 ? 'B' : scoreArr[i] >= 45 ? 'C' : 'D'
    })) || [];

    // Milestones
    const milestones: Milestone[] = [];
    if (monthlyPerformance.length > 0) {
      // Best month
      const bestMonth = monthlyPerformance.reduce((a, b) => b.score > a.score ? b : a);
      milestones.push({
        date: bestMonth.month,
        type: 'achievement',
        title: 'Best Performance Month',
        description: `Achieved highest score of ${bestMonth.score} with ${bestMonth.tickets} tickets`,
        value: bestMonth.score
      });

      // First month
      milestones.push({
        date: monthlyPerformance[0].month,
        type: 'milestone',
        title: 'Career Start',
        description: `Started with ${monthlyPerformance[0].tickets} tickets`,
        value: monthlyPerformance[0].tickets
      });

      // Grade improvements
      let currentGrade = monthlyPerformance[0].grade;
      monthlyPerformance.forEach((month, i) => {
        if (month.grade !== currentGrade) {
          milestones.push({
            date: month.month,
            type: 'improvement',
            title: `Grade ${currentGrade} → ${month.grade}`,
            description: `Improved from Grade ${currentGrade} to ${month.grade}`,
            value: month.score
          });
          currentGrade = month.grade;
        }
      });
    }

    // KPI Analysis
    const kpiAnalysis: KPIAnalysis = {
      frt: {
        trend: getTrendDirection(frtArr.slice(-3)),
        avg: frtArr.length ? frtArr.reduce((a, b) => a + b, 0) / frtArr.length : 0,
        best: Math.min(...frtArr.filter(v => v > 0)),
        worst: Math.max(...frtArr),
        target: 60
      },
      art: {
        trend: getTrendDirection(artArr.slice(-3)),
        avg: artArr.length ? artArr.reduce((a, b) => a + b, 0) / artArr.length : 0,
        best: Math.min(...artArr.filter(v => v > 0)),
        worst: Math.max(...artArr),
        target: 1440
      },
      fcr: {
        trend: getTrendDirection(fcrArr.slice(-3)),
        avg: fcrArr.length ? fcrArr.reduce((a, b) => a + b, 0) / fcrArr.length : 0,
        best: Math.max(...fcrArr),
        worst: Math.min(...fcrArr),
        target: 75
      },
      sla: {
        trend: getTrendDirection(slaArr.slice(-3)),
        avg: slaArr.length ? slaArr.reduce((a, b) => a + b, 0) / slaArr.length : 0,
        best: Math.max(...slaArr),
        worst: Math.min(...slaArr),
        target: 85
      },
      volume: {
        trend: getTrendDirection(volArr.slice(-3)),
        total: totalTickets,
        avg: volArr.length ? volArr.reduce((a, b) => a + b, 0) / volArr.length : 0,
        peak: Math.max(...volArr)
      }
    };

    // Shift Analysis
    const shiftCount = { pagi: 0, siang: 0, malam: 0 };
    const shiftScores = { pagi: [] as number[], siang: [] as number[], malam: [] as number[] };
    
    agentTickets.forEach(t => {
      if (!t.openTime) return;
      const hour = new Date(t.openTime).getHours();
      let shift: keyof typeof shiftCount;
      if (hour >= 6 && hour < 14) shift = 'pagi';
      else if (hour >= 14 && hour < 22) shift = 'siang';
      else shift = 'malam';
      
      shiftCount[shift]++;
      // Find corresponding score for this ticket's month
      const ticketMonth = `${new Date(t.openTime).getFullYear()}-${String(new Date(t.openTime).getMonth() + 1).padStart(2, '0')}`;
      const monthIndex = data.agentMonthlyChart.labels?.findIndex(label => label.includes(ticketMonth.split('-')[1])) || -1;
      if (monthIndex >= 0 && scoreArr[monthIndex]) {
        shiftScores[shift].push(scoreArr[monthIndex]);
      }
    });

    const totalShiftTickets = Object.values(shiftCount).reduce((a, b) => a + b, 0);
    const shiftAnalysis: ShiftAnalysis = {
      pagi: {
        count: shiftCount.pagi,
        percentage: totalShiftTickets > 0 ? (shiftCount.pagi / totalShiftTickets) * 100 : 0,
        avgScore: shiftScores.pagi.length ? shiftScores.pagi.reduce((a, b) => a + b, 0) / shiftScores.pagi.length : 0
      },
      siang: {
        count: shiftCount.siang,
        percentage: totalShiftTickets > 0 ? (shiftCount.siang / totalShiftTickets) * 100 : 0,
        avgScore: shiftScores.siang.length ? shiftScores.siang.reduce((a, b) => a + b, 0) / shiftScores.siang.length : 0
      },
      malam: {
        count: shiftCount.malam,
        percentage: totalShiftTickets > 0 ? (shiftCount.malam / totalShiftTickets) * 100 : 0,
        avgScore: shiftScores.malam.length ? shiftScores.malam.reduce((a, b) => a + b, 0) / shiftScores.malam.length : 0
      },
      optimal: Object.entries(shiftScores).reduce((a, b) => 
        (a[1].length ? a[1].reduce((x, y) => x + y, 0) / a[1].length : 0) > 
        (b[1].length ? b[1].reduce((x, y) => x + y, 0) / b[1].length : 0) ? a : b
      )[0]
    };

    // Category Analysis
    const categoryMap = {};
    agentTickets.forEach(t => {
      const category = t.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = { count: 0, scores: [] };
      }
      categoryMap[category].count++;
      
      // Find corresponding score
      const ticketMonth = `${new Date(t.openTime).getFullYear()}-${String(new Date(t.openTime).getMonth() + 1).padStart(2, '0')}`;
      const monthIndex = data.agentMonthlyChart.labels?.findIndex(label => label.includes(ticketMonth.split('-')[1])) || -1;
      if (monthIndex >= 0 && scoreArr[monthIndex]) {
        categoryMap[category].scores.push(scoreArr[monthIndex]);
      }
    });

    const categories = Object.entries(categoryMap).map(([name, data]: [string, any]) => ({
      name,
      count: data.count,
      avgScore: data.scores.length ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
      percentage: (data.count / totalTickets) * 100
    })).sort((a, b) => b.count - a.count);

    const categoryAnalysis: CategoryAnalysis = {
      categories,
      strongest: categories.length > 0 ? categories[0].name : 'N/A',
      weakest: categories.length > 0 ? categories[categories.length - 1].name : 'N/A'
    };

    // Strengths & Weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (kpiAnalysis.fcr.avg >= 75) strengths.push('Excellent First Call Resolution');
    if (kpiAnalysis.sla.avg >= 85) strengths.push('Strong SLA Compliance');
    if (kpiAnalysis.frt.avg <= 60) strengths.push('Fast Response Time');
    if (kpiAnalysis.art.avg <= 1440) strengths.push('Efficient Resolution Time');
    if (grade === 'A') strengths.push('Consistent High Performance');

    if (kpiAnalysis.fcr.avg < 60) weaknesses.push('Low First Call Resolution Rate');
    if (kpiAnalysis.sla.avg < 70) weaknesses.push('SLA Compliance Issues');
    if (kpiAnalysis.frt.avg > 120) weaknesses.push('Slow Response Time');
    if (kpiAnalysis.art.avg > 2880) weaknesses.push('Long Resolution Time');
    if (grade === 'D') weaknesses.push('Performance Below Standards');

    // Recommendations
    const recommendations: string[] = [];
    if (kpiAnalysis.frt.avg > 60) recommendations.push('Focus on reducing First Response Time');
    if (kpiAnalysis.art.avg > 1440) recommendations.push('Improve resolution efficiency');
    if (kpiAnalysis.fcr.avg < 75) recommendations.push('Enhance first-call resolution skills');
    if (kpiAnalysis.sla.avg < 85) recommendations.push('Prioritize SLA compliance');
    if (shiftAnalysis.optimal !== 'siang') recommendations.push(`Consider optimizing ${shiftAnalysis.optimal} shift performance`);

    return {
      agentName,
      startDate,
      endDate,
      totalMonths,
      overallScore,
      grade,
      rank,
      totalTickets,
      monthlyPerformance,
      milestones,
      kpiAnalysis,
      shiftAnalysis,
      categoryAnalysis,
      strengths,
      weaknesses,
      recommendations
    };
  }
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
      
      {/* Debug Controls */}
      <div className="flex justify-center mb-4">
        <button
          onClick={toggleBacklogDebug}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            backlogDebugEnabled 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {backlogDebugEnabled ? 'Disable' : 'Enable'} Backlog Debug
        </button>
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
                            // Use filteredTickets from AgentAnalyticsContext instead of allTickets
                            const agentFilteredTickets = allTickets.filter(t => {
                              // Apply the same time filtering logic as in AgentAnalyticsContext
                              if (!cutoffStart || !cutoffEnd) return true;
                              if (!t.openTime) return false;
                              const d = new Date(t.openTime);
                              if (isNaN(d.getTime())) return false;
                              return d >= cutoffStart && d <= cutoffEnd;
                            }).filter(t => t.openBy === selectedAgent);
                            
                            agentFilteredTickets.forEach(t => {
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

                {/* Agent Career Report */}
                {(() => {
                  const report = generateAgentReport(selectedAgent);
                  if (!report) return null;
                  
                  return (
                    <div className="mt-8 space-y-6">
                      {/* Report Header */}
                      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agent Career Report</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {report.agentName} • {report.totalMonths} months experience • {report.startDate.toLocaleDateString()} - {report.endDate.toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => exportToPDF(report)}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Download size={16} />
                              Export PDF
                            </button>
                            <button 
                              onClick={() => exportToExcel(report)}
                              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <FileText size={16} />
                              Export Excel
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Executive Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                              <Award className="text-white" size={20} />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Overall Grade</p>
                              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{report.grade}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-lg">
                              <Target className="text-white" size={20} />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Overall Score</p>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{report.overallScore}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500 rounded-lg">
                              <Users className="text-white" size={20} />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Team Rank</p>
                              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">#{report.rank}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500 rounded-lg">
                              <BarChart3 className="text-white" size={20} />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
                              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{report.totalTickets.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Career Timeline */}
                      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Calendar className="text-blue-500" size={20} />
                          Career Performance Timeline
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={report.monthlyPerformance}>
                            <XAxis dataKey="month" />
                            <YAxis domain={[0, 100]} />
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip />
                            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* KPI Radar Analysis */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Target className="text-green-500" size={20} />
                            KPI Performance Analysis
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={[
                              {
                                subject: 'FRT',
                                A: Math.min((report.kpiAnalysis.frt.target / report.kpiAnalysis.frt.avg) * 100, 100),
                                B: 100,
                                fullMark: 100,
                              },
                              {
                                subject: 'ART',
                                A: Math.min((report.kpiAnalysis.art.target / report.kpiAnalysis.art.avg) * 100, 100),
                                B: 100,
                                fullMark: 100,
                              },
                              {
                                subject: 'FCR',
                                A: report.kpiAnalysis.fcr.avg,
                                B: 100,
                                fullMark: 100,
                              },
                              {
                                subject: 'SLA',
                                A: report.kpiAnalysis.sla.avg,
                                B: 100,
                                fullMark: 100,
                              },
                              {
                                subject: 'Volume',
                                A: Math.min((report.kpiAnalysis.volume.avg / report.kpiAnalysis.volume.peak) * 100, 100),
                                B: 100,
                                fullMark: 100,
                              },
                            ]}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="subject" />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} />
                              <Radar name="Performance" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                              <Radar name="Target" dataKey="B" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Clock className="text-purple-500" size={20} />
                            Shift Performance Analysis
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Pagi', value: report.shiftAnalysis.pagi.count, fill: '#3b82f6' },
                                  { name: 'Siang', value: report.shiftAnalysis.siang.count, fill: '#22c55e' },
                                  { name: 'Malam', value: report.shiftAnalysis.malam.count, fill: '#f59e0b' },
                                ]}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="mt-4 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Optimal Shift: <span className="font-semibold text-purple-600">{report.shiftAnalysis.optimal}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Milestones & Achievements */}
                      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Star className="text-yellow-500" size={20} />
                          Career Milestones & Achievements
                        </h3>
                        <div className="space-y-3">
                          {report.milestones.map((milestone, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                              <div className={`p-2 rounded-full ${
                                milestone.type === 'achievement' ? 'bg-green-100 text-green-600' :
                                milestone.type === 'improvement' ? 'bg-blue-100 text-blue-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {milestone.type === 'achievement' ? <Award size={16} /> :
                                 milestone.type === 'improvement' ? <TrendingUp size={16} /> :
                                 <Calendar size={16} />}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{milestone.title}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{milestone.description}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{milestone.date}</p>
                              </div>
                              {milestone.value && (
                                <div className="text-right">
                                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{milestone.value}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <CheckCircle className="text-green-500" size={20} />
                            Key Strengths
                          </h3>
                          <div className="space-y-2">
                            {report.strengths.length > 0 ? (
                              report.strengths.map((strength, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                  <CheckCircle className="text-green-500" size={16} />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{strength}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">No significant strengths identified</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
                          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-orange-500" size={20} />
                            Areas for Improvement
                          </h3>
                          <div className="space-y-2">
                            {report.weaknesses.length > 0 ? (
                              report.weaknesses.map((weakness, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                  <AlertTriangle className="text-orange-500" size={16} />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">{weakness}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">No significant weaknesses identified</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                     <LightbulbIcon className="text-yellow-500" />
                          Development Recommendations
                        </h3>
                        <div className="space-y-3">
                          {report.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                                             <div className="p-1 bg-yellow-100 dark:bg-yellow-800 rounded-full">
                                 <LightbulbIcon className="text-yellow-600" />
                               </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Category Expertise */}
                      <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <BarChart3 className="text-indigo-500" size={20} />
                          Category Expertise Analysis
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2">Category</th>
                                <th className="text-right py-2">Tickets</th>
                                <th className="text-right py-2">Percentage</th>
                                <th className="text-right py-2">Avg Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {report.categoryAnalysis.categories.map((cat, index) => (
                                <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                                  <td className="py-2">{cat.name}</td>
                                  <td className="text-right py-2">{cat.count}</td>
                                  <td className="text-right py-2">{cat.percentage.toFixed(1)}%</td>
                                  <td className="text-right py-2">{cat.avgScore.toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-300">Strongest Category</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{report.categoryAnalysis.strongest}</p>
                          </div>
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Needs Improvement</p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{report.categoryAnalysis.weakest}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </PageWrapper>
  );
};

export default AgentAnalytics; 