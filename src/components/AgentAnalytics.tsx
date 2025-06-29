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
    { title: 'Total Active Agents', value: summary.totalAgents, icon: Users },
    { title: 'Most Active Agent', value: summary.busiestAgentName, icon: Trophy },
    { title: 'Most Efficient Agent', value: summary.mostEfficientAgentName, icon: Zap },
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
    <div className="space-y-8">
      <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-6 font-sans">Agent Performance Analysis</h2>
      {/* Global KPI Summary Cards */}
      {summaryKpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        {summaryCards.map((card, index) => (
            <Card key={index} className="rounded-xl shadow-sm border bg-white dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold font-sans">{card.title}</CardTitle>
                <card.icon className={`h-6 w-6 ${AGENT_COLORS[index % AGENT_COLORS.length]}`} />
            </CardHeader>
              <CardContent className="py-5 px-5">
                <div className="text-3xl font-extrabold text-gray-900 font-sans">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
      {/* Per-Agent Cards with Trendline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentList.map((agent, index) => {
          // Find metric for this agent
          const metric = agentMetrics.find(m => m.agent === agent.agentName);
          return (
            <Card key={index} className="rounded-xl shadow-sm border bg-white dark:bg-zinc-900 flex flex-col py-5 px-5 transition-transform duration-200 hover:scale-[1.025] hover:shadow-2xl relative">
              {/* KPI Badge */}
              {metric && (
                <span
                  className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-lg border-2 border-white drop-shadow-lg font-sans`}
                  title={`Composite Efficiency Score ${metric.score.toFixed(1)}`}
                  style={{letterSpacing: 1}}
                >
                  {metric.rank}
                </span>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-extrabold font-sans" style={{color: TREND_COLORS[index % TREND_COLORS.length]}}>{agent.agentName}</span>
                {/* Badge rank simple & keren */}
                {metric && (
                  <span
                    className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full font-bold text-lg shadow-sm
                      ${metric.rank === 'A' ? 'bg-green-500 text-white' :
                        metric.rank === 'B' ? 'bg-blue-500 text-white' :
                        metric.rank === 'C' ? 'bg-yellow-400 text-white' :
                        'bg-red-500 text-white'}
                      transition-transform duration-150 hover:scale-110 cursor-default`}
                    title={
                      metric.rank === 'A' ? 'Excellent' :
                      metric.rank === 'B' ? 'Good' :
                      metric.rank === 'C' ? 'Average' :
                      'Needs Improvement'
                    }
                  >
                    {metric.rank}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded px-3 py-1 text-sm font-bold font-sans shadow" style={{background:'#5271ff',color:'#fff'}}>{agent.ticketCount} Tickets</span>
              </div>
              {/* Redesain statistik durasi clean */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-3 flex flex-col items-center border border-gray-200 dark:border-zinc-800 hover:shadow-lg transition-all">
                  <Clock className="text-blue-500 w-5 h-5 mb-1" />
                  <span className="text-[11px] text-gray-500 font-semibold">Total</span>
                  <span className="font-mono font-extrabold text-neutral-900 dark:text-white text-lg">{agent.totalDurationFormatted}</span>
                  <span className="text-[10px] text-gray-400 mt-1">Total Handling Duration</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-3 flex flex-col items-center border border-gray-200 dark:border-zinc-800 hover:shadow-lg transition-all">
                  <Clock className="text-blue-500 w-5 h-5 mb-1" />
                  <span className="text-[11px] text-gray-500 font-semibold">Rata-rata</span>
                  <span className="font-mono font-extrabold text-neutral-900 dark:text-white text-lg">{agent.avgDurationFormatted}</span>
                  <span className="text-[10px] text-gray-400 mt-1">Average Handling Duration</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-3 flex flex-col items-center border border-gray-200 dark:border-zinc-800 hover:shadow-lg transition-all">
                  <Clock className="text-blue-500 w-5 h-5 mb-1" />
                  <span className="text-[11px] text-gray-500 font-semibold">Tercepat</span>
                  <span className="font-mono font-extrabold text-neutral-900 dark:text-white text-lg">{agent.minDurationFormatted}</span>
                  <span className="text-[10px] text-gray-400 mt-1">Fastest Handling Duration</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-3 flex flex-col items-center border border-gray-200 dark:border-zinc-800 hover:shadow-lg transition-all">
                  <Clock className="text-blue-500 w-5 h-5 mb-1" />
                  <span className="text-[11px] text-gray-500 font-semibold">Terlama</span>
                  <span className="font-mono font-extrabold text-neutral-900 dark:text-white text-lg">{agent.maxDurationFormatted}</span>
                  <span className="text-[10px] text-gray-400 mt-1">Longest Handling Duration</span>
                </div>
              </div>
              {/* Detail Penilaian KPI clean */}
              {metric && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {/* FRT */}
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 flex flex-col items-center border border-gray-200 dark:border-zinc-800">
                    <Clock className="text-blue-500 w-5 h-5 mb-1" />
                    <span className="sr-only">First Response Time</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white text-base">{metric.frt.toFixed(1)}</span>
                    <span className="text-[10px] text-gray-500 font-semibold mt-1">FRT</span>
                  </div>
                  {/* ART */}
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 flex flex-col items-center border border-gray-200 dark:border-zinc-800">
                    <Clock className="text-blue-500 w-5 h-5 mb-1" />
                    <span className="sr-only">Average Resolution Time</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white text-base">{metric.art.toFixed(1)}</span>
                    <span className="text-[10px] text-gray-500 font-semibold mt-1">ART</span>
                  </div>
                  {/* FCR */}
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 flex flex-col items-center border border-gray-200 dark:border-zinc-800">
                    <Award className="text-blue-500 w-5 h-5 mb-1" />
                    <span className="sr-only">First Contact Resolution</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white text-base">{metric.fcr.toFixed(1)}%</span>
                    <span className="text-[10px] text-gray-500 font-semibold mt-1">FCR</span>
                  </div>
                  {/* SLA */}
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 flex flex-col items-center border border-gray-200 dark:border-zinc-800">
                    <Award className="text-blue-500 w-5 h-5 mb-1" />
                    <span className="sr-only">SLA</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white text-base">{metric.sla.toFixed(1)}%</span>
                    <span className="text-[10px] text-gray-500 font-semibold mt-1">SLA</span>
                  </div>
                  {/* Volume */}
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 flex flex-col items-center border border-gray-200 dark:border-zinc-800">
                    <BarChart className="text-blue-500 w-5 h-5 mb-1" />
                    <span className="sr-only">Volume</span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white text-base">{metric.vol}</span>
                    <span className="text-[10px] text-gray-500 font-semibold mt-1">Volume</span>
                  </div>
                  {/* Backlog */}
                  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-2 flex flex-col items-center border border-gray-200 dark:border-zinc-800">
                    <Inbox className="text-red-500 w-5 h-5 mb-1" />
                    <span className="sr-only">Backlog</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400 text-base">{metric.backlog}</span>
                    <span className="text-[10px] text-gray-500 font-semibold mt-1">Backlog</span>
                  </div>
                </div>
              )}
              {/* Progress Bar Score */}
              {metric && (
                <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
                  <div className={`h-2 rounded-full transition-all duration-500 ${metric.score >= 60 ? 'bg-green-500' : metric.score >= 50 ? 'bg-blue-500' : metric.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${Math.round(metric.score)}%`}}></div>
                </div>
              )}
              {/* Trendline per month */}
              {agentTrends[agent.agentName] && (
                <div className="mt-2">
                  <Line
                    data={{
                      labels: agentTrends[agent.agentName].labels.map(label => {
                        const [month, year] = label.split('/');
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        return monthNames[Number(month)-1] + ' ' + year;
                      }),
                      datasets: [
                        {
                          label: 'Tickets per Month',
                          data: agentTrends[agent.agentName].data,
                          borderColor: TREND_COLORS[index % TREND_COLORS.length],
                          backgroundColor: (ctx) => TREND_COLORS[index % TREND_COLORS.length] + '22', // 13% opacity
                          fill: true,
                          tension: 0.5,
                          pointRadius: 0,
                          pointBackgroundColor: TREND_COLORS[index % TREND_COLORS.length],
                          borderWidth: 3,
                          pointHoverRadius: 0,
                          pointBorderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          enabled: true,
                          backgroundColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#1e293b' : '#fff',
                          borderColor: TREND_COLORS[index % TREND_COLORS.length],
                          borderWidth: 2,
                          titleColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#fff' : '#1e293b',
                          bodyColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#e5e7eb' : '#334155',
                          titleFont: { weight: 'bold', size: 15, family: 'Poppins, Arial, sans-serif' },
                          bodyFont: { weight: 'bold', size: 14, family: 'Poppins, Arial, sans-serif' },
                          padding: 14,
                          displayColors: true,
                          cornerRadius: 10,
                          caretSize: 10,
                        },
                        datalabels: {
                          display: true,
                          align: 'top',
                          anchor: 'end',
                          font: { weight: 'bold', family: 'Poppins, Arial, sans-serif' },
                          color: TREND_COLORS[index % TREND_COLORS.length],
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          borderRadius: 4,
                          padding: 4,
                          formatter: Math.round,
                        },
                      },
                      scales: {
                        x: {
                          grid: { color: '#F3F4F6' },
                          ticks: { color: '#6B7280', font: { size: 13, weight: 'bold', family: 'Poppins, Arial, sans-serif' } },
                        },
                        y: {
                          grid: { color: '#F3F4F6' },
                          ticks: { color: '#6B7280', font: { size: 13, weight: 'bold', family: 'Poppins, Arial, sans-serif' } },
                          beginAtZero: true,
                        },
                      },
                      animation: {
                        duration: 1000,
                        easing: 'easeInOutQuart',
                      },
                    }}
                    height={180}
                    aria-label={`Trendline for ${agent.agentName}`}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AgentAnalytics; 