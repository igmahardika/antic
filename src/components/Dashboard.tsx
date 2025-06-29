import React, { useState, useMemo, useEffect } from 'react';
import { Tab, Listbox } from '@headlessui/react';
import { Upload, Grid, Users, BarChart2, UserCheck, Calendar } from 'react-feather';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ITicket } from '@/lib/db';
import { analyzeKeywords, generateAnalysisConclusion, formatDurationDHM } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ModeToggle } from './mode-toggle';
import { useAgentStore } from '@/store/agentStore';

import UploadProcess from './UploadProcess';
import GridView from './GridView';
import KanbanBoard from './KanbanBoard';
import TicketAnalytics from './TicketAnalytics';
import AgentAnalytics from './AgentAnalytics';
import SummaryDashboard from './SummaryDashboard';

const tabs = [
  { name: 'Dashboard', component: SummaryDashboard, icon: BarChart2 },
  { name: 'Grid View', component: GridView, icon: Grid },
  { name: 'Customer Analysis', component: KanbanBoard, icon: Users },
  { name: 'Ticket Analysis', component: TicketAnalytics, icon: BarChart2 },
  { name: 'Agent Analysis', component: AgentAnalytics, icon: UserCheck },
  { name: 'Upload Data', component: UploadProcess, icon: Upload },
];

const timeFilters = [
  { label: 'Last 1 Month', value: '1M' },
  { label: 'Last 3 Months', value: '3M' },
  { label: 'Last 6 Months', value: '6M' }
];

// Color palette for agent charts. Using Tailwind CSS color names for reference.
const agentChartColors = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#22c55e', // green-500
  '#f97316', // orange-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#0ea5e9', // sky-500
  '#f59e0b', // amber-500
  '#84cc16', // lime-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#d946ef', // fuchsia-500
];

