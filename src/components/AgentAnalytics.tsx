import React, { useMemo } from 'react';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { BookUser, Trophy, Zap, Users, ArrowUpRight, ArrowDownRight, Clock, Award, BarChart, Inbox, Star } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAgentStore } from '@/store/agentStore';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement,
  ChartDataLabels
);

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

const AgentAnalytics = ({ data }) => {
  const agentMetrics = useAgentStore(state => state.agentMetrics);

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

  if (!data || !data.summary || data.agentList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <BookUser className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">No agent data available</h3>
        <p>Please upload a file to see agent analytics.</p>
      </div>
    );
  }

  const { agentList, summary, agentMonthlyChart } = data;

  const summaryCards = [
    { title: 'Total Active Agents', value: summary.totalAgents, icon: Users, description: 'Agents handling tickets' },
    { title: 'Most Active Agent', value: summary.busiestAgentName, icon: Trophy, description: 'Highest ticket volume' },
    { title: 'Most Efficient Agent', value: summary.mostEfficientAgentName, icon: Zap, description: 'Lowest avg. handling time' },
    { title: 'Highest Resolution Rate', value: summary.highestResolutionAgentName, icon: Award, description: 'Best ticket closing rate' },
  ];

  // Prepare per-agent monthly data for trendline
  const agentTrends = useMemo(() => {
    if (!agentMonthlyChart) return {};
    const { labels, datasets } = agentMonthlyChart;
    const trends = {};
    datasets.forEach(ds => {
      trends[ds.label] = {
        labels,
        data: ds.data,
        color: ds.borderColor,
      };
    });
    return trends;
  }, [agentMonthlyChart]);

  return (
    <>
      <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-6 font-sans">Agent Performance Analysis</h2>
      {/* Global KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card, index) => (
            <Card key={index} className="rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
                <CardTitle className="text-sm font-semibold font-sans text-gray-500 dark:text-gray-400">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${AGENT_COLORS[index % AGENT_COLORS.length]}`} />
            </CardHeader>
              <CardContent className="p-0">
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white font-sans truncate" title={card.value}>{card.value}</div>
                <p className="text-xs text-gray-400 dark:text-gray-500">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Per-Agent Cards with Trendline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {agentList.map((agent, index) => {
          // Find metric for this agent
          const metric = agentMetrics.find(m => m.agent === agent.agentName);
          const trendData = agentTrends[agent.agentName];

          const durationMetrics = [
            { label: 'Total', value: agent.totalDurationFormatted, description: 'Total Handling Duration' },
            { label: 'Rata-rata', value: agent.avgDurationFormatted, description: 'Average Handling Duration' },
            { label: 'Tercepat', value: agent.minDurationFormatted, description: 'Fastest Handling Duration' },
            { label: 'Terlama', value: agent.maxDurationFormatted, description: 'Longest Handling Duration' },
          ];

          const kpiMetrics = metric ? [
            { label: 'FRT', value: metric.frt.toFixed(1), icon: Clock },
            { label: 'ART', value: metric.art.toFixed(1), icon: Clock },
            { label: 'FCR', value: `${metric.fcr.toFixed(1)}%`, icon: Award },
            { label: 'SLA', value: `${metric.sla.toFixed(1)}%`, icon: Award },
            { label: 'Volume', value: metric.vol, icon: BarChart },
            { label: 'Backlog', value: metric.backlog, icon: Inbox, isRed: true },
          ] : [];

          return (
            <div key={index} className="bg-white/95 dark:bg-zinc-900/95 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-zinc-800 flex flex-col gap-6 transition-all duration-300">
              {/* Agent Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{agent.agentName}</h3>
                  <span className="rounded-md px-3 py-1 text-sm font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">{metric ? metric.vol : 0} Tickets</span>
                </div>
                {/* Restored Rank Badge */}
                {metric && (
                  <span
                    className={`w-10 h-10 flex items-center justify-center rounded-full font-bold text-xl shadow-inner
                      ${metric.rank === 'A' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-2 border-green-200 dark:border-green-700' :
                        metric.rank === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700' :
                        metric.rank === 'C' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border-2 border-yellow-200 dark:border-yellow-700' :
                        'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-2 border-red-200 dark:border-red-700'}
                      `}
                    title={
                      metric.rank === 'A' ? `Excellent (Score: ${metric.score.toFixed(1)})` :
                      metric.rank === 'B' ? `Good (Score: ${metric.score.toFixed(1)})` :
                      metric.rank === 'C' ? `Average (Score: ${metric.score.toFixed(1)})` :
                      `Needs Improvement (Score: ${metric.score.toFixed(1)})`
                    }
                  >
                    {metric.rank}
                  </span>
                )}
              </div>
              
              {/* Duration Metrics */}
              <div className="grid grid-cols-4 gap-4">
                {durationMetrics.map(m => (
                  <div key={m.label} className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-4 flex flex-col items-center text-center border border-gray-100 dark:border-zinc-800">
                    <Clock className="w-5 h-5 text-gray-400 mb-2"/>
                    <p className="text-xs text-gray-500 font-semibold">{m.label}</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100 font-mono">{m.value}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{m.description}</p>
                  </div>
                ))}
              </div>

              {/* KPI Metrics */}
              {metric && (
                <div className="grid grid-cols-6 gap-3">
                  {kpiMetrics.map(kpi => (
                    <div key={kpi.label} className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-3 flex flex-col items-center text-center border border-gray-100 dark:border-zinc-800">
                      <kpi.icon className={`w-5 h-5 mb-2 ${kpi.isRed ? 'text-red-500' : 'text-blue-500'}`} />
                      <p className={`text-lg font-bold font-mono ${kpi.isRed ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>{kpi.value}</p>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1">{kpi.label}</p>
                      {/* Penjelasan KPI */}
                      <p className="text-[10px] text-gray-400 mt-0.5">
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
              )}
              
              {/* Score Progress Bar */}
              {metric ? (
                <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${metric.score}%` }}></div>
                </div>
              ) : (
                <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2.5" />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default AgentAnalytics; 