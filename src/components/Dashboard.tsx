import React, { useState, useMemo, useEffect } from 'react';
// import { Listbox } from '@headlessui/react';
// import { Calendar } from 'react-feather';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { analyzeKeywords, formatDurationDHM } from '@/lib/utils';
// import { Button } from '@/components/ui/button';
// import { ModeToggle } from './mode-toggle';
import { useAgentStore } from '@/store/agentStore';
// import { useNavigate } from 'react-router-dom';

// Dropdown/avatar imports removed (unused)

import UploadProcess from './UploadProcess';
import GridView from './GridView';
import KanbanBoard from './KanbanBoard';
import TicketAnalytics from './TicketAnalytics';
import AgentAnalytics from './AgentAnalytics';
import SummaryDashboard from './SummaryDashboard';
import AdminPanel from '../pages/AdminPanel';

import BarChartIcon from '@mui/icons-material/BarChart';
import GridViewIcon from '@mui/icons-material/GridView';
import GroupIcon from '@mui/icons-material/Group';
import UserCheckIcon from '@mui/icons-material/HowToReg';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import UsersIcon from '@mui/icons-material/People';

const allTabs = [
  { name: 'Dashboard', component: SummaryDashboard, icon: BarChartIcon },
  { name: 'Data Grid', component: GridView, icon: GridViewIcon },
  { name: 'Customer Analytics', component: KanbanBoard, icon: GroupIcon },
  { name: 'Ticket Analytics', component: TicketAnalytics, icon: BarChartIcon },
  { name: 'Agent Analytics', component: AgentAnalytics, icon: UserCheckIcon },
  { name: 'Upload Data', component: UploadProcess, icon: CloudUploadIcon },
  { name: 'Admin Panel', component: AdminPanel, icon: UsersIcon },
];

// Preset time filters removed; using explicit month/year

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

// Month options retained for potential future use
// const monthOptions = [
//   { value: '01', label: 'January' },
//   { value: '02', label: 'February' },
//   { value: '03', label: 'March' },
//   { value: '04', label: 'April' },
//   { value: '05', label: 'May' },
//   { value: '06', label: 'June' },
//   { value: '07', label: 'July' },
//   { value: '08', label: 'August' },
//   { value: '09', label: 'September' },
//   { value: '10', label: 'October' },
//   { value: '11', label: 'November' },
//   { value: '12', label: 'December' },
// ];

// Tambahkan array nama bulan Indonesia
const monthNamesIndo = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Ganti FilterWaktu agar hanya ada 3 dropdown: Start Month, End Month, Year
// Hilangkan preset timeFilters
// Time filter component retained but unused on summary-only view
// const FilterWaktu: React.FC<{
//   startMonth: string | null;
//   setStartMonth: (v: string | null) => void;
//   endMonth: string | null;
//   setEndMonth: (v: string | null) => void;
//   selectedYear: string | null;
//   setSelectedYear: (v: string | null) => void;
//   monthOptions: { value: string, label: string }[];
//   allYearsInData: string[];
//   onRefresh: () => void;
// }> = ({ startMonth, setStartMonth, endMonth, setEndMonth, selectedYear, setSelectedYear, monthOptions, allYearsInData, onRefresh }) => (
//   <div className="flex flex-wrap items-center gap-3 p-4 bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 mb-6">
//     <Calendar className="h-5 w-5 text-blue-500 mr-2" />
//     <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 mr-2">Time Filter:</span>
//     <Button size="sm" className="ml-3 h-9 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold shadow transition-all" onClick={onRefresh} variant="secondary">Refresh</Button>
//   </div>
// );

const Dashboard = () => {
  const [selectedIndex] = useState(0);
  const [refreshTrigger] = useState(0);
  const [startMonth] = useState<string | null>(null);
  const [endMonth] = useState<string | null>(null);
  const [selectedYear] = useState<string | null>(null);

  // const navigate = useNavigate();

  // const handleApplyFilter = () => { /* trigger not used on summary view */ };

  // const handleUploadComplete = () => { /* not used here */ };

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

  // Ambil semua bulan unik dari data (mm/yyyy) - tidak digunakan di summary view

  // Ambil semua tahun unik dari data - tidak digunakan di summary view

  const { cutoffStart, cutoffEnd } = useMemo(() => {
    if (!startMonth || !endMonth || !selectedYear) return { cutoffStart: null, cutoffEnd: null };
    const y = Number(selectedYear);
    const mStart = Number(startMonth) - 1;
    const mEnd = Number(endMonth) - 1;
    const cutoffStart = new Date(y, mStart, 1, 0, 0, 0, 0);
    const cutoffEnd = new Date(y, mEnd + 1, 0, 23, 59, 59, 999);
    return { cutoffStart, cutoffEnd };
  }, [startMonth, endMonth, selectedYear]);

  const { ticketAnalyticsData, gridData } = useMemo(() => {
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
    // const kanbanData = processKanbanData(gridData, customerClassMap, customerMasterMap);

    // --- Agent Analytics Processing ---
    // Master list of all agents. This ensures they always appear in the analysis.
    const masterAgentList = [
      "Dea Destivica", "Muhammad Lutfi Rosadi", "Stefano Dewa Susanto", "Fajar Juliantono",
      "Priyo Ardi Nugroho", "Fajar Nanda Ismono", "Louis Bayu Krisna Redionando",
      "Bandero Aldi Prasetya", "Hamid Machfudin Sukardi", "Difa' Fathir Aditya", "Zakiyya Wulan Safitri"
    ];

    // Initialize performance object with all agents from the master list.
    const agentPerformance: { [key: string]: { durations: number[], closed: number } } = {};
    masterAgentList.forEach(agent => {
      agentPerformance[agent] = { durations: [], closed: 0 };
    });

    gridData.forEach(t => {
      // Ensure only tickets with handling duration are considered for agent performance
      if (t.handlingDuration?.rawHours > 0) {
        const agentName = t.openBy || 'Unassigned';
        // If an agent from the file is not in the master list, add them.
        if (!agentPerformance[agentName]) {
          agentPerformance[agentName] = { durations: [], closed: 0 };
        }
        agentPerformance[agentName].durations.push(t.handlingDuration.rawHours);
        if (t.status === 'Closed') {
          agentPerformance[agentName].closed++;
        }
      }
    });

    let busiestAgent = { name: 'N/A', count: 0 };
    let mostEfficientAgent = { name: 'N/A', avg: Infinity };
    let highestResolutionAgent = { name: 'N/A', rate: 0 };

    const agentAnalyticsData = Object.entries(agentPerformance).map(([agentName, data]) => {
      const ticketCount = data.durations.length;
      if (ticketCount === 0) return null;

      const totalDuration = data.durations.reduce((acc, curr) => acc + curr, 0);
      const avgDuration = totalDuration / ticketCount;
      const minDuration = Math.min(...data.durations);
      const maxDuration = Math.max(...data.durations);
      const closedCount = data.closed;
      const resolutionRate = ticketCount > 0 ? (closedCount / ticketCount) * 100 : 0;

      // Check for busiest agent
      if (ticketCount > busiestAgent.count) {
        busiestAgent = { name: agentName, count: ticketCount };
      }
      // Check for most efficient agent (lower average is better)
      if (avgDuration < mostEfficientAgent.avg) {
        mostEfficientAgent = { name: agentName, avg: avgDuration };
      }
      // Check for highest resolution rate
      if (resolutionRate > highestResolutionAgent.rate) {
        highestResolutionAgent = { name: agentName, rate: resolutionRate };
      }

      return {
        agentName,
        ticketCount,
        totalDurationFormatted: formatDurationDHM(totalDuration),
        avgDurationFormatted: formatDurationDHM(avgDuration),
        minDurationFormatted: formatDurationDHM(minDuration),
        maxDurationFormatted: formatDurationDHM(maxDuration),
        resolutionRate: resolutionRate.toFixed(1) + '%',
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
        highestResolutionAgentName: highestResolutionAgent.name,
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

    // --- Rewritten: Monthly Ticket Statistics ---
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
    const categoryDetails: { [key: string]: { tickets: ITicket[], subCategories: { [key: string]: number } } } = {};
    gridData.forEach(t => {
      const category = t.category || 'Lainnya';
      if (!categoryDetails[category]) {
        categoryDetails[category] = { tickets: [], subCategories: {} };
      }
      categoryDetails[category].tickets.push(t);

      const subCategory = t.subClassification || 'Lainnya';
      categoryDetails[category].subCategories[subCategory] = (categoryDetails[category].subCategories[subCategory] || 0) + 1;
    });

    const topComplaintsTableData = Object.entries(categoryDetails)
      .map(([category, data]) => {
        const totalDuration = data.tickets.reduce((acc, t) => acc + (t.duration?.rawHours || 0), 0);
        const avgDuration = data.tickets.length > 0 ? totalDuration / data.tickets.length : 0;
        const impactScore = data.tickets.length * avgDuration;

        const topSubCategory = Object.keys(data.subCategories).length > 0
          ? Object.entries(data.subCategories).sort(([,a],[,b]) => b-a)[0][0]
          : '-';

        return {
          category,
          count: data.tickets.length,
          avgDuration,
          avgDurationFormatted: formatDurationDHM(avgDuration),
          impactScore,
          topSubCategory,
        };
      })
      .sort((a, b) => b.impactScore - a.impactScore) // Sort by the new impact score
      .slice(0, 10);

    const allDescriptions = gridData.map(t => t.description).filter(Boolean);
    const keywordAnalysis = analyzeKeywords(allDescriptions, 20);

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
        keywordAnalysis,
    };

    return {
      ticketAnalyticsData,
      gridData,
      filteredTickets,
    };
  }, [allTickets, cutoffStart, cutoffEnd]);

  // --- Ensure agent KPI store always uses filtered tickets ---
  useEffect(() => {
    // Only update agentStore if not in Agent Analytics page to prevent conflicts
    const currentPath = window.location.pathname;
    const isAgentAnalyticsPage = currentPath.includes('/agent-analytics') || currentPath.includes('/ticket/agent-analytics');
    
    if (!isAgentAnalyticsPage) {
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
    }
  }, [gridData]);

  // Helper function for Kanban data processing (unused in summary view)

  const user = JSON.parse(localStorage.getItem('user') || '{"role":"user"}');
  const role = user.role || 'user';
  
  const tabs = useMemo(() => {
    try {
      const savedPermissions = localStorage.getItem('menuPermissions');
      if (savedPermissions) {
        const permissions = JSON.parse(savedPermissions);
        const allowedMenus = permissions[role] || [];
        return allTabs.filter(tab => allowedMenus.includes(tab.name));
      }
    } catch (e) {
      console.error("Failed to parse permissions from localStorage", e);
    }
    // Fallback to original logic if permissions are not set
    const defaultPermissions = {
      admin: allTabs.map(t => t.name),
      user: allTabs.filter(t => t.name !== 'Admin Panel').map(t => t.name)
    };
    const allowedMenus = defaultPermissions[role as 'admin' | 'user'] || [];
    return allTabs.filter(tab => allowedMenus.includes(tab.name));
  }, [role]);

  useEffect(() => {
    // Tambahkan pengecekan untuk memastikan tabs[selectedIndex] tidak undefined
    if (tabs.length > 0 && selectedIndex < tabs.length) {
    document.title = `AN-TIC | ${tabs[selectedIndex].name}`;
    } else if (tabs.length > 0) {
      document.title = `AN-TIC | ${tabs[0].name}`;
    } else {
      document.title = 'AN-TIC';
    }
  }, [selectedIndex, tabs]);

  // const handleLogout = () => {
  //   localStorage.removeItem('user');
  //   navigate('/');
  // };

  return (
    <div className="relative min-h-screen">
      {/* Gradient background layer */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-pink-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-blue-900" />
      <main className="p-4 sm:p-6 lg:p-8">
        {/* Tampilkan summary dashboard saja */}
        <SummaryDashboard ticketAnalyticsData={ticketAnalyticsData} filteredTickets={gridData} />
      </main>
    </div>
  );
};

export default Dashboard;
