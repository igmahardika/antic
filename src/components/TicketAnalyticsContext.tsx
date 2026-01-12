import {
	createContext,
	useContext,
	useMemo,
	useState,
	useEffect,
} from "react";
// import { useLiveQuery } from "dexie-react-hooks";
import { cacheService } from "@/services/cacheService";
import { ITicket } from "@/lib/db";
import {
	formatDurationDHM,
	analyzeKeywords,
} from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
	isOpenTicket,
	isClosedTicket
} from "@/utils/ticketStatus";

const TicketAnalyticsContext = createContext(null);

export function useTicketAnalytics() {
	const context = useContext(TicketAnalyticsContext);
	if (!context) {
		return {
			gridData: [],
			ticketAnalyticsData: null,
			allTickets: [],
			allMonthsInData: [],
			allYearsInData: [],
			refresh: () => { },
		};
	}
	return context;
}

export const TicketAnalyticsProvider = ({ children }) => {
	// State filter waktu khusus ticket
	const [startMonth, setStartMonth] = useState(null);
	const [endMonth, setEndMonth] = useState(null);
	const [selectedYear, setSelectedYear] = useState(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	// Data dari CacheService (MySQL + IndexedDB Cache)
	const [allTickets, setAllTickets] = useState<ITicket[]>([]);

	useEffect(() => {
		const fetchTickets = async () => {
			try {
				const tickets = await cacheService.getTickets();
				setAllTickets(tickets as any as ITicket[]);
				logger.info("[DEBUG] allTickets fetched via CacheService:", tickets.length);
			} catch (error) {
				logger.error("[DEBUG] Failed to fetch tickets:", error);
			}
		};
		fetchTickets();
	}, [refreshTrigger]);

	// Set default filter waktu otomatis jika belum dipilih dan data tersedia
	useEffect(() => {
		if (
			allTickets &&
			allTickets.length > 0 &&
			(!startMonth || !endMonth || !selectedYear)
		) {
			const dates = allTickets
				.map((t) => t.openTime)
				.filter(Boolean);
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
	}, [allTickets, startMonth, endMonth, selectedYear]);

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
			const [ma, ya] = String(a).split("/");
			const [mb, yb] = String(b).split("/");
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

	// Filter tiket sesuai waktu
	const filteredTickets = useMemo(() => {
		if (!allTickets) return [];
		if (selectedYear === "ALL") return allTickets;
		if (!cutoffStart || !cutoffEnd) return allTickets;
		return allTickets.filter((t) => {
			if (!t.openTime) return false;
			const d = new Date(t.openTime);
			if (isNaN(d.getTime())) return false;
			return d >= cutoffStart && d <= cutoffEnd;
		});
	}, [allTickets, cutoffStart, cutoffEnd, selectedYear]);

	// --- Ticket Analytics ---
	// --- Ticket Analytics Processing ---
	const ticketAnalyticsData = useMemo(() => {
		if (!Array.isArray(filteredTickets)) {
			return {
				stats: [],
				complaintsData: { labels: [], datasets: [] },
				classificationAnalysis: {},
				monthlyStatsChartData: { labels: [], datasets: [] },
				topComplaintsTableData: [],
				busiestMonth: { month: "N/A", count: 0 },
				topComplaint: { category: "N/A", count: 0, percentage: 0 },
				keywordAnalysis: [],
			};
		}

		const gridData = filteredTickets;
		const totalTickets = gridData.length;
		const totalDuration = gridData
			.map((t) => Number(t?.duration?.rawHours || 0))
			.filter((v) => !isNaN(v))
			.reduce((acc, curr) => acc + curr, 0);

		const closedTickets = gridData.filter(isClosedTicket).length;
		const openTicketsArray = gridData.filter(isOpenTicket);
		const openTickets = openTicketsArray.length;

		const finalOpenTickets =
			closedTickets === 0 && openTickets === 0
				? gridData.filter((t) => {
					if (!t) return false;
					const status = (t.status || "").trim().toLowerCase();
					return !(
						status === "closed" ||
						status === "close ticket" ||
						status === "close"
					);
				}).length
				: openTickets;

		const overdueTickets = gridData.filter(
			(t) => t && Number(t.duration?.rawHours) > 24,
		).length;
		const escalatedTickets = gridData.filter((t) => {
			if (!t) return false;
			return [
				t.closeHandling2,
				t.closeHandling3,
				t.closeHandling4,
				t.closeHandling5,
			].some((h) => h && h.trim() !== "");
		}).length;

		// Complaints data
		const complaints: Record<string, number> = {};
		gridData.forEach((t) => {
			const category = t?.category || "Lainnya";
			complaints[category] = (complaints[category] || 0) + 1;
		});
		const complaintColors = [
			"#3b82f6", "#f59e42", "#22c55e", "#a855f7", "#ef4444",
			"#fbbf24", "#0ea5e9", "#6366f1", "#ec4899", "#14b8a6",
			"#eab308", "#f472b6",
		];
		const complaintsLabels = Object.keys(complaints);
		const complaintsValues = Object.values(complaints);
		const complaintsData = {
			labels: complaintsLabels,
			datasets: [
				{
					label: "Complaint Count",
					data: complaintsValues,
					backgroundColor: complaintsLabels.map(
						(_, i) => complaintColors[i % complaintColors.length],
					),
					borderWidth: 1,
				},
			],
		};

		// Classification analysis
		const classificationAnalysis: Record<string, any> = {};
		gridData.forEach((t) => {
			if (!t) return;
			const classification = t.classification || "Unclassified";
			const subClassification = t.subClassification || "Unclassified";
			let monthYear = "Unknown";
			if (t.openTime) {
				const d = new Date(t.openTime);
				if (!isNaN(d.getTime())) {
					const mm = String(d.getMonth() + 1).padStart(2, "0");
					const yyyy = d.getFullYear();
					monthYear = `${yyyy}-${mm}`;
				}
			}
			if (!classificationAnalysis[classification]) {
				classificationAnalysis[classification] = {
					count: 0,
					sub: {},
					trendlineRaw: {},
				};
			}
			classificationAnalysis[classification].count++;
			if (!classificationAnalysis[classification].sub[subClassification]) {
				classificationAnalysis[classification].sub[subClassification] = 0;
			}
			classificationAnalysis[classification].sub[subClassification]++;
			if (!classificationAnalysis[classification].trendlineRaw[monthYear]) {
				classificationAnalysis[classification].trendlineRaw[monthYear] = 0;
			}
			classificationAnalysis[classification].trendlineRaw[monthYear]++;
		});

		Object.values(classificationAnalysis).forEach((ca) => {
			if (!ca.trendlineRaw) return;
			const rawKeys = Object.keys(ca.trendlineRaw).sort(
				(a, b) => new Date(a + "-01").getTime() - new Date(b + "-01").getTime(),
			);
			const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			const labels = rawKeys.map((key) => {
				const [yyyy, mm] = key.split("-");
				return `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
			});
			const data = rawKeys.map((l) => ca.trendlineRaw[l]);
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

		// Monthly stats
		const monthNamesIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
		const monthlyStats: Record<string, { incoming: number; open: number }> = {};
		gridData.forEach((ticket) => {
			if (!ticket?.openTime) return;
			try {
				const d = new Date(ticket.openTime);
				if (isNaN(d.getTime())) return;
				const mm = String(d.getMonth() + 1).padStart(2, "0");
				const yyyy = d.getFullYear();
				const monthYear = `${yyyy}-${mm}`;
				if (!monthlyStats[monthYear]) {
					monthlyStats[monthYear] = { incoming: 0, open: 0 };
				}
				monthlyStats[monthYear].incoming++;

				if (!ticket.closeTime) {
					monthlyStats[monthYear].open++;
				} else {
					const closeDate = new Date(ticket.closeTime);
					if (isNaN(closeDate.getTime())) {
						monthlyStats[monthYear].open++;
					} else {
						const now = new Date();
						if (closeDate > now) {
							monthlyStats[monthYear].open++;
						} else {
							const openMonth = d.getMonth();
							const openYear = d.getFullYear();
							const closeMonth = closeDate.getMonth();
							const closeYear = closeDate.getFullYear();
							const monthDiff = (closeYear - openYear) * 12 + (closeMonth - openMonth);

							if (monthDiff > 0) {
								monthlyStats[monthYear].open++;
							} else {
								const daysDiff = (closeDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
								if (daysDiff > 30) monthlyStats[monthYear].open++;
							}
						}
					}
				}
			} catch { }
		});

		const sortedMonthlyKeys = Object.keys(monthlyStats).sort(
			(a, b) => new Date(a + "-01").getTime() - new Date(b + "-01").getTime(),
		);
		const monthlyStatsChartData = {
			labels: sortedMonthlyKeys.map((key) => {
				const [yyyy, mm] = key.split("-");
				const monthName = monthNamesIndo[parseInt(mm, 10) - 1] || mm;
				return `${monthName} ${yyyy}`;
			}),
			datasets: [
				{
					label: "Closed",
					data: sortedMonthlyKeys.map((key) => monthlyStats[key].incoming - monthlyStats[key].open),
					borderColor: "rgb(236, 72, 153)",
					backgroundColor: "rgba(236, 72, 153, 0.5)",
				},
				{
					label: "Incoming",
					data: sortedMonthlyKeys.map((key) => monthlyStats[key].incoming),
					borderColor: "rgb(99, 102, 241)",
					backgroundColor: "rgba(99, 102, 241, 0.5)",
				},
			],
		};

		// Top complaints table
		const categoryDetails: Record<string, any> = {};
		gridData.forEach((t) => {
			if (!t) return;
			const category = t.category || "Lainnya";
			if (!categoryDetails[category]) {
				categoryDetails[category] = { tickets: [], subCategories: {} };
			}
			categoryDetails[category].tickets.push(t);
			const subCategory = t.subClassification || "Lainnya";
			categoryDetails[category].subCategories[subCategory] = (categoryDetails[category].subCategories[subCategory] || 0) + 1;
		});

		const topComplaintsTableData = Object.entries(categoryDetails)
			.map(([category, data]) => {
				const totalDur = data.tickets
					.map((t) => Number(t?.duration?.rawHours || 0))
					.filter((v) => !isNaN(v))
					.reduce((acc, curr) => acc + curr, 0);
				const avgDuration = data.tickets.length > 0 ? totalDur / data.tickets.length : 0;
				const impactScore = data.tickets.length * avgDuration;
				const topSubCategory = Object.keys(data.subCategories).length > 0
					? Object.entries(data.subCategories).sort(([, a], [, b]) => (b as number) - (a as number))[0][0]
					: "-";
				return { category, count: data.tickets.length, avgDuration, avgDurationFormatted: formatDurationDHM(avgDuration), impactScore, topSubCategory };
			})
			.sort((a, b) => b.impactScore - a.impactScore)
			.slice(0, 10);

		// Insights
		let busiestMonth = { month: "N/A", count: 0 };
		if (monthlyStatsChartData.labels.length > 0) {
			const counts = monthlyStatsChartData.datasets[1].data;
			const maxCount = counts.reduce((max, v) => (v > max ? v : max), counts[0] || 0);
			const maxIndex = counts.indexOf(maxCount);
			busiestMonth = { month: monthlyStatsChartData.labels[maxIndex] || "N/A", count: maxCount };
		}

		let topComplaint = { category: "N/A", count: 0, percentage: 0 };
		if (complaintsLabels.length > 0) {
			const total = complaintsValues.reduce((a, b) => a + b, 0);
			const maxCount = complaintsValues.reduce((max, v) => (v > max ? v : max), complaintsValues[0] || 0);
			const maxIndex = complaintsValues.indexOf(maxCount);
			topComplaint = {
				category: complaintsLabels[maxIndex] || "N/A",
				count: maxCount,
				percentage: total > 0 ? Math.round((maxCount / total) * 100) : 0,
			};
		}

		const texts = gridData.map((t) => t?.description || "");
		const keywordAnalysis = analyzeKeywords(texts, 15);

		return {
			stats: [
				{ title: "Total Tickets", value: totalTickets.toString(), description: "in selected period" },
				{ title: "Average Duration", value: totalTickets ? formatDurationDHM(totalDuration / totalTickets) : "00:00:00", description: "average resolution time" },
				{ title: "Closed Tickets", value: closedTickets.toString(), description: `${((closedTickets / totalTickets || 0) * 100).toFixed(0)}% resolution rate` },
				{ title: "Open", value: finalOpenTickets.toString(), description: "currently open tickets" },
				{ title: "Overdue", value: overdueTickets.toString(), description: "exceeding 24h limit" },
				{ title: "Escalated", value: escalatedTickets.toString(), description: "with multiple handlers" },
			],
			complaintsData,
			classificationAnalysis,
			monthlyStatsChartData,
			topComplaintsTableData,
			busiestMonth,
			topComplaint,
			keywordAnalysis,
		};
	}, [filteredTickets]);

	// Menentukan tiket closed/open (hanya untuk log, data asli ada di ticketAnalyticsData)
	useEffect(() => {
		if (filteredTickets.length === 0) {
			logger.warn(
				"[TicketAnalyticsContext] Tidak ada data ticket untuk filter ini.",
			);
		} else {
			logger.info("[TicketAnalyticsContext] Loaded tickets via useMemo:", {
				total: filteredTickets.length,
				filter: { startMonth, endMonth, selectedYear },
			});
		}
	}, [filteredTickets, startMonth, endMonth, selectedYear]);

	// Provider value
	const value = {
		gridData: filteredTickets,
		ticketAnalyticsData,
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
	};

	return (
		<TicketAnalyticsContext.Provider value={value}>
			{children}
		</TicketAnalyticsContext.Provider>
	);
};
