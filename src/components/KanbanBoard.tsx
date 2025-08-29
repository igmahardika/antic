import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ITicket } from '@/lib/db';
import { formatDurationDHM, formatDateTimeDDMMYYYY } from '@/lib/utils';
import { useAnalytics } from './AnalyticsContext';
import SummaryCard from './ui/SummaryCard';
import GroupIcon from '@mui/icons-material/Group';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PageWrapper from './PageWrapper';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import SecurityIcon from '@mui/icons-material/Security';
import FileTextIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';

import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { exportToExcel, exportToCSV } from '../utils/exportUtils';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, LabelList, PieChart, Pie, Cell } from 'recharts';
import { FixedSizeList as List } from 'react-window';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import TimeFilter from './TimeFilter';
import * as RadixDialog from '@radix-ui/react-dialog';

// Using built-in fonts for reliability - no external font loading needed

// Buffer polyfill for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  import('buffer').then(({ Buffer }) => {
    window.Buffer = Buffer;
  });
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
          const { endMonth, selectedYear } = analytics;
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
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-card-foreground">Customer Analytics</h1>
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



  function CustomerCard({ customer, tickets }) {
    // tickets: tiket customer ini sesuai filter waktu & risk
    const closed = tickets.filter(t => t.status === 'Closed').length;
    const percentClosed = tickets.length > 0 ? Math.round(Number(closed) / Number(tickets.length) * 100) : 0;
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
                    if (customer.trend === 'Naik') trendBadge = <span className="ml-2 px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-xs font-bold dark:bg-green-200 dark:text-green-900">Trend: Up</span>;
                else if (customer.trend === 'Turun') trendBadge = <span className="ml-2 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-bold dark:bg-red-200 dark:text-red-900">Trend: Down</span>;
                else if (customer.trend === 'Stabil') trendBadge = <span className="ml-2 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-bold dark:bg-gray-200 dark:text-gray-900">Trend: Stable</span>;

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
      <div
        className="bg-card text-card-foreground  rounded-2xl shadow-lg p-6 flex flex-col min-h-[200px] transition-all duration-300 min-w-0 overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02]"
        onClick={() => setOpenDialogId(customer.id)}
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 min-w-12 min-h-12 rounded-xl flex items-center justify-center bg-blue-500 shadow-lg">
            <GroupIcon className="text-white" style={{ fontSize: 28 }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-bold text-card-foreground break-words whitespace-normal">{customer.name}</h3>
          </div>
          <Badge variant="info" className="ml-2">{customer.ticketCount} TICKETS</Badge>
                {trendBadge}
        </div>
        <div className="flex gap-4 mb-2">
          <Badge variant="success" className="mb-2">Closed: {closed} / {tickets.length} ({percentClosed}%)</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-1">
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

  // Professional PDF Report Component with Cover Page
  const CustomerReportPDF = ({ customer, insight, tickets }) => {
    const styles = StyleSheet.create({
      // Cover page styles
      coverPage: { 
        padding: 0, 
        fontSize: 10, 
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff'
      },
      coverBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        objectFit: 'cover'
      },
      coverContent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        transform: 'translateY(-70%)'
      },
      coverTitle: {
        fontSize: 40,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        textTransform: 'uppercase',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        marginBottom: 10,
        textAlign: 'left'
      },
      coverCustomerInfo: {
        marginBottom: 2
      },
      coverCustomerName: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        marginBottom: 8
      },
      coverCustomerId: {
        fontSize: 8,
        color: '#ffffff',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      },
      // Content page styles
      contentPage: { 
        padding: 20, 
        fontSize: 10, 
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff'
      },
      // Page header and footer images
      pageHeaderImage: {
        width: '100%',
        height: 'auto',
        marginBottom: 10,
        objectFit: 'contain'
      },
      pageFooterImage: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: 'auto',
        objectFit: 'contain'
      },
      pageHeader: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        border: '1px solid #e2e8f0'
      },
      pageTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 5
      },
      pageSubtitle: {
        fontSize: 12,
        color: '#64748b'
      },
      // Customer information section
      customerHeader: {
        marginBottom: 12
      },
      customerName: {
        fontSize: 15,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
        marginBottom: 4
      },
      customerId: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500'
      },
      // Summary cards
      summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 15,
        gap: 8
      },
      summaryCard: {
        flex: 1,
        minWidth: 120,
        padding: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 6,
        border: '1px solid #e2e8f0',
        shadow: '0 1px 3px rgba(0,0,0,0.1)'
      },
      summaryLabel: {
        fontSize: 8,
        color: '#64748b',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 0.5
      },
      summaryValue: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
        marginBottom: 0,
        lineHeight: 1.2
      },
      summaryTrend: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold'
      },
      trendUp: { color: '#059669' },
      trendDown: { color: '#dc2626' },
      trendStable: { color: '#6b7280' },
      // Performance metrics
      metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
        gap: 12
      },
      metricItem: {
        flex: 1,
        minWidth: 140,
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 6,
        border: '1px solid #e2e8f0'
      },
      metricLabel: {
        fontSize: 10,
        color: '#64748b',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold'
      },
      metricValue: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
        marginBottom: 2
      },
      // Section titles
      sectionTitle: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#1e293b',
        marginTop: 12,
        marginBottom: 6
      },
      // Insight box
      insightBox: {
        backgroundColor: '#f8fafc',
        padding: 12,
        marginBottom: 15,
        borderRadius: 8,
        border: '1px solid #e2e8f0'
      },
      insightItem: {
        marginBottom: 8,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start'
      },
      insightLabel: {
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        color: '#ffffff',
        marginBottom: 0,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        minWidth: 70,
        textAlign: 'center',
        letterSpacing: 0.3
      },
      insightValue: {
        fontSize: 9,
        color: '#1f2937',
        lineHeight: 1.3,
        flex: 1,
        marginLeft: 8,
        fontWeight: '500'
      },
      // Tables
      table: {
        width: '100%',
        marginTop: 4,
        marginBottom: 8,
        border: '1px solid #e5e7eb'
      },
      historyTable: {
        width: '100%',
        marginTop: 10,
        marginBottom: 15,
        border: '1px solid #e5e7eb'
      },
      monthHeader: {
        backgroundColor: '#f1f5f9',
        padding: 2
      },
      monthLabel: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        color: '#1e293b'
      },
      tableHeader: {
        backgroundColor: '#f3f4f6',
        fontFamily: 'Helvetica-Bold',
        fontSize: 12
      },
      tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #e5e7eb'
      },
      tableCell: {
        padding: 3,
        fontSize: 8,
        borderRight: '1px solid #e5e7eb',
        flex: 1,
        lineHeight: 1.0
      },
      tableCellHeader: {
        padding: 3,
        fontSize: 8,
        borderRight: '1px solid #e5e7eb',
        flex: 1,
        fontFamily: 'Helvetica-Bold',
        color: '#374151',
        lineHeight: 1.0
      },
      zebra: { backgroundColor: '#f9fafb' },
      // Status badges
      statusBadge: {
        borderRadius: 8,
        padding: '1 4',
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center'
      },
      statusClosed: { backgroundColor: '#dcfce7', color: '#166534' },
      statusOpen: { backgroundColor: '#fef3c7', color: '#92400e' },
      statusPending: { backgroundColor: '#fce7f3', color: '#be185d' },
      // Footer
      footer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        fontSize: 10,
        color: '#6b7280',
        textAlign: 'center',
        borderTop: '1px solid #e5e7eb',
        paddingTop: 10
      },
      // Page number
      pageNumber: {
        position: 'absolute',
        bottom: 10,
        right: 20,
        fontSize: 10,
        color: '#6b7280'
      }
    });
    // Calculate summary data
    const closed = customer.allTickets.filter(t => t.status === 'Closed').length;
    const avgHandling = customer.allTickets.length > 0 ?
      (customer.allTickets.reduce((acc, t) => acc + (t.handlingDuration?.rawHours || 0), 0) / customer.allTickets.length) : 0;
    
    // Find top issue
    const issueCount = {};
    customer.allTickets.forEach(t => {
      if (t.description) issueCount[t.description] = (issueCount[t.description] || 0) + 1;
    });
    const topIssue = Object.entries(issueCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || '-';
    
    const trendLabel = customer.trend === 'Naik' ? 'Up' : customer.trend === 'Turun' ? 'Down' : 'Stable';
    const trendStyle = customer.trend === 'Naik' ? styles.trendUp : customer.trend === 'Turun' ? styles.trendDown : styles.trendStable;

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

    // Helper function for status badge
    const getStatusBadge = (status) => {
      switch(status) {
        case 'Closed': return [styles.statusBadge, styles.statusClosed];
        case 'Open': return [styles.statusBadge, styles.statusOpen];
        default: return [styles.statusBadge, styles.statusPending];
      }
    };

    return (
      <Document>
        {/* Cover Page */}
        <Page size="A4" style={styles.coverPage}>
          {/* Full Cover Background */}
          <Image 
            src="/Cover.png" 
            style={styles.coverBackground}
          />
          
          {/* Cover Content */}
          <View style={styles.coverContent}>
            {/* Report Title */}
            <Text style={styles.coverTitle}>TICKET REPORT</Text>
            
            {/* Customer Information */}
            <View style={styles.coverCustomerInfo}>
              <Text style={styles.coverCustomerName}>{customer.name}</Text>
              <Text style={styles.coverCustomerId}>Customer ID: {customer.customerId}</Text>
          </View>
          </View>
        </Page>

        {/* Content Page */}
        <Page size="A4" style={styles.contentPage}>
          {/* Page Header */}
          <Image 
            src="/Header.png" 
            style={styles.pageHeaderImage}
          />

          {/* Summary Metrics Section */}
          <Text style={styles.sectionTitle}>Summary Metrics</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Tickets</Text>
              <Text style={styles.summaryValue}>{customer.allTickets.length}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Closed</Text>
              <Text style={styles.summaryValue}>{closed}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg Handling</Text>
              <Text style={styles.summaryValue}>{avgHandling ? formatDurationDHM(avgHandling) : '-'}</Text>
          </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Risk Trend</Text>
              <Text style={[styles.summaryValue, trendStyle]}>{trendLabel}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Top Issue</Text>
              <Text style={styles.summaryValue}>{topIssue}</Text>
              </View>
          </View>

          {/* Automated Insight Section */}
          <Text style={styles.sectionTitle}>Automated Insight</Text>
          <View style={styles.insightBox}>
            <View style={styles.insightItem}>
              <Text style={[styles.insightLabel, { backgroundColor: '#3b82f6' }]}>Problem</Text>
              <Text style={styles.insightValue}>{insight.masalah || 'No specific pattern identified'}</Text>
          </View>
            
            <View style={styles.insightItem}>
              <Text style={[styles.insightLabel, { backgroundColor: '#f59e0b' }]}>Cause</Text>
              <Text style={styles.insightValue}>{insight.penyebab || 'Analysis pending'}</Text>
            </View>
            
            <View style={styles.insightItem}>
              <Text style={[styles.insightLabel, { backgroundColor: '#10b981' }]}>Category</Text>
              <Text style={styles.insightValue}>{insight.kategori || 'Uncategorized'}</Text>
            </View>
            
            <View style={styles.insightItem}>
              <Text style={[styles.insightLabel, { backgroundColor: '#1e40af' }]}>Solution</Text>
              <Text style={styles.insightValue}>{insight.solusi || 'Standard support protocol'}</Text>
            </View>
            

          </View>

          {/* Ticket History Section */}
          <Text style={styles.sectionTitle}>Ticket History</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCellHeader, { flex: 1.2 }]}>Date</Text>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Description</Text>
              <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Root Cause</Text>
              <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Solution Applied</Text>
              <Text style={[styles.tableCellHeader, { flex: 1 }]}>Duration</Text>
              <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>Status</Text>
            </View>
            
            {sortedTicketKeys.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 6 }]}>No tickets found in this period.</Text>
              </View>
            ) : (
              sortedTicketKeys.slice(0, 1).map((key) => {
                const [yyyy, mm] = key.split('-');
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const monthLabel = `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
                const monthTickets = groups[key].slice().sort((a, b) => Number(new Date(a.openTime)) - Number(new Date(b.openTime)));
                
                return [
                  <View key={key + '-label'} style={styles.monthHeader}>
                    <Text style={styles.monthLabel}>{monthLabel}</Text>
                  </View>,
                  ...monthTickets.map((t, i) => (
                    <View key={t.id || t.openTime || i} style={[styles.tableRow, (i % 2 === 1) && styles.zebra]}>
                      <Text style={[styles.tableCell, { flex: 1.2 }]}>
                        {t.openTime ? new Date(t.openTime).toLocaleDateString('en-GB') + ' ' + new Date(t.openTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 2 }]}>
                        {t.description || 'No description'}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>
                        {t.cause || 'Not specified'}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>
                        {t.handling || 'Standard handling'}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>
                        {t.handlingDuration?.formatted || '-'}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>
                        <Text style={getStatusBadge(t.status)}>{t.status || 'Unknown'}</Text>
                      </Text>
                    </View>
                  ))
                ];
              })
            )}
          </View>

          {/* Page Footer */}
          <Image 
            src="/Footer.png" 
            style={styles.pageFooterImage}
          />
          
          {/* Page Number */}
          <Text style={styles.pageNumber}>Page 2</Text>
        </Page>

        {/* Additional Ticket History Pages - One Month Per Page */}
        {sortedTicketKeys.slice(1).map((key, monthIndex) => {
          const [yyyy, mm] = key.split('-');
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          const monthLabel = `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
          const monthTickets = groups[key].slice().sort((a, b) => Number(new Date(a.openTime)) - Number(new Date(b.openTime)));
          
          return (
            <Page key={`page-${monthIndex + 3}`} size="A4" style={styles.contentPage}>
              {/* Page Header */}
              <Image 
                src="/Header.png" 
                style={styles.pageHeaderImage}
              />
              

              
              <Text style={styles.sectionTitle}>Ticket History</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCellHeader, { flex: 1.2 }]}>Date</Text>
                  <Text style={[styles.tableCellHeader, { flex: 2 }]}>Description</Text>
                  <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Root Cause</Text>
                  <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Solution Applied</Text>
                  <Text style={[styles.tableCellHeader, { flex: 1 }]}>Duration</Text>
                  <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>Status</Text>
                </View>
                
                <View style={styles.monthHeader}>
                  <Text style={styles.monthLabel}>{monthLabel}</Text>
                </View>
                
                {monthTickets.map((t, i) => (
                  <View key={t.id || t.openTime || i} style={[styles.tableRow, (i % 2 === 1) && styles.zebra]}>
                    <Text style={[styles.tableCell, { flex: 1.2 }]}>
                      {t.openTime ? new Date(t.openTime).toLocaleDateString('en-GB') + ' ' + new Date(t.openTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>
                      {t.description || 'No description'}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {t.cause || 'Not specified'}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>
                      {t.handling || 'Standard handling'}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>
                      {t.handlingDuration?.formatted || '-'}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 0.8 }]}>
                      <Text style={getStatusBadge(t.status)}>{t.status || 'Unknown'}</Text>
                    </Text>
                  </View>
                ))}
              </View>
              
              {/* Page Footer */}
              <Image 
                src="/Footer.png" 
                style={styles.pageFooterImage}
              />
              <Text style={styles.pageNumber}>Page {monthIndex + 3}</Text>
            </Page>
          );
        })}
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
                      {chartData.map((_, i) => (
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
    <PageWrapper>

      
      <div className="flex justify-end mb-6">
        <div className="scale-75 transform origin-right">
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
          <div className="rounded-2xl shadow-lg bg-card text-card-foreground  flex flex-col items-center justify-center p-4 min-h-[170px]">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm shadow-sm  transition-all duration-200
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
            <h3 className="text-lg font-semibold text-card-foreground">No Customers Found</h3>
            <p className="text-sm text-gray-500">No customers match the current filter criteria.</p>
      </div>
        )}
      </div>

      {/* Single Dialog for Customer Details */}
      <RadixDialog.Root open={!!openDialogId} onOpenChange={open => setOpenDialogId(open ? openDialogId : null)}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <RadixDialog.Content className="fixed right-0 top-0 h-full w-[99vw] md:w-[90vw] max-w-6xl bg-card text-card-foreground   shadow-2xl z-50 overflow-y-auto transition-all duration-300">
            {selectedCustomer && (
              <>
                {/* Accessibility: Hidden Title and Description */}
                <RadixDialog.Title className="sr-only">
                  Customer Details - {selectedCustomer.name}
                </RadixDialog.Title>
                <RadixDialog.Description className="sr-only">
                  Detailed information about customer {selectedCustomer.name} including ticket history, analytics, and insights.
                </RadixDialog.Description>
                {/* Header */}
                <div className="flex items-center justify-between px-10 pt-8 pb-2 border-b border-blue-100 dark:border-zinc-800">
                  <div className="text-lg font-bold text-card-foreground">{selectedCustomer.name}</div>
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
                <div className="bg-card text-card-foreground  rounded-xl p-6 mb-6 shadow ">
                  <div className="text-lg font-bold mb-2 text-card-foreground">Automated Insight</div>
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
                  <div className="bg-card text-card-foreground   rounded-xl p-5 mb-6 shadow-sm">
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
                  <div className="bg-card text-card-foreground   rounded-xl p-5 mb-6">
                    <div className="text-base font-bold text-blue-900 dark:text-blue-300 mb-3">Ticket History</div>
                      <HistoricalTicketCount customer={selectedCustomer} />
                    </div>
                  </div>
                {/* Ticket History */}
                <div className="px-10 pb-2">
                  <div className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">Ticket History</div>
                  <div className="bg-card text-card-foreground  rounded-xl p-5 shadow  text-base text-blue-900 dark:text-blue-300 min-w-[600px] w-full overflow-x-auto overflow-y-visible">
                      <TicketHistoryTable tickets={selectedCustomer.allTickets} />
                    </div>
                  </div>
                {/* Export Actions */}
                <div className="px-10 pb-8 flex justify-end gap-3">
                  {/* PDF Export */}
                  <PDFDownloadLink 
                    document={<CustomerReportPDF customer={selectedCustomer} insight={generateInsight(selectedCustomer.allTickets)} tickets={selectedCustomer.allTickets} />} 
                    fileName={`CustomerReport-${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`}
                  >
                    {({ loading, error }) => (
                      <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        disabled={loading}
                        onClick={() => {
                          if (error) {
                            console.error('PDF generation error:', error);
                            alert('Error generating PDF. Please try again.');
                          }
                        }}
                      >
                        <FileTextIcon />
                        {loading ? 'Generating PDF...' : 'Download PDF'}
                      </button>
                    )}
                  </PDFDownloadLink>
                  
                  {/* Excel Export */}
                  <button 
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold shadow hover:bg-green-700 transition-all flex items-center gap-2"
                    onClick={async () => {
                      try {
                        const excelData = selectedCustomer.allTickets.map(ticket => ({
                          'Ticket ID': ticket.ticketId || '-',
                          'Customer': selectedCustomer.name,
                          'Customer ID': selectedCustomer.customerId,
                          'Description': ticket.description || '-',
                          'Status': ticket.status || '-',
                          'Open Time': ticket.openTime ? new Date(ticket.openTime).toLocaleString('id-ID') : '-',
                          'Close Time': ticket.closeTime ? new Date(ticket.closeTime).toLocaleString('id-ID') : '-',
                          'Handling Duration': ticket.handlingDuration?.formatted || '-',
                          'Cause': ticket.cause || '-',
                          'Handling': ticket.handling || '-'
                        }));
                        
                        await exportToExcel(excelData, `CustomerReport-${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
                      } catch (error) {
                        console.error('Excel export error:', error);
                        alert('Error exporting Excel. Please try again.');
                      }
                    }}
                  >
                    <TableChartIcon />
                    Export Excel
                  </button>
                  
                  {/* CSV Export */}
                  <button 
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold shadow hover:bg-orange-700 transition-all flex items-center gap-2"
                    onClick={() => {
                      try {
                        const csvData = selectedCustomer.allTickets.map(ticket => ({
                          'Ticket ID': ticket.ticketId || '-',
                          'Customer': selectedCustomer.name,
                          'Customer ID': selectedCustomer.customerId,
                          'Description': ticket.description || '-',
                          'Status': ticket.status || '-',
                          'Open Time': ticket.openTime ? new Date(ticket.openTime).toLocaleString('id-ID') : '-',
                          'Close Time': ticket.closeTime ? new Date(ticket.closeTime).toLocaleString('id-ID') : '-',
                          'Handling Duration': ticket.handlingDuration?.formatted || '-',
                          'Cause': ticket.cause || '-',
                          'Handling': ticket.handling || '-'
                        }));
                        
                        exportToCSV(csvData, `CustomerReport-${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
                      } catch (error) {
                        console.error('CSV export error:', error);
                        alert('Error exporting CSV. Please try again.');
                      }
                    }}
                  >
                    <TextSnippetIcon />
                    Export CSV
                  </button>
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
    </PageWrapper>
  );
};

export default KanbanBoard;