import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ITicket } from '@/lib/db';
import { formatDurationDHM, analyzeKeywords, generateAnalysisConclusion } from '@/lib/utils';

// Struktur context
const AnalyticsContext = createContext(null);

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

export const AnalyticsProvider = ({ children }) => {
  // State filter waktu
  const [startMonth, setStartMonth] = useState(null);
  const [endMonth, setEndMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Data dari IndexedDB
  const allTickets = useLiveQuery(() => db.tickets.toArray(), [refreshTrigger]);
  useEffect(() => {
    console.log('[DEBUG] allTickets from IndexedDB:', allTickets);
  }, [allTickets]);

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
      const [ma, ya] = (a as string).split('/');
      const [mb, yb] = (b as string).split('/');
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

  // Proses data analitik (copy dari Dashboard)
  const analytics = useMemo(() => {
    if (!allTickets) {
      return { gridData: [], kanbanData: [], ticketAnalyticsData: null, agentAnalyticsData: [] };
    }
    // --- Filtered Tickets ---
    const filteredTickets = allTickets.filter(t => {
      if (!cutoffStart || !cutoffEnd) return true;
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return false;
      return d >= cutoffStart && d <= cutoffEnd;
    });
    // LOGGING: Show filter period and ticket/customer counts
    const uniqueCustomers = new Set(filteredTickets.map(t => t.customerId || 'Unknown'));
    let filterRange = 'ALL';
    if (
      cutoffStart instanceof Date && !isNaN(cutoffStart.getTime()) &&
      cutoffEnd instanceof Date && !isNaN(cutoffEnd.getTime())
    ) {
      filterRange = `${cutoffStart.toISOString()} - ${cutoffEnd.toISOString()}`;
    }
    console.log('[AnalyticsContext] Filter:', {
      cutoffStart,
      cutoffEnd,
      filteredTickets: filteredTickets.length,
      uniqueCustomers: uniqueCustomers.size,
      filterRange,
    });

    // --- Customer Master Map ---
    const customerMasterMap = new Map();
    if (allTickets) {
      allTickets.forEach(ticket => {
        const customerId = ticket.customerId || 'Unknown';
        if (customerId === 'Unknown') return;
        if (!customerMasterMap.has(customerId)) {
          customerMasterMap.set(customerId, []);
        }
        customerMasterMap.get(customerId).push(ticket);
      });
    }

    // --- Risk Classification ---
    const periodTicketCounts = {};
    filteredTickets.forEach(t => {
      const customerId = t.customerId || 'Unknown';
      if (customerId !== 'Unknown') {
        periodTicketCounts[customerId] = (periodTicketCounts[customerId] || 0) + 1;
      }
    });
    const customerClassMap = {};
    Object.keys(periodTicketCounts).forEach(customerId => {
      const count = periodTicketCounts[customerId];
      if (count > 18) customerClassMap[customerId] = 'Ekstrem';
      else if (count >= 10) customerClassMap[customerId] = 'Kronis';
      else if (count >= 3) customerClassMap[customerId] = 'Persisten';
      else customerClassMap[customerId] = 'Normal';
    });

    // --- Grid Data & Kanban Data ---
    const gridData: ITicket[] = filteredTickets;
    function processKanbanData(tickets, classMap, masterMap) {
      const customerMap = {};
      const closedTickets = tickets.filter(ticket => (ticket.status || '').trim().toLowerCase() === 'closed');
      closedTickets.forEach(ticket => {
        const customerId = ticket.customerId || 'Unknown Customer';
        if (customerId === 'Unknown Customer') return;
        if (!customerMap[customerId]) {
          customerMap[customerId] = { name: ticket.name, customerId: customerId, tickets: [], totalHandlingDuration: 0, descriptions: [], causes: [], handlings: [] };
        }
        customerMap[customerId].tickets.push(ticket);
        customerMap[customerId].totalHandlingDuration += ticket.handlingDuration?.rawHours || 0;
        customerMap[customerId].descriptions.push(ticket.description);
        customerMap[customerId].causes.push(ticket.cause);
        customerMap[customerId].handlings.push(ticket.handling);
      });
      return Object.values(customerMap).map(customer => {
        const c = customer as any;
        const descriptionKeywords = analyzeKeywords(c.descriptions);
        const causeKeywords = analyzeKeywords(c.causes);
        const handlingKeywords = analyzeKeywords(c.handlings);
        const analysisKeywords = {
          description: descriptionKeywords.map(item => item[0]),
          cause: causeKeywords.map(item => item[0]),
          handling: handlingKeywords.map(item => item[0]),
        };
        const repClass = classMap[c.customerId] || 'Normal';
        return {
          id: c.customerId,
          name: c.name,
          customerId: c.customerId,
          ticketCount: c.tickets.length,
          totalHandlingDurationFormatted: formatDurationDHM(c.totalHandlingDuration),
          allTickets: c.tickets,
          fullTicketHistory: masterMap.get(c.customerId) || [],
          analysis: {
            description: descriptionKeywords,
            cause: causeKeywords,
            handling: handlingKeywords,
            conclusion: generateAnalysisConclusion(analysisKeywords)
          },
          repClass,
        }
      }).sort((a, b) => b.ticketCount - a.ticketCount);
    }
    const kanbanData = processKanbanData(gridData, customerClassMap, customerMasterMap);

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
    gridData.forEach(t => {
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
        resolutionRate: resolutionRate.toFixed(1) + '%',
      };
    }).filter(Boolean).sort((a, b) => (b?.ticketCount || 0) - (a?.ticketCount || 0));
    // --- Agent Monthly Performance ---
    const agentMonthlyPerformance = {};
    const allMonths = new Set();
    gridData.forEach(ticket => {
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
    const sortedMonths = Array.from(allMonths).sort((a, b) => new Date((a as string) + '-01').getTime() - new Date((b as string) + '-01').getTime());
    const agentMonthlyChartData = sortedMonths.length === 0 ? null : {
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
    };
    // Hitung total response (jumlah tiket di gridData)
    const totalResponses = gridData.length;
    // Hitung rata-rata response time (dari agentPerformance, ambil semua durasi lalu rata-rata)
    const allDurations = Object.values(agentPerformance).flatMap((d: any) => d.durations || []);
    const avgResponseTime = allDurations.length > 0 ? formatDurationDHM(allDurations.reduce((a, b) => a + b, 0) / allDurations.length) : '00:00:00';
    // Top performer: agent dengan ticketCount terbanyak (busiestAgent)
    const topPerformer = busiestAgent.name;
    // Active agents: agent yang menangani tiket di periode ini
    const activeAgents = agentAnalyticsData.length;
    const finalAgentData = {
      agentList: agentAnalyticsData,
      summary: {
        totalAgents: agentAnalyticsData.length,
        totalResponses,
        avgResponseTime,
        topPerformer,
        activeAgents,
        busiestAgentName: busiestAgent.name,
        mostEfficientAgentName: mostEfficientAgent.avg === Infinity ? 'N/A' : mostEfficientAgent.name,
        highestResolutionAgentName: highestResolutionAgent.name,
      },
      agentMonthlyChart: agentMonthlyChartData
    };
    // --- Ticket Analytics ---
    // (Copy logic dari Dashboard agar ticketAnalyticsData tidak null)
    // --- Ticket Analytics Processing (formerly analyticsData) ---
    const totalTickets = gridData.length;
    const totalDuration = Array.isArray(gridData) ? gridData.map(t => Number(t.duration?.rawHours || 0)).filter(v => !isNaN(v)).reduce((acc, curr) => acc + curr, 0) : 0;
    const closedTickets = gridData.filter((t: ITicket) => (t.status || '').trim().toLowerCase() === 'closed').length;
    // Overdue: tiket dengan durasi > 24 jam
    const overdueTickets = gridData.filter((t: ITicket) => Number(t.duration?.rawHours) > 24).length;
    // Escalated: tiket dengan lebih dari 1 penanganan (ada closeHandling2, closeHandling3, closeHandling4, atau closeHandling5 yang tidak kosong)
    const escalatedTickets = gridData.filter((t: ITicket) => [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5].some(h => h && h.trim() !== '')).length;

    const complaints = {};
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
    type ClassificationAnalysis = {
      [key: string]: {
        count: number,
        sub: { [key: string]: number },
        trendlineRaw?: { [month: string]: number },
        trendline?: { labels: string[], data: number[] },
        trendPercent?: number | null
      }
    };
    const classificationAnalysis: ClassificationAnalysis = {};
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
      if (!classificationAnalysis[classification].trendlineRaw) {
        classificationAnalysis[classification].trendlineRaw = {};
      }
      if (!classificationAnalysis[classification].trendlineRaw![monthYear]) {
        classificationAnalysis[classification].trendlineRaw![monthYear] = 0;
      }
      classificationAnalysis[classification].trendlineRaw![monthYear]!++;
    });

    // Setelah itu, ubah trendlineRaw menjadi array labels & data (urutkan bulan)
    Object.values(classificationAnalysis).forEach((ca) => {
      if (!ca.trendlineRaw) return;
      const rawKeys = Object.keys(ca.trendlineRaw).sort((a, b) => new Date(a + '-01').getTime() - new Date(b + '-01').getTime());
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const labels = rawKeys.map(key => {
        const [yyyy, mm] = key.split('-');
        return `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
      });
      const data = rawKeys.map(l => ca.trendlineRaw![l]);
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

    // Data for Top Complaints Table
    type CategoryDetails = {
      [category: string]: {
        tickets: typeof gridData,
        subCategories: { [sub: string]: number }
      }
    };
    const categoryDetails: CategoryDetails = {};
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
      .sort((a, b) => b.impactScore - a.impactScore) // Sort by the new impact score
      .slice(0, 10);

    const allDescriptions = gridData.map(t => t.description).filter(Boolean);
    const keywordAnalysis = analyzeKeywords(allDescriptions, 20);

    // --- Repeat-Complainer Class Calculation ---
    // 1. Agregasi jumlah tiket per customer
    const customerTicketCounts: Record<string, number> = {};
    gridData.forEach(t => {
      const customer = t.name || t.customerId || 'Unknown';
      customerTicketCounts[customer] = Number(customerTicketCounts[customer] || 0) + 1;
    });
    const countsArr = Object.values(customerTicketCounts).map(v => Number(v)).filter(v => !isNaN(v));
    const meanVal = countsArr.reduce((a, b) => a + b, 0) / (countsArr.length || 1);
    const stddev = Math.sqrt(
      countsArr.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) / (countsArr.length || 1)
    );
    // 3. Assign class ke setiap customer
    const customerClass: Record<string, string> = {};
    Object.entries(customerTicketCounts).forEach(([customer, countRaw]) => {
      const count = Number(countRaw);
      if (!isNaN(count)) {
        if (count <= meanVal) customerClass[customer] = 'Normal';
        else if (count <= meanVal + stddev) customerClass[customer] = 'Persisten';
        else if (count <= meanVal + 2 * stddev) customerClass[customer] = 'Kronis';
        else customerClass[customer] = 'Ekstrem';
      }
    });
    // 4. Assign repClass ke setiap tiket
    gridData.forEach(t => {
      const customer = t.name || t.customerId || 'Unknown';
      (t as any).repClass = customerClass[customer] || 'Normal';
    });

    const ticketAnalyticsData = {
        stats: [
            { title: 'Total Tickets', value: totalTickets?.toString?.() ?? '0', description: `in the selected period` },
            { title: 'Average Duration', value: totalTickets ? (formatDurationDHM(totalDuration / totalTickets) || '00:00:00') : '00:00:00', description: 'average ticket resolution time' },
            { title: 'Closed Tickets', value: closedTickets?.toString?.() ?? '0', description: `${((closedTickets/totalTickets || 0) * 100).toFixed(0)}% resolution rate` },
            { title: 'Open', value: (totalTickets - closedTickets).toString(), description: 'Tiket yang masih terbuka' },
            { title: 'Overdue', value: overdueTickets.toString(), description: 'Tiket yang melewati batas waktu' },
            { title: 'Escalated', value: escalatedTickets.toString(), description: 'Tiket yang di-escalate' },
            { title: 'Active Agents', value: finalAgentData?.summary?.totalAgents?.toString?.() ?? '0', description: 'handling tickets' },
        ],
        complaintsData: {
            labels: complaintsLabels || [],
            datasets: [{ 
              label: 'Complaint Count', 
              data: complaintsValues || [],
              backgroundColor: (complaintsLabels || []).map((_, i) => complaintColors[i % complaintColors.length]),
              borderWidth: 1,
            }],
        },
        classificationAnalysis: classificationAnalysis || {},
        monthlyStatsChartData: monthlyStatsChartData || { labels: [], datasets: [] },
        busiestMonth: busiestMonth || { month: 'N/A', count: 0 },
        topComplaint: topComplaint || { category: 'N/A', count: 0, percentage: 0 },
        topComplaintsTableData: topComplaintsTableData || [],
        keywordAnalysis: keywordAnalysis || [],
    };

    return {
      gridData,
      kanbanData,
      agentAnalyticsData: finalAgentData,
      ticketAnalyticsData
    };
  }, [allTickets, cutoffStart, cutoffEnd]);

  // Provider value
  const value = {
    ...analytics,
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
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}; 