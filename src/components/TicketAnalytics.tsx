import React, { useState, useMemo } from 'react';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  ArcElement, // Needed for Doughnut
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Download, ArrowUpRight, ArrowDownRight, TicketIcon, ClockIcon, CheckCircleIcon, UserIcon } from 'lucide-react';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

type ClassificationDetails = {
  count: number;
  sub: { [key: string]: number };
  trendline?: { labels: string[]; data: number[] };
  trendPercent?: number;
};

type ClassificationData = {
  [key: string]: ClassificationDetails;
};

const TicketAnalytics = ({ data }: { data?: { 
  stats: any[], 
  complaintsData: any, 
  monthlyStatsData: any, 
  classificationData: ClassificationData,
  topComplaintsTable: any[],
  zeroDurationCount?: number,
  agentStats?: any[],
  complaintTrendsData?: any
} }) => {
  // Guard clause for when data is not yet available
  if (!data || !data.stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <h3 className="text-xl font-semibold">Data Analisis Tiket</h3>
        <p>Tidak ada data yang cukup untuk ditampilkan. Unggah file untuk memulai.</p>
      </div>
    );
  }

  const { stats, complaintsData, monthlyStatsData, classificationData, topComplaintsTable, zeroDurationCount, agentStats } = data;

  // --- Repeat-Complainer Analysis ---
  // Agregasi per customer
  const customerStats = useMemo(() => {
    if (!data || !data.stats) return [];
    const map = new Map();
    data.stats.forEach(t => {
      if (!t.customer) return;
      if (!map.has(t.customer)) {
        map.set(t.customer, { customer: t.customer, count: 0, repClass: t.repClass });
      }
      const obj = map.get(t.customer);
      obj.count += 1;
      obj.repClass = t.repClass; // asumsikan repClass sudah final per customer
    });
    return Array.from(map.values());
  }, [data.stats]);

  // Ringkasan jumlah dan persentase tiap kelas
  const repClassSummary = useMemo(() => {
    const summary = { Normal: 0, Persisten: 0, Kronis: 0, Ekstrem: 0 };
    customerStats.forEach(c => {
      if (summary[c.repClass] !== undefined) summary[c.repClass] += 1;
    });
    const total = customerStats.length;
    return { ...summary, total };
  }, [customerStats]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!data || !data.stats) return;
    const rows = [
      ['Title', 'Value', 'Description'],
      ...data.stats.map(stat => [stat.title, stat.value, stat.description])
    ];
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ticket-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header & Export */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Ticket Analysis</h2>
          <p className="text-gray-500 dark:text-gray-400">Summary and trends of all tickets</p>
        </div>
        <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition text-sm font-semibold">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Warning for zero duration tickets */}
      {zeroDurationCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 text-yellow-800 dark:text-yellow-200 text-sm font-medium">
          ⚠️ <b>{zeroDurationCount}</b> tickets have 0 hour duration. Please check your Excel file for accurate duration analysis.
        </div>
      )}

      {/* Automated Insights */}
      {/* {insights && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-200">Automated Insights</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
            <p>The busiest month is <strong>{insights.busiestMonth.month}</strong> with a total of <strong>{insights.busiestMonth.count}</strong> incoming tickets.</p>
            <p>The most frequent complaint category is <strong>{insights.topComplaint.category}</strong>, accounting for <strong>{insights.topComplaint.percentage}%</strong> of all complaints.</p>
          </CardContent>
        </Card>
      )} */}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="relative rounded-xl shadow-sm border bg-white dark:bg-zinc-900">
            <CardHeader className="pb-0 flex flex-row justify-between items-start gap-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide">
                {stat.title}
              </CardTitle>
              {/* Icon di kanan atas, tidak absolute agar tidak mengganggu layout */}
              {stat.title === 'Total Tickets' && <TicketIcon className="w-5 h-5 text-sky-500" />}
              {stat.title === 'Average Duration' && <ClockIcon className="w-5 h-5 text-emerald-500" />}
              {stat.title === 'Closed Tickets' && <CheckCircleIcon className="w-5 h-5 text-rose-500" />}
              {stat.title === 'Active Agents' && <UserIcon className="w-5 h-5 text-purple-500" />}
            </CardHeader>
            <CardContent className="flex flex-col items-start py-5 px-5 gap-2">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {stat.title === 'Average Duration' && (!stat.value || stat.value === '00:00:00' || stat.value === '-' || stat.value === null || stat.value === undefined)
                  ? <span className="text-gray-400">N/A</span>
                  : stat.value}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stat.description}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-xl shadow-md border border-gray-200 bg-white dark:bg-zinc-900 min-w-[380px] p-8 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">Tickets per Month</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 h-[320px]">
            {monthlyStatsData && monthlyStatsData.labels && monthlyStatsData.labels.length > 0 ? (
              <Line
                data={{
                  ...monthlyStatsData,
                  datasets: monthlyStatsData.datasets.map((ds, i) => ({
                    ...ds,
                    fill: true,
                    backgroundColor: (ctx) => i === 0 ? 'rgba(99,102,241,0.15)' : 'rgba(236,72,153,0.10)',
                    borderColor: i === 0 ? '#6366F1' : '#EC4899',
                    pointBackgroundColor: i === 0 ? '#6366F1' : '#EC4899',
                    pointRadius: 0,
                    borderWidth: 3,
                    tension: 0.5,
                    pointHoverRadius: 0,
                    pointBorderWidth: 2,
                  })),
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom',
                      labels: {
                        font: { size: 15, family: 'Inter, sans-serif', weight: 'bold' },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: '#6366F1',
                        padding: 24,
                      },
                    },
                    tooltip: {
                      backgroundColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#1e293b' : '#fff',
                      titleColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#fff' : '#1e293b',
                      bodyColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#e5e7eb' : '#334155',
                      borderColor: 'transparent',
                      borderWidth: 0,
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
                      color: '#6366F1',
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      borderRadius: 4,
                      padding: 4,
                      formatter: Math.round,
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: '#F3F4F6' },
                      ticks: { color: '#6B7280', font: { size: 13, weight: 'bold' }, maxRotation: 30, minRotation: 0, autoSkip: true, maxTicksLimit: 8 },
                    },
                    y: {
                      grid: { color: '#F3F4F6' },
                      ticks: { color: '#6B7280', font: { size: 13, weight: 'bold' } },
                      beginAtZero: true,
                    },
                  },
                  animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart',
                  },
                }}
                height={320}
                aria-label="Tickets per Month Trendline"
              />
            ) : (
              <div className="text-center text-gray-400 py-12">No data for this chart</div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-md border border-gray-200 bg-white dark:bg-zinc-900 min-w-[380px] p-8 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">Complaint Categories</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 h-[320px] flex flex-col items-center justify-center">
            {complaintsData && complaintsData.labels && complaintsData.labels.length > 0 ? (
              <div className="relative flex flex-col items-center justify-center w-full h-full">
                <Doughnut
                  data={{
                    ...complaintsData,
                    datasets: complaintsData.datasets.map(ds => ({
                      ...ds,
                      backgroundColor: [
                        '#5271ff', '#22c55e', '#f59e42', '#ec4899', '#a855f7', '#fbbf24', '#0ea5e9', '#6366f1', '#84cc16', '#f472b6',
                      ],
                      borderWidth: 4,
                      borderColor: '#fff',
                      hoverOffset: 16,
                    }))
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#1e293b' : '#fff',
                        titleColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#fff' : '#1e293b',
                        bodyColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#e5e7eb' : '#334155',
                        borderColor: '#5271ff',
                        borderWidth: 2,
                        padding: 16,
                        displayColors: true,
                        cornerRadius: 12,
                        caretSize: 10,
                        callbacks: {
                          label: (ctx) => {
                            const val = ctx.parsed;
                            const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                            const percent = total ? ((val/total)*100).toFixed(1) : '0.0';
                            return `${ctx.label}: ${val} tickets (${percent}%)`;
                          }
                        }
                      },
                    },
                    animation: {
                      animateRotate: true,
                      duration: 900,
                      easing: 'easeInOutQuart',
                    },
                  }}
                  height={240}
                  aria-label="Complaint Categories Pie Chart"
                />
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-blue-800 dark:text-blue-200 font-bold text-lg">Total</span>
                  <span className="text-blue-800 dark:text-blue-200 font-extrabold text-3xl drop-shadow-lg">{complaintsData.datasets[0]?.data?.reduce((a,b)=>a+b,0)}</span>
                </div>
                {/* Custom legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-6 w-full">
                  {complaintsData.labels.map((label, idx) => {
                    const val = complaintsData.datasets[0].data[idx];
                    const total = complaintsData.datasets[0].data.reduce((a,b)=>a+b,0);
                    const percent = total ? ((val/total)*100).toFixed(1) : '0.0';
                    return (
                      <span key={label} className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-zinc-800 rounded-full px-3 py-1 shadow-sm">
                      <span className="w-4 h-4 rounded-full border-2 border-white shadow" style={{background: complaintsData.datasets[0].backgroundColor[idx]}}></span>
                        <span>{label}</span>
                        <span className="font-bold text-blue-700">{val}</span>
                        <span className="text-xs text-gray-500">({percent}%)</span>
                    </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-12">No data for this chart</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Complaint Trendline */}
      {data.complaintTrendsData && (
        <Card>
          <CardHeader>
            <CardTitle>Complaint Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <Line
              data={data.complaintTrendsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#1e293b' : '#fff',
                    titleColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#fff' : '#1e293b',
                    bodyColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#e5e7eb' : '#334155',
                    borderColor: '#1EC6DF',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                  },
                  datalabels: {
                    display: true,
                    align: 'top',
                    anchor: 'end',
                    font: { weight: 'bold', family: 'Poppins, Arial, sans-serif' },
                    color: '#6366F1',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    borderRadius: 4,
                    padding: 4,
                    formatter: Math.round,
                  },
                },
                scales: {
                  x: { grid: { color: '#E5E7EB' }, ticks: { color: '#A0AEC0', font: { size: 12 } } },
                  y: { grid: { color: '#E5E7EB' }, ticks: { color: '#A0AEC0', font: { size: 12 } }, beginAtZero: true },
                },
              }}
              height={180}
            />
          </CardContent>
        </Card>
      )}

      {/* Top Agents by Closed Tickets */}
      {agentStats && (
        <Card>
          <CardHeader>
            <CardTitle>Top Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {agentStats.map((agent, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">{agent.name}</span>
                  <span className="ml-auto text-xs rounded px-2 py-0.5 font-semibold" style={{background:'#5271ff',color:'#fff'}}>{agent.closed} closed</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Complaints Table */}
      {topComplaintsTable && topComplaintsTable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Complaints</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-separate border-spacing-0">
                <thead className="bg-blue-50 dark:bg-blue-900 text-xs text-blue-900 dark:text-blue-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 font-bold border-b border-blue-100 dark:border-blue-800">Category</th>
                    <th className="px-4 py-2 font-bold border-b border-blue-100 dark:border-blue-800">Tickets</th>
                    <th className="px-4 py-2 font-bold border-b border-blue-100 dark:border-blue-800">Avg Duration</th>
                </tr>
              </thead>
                <tbody>
                  {topComplaintsTable.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-blue-50 dark:bg-blue-900/40"}>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-white border-b border-blue-50 dark:border-blue-900 group hover:bg-blue-100 dark:hover:bg-blue-800 transition">{item.category}</td>
                      <td className="px-4 py-2 border-b border-blue-50 dark:border-blue-900 group hover:bg-blue-100 dark:hover:bg-blue-800 transition"><span className="px-2 py-0.5 rounded text-xs font-semibold" style={{background:'#5271ff',color:'#fff'}}>{item.count}</span></td>
                      <td className="px-4 py-2 border-b border-blue-50 dark:border-blue-900 group hover:bg-blue-100 dark:hover:bg-blue-800 transition">{item.avgDurationFormatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Classification Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>Classification Analysis</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(classificationData).map(([classification, details], index) => {
              const total = details.count;
              const subEntries = Object.entries(details.sub);
              const trendline = details.trendline;
              const trendPercent = details.trendPercent;
              const isUp = trendPercent !== null && trendPercent > 0;
              const isDown = trendPercent !== null && trendPercent < 0;
              return (
                <div key={index} className="bg-gray-50 rounded-xl shadow p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-blue-700 text-lg flex items-center gap-2">
                      {classification}
                      {trendPercent !== null && (
                        <span className={`flex items-center text-xs font-bold ${isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-gray-400'}`}>
                          {isUp && <ArrowUpRight className="w-4 h-4 mr-0.5" />} 
                          {isDown && <ArrowDownRight className="w-4 h-4 mr-0.5" />} 
                          {Math.abs(trendPercent).toFixed(1)}%
                        </span>
                      )}
                    </span>
                    <span className="rounded px-2 py-0.5 text-xs font-bold" style={{background:'#5271ff',color:'#fff'}}>{total} tickets</span>
                  </div>
                  {trendline && trendline.labels && trendline.data && trendline.labels.length > 1 && (
                    <div className="mb-2">
                      <Line
                        data={{
                          labels: trendline.labels,
                          datasets: [
                            {
                              label: 'Tickets',
                              data: trendline.data,
                              borderColor: '#6366F1',
                              backgroundColor: (ctx) => {
                                return 'rgba(99,102,241,0.10)';
                              },
                              fill: true,
                              tension: 0.5,
                              pointRadius: 0,
                              pointBackgroundColor: '#6366F1',
                              borderWidth: 2,
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
                              borderColor: '#6366F1',
                              borderWidth: 1,
                              titleColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#fff' : '#1e293b',
                              bodyColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#e5e7eb' : '#334155',
                              padding: 10,
                              displayColors: false,
                              cornerRadius: 8,
                              caretSize: 8,
                            },
                            datalabels: {
                              display: true,
                              align: 'top',
                              anchor: 'end',
                              font: { weight: 'bold', family: 'Poppins, Arial, sans-serif' },
                              color: '#6366F1',
                              backgroundColor: 'rgba(255,255,255,0.8)',
                              borderRadius: 4,
                              padding: 4,
                              formatter: Math.round,
                            },
                          },
                          scales: {
                            x: {
                              grid: { color: '#F3F4F6' },
                              ticks: { color: '#6B7280', font: { size: 11 } },
                            },
                            y: {
                              grid: { color: '#F3F4F6' },
                              ticks: { color: '#6B7280', font: { size: 11 } },
                              beginAtZero: true,
                            },
                          },
                          animation: {
                            duration: 800,
                            easing: 'easeInOutCubic',
                          },
                        }}
                        height={80}
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {subEntries.map(([sub, count], subIdx) => {
                      const percent = total > 0 ? (count / total) * 100 : 0;
                      const colorList = ['#6366F1','#22C55E','#F59E42','#EF4444','#8B5CF6','#3B82F6','#F472B6','#14B8A6','#EAB308','#0EA5E9'];
                      const color = colorList[subIdx % colorList.length];
                      return (
                        <div key={subIdx} className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <span className="w-3 h-3 rounded-full" style={{backgroundColor: color}}></span>
                              {sub}
                            </span>
                            <span className="font-mono rounded px-2 py-0.5 text-xs" style={{background:'#5271ff',color:'#fff'}}>{count}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded">
                            <div className="h-2 rounded" style={{width: `${percent}%`, backgroundColor: color, transition: 'width 0.5s'}}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketAnalytics;
