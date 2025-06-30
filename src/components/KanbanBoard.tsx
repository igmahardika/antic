import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketIcon } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { ITicket } from '@/lib/db';
import { formatDateTime, formatDurationDHM, formatDateTimeDDMMYYYY } from '@/lib/utils';
import { format } from 'date-fns';

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
const KanbanBoard = ({ data, cutoffStart, cutoffEnd }: KanbanBoardProps) => {
  // --- All state and ref hooks must be at the top ---
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [repClassFilter, setRepClassFilter] = useState<string>('Total');
  const [openClassDialog, setOpenClassDialog] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');

  // --- All derived state and memoized calculations after state hooks ---
  const processedData = useMemo(() => {
    if (!data) {
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

    data.forEach(customer => {
      const customerClass = customer.repClass || 'Normal';
      if (summaryMap[customerClass]) {
        summaryMap[customerClass].count++;
      }
    });

    return { 
      repClassSummary: Object.values(summaryMap),
      totalCustomers: data.length,
    };
  }, [data]);

  const { repClassSummary, totalCustomers } = processedData;

  const filteredCustomers = useMemo(() => {
     if (!data) return [];
     let filtered = data;
     if (repClassFilter && repClassFilter !== 'Total') {
       filtered = data.filter(c => c.repClass === repClassFilter);
     }
     
     return filtered.slice().sort((a, b) => {
       const aTickets = a.ticketCount || 0;
       const bTickets = b.ticketCount || 0;
       return bTickets - aTickets;
     });
   }, [data, repClassFilter]);
  
  const customerHistory = useMemo(() => {
    if (!data) return {};
    const isInCutoffRange = (openTime: string | null | undefined): boolean => {
      if (!openTime) return false;
      const d = new Date(openTime);
      return d >= cutoffStart && d <= cutoffEnd;
    }
    const history: Record<string, ITicket[]> = {};
    data.forEach(customer => {
      const key = customer.customerId || 'Unknown';
      history[key] = (customer.allTickets || []).filter(t => isInCutoffRange(t.openTime));
    });
    return history;
  }, [data, cutoffStart, cutoffEnd]);

  const customerInsight = useMemo(() => {
    if (!data) return {};
    const isInCutoffRange = (openTime: string | null | undefined): boolean => {
      if (!openTime) return false;
      const d = new Date(openTime);
      return d >= cutoffStart && d <= cutoffEnd;
    }
    const insights: Record<string, { masalah: string; penyebab: string; solusi: string; rekomendasi: string; }> = {};
    data.forEach(customer => {
      const key = customer.customerId || 'Unknown';
      const ticketsInPeriod = (customer.allTickets || []).filter(t => isInCutoffRange(t.openTime));
      insights[key] = generateInsight(ticketsInPeriod);
    });
    return insights;
  }, [data, cutoffStart, cutoffEnd]);

  // --- Early return check after all hooks have been called ---
  if (!data || data.length === 0) {
  return (
      <div className="flex items-center justify-center h-full text-gray-500">
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

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
        {finalSummary.map((item) => {
          const riskInfo = item.key !== 'Total' ? customerRiskLabel[item.key] : null;
          const accentColor = {
            Normal: '#22c55e',
            Persisten: '#fbbf24',
            Kronis: '#f97316',
            Ekstrem: '#5271ff',
            Total: '#3b82f6',
          }[item.key] || '#e5e7eb';
          const badgeColor = {
            Normal: 'bg-green-100 text-green-700',
            Persisten: 'bg-yellow-100 text-yellow-800',
            Kronis: 'bg-orange-100 text-orange-800',
            Ekstrem: 'bg-blue-100 text-blue-800',
            Total: 'bg-blue-50 text-blue-700',
          }[item.key] || 'bg-gray-100 text-gray-800';
          const icon = {
            Normal: <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
            Persisten: <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>,
            Kronis: <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>,
            Ekstrem: <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-1.414 1.414A9 9 0 105.636 18.364l1.414-1.414" /></svg>,
            Total: <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>,
          }[item.key];
          const percent = totalCustomers > 0 ? ((item.count / totalCustomers) * 100).toFixed(1) : '0.0';
          return (
            <div
              key={item.key}
              onClick={() => setRepClassFilter(item.key)}
              className={`relative cursor-pointer transition-all duration-300 flex flex-col justify-between bg-white/90 dark:bg-zinc-900/90 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-lg p-8 min-h-[200px] group hover:scale-[1.025] hover:shadow-2xl ${repClassFilter === item.key ? 'ring-2 ring-blue-500' : ''}`}
              style={{overflow:'hidden'}}
            >
              {/* Badge risiko */}
              {item.key !== 'Total' && riskInfo && (
                <span className={`absolute top-5 right-6 px-4 py-1 rounded-full text-sm font-bold shadow-sm bg-gradient-to-r from-blue-400 to-blue-600 text-white`}>{riskInfo.risk}</span>
              )}
              {/* Ikon risiko dan label */}
              <div className="flex items-center gap-3 mb-3 z-10">
                {icon}
                <span className="text-xl font-bold text-gray-900 dark:text-white">{item.label}</span>
              </div>
              {/* Angka besar */}
              <div className="flex items-center gap-2 mb-2 z-10">
                <span className="text-5xl font-extrabold text-gray-900 dark:text-white">{item.count}</span>
                {item.key !== 'Total' && <span className="text-base text-gray-500 font-medium">({percent}% of total)</span>}
              </div>
              {/* Progress bar */}
              {item.key !== 'Total' && (
                <div className="w-full h-3 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div style={{width: `${percent}%`, background: accentColor, opacity: 0.7}} className="h-full rounded-full transition-all duration-300" />
                </div>
              )}
              {/* Deskripsi singkat */}
              {item.key !== 'Total' && riskInfo && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 z-10">
                  {riskInfo.desc}
                </div>
              )}
              {item.key === 'Total' && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 z-10">Total unique customers in the selected period.</div>
              )}
            </div>
          );
        })}
      </div>

      <ScrollArea className="flex-grow pr-4 -mr-4">
        {filteredCustomers.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCustomers.slice((page - 1) * pageSize, page * pageSize).map((customer) => {
              const key = customer.customerId || 'Unknown';
              const ticketsInRange = customerHistory[key] || [];
              const countInRange = ticketsInRange.length;
              const insightData = customerInsight[key] || { masalah: '-', penyebab: '-', solusi: '-', rekomendasi: '-' };
              const closed = ticketsInRange.filter(t => t.status === 'Closed').length;
              const percentClosed = ticketsInRange.length > 0 ? Math.round((closed / ticketsInRange.length) * 100) : 0;
              const isAllClosed = percentClosed === 100;
              const statusIcon = isAllClosed
                ? <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>;
              return (
                <Dialog key={customer.id} open={openDialogId === customer.id} onOpenChange={open => setOpenDialogId(open ? customer.id : null)}>
            <DialogTrigger asChild>
                    <div className="relative bg-white/90 dark:bg-zinc-900/90 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-lg p-7 flex flex-col min-h-[200px] transition-all duration-300 hover:scale-[1.025] hover:shadow-2xl group cursor-pointer" style={{overflow:'hidden'}}>
                      {/* Header: Nama customer dan badge jumlah tiket */}
                      <div className="flex justify-between items-center mb-4 z-10">
                        <div className="flex items-center gap-3 min-w-0">
                          {statusIcon}
                          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-200 truncate max-w-[180px] sm:max-w-[160px] md:max-w-[200px] lg:max-w-[240px]">{customer.name}</h3>
                        </div>
                        <span className="bg-gradient-to-r from-blue-500 to-blue-400 text-white text-sm font-bold rounded-full px-4 py-1 shadow">{customer.ticketCount} Tickets</span>
                      </div>
                      {/* Info closed, avg. handling, agent terbanyak */}
                      <div className="flex flex-wrap gap-3 mb-3 z-10 items-center">
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 shadow-sm">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Closed: {closed} of {ticketsInRange.length} ({percentClosed}%)
                        </span>
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
                          Avg. Handling: {customer.totalHandlingDurationFormatted}
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
                              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 014-4h0a4 4 0 014 4v2" /></svg>
                                {topAgent[0]} <span className="ml-1">({topAgent[1]} tickets)</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      {/* Badge insight utama */}
                      <div className="mt-auto">
                        <span className="bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200 rounded-full px-4 py-1 text-base font-medium shadow">{insightData.masalah}</span>
                          </div>
        </div>
            </DialogTrigger>
                  <DialogContent className="w-full max-w-[110rem] mx-auto px-4 sm:px-8 py-6 h-[90vh] flex flex-col">
                <DialogHeader>
                      <DialogTitle className="text-3xl font-extrabold text-blue-900 dark:text-blue-200 mb-1">{customer.name}</DialogTitle>
                      <DialogDescription className="mb-2 text-base text-gray-500 dark:text-gray-300">
                    Showing ticket details and analysis for this customer.
                  </DialogDescription>
                      <p className="text-sm text-gray-400 mb-2">Customer ID: {customer.customerId}</p>
                </DialogHeader>
                    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 flex-grow min-h-0">
                      {/* Left Column: Insights & Stats */}
                      <div className="md:col-span-1 flex flex-col gap-6">
                        {/* Insight Box */}
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-400 dark:border-blue-700 rounded-xl p-6 shadow-sm flex flex-col gap-2">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01" /></svg>
                            <h3 className="font-bold text-blue-800 dark:text-blue-200 text-lg">Automated Insight</h3>
                          </div>
                          <div className="text-sm space-y-2">
                            <div className="flex items-center gap-2"><span className="font-semibold text-blue-700">Main Issue:</span> <span>{insightData.masalah}</span></div>
                            <div className="flex items-center gap-2"><span className="font-semibold text-blue-700">Root Cause:</span> <span>{insightData.penyebab}</span></div>
                            <div className="flex items-center gap-2"><span className="font-semibold text-blue-700">Effective Solution:</span> <span>{insightData.solusi}</span></div>
                            <p className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700 text-xs text-gray-700 dark:text-gray-200">{insightData.rekomendasi}</p>
                          </div>
                        </div>
                        {/* Statistik Box */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-xl p-6 shadow-sm flex flex-col gap-2">
                          <div className="flex items-center gap-2 mb-1">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h4v4" /></svg>
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-base">Historical Ticket Count</h3>
                          </div>
                    {(() => {
                            // Ambil range filter dari props
                            const filterStart = cutoffStart;
                            const filterEnd = cutoffEnd;
                            // Ambil semua tiket dalam filter
                            const ticketsInFilter = customer.fullTicketHistory.filter(t => {
                              const d = new Date(t.openTime);
                              return d >= filterStart && d <= filterEnd;
                            });
                            // Bulan terakhir dalam filter
                            const lastMonth = filterEnd.getMonth();
                            const lastYear = filterEnd.getFullYear();
                            // Tiket pada bulan terakhir filter
                            const count1M = ticketsInFilter.filter(t => {
                              const d = new Date(t.openTime);
                              return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
                            }).length;
                            // Tiket akumulasi 3 bulan terakhir dalam filter
                            const threeMonthsAgo = new Date(filterEnd);
                            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2); // 2 bulan ke belakang + bulan ini = 3 bulan
                            const count3M = ticketsInFilter.filter(t => {
                              const d = new Date(t.openTime);
                              return d >= threeMonthsAgo && d <= filterEnd;
                            }).length;
                            // Tiket akumulasi 6 bulan terakhir dalam filter
                            const sixMonthsAgo = new Date(filterEnd);
                            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); // 5 bulan ke belakang + bulan ini = 6 bulan
                            const count6M = ticketsInFilter.filter(t => {
                              const d = new Date(t.openTime);
                              return d >= sixMonthsAgo && d <= filterEnd;
                            }).length;
                            // Hitung tiket per bulan dalam filter
                            const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                            const monthCounts: Record<string, number> = {};
                            let iter = new Date(filterStart.getFullYear(), filterStart.getMonth(), 1);
                            const endIter = new Date(filterEnd.getFullYear(), filterEnd.getMonth(), 1);
                            while (iter <= endIter) {
                              const y = iter.getFullYear();
                              const m = iter.getMonth();
                              const key = `${y}-${m}`;
                              monthCounts[key] = ticketsInFilter.filter(t => {
                                const d = new Date(t.openTime);
                                return d.getFullYear() === y && d.getMonth() === m;
                              }).length;
                              iter.setMonth(iter.getMonth() + 1);
                            }
                            return (
                              <div className="text-sm space-y-2 mt-2">
                                <div className="flex justify-between"><span>Bulan Terakhir:</span><span className="font-bold">{count1M} tickets</span></div>
                                <div className="flex justify-between"><span>Akumulasi 3 Bulan:</span><span className="font-bold">{count3M} tickets</span></div>
                                <div className="flex justify-between"><span>Akumulasi 6 Bulan:</span><span className="font-bold">{count6M} tickets</span></div>
                                <div className="mt-4">
                                  <div className="font-semibold mb-1">Rincian per Bulan:</div>
                                  <ul className="space-y-1">
                                    {Object.entries(monthCounts).map(([key, count]) => {
                                      const [y, m] = key.split('-');
                                      return (
                                        <li key={key} className="flex justify-between">
                                          <span>{monthNames[parseInt(m)]} {y}:</span>
                                          <span className="font-bold">{count} tickets</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      {/* Right Column: Ticket History */}
                      <div className="md:col-span-2 flex flex-col min-h-0">
                        <h3 className="font-bold text-xl text-blue-900 dark:text-blue-200 mb-3">Ticket History (Periode)</h3>
                        <ScrollArea className="flex-grow border rounded-xl bg-white dark:bg-zinc-900">
                          <div className="p-4">
                    {(() => {
                                const groupedByMonth = ticketsInRange.reduce((acc, ticket) => {
                                  const monthKey = format(new Date(ticket.openTime), 'yyyy-MM');
                                  if (!acc[monthKey]) acc[monthKey] = [];
                                  acc[monthKey].push(ticket);
                                  return acc;
                                }, {} as Record<string, ITicket[]>);
                                const sortedMonths = Object.keys(groupedByMonth).sort();
                                return sortedMonths.map(monthKey => (
                                <div key={monthKey} className="mb-8 last:mb-0">
                                  <h4 className="text-base font-bold text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-t-lg -mx-4 -mt-4 mb-2 sticky top-0 shadow-sm border-b border-blue-100 dark:border-blue-800">
                                      {format(new Date(monthKey), 'MMMM yyyy')}
                                    </h4>
                                  <table className="min-w-full text-sm" style={{tableLayout:'fixed', width:'100%'}}>
                                    <colgroup>
                                      <col style={{width:'120px'}} /> {/* Open Date */}
                                      <col style={{width:'28%'}} />    {/* Description */}
                                      <col style={{width:'18%'}} />    {/* Root Cause */}
                                      <col style={{width:'18%'}} />    {/* Handling */}
                                      <col style={{width:'110px'}} />  {/* Handling Duration */}
                                      <col style={{width:'90px'}} />   {/* Status */}
                                    </colgroup>
                                    <thead className="bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200">
                              <tr>
                                        <th className="py-2 px-3 text-left font-bold">Open Date</th>
                                        <th className="py-2 px-3 text-left font-bold">Description</th>
                                        <th className="py-2 px-3 text-left font-bold">Root Cause</th>
                                        <th className="py-2 px-3 text-left font-bold">Handling</th>
                                        <th className="py-2 px-3 text-left font-bold">Handling Duration</th>
                                        <th className="py-2 px-3 text-left font-bold">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {groupedByMonth[monthKey].map(ticket => (
                                          <tr key={ticket.id}>
                                          <td className="py-2 px-3 whitespace-nowrap">{formatDateTimeDDMMYYYY(ticket.openTime)}</td>
                                          <td className="py-2 px-3 whitespace-normal break-words">{ticket.description}</td>
                                          <td className="py-2 px-3 whitespace-normal break-words">{ticket.cause || '-'}</td>
                                          <td className="py-2 px-3 whitespace-normal break-words">{ticket.handling || '-'}</td>
                                          <td className="py-2 px-3 whitespace-nowrap">{ticket.handlingDuration.formatted}</td>
                                          <td className="py-2 px-3">
                                            <span className="bg-[#5271ff] text-white text-xs font-bold rounded-full px-3 py-0.5 shadow">{ticket.status}</span>
                                          </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                                ));
                            })()}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No customers match the selected filter.</p>
      </div>
        )}
      </ScrollArea>

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
    </>
  );
};

export default KanbanBoard;