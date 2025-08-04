import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ITicket } from '@/lib/db';
import { formatDurationDHM, analyzeKeywords, generateAnalysisConclusion } from '@/lib/utils';

const TicketAnalyticsContext = createContext(null);

export function useTicketAnalytics() {
  return useContext(TicketAnalyticsContext);
}

export const TicketAnalyticsProvider = ({ children }) => {
  // State filter waktu khusus ticket
  const [startMonth, setStartMonth] = useState(null);
  const [endMonth, setEndMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Data dari IndexedDB
  const allTickets = useLiveQuery(() => db.tickets.toArray(), [refreshTrigger]);
  useEffect(() => {
    console.log('[DEBUG] allTickets from IndexedDB (Ticket):', allTickets);
  }, [allTickets]);

  // Set default filter waktu otomatis jika belum dipilih dan data tersedia
  useEffect(() => {
    if (allTickets && allTickets.length > 0 && (!startMonth || !endMonth || !selectedYear)) {
      const dates = allTickets.map(t => t.openTime).filter(Boolean).map(d => new Date(d));
      if (dates.length > 0) {
        const latest = new Date(Math.max(...dates.map(d => d.getTime())));
        const month = String(latest.getMonth() + 1).padStart(2, '0');
        const year = String(latest.getFullYear());
        setStartMonth(month);
        setEndMonth(month);
        setSelectedYear(year);
      }
    }
  }, [allTickets, startMonth, endMonth, selectedYear]);

  // Ambil semua bulan & tahun unik
  const allMonthsInData = useMemo(() => {
    if (!allTickets) return [];
    const monthSet = new Set();
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
      const [ma, ya] = (String(a)).split('/');
      const [mb, yb] = (String(b)).split('/');
      return new Date(`${ya}-${ma}-01`).getTime() - new Date(`${yb}-${mb}-01`).getTime();
    });
  }, [allTickets]);

  const allYearsInData = useMemo(() => {
    if (!allTickets) return [];
    const yearSet = new Set();
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

  // Filter waktu
  const { cutoffStart, cutoffEnd } = useMemo(() => {
    if (!startMonth || !endMonth || !selectedYear) return { cutoffStart: null, cutoffEnd: null };
    const y = Number(selectedYear);
    const mStart = Number(startMonth) - 1;
    const mEnd = Number(endMonth) - 1;
    const cutoffStart = new Date(y, mStart, 1, 0, 0, 0, 0);
    const cutoffEnd = new Date(y, mEnd + 1, 0, 23, 59, 59, 999);
    return { cutoffStart, cutoffEnd };
  }, [startMonth, endMonth, selectedYear]);

  // Filter tiket sesuai waktu
  const filteredTickets = useMemo(() => {
    if (!allTickets) return [];
    if (selectedYear === 'ALL') return allTickets;
    if (!cutoffStart || !cutoffEnd) return allTickets;
    return allTickets.filter(t => {
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return false;
      return d >= cutoffStart && d <= cutoffEnd;
    });
  }, [allTickets, cutoffStart, cutoffEnd, selectedYear]);

  // --- Ticket Analytics ---
  const gridData = filteredTickets;
  const totalTickets = gridData.length;
  const totalDuration = Array.isArray(gridData) ? gridData.map(t => Number(t.duration?.rawHours || 0)).filter(v => !isNaN(v)).reduce((acc, curr) => acc + curr, 0) : 0;
  
  // Menentukan tiket closed berdasarkan status 'CLOSE TICKET'
  const closedTickets = gridData.filter((t) => {
    const status = (t.status || '').trim().toLowerCase();
    return status === 'closed' || status === 'close ticket';
  }).length;
  
  // Menentukan tiket open berdasarkan kriteria:
  // 1. Status adalah 'OPEN TICKET' ATAU
  // 2. Waktu Close Ticket kosong ATAU
  // 3. Waktu Close Ticket di bulan berikutnya dari bulan Open
  const openTicketsArray = gridData.filter(t => {
    const status = (t.status || '').trim().toLowerCase();
    
    // Jika status adalah 'OPEN TICKET', ini adalah tiket open
    if (status === 'open ticket') return true;
    
    // Jika status closed, bukan tiket open
    if (status === 'closed' || status === 'close ticket') return false;
    
    // Jika tidak ada closeTime, termasuk tiket open
    if (!t.closeTime) return true;
    
    // Cek apakah closeTime di bulan berikutnya dari openTime
    const openDate = new Date(t.openTime);
    const closeDate = new Date(t.closeTime);
    
    if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) return true;
    
    // Bandingkan bulan dan tahun
    const openMonth = openDate.getMonth();
    const openYear = openDate.getFullYear();
    const closeMonth = closeDate.getMonth();
    const closeYear = closeDate.getFullYear();
    
    // Jika tahun closeTime lebih besar, atau tahun sama tapi bulan lebih besar
    if (closeYear > openYear || (closeYear === openYear && closeMonth > openMonth)) {
      return true;
    }
    
    return false;
  });
  
  const openTickets = openTicketsArray.length;
  
  const overdueTickets = gridData.filter((t) => Number(t.duration?.rawHours) > 24).length;
  const escalatedTickets = gridData.filter((t) => [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5].some(h => h && h.trim() !== '')).length;

  // Complaints data
  const complaints = {};
  gridData.forEach(t => {
    const category = t.category || 'Lainnya';
    complaints[category] = (complaints[category] || 0) + 1;
  });
  const complaintColors = [
    '#3b82f6', '#f59e42', '#22c55e', '#a855f7', '#ef4444', '#fbbf24', '#0ea5e9', '#6366f1', '#ec4899', '#14b8a6', '#eab308', '#f472b6',
  ];
  const complaintsLabels = Object.keys(complaints);
  const complaintsValues = Object.values(complaints);
  const complaintsData = {
    labels: complaintsLabels || [],
    datasets: [{
      label: 'Complaint Count',
      data: complaintsValues || [],
      backgroundColor: (complaintsLabels || []).map((_, i) => complaintColors[i % complaintColors.length]),
      borderWidth: 1,
    }],
  };

  // Classification analysis
  const classificationAnalysis: Record<string, { count: number, sub: Record<string, number>, trendlineRaw?: Record<string, number>, trendline?: { labels: string[], data: number[] }, trendPercent?: number | null }> = {};
  gridData.forEach(t => {
    const classification = t.classification || 'Unclassified';
    const subClassification = t.subClassification || 'Unclassified';
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
    if (!classificationAnalysis[classification].trendlineRaw) {
      classificationAnalysis[classification].trendlineRaw = {};
    }
    if (!classificationAnalysis[classification].trendlineRaw[monthYear]) {
      classificationAnalysis[classification].trendlineRaw[monthYear] = 0;
    }
    classificationAnalysis[classification].trendlineRaw[monthYear]++;
  });
  Object.values(classificationAnalysis).forEach((ca) => {
    if (!ca.trendlineRaw) return;
    const rawKeys = Object.keys(ca.trendlineRaw).sort((a, b) => new Date(a + '-01').getTime() - new Date(b + '-01').getTime());
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = rawKeys.map(key => {
      const [yyyy, mm] = key.split('-');
      return `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
    });
    const data = rawKeys.map(l => ca.trendlineRaw[l]);
    ca.trendline = { labels, data };
    if (data.length >= 2) {
      const prev = data[data.length - 2];
      const curr = data[data.length - 1];
      ca.trendPercent = prev === 0 ? null : ((curr - prev) / Math.abs(prev)) * 100;
    } else {
      ca.trendPercent = null;
    }
    delete ca.trendlineRaw;
  });

  // Monthly stats chart data
  const monthNamesIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const monthlyStats = {};
  gridData.forEach(ticket => {
    try {
      const d = new Date(ticket.openTime);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const monthYear = `${yyyy}-${mm}`;
        if (!monthlyStats[monthYear]) {
          monthlyStats[monthYear] = { incoming: 0, closed: 0, open: 0 };
        }
        monthlyStats[monthYear].incoming++;
        
        // Cek apakah tiket closed berdasarkan status 'CLOSE TICKET'
        const status = (ticket.status || '').trim().toLowerCase();
        if (status === 'closed' || status === 'close ticket') {
          monthlyStats[monthYear].closed++;
        } 
        // Cek apakah tiket open berdasarkan kriteria yang sama dengan openTicketsArray
        else {
          // Jika status adalah 'OPEN TICKET', ini adalah tiket open
          if (status === 'open ticket') {
            monthlyStats[monthYear].open++;
          }
          // Jika tidak ada closeTime, termasuk tiket open
          else if (!ticket.closeTime) {
            monthlyStats[monthYear].open++;
          } else {
            // Cek apakah closeTime di bulan berikutnya dari openTime
            const openDate = new Date(ticket.openTime);
            const closeDate = new Date(ticket.closeTime);
            
            if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) {
              monthlyStats[monthYear].open++;
            } else {
              // Bandingkan bulan dan tahun
              const openMonth = openDate.getMonth();
              const openYear = openDate.getFullYear();
              const closeMonth = closeDate.getMonth();
              const closeYear = closeDate.getFullYear();
              
              // Jika tahun closeTime lebih besar, atau tahun sama tapi bulan lebih besar
              if (closeYear > openYear || (closeYear === openYear && closeMonth > openMonth)) {
                monthlyStats[monthYear].open++;
              }
            }
          }
        }
      }
    } catch(e) {}
  });
  const sortedMonthlyKeys = Object.keys(monthlyStats).sort((a, b) => new Date(a + '-01').getTime() - new Date(b + '-01').getTime());
  const monthlyStatsChartData = {
    labels: sortedMonthlyKeys.map(key => {
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
      {
        label: 'Open Tickets',
        data: sortedMonthlyKeys.map(key => monthlyStats[key].open),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      },
    ],
  };

  // Top complaints table data
  const categoryDetails: Record<string, { tickets: typeof gridData, subCategories: Record<string, number> }> = {};
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
      const totalDuration = Array.isArray(data.tickets) ? data.tickets.map(t => Number(t.duration?.rawHours || 0)).filter(v => !isNaN(v)).reduce((acc, curr) => acc + curr, 0) : 0;
      const avgDuration = data.tickets.length > 0 ? totalDuration / data.tickets.length : 0;
      const impactScore = data.tickets.length * avgDuration;
      const topSubCategory = Object.keys(data.subCategories).length > 0
        ? Object.entries(data.subCategories).sort(([,a],[,b]) => (b as number)-(a as number))[0][0]
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
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10);

  // Busiest month & top complaint
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
    const safeComplaintsValues = Array.isArray(complaintsValues) ? complaintsValues.map(Number).filter(v => !isNaN(v)) : [];
    const totalComplaints = safeComplaintsValues.reduce((a, b) => a + b, 0);
    if (totalComplaints > 0) {
      const maxCount = Math.max(...safeComplaintsValues);
      const maxIndex = safeComplaintsValues.indexOf(maxCount);
      topComplaint = {
        category: complaintsLabels[maxIndex],
        count: maxCount,
        percentage: Math.round((maxCount / totalComplaints) * 100)
      };
    }
  }

  // Keyword analysis
  const keywordAnalysis = useMemo(() => {
    if (!Array.isArray(gridData)) return [];
    const texts = gridData.map(t => t.description || '');
    return analyzeKeywords(texts, 15); // top 15 keywords
  }, [gridData]);

  const ticketAnalyticsData = {
    stats: [
      { title: 'Total Tickets', value: totalTickets?.toString?.() ?? '0', description: `in the selected period` },
      { title: 'Average Duration', value: totalTickets ? (formatDurationDHM(totalDuration / totalTickets) || '00:00:00') : '00:00:00', description: 'average ticket resolution time' },
      { title: 'Closed Tickets', value: closedTickets?.toString?.() ?? '0', description: `${((closedTickets/totalTickets || 0) * 100).toFixed(0)}% resolution rate` },
      { title: 'Open', value: openTickets.toString(), description: 'Tiket yang masih terbuka (status bukan closed dan closeTime kosong atau di bulan berikutnya)' },
      { title: 'Overdue', value: overdueTickets.toString(), description: 'Tiket yang melewati batas waktu' },
      { title: 'Escalated', value: escalatedTickets.toString(), description: 'Tiket yang di-escalate' },
    ],
    complaintsData,
    classificationAnalysis,
    monthlyStatsChartData,
    topComplaintsTableData,
    busiestMonth,
    topComplaint,
    keywordAnalysis,
  };

  useEffect(() => {
    if (gridData.length === 0) {
      console.warn('[TicketAnalyticsContext] Tidak ada data ticket untuk filter ini.');
    }
  }, [gridData]);

  // Provider value
  const value = {
    gridData,
    ticketAnalyticsData,
    allTickets,
    allMonthsInData,
    allYearsInData,
    startMonth, setStartMonth,
    endMonth, setEndMonth,
    selectedYear, setSelectedYear,
    cutoffStart, cutoffEnd,
    refresh: () => setRefreshTrigger(t => t + 1),
  };

  return (
    <TicketAnalyticsContext.Provider value={value}>
      {children}
    </TicketAnalyticsContext.Provider>
  );
};