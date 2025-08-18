import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ITicket } from '@/lib/db';
import { formatDurationDHM, formatDateTimeDDMMYYYY } from '@/lib/utils';
import { useAnalytics } from './AnalyticsContext';
import SummaryCard from './ui/SummaryCard';
import GroupIcon from '@mui/icons-material/Group';
import HowToRegIcon from '@mui/icons-material/HowToReg';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import SecurityIcon from '@mui/icons-material/Security';

import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, LabelList, PieChart, Pie, Cell } from 'recharts';
import { FixedSizeList as List } from 'react-window';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import TimeFilter from './TimeFilter';
import * as RadixDialog from '@radix-ui/react-dialog';

// Define the structure of the kanban data object
interface KanbanCustomer {
  id: string;
  name: string;
  customerId: string;
  ticketCount: number;
  totalHandlingDurationFormatted: string;
  allTickets: ITicket[];
  fullTicketHistory: ITicket[];
  analysis: {
    description: string[];
    cause: string[];
    handling: string[];
    conclusion: string;
  };
  repClass: string | null;
}

// Main Kanban Board Component
interface KanbanBoardProps {
  data?: KanbanCustomer[];
  cutoffStart: Date;
  cutoffEnd: Date;
}
const KanbanBoard = () => {
  const analytics = useAnalytics();
  const { allTickets, startMonth, setStartMonth, endMonth, setEndMonth, selectedYear, setSelectedYear } = analytics;
  // --- All state and ref hooks must be at the top ---
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [repClassFilter, setRepClassFilter] = useState<string>('Total');

  // Hapus state lokal filter waktu

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

  // --- Filter allTickets sesuai waktu ---
  const filteredTickets = useMemo(() => {
    if (!allTickets || !startMonth || !endMonth || !selectedYear) return [];
    if (selectedYear === 'ALL') {
      // All Year: tampilkan semua tiket tanpa filter waktu
      return allTickets;
    }
    const y = Number(selectedYear);
    const mStart = Number(startMonth) - 1;
    const mEnd = Number(endMonth) - 1;
    const cutoffStart = new Date(y, mStart, 1, 0, 0, 0, 0);
    const cutoffEnd = new Date(y, mEnd + 1, 0, 23, 59, 59, 999);
    return allTickets.filter(t => {
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      return d >= cutoffStart && d <= cutoffEnd;
    });
  }, [allTickets, startMonth, endMonth, selectedYear]);

  // --- Agregasi customer dari tiket hasil filter ---
  const customerCards = useMemo(() => {
    if (!filteredTickets) return [];
    // LOGGING: Show number of customer cards
    console.log('[KanbanBoard] customerCards:', filteredTickets.length, 'tickets,', new Set(filteredTickets.map(t => t.customerId || 'Unknown')).size, 'unique customers');
    // Map customer hanya dari filteredTickets
    const map = new Map();
    filteredTickets.forEach(t => {
      const customerId = t.customerId || 'Unknown';
      if (!map.has(customerId)) {
        map.set(customerId, []);
      }
      map.get(customerId).push(t);
    });
    // Hanya customer yang punya tiket di periode filter
    return Array.from(map.entries()).map(([customerId, tickets]) => {
      let repClass = 'Normal';
      if (tickets.length > 18) repClass = 'Ekstrem';
      else if (tickets.length >= 10) repClass = 'Kronis';
      else if (tickets.length >= 3) repClass = 'Persisten';
      // Analisis insight
      const analysis = {
        description: tickets.map(t => t.description).filter(Boolean),
        cause: tickets.map(t => t.cause).filter(Boolean),
        handling: tickets.map(t => t.handling).filter(Boolean),
        conclusion: '',
      };
      // fullTicketHistory hanya untuk insight/historical, tidak mempengaruhi summary
      const fullTicketHistory = allTickets.filter(t => (t.customerId || 'Unknown') === customerId);
      // Trend analysis: bandingkan jumlah tiket bulan ini vs bulan sebelumnya
      let trend: 'Naik' | 'Turun' | 'Stabil' = 'Stabil';
      if (tickets.length > 0) {
        // Ambil bulan & tahun dari filter
        const { startMonth, endMonth, selectedYear } = analytics;
        const y = Number(selectedYear);
        const mEnd = Number(endMonth) - 1;
        const mPrev = mEnd - 1;
        // Bulan ini
        const ticketsThisMonth = tickets.filter(t => {
          if (!t.openTime) return false;
          const d = new Date(t.openTime);
          return d.getFullYear() === y && d.getMonth() === mEnd;
        });
        // Bulan sebelumnya
        const ticketsPrevMonth = tickets.filter(t => {
          if (!t.openTime) return false;
          const d = new Date(t.openTime);
          return d.getFullYear() === y && d.getMonth() === mPrev;
        });
        if (ticketsThisMonth.length > ticketsPrevMonth.length) trend = 'Naik';
        else if (ticketsThisMonth.length < ticketsPrevMonth.length) trend = 'Turun';
      }
      return {
        id: customerId,
        name: tickets[0]?.name || customerId,
        customerId,
        ticketCount: tickets.length,
        totalHandlingDurationFormatted: formatDurationDHM(tickets.reduce((acc, t) => acc + (t.handlingDuration?.rawHours || 0), 0)),
        allTickets: tickets,
        fullTicketHistory,
        analysis,
        repClass,
        trend,
      };
    });
  }, [filteredTickets, allTickets, analytics]);

  // --- Risk summary & total customers ---
  const processedData = useMemo(() => {
    if (!customerCards) {
      return {
        repClassSummary: [],
        totalCustomers: 0,
      };
    }
    const summaryMap: Record<string, { key: string; label: string; count: number; }> = {
      'Normal': { key: 'Normal', label: 'Normal', count: 0 },
      'Persisten': { key: 'Persisten', label: 'Persisten', count: 0 },
      'Kronis': { key: 'Kronis', label: 'Kronis', count: 0 },
      'Ekstrem': { key: 'Ekstrem', label: 'Ekstrem', count: 0 },
    };
    customerCards.forEach(customer => {
      const customerClass = customer.repClass || 'Normal';
      if (summaryMap[customerClass]) {
        summaryMap[customerClass].count++;
      }
    });
    return { 
      repClassSummary: Object.values(summaryMap),
      totalCustomers: customerCards.length,
    };
  }, [customerCards]);
  const { repClassSummary, totalCustomers } = processedData;

  // --- Filtered customer cards by risk filter ---
  const filteredCustomers = useMemo(() => {
    if (!customerCards) return [];
    let filtered = customerCards;
     if (repClassFilter && repClassFilter !== 'Total') {
      filtered = customerCards.filter(c => c.repClass === repClassFilter);
     }
     return filtered.slice().sort((a, b) => {
       const aTickets = a.ticketCount || 0;
       const bTickets = b.ticketCount || 0;
       return bTickets - aTickets;
     });
  }, [customerCards, repClassFilter]);

  const selectedCustomer = useMemo(() => {
    if (!openDialogId) return null;
    return filteredCustomers.find(c => c.id === openDialogId);
  }, [openDialogId, filteredCustomers]);

  // --- Month & year options ---
  const monthOptions = MONTH_OPTIONS;
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

  // --- Early return check after all hooks have been called ---
  if (!allTickets || allTickets.length === 0) {
  return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Customer Analytics</h1>
        <p>Upload file untuk melihat data Kanban.</p>
    </div>
  );
  }

  // --- Component Logic & Render ---
  const totalPages = Math.ceil(filteredCustomers.length / pageSize);

  // Risk color mapping for buttons and summary cards
  const riskColors = {
    Total: {
      badge: 'bg-blue-700',
      iconBg: 'bg-blue-700',
      text: 'text-blue-800',
    },
    Normal: {
      badge: 'bg-green-600',
      iconBg: 'bg-green-600',
      text: 'text-green-800',
    },
    Persisten: {
      badge: 'bg-yellow-400',
      iconBg: 'bg-yellow-400',
      text: 'text-yellow-800',
    },
    Kronis: {
      badge: 'bg-orange-500',
      iconBg: 'bg-orange-500',
      text: 'text-orange-800',
    },
    Ekstrem: {
      badge: 'bg-red-600',
      iconBg: 'bg-red-600',
      text: 'text-red-800',
    },
  };

  // Pada summary card customer risk, ubah label dan deskripsi ke bahasa Inggris natural
  const riskCategories = [
    {
      label: 'NORMAL',
      badge: 'Normal Risk',
      description: 'Customers with fewer than 3 complaints during the period. Very low risk.'
    },
    {
      label: 'PERSISTENT',
      badge: 'Medium Risk',
      description: 'Customers with 3–9 complaints during the period. Medium risk, needs attention.'
    },
    {
      label: 'CHRONIC',
      badge: 'High Risk',
      description: 'Customers with 10–18 complaints during the period. High risk, intervention needed.'
    },
    {
      label: 'EXTREME',
      badge: 'Extreme Risk',
      description: 'Customers with more than 18 complaints during the period. Very high risk, special action required.'
    },
  ];

  function top(items: string[]) {
    if (!items || items.length === 0) return '-';
    const counts: Record<string, number> = {};
    items.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  function generateInsight(tickets: ITicket[]) {
    if (!tickets || tickets.length === 0) return { masalah: '-', penyebab: '-', solusi: '-', rekomendasi: 'Data tidak cukup untuk insight.', kategori: '-' };
    const analysis = {
      description: tickets.map(t => t.description).filter(Boolean) as string[],
      cause: tickets.map(t => t.cause).filter(Boolean) as string[],
      handling: tickets.map(t => t.handling).filter(Boolean) as string[],
    };
    const masalah = top(analysis.description);
    const penyebab = top(analysis.cause);
    const solusi = top(analysis.handling);
    // Smart mapping kategori umum dari description
    const descText = (analysis.description.join(' ') || '').toLowerCase();
    let kategori = '-';
    if (/lambat|lelet|lemot|slow|delay/.test(descText)) kategori = 'Koneksi Lambat';
    else if (/putus|disconnect|drop|terputus/.test(descText)) kategori = 'Koneksi Terputus';
    else if (/tidak bisa|cannot|unable|gagal/.test(descText)) kategori = 'Akses Gagal';
    // Smart rekomendasi dari cause
    let rekomendasi = '';
    if (/limiter/i.test(penyebab)) {
      rekomendasi = 'Rekomendasi: Lakukan perbaikan otomatis pada router/NMS terkait limiter.';
    } else if (masalah !== '-' && penyebab !== '-' && solusi !== '-') {
      rekomendasi = `Pelanggan ini paling sering mengalami masalah ${masalah}, yang umumnya dipicu oleh ${penyebab}. Solusi yang terbukti efektif adalah ${solusi}. Disarankan untuk memperkuat edukasi dan SOP terkait ${solusi}, serta meningkatkan kemampuan deteksi dini pada ${penyebab}, agar penanganan masalah ${masalah} dapat dilakukan lebih cepat dan efisien.`;
    } else {
      rekomendasi = 'Perbanyak data agar insight lebih akurat.';
    }
    return { masalah, penyebab, solusi, rekomendasi, kategori };
  }

  const totalSummary = {
    key: 'Total',
    label: 'Total Customers',
    color: 'bg-gray-100 text-gray-800',
    count: totalCustomers,
  };

  const finalSummary = [totalSummary, ...repClassSummary];



  function TicketHistoryTable({ tickets }) {
    if (!Array.isArray(tickets) || tickets.length === 0) {
      return <div className="text-gray-400 text-sm">No tickets in this period.</div>;
    }
    // Group tickets by month-year
    const groups = {};
    tickets.forEach(t => {
      if (!t.openTime) return;
      const d = new Date(t.openTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    // Sort group keys descending
    const sortedKeys = Object.keys(groups).sort((a, b) => Number(new Date(b + '-01')) - Number(new Date(a + '-01')));
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    // Kolom: Open Date, Description, Root Cause, Solution, Handling Duration, Status
    return (
      <div className="overflow-x-auto">
        {sortedKeys.map(key => {
          const [yyyy, mm] = key.split('-');
          return (
            <div key={key} className="mb-6">
              <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{monthNames[parseInt(mm, 10) - 1]} {yyyy}</div>
              <table className="w-full text-xs border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '90px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-gray-100 dark:bg-zinc-800">
                    <th className="p-2 text-left font-semibold">Open Date</th>
                    <th className="p-2 text-left font-semibold">Description</th>
                    <th className="p-2 text-left font-semibold">Root Cause</th>
                    <th className="p-2 text-left font-semibold">Solution</th>
                    <th className="p-2 text-left font-semibold">Handling Duration</th>
                    <th className="p-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groups[key].sort((a, b) => Number(new Date(a.openTime)) - Number(new Date(b.openTime))).map(t => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-zinc-800">
                      <td className="p-2 whitespace-nowrap align-top">{formatDateTimeDDMMYYYY(t.openTime)}</td>
                      <td className="p-2 whitespace-normal break-words align-top">{t.description}</td>
                      <td className="p-2 whitespace-normal break-words align-top">{t.cause}</td>
                      <td className="p-2 whitespace-normal break-words align-top">{t.handling}</td>
                      <td className="p-2 whitespace-nowrap align-top">{t.handlingDuration?.formatted || '-'}</td>
                      <td className="p-2 align-top">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold`}>
                          <Badge variant={t.status === 'Closed' ? 'success' : t.status === 'Open' ? 'warning' : t.status === 'Escalated' ? 'danger' : 'default'}>{t.status}</Badge>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  }

  // Helper untuk historical ticket count sesuai periode filter
  function HistoricalTicketCount({ customer }) {
    const { startMonth, endMonth, selectedYear } = analytics;
    if (!startMonth || !endMonth || !selectedYear) return <div className="text-gray-400 italic">Please select month and year to see historical count.</div>;
    const y = Number(selectedYear);
    const mStart = Number(startMonth) - 1;
    const mEnd = Number(endMonth) - 1;
    // Buat array bulan-tahun dari periode filter
    const months = [];
    for (let m = mStart; m <= mEnd; m++) {
      const date = new Date(y, m, 1);
      months.push({
        label: `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`,
        year: date.getFullYear(),
        month: date.getMonth(),
      });
    }
    // Hitung jumlah tiket customer per bulan
    const tickets = customer.fullTicketHistory || customer.allTickets || [];
    const ticketsPerMonth = months.map(({ year, month }) =>
      tickets.filter(t => {
        if (!t.openTime) return false;
        const d = new Date(t.openTime);
        return d.getFullYear() === year && d.getMonth() === month;
      })
    );
    // Akumulasi
    const firstMonthCount = ticketsPerMonth[0]?.length || 0;
    const first3MonthsCount = ticketsPerMonth.slice(0, 3).reduce((acc, arr) => acc + arr.length, 0);
    const all6MonthsCount = ticketsPerMonth.reduce((acc, arr) => acc + arr.length, 0);
    // Total tiket pada periode filter
    const totalTickets = ticketsPerMonth.reduce((acc, arr) => acc + arr.length, 0);
    // Render
    return (
      <>
        {months.map((m, i) => (
          <div key={m.label}>{m.label}: <b>{ticketsPerMonth[i].length}</b> tickets</div>
        ))}
        <div className="mt-2">Bulan pertama: <b>{firstMonthCount}</b> tickets</div>
        <div>3 bulan pertama: <b>{first3MonthsCount}</b> tickets</div>
        <div>6 bulan: <b>{all6MonthsCount}</b> tickets</div>
        <div className="mt-2 font-bold text-blue-700">Total tickets in this period: {totalTickets}</div>
      </>
    );
  }

  function avgDuration(arr) {
    if (!arr.length) return '-';
    const totalSeconds = arr.reduce((acc, t) => acc + (typeof t.handlingDuration?.rawSeconds === 'number' ? t.handlingDuration.rawSeconds : Number(t.handlingDuration?.rawSeconds) || 0), 0);
    const arrLen = typeof arr.length === 'number' ? arr.length : Number(arr.length);
    const avgSeconds = arrLen > 0 ? Number(totalSeconds) / arrLen : 0;
    return formatDurationDHM(Number(avgSeconds) / 3600);
  }

  function CustomerCard({ customer, tickets }) {
    // tickets: tiket customer ini sesuai filter waktu & risk
    const closed = tickets.filter(t => t.status === 'Closed').length;
    const percentClosed = tickets.length > 0 ? Math.round(Number(closed) / Number(tickets.length) * 100) : 0;
    // Hitung rata-rata durasi handling (dalam format HH:mm:ss)
    const avgHandling = avgDuration(tickets);
    // Top agent
    const agentCount = {};
    tickets.forEach(t => { if (t.openBy) agentCount[t.openBy] = (agentCount[t.openBy] || 0) + 1; });
    const topAgent = Object.entries(agentCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-';
    // Top issue
    const issueCount = {};
    tickets.forEach(t => { if (t.description) issueCount[t.description] = (issueCount[t.description] || 0) + 1; });
    const topIssue = Object.entries(issueCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-';
    // Last open ticket
    const lastTicket = tickets.slice().sort((a, b) => new Date(b.openTime).getTime() - new Date(a.openTime).getTime())[0];
    // Trend badge
    let trendBadge = null;
    if (customer.trend === 'Naik') trendBadge = <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold dark:bg-green-200 dark:text-green-900">Trend: Up</span>;
    else if (customer.trend === 'Turun') trendBadge = <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold dark:bg-red-200 dark:text-red-900">Trend: Down</span>;
    else if (customer.trend === 'Stabil') trendBadge = <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold dark:bg-gray-200 dark:text-gray-900">Trend: Stable</span>;

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 flex flex-col min-h-[200px] transition-all duration-300 min-w-0 overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02]"
        onClick={() => setOpenDialogId(customer.id)}
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 min-w-12 min-h-12 rounded-xl flex items-center justify-center bg-blue-500 shadow-lg">
            <GroupIcon className="text-white" style={{ fontSize: 28 }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 break-words whitespace-normal">{customer.name}</h3>
          </div>
          <Badge variant="info" className="ml-2">{customer.ticketCount} TICKETS</Badge>
                {trendBadge}
        </div>
        <div className="flex gap-4 mb-2">
          <Badge variant="success" className="mb-2">Closed: {closed} / {tickets.length} ({percentClosed}%)</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
          <HowToRegIcon className="text-blue-400" /> Top Agent: {topAgent}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <Badge variant="warning" className="mr-2">Top Issue</Badge> {topIssue}
        </div>
      </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-[13px]">
            <div className="text-sm font-semibold mb-1 text-blue-900 dark:text-blue-200">Preview</div>
            <div className="mb-1"><span className="font-bold text-gray-700 dark:text-gray-200">Top Issue:</span> {topIssue}</div>
            <div className="mb-1"><span className="font-bold text-gray-700 dark:text-gray-200">Last Open Ticket:</span> {lastTicket ? `${formatDateTimeDDMMYYYY(lastTicket.openTime)} — ${lastTicket.description || '-'}` : '-'}</div>
            <div><span className="font-bold text-gray-700 dark:text-gray-200">Risk Trend:</span> {customer.trend === 'Naik' ? 'Up' : customer.trend === 'Turun' ? 'Down' : 'Stable'}</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Helper untuk normalisasi label risk ke bahasa Inggris
  function normalizeRiskLabel(label: string) {
    if (label.toLowerCase() === 'persisten') return 'PERSISTENT';
    if (label.toLowerCase() === 'kronis') return 'CHRONIC';
    if (label.toLowerCase() === 'ekstrem') return 'EXTREME';
    if (label.toLowerCase() === 'normal') return 'NORMAL';
    return label.toUpperCase();
  }

  // Komponen PDF untuk customer report
  const CustomerReportPDF = ({ customer, insight, tickets }) => {
    const styles = StyleSheet.create({
      page: { padding: 32, fontSize: 11, fontFamily: 'Helvetica' },
      header: { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
      subheader: { fontSize: 13, color: '#555', marginBottom: 8 },
      badge: { borderRadius: 4, padding: '2 8', fontSize: 10, fontWeight: 'bold', color: '#fff', marginLeft: 8 },
      badgeUp: { backgroundColor: '#22c55e' },
      badgeDown: { backgroundColor: '#ef4444' },
      badgeStable: { backgroundColor: '#6b7280' },
      sectionTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 18, marginBottom: 6, borderBottom: '1 solid #e5e7eb', paddingBottom: 2 },
      label: { fontWeight: 'bold', marginTop: 4 },
      value: { marginBottom: 4 },
      insightBox: { backgroundColor: '#f1f5f9', borderRadius: 6, padding: 10, marginBottom: 10 },
      rec: { color: '#2563eb', fontWeight: 'bold', marginTop: 4 },
      table: { width: 'auto', marginTop: 6, marginBottom: 10 },
      tableRow: { flexDirection: 'row' },
      tableHeader: { backgroundColor: '#e0e7ef', fontWeight: 'bold' },
      tableCell: { padding: 4, fontSize: 10, borderRight: '1 solid #e5e7eb', borderBottom: '1 solid #e5e7eb', flexGrow: 1 },
      zebra: { backgroundColor: '#f9fafb' },
      summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, marginTop: 8, gap: 8 },
      summaryRow: { flexDirection: 'row', width: '100%', marginBottom: 4 },
      summaryItem: { flex: 1, minWidth: 120, marginRight: 12, marginBottom: 8 },
      summaryLabel: { fontSize: 10, color: '#555', marginBottom: 2 },
      summaryValue: { fontSize: 14, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 0 },
      trendUp: { color: '#22c55e', fontWeight: 'bold' },
      trendDown: { color: '#ef4444', fontWeight: 'bold' },
      trendStable: { color: '#6b7280', fontWeight: 'bold' },
      miniChartTable: { width: 'auto', marginTop: 2, marginBottom: 10 },
      miniChartHeader: { backgroundColor: '#e0e7ef', fontWeight: 'bold' },
      miniChartCell: { padding: 3, fontSize: 10, borderRight: '1 solid #e5e7eb', borderBottom: '1 solid #e5e7eb', flexGrow: 1 },
      footer: { marginTop: 18, fontSize: 9, color: '#888', textAlign: 'right' },
    });
    const trendBadge = customer.trend === 'Naik' ? [styles.badge, styles.badgeUp] : customer.trend === 'Turun' ? [styles.badge, styles.badgeDown] : [styles.badge, styles.badgeStable];
    const now = new Date();

    // Summary grid data
    const closed = customer.allTickets.filter(t => t.status === 'Closed').length;
    const avgHandling = customer.allTickets.length > 0 ?
      (customer.allTickets.reduce((acc, t) => acc + (t.handlingDuration?.rawHours || 0), 0) / customer.allTickets.length) : 0;
    const topAgent = (() => { const agentCount = {}; customer.allTickets.forEach(t => { if (t.openBy) agentCount[t.openBy] = (agentCount[t.openBy] || 0) + 1; }); return Object.entries(agentCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-'; })();
    const topIssue = (() => { const issueCount = {}; customer.allTickets.forEach(t => { if (t.description) issueCount[t.description] = (issueCount[t.description] || 0) + 1; }); return Object.entries(issueCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-'; })();
    const trendLabel = customer.trend === 'Naik' ? 'Up' : customer.trend === 'Turun' ? 'Down' : 'Stable';
    const trendStyle = customer.trend === 'Naik' ? styles.trendUp : customer.trend === 'Turun' ? styles.trendDown : styles.trendStable;

    // Mini trend chart data (bulan & jumlah tiket)
    const history = (customer.allTickets || []).reduce((acc, t) => {
      if (!t.openTime) return acc;
      const d = new Date(t.openTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const sortedKeys = Object.keys(history).sort((a, b) => new Date(a + '-01').getTime() - new Date(b + '-01').getTime());
    const miniChartData = sortedKeys.map(key => {
      const [yyyy, mm] = key.split('-');
      return { label: `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`, count: history[key] };
    });

    // Group tickets by month-year for ticket history
    const groups = {};
    (tickets || []).forEach(t => {
      if (!t.openTime) return;
      const d = new Date(t.openTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    const sortedTicketKeys = Object.keys(groups).sort((a, b) => Number(new Date(b + '-01')) - Number(new Date(a + '-01')));

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={styles.header}>{customer.name} ({customer.customerId})</Text>
            <Text style={trendBadge}>Trend: {trendLabel}</Text>
          </View>
          <Text style={styles.subheader}>Exported: {now.toLocaleString()}</Text>
          {/* Summary Grid (2 rows x 3 cols) */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Total Tickets</Text><Text style={styles.summaryValue}>{customer.allTickets.length}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Closed</Text><Text style={styles.summaryValue}>{closed}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Avg Handling</Text><Text style={styles.summaryValue}>{avgHandling ? avgHandling.toFixed(2) + ' h' : '-'}</Text></View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Top Agent</Text><Text style={styles.summaryValue}>{topAgent}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Top Issue</Text><Text style={styles.summaryValue}>{topIssue}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Risk Trend</Text><Text style={[styles.summaryValue, trendStyle]}>{trendLabel}</Text></View>
            </View>
          </View>
          {/* Mini Trend Chart (as table) */}
          <Text style={styles.sectionTitle}>Ticket History Trend</Text>
          <View style={styles.miniChartTable}>
            <View style={[styles.tableRow, styles.miniChartHeader]}>
              <Text style={[styles.miniChartCell, { flex: 2 }]}>Month</Text>
              <Text style={styles.miniChartCell}>Tickets</Text>
            </View>
            {miniChartData.length > 0 ? miniChartData.map((d, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.zebra]}>
                <Text style={[styles.miniChartCell, { flex: 2 }]}>{d.label}</Text>
                <Text style={styles.miniChartCell}>{d.count}</Text>
              </View>
            )) : (
              <View style={styles.tableRow}><Text style={styles.miniChartCell}>No data</Text></View>
            )}
          </View>
          {/* Automated Insight */}
          <Text style={styles.sectionTitle}>Automated Insight</Text>
          <View style={styles.insightBox}>
            <Text style={styles.label}>Main Issue:</Text>
            <Text style={styles.value}>{insight.masalah}</Text>
            <Text style={styles.label}>Root Cause:</Text>
            <Text style={styles.value}>{insight.penyebab}</Text>
            <Text style={styles.label}>General Category:</Text>
            <Text style={styles.value}>{insight.kategori}</Text>
            <Text style={styles.label}>Solution:</Text>
            <Text style={styles.value}>{insight.solusi}</Text>
          </View>
          {/* Ticket History */}
          <Text style={styles.sectionTitle}>Ticket History</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Description</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>Root Cause</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>Solution</Text>
              <Text style={styles.tableCell}>Duration</Text>
              <Text style={styles.tableCell}>Status</Text>
            </View>
            {sortedTicketKeys.length === 0 ? (
              <View style={styles.tableRow}><Text style={styles.tableCell}>No tickets in this period.</Text></View>
            ) : (
              sortedTicketKeys.map((key) => {
                const [yyyy, mm] = key.split('-');
                const monthLabel = `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
                // Sort tickets in this month by date ascending
                const monthTickets = groups[key].slice().sort((a, b) => Number(new Date(a.openTime)) - Number(new Date(b.openTime)));
                return [
                  <View key={key + '-label'} style={{ backgroundColor: '#f3f4f6', padding: 4 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{monthLabel}</Text>
                  </View>,
                  ...monthTickets.map((t, i) => (
                    <View key={t.id || t.openTime || i} style={[styles.tableRow, (i % 2 === 1) && styles.zebra]} wrap={false}>
                      <Text style={[styles.tableCell, { flex: 1.2 }]}>{t.openTime ? String(t.openTime).slice(0, 10) : '-'}</Text>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{t.description}</Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{t.cause}</Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{t.handling}</Text>
                      <Text style={styles.tableCell}>{t.handlingDuration?.formatted || '-'}</Text>
                      <Text style={styles.tableCell}>{t.status}</Text>
                    </View>
                  ))
                ];
              })
            )}
          </View>
          {/* Footer */}
          <Text style={styles.footer}>Generated by Helpdesk Management System</Text>
        </Page>
      </Document>
    );
  };

  // Komponen MiniTrendChart
  const MiniTrendChart = ({ data, height = 120 }) => (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 48, left: 48, bottom: 24 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={0} dy={16} height={40} interval={0} />
          <YAxis hide domain={[0, 'dataMax+2']} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 5, stroke: '#2563eb', strokeWidth: 2, fill: '#fff' }}
          >
            <LabelList
              dataKey="count"
              position="top"
              offset={12}
              style={{ fontSize: 11, fill: '#1e3a8a', fontWeight: 'bold', textShadow: '0 1px 2px #fff' }}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  // Komponen DonutChartSummary
  const DonutChartSummary = ({ data }) => {
    const COLORS = ['#22c55e', '#facc15', '#fb923c', '#ef4444'];
    const riskLabels = ['Normal', 'Persisten', 'Kronis', 'Ekstrem'];
    const chartData = data.filter(d => d.key !== 'Total').map((d, i) => ({
      name: riskLabels[i], value: d.count
    }));
    const total = chartData.reduce((acc, d) => acc + d.value, 0);
    const percentArr = chartData.map(d => total > 0 ? Math.round((d.value / total) * 100) : 0);
    return (
      <div className="flex flex-row items-center justify-center h-full w-full gap-4">
        <PieChart width={180} height={180}>
          <Pie
            data={chartData}
            cx={90}
            cy={90}
            innerRadius={54}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={2}
            dataKey="value"
            label={false}
            labelLine={false}
            stroke="none"
            strokeWidth={0}
          >
            {chartData.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
        <div className="flex flex-col gap-2">
          {chartData.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }}></span>
              <span className={`text-xs ${COLORS[i] === '#facc15' || COLORS[i] === '#fb923c' ? 'dark:text-black' : ''}`} style={{ color: COLORS[i], fontWeight: 400 }}>{entry.name}</span>
              <span className={`text-xs ${COLORS[i] === '#facc15' || COLORS[i] === '#fb923c' ? 'dark:text-black' : ''}`} style={{ color: COLORS[i], fontWeight: 400 }}>{percentArr[i]}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Page Title & Description */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Customer Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">Customer analysis based on the number and risk of complaints during the selected period.</p>
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
      {/* Redesigned Summary Cards */}
      <div className="w-full mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {finalSummary.map((item) => {
            const riskInfo = item.key !== 'Total' ? riskCategories.find(rc => rc.label === normalizeRiskLabel(item.key)) : null;
          const icon = {
            Normal: <CheckCircleIcon className="w-7 h-7 text-white" />,
            Persisten: <WarningAmberIcon className="w-7 h-7 text-white" />,
            Kronis: <WhatshotIcon className="w-7 h-7 text-white" />,
            Ekstrem: <SecurityIcon className="w-7 h-7 text-white" />,
            Total: <GroupIcon className="w-7 h-7 text-white" />,
          }[item.key];

          const percent = totalCustomers > 0 ? ((item.count / totalCustomers) * 100).toFixed(1) : '0.0';
          return (
              <SummaryCard
              key={item.key}
                icon={icon}
              title={item.label}
                value={
                  <>
                    <div>{item.count}</div>
                    {item.key !== 'Total' && (
                    <div className="text-sm font-semibold text-gray-500 mt-1">{percent}%</div>
                    )}
                  </>
                }
                description={riskInfo?.description || 'Total unique customers in the selected period.'}
              iconBg={riskColors[item.key]?.iconBg || 'bg-gray-500'}
              badgeColor={riskColors[item.key]?.badge || 'bg-blue-600'}
                badge={item.key !== 'Total' ? riskInfo?.badge : undefined}
              className={`cursor-pointer transition-all duration-300 ${repClassFilter === item.key ? '' : ''}`}
              onClick={() => setRepClassFilter(item.key)}
              active={repClassFilter === item.key}
            />
          );
        })}
          {/* Donut Chart Card */}
          <div className="rounded-2xl shadow-lg bg-white dark:bg-zinc-900 flex flex-col items-center justify-center p-4 min-h-[170px]">
            <DonutChartSummary data={finalSummary} />
          </div>
        </div>
      </div>

      {/* Risk filter button group */}
      {/* HIDE risk filter button group
      <div className="flex flex-wrap gap-2 mb-6">
        {['Total', 'Normal', 'Persisten', 'Kronis', 'Ekstrem'].map((key) => {
          const color = riskColors[key];
          const count = repClassSummary.find(r => r.key === key)?.count || (key === 'Total' ? totalCustomers : 0);
          const isActive = repClassFilter === key;
          const icon = {
            Total: <GroupIcon className="w-5 h-5" />,
            Normal: <CheckCircleIcon className="w-5 h-5" />,
            Persisten: <WarningAmberIcon className="w-5 h-5" />,
            Kronis: <WhatshotIcon className="w-5 h-5" />,
            Ekstrem: <SecurityIcon className="w-5 h-5" />,
          }[key];
          return (
            <button
              key={key}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm shadow-sm border border-gray-200 dark:border-zinc-700 transition-all duration-200
                ${color.badge} text-white
                ${isActive ? 'ring-2 ring-blue-500 scale-105' : 'hover:brightness-110'}
              `}
              onClick={() => setRepClassFilter(key)}
            >
              {icon}
              <span className="uppercase tracking-wide">{key}</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">{count}</span>
            </button>
          );
        })}
      </div> */}

      <div className="flex-grow pr-4 -mr-4">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.length > 50 ? (
            <List
              height={800}
              itemCount={filteredCustomers.length}
              itemSize={230}
              width={"100%"}
              className="mb-8"
            >
              {({ index, style }) => {
                const customer = filteredCustomers[index];
                const ticketsInRange = customer.allTickets || [];
                return (
                  <div style={{ ...style, padding: 0 }}>
                    <div className="mb-2">
                      <CustomerCard key={customer.id} customer={customer} tickets={ticketsInRange} />
                    </div>
                  </div>
                );
              }}
            </List>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
            {filteredCustomers.slice((page - 1) * pageSize, page * pageSize).map((customer) => {
              const ticketsInRange = customer.allTickets || [];
              return (
                <CustomerCard key={customer.id} customer={customer} tickets={ticketsInRange} />
              );
            })}
          </div>
          )
        ) : (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">No Customers Found</h3>
            <p className="text-sm text-gray-500">No customers match the current filter criteria.</p>
      </div>
        )}
      </div>

      {/* Single Dialog for Customer Details */}
      <RadixDialog.Root open={!!openDialogId} onOpenChange={open => setOpenDialogId(open ? openDialogId : null)}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <RadixDialog.Content className="fixed right-0 top-0 h-full w-[99vw] md:w-[90vw] max-w-6xl bg-white dark:bg-zinc-900 border-l border-blue-100 dark:border-zinc-800 shadow-2xl z-50 overflow-y-auto transition-all duration-300">
            {selectedCustomer && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-10 pt-8 pb-2 border-b border-blue-100 dark:border-zinc-800">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedCustomer.name}</div>
                  <RadixDialog.Close asChild>
                    <button className="text-blue-700 dark:text-blue-300 hover:text-red-500 text-4xl font-extrabold focus:outline-none transition-colors duration-150" aria-label="Close customer detail">&times;</button>
                  </RadixDialog.Close>
                  </div>
                {/* Summary Grid */}
                <div className="px-10 pt-6 pb-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                    <div className="flex flex-col"><span className="text-xs text-gray-500 dark:text-gray-400">Total Tickets</span><span className="text-xl font-bold text-blue-900 dark:text-blue-300">{selectedCustomer.allTickets.length}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-gray-500 dark:text-gray-400">Closed</span><span className="text-xl font-bold text-blue-900 dark:text-blue-300">{selectedCustomer.allTickets.filter(t => t.status === 'Closed').length}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-gray-500 dark:text-gray-400">Avg Handling</span><span className="text-xl font-bold text-blue-900 dark:text-blue-300">{formatDurationDHM(selectedCustomer.allTickets.reduce((acc, t) => acc + (t.handlingDuration?.rawHours || 0), 0) / (selectedCustomer.allTickets.length || 1))}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-gray-500 dark:text-gray-400">Top Agent</span><span className="text-base font-semibold text-blue-800 dark:text-blue-300">{(() => { const agentCount = {}; selectedCustomer.allTickets.forEach(t => { if (t.openBy) agentCount[t.openBy] = (agentCount[t.openBy] || 0) + 1; }); return Object.entries(agentCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-'; })()}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-gray-500 dark:text-gray-400">Top Issue</span><span className="text-base font-semibold text-blue-800 dark:text-blue-300">{(() => { const issueCount = {}; selectedCustomer.allTickets.forEach(t => { if (t.description) issueCount[t.description] = (issueCount[t.description] || 0) + 1; }); return Object.entries(issueCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-'; })()}</span></div>
                    <div className="flex flex-col"><span className="text-xs text-gray-500 dark:text-gray-400">Risk Trend</span><span className="text-base font-semibold text-blue-800 dark:text-blue-300">{selectedCustomer.repClass}</span></div>
                    </div>
                  </div>
                {/* Automated Insight Box */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 mb-6 shadow border border-blue-100 dark:border-zinc-800">
                  <div className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">Automated Insight</div>
                  <div className="space-y-1">
                    <div><Badge variant="info" className="mr-2">Problem</Badge> <span className="text-gray-700 dark:text-gray-200">{generateInsight(selectedCustomer.allTickets).masalah}</span></div>
                    <div><Badge variant="warning" className="mr-2">Cause</Badge> <span className="text-gray-700 dark:text-gray-200">{generateInsight(selectedCustomer.allTickets).penyebab}</span></div>
                    <div><Badge variant="info" className="mr-2">Category</Badge> <span className="text-gray-700 dark:text-gray-200">{generateInsight(selectedCustomer.allTickets).kategori}</span></div>
                    <div><Badge variant="success" className="mr-2">Solution</Badge> <span className="text-gray-700 dark:text-gray-200">{generateInsight(selectedCustomer.allTickets).solusi}</span></div>
                    <div><Badge variant="info" className="mr-2">Recommendation</Badge> <span className="text-gray-700 dark:text-gray-200 text-justify block">{generateInsight(selectedCustomer.allTickets).rekomendasi}</span></div>
                  </div>
                </div>
                {/* Mini Trend Chart (historis jumlah tiket bulanan) */}
                <div className="px-10 pb-2">
                  <div className="bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 rounded-xl p-5 mb-6 shadow-sm">
                    <div className="text-base font-bold text-blue-900 dark:text-blue-300 mb-3">Ticket History</div>
                    {(() => {
                      // Ambil data historis bulanan untuk customer sesuai filter waktu
                      const history = (selectedCustomer.allTickets || []).reduce((acc, t) => {
                        if (!t.openTime) return acc;
                        const d = new Date(t.openTime);
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        acc[key] = (acc[key] || 0) + 1;
                        return acc;
                      }, {});
                      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const sortedKeys = Object.keys(history).sort((a, b) => new Date(a + '-01').getTime() - new Date(b + '-01').getTime());
                      const chartData = sortedKeys.map(key => {
                        const [yyyy, mm] = key.split('-');
                        return { label: `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`, count: history[key] };
                      });
                      return chartData.length > 0 ? (
                        <div className="w-full max-w-5xl mx-auto overflow-x-auto">
                          <div style={{ minWidth: Math.max(700, chartData.length * 120) }}>
                            <MiniTrendChart data={chartData} height={160} />
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center py-8">No ticket history data.</div>
                      );
                    })()}
                  </div>
                </div>
                {/* Historical Count */}
                <div className="px-10 pb-2">
                  <div className="bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-800 rounded-xl p-5 mb-6">
                    <div className="text-base font-bold text-blue-900 dark:text-blue-300 mb-3">Ticket History</div>
                      <HistoricalTicketCount customer={selectedCustomer} />
                    </div>
                  </div>
                {/* Ticket History */}
                <div className="px-10 pb-2">
                  <div className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">Ticket History</div>
                  <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow border border-blue-100 dark:border-zinc-800 text-base text-blue-900 dark:text-blue-300 min-w-[600px] w-full overflow-x-auto overflow-y-visible">
                      <TicketHistoryTable tickets={selectedCustomer.allTickets} />
                    </div>
                  </div>
                {/* Action: Download PDF */}
                <div className="px-10 pb-8 flex justify-end">
                  <PDFDownloadLink document={<CustomerReportPDF customer={selectedCustomer} insight={generateInsight(selectedCustomer.allTickets)} tickets={selectedCustomer.allTickets} />} fileName={`CustomerReport-${selectedCustomer.name}.pdf`}>
                    {({ loading }) => (
                      <button className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700 transition-all">
                        {loading ? 'Preparing PDF...' : 'Download PDF'}
                      </button>
                    )}
                  </PDFDownloadLink>
                  </div>
              </>
            )}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-zinc-700 disabled:opacity-50">&laquo; Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-zinc-700 disabled:opacity-50">Next &raquo;</button>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;