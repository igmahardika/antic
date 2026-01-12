import { createContext, useContext, useMemo, useState, useEffect } from "react";
// import { useLiveQuery } from "dexie-react-hooks";
// import { db } from "@/lib/db";
import { cacheService } from "@/services/cacheService";
import { formatDurationDHM } from "@/lib/utils";
import { useAgentStore } from "@/store/agentStore";
import { logger } from "@/lib/logger";

const AgentAnalyticsContext = createContext(null);

export function useAgentAnalytics() {
	const context = useContext(AgentAnalyticsContext);
	if (!context) {
		return {
			agentAnalyticsData: null,
			allTickets: [],
			allMonthsInData: [],
			allYearsInData: [],
			refresh: () => { },
		};
	}
	return context;
}

export const AgentAnalyticsProvider = ({ children }) => {
	// State filter waktu khusus agent
	const [startMonth, setStartMonth] = useState(null);
	const [endMonth, setEndMonth] = useState(null);
	const [selectedYear, setSelectedYear] = useState(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	// Data dari CacheService (MySQL + IndexedDB Cache)
	const [allTickets, setAllTickets] = useState([]);
	useEffect(() => {
		const fetchTickets = async () => {
			try {
				const tickets = await cacheService.getTickets();
				setAllTickets(tickets);
				logger.info("[DEBUG] allTickets fetched via CacheService (Agent):", tickets.length);
			} catch (error) {
				logger.error("[DEBUG] Failed to fetch tickets for agent analytics:", error);
			}
		};
		fetchTickets();
	}, [refreshTrigger]);

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
		if (!cutoffStart || !cutoffEnd || selectedYear === "ALL") return allTickets;
		return allTickets.filter((t) => {
			if (!t.openTime) return false;
			const d = new Date(t.openTime);
			if (isNaN(d.getTime())) return false;
			return d >= cutoffStart && d <= cutoffEnd;
		});
	}, [allTickets, cutoffStart, cutoffEnd, selectedYear]);

	// --- Agent Analytics ---
	// --- Agent Analytics ---
	const masterAgentList = [
		"Dea Destivica", "Muhammad Lutfi Rosadi", "Stefano Dewa Susanto", "Fajar Juliantono",
		"Priyo Ardi Nugroho", "Fajar Nanda Ismono", "Louis Bayu Krisna Redionando",
		"Bandero Aldi Prasetya", "Hamid Machfudin Sukardi", "Difa' Fathir Aditya", "Zakiyya Wulan Safitri",
	];

	// Consolidate basic agent performance into useMemo
	const agentPerformanceData = useMemo(() => {
		if (!Array.isArray(filteredTickets)) return { agentAnalyticsData: [], summary: null };

		const performance: Record<string, { durations: number[]; closed: number; total: number }> = {};
		masterAgentList.forEach((agent) => {
			performance[agent] = { durations: [], closed: 0, total: 0 };
		});

		filteredTickets.forEach((t) => {
			if (!t) return;
			const validatedDuration = t?.handlingDuration?.rawHours || 0;
			const agentName = t.openBy || "Unassigned";
			if (!performance[agentName]) {
				performance[agentName] = { durations: [], closed: 0, total: 0 };
			}

			// Always increment total tickets for the agent
			performance[agentName].total++;

			if (validatedDuration > 0) performance[agentName].durations.push(validatedDuration);
			if (t.status === "Closed") performance[agentName].closed++;
		});

		let busiestAgent = { name: "N/A", count: 0 };
		let mostEfficientAgent = { name: "N/A", avg: Infinity };
		let highestResolutionAgent = { name: "N/A", rate: 0 };

		const list = Object.entries(performance)
			.map(([agentName, data]) => {
				// Use total assigned tickets as the main count
				const ticketCount = data.total;
				if (ticketCount === 0) return null;

				const closedCount = data.closed;
				const resolutionRate = (closedCount / ticketCount) * 100;

				// Duration stats depend only on tickets with valid duration
				const durationCount = data.durations.length;
				let avgDuration = 0;
				let minDuration = 0;
				let maxDuration = 0;
				let totalDuration = 0;

				if (durationCount > 0) {
					totalDuration = data.durations.reduce((acc, curr) => acc + curr, 0);
					avgDuration = totalDuration / durationCount;
					minDuration = data.durations.reduce((min, v) => (v < min ? v : min), data.durations[0]);
					maxDuration = data.durations.reduce((max, v) => (v > max ? v : max), data.durations[0]);
				}

				if (ticketCount > busiestAgent.count) busiestAgent = { name: agentName, count: ticketCount };
				// Efficiency is only valid if they have duration data
				if (durationCount > 0 && avgDuration < mostEfficientAgent.avg) mostEfficientAgent = { name: agentName, avg: avgDuration };
				if (resolutionRate > highestResolutionAgent.rate) highestResolutionAgent = { name: agentName, rate: resolutionRate };

				return {
					agentName,
					ticketCount, // This now reflects accurate TOTAL tickets
					totalDurationFormatted: formatDurationDHM(totalDuration),
					avgDurationFormatted: formatDurationDHM(avgDuration),
					minDurationFormatted: formatDurationDHM(minDuration),
					maxDurationFormatted: formatDurationDHM(maxDuration),
					closedCount,
					closedPercent: resolutionRate.toFixed(1),
					resolutionRate: resolutionRate.toFixed(1) + "%",
				};
			})
			.filter(Boolean)
			.sort((a, b) => (b?.ticketCount || 0) - (a?.ticketCount || 0));

		return {
			agentAnalyticsData: list,
			summary: {
				totalAgents: list.length,
				busiestAgentName: busiestAgent.name,
				mostEfficientAgentName: mostEfficientAgent.name,
				highestResolutionAgentName: highestResolutionAgent.name,
			},
		};
	}, [filteredTickets]);

	const { agentAnalyticsData, summary } = agentPerformanceData;

	useEffect(() => {
		if (allTickets && allTickets.length > 0) {
			logger.info("[DEBUG][AgentAnalyticsContext] allTickets:", allTickets);
			// Tambahan debug: cek field penting
			const withOpenBy = allTickets.filter((t) => t.openBy);
			const withHandlingDuration = allTickets.filter(
				(t) => t.handlingDuration && t.handlingDuration.rawHours > 0,
			);
			const valid = allTickets.filter(
				(t) =>
					t.openBy && t.handlingDuration && t.handlingDuration.rawHours > 0,
			);
			const invalid = allTickets.filter(
				(t) =>
					!t.openBy || !t.handlingDuration || t.handlingDuration.rawHours === 0,
			);
			logger.info(
				`[DEBUG][AgentAnalyticsContext] Jumlah tiket: ${allTickets.length}`,
			);
			logger.info(
				`[DEBUG][AgentAnalyticsContext] Tiket dengan openBy: ${withOpenBy.length}`,
			);
			logger.info(
				`[DEBUG][AgentAnalyticsContext] Tiket dengan handlingDuration: ${withHandlingDuration.length}`,
			);
			logger.info(
				`[DEBUG][AgentAnalyticsContext] Tiket valid untuk agent analytics: ${valid.length}`,
			);
			if (invalid.length > 0) {
				logger.warn(
					"[DEBUG][AgentAnalyticsContext] Contoh tiket tidak valid:",
					invalid.slice(0, 3),
				);
			}
		}
	}, [allTickets]);

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

	useEffect(() => {
		if (Array.isArray(agentAnalyticsData) && agentAnalyticsData.length === 0) {
			logger.warn(
				"[DEBUG][AgentAnalyticsContext] Tidak ada data agent untuk filter ini.",
			);
		}
	}, [agentAnalyticsData]);

	// --- Agent Monthly Processing ---
	const agentMonthlyChartData = useMemo(() => {
		if (!Array.isArray(filteredTickets)) return null;

		const monthlyPerformance: Record<string, Record<string, number>> = {};
		const monthlyFRT: Record<string, Record<string, number[]>> = {};
		const monthlyART: Record<string, Record<string, number[]>> = {};
		const monthlyFCR: Record<string, Record<string, number[]>> = {};
		const monthlySLA: Record<string, Record<string, number[]>> = {};
		const monthlyBacklog: Record<string, Record<string, number>> = {};
		const totalTicketsPerMonth: Record<string, number> = {};
		const allMonths = new Set<string>();

		filteredTickets.forEach((t) => {
			if (!t?.openTime) return;
			const agentName = t.openBy || "Unassigned";
			const dateObj = new Date(t.openTime);
			if (isNaN(dateObj.getTime())) return;
			const monthYear = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
			allMonths.add(monthYear);

			// Monthly count
			if (!monthlyPerformance[agentName]) monthlyPerformance[agentName] = {};
			monthlyPerformance[agentName][monthYear] = (monthlyPerformance[agentName][monthYear] || 0) + 1;
			totalTicketsPerMonth[monthYear] = (totalTicketsPerMonth[monthYear] || 0) + 1;

			// KPI metrics
			const closePen = t.closeHandling ? new Date(t.closeHandling) : null;
			const close = t.closeTime ? new Date(t.closeTime) : null;
			const frt = (closePen && !isNaN(closePen.getTime())) ? (closePen.getTime() - dateObj.getTime()) / 60000 : 0;
			const art = (close && !isNaN(close.getTime())) ? (close.getTime() - dateObj.getTime()) / 60000 : 0;
			const fcr = !t.handling2 ? 100 : 0;
			const sla = art > 0 && art <= 1440 ? 100 : 0;

			const updateMetric = (metricMap: Record<string, Record<string, number[]>>, val: number) => {
				if (!metricMap[agentName]) metricMap[agentName] = {};
				if (!metricMap[agentName][monthYear]) metricMap[agentName][monthYear] = [];
				metricMap[agentName][monthYear].push(val);
			};

			updateMetric(monthlyFRT, Math.max(0, frt));
			updateMetric(monthlyART, Math.max(0, art));
			updateMetric(monthlyFCR, fcr);
			updateMetric(monthlySLA, sla);

			// Backlog (status open ticket and no closeTime)
			const status = t.status?.trim()?.toLowerCase() || "";
			if (status === "open ticket" && !t.closeTime) {
				if (!monthlyBacklog[agentName]) monthlyBacklog[agentName] = {};
				monthlyBacklog[agentName][monthYear] = (monthlyBacklog[agentName][monthYear] || 0) + 1;
			}
		});

		const sortedMonths = Array.from(allMonths).sort().filter((month) => {
			if (!cutoffStart || !cutoffEnd) return true;
			const [year, m] = month.split("-");
			const d = new Date(Number(year), Number(m) - 1, 1);
			return d >= cutoffStart && d <= cutoffEnd;
		});

		if (sortedMonths.length === 0) return null;

		const w1 = 0.4, w2 = 0.4, w3 = 0.2; //Weights
		const mapToDataset = (metricMap: Record<string, Record<string, number[] | number>>) =>
			Object.entries(metricMap).map(([agentName, data]) => ({
				label: agentName,
				data: sortedMonths.map((m) => {
					const val = data[m];
					if (Array.isArray(val)) return val.length ? val.reduce((a, b) => a + b, 0) / val.length : 0;
					return val || 0;
				}),
			}));

		const agentMonthlyScoreRaw: Record<string, Record<string, number>> = {};
		Object.keys(monthlyPerformance).forEach((agent) => {
			agentMonthlyScoreRaw[agent] = {};
			sortedMonths.forEach((m) => {
				const fcrArr = monthlyFCR[agent]?.[m] || [];
				const slaArr = monthlySLA[agent]?.[m] || [];
				const artArr = monthlyART[agent]?.[m] || [];
				const fcrAvg = fcrArr.length ? fcrArr.reduce((a, b) => a + b, 0) / fcrArr.length : 0;
				const slaAvg = slaArr.length ? slaArr.reduce((a, b) => a + b, 0) / slaArr.length : 0;
				const artAvg = artArr.length ? artArr.reduce((a, b) => a + b, 0) / artArr.length : 0;
				const score = Math.max(0, Math.min(100, Math.round(w1 * fcrAvg + w2 * slaAvg - w3 * (Math.min(artAvg, 1440) / 1440 * 100))));
				agentMonthlyScoreRaw[agent][m] = score;
			});
		});

		return {
			labels: sortedMonths.map(m => { const [y, mon] = m.split("-"); return `${mon}/${y}`; }),
			datasets: Object.entries(monthlyPerformance).map(([agent, data]) => ({
				label: agent,
				data: sortedMonths.map(m => data[m] || 0),
				backgroundColor: "#3b82f6CC", borderColor: "#3b82f6", borderRadius: 6, maxBarThickness: 32,
			})),
			datasetsFRT: mapToDataset(monthlyFRT),
			datasetsART: mapToDataset(monthlyART),
			datasetsFCR: mapToDataset(monthlyFCR),
			datasetsSLA: mapToDataset(monthlySLA),
			datasetsBacklog: mapToDataset(monthlyBacklog),
			datasetsScore: mapToDataset(agentMonthlyScoreRaw as any),
			totalTicketsPerMonth: sortedMonths.map(m => totalTicketsPerMonth[m] || 0),
		};
	}, [filteredTickets, cutoffStart, cutoffEnd]);

	const agentMonthlyChart = agentMonthlyChartData;

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

	// --- Tambahan: summary dan agentList agar sesuai ekspektasi AgentAnalytics.tsx ---
	const agentList = agentAnalyticsData || [];

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

	const setAgentMetrics = useAgentStore((state) => state.setAgentMetrics);
	useEffect(() => {
		if (filteredTickets && filteredTickets.length > 0) {
			setAgentMetrics(filteredTickets.map(mapTicketFieldsForAgentKpi));
		} else {
			setAgentMetrics([]);
		}
	}, [filteredTickets, setAgentMetrics]);

	return (
		<AgentAnalyticsContext.Provider value={value}>
			{children}
		</AgentAnalyticsContext.Provider>
	);
};
