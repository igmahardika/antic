import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketIcon } from 'lucide-react';
import { ITicket } from '@/lib/db';
import { formatDateTime, formatDurationDHM, formatDateTimeDDMMYYYY } from '@/lib/utils';
import { format } from 'date-fns';
import { useAnalytics } from './AnalyticsContext';
import SummaryCard from './ui/SummaryCard';
import { CheckCircle, AlertTriangle, Flame, ShieldAlert, Users as UsersIcon, Info } from 'lucide-react';
import TimeFilter from './TimeFilter';
import * as RadixDialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import SecurityIcon from '@mui/icons-material/Security';
import { Users, UserCheck } from 'lucide-react';

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
const KanbanBoard = (props: Partial<KanbanBoardProps>) => {
  const { allTickets, cutoffStart, cutoffEnd } = useAnalytics();
  // --- All state and ref hooks must be at the top ---
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [repClassFilter, setRepClassFilter] = useState<string>('Total');
  const [openClassDialog, setOpenClassDialog] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const [startMonth, setStartMonth] = useState<string | null>(null);
  const [endMonth, setEndMonth] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

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
      // Show all years' data for selected months, or all data if months are not selected
      return allTickets.filter(t => {
        if (!t.openTime) return false;
        if (!startMonth || !endMonth) return true;
        const d = new Date(t.openTime);
        const mStart = Number(startMonth) - 1;
        const mEnd = Number(endMonth) - 1;
        // Check if month is in range (ignore year)
        return d.getMonth() >= mStart && d.getMonth() <= mEnd;
      });
    }
    const y = Number(selectedYear);
    const mStart = Number(startMonth) - 1;
    const mEnd = Number(endMonth) - 1;
    const cutoffStart = new Date(y, mStart, 1, 0, 0, 0, 0);
    const cutoffEnd = new Date(y, mEnd + 1, 0, 23, 59, 59, 999);
    const filtered = allTickets.filter(t => {
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      return d >= cutoffStart && d <= cutoffEnd;
    });
    // LOGGING: Show filter period and ticket/customer counts
    const uniqueCustomers = new Set(filtered.map(t => t.customerId || 'Unknown'));
    console.log('[KanbanBoard] Filter:', {
      cutoffStart,
      cutoffEnd,
      filteredTickets: filtered.length,
      uniqueCustomers: uniqueCustomers.size,
      filterRange: `${cutoffStart.toISOString()} - ${cutoffEnd.toISOString()}`
    });
    return filtered;
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
      };
    });
  }, [filteredTickets, allTickets]);

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

  const customerRiskLabel: Record<string, { risk: string, color: string, desc: string }> = {
    Normal: { risk: 'Normal Risk', color: 'text-green-700', desc: 'Customer dengan jumlah komplain < 3 dalam periode. Risiko sangat rendah.' },
    Persisten: { risk: 'Medium Risk', color: 'text-yellow-700', desc: 'Customer dengan 3–9 komplain dalam periode. Risiko sedang, perlu perhatian.' },
    Kronis: { risk: 'High Risk', color: 'text-red-700', desc: 'Customer dengan 10–18 komplain dalam periode. Risiko tinggi, perlu intervensi.' },
    Ekstrem: { risk: 'Extreme Risk', color: 'text-blue-700', desc: 'Customer dengan >18 komplain dalam periode. Risiko sangat tinggi, perlu tindakan khusus.' },
  };

  function top(items: string[]) {
    if (!items || items.length === 0) return '-';
    const counts: Record<string, number> = {};
    items.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  function generateInsight(tickets: ITicket[]) {
    if (!tickets || tickets.length === 0) return { masalah: '-', penyebab: '-', solusi: '-', rekomendasi: 'Data tidak cukup untuk insight.' };
    const analysis = {
      description: tickets.map(t => t.description).filter(Boolean) as string[],
      cause: tickets.map(t => t.cause).filter(Boolean) as string[],
      handling: tickets.map(t => t.handling).filter(Boolean) as string[],
    };
    const masalah = top(analysis.description);
    const penyebab = top(analysis.cause);
    const solusi = top(analysis.handling);
    let rekomendasi = '';
    if (masalah !== '-' && penyebab !== '-' && solusi !== '-') {
      rekomendasi = `Pelanggan ini paling sering mengalami masalah ${masalah}, yang umumnya dipicu oleh ${penyebab}. Solusi yang terbukti efektif adalah ${solusi}. Disarankan untuk memperkuat edukasi dan SOP terkait ${solusi}, serta meningkatkan kemampuan deteksi dini pada ${penyebab}, agar penanganan masalah ${masalah} dapat dilakukan lebih cepat dan efisien.`;
    } else {
      rekomendasi = 'Perbanyak data agar insight lebih akurat.';
    }
    return { masalah, penyebab, solusi, rekomendasi };
  }

  const totalSummary = {
    key: 'Total',
    label: 'Total Customers',
    color: 'bg-gray-100 text-gray-800',
    count: totalCustomers,
  };

  const finalSummary = [totalSummary, ...repClassSummary];

  // Tambahkan helper untuk historical count dan komponen tabel
  function getHistoricalCount(customer, months) {
    // Ambil semua tiket customer dari allTickets (bukan hanya periode filter)
    if (!customer || !customer.customerId) return 0;
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1, 0, 0, 0, 0);
    // Cari semua tiket customer di allTickets
    const tickets = customer.fullTicketHistory || customer.allTickets || [];
    return tickets.filter(t => {
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      return d >= cutoff && d <= now;
    }).length;
  }

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
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === 'Closed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
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
    const { startMonth, endMonth, selectedYear } = useAnalytics();
    if (!startMonth || !endMonth || !selectedYear) return null;
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
    // Render
    return (
      <>
        {months.map((m, i) => (
          <div key={m.label}>{m.label}: <b>{ticketsPerMonth[i].length}</b> tickets</div>
        ))}
        <div className="mt-2">Bulan pertama: <b>{firstMonthCount}</b> tickets</div>
        <div>3 bulan pertama: <b>{first3MonthsCount}</b> tickets</div>
        <div>6 bulan: <b>{all6MonthsCount}</b> tickets</div>
      </>
    );
  }

  function avgDuration(arr) {
    if (!arr.length) return '-';
    const totalSeconds = arr.reduce((acc, t) => acc + Number(t.handlingDuration?.rawSeconds || 0), 0);
    const arrLen = Number(arr.length);
    const avgSeconds = Number(totalSeconds) / arrLen;
    const flooredNum = Number.isFinite(avgSeconds) ? Math.trunc(Number(avgSeconds)) : 0;
    const flooredNumNum = Number(flooredNum);
    const hours = Math.trunc(Number(flooredNumNum) / Number(3600));
    const minutes = Math.trunc((Number(flooredNumNum) % Number(3600)) / Number(60));
    const seconds = Math.trunc(Number(flooredNumNum) % Number(60));
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
    const topAgent = Object.entries(agentCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    // Top issue
    const issueCount = {};
    tickets.forEach(t => { if (t.description) issueCount[t.description] = (issueCount[t.description] || 0) + 1; });
    const topIssue = Object.entries(issueCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    return (
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 flex flex-col min-h-[200px] transition-all duration-300 min-w-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400"
        onClick={() => setOpenDialogId(customer.id)}
      >
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 min-w-12 min-h-12 rounded-xl flex items-center justify-center bg-blue-100">
            <Users className="text-blue-500" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 break-words whitespace-normal">{customer.name}</h3>
          </div>
          <span className="bg-blue-500 text-white text-xs font-bold rounded-lg px-3 py-1 ml-2">{tickets.length} TICKETS</span>
        </div>
        <div className="flex gap-4 mb-2">
          <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-xs font-semibold">
            Closed: {closed} / {tickets.length} ({percentClosed}%)
          </span>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 text-xs font-semibold">
            Avg. Handling: {avgHandling}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
          <UserCheck size={16} className="text-blue-400" /> Top Agent: {topAgent}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <AlertTriangle size={14} className="text-yellow-400" /> Top Issue: {topIssue}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Title & Description */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Customer Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">Analisis customer berdasarkan jumlah dan risiko komplain dalam periode terpilih.</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
        {finalSummary.map((item) => {
          const riskInfo = item.key !== 'Total' ? customerRiskLabel[item.key] : null;
          const icon = {
            Normal: <CheckCircleIcon className="w-7 h-7 text-white" />,
            Persisten: <WarningAmberIcon className="w-7 h-7 text-white" />,
            Kronis: <WhatshotIcon className="w-7 h-7 text-white" />,
            Ekstrem: <SecurityIcon className="w-7 h-7 text-white" />,
            Total: <GroupIcon className="w-7 h-7 text-white" />,
          }[item.key];
          const iconBg = {
            Normal: 'bg-green-500',
            Persisten: 'bg-yellow-500',
            Kronis: 'bg-orange-500',
            Ekstrem: 'bg-red-500',
            Total: 'bg-blue-500',
          }[item.key] || 'bg-gray-500';
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
              description={item.key !== 'Total' && riskInfo ? riskInfo.desc : 'Total unique customers in the selected period.'}
              iconBg={riskColors[item.key]?.iconBg || 'bg-gray-500'}
              badgeColor={riskColors[item.key]?.badge || 'bg-blue-600'}
              badge={item.key !== 'Total' ? riskInfo?.risk : undefined}
              className={`cursor-pointer transition-all duration-300 ${repClassFilter === item.key ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
              onClick={() => setRepClassFilter(item.key)}
              active={repClassFilter === item.key}
            />
          );
        })}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
            {filteredCustomers.slice((page - 1) * pageSize, page * pageSize).map((customer) => {
              const ticketsInRange = customer.allTickets || [];
              return (
                <CustomerCard key={customer.id} customer={customer} tickets={ticketsInRange} />
              );
            })}
          </div>
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
          <RadixDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[98vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-0 focus:outline-none overflow-auto max-h-[95vh] border border-blue-200 dark:border-blue-300">
            {selectedCustomer && (
              <>
                <RadixDialog.Title className="text-3xl font-extrabold p-10 pb-2 text-blue-900 dark:text-blue-300 tracking-tight border-b border-blue-100 dark:border-zinc-700">
                  {selectedCustomer.name}
                </RadixDialog.Title>
                <div className="px-10 pt-4 pb-10">
                  <div className="mb-6 text-lg text-blue-900 dark:text-blue-200 font-medium">
                    Customer ID: <span className="font-mono text-blue-700 dark:text-blue-300">{selectedCustomer.customerId}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                      <div className="mb-10">
                        <div className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-3">Automated Insight</div>
                        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow border border-blue-100 dark:border-zinc-700 text-base text-blue-900 dark:text-blue-100 space-y-2 divide-y divide-blue-50 dark:divide-zinc-800">
                          <div className="pb-2"><span className="font-semibold">Main Issue:</span> {generateInsight(selectedCustomer.allTickets).masalah}</div>
                          <div className="py-2"><span className="font-semibold">Root Cause:</span> {generateInsight(selectedCustomer.allTickets).penyebab}</div>
                          <div className="pt-2"><span className="font-semibold text-green-700 dark:text-green-400">Solution:</span> {generateInsight(selectedCustomer.allTickets).solusi}</div>
                        </div>
                      </div>
                      <div className="mb-10">
                        <div className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-3">Historical Count</div>
                        <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow border border-blue-100 dark:border-zinc-700 text-base text-blue-900 dark:text-blue-100">
                          <HistoricalTicketCount customer={selectedCustomer} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-3">Ticket History</div>
                      <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow border border-blue-100 dark:border-zinc-700 text-base text-blue-900 dark:text-blue-100 max-h-[500px] overflow-x-auto overflow-y-auto min-w-[900px] w-full">
                        <TicketHistoryTable tickets={selectedCustomer.allTickets} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-12 flex flex-wrap gap-12 border-t border-blue-100 dark:border-zinc-700 pt-8">
                    <div className="text-lg font-semibold text-blue-900 dark:text-blue-200"><span className="font-bold">Top Issue:</span> {(() => {
                      const agentCount = {};
                      selectedCustomer.allTickets.forEach(t => { if (t.description) agentCount[t.description] = (agentCount[t.description] || 0) + 1; });
                      return Object.entries(agentCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                    })()}</div>
                    <div className="text-lg font-semibold text-blue-900 dark:text-blue-200"><span className="font-bold">Top Agent:</span> {(() => {
                      const agentCount = {};
                      selectedCustomer.allTickets.forEach(t => { if (t.openBy) agentCount[t.openBy] = (agentCount[t.openBy] || 0) + 1; });
                      return Object.entries(agentCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                    })()}</div>
                    <div className="text-lg font-semibold text-blue-900 dark:text-blue-200"><span className="font-bold">Analysis:</span> {selectedCustomer.analysis?.conclusion || '-'}</div>
                  </div>
                </div>
                <RadixDialog.Close asChild>
                  <button className="absolute top-8 right-8 text-blue-700 dark:text-blue-300 hover:text-red-500 text-4xl font-extrabold focus:outline-none transition-colors duration-150" aria-label="Close customer detail">&times;</button>
                </RadixDialog.Close>
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