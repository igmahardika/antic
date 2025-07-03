import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Download, ArrowUpRight, ArrowDownRight, TicketIcon, ClockIcon, CheckCircleIcon, UserIcon, Ticket, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useAnalytics } from './AnalyticsContext';
import SummaryCard from './ui/SummaryCard';
import TimeFilter from './TimeFilter';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend as RechartsLegend, Tooltip as RechartsTooltip, PieChart, Pie, Sector, Cell, Label as RechartsLabel, BarChart, Bar } from 'recharts';

type ClassificationDetails = {
  count: number;
  sub: { [key: string]: number };
  trendline?: { labels: string[]; data: number[] };
  trendPercent?: number;
};

type ClassificationData = {
  [key: string]: ClassificationDetails;
};

type TicketAnalyticsProps = {
  data?: any;
};

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

// Helper: convert chart.js-like data to recharts format
function toRechartsData(labels: string[], datasets: any[]) {
  // Assume 2 datasets: [incoming, closed]
  return labels.map((label, i) => ({
    label,
    incoming: datasets[0]?.data[i] ?? 0,
    closed: datasets[1]?.data[i] ?? 0,
  }));
}

// Helper: tentukan shift dari jam
function getShift(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  const hour = d.getHours();
  if (hour >= 9 && hour < 17) return 'Pagi';
  if (hour >= 17 || hour < 1) return 'Sore';
  if (hour >= 1 && hour < 9) return 'Malam';
  return 'Unknown';
}

