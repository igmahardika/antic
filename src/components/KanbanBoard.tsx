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

  const repClassOptions = [
    { label: 'Total', value: 'Total' },
    { label: 'Normal', value: 'Normal' },
    { label: 'Persisten', value: 'Persisten' },
    { label: 'Kronis', value: 'Kronis' },
    { label: 'Ekstrem', value: 'Ekstrem' },
  ];

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
        {finalSummary.map((item) => {
          const riskInfo = item.key !== 'Total' ? customerRiskLabel[item.key] : null;
          const icon = {
            Normal: <CheckCircleIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />,
            Persisten: <WarningAmberIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />,
            Kronis: <WhatshotIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />,
            Ekstrem: <SecurityIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />,
            Total: <GroupIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />,
          }[item.key];
          const iconBg = {
            Normal: 'bg-green-600/90',
            Persisten: 'bg-yellow-600/90',
            Kronis: 'bg-orange-600/90',
            Ekstrem: 'bg-blue-600/90',
            Total: 'bg-blue-600/90',
          }[item.key] || 'bg-gray-600/90';
          const percent = totalCustomers > 0 ? ((item.count / totalCustomers) * 100).toFixed(1) : '0.0';
          return (
            <div key={item.key} className="relative" onClick={() => setRepClassFilter(item.key)} style={{ cursor: 'pointer' }}>
              {/* Badge risiko */}
              {item.key !== 'Total' && riskInfo && (
                <span className="absolute top-5 right-6 px-4 py-1 rounded-full text-xs font-bold shadow-sm bg-gradient-to-r from-blue-400 to-blue-600 text-white uppercase tracking-wide z-10">{riskInfo.risk}</span>
              )}
              <SummaryCard
                icon={icon}
                label={item.label}
                value={
                  <>
                    <div>{item.count}</div>
                    {item.key !== 'Total' && (
                      <div className="text-base font-semibold text-blue-600 mt-1">{percent}%</div>
                    )}
                  </>
                }
                description={item.key !== 'Total' && riskInfo ? riskInfo.desc : 'Total unique customers in the selected period.'}
                bg="bg-white/60 backdrop-blur-md border border-white/30"
                iconBg={iconBg}
                className={`transition-all duration-300 min-h-[220px] group hover:scale-[1.03] hover:shadow-2xl ${repClassFilter === item.key ? 'ring-2 ring-blue-500' : ''}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex-grow pr-4 -mr-4">
        {filteredCustomers.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
            {filteredCustomers.slice((page - 1) * pageSize, page * pageSize).map((customer) => {
              // ticketsInRange adalah array ITicket pada periode filter
              const ticketsInRange = customer.allTickets || [];
              const countInRange = ticketsInRange.length;
              const insightData = generateInsight(ticketsInRange);
              const closed = ticketsInRange.filter(t => t.status === 'Closed').length;
              const percentClosed = ticketsInRange.length > 0 ? Math.round((closed / ticketsInRange.length) * 100) : 0;
              const isAllClosed = percentClosed === 100;
              const statusIcon = isAllClosed
                ? <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>;
              return (
                <React.Fragment key={customer.id}>
                  <div onClick={() => setOpenDialogId(customer.id)}>
                    <div className="relative bg-gradient-to-br from-white/90 to-blue-50/60 dark:from-zinc-900/90 dark:to-blue-900/10 border-0 rounded-2xl shadow-xl p-7 flex flex-col min-h-[220px] transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl group cursor-pointer" style={{overflow:'hidden'}}>
                      {/* Header: Nama customer dan badge jumlah tiket */}
                      <div className="flex justify-between items-center mb-4 z-10">
                        <div className="flex items-center gap-3 min-w-0">
                          <h3 className="text-xl md:text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100 truncate max-w-[180px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[240px]">{customer.name}</h3>
                        </div>
                        <span className="bg-gradient-to-r from-blue-500 to-blue-400 text-white text-xs font-bold rounded-full px-3 py-1 shadow uppercase tracking-wide">{customer.ticketCount} Tickets</span>
                      </div>
                      {/* Info closed, avg. handling, agent terbanyak */}
                      <div className="flex flex-wrap gap-2 mb-3 z-10 items-center">
                        <span className="flex gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 shadow-sm">
                          <span className="font-bold">Closed:</span> {closed} / {ticketsInRange.length} <span className="ml-1">({percentClosed}%)</span>
                        </span>
                        <span className="flex gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                          <span className="font-bold">Avg. Handling:</span> {customer.totalHandlingDurationFormatted}
                        </span>
                        {/* Agent terbanyak handle */}
                        {(() => {
                          const agentCount: Record<string, number> = {};
                          ticketsInRange.forEach(t => {
                            if (t.openBy) agentCount[t.openBy] = (agentCount[t.openBy] || 0) + 1;
                          });
                          const topAgent = Object.entries(agentCount).sort((a, b) => b[1] - a[1])[0];
                          if (topAgent) {
                            return (
                              <span className="flex gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
                                <span className="font-bold">{topAgent[0]}</span> <span className="ml-1">({topAgent[1]} tickets)</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {/* Badge insight utama */}
                      {insightData.masalah && insightData.masalah !== '-' && (
                        <span className="inline-block bg-rose-50 text-rose-700 rounded-full px-4 py-1 text-sm font-semibold shadow mt-2">
                          {insightData.masalah}
                        </span>
                      )}
                          </div>
        </div>
                  {/* Dialog/Popup detail customer */}
                  <RadixDialog.Root open={openDialogId === customer.id} onOpenChange={open => setOpenDialogId(open ? customer.id : null)}>
                    <RadixDialog.Portal>
                      <RadixDialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
                      <RadixDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[1600px] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-0 focus:outline-none overflow-auto max-h-[90vh]">
                        <RadixDialog.Title asChild>
                          <VisuallyHidden>{customer.name} - Customer Details</VisuallyHidden>
                        </RadixDialog.Title>
                        <RadixDialog.Description asChild>
                          <VisuallyHidden>Shows detailed ticket history, insights, and statistics for the selected customer.</VisuallyHidden>
                        </RadixDialog.Description>
                        <div className="flex flex-col md:flex-row gap-6 p-8">
                          {/* Left: Insight & Stats */}
                          <div className="w-full md:w-1/3 flex flex-col gap-6">
                            {/* Header */}
                            <div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{customer.name}</div>
                              <div className="text-gray-500 text-sm mb-2">Showing ticket details and analysis for this customer.</div>
                              <div className="text-xs text-gray-400">Customer ID: <b>{customer.customerId}</b></div>
                          </div>
                            {/* Automated Insight */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl shadow p-4">
                              <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-200 font-semibold">
                                <Info className="w-5 h-5" /> Automated Insight
                          </div>
                              {/* Main Issue, Root Cause, Solution, Narasi */}
                              <div className="text-sm text-blue-900 dark:text-blue-100 mb-1"><b>Main Issue:</b> {insightData.masalah}</div>
                              <div className="text-sm text-blue-900 dark:text-blue-100 mb-1"><b>Root Cause:</b> {insightData.penyebab}</div>
                              <div className="text-sm text-blue-900 dark:text-blue-100 mb-1"><b>Effective Solution:</b> {insightData.solusi}</div>
                              <div className="text-xs text-blue-700 dark:text-blue-200 mt-2">{insightData.rekomendasi}</div>
                        </div>
                            {/* Historical Ticket Count */}
                            <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow p-4">
                              <div className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Historical Ticket Count</div>
                              <div className="flex flex-col gap-1 text-sm">
                                <HistoricalTicketCount customer={customer} />
                              </div>
                        </div>
                      </div>
                          {/* Right: Ticket History Table */}
                          <div className="w-full md:w-2/3">
                            <div className="font-bold text-lg mb-3">Ticket History (Periode)</div>
                            <TicketHistoryTable tickets={customer.allTickets} />
                          </div>
                      </div>
                        <RadixDialog.Close asChild>
                          <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white text-2xl font-bold">&times;</button>
                        </RadixDialog.Close>
                      </RadixDialog.Content>
                    </RadixDialog.Portal>
                  </RadixDialog.Root>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No customers match the selected filter.</p>
      </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
          >
            Previous
          </button>
        <span className="text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;