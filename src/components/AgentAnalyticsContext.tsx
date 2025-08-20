import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { formatDurationDHM, analyzeKeywords, generateAnalysisConclusion } from '@/lib/utils';
import { useAgentStore } from '@/store/agentStore';

const AgentAnalyticsContext = createContext(null);

export function useAgentAnalytics() {
  return useContext(AgentAnalyticsContext);
}

export const AgentAnalyticsProvider = ({ children }) => {
  // State filter waktu khusus agent
  const [startMonth, setStartMonth] = useState(null);
  const [endMonth, setEndMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Data dari IndexedDB
  const allTickets = useLiveQuery(() => db.tickets.toArray(), [refreshTrigger]);
  useEffect(() => {
    console.log('[DEBUG] allTickets from IndexedDB (Agent):', allTickets);
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
    if (!cutoffStart || !cutoffEnd || selectedYear === 'ALL') return allTickets;
    return allTickets.filter(t => {
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return false;
      return d >= cutoffStart && d <= cutoffEnd;
    });
  }, [allTickets, cutoffStart, cutoffEnd, selectedYear]);

  // --- Agent Analytics ---
  const masterAgentList = [
    "Dea Destivica", "Muhammad Lutfi Rosadi", "Stefano Dewa Susanto", "Fajar Juliantono",
    "Priyo Ardi Nugroho", "Fajar Nanda Ismono", "Louis Bayu Krisna Redionando",
    "Bandero Aldi Prasetya", "Hamid Machfudin Sukardi", "Difa' Fathir Aditya", "Zakiyya Wulan Safitri"
  ];
  const agentPerformance = {};
  masterAgentList.forEach(agent => {
    agentPerformance[agent] = { durations: [], closed: 0 };
  });
  filteredTickets.forEach(t => {
    if (t.handlingDuration?.rawHours > 0) {
      const agentName = t.openBy || 'Unassigned';
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
    const d = data as any;
    const ticketCount = d.durations.length;
    if (ticketCount === 0) return null;
    const totalDuration = Array.isArray(d.durations) ? d.durations.map(Number).filter(v => !isNaN(v)).reduce((acc, curr) => acc + curr, 0) : 0;
    const avgDuration = totalDuration / ticketCount;
    const minDuration = Math.min(...d.durations);
    const maxDuration = Math.max(...d.durations);
    const closedCount = d.closed;
    const resolutionRate = ticketCount > 0 ? (closedCount / ticketCount) * 100 : 0;
    if (ticketCount > busiestAgent.count) {
      busiestAgent = { name: agentName, count: ticketCount };
    }
    if (avgDuration < mostEfficientAgent.avg) {
      mostEfficientAgent = { name: agentName, avg: avgDuration };
    }
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
      closedCount,
      closedPercent: ticketCount > 0 ? ((closedCount / ticketCount) * 100).toFixed(1) : '0',
      resolutionRate: resolutionRate.toFixed(1) + '%',
    };
  }).filter(Boolean).sort((a, b) => (b?.ticketCount || 0) - (a?.ticketCount || 0));

  useEffect(() => {
    if (allTickets && allTickets.length > 0) {
      console.log('[DEBUG][AgentAnalyticsContext] allTickets:', allTickets);
      // Tambahan debug: cek field penting
      const withOpenBy = allTickets.filter(t => t.openBy);
      const withHandlingDuration = allTickets.filter(t => t.handlingDuration && t.handlingDuration.rawHours > 0);
      const valid = allTickets.filter(t => t.openBy && t.handlingDuration && t.handlingDuration.rawHours > 0);
      const invalid = allTickets.filter(t => !t.openBy || !t.handlingDuration || t.handlingDuration.rawHours === 0);
      console.log(`[DEBUG][AgentAnalyticsContext] Jumlah tiket: ${allTickets.length}`);
      console.log(`[DEBUG][AgentAnalyticsContext] Tiket dengan openBy: ${withOpenBy.length}`);
      console.log(`[DEBUG][AgentAnalyticsContext] Tiket dengan handlingDuration: ${withHandlingDuration.length}`);
      console.log(`[DEBUG][AgentAnalyticsContext] Tiket valid untuk agent analytics: ${valid.length}`);
      if (invalid.length > 0) {
        console.warn('[DEBUG][AgentAnalyticsContext] Contoh tiket tidak valid:', invalid.slice(0, 3));
      }
    }
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

  useEffect(() => {
    if (Array.isArray(agentAnalyticsData) && agentAnalyticsData.length === 0) {
      console.warn('[DEBUG][AgentAnalyticsContext] Tidak ada data agent untuk filter ini.');
    }
  }, [agentAnalyticsData]);

  // Utility untuk hitung KPI per tiket
  function computeTicketKPI(ticket) {
    const open = ticket.openTime ? new Date(ticket.openTime) : null;
    const close = ticket.closeTime ? new Date(ticket.closeTime) : null;
    const closePen = ticket.closeHandling ? new Date(ticket.closeHandling) : null;
    let frt = 0;
    if (open instanceof Date && closePen instanceof Date && !isNaN(open.getTime()) && !isNaN(closePen.getTime()) && closePen >= open) {
      frt = (closePen.getTime() - open.getTime()) / 60000;
    }
    let art = 0;
    if (open instanceof Date && close instanceof Date && !isNaN(open.getTime()) && !isNaN(close.getTime()) && close >= open) {
      art = (close.getTime() - open.getTime()) / 60000;
    }
    const fcr = (!ticket.handling2) ? 100 : 0;
    const sla = (art > 0 && art <= 1440) ? 100 : 0;
    return { ...ticket, frt, art, fcr, sla };
  }

  // Map filteredTickets agar setiap tiket punya field frt, art, fcr, sla
  const filteredTicketsWithKPI = filteredTickets.map(computeTicketKPI);

  // --- Agent Monthly Performance ---
  const agentMonthlyPerformance = {};
  const allMonths = new Set();
  filteredTicketsWithKPI.forEach(ticket => {
    const agentName = ticket.openBy || 'Unassigned';
    try {
      const dateObj = new Date(ticket.openTime);
      if (isNaN(dateObj.getTime())) return;
      const monthYear = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      allMonths.add(monthYear);
      if (!agentMonthlyPerformance[agentName]) {
        agentMonthlyPerformance[agentName] = {};
      }
      agentMonthlyPerformance[agentName][monthYear] = (agentMonthlyPerformance[agentName][monthYear] || 0) + 1;
    } catch (e) {}
  });
  // Filter sortedMonths sesuai cutoffStart dan cutoffEnd
  const sortedMonths: string[] = Array.from(allMonths).map(String)
    .sort((a, b) => new Date(String(a) + '-01').getTime() - new Date(String(b) + '-01').getTime())
    .filter(month => {
      if (!cutoffStart || !cutoffEnd) return true;
      if (typeof month !== 'string') return false;
      const [year, monthNum] = month.split('-');
      const date = new Date(Number(year), Number(monthNum) - 1, 1);
      return date >= cutoffStart && date <= cutoffEnd;
    });

  // Kumpulkan data bulanan per agent untuk FRT, ART, FCR, SLA
  const agentMonthlyFRT = {};
  const agentMonthlyART = {};
  const agentMonthlyFCR = {};
  const agentMonthlySLA = {};
  filteredTicketsWithKPI.forEach(ticket => {
    const agentName = ticket.openBy || 'Unassigned';
    try {
      const dateObj = new Date(ticket.openTime);
      if (isNaN(dateObj.getTime())) return;
      const monthYear = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      // FRT
      if (!agentMonthlyFRT[agentName]) agentMonthlyFRT[agentName] = {};
      if (!agentMonthlyFRT[agentName][monthYear]) agentMonthlyFRT[agentName][monthYear] = [];
      agentMonthlyFRT[agentName][monthYear].push(ticket.frt);
      // ART
      if (!agentMonthlyART[agentName]) agentMonthlyART[agentName] = {};
      if (!agentMonthlyART[agentName][monthYear]) agentMonthlyART[agentName][monthYear] = [];
      agentMonthlyART[agentName][monthYear].push(ticket.art);
      // FCR
      if (!agentMonthlyFCR[agentName]) agentMonthlyFCR[agentName] = {};
      if (!agentMonthlyFCR[agentName][monthYear]) agentMonthlyFCR[agentName][monthYear] = [];
      agentMonthlyFCR[agentName][monthYear].push(ticket.fcr);
      // SLA
      if (!agentMonthlySLA[agentName]) agentMonthlySLA[agentName] = {};
      if (!agentMonthlySLA[agentName][monthYear]) agentMonthlySLA[agentName][monthYear] = [];
      agentMonthlySLA[agentName][monthYear].push(ticket.sla);
    } catch (e) {}
  });

  // Hitung score bulanan per agent
  const w1 = 0.4, w2 = 0.4, w3 = 0.2, w4 = 0;
  const agentMonthlyScore: Record<string, Record<string, number>> = {};
  Object.keys(agentMonthlyPerformance).forEach(agentName => {
    agentMonthlyScore[agentName] = {};
    sortedMonths.forEach(month => {
      // Ambil nilai bulanan
      const fcrArr = (agentMonthlyFCR[agentName]?.[month] || []);
      const slaArr = (agentMonthlySLA[agentName]?.[month] || []);
      const artArr = (agentMonthlyART[agentName]?.[month] || []);
      const backlog = 0; // backlog bulanan (bisa diisi jika ada data)
      // Rata-rata
      const fcr = fcrArr.length ? fcrArr.reduce((a,b)=>a+b,0)/fcrArr.length : 0;
      const sla = slaArr.length ? slaArr.reduce((a,b)=>a+b,0)/slaArr.length : 0;
      const art = artArr.length ? artArr.reduce((a,b)=>a+b,0)/artArr.length : 0;
      // Normalisasi ART
      const maxART = 1440; // 24 jam (bisa diganti sesuai kebutuhan)
      const ART_norm = maxART ? (art / maxART) * 100 : 0;
      // Score
      const scoreRaw = w1 * fcr + w2 * sla - w3 * ART_norm - w4 * backlog;
      const score = Math.max(0, Math.min(100, Math.round(scoreRaw)));
      agentMonthlyScore[agentName][String(month)] = score;
    });
  });

  const agentMonthlyChart = sortedMonths.length === 0 ? null : {
    labels: sortedMonths.map(month => {
      const [year, monthNum] = (month as string).split('-');
      return `${monthNum}/${year}`;
    }),
    datasets: Object.entries(agentMonthlyPerformance).map(([agentName, monthlyData], index) => {
      const md = monthlyData as any;
      const color = '#3b82f6';
      return {
        label: agentName,
        data: sortedMonths.map(month => md[month as string] || 0),
        backgroundColor: color + 'CC',
        borderColor: color,
        borderRadius: 6,
        maxBarThickness: 32,
      };
    }),
    datasetsFRT: Object.entries(agentMonthlyFRT).map(([agentName, monthlyData]) => {
      return {
        label: agentName,
        data: sortedMonths.map(month => {
          const arr = monthlyData[month as string] || [];
          return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        })
      };
    }),
    datasetsART: Object.entries(agentMonthlyART).map(([agentName, monthlyData]) => {
      return {
        label: agentName,
        data: sortedMonths.map(month => {
          const arr = monthlyData[month as string] || [];
          return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        })
      };
    }),
    datasetsFCR: Object.entries(agentMonthlyFCR).map(([agentName, monthlyData]) => {
      return {
        label: agentName,
        data: sortedMonths.map(month => {
          const arr = monthlyData[month as string] || [];
          return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        })
      };
    }),
    datasetsSLA: Object.entries(agentMonthlySLA).map(([agentName, monthlyData]) => {
      return {
        label: agentName,
        data: sortedMonths.map(month => {
          const arr = monthlyData[month as string] || [];
          return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        })
      };
    }),
    datasetsBacklog: Object.keys(agentMonthlyPerformance).map((agentName) => {
      return {
        label: agentName,
        data: sortedMonths.map(month => {
          // Filter tickets for this agent and month
          const agentTicketsForMonth = filteredTicketsWithKPI.filter(t => {
            if (t.openBy !== agentName) return false;
            if (!t.openTime) return false;
            const d = new Date(t.openTime);
            if (isNaN(d.getTime())) return false;
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return monthKey === month;
          });
          
          // Calculate backlog count using the same logic as isBacklogTicket
          const backlogCount = agentTicketsForMonth.filter(t => {
            const status = t.status?.trim()?.toLowerCase() || '';
            if (status !== 'open ticket') return false;
            if (t.closeTime) return false;
            return true;
          }).length;
          
          return backlogCount;
        })
      };
    }),
    datasetsScore: Object.entries(agentMonthlyScore).map(([agentName, monthlyData]) => {
      return {
        label: agentName,
        data: sortedMonths.map(month => monthlyData[month] ?? 0)
      };
    }),
    // Add total tickets per month for percentage calculation
    totalTicketsPerMonth: sortedMonths.map(month => {
      const monthTickets = filteredTicketsWithKPI.filter(t => {
        if (!t.openTime) return false;
        const d = new Date(t.openTime);
        if (isNaN(d.getTime())) return false;
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === month;
      });
      return monthTickets.length;
    }),
  };

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

  // --- Tambahan: summary dan agentList agar sesuai ekspektasi AgentAnalytics.tsx ---
  const agentList = agentAnalyticsData;
  const summary = {
    totalAgents: agentAnalyticsData.length,
    busiestAgentName: busiestAgent.name,
    mostEfficientAgentName: mostEfficientAgent.name,
    highestResolutionAgentName: highestResolutionAgent.name,
  };

  // Provider value
  const value = {
    agentAnalyticsData: {
      agentList,
      summary,
      agentMonthlyChart,
    },
    agentMonthlyChart,
    allTickets,
    allMonthsInData,
    allYearsInData,
    startMonth, setStartMonth,
    endMonth, setEndMonth,
    selectedYear, setSelectedYear,
    cutoffStart, cutoffEnd,
    refresh: () => setRefreshTrigger(t => t + 1),
  };

  // Mapping tiket dari IndexedDB ke format agentKpi
  function mapTicketFieldsForAgentKpi(ticket) {
    return {
      ...ticket,
      OpenBy: ticket.openBy,
      WaktuOpen: ticket.openTime,
      WaktuCloseTicket: ticket.closeTime,
      ClosePenanganan: ticket.closeHandling,
      Penanganan2: ticket.handling2,
      // Tambahkan mapping lain jika perlu
    };
  }

  const setAgentMetrics = useAgentStore(state => state.setAgentMetrics);
  useEffect(() => {
    if (filteredTickets && filteredTickets.length > 0) {
      setAgentMetrics(filteredTickets.map(mapTicketFieldsForAgentKpi));
    } else {
      setAgentMetrics([]);
    }
  }, [filteredTickets]);

  return (
    <AgentAnalyticsContext.Provider value={value}>
      {children}
    </AgentAnalyticsContext.Provider>
  );
}; 