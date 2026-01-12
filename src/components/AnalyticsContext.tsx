import {
	createContext,
	useContext,
	useMemo,
	useState,
	useEffect,
} from "react";
import { ITicket } from "@/lib/db";
import {
	formatDurationDHM,
	analyzeKeywords,
	generateAnalysisConclusion,
} from "@/lib/utils";
import { isClosedTicket } from "@/utils/ticketStatus";
import { cacheService } from "@/services/cacheService";

// Struktur context
const AnalyticsContext = createContext(null);

export function useAnalytics() {
	const context = useContext(AnalyticsContext);
	if (!context) {
		return {
			gridData: [],
			kanbanData: [],
			agentAnalyticsData: null,
			ticketAnalyticsData: null,
			refresh: () => { },
		};
	}
	return context;
}

export const AnalyticsProvider = ({ children }) => {
	// State filter waktu
	const [startMonth, setStartMonth] = useState(null);
	const [endMonth, setEndMonth] = useState(null);
	const [selectedYear, setSelectedYear] = useState(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [isLoading, setIsLoading] = useState(true);

	// Data dari CacheService (menggantikan useLiveQuery db.tickets)
	const [allTickets, setAllTickets] = useState<ITicket[]>([]);

	useEffect(() => {
		const fetchData = async () => {
			setIsLoading(true);
			try {
				// Gunakan cacheService untuk mendapatkan tiket (otomatis fetch API jika cache kosong)
				const tickets = await cacheService.getTickets();
				setAllTickets(tickets as unknown as ITicket[]);
			} catch (error) {
				console.error("Failed to fetch tickets in AnalyticsContext:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [refreshTrigger]);

	useEffect(() => {
		if (
			Array.isArray(allTickets) &&
			allTickets.length > 0 &&
			!isLoading &&
			(!startMonth || !endMonth || !selectedYear)
		) {
			const dates = allTickets
				.map((t) => t.openTime)
				.filter(Boolean) as string[];
			if (dates.length > 0) {
				const latestTime = dates.reduce((max, d) => {
					const time = new Date(d).getTime();
					return time > max ? time : max;
				}, 0);
				const latest = new Date(latestTime);
				const month = String(latest.getMonth() + 1).padStart(2, "0");
				const year = String(latest.getFullYear());
				setStartMonth(month);
				setEndMonth(month);
				setSelectedYear(year);
			}
		}
	}, [allTickets, isLoading, startMonth, endMonth, selectedYear]);

	// Ambil semua bulan & tahun unik
	const allMonthsInData = useMemo(() => {
		if (!allTickets) return [];
		const monthSet = new Set();
		allTickets.forEach((t) => {
			if (t.openTime) {
				const d = new Date(t.openTime);
				if (!isNaN(d.getTime())) {
					const mm = String(d.getMonth() + 1).padStart(2, "0");
					const yyyy = d.getFullYear();
					monthSet.add(`${mm}/${yyyy}`);
				}
			}
		});
		return Array.from(monthSet).sort((a, b) => {
			const [ma, ya] = (a as string).split("/");
			const [mb, yb] = (b as string).split("/");
			return (
				new Date(`${ya}-${ma}-01`).getTime() -
				new Date(`${yb}-${mb}-01`).getTime()
			);
		});
	}, [allTickets]);

	const allYearsInData = useMemo(() => {
		if (!allTickets) return [];
		const yearSet = new Set();
		allTickets.forEach((t) => {
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
		if (!startMonth || !endMonth || !selectedYear)
			return { cutoffStart: null, cutoffEnd: null };
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
			return {
				gridData: [],
				kanbanData: [],
				ticketAnalyticsData: null,
				agentAnalyticsData: [],
			};
		}
		// --- Filtered Tickets ---
		const filteredTickets = allTickets.filter((t) => {
			if (!t) return false;
			if (!cutoffStart || !cutoffEnd) return true;
			if (!t.openTime) return false;
			const d = new Date(t.openTime);
			if (isNaN(d.getTime())) return false;
			return d >= cutoffStart && d <= cutoffEnd;
		});

		const gridData: ITicket[] = filteredTickets;

		// --- Customer Master Map ---
		const customerMasterMap = new Map<string, ITicket[]>();
		allTickets.forEach((ticket) => {
			if (!ticket) return;
			const customerId = ticket.customerId || "Unknown";
			if (customerId === "Unknown") return;
			if (!customerMasterMap.has(customerId)) {
				customerMasterMap.set(customerId, []);
			}
			customerMasterMap.get(customerId)!.push(ticket);
		});

		// --- Risk Classification ---
		const periodTicketCounts: Record<string, number> = {};
		filteredTickets.forEach((t) => {
			if (!t) return;
			const customerId = t.customerId || "Unknown";
			if (customerId !== "Unknown") {
				periodTicketCounts[customerId] = (periodTicketCounts[customerId] || 0) + 1;
			}
		});

		const customerClassMap: Record<string, string> = {};
		Object.keys(periodTicketCounts).forEach((customerId) => {
			const count = periodTicketCounts[customerId];
			if (count > 18) customerClassMap[customerId] = "Ekstrem";
			else if (count >= 10) customerClassMap[customerId] = "Kronis";
			else if (count >= 3) customerClassMap[customerId] = "Persisten";
			else customerClassMap[customerId] = "Normal";
		});

		// --- Kanban Data ---
		const customerMap: Record<string, any> = {};
		const closedTicketsList = gridData.filter(isClosedTicket);
		closedTicketsList.forEach((ticket) => {
			if (!ticket) return;
			const customerId = ticket.customerId || "Unknown Customer";
			if (customerId === "Unknown Customer") return;
			if (!customerMap[customerId]) {
				customerMap[customerId] = {
					name: ticket.name,
					customerId: customerId,
					tickets: [],
					totalHandlingDuration: 0,
					descriptions: [],
					causes: [],
					handlings: [],
				};
			}
			customerMap[customerId].tickets.push(ticket);
			customerMap[customerId].totalHandlingDuration += ticket.handlingDuration?.rawHours || 0;
			customerMap[customerId].descriptions.push(ticket.description || "");
			customerMap[customerId].causes.push(ticket.cause || "");
			customerMap[customerId].handlings.push(ticket.handling || "");
		});

		const kanbanData = Object.values(customerMap)
			.map((c) => {
				const descriptionKeywords = analyzeKeywords(c.descriptions);
				const causeKeywords = analyzeKeywords(c.causes);
				const handlingKeywords = analyzeKeywords(c.handlings);
				const analysisKeywords = {
					description: descriptionKeywords.map((item) => item[0]),
					cause: causeKeywords.map((item) => item[0]),
					handling: handlingKeywords.map((item) => item[0]),
				};
				const repClass = customerClassMap[c.customerId] || "Normal";
				return {
					id: c.customerId,
					name: c.name,
					customerId: c.customerId,
					ticketCount: c.tickets.length,
					totalHandlingDurationFormatted: formatDurationDHM(c.totalHandlingDuration),
					allTickets: c.tickets,
					fullTicketHistory: customerMasterMap.get(c.customerId) || [],
					analysis: {
						description: descriptionKeywords,
						cause: causeKeywords,
						handling: handlingKeywords,
						conclusion: generateAnalysisConclusion(analysisKeywords),
					},
					repClass,
				};
			})
			.sort((a, b) => b.ticketCount - a.ticketCount);

		// --- Agent Analytics ---
		const masterAgentList = [
			"Dea Destivica", "Muhammad Lutfi Rosadi", "Stefano Dewa Susanto", "Fajar Juliantono",
			"Priyo Ardi Nugroho", "Fajar Nanda Ismono", "Louis Bayu Krisna Redionando",
			"Bandero Aldi Prasetya", "Hamid Machfudin Sukardi", "Difa' Fathir Aditya", "Zakiyya Wulan Safitri",
		];
		const agentPerformance: Record<string, { durations: number[]; closed: number }> = {};
		masterAgentList.forEach((agent) => {
			agentPerformance[agent] = { durations: [], closed: 0 };
		});

		gridData.forEach((t) => {
			if (!t) return;
			const duration = t.handlingDuration?.rawHours || 0;
			const agentName = t.openBy || "Unassigned";
			if (!agentPerformance[agentName]) {
				agentPerformance[agentName] = { durations: [], closed: 0 };
			}
			if (duration > 0) agentPerformance[agentName].durations.push(duration);
			if (t.status === "Closed") agentPerformance[agentName].closed++;
		});

		let busiestAgent = { name: "N/A", count: 0 };
		let mostEfficientAgent = { name: "N/A", avg: Infinity };
		let highestResolutionAgent = { name: "N/A", rate: 0 };

		const agentAnalyticsDataList = Object.entries(agentPerformance)
			.map(([agentName, data]) => {
				const ticketCount = data.durations.length;
				if (ticketCount === 0) return null;
				const totalDur = data.durations.reduce((acc, curr) => acc + curr, 0);
				const avgDur = totalDur / ticketCount;
				const minDur = data.durations.reduce((min, v) => (v < min ? v : min), data.durations[0]);
				const maxDur = data.durations.reduce((max, v) => (v > max ? v : max), data.durations[0]);
				const resolutionRate = (data.closed / ticketCount) * 100;

				if (ticketCount > busiestAgent.count) busiestAgent = { name: agentName, count: ticketCount };
				if (avgDur < mostEfficientAgent.avg) mostEfficientAgent = { name: agentName, avg: avgDur };
				if (resolutionRate > highestResolutionAgent.rate) highestResolutionAgent = { name: agentName, rate: resolutionRate };

				return {
					agentName,
					ticketCount,
					totalDurationFormatted: formatDurationDHM(totalDur),
					avgDurationFormatted: formatDurationDHM(avgDur),
					minDurationFormatted: formatDurationDHM(minDur),
					maxDurationFormatted: formatDurationDHM(maxDur),
					resolutionRate: resolutionRate.toFixed(1) + "%",
				};
			})
			.filter(Boolean)
			.sort((a, b) => (b?.ticketCount || 0) - (a?.ticketCount || 0));
		// --- Agent Monthly Performance ---
		const agentMonthlyPerformance: Record<string, Record<string, number>> = {};
		const allMonths = new Set<string>();
		gridData.forEach((ticket) => {
			if (!ticket?.openTime) return;
			const agentName = ticket.openBy || "Unassigned";
			const dateObj = new Date(ticket.openTime);
			if (isNaN(dateObj.getTime())) return;
			const monthYear = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
			allMonths.add(monthYear);
			if (!agentMonthlyPerformance[agentName]) {
				agentMonthlyPerformance[agentName] = {};
			}
			agentMonthlyPerformance[agentName][monthYear] = (agentMonthlyPerformance[agentName][monthYear] || 0) + 1;
		});

		const sortedMonths = Array.from(allMonths).sort().filter((m) => {
			if (!cutoffStart || !cutoffEnd) return true;
			const [y, mm] = m.split("-");
			const d = new Date(Number(y), Number(mm) - 1, 1);
			return d >= cutoffStart && d <= cutoffEnd;
		});

		const agentMonthlyChartData = sortedMonths.length === 0 ? null : {
			labels: sortedMonths.map(m => { const [y, mon] = m.split("-"); return `${mon}/${y}`; }),
			datasets: Object.entries(agentMonthlyPerformance).map(([agent, data]) => ({
				label: agent,
				data: sortedMonths.map(m => data[m] || 0),
				backgroundColor: "#3b82f6CC", borderColor: "#3b82f6", borderRadius: 6, maxBarThickness: 32,
			})),
		};

		const finalAgentData = {
			agentList: agentAnalyticsDataList,
			summary: {
				totalAgents: agentAnalyticsDataList.length,
				totalResponses: gridData.length,
				avgResponseTime: formatDurationDHM(Object.values(agentPerformance).flatMap(d => d.durations).reduce((a, b, _, arr) => a + b / arr.length, 0)),
				topPerformer: busiestAgent.name,
				activeAgents: agentAnalyticsDataList.length,
				busiestAgentName: busiestAgent.name,
				mostEfficientAgentName: mostEfficientAgent.avg === Infinity ? "N/A" : mostEfficientAgent.name,
				highestResolutionAgentName: highestResolutionAgent.name,
			},
			agentMonthlyChart: agentMonthlyChartData,
		};
		// --- Ticket Analytics ---
		const totalTicks = gridData.length;
		const totalDur = gridData.reduce((acc, t) => acc + (t.duration?.rawHours || 0), 0);
		const closedTicksCount = gridData.filter(isClosedTicket).length;
		const overdueTicksCount = gridData.filter(t => (t.duration?.rawHours || 0) > 24).length;
		const escalatedTicksCount = gridData.filter(t => [t.closeHandling2, t.closeHandling3, t.closeHandling4, t.closeHandling5].some(h => h && h.trim() !== "")).length;

		const complaints: Record<string, number> = {};
		gridData.forEach(t => { const cat = t.category || "Lainnya"; complaints[cat] = (complaints[cat] || 0) + 1; });
		const complaintsLabels = Object.keys(complaints);
		const complaintsValues = Object.values(complaints);
		const complaintColors = ["#3b82f6", "#f59e42", "#22c55e", "#a855f7", "#ef4444", "#fbbf24", "#0ea5e9", "#6366f1", "#ec4899", "#14b8a6", "#eab308", "#f472b6"];

		// --- Classification Analysis ---
		const classificationAnalysis: Record<string, any> = {};
		gridData.forEach(t => {
			if (!t) return;
			const cls = t.classification || "Unclassified";
			const sub = t.subClassification || "Unclassified";
			if (!classificationAnalysis[cls]) {
				classificationAnalysis[cls] = { count: 0, sub: {}, trendlineRaw: {} };
			}
			classificationAnalysis[cls].count++;
			classificationAnalysis[cls].sub[sub] = (classificationAnalysis[cls].sub[sub] || 0) + 1;
			if (t.openTime) {
				const d = new Date(t.openTime);
				if (!isNaN(d.getTime())) {
					const my = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
					classificationAnalysis[cls].trendlineRaw[my] = (classificationAnalysis[cls].trendlineRaw[my] || 0) + 1;
				}
			}
		});

		Object.values(classificationAnalysis).forEach(ca => {
			const keys = Object.keys(ca.trendlineRaw).sort();
			ca.trendline = { labels: keys.map(k => k.split("-")[1] + "/" + k.split("-")[0]), data: keys.map(k => ca.trendlineRaw[k]) };
			if (ca.trendline.data.length >= 2) {
				const p = ca.trendline.data[ca.trendline.data.length - 2];
				const curr = ca.trendline.data[ca.trendline.data.length - 1];
				ca.trendPercent = p === 0 ? null : ((curr - p) / p) * 100;
			}
			delete ca.trendlineRaw;
		});

		// --- Monthly Ticket Statistics ---
		const monthlyStats: Record<string, { incoming: number; closed: number }> = {};
		gridData.forEach(t => {
			if (!t.openTime) return;
			const d = new Date(t.openTime);
			if (isNaN(d.getTime())) return;
			const my = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			if (!monthlyStats[my]) monthlyStats[my] = { incoming: 0, closed: 0 };
			monthlyStats[my].incoming++;
			if (t.status === "Closed") monthlyStats[my].closed++;
		});

		const sMonthlyKeys = Object.keys(monthlyStats).sort();
		const monthlyStatsChartData = {
			labels: sMonthlyKeys.map(k => k.split("-")[1] + "/" + k.split("-")[0]),
			datasets: [
				{ label: "Incoming", data: sMonthlyKeys.map(k => monthlyStats[k].incoming), borderColor: "#3b82f6", backgroundColor: "#3b82f680" },
				{ label: "Closed", data: sMonthlyKeys.map(k => monthlyStats[k].closed), borderColor: "#22c55e", backgroundColor: "#22c55e80" }
			]
		};

		// --- Ticket Insights ---
		const busiestMonth = sMonthlyKeys.length ? { month: sMonthlyKeys[0], count: monthlyStats[sMonthlyKeys[0]].incoming } : { month: "N/A", count: 0 };
		const topComplaintCat = complaintsLabels.length ? complaintsLabels[0] : "N/A";
		const topComplaintCount = complaintsLabels.length ? complaintsValues[0] as number : 0;
		const topComplaint = { category: topComplaintCat, count: topComplaintCount, percentage: Math.round(topComplaintCount / (totalTicks || 1) * 100) };

		const topComplaintsTableData = Object.entries(complaints).map(([cat, count]) => ({
			category: cat, count, avgDuration: 0, avgDurationFormatted: "0", impactScore: count, topSubCategory: "-"
		})).sort((a, b) => b.count - a.count).slice(0, 10);

		const allDescriptions = gridData.map((t) => t.description).filter(Boolean);
		const keywordAnalysis = analyzeKeywords(allDescriptions, 20);

		// --- Repeat-Complainer Class Calculation ---
		// 1. Agregasi jumlah tiket per customer
		const customerTicketCounts: Record<string, number> = {};
		gridData.forEach((t) => {
			const customer = t.name || t.customerId || "Unknown";
			customerTicketCounts[customer] =
				Number(customerTicketCounts[customer] || 0) + 1;
		});
		const countsArr = Object.values(customerTicketCounts)
			.map((v) => Number(v))
			.filter((v) => !isNaN(v));
		const meanVal =
			countsArr.reduce((a, b) => a + b, 0) / (countsArr.length || 1);
		const stddev = Math.sqrt(
			countsArr.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0) /
			(countsArr.length || 1),
		);
		// 3. Assign class ke setiap customer
		const customerClass: Record<string, string> = {};
		Object.entries(customerTicketCounts).forEach(([customer, countRaw]) => {
			const count = Number(countRaw);
			if (!isNaN(count)) {
				if (count <= meanVal) customerClass[customer] = "Normal";
				else if (count <= meanVal + stddev)
					customerClass[customer] = "Persisten";
				else if (count <= meanVal + 2 * stddev)
					customerClass[customer] = "Kronis";
				else customerClass[customer] = "Ekstrem";
			}
		});
		// 4. Assign repClass ke setiap tiket
		gridData.forEach((t) => {
			const customer = t.name || t.customerId || "Unknown";
			(t as any).repClass = customerClass[customer] || "Normal";
		});

		const ticketAnalyticsData = {
			stats: [
				{ title: "Total Tickets", value: totalTicks.toString(), description: "in selected period" },
				{ title: "Average Duration", value: formatDurationDHM(totalTicks ? totalDur / totalTicks : 0), description: "avg resolution time" },
				{ title: "Closed Tickets", value: closedTicksCount.toString(), description: `${((closedTicksCount / totalTicks || 0) * 100).toFixed(0)}% resolution` },
				{ title: "Open", value: (totalTicks - closedTicksCount).toString(), description: "Still active" },
				{ title: "Overdue", value: overdueTicksCount.toString(), description: "> 24h duration" },
				{ title: "Escalated", value: escalatedTicksCount.toString(), description: "Multi-handling" },
				{ title: "Active Agents", value: agentAnalyticsDataList.length.toString(), description: "handling tickets" },
			],
			complaintsData: {
				labels: complaintsLabels,
				datasets: [{
					label: "Complaints",
					data: complaintsValues,
					backgroundColor: complaintsLabels.map((_, i) => complaintColors[i % complaintColors.length])
				}]
			},
			classificationAnalysis,
			monthlyStatsChartData,
			busiestMonth,
			topComplaint,
			topComplaintsTableData,
			keywordAnalysis,
		};

		return {
			gridData: filteredTickets,
			kanbanData,
			agentAnalyticsData: finalAgentData,
			ticketAnalyticsData,
		};
	}, [allTickets, cutoffStart, cutoffEnd]);

	// Provider value
	const value = useMemo(() => ({
		...analytics,
		allTickets,
		allMonthsInData,
		allYearsInData,
		startMonth,
		setStartMonth,
		endMonth,
		setEndMonth,
		selectedYear,
		setSelectedYear,
		cutoffStart,
		cutoffEnd,
		refresh: () => setRefreshTrigger((t) => t + 1),
	}), [analytics, allTickets, allMonthsInData, allYearsInData, startMonth, endMonth, selectedYear, cutoffStart, cutoffEnd]);

	return (
		<AnalyticsContext.Provider value={value}>
			{children}
		</AnalyticsContext.Provider>
	);
};
