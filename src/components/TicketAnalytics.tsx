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
  keywordAnalysis: [string, number][],
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
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-2xl shadow-lg p-4 text-yellow-800 dark:text-yellow-200 text-sm font-medium">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative rounded-2xl shadow-lg border-gray-100 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/80">
            <CardHeader className="pb-0 flex flex-row justify-between items-start gap-0 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-900 dark:text-zinc-200">
                {stat.title}
              </span>
              {/* Icon di kanan atas */}
              {stat.title === 'Total Tickets' && <TicketIcon className="w-5 h-5 text-sky-500" />}
              {stat.title === 'Average Duration' && <ClockIcon className="w-5 h-5 text-emerald-500" />}
              {stat.title === 'Closed Tickets' && <CheckCircleIcon className="w-5 h-5 text-rose-500" />}
              {stat.title === 'Active Agents' && <UserIcon className="w-5 h-5 text-purple-500" />}
            </CardHeader>
            <CardContent className="flex flex-col items-start py-5 px-5 gap-2">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-zinc-200">
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Charts */}
        <div className="lg:col-span-3 grid grid-cols-1 gap-6">
          <Card className="rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/80 p-6 flex flex-col justify-between">
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
        </div>
        
        {/* Doughnut Chart */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-6">
          <Card className="rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/80 p-6 flex flex-col justify-between">
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
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-6 w-full">
                    {complaintsData.labels.map((label, idx) => {
                      const val = complaintsData.datasets[0].data[idx];
                      const total = complaintsData.datasets[0].data.reduce((a,b)=>a+b,0);
                      const percent = total ? ((val/total)*100).toFixed(1) : '0.0';
                      return (
                        <span key={label} className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        <span className="w-3 h-3 rounded-full border-2 border-white shadow" style={{background: complaintsData.datasets[0].backgroundColor[idx]}}></span>
                          <span>{label}</span>
                          <span className="font-bold">{val}</span>
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
      </div>

      {/* Full-width Hotspot Table */}
      {topComplaintsTable && topComplaintsTable.length > 0 && (
        <div className="mb-6">
          <Card className="rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/80 p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">Category Hotspot Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-separate border-spacing-0">
                  <thead className="text-xs text-gray-500 dark:text-gray-400 sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b-2 border-gray-200 dark:border-zinc-700 w-1/12 text-center">Rank</th>
                      <th className="px-4 py-3 font-semibold border-b-2 border-gray-200 dark:border-zinc-700">Category</th>
                      <th className="px-4 py-3 font-semibold border-b-2 border-gray-200 dark:border-zinc-700 text-center">Tickets</th>
                      <th className="px-4 py-3 font-semibold border-b-2 border-gray-200 dark:border-zinc-700 text-center">Avg Duration</th>
                      <th className="px-4 py-3 font-semibold border-b-2 border-gray-200 dark:border-zinc-700">Impact Score</th>
                      <th className="px-4 py-3 font-semibold border-b-2 border-gray-200 dark:border-zinc-700">Top Sub-Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topComplaintsTable.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3 font-bold text-lg text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-zinc-800 text-center">#{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-zinc-800">{item.category}</td>
                        <td className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 text-center"><span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">{item.count}</span></td>
                        <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-zinc-800 text-center">{item.avgDurationFormatted}</td>
                        <td className="px-4 py-3 font-mono text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{item.impactScore.toFixed(2)}</span>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(item.impactScore / topComplaintsTable[0].impactScore) * 100}%` }}></div>
                            </div>
                          </div>
                        </td>
                         <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-zinc-800">{item.topSubCategory}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classification Analysis Section */}
        <div className="lg:col-span-1">
            <Card className="rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/80 p-6">
                 <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">Classification Analysis</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 -mx-6 px-0">
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(classificationData)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([classification, details], index) => {
                  return (
                    <AccordionItem value={`item-${index}`} key={index} className="border-b border-gray-100 dark:border-zinc-800 px-6">
                      <AccordionTrigger className="py-4 hover:no-underline text-left">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-gray-500 dark:text-gray-400 text-lg w-8">
                              #{index + 1}
                            </span>
                             <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                              {classification}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-extrabold text-gray-900 dark:text-zinc-200">{details.count}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Total</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-4">
                        <div className="flex flex-row flex-wrap gap-3 pl-12">
                          {details.trendline?.labels.map((label, i) => {
                            const count = details.trendline.data[i];
                            const prevCount = i > 0 ? details.trendline.data[i-1] : 0;
                            let percentChange: number | null = null;
                            if(i > 0 && prevCount > 0) {
                              percentChange = ((count - prevCount) / prevCount) * 100;
                            }

                            return (
                              <div key={label} className="flex flex-col items-center justify-center p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/70 border border-gray-200 dark:border-zinc-700 w-28 text-center">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
                                <span className="text-xl font-bold text-gray-900 dark:text-gray-100 my-1">{count}</span>
                                {percentChange !== null ? (
                                  <span className={`flex items-center gap-1 text-xs font-semibold ${percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {percentChange >= 0 ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                                    {Math.abs(percentChange).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
              })}
            </Accordion>
            </CardContent>
          </Card>
        </div>
        
        {/* Keyword Analysis Section */}
        <div className="lg:col-span-1">
          <Card className="rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/80 p-6 h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-blue-800 dark:text-blue-200">Keyword Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-end justify-center">
                {data.keywordAnalysis.map(([keyword, count], index) => {
                  const maxCount = data.keywordAnalysis[0][1];
                  const minCount = data.keywordAnalysis[data.keywordAnalysis.length - 1][1];
                  // Avoid division by zero if all counts are the same
                  const weight = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
                  const fontSize = 0.8 + weight * 1.2; // Font size from 0.8rem to 2.0rem
                  const opacity = 0.6 + weight * 0.4; // Opacity from 60% to 100%
                  
                  return (
                    <span 
                      key={index} 
                      className="font-bold text-gray-700 dark:text-gray-300 transition-all duration-300 p-1"
                      style={{ fontSize: `${fontSize}rem`, opacity: opacity, lineHeight: '1.2' }}
                    >
                      {keyword}
                    </span>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TicketAnalytics;