const monthOptions = [
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

// Tambahkan array nama bulan Indonesia
const monthNamesIndo = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Ganti FilterWaktu agar hanya ada 3 dropdown: Start Month, End Month, Year
// Hilangkan preset timeFilters
const FilterWaktu: React.FC<{
  startMonth: string | null;
  setStartMonth: (v: string | null) => void;
  endMonth: string | null;
  setEndMonth: (v: string | null) => void;
  selectedYear: string | null;
  setSelectedYear: (v: string | null) => void;
  monthOptions: { value: string, label: string }[];
  allYearsInData: string[];
  onRefresh: () => void;
}> = ({ startMonth, setStartMonth, endMonth, setEndMonth, selectedYear, setSelectedYear, monthOptions, allYearsInData, onRefresh }) => (
  <div className="flex flex-wrap items-center gap-1 mb-2">
    <Calendar className="h-4 w-4 text-gray-400 mr-1"/>
    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">Time Filter:</span>
    {/* Dropdown Start Month */}
    <Listbox value={startMonth} onChange={setStartMonth}>
      <div className="relative ml-1">
        <Listbox.Button className="text-xs h-7 px-2 py-1 border rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 min-w-[80px]">
          {startMonth ? monthOptions.find(m => m.value === startMonth)?.label : 'Start Month'}
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 w-28 bg-white dark:bg-gray-800 border rounded shadow-lg max-h-60 overflow-auto text-xs">
          {monthOptions.map(month => (
            <Listbox.Option key={month.value} value={month.value} className="px-2 py-1 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30">
              {month.label}
            </Listbox.Option>
    ))}
        </Listbox.Options>
      </div>
    </Listbox>
    {/* Dropdown End Month */}
    <Listbox value={endMonth} onChange={setEndMonth}>
      <div className="relative ml-1">
        <Listbox.Button className="text-xs h-7 px-2 py-1 border rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 min-w-[80px]">
          {endMonth ? monthOptions.find(m => m.value === endMonth)?.label : 'End Month'}
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 w-28 bg-white dark:bg-gray-800 border rounded shadow-lg max-h-60 overflow-auto text-xs">
          {monthOptions.map(month => (
            <Listbox.Option key={month.value} value={month.value} className="px-2 py-1 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30">
              {month.label}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
    {/* Dropdown Year */}
    <Listbox value={selectedYear} onChange={setSelectedYear}>
      <div className="relative ml-1">
        <Listbox.Button className="text-xs h-7 px-2 py-1 border rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 min-w-[80px]">
          {selectedYear || 'Year'}
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 w-24 bg-white dark:bg-gray-800 border rounded shadow-lg max-h-60 overflow-auto text-xs">
          {allYearsInData.map(year => (
            <Listbox.Option key={year} value={year} className="px-2 py-1 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30">
              {year}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
    {/* Tombol Refresh */}
    <Button size="sm" className="ml-2 text-xs h-7 px-3 py-1 rounded-md" onClick={onRefresh} variant="secondary">Refresh</Button>
  </div>
);

const Dashboard = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [timeFilter, setTimeFilter] = useState('1M');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingFilter, setPendingFilter] = useState({
    timeFilter: '1M',
    selectedMonth: null as string | null,
    selectedYear: null as string | null,
  });
  const [startMonth, setStartMonth] = useState<string | null>(null);
  const [endMonth, setEndMonth] = useState<string | null>(null);

  // Saat user memilih preset, reset bulan/tahun di pendingFilter
  const handlePendingTimeFilter = (val: string) => {
    setPendingFilter({ timeFilter: val, selectedMonth: null, selectedYear: null });
  };
  // Saat user memilih bulan/tahun, reset preset di pendingFilter
  const handlePendingMonth = (val: string | null) => {
    setPendingFilter(prev => ({ ...prev, timeFilter: '', selectedMonth: val }));
  };
  const handlePendingYear = (val: string | null) => {
    setPendingFilter(prev => ({ ...prev, timeFilter: '', selectedYear: val }));
  };
  // Action refresh: baru update filter utama
  const handleApplyFilter = () => {
    setTimeFilter(pendingFilter.timeFilter);
    setSelectedMonth(pendingFilter.selectedMonth);
    setSelectedYear(pendingFilter.selectedYear);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUploadComplete = () => {
    // Trigger a refresh to re-fetch data from the database
    setRefreshTrigger(prev => prev + 1);
    // Switch to Grid View tab after upload
    setSelectedIndex(1);
  };

  // Live query to get data from IndexedDB based on the filter
  const allTickets = useLiveQuery(() => db.tickets.toArray(), [refreshTrigger]);

  // Wire agent KPI store
  React.useEffect(() => {
    if (allTickets && allTickets.length > 0) {
      // Map ITicket to Ticket for agent KPI
      const mapped = allTickets.map(t => ({
        ticket_id: t.id,
        WaktuOpen: t.openTime,
        WaktuCloseTicket: t.closeTime,
        ClosePenanganan: t.closeHandling,
        Penanganan2: t.handling2,
        OpenBy: t.openBy || t.name || 'Unknown',
      }));
      useAgentStore.getState().setTickets(mapped);
    }
  }, [allTickets]);

  // Ambil semua bulan unik dari data (mm/yyyy dari Waktu Open)
  const allMonthsInData = useMemo(() => {
    if (!allTickets) return [];
    const monthSet = new Set<string>();
    allTickets.forEach(t => {
      if (t.openTime) {
        const d = new Date(t.openTime);
        if (!isNaN(d.getTime())) {
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          monthSet.add(`${mm}/${yyyy}`);
        }
      }
    });
    return Array.from(monthSet).sort((a, b) => {
      const [ma, ya] = a.split('/');
      const [mb, yb] = b.split('/');
      return new Date(`${ya}-${ma}-01`).getTime() - new Date(`${yb}-${mb}-01`).getTime();
    });
  }, [allTickets]);

  // Ambil semua tahun unik dari data
  const allYearsInData = useMemo(() => {
    if (!allTickets) return [];
    const yearSet = new Set<string>();
    allTickets.forEach(t => {
      if (t.openTime) {
        const d = new Date(t.openTime);
        if (!isNaN(d.getTime())) {
          yearSet.add(String(d.getFullYear()));
        }
      }
    });
    return Array.from(yearSet).sort();
  }, [allTickets]);

  const { cutoffStart, cutoffEnd } = useMemo(() => {
    if (!startMonth || !endMonth || !selectedYear) return { cutoffStart: null, cutoffEnd: null };
    const y = Number(selectedYear);
    const mStart = Number(startMonth) - 1;
    const mEnd = Number(endMonth) - 1;
    const cutoffStart = new Date(y, mStart, 1, 0, 0, 0, 0);
    const cutoffEnd = new Date(y, mEnd + 1, 0, 23, 59, 59, 999);
    return { cutoffStart, cutoffEnd };
  }, [startMonth, endMonth, selectedYear]);

  const { ticketAnalyticsData, agentAnalyticsData, gridData, kanbanData } = useMemo(() => {
    if (!allTickets) {
      return { gridData: [], kanbanData: [], ticketAnalyticsData: null, agentAnalyticsData: [] };
    }

    const filteredTickets = allTickets.filter(t => {
      if (!cutoffStart || !cutoffEnd) return true; // Show all if no filter
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return false;
      return d >= cutoffStart && d <= cutoffEnd;
    });

    const customerMasterMap = new Map<string, ITicket[]>();
    if (allTickets) {
      allTickets.forEach(ticket => {
        const customerId = ticket.customerId || 'Unknown';
        if (customerId === 'Unknown') return;
        if (!customerMasterMap.has(customerId)) {
          customerMasterMap.set(customerId, []);
        }
        customerMasterMap.get(customerId)!.push(ticket);
      });
    }

    // --- NEW: Risk Classification Based on Filtered Period ---
    const periodTicketCounts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      const customerId = t.customerId || 'Unknown';
      if (customerId !== 'Unknown') {
        periodTicketCounts[customerId] = (periodTicketCounts[customerId] || 0) + 1;
      }
    });

    const customerClassMap: Record<string, string> = {};
    Object.keys(periodTicketCounts).forEach(customerId => {
      const count = periodTicketCounts[customerId];
      if (count > 18) customerClassMap[customerId] = 'Ekstrem';
      else if (count >= 10) customerClassMap[customerId] = 'Kronis';
      else if (count >= 3) customerClassMap[customerId] = 'Persisten';
      else customerClassMap[customerId] = 'Normal';
    });
    // --- End of Risk Classification ---

    const gridData = filteredTickets;
    const kanbanData = processKanbanData(gridData, customerClassMap, customerMasterMap);

    // --- Agent Analytics Processing ---
    // Master list of all agents. This ensures they always appear in the analysis.
    const masterAgentList = [
      "Dea Destivica", "Muhammad Lutfi Rosadi", "Stefano Dewa Susanto", "Fajar Juliantono",
      "Priyo Ardi Nugroho", "Fajar Nanda Ismono", "Louis Bayu Krisna Redionando",
      "Bandero Aldi Prasetya", "Hamid Machfudin Sukardi", "Difa' Fathir Aditya", "Zakiyya Wulan Safitri"
    ];

    // Initialize performance object with all agents from the master list.
    const agentPerformance: { [key: string]: { durations: number[] } } = {};
    masterAgentList.forEach(agent => {
      agentPerformance[agent] = { durations: [] };
    });

    gridData.forEach(t => {
      // Ensure only tickets with handling duration are considered for agent performance
      if (t.handlingDuration?.rawHours > 0) {
        const agentName = t.openBy || 'Unassigned';
        // If an agent from the file is not in the master list, add them.
        if (!agentPerformance[agentName]) {
          agentPerformance[agentName] = { durations: [] };
        }
        agentPerformance[agentName].durations.push(t.handlingDuration.rawHours);
      }
    });

    let busiestAgent = { name: 'N/A', count: 0 };
    let mostEfficientAgent = { name: 'N/A', avg: Infinity };

    const agentAnalyticsData = Object.entries(agentPerformance).map(([agentName, data]) => {
      const ticketCount = data.durations.length;
      if (ticketCount === 0) return null;

      const totalDuration = data.durations.reduce((acc, curr) => acc + curr, 0);
      const avgDuration = totalDuration / ticketCount;
      const minDuration = Math.min(...data.durations);
      const maxDuration = Math.max(...data.durations);

      // Check for busiest agent
      if (ticketCount > busiestAgent.count) {
        busiestAgent = { name: agentName, count: ticketCount };
      }
      // Check for most efficient agent (lower average is better)
      if (avgDuration < mostEfficientAgent.avg) {
        mostEfficientAgent = { name: agentName, avg: avgDuration };
      }

      return {
        agentName,
        ticketCount,
        totalDurationFormatted: formatDurationDHM(totalDuration),
        avgDurationFormatted: formatDurationDHM(avgDuration),
        minDurationFormatted: formatDurationDHM(minDuration),
        maxDurationFormatted: formatDurationDHM(maxDuration),
      };
    }).filter(Boolean).sort((a, b) => (b?.ticketCount || 0) - (a?.ticketCount || 0));

    // --- New: Agent Monthly Performance Processing ---
    const agentMonthlyPerformance: { [agentName: string]: { [month: string]: number } } = {};
    const allMonths = new Set<string>();

    gridData.forEach(ticket => {
      const agentName = ticket.openBy || 'Unassigned';
      try {
        // Format bulan: yyyy-MM
        const dateObj = new Date(ticket.openTime);
        if (isNaN(dateObj.getTime())) return;
        const monthYear = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        allMonths.add(monthYear);
        if (!agentMonthlyPerformance[agentName]) {
          agentMonthlyPerformance[agentName] = {};
        }
        agentMonthlyPerformance[agentName][monthYear] = (agentMonthlyPerformance[agentName][monthYear] || 0) + 1;
      } catch (e) {
        // Ignore tickets with invalid date
      }
    });
    
    // Urutkan bulan secara kronologis
    const sortedMonths = Array.from(allMonths).sort((a, b) => new Date(a + '-01').getTime() - new Date(b + '-01').getTime());

    // Jika tidak ada data, jangan render grafik (akan dicek di komponen)
    const agentMonthlyChartData = sortedMonths.length === 0 ? null : {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return `${monthNum}/${year}`; // Format label to mm/yyyy
      }),
      datasets: Object.entries(agentMonthlyPerformance).map(([agentName, monthlyData], index) => {
        const color = agentChartColors[index % agentChartColors.length];
        return {
          label: agentName,
          data: sortedMonths.map(month => monthlyData[month] || 0),
          backgroundColor: color + 'CC', // pastel/soft
          borderColor: color,
          borderRadius: 6,
          maxBarThickness: 32,
        };
      }),
    };

    // Create final object to pass down, including summary stats
    const finalAgentData = {
      agentList: agentAnalyticsData,
      summary: {
        totalAgents: agentAnalyticsData.length,
        busiestAgentName: busiestAgent.name,
        mostEfficientAgentName: mostEfficientAgent.avg === Infinity ? 'N/A' : mostEfficientAgent.name,
      },
      agentMonthlyChart: agentMonthlyChartData
    };

    // --- Ticket Analytics Processing (formerly analyticsData) ---
    const totalTickets = gridData.length;
    const totalDuration = gridData.reduce((acc, t) => acc + (t.duration?.rawHours || 0), 0);
    const closedTickets = gridData.filter(t => (t.status || '').trim().toLowerCase() === 'closed').length;

    const complaints: { [key: string]: number } = {};
    gridData.forEach(t => {
        const category = t.category || 'Lainnya';
        complaints[category] = (complaints[category] || 0) + 1;
    });

    // Palet warna untuk kategori komplain (donut chart)
    const complaintColors = [
      '#3b82f6', // blue
      '#f59e42', // orange
      '#22c55e', // green
      '#a855f7', // purple
      '#ef4444', // red
      '#fbbf24', // yellow
      '#0ea5e9', // sky
      '#6366f1', // indigo
      '#ec4899', // pink
      '#14b8a6', // teal
      '#eab308', // amber
      '#f472b6', // rose
    ];

    const complaintsLabels = Object.keys(complaints);
    const complaintsValues = Object.values(complaints);

    // --- New: Classification & Sub-Classification Analysis ---
    const classificationAnalysis: {
      [key: string]: {
        count: number,
        sub: { [key: string]: number },
        trendlineRaw?: { [month: string]: number },
        trendline?: { labels: string[], data: number[] },
        trendPercent?: number
      }
    } = {};

    gridData.forEach(t => {
      const classification = t.classification || 'Unclassified';
      const subClassification = t.subClassification || 'Unclassified';
      // Ambil bulan-tahun dari openTime (format: yyyy-MM)
      let monthYear = 'Unknown';
      if (t.openTime) {
        const d = new Date(t.openTime);
        if (!isNaN(d.getTime())) {
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          monthYear = `${yyyy}-${mm}`;
        }
      }

      if (!classificationAnalysis[classification]) {
        classificationAnalysis[classification] = { count: 0, sub: {}, trendlineRaw: {} };
      }
      classificationAnalysis[classification].count++;

      if (!classificationAnalysis[classification].sub[subClassification]) {
        classificationAnalysis[classification].sub[subClassification] = 0;
      }
      classificationAnalysis[classification].sub[subClassification]++;

      // Hitung trendline per bulan
      if (!classificationAnalysis[classification].trendlineRaw[monthYear]) {
        classificationAnalysis[classification].trendlineRaw[monthYear] = 0;
      }
      classificationAnalysis[classification].trendlineRaw[monthYear]++;
    });

    // Setelah itu, ubah trendlineRaw menjadi array labels & data (urutkan bulan)
    Object.values(classificationAnalysis).forEach(ca => {
      const rawKeys = Object.keys(ca.trendlineRaw).sort((a, b) => new Date(a + '-01').getTime() - new Date(b + '-01').getTime());
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const labels = rawKeys.map(key => {
        const [yyyy, mm] = key.split('-');
        return `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
      });
      const data = rawKeys.map(l => ca.trendlineRaw[l]);
      ca.trendline = { labels, data };
      // Hitung trend percent
      if (data.length >= 2) {
        const prev = data[data.length - 2];
        const curr = data[data.length - 1];
        ca.trendPercent = prev === 0 ? null : ((curr - prev) / Math.abs(prev)) * 100;
      } else {
        ca.trendPercent = null;
      }
      delete ca.trendlineRaw;
    });

    // --- Reworked: Monthly Ticket Statistics ---
    const monthlyStats: { [key: string]: { incoming: number, closed: number } } = {};
    gridData.forEach(ticket => {
        try {
            const d = new Date(ticket.openTime);
            if (!isNaN(d.getTime())) {
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                const monthYear = `${yyyy}-${mm}`;
            if (!monthlyStats[monthYear]) {
                monthlyStats[monthYear] = { incoming: 0, closed: 0 };
            }
            monthlyStats[monthYear].incoming++;
            if (ticket.status === 'Closed') {
                monthlyStats[monthYear].closed++;
                }
            }
        } catch(e) { /* ignore invalid dates */ }
    });

    const sortedMonthlyKeys = Object.keys(monthlyStats).sort((a, b) => {
      return new Date(a + '-01').getTime() - new Date(b + '-01').getTime();
    });
    
    const monthlyStatsChartData = {
      labels: sortedMonthlyKeys.map(key => {
        // key: yyyy-MM
        const [yyyy, mm] = key.split('-');
        const monthIdx = parseInt(mm, 10) - 1;
        const monthName = monthNamesIndo[monthIdx] || mm;
        return `${monthName} ${yyyy}`;
      }),
      datasets: [
        {
          label: 'Incoming Tickets',
          data: sortedMonthlyKeys.map(key => monthlyStats[key].incoming),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
        },
        {
          label: 'Closed Tickets',
          data: sortedMonthlyKeys.map(key => monthlyStats[key].closed),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
        },
      ],
    };

    // --- New: Ticket Insights Processing ---
    let busiestMonth = { month: 'N/A', count: 0 };
    if (monthlyStatsChartData && monthlyStatsChartData.labels.length > 0) {
      const counts = monthlyStatsChartData.datasets[0].data;
      if (counts.length > 0) {
        const maxCount = Math.max(...counts);
        const maxIndex = counts.indexOf(maxCount);
        busiestMonth = { month: monthlyStatsChartData.labels[maxIndex], count: maxCount };
      }
    }

    let topComplaint = { category: 'N/A', count: 0, percentage: 0 };
    if (complaintsLabels.length > 0) {
      const totalComplaints = complaintsValues.reduce((a, b) => a + b, 0);
      if (totalComplaints > 0) {
        const maxCount = Math.max(...complaintsValues);
        const maxIndex = complaintsValues.indexOf(maxCount);
        topComplaint = {
          category: complaintsLabels[maxIndex],
          count: maxCount,
          percentage: Math.round((maxCount / totalComplaints) * 100)
        };
      }
    }

    // Data for Top Complaints Table
    const categoryDetails: { [key: string]: { tickets: ITicket[] } } = {};
    gridData.forEach(t => {
      const category = t.category || 'Lainnya';
      if (!categoryDetails[category]) {
        categoryDetails[category] = { tickets: [] };
      }
      categoryDetails[category].tickets.push(t);
    });

    const topComplaintsTableData = Object.entries(categoryDetails)
      .map(([category, data]) => {
        const totalDuration = data.tickets.reduce((acc, t) => acc + (t.duration?.rawHours || 0), 0);
        const avgDuration = data.tickets.length > 0 ? totalDuration / data.tickets.length : 0;
        return {
          category,
          count: data.tickets.length,
          avgDurationFormatted: formatDurationDHM(avgDuration),
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- Repeat-Complainer Class Calculation ---
    // 1. Agregasi jumlah tiket per customer
    const customerTicketCounts: Record<string, number> = {};
    gridData.forEach(t => {
      const customer = t.name || t.customerId || 'Unknown';
      customerTicketCounts[customer] = (customerTicketCounts[customer] || 0) + 1;
    });
    const countsArr = Object.values(customerTicketCounts);
    // 2. Hitung mean dan stddev
    const mean = countsArr.reduce((a, b) => a + b, 0) / (countsArr.length || 1);
    const stddev = Math.sqrt(countsArr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (countsArr.length || 1));
    // 3. Assign class ke setiap customer
    const customerClass: Record<string, string> = {};
    Object.entries(customerTicketCounts).forEach(([customer, count]) => {
      if (count <= mean) customerClass[customer] = 'Normal';
      else if (count <= mean + stddev) customerClass[customer] = 'Persisten';
      else if (count <= mean + 2 * stddev) customerClass[customer] = 'Kronis';
      else customerClass[customer] = 'Ekstrem';
    });
    // 4. Assign repClass ke setiap tiket
    gridData.forEach(t => {
      const customer = t.name || t.customerId || 'Unknown';
      t.repClass = customerClass[customer] || 'Normal';
    });

    const ticketAnalyticsData = {
        stats: [
            { title: 'Total Tickets', value: totalTickets.toString(), description: `in the selected period` },
            { title: 'Average Duration', value: formatDurationDHM(totalDuration / totalTickets) || '00:00:00', description: 'average ticket resolution time' },
            { title: 'Closed Tickets', value: closedTickets.toString(), description: `${((closedTickets/totalTickets || 0) * 100).toFixed(0)}% resolution rate` },
            { title: 'Active Agents', value: finalAgentData.summary.totalAgents.toString(), description: 'handling tickets' },
        ],
        complaintsData: {
            labels: complaintsLabels,
            datasets: [{ 
              label: 'Complaint Count', 
              data: complaintsValues,
              backgroundColor: complaintsLabels.map((_, i) => complaintColors[i % complaintColors.length]),
              borderWidth: 1,
            }],
        },
        monthlyStatsData: monthlyStatsChartData,
        classificationData: classificationAnalysis,
        insights: {
          busiestMonth,
          topComplaint,
        },
        topComplaintsTable: topComplaintsTableData,
    };

    return {
      ticketAnalyticsData,
      agentAnalyticsData: finalAgentData,
      gridData,
      kanbanData,
      filteredTickets,
    };
  }, [allTickets, cutoffStart, cutoffEnd]);

  // --- Ensure agent KPI store always uses filtered tickets ---
  React.useEffect(() => {
    if (gridData && gridData.length > 0) {
      const mappedFiltered = gridData.map(t => ({
        ticket_id: t.id,
        WaktuOpen: t.openTime,
        WaktuCloseTicket: t.closeTime,
        ClosePenanganan: t.closeHandling,
        Penanganan2: t.handling2,
        OpenBy: t.openBy || t.name || 'Unknown',
      }));
      useAgentStore.getState().setTickets(mappedFiltered);
    } else {
      useAgentStore.getState().setTickets([]);
    }
  }, [gridData]);

  // Helper function for Kanban data processing
  function processKanbanData(tickets: ITicket[], classMap: Record<string, string>, masterMap: Map<string, ITicket[]>) {
    const customerMap: { [key: string]: { name: string, customerId: string, tickets: ITicket[], totalHandlingDuration: number, descriptions: string[], causes: string[], handlings: string[] } } = {};
    // Hanya tiket closed (case-insensitive, trim)
    const closedTickets = tickets.filter(ticket => (ticket.status || '').trim().toLowerCase() === 'closed');
    closedTickets.forEach(ticket => {
        const customerId = ticket.customerId || 'Unknown Customer';
        if (customerId === 'Unknown Customer') return;

        if (!customerMap[customerId]) {
            customerMap[customerId] = { name: ticket.name, customerId: customerId, tickets: [], totalHandlingDuration: 0, descriptions: [], causes: [], handlings: [] };
        }
        customerMap[customerId].tickets.push(ticket);
        customerMap[customerId].totalHandlingDuration += ticket.handlingDuration.rawHours || 0;
        customerMap[customerId].descriptions.push(ticket.description);
        customerMap[customerId].causes.push(ticket.cause);
        customerMap[customerId].handlings.push(ticket.handling);
    });

    return Object.values(customerMap).map(customer => {
        const analysisKeywords = {
          description: analyzeKeywords(customer.descriptions),
          cause: analyzeKeywords(customer.causes),
          handling: analyzeKeywords(customer.handlings)
        };
        const repClass = classMap[customer.customerId] || 'Normal';
        
        return {
          id: customer.customerId,
          name: customer.name,
          customerId: customer.customerId,
          ticketCount: customer.tickets.length,
          totalHandlingDurationFormatted: formatDurationDHM(customer.totalHandlingDuration),
          allTickets: customer.tickets,
          fullTicketHistory: masterMap.get(customer.customerId) || [],
          analysis: { ...analysisKeywords, conclusion: generateAnalysisConclusion(analysisKeywords) },
          repClass,
        }
    }).sort((a, b) => b.ticketCount - a.ticketCount);
  }

  useEffect(() => {
    document.title = `AN-TIC | ${tabs[selectedIndex].name}`;
  }, [selectedIndex]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        {/* Header Baris Modern */}
        <div className="w-full flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-gray-900 shadow border-b border-gray-200 dark:border-gray-800">
          {/* Judul Branding ANTIC */}
          <div className="flex items-center mr-4">
            <img src="/logo-a.png" alt="Antic Logo" className="h-20 w-auto" />
          </div>
          {/* Tab Menu */}
          <Tab.List className="flex flex-row gap-2 bg-transparent rounded-xl p-0 m-0 border-none ring-0 outline-none shadow-none">
              {tabs.map((tab) => (
              <Tab key={tab.name}>
                {({ selected }) => (
                  <button
                    className={
                      `flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 ease-in-out focus:outline-none border-none ring-0 outline-none shadow-none` +
                      (selected
                        ? ' bg-[#5271ff] text-white'
                        : ' text-gray-600 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-gray-800')
                    }
                    style={selected
                      ? {background:'#5271ff',color:'#fff',border:'none',outline:'none',boxShadow:'none',padding: '0.5rem 1rem'}
                      : {outline:'none',boxShadow:'none',border:'none',padding: '0.5rem 1rem'}
                    }
                  >
                    <tab.icon className={`w-4 h-4 ${selected ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
                  <span>{tab.name}</span>
                  </button>
                )}
                </Tab>
              ))}
            </Tab.List>
          {/* Statistik Ringkas TicketAnalytics */}
          {ticketAnalyticsData && ticketAnalyticsData.stats && (
            <div className="flex flex-wrap gap-4 ml-auto justify-end">
              <div className="flex flex-col items-start bg-blue-100 rounded-lg px-4 py-2 min-w-[120px]">
                <span className="text-xs text-gray-500">Total Tickets</span>
                <span className="text-lg font-bold text-gray-900">{ticketAnalyticsData.stats[0]?.value}</span>
              </div>
              <div className="flex flex-col items-start bg-green-100 rounded-lg px-4 py-2 min-w-[120px]">
                <span className="text-xs text-gray-500">Average Duration</span>
                <span className="text-lg font-bold text-gray-900">{ticketAnalyticsData.stats[1]?.value}</span>
              </div>
              <div className="flex flex-col items-start bg-yellow-100 rounded-lg px-4 py-2 min-w-[120px]">
                <span className="text-xs text-gray-500">Closed Tickets</span>
                <span className="text-lg font-bold text-gray-900">{ticketAnalyticsData.stats[2]?.value}</span>
              </div>
              <div className="flex flex-col items-start bg-purple-100 rounded-lg px-4 py-2 min-w-[120px]">
                <span className="text-xs text-gray-500">Active Agents</span>
                <span className="text-lg font-bold text-gray-900">{ticketAnalyticsData.stats[3]?.value}</span>
                </div>
            </div>
          )}
          {/* Toggle Theme */}
          <div className="ml-auto"><ModeToggle /></div>
          </div>
        {/* Konten utama dashboard */}
        <div className="w-full px-[10px] py-8">
          <Tab.Panels>
            {tabs.map((tab, idx) => (
              <Tab.Panel key={tab.name} className="focus:outline-none">
                {/* Tampilkan filter waktu di atas konten panel, kecuali untuk Upload Data */}
                {tab.name !== 'Upload Data' && (
                  <FilterWaktu
                    startMonth={startMonth}
                    setStartMonth={setStartMonth}
                    endMonth={endMonth}
                    setEndMonth={setEndMonth}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    monthOptions={monthOptions}
                    allYearsInData={allYearsInData}
                    onRefresh={handleApplyFilter}
                  />
                )}
                {tab.name === 'Upload Data' ? (
                  <UploadProcess onUploadComplete={handleUploadComplete} />
                ) : tab.name === 'Grid View' ? (
                  <GridView data={gridData} />
                ) : tab.name === 'Customer Analysis' ? (
                  <KanbanBoard data={kanbanData} cutoffStart={cutoffStart || new Date()} cutoffEnd={cutoffEnd || new Date()} />
                ) : tab.name === 'Ticket Analysis' ? (
                  <TicketAnalytics data={ticketAnalyticsData} />
                ) : tab.name === 'Agent Analysis' ? (
                  <AgentAnalytics data={agentAnalyticsData} />
                ) : tab.name === 'Dashboard' ? (
                  // @ts-ignore
                  <SummaryDashboard ticketAnalyticsData={ticketAnalyticsData} agentAnalyticsData={agentAnalyticsData} kanbanData={kanbanData} />
                ) : null}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </div>
        </Tab.Group>
    </div>
  );
};

export default Dashboard;