const TicketAnalytics = ({ data: propsData }: TicketAnalyticsProps) => {
  const {
    ticketAnalyticsData,
    gridData, // filtered tickets
    startMonth, setStartMonth,
    endMonth, setEndMonth,
    selectedYear, setSelectedYear,
    allYearsInData,
    refresh
  } = useAnalytics();

  // Filter summary card: sembunyikan Average Duration dan Active Agents
  const stats = useMemo(() => {
    if (!ticketAnalyticsData || !Array.isArray(ticketAnalyticsData.stats)) return [];
    return ticketAnalyticsData.stats
      .filter(s => s.title !== 'Average Duration' && s.title !== 'Active Agents')
      .map(s => ({
        title: s.title.replace('Closed Tickets', 'Closed'),
        value: s.value,
        description: s.description
      }));
  }, [ticketAnalyticsData]);

  // Untuk chart dan analisis lain, gunakan ticketAnalyticsData yang sudah berbasis gridData
  const monthOptions = MONTH_OPTIONS;
  // Filtering logic for all years
  const filteredGridData = useMemo(() => {
    if (!gridData || !startMonth || !endMonth || !selectedYear) return [];
    if (selectedYear === 'ALL') {
      return gridData.filter(t => {
        if (!t.openTime) return false;
        if (!startMonth || !endMonth) return true;
        const d = new Date(t.openTime);
        const mStart = Number(startMonth) - 1;
        const mEnd = Number(endMonth) - 1;
        return d.getMonth() >= mStart && d.getMonth() <= mEnd;
      });
    }
    // Default: filter by year and month
    return gridData;
  }, [gridData, startMonth, endMonth, selectedYear]);
  const complaintsData = ticketAnalyticsData?.complaintsData || { labels: [], datasets: [] };
  const monthlyStatsData = ticketAnalyticsData?.monthlyStatsChartData || { labels: [], datasets: [] };
  const classificationData = ticketAnalyticsData?.classificationAnalysis || {};
  const topComplaintsTable = ticketAnalyticsData?.topComplaintsTableData || [];
  const zeroDurationCount = useMemo(() => Array.isArray(filteredGridData) ? filteredGridData.filter(t => t.duration?.rawHours === 0).length : 0, [filteredGridData]);
  const agentStats = ticketAnalyticsData?.agentAnalyticsData || [];

  // --- Repeat-Complainer Analysis ---
  // Agregasi per customer
  const customerStats = useMemo(() => {
    if (!Array.isArray(gridData)) return [];
    const map = new Map();
    gridData.forEach(t => {
      if (!t.customer) return;
      if (!map.has(t.customer)) {
        map.set(t.customer, { customer: t.customer, count: 0, repClass: t.repClass });
      }
      const obj = map.get(t.customer) as any;
      obj.count += 1;
      obj.repClass = t.repClass; // asumsikan repClass sudah final per customer
    });
    return Array.from(map.values());
  }, [gridData]);

  // Ringkasan jumlah dan persentase tiap kelas
  const repClassSummary = useMemo(() => {
    const summary = { Normal: 0, Persisten: 0, Kronis: 0, Ekstrem: 0 };
    (Array.isArray(customerStats) ? customerStats : []).forEach((c: any) => {
      if (summary[c.repClass] !== undefined) summary[c.repClass] += 1;
    });
    const total = customerStats.length;
    return { ...summary, total };
  }, [customerStats]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!Array.isArray(gridData)) return;
    const rows = [
      ['Title', 'Value', 'Description'],
      ...gridData.map(stat => [stat.title, stat.value, stat.description])
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

  // --- Agent Ticket per Shift (Area Chart, agregat semua agent per shift per bulan) ---
  type ShiftAreaDatum = { month: string; Pagi: number; Sore: number; Malam: number };
  const agentShiftAreaData: ShiftAreaDatum[] = useMemo(() => {
    if (!Array.isArray(gridData)) return [];
    // { [month]: { Pagi: 0, Sore: 0, Malam: 0 } }
    const map: Record<string, ShiftAreaDatum> = {};
    gridData.forEach(t => {
      if (!t.openTime) return;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shift = getShift(t.openTime);
      if (!map[month]) map[month] = { month, Pagi: 0, Sore: 0, Malam: 0 };
      map[month][shift] = (map[month][shift] || 0) + 1;
    });
    // Urutkan bulan
    return (Object.values(map) as ShiftAreaDatum[]).sort((a, b) => a.month.localeCompare(b.month));
  }, [gridData]);

  // Guard clause for when data is not yet available
  if (!gridData || gridData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Ticket Analytics</h1>
        <h3 className="text-xl md:text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Data Analisis Tiket</h3>
        <p>Tidak ada data yang cukup untuk ditampilkan. Unggah file untuk memulai.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Title & Description */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Ticket Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">Analisis statistik tiket, tren, dan kategori komplain dalam periode terpilih.</p>
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
          onRefresh={refresh}
        />
      </div>

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

      {/* Summary Cards - Standardized */}
      <div className="px-2 md:px-4 lg:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {stats.map(s => {
          // Standardized mapping for icons and backgrounds
          const titleKey = s.title.trim().toUpperCase();
          const iconMap: Record<string, { icon: React.ReactNode; iconBg: string }> = {
            'TOTAL TICKETS': {
              icon: <ConfirmationNumberIcon className="w-7 h-7 text-white" />, iconBg: "bg-blue-700"
            },
            'CLOSED': {
              icon: <CheckCircleIcon className="w-7 h-7 text-white" />, iconBg: "bg-green-600"
            },
            'OPEN': {
              icon: <ErrorOutlineIcon className="w-7 h-7 text-white" />, iconBg: "bg-orange-500"
            },
            'OVERDUE': {
              icon: <AccessTimeIcon className="w-7 h-7 text-white" />, iconBg: "bg-red-600"
            },
            'ESCALATED': {
              icon: <WarningAmberIcon className="w-7 h-7 text-white" />, iconBg: "bg-yellow-400"
            },
          };
          const { icon, iconBg } = iconMap[titleKey] || {
            icon: <WarningAmberIcon className="w-7 h-7 text-white" />, iconBg: "bg-gray-500"
          };

          return (
            <SummaryCard
              key={s.title}
              icon={icon}
              title={s.title}
              value={s.value}
              description={s.description}
              iconBg={iconBg}
              className="w-full"
            />
          );
        })}
      </div>

      {/* --- Agent Ticket per Shift Chart (Area) --- */}
      <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
        <CardHeader>
          <CardTitle>Agent Tickets per Shift</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={agentShiftAreaData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPagi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorSore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorMalam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <RechartsTooltip />
              <RechartsLegend />
              <Area type="monotone" dataKey="Pagi" stroke="#22c55e" fill="url(#colorPagi)" name="Pagi (09:00-17:00)" strokeWidth={3} />
              <Area type="monotone" dataKey="Sore" stroke="#3b82f6" fill="url(#colorSore)" name="Sore (17:00-01:00)" strokeWidth={3} />
              <Area type="monotone" dataKey="Malam" stroke="#ef4444" fill="url(#colorMalam)" name="Malam (01:00-09:00)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Charts */}
        <div className="lg:col-span-3 grid grid-cols-1 gap-6">
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
            <CardHeader>
              <CardTitle>Tickets per Month</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 h-[320px]">
              {monthlyStatsData && monthlyStatsData.labels && monthlyStatsData.labels.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={toRechartsData(monthlyStatsData.labels, monthlyStatsData.datasets)} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#EC4899" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <RechartsTooltip />
                    <RechartsLegend />
                    <Area type="monotone" dataKey="incoming" stroke="#6366F1" fill="url(#colorIncoming)" name="Incoming Tickets" strokeWidth={3} />
                    <Area type="monotone" dataKey="closed" stroke="#EC4899" fill="url(#colorClosed)" name="Closed Tickets" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-400 py-12">No data for this chart</div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Doughnut Chart */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-6">
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
            <CardHeader>
              <CardTitle>Complaint Categories</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 h-[320px] flex flex-col items-center justify-center">
              {complaintsData && complaintsData.labels && complaintsData.labels.length > 0 ? (
                <div className="relative flex flex-col items-center justify-center w-full h-full">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={complaintsData.labels.map((label, idx) => ({
                          name: label,
                          value: complaintsData.datasets[0].data[idx],
                          fill: complaintsData.datasets[0].backgroundColor[idx],
                        }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={5}
                        labelLine={false}
                        isAnimationActive={true}
                      >
                        <RechartsLabel
                          position="center"
                          content={({ viewBox }) => {
                            const total = complaintsData.datasets[0].data.reduce((a,b)=>a+b,0);
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-blue-800 dark:fill-blue-200 text-3xl font-bold"
                                  >
                                    {total}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 24}
                                    className="fill-muted-foreground text-base"
                                  >
                                    Total
                                  </tspan>
                                </text>
                              )
                            }
                            return null;
                          }}
                        />
                        {complaintsData.labels.map((label, idx) => (
                          <Cell key={`cell-${idx}`} fill={complaintsData.datasets[0].backgroundColor[idx]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name, props) => {
                          const total = complaintsData.datasets[0].data.reduce((a,b)=>a+b,0);
                          const percent = total ? ((value as number/total)*100).toFixed(1) : '0.0';
                          return [`${value} tickets (${percent}%)`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
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
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
            <CardHeader className="pb-4">
              <CardTitle>Category Hotspot Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-center">Rank</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold text-center">Tickets</th>
                      <th className="px-4 py-3 font-semibold text-center">Avg Duration</th>
                      <th className="px-4 py-3 font-semibold">Impact Score</th>
                      <th className="px-4 py-3 font-semibold">Top Sub-Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topComplaintsTable.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-zinc-800">
                        <td className="px-4 py-3 font-bold text-lg text-center">#{index + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.category}</td>
                        <td className="px-4 py-3 text-center"><span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">{item.count}</span></td>
                        <td className="px-4 py-3 font-mono text-center">{item.avgDurationFormatted}</td>
                        <td className="px-4 py-3 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{item.impactScore.toFixed(2)}</span>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${(item.impactScore / topComplaintsTable[0].impactScore) * 100}%` }}></div>
                            </div>
                          </div>
                        </td>
                         <td className="px-4 py-3 font-medium">{item.topSubCategory}</td>
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
            <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
                 <CardHeader>
              <CardTitle>Classification Analytics</CardTitle>
            </CardHeader>
            <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(classificationData)
                .sort(([, a], [, b]) => (a as any).count - (b as any).count)
                .map(([classification, details], index) => {
                  const d = details as any;
                  return (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-4">
                             <span className="font-bold text-gray-800 dark:text-gray-100">
                              {classification}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900 dark:text-zinc-200">{d.count}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">Total</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex flex-row flex-wrap gap-2 pt-2">
                          {d.trendline?.labels.map((label, i) => {
                            const count = d.trendline.data[i] as number;
                            return (
                              <div key={label} className="flex flex-col items-center p-2 rounded-md bg-gray-50 dark:bg-zinc-800/70">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{count}</span>
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
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
            <CardHeader>
              <CardTitle>Keyword Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-end justify-center">
                {ticketAnalyticsData?.keywordAnalysis.map(([keyword, count], index) => {
                  const maxCount = ticketAnalyticsData.keywordAnalysis[0][1];
                  const minCount = ticketAnalyticsData.keywordAnalysis[ticketAnalyticsData.keywordAnalysis.length - 1][1];
                  // Avoid division by zero if all counts are the same
                  const weight = maxCount === minCount ? 0.5 : (count - minCount) / (maxCount - minCount);
                  const fontSize = 0.8 + weight * 1.2; // Font size from 0.8rem to 2.0rem
                  const opacity = 0.6 + weight * 0.4; // Opacity from 60% to 100%
                  
                  return (
                    <span 
                      key={index} 
                      className="font-bold text-gray-700 dark:text-gray-300 transition-all"
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
