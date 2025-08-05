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
  
  // Menentukan tiket closed berdasarkan status yang mengandung 'close'
  const closedTickets = gridData.filter((t) => {
    const status = (t.status || '').trim().toLowerCase();
    return status.includes('close');
  }).length;
  
  // Menentukan tiket open berdasarkan kriteria:
  // SEMUA TIKET MEMILIKI STATUS "Closed", jadi kita fokus pada closeTime analysis
  // 1. Waktu Close Ticket kosong ATAU
  // 2. Waktu Close Ticket di masa depan ATAU  
  // 3. Waktu Close Ticket di bulan berikutnya dari bulan Open
  const openTicketsArray = gridData.filter(t => {
    // Jika tidak ada closeTime, termasuk tiket open
    if (!t.closeTime) return true;
    
    const openDate = new Date(t.openTime);
    const closeDate = new Date(t.closeTime);
    
    if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) return true;
    
    // Fallback 1: jika closeTime di masa depan dari sekarang, anggap open
    const now = new Date();
    if (closeDate > now) return true;
    
    // Fallback 2: jika closeTime di bulan berikutnya dari openTime, anggap open
    const openMonth = openDate.getMonth();
    const openYear = openDate.getFullYear();
    const closeMonth = closeDate.getMonth();
    const closeYear = closeDate.getFullYear();
    
    if (closeYear > openYear || (closeYear === openYear && closeMonth > openMonth)) {
      return true;
    }
    
    // Fallback 3: jika closeTime lebih dari 30 hari setelah openTime, anggap open
    const daysDiff = (closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) return true;
    
    return false;
  });
  
  // Debug: Log open tickets analysis
  if (typeof window !== 'undefined') {
    console.log('[DEBUG] Open tickets analysis:', {
      totalTickets: gridData.length,
      openTicketsCount: openTicketsArray.length,
      sampleOpenTickets: openTicketsArray.slice(0, 3).map(t => ({
        status: t.status,
        openTime: t.openTime,
        closeTime: t.closeTime
      }))
    });
  }
  
  const openTickets = openTicketsArray.length;
  
  // Fallback: jika tidak ada tiket closed sama sekali, anggap semua tiket adalah open
  // kecuali yang eksplisit memiliki status closed
  const finalOpenTickets = closedTickets === 0 && openTickets === 0 ? 
    gridData.filter(t => {
      const status = (t.status || '').trim().toLowerCase();
      return !(status === 'closed' || status === 'close ticket' || status === 'close');
    }).length : openTickets;
  
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
  
  // Debug: Log sample tickets untuk debugging
  if (typeof window !== 'undefined' && gridData.length > 0) {
    const sampleTickets = gridData.slice(0, 5);
    console.log('[DEBUG] Sample tickets:', sampleTickets.map(t => ({
      openTime: t.openTime,
      closeTime: t.closeTime,
      status: t.status,
      statusLower: (t.status || '').trim().toLowerCase(),
      hasCloseTime: !!t.closeTime
    })));
    
    // Analisis status unik
    const uniqueStatuses = new Set();
    gridData.forEach(t => uniqueStatuses.add(t.status));
    console.log('[DEBUG] Unique statuses in filtered data:', Array.from(uniqueStatuses));
    
    // Test manual open logic pada sample
    const manualOpenTest = sampleTickets.map(t => {
      const status = (t.status || '').trim().toLowerCase();
      return {
        status: t.status,
        statusLower: status,
        isOpenByStatus: status === 'open ticket' || status === 'open',
        isClosedByStatus: status === 'closed' || status === 'close ticket' || status === 'close',
        hasNoCloseTime: !t.closeTime,
        wouldBeOpen: (status === 'open ticket' || status === 'open') || 
                     (!(status === 'closed' || status === 'close ticket' || status === 'close') && !t.closeTime)
      };
    });
    console.log('[DEBUG] Manual open test on samples:', manualOpenTest);
  }
  
  gridData.forEach(ticket => {
    try {
      const d = new Date(ticket.openTime);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const monthYear = `${yyyy}-${mm}`;
        if (!monthlyStats[monthYear]) {
          monthlyStats[monthYear] = { incoming: 0, open: 0 };
        }
        monthlyStats[monthYear].incoming++;
        
        // Cek apakah tiket open berdasarkan kriteria yang sama dengan openTicketsArray
        // FOKUS PADA closeTime analysis karena semua status adalah "Closed"
        
        // Jika tidak ada closeTime, termasuk tiket open
        if (!ticket.closeTime) {
          monthlyStats[monthYear].open++;
        } 
        // Cek closeTime untuk kondisi lain
        else {
          const openDate = new Date(ticket.openTime);
          const closeDate = new Date(ticket.closeTime);
          
          if (isNaN(openDate.getTime()) || isNaN(closeDate.getTime())) {
            monthlyStats[monthYear].open++;
          } else {
            // Fallback 1: jika closeTime di masa depan dari sekarang, anggap open
            const now = new Date();
            if (closeDate > now) {
              monthlyStats[monthYear].open++;
            }
            // Fallback 2: jika closeTime di bulan berikutnya dari openTime, anggap open
            else {
              const openMonth = openDate.getMonth();
              const openYear = openDate.getFullYear();
              const closeMonth = closeDate.getMonth();
              const closeYear = closeDate.getFullYear();
              
              if (closeYear > openYear || (closeYear === openYear && closeMonth > openMonth)) {
                monthlyStats[monthYear].open++;
              }
              // Fallback 3: jika closeTime lebih dari 30 hari setelah openTime, anggap open
              else {
                const daysDiff = (closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24);
                if (daysDiff > 30) {
                  monthlyStats[monthYear].open++;
                }
              }
            }
          }
        }
      }
    } catch(e) {
      console.error('[DEBUG] Error processing ticket:', e);
    }
  });
  
  // Debug: Log monthlyStats
  if (typeof window !== 'undefined') {
    console.log('[DEBUG] Monthly Stats:', monthlyStats);
  }
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
        label: 'Closed',
        data: sortedMonthlyKeys.map(key => {
          // Closed = Incoming - Open (sesuai permintaan user)
          const incoming = monthlyStats[key].incoming;
          const open = monthlyStats[key].open;
          return incoming - open;
        }),
        borderColor: 'rgb(236, 72, 153)',
        backgroundColor: 'rgba(236, 72, 153, 0.5)',
      },
      {
        label: 'Incoming',
        data: sortedMonthlyKeys.map(key => monthlyStats[key].incoming),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
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
      { title: 'Open', value: finalOpenTickets.toString(), description: 'Tiket yang masih terbuka (status bukan closed dan closeTime kosong atau di bulan berikutnya)' },
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
    } else {
      console.log('[TicketAnalyticsContext] Loaded tickets:', {
        total: gridData.length,
        open: openTickets,
        finalOpen: finalOpenTickets,
        closed: closedTickets,
        filter: { startMonth, endMonth, selectedYear }
      });
    }
  }, [gridData, openTickets, closedTickets, startMonth, endMonth, selectedYear]);

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