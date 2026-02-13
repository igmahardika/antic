import React, { useMemo, useState } from "react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	Legend as RechartsLegend,
	ResponsiveContainer,
	BarChart,
	Bar,
	LineChart,
	Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SummaryCard from "@/components/ui/SummaryCard";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/ui/PageHeader";
import { formatDurationDHM } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { WorkloadSection } from "@/components/workload";

// MUI Icons for consistency with project standards
import FlashOnIcon from "@mui/icons-material/FlashOn";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupIcon from "@mui/icons-material/Group";
import TimerIcon from "@mui/icons-material/Timer";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WarningIcon from "@mui/icons-material/Warning";
import ScienceIcon from "@mui/icons-material/Science";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import {
	sanitizeTickets,
	calcAllMetrics,
	Ticket as AgentTicket,
	rank as rankBand,
} from "@/utils/agentKpi";
// import { useLiveQuery } from "dexie-react-hooks";
// import { db } from "@/lib/db";
import { calculateIncidentStats, normalizeNCAL } from "@/utils/incidentUtils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getAgentPhotoPath } from "@/utils/photoUtils";

const SummaryDashboard = ({
	ticketAnalyticsData,
	filteredTickets,
	standalone = false,
}: any) => {
	// Get incident data for comprehensive dashboard
	const [allIncidents, setAllIncidents] = useState<any[]>([]);

	React.useEffect(() => {
		const fetchIncidents = async () => {
			try {
				const { cacheService } = await import("@/services/cacheService");
				const data = await cacheService.getIncidents();
				setAllIncidents(data);
			} catch (error) {
				console.error("Failed to fetch incidents in SummaryDashboard:", error);
			}
		};
		fetchIncidents();
	}, []);

	// Prepare monthly data
	const monthlyStatsData = ticketAnalyticsData?.monthlyStatsData;
	const stats = ticketAnalyticsData?.stats || [];

	// Incident statistics
	const incidentStats = useMemo(() => {
		if (!allIncidents || allIncidents.length === 0) {
			return {
				total: 0,
				open: 0,
				closed: 0,
				avgDuration: 0,
				ncalCompliance: 0,
				vendorPerformance: 0,
				siteReliability: 0,
			};
		}

		const stats = calculateIncidentStats(allIncidents);
		const total = stats.total;
		const closed = stats.closed;
		const open = stats.open;

		// Calculate NCAL compliance
		const ncalCompliant = allIncidents.filter((inc) => {
			const ncal = normalizeNCAL(inc.ncal);
			const duration = inc.durationMin || 0;
			const targets = { NCAL1: 60, NCAL2: 120, NCAL3: 240, NCAL4: 480 };
			return duration <= (targets[ncal] || 240);
		}).length;

		const ncalCompliance = total > 0 ? (ncalCompliant / total) * 100 : 0;

		// Calculate vendor performance
		const vendorIncidents = allIncidents.filter(
			(inc) =>
				(inc.ts || "").toLowerCase().includes("waneda") ||
				(inc.ts || "").toLowerCase().includes("lintas") ||
				(inc.ts || "").toLowerCase().includes("fiber"),
		);
		const vendorSLA = vendorIncidents.filter((inc) => {
			const duration = inc.durationMin || 0;
			return duration <= 240; // 4 hours SLA
		}).length;
		const vendorPerformance =
			vendorIncidents.length > 0
				? (vendorSLA / vendorIncidents.length) * 100
				: 0;

		// Calculate site reliability
		const siteGroups = allIncidents.reduce(
			(acc, inc) => {
				const site = inc.site || "Unknown";
				if (!acc[site]) acc[site] = [];
				acc[site].push(inc);
				return acc;
			},
			{} as Record<string, any[]>,
		);

		const siteReliabilityScores = Object.values(siteGroups).map((incidents: any[]) => {
			const resolved = incidents.filter(
				(inc) => inc.status?.toLowerCase() === "done",
			).length;
			return incidents.length > 0 ? (resolved / incidents.length) * 100 : 0;
		});

		const siteReliability =
			siteReliabilityScores.length > 0
				? siteReliabilityScores.reduce((a, b) => a + b, 0) /
				siteReliabilityScores.length
				: 0;

		return {
			total,
			open,
			closed,
			avgDuration: stats.avgDuration,
			ncalCompliance,
			vendorPerformance,
			siteReliability,
		};
	}, [allIncidents]);

	// Derived KPIs - Konsisten dengan TicketAnalytics
	const kpis = useMemo(() => {
		const total = filteredTickets?.length || 0;

		// Closed tickets: status yang mengandung 'close' (konsisten dengan TicketAnalytics)
		const closed = (filteredTickets || []).filter((t: any) => {
			const status = (t.status || "").trim().toLowerCase();
			return status.includes("close");
		}).length;

		const closedRate =
			total > 0 ? ((closed / total) * 100).toFixed(1) + "%" : "0%";

		// SLA: close within 24h (1440 minutes) - based on closeHandling
		const slaClosed = (filteredTickets || []).filter((t: any) => {
			if (!t.openTime || !t.closeHandling) return false;
			const d1 = new Date(t.openTime);
			const d2 = new Date(t.closeHandling);
			if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
			const diffMin = Math.abs(d2.getTime() - d1.getTime()) / 60000;
			return diffMin <= 1440;
		}).length;
		const slaPct =
			total > 0 ? ((slaClosed / total) * 100).toFixed(1) + "%" : "0%";

		// FRT/ART average in minutes (konsisten dengan AgentAnalytics)
		const frtVals: number[] = [];
		const artVals: number[] = [];
		(filteredTickets || []).forEach((t: any) => {
			// FRT: closeHandling1 - WaktuOpen (First Response Time)
			if (t.openTime && t.closeHandling1) {
				const a = new Date(t.openTime);
				const b = new Date(t.closeHandling1);
				if (
					!isNaN(a.getTime()) &&
					!isNaN(b.getTime()) &&
					b.getTime() >= a.getTime()
				) {
					frtVals.push((b.getTime() - a.getTime()) / 60000);
				}
			}
			// ART: closeHandling - WaktuOpen (Average Resolution Time)
			if (t.openTime && t.closeHandling) {
				const a = new Date(t.openTime);
				const b = new Date(t.closeHandling);
				if (
					!isNaN(a.getTime()) &&
					!isNaN(b.getTime()) &&
					b.getTime() >= a.getTime()
				) {
					artVals.push((b.getTime() - a.getTime()) / 60000);
				}
			}
		});
		const avg = (arr: number[]) =>
			arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
		const frtAvg = avg(frtVals);
		const artAvg = avg(artVals);

		// Backlog: tiket yang tidak closed dan tidak ada closeTime
		const backlog = (filteredTickets || []).filter((t: any) => {
			const status = (t.status || "").trim().toLowerCase();
			return !status.includes("close") && !t.closeTime;
		}).length;

		return { total, closed, closedRate, slaPct, frtAvg, artAvg, backlog };
	}, [filteredTickets]);

	// State for year filter
	const [selectedYear, setSelectedYear] = useState<string>("All Years");
	const [availableYears, setAvailableYears] = useState<string[]>([]);

	// Fetch available years from API
	React.useEffect(() => {
		const fetchYears = async () => {
			try {
				const { ticketAPI } = await import("@/lib/api");
				const { years } = await ticketAPI.getTicketYears();
				if (Array.isArray(years)) {
					setAvailableYears(years.map(String));
				}
			} catch (error) {
				console.error("Failed to fetch ticket years:", error);
				// Fallback to default years if API fails
				setAvailableYears(["2026", "2025", "2024"]);
			}
		};
		fetchYears();
	}, []);

	// Filter monthly data for selected year
	const filteredMonthlyStatsData = useMemo(() => {
		if (!monthlyStatsData || !monthlyStatsData.labels || selectedYear === "All Years")
			return monthlyStatsData;

		// Find indices for selected year
		const indices = monthlyStatsData.labels
			.map((label: string, idx: number) => (label.endsWith(selectedYear) ? idx : -1))
			.filter((idx: number) => idx !== -1);

		if (indices.length === 0) return null;

		return {
			labels: indices.map((idx: number) =>
				monthlyStatsData.labels[idx].replace(" " + selectedYear, ""),
			),
			datasets: monthlyStatsData.datasets.map((ds: any) => ({
				...ds,
				data: indices.map((idx: number) => ds.data[idx]),
			})),
		};
	}, [monthlyStatsData, selectedYear]);

	// Prepare yearly data by aggregating monthlyStatsData
	const yearlyStatsData = useMemo(() => {
		if (
			!monthlyStatsData ||
			!monthlyStatsData.labels ||
			!monthlyStatsData.datasets
		)
			return null;
		// Extract year from each label (format: 'Month YYYY')
		const yearMap = {};
		monthlyStatsData.labels.forEach((label, idx) => {
			const year = label.split(" ").pop();
			if (!yearMap[year]) yearMap[year] = [];
			yearMap[year].push(idx);
		});
		const years = Object.keys(yearMap).sort((a, b) => parseInt(a) - parseInt(b));
		const datasets = monthlyStatsData.datasets.map((ds) => ({
			...ds,
			data: years.map((year) =>
				yearMap[year].reduce((sum, idx) => sum + (ds.data[idx] || 0), 0),
			),
			backgroundColor: ds.backgroundColor,
			borderColor: ds.borderColor,
			label: ds.label,
		}));
		return {
			labels: years,
			datasets,
		};
	}, [monthlyStatsData]);

	// Agent leaderboard by year (computed from filteredTickets)
	// Agent leaderboard by year (computed from filteredTickets)
	// Logic to filter agents based on selectedYear
	const agentLeaderboard = useMemo(() => {
		// Use selectedYear directly instead of agentYear
		// If All Years, we don't filter by year
		const targetYear = selectedYear === "All Years" ? null : selectedYear;

		const raw: AgentTicket[] = (
			Array.isArray(filteredTickets) ? filteredTickets : []
		)
			.filter((t: any) => {
				if (!t.openTime) return false;
				if (!targetYear) return true; // Include all if "All Years"

				const d = new Date(t.openTime);
				return (
					!isNaN(d.getTime()) && String(d.getFullYear()) === String(targetYear)
				);
			})
			.map((t: any) => ({
				ticket_id: String(t.id || ""),
				WaktuOpen: t.openTime,
				WaktuCloseTicket: t.closeTime,
				ClosePenanganan: t.closeHandling,
				closeHandling: t.closeHandling, // For ART calculation
				closeHandling1: t.closeHandling1, // For FRT calculation
				Penanganan2: t.handling2,
				OpenBy: t.openBy || t.name || "Unknown",
				status: t.status,
			}));
		const sanitized = sanitizeTickets(raw);
		const metrics = calcAllMetrics(sanitized);

		// Debug logging for FRT/ART calculation
		if (metrics.length > 0) {
			logger.info("[SummaryDashboard] Agent metrics sample:", {
				agent: metrics[0].agent,
				frt: metrics[0].frt,
				art: metrics[0].art,
				vol: metrics[0].vol,
				hasCloseHandling: raw.some(t => t.closeHandling),
				hasCloseHandling1: raw.some(t => t.closeHandling1),
				totalTickets: raw.length
			});
		}

		// Gunakan perhitungan score yang sama dengan AgentAnalytics
		const maxTicket = metrics.length > 0
			? metrics.reduce((max, m) => (m.vol || 0) > max ? (m.vol || 0) : max, 0)
			: 1;

		function normalizePositive(actual: number, target: number) {
			return Math.min((actual / target) * 100, 120);
		}
		function normalizeNegative(actual: number, target: number) {
			if (!actual) return 0;
			return Math.min((target / actual) * 100, 120);
		}
		function scoreBacklog(backlog: number) {
			if (backlog === 0) return 100;
			if (backlog <= 10) return Math.max(100 - backlog * 5, 0);
			return 0;
		}
		function scoreTicket(ticket: number, maxTicket: number) {
			if (!maxTicket) return 100;
			return Math.min((ticket / maxTicket) * 100, 120);
		}
		function calculateAgentScore(agent: any, maxTicket: number) {
			const fcrScore = normalizePositive(agent.fcr, 75) * 0.3;
			const slaScore = normalizePositive(agent.sla, 85) * 0.25;
			const frtScore = normalizeNegative(agent.frt, 120) * 0.15; // Target 120 minutes (updated from 60)
			const artScore = normalizeNegative(agent.art, 1440) * 0.15; // Target 1440 minutes
			const backlogScore = scoreBacklog(agent.backlog) * 0.05;
			const ticketScore = scoreTicket(agent.vol, maxTicket) * 0.1;
			return (
				fcrScore + slaScore + frtScore + artScore + backlogScore + ticketScore
			);
		}

		return metrics
			.map((m) => {
				const score = Math.round(calculateAgentScore(m, maxTicket));
				return {
					agent: m.agent,
					tickets: m.vol,
					slaPct: m.sla,
					frtAvg: m.frt,
					artAvg: m.art,
					score: score,
					grade: rankBand(score),
				};
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, 10);
	}, [filteredTickets, selectedYear, availableYears]);

	// Get latest value for badge display
	const latestMonthlyValue = useMemo(() => {
		if (
			!filteredMonthlyStatsData ||
			!filteredMonthlyStatsData.datasets ||
			filteredMonthlyStatsData.datasets.length === 0
		)
			return null;
		const ds = filteredMonthlyStatsData.datasets[0];
		const lastIdx = ds.data.length - 1;
		return typeof ds.data[lastIdx] === "number" ? ds.data[lastIdx] : null;
	}, [filteredMonthlyStatsData]);
	const latestYearlyValue = useMemo(() => {
		if (
			!yearlyStatsData ||
			!yearlyStatsData.datasets ||
			yearlyStatsData.datasets.length === 0
		)
			return null;
		const ds = yearlyStatsData.datasets[0];
		const lastIdx = ds.data.length - 1;
		return typeof ds.data[lastIdx] === "number" ? ds.data[lastIdx] : null;
	}, [yearlyStatsData]);

	// Helper: convert chart.js-like data to recharts format
	function toRechartsData(labels: string[], datasets: any[]) {
		// Assume 2 datasets: [incoming, closed]
		return labels.map((label, i) => ({
			label,
			incoming: datasets[0]?.data[i] ?? 0,
			closed: datasets[1]?.data[i] ?? 0,
		}));
	}


	// Helper: get agent initials for avatar fallback
	function getAgentInitials(agentName: string): string {
		if (!agentName) return "?";
		const names = agentName.split(" ");
		if (names.length >= 2) {
			return (names[0][0] + names[names.length - 1][0]).toUpperCase();
		}
		return agentName[0]?.toUpperCase() || "?";
	}

	// Incident trends data
	const incidentTrendsData = useMemo(() => {
		if (!allIncidents || allIncidents.length === 0) return [];

		const monthlyData = allIncidents.reduce(
			(acc, inc) => {
				if (!inc.startTime) return acc;
				const date = new Date(inc.startTime);
				const month = date.toLocaleString("default", { month: "short" });
				const year = date.getFullYear();
				const key = `${month} ${year}`;

				if (!acc[key])
					acc[key] = {
						month: key,
						incidents: 0,
						resolved: 0,
						avgDuration: 0,
						durations: [],
					};
				acc[key].incidents++;
				acc[key].durations.push(inc.durationMin || 0);

				if (inc.status?.toLowerCase() === "done") {
					acc[key].resolved++;
				}

				return acc;
			},
			{} as Record<string, any>,
		);

		return Object.values(monthlyData)
			.map((item: any) => ({
				...item,
				avgDuration:
					item.durations.length > 0
						? item.durations.reduce((a: number, b: number) => a + b, 0) /
						item.durations.length
						: 0,
				resolutionRate:
					item.incidents > 0 ? (item.resolved / item.incidents) * 100 : 0,
			}))
			.sort((a, b) => {
				// Parse month names to proper dates for sorting
				const monthNames = {
					'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
					'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
				};

				const parseMonth = (monthStr: string) => {
					const [month, year] = monthStr.split(' ');
					const monthNum = monthNames[month as keyof typeof monthNames];
					const yearNum = parseInt(year);
					return new Date(yearNum, monthNum, 1).getTime();
				};

				return parseMonth(a.month) - parseMonth(b.month);
			});
	}, [allIncidents]);

	const content = (
		<div className="space-y-6 lg:space-y-8">
			{/* Custom Background Gradient */}
			<div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-800" />

			<PageHeader
				title="Dashboard"
				description="Comprehensive overview of ticket and incident performance metrics"
			/>

			{/* KPI Row 1 - All Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
				<SummaryCard
					icon={<FlashOnIcon className="w-5 h-5 text-white" />}
					iconBg="bg-indigo-500"
					title="Total Tickets"
					value={stats[0]?.value || "-"}
					description={stats[0]?.description || ""}
				/>
				<SummaryCard
					icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
					iconBg="bg-green-500"
					title="Closed Tickets"
					value={stats[2]?.value || "-"}
					description={stats[2]?.description || "100% resolution rate"}
				/>
				<SummaryCard
					icon={<AccessTimeIcon className="w-5 h-5 text-white" />}
					iconBg="bg-amber-500"
					title="Avg Duration"
					value={
						stats[1]?.value
							? formatDurationDHM(parseFloat(stats[1].value))
							: "-"
					}
					description="average resolution time"
				/>
				<SummaryCard
					icon={<GroupIcon className="w-5 h-5 text-white" />}
					iconBg="bg-sky-500"
					title="Active Agents"
					value={stats[3]?.value || "-"}
					description={stats[3]?.description || "handling tickets"}
				/>
				<SummaryCard
					icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
					iconBg="bg-green-500"
					title="Closed Rate"
					value={`${kpis.closedRate}%`}
					description="closed / total"
				/>
				<SummaryCard
					icon={<TimerIcon className="w-5 h-5 text-white" />}
					iconBg="bg-cyan-500"
					title="SLA ≤ 24h"
					value={`${kpis.slaPct}%`}
					description="percentage closed within 24h"
				/>
			</div>

			{/* KPI Row 2 - All Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
				<SummaryCard
					icon={<TimerIcon className="w-5 h-5 text-white" />}
					iconBg="bg-blue-500"
					title="Avg FRT"
					value={formatDurationDHM(kpis.frtAvg)}
					description="first response time"
				/>
				<SummaryCard
					icon={<TimerIcon className="w-5 h-5 text-white" />}
					iconBg="bg-indigo-500"
					title="Avg ART"
					value={formatDurationDHM(kpis.artAvg)}
					description="resolution time"
				/>
				<SummaryCard
					icon={<WarningIcon className="w-5 h-5 text-white" />}
					iconBg="bg-orange-500"
					title="Total Incidents"
					value={incidentStats.total.toLocaleString()}
					description="network incidents"
				/>
				<SummaryCard
					icon={<ScienceIcon className="w-5 h-5 text-white" />}
					iconBg="bg-purple-500"
					title="NCAL Compliance"
					value={`${incidentStats.ncalCompliance.toFixed(1)}%`}
					description="within SLA targets"
				/>
				<SummaryCard
					icon={<LocationOnIcon className="w-5 h-5 text-white" />}
					iconBg="bg-emerald-500"
					title="Site Reliability"
					value={`${incidentStats.siteReliability.toFixed(1)}%`}
					description="site performance"
				/>
				<SummaryCard
					icon={<TrendingUpIcon className="w-5 h-5 text-white" />}
					iconBg="bg-blue-500"
					title="Vendor Performance"
					value={`${incidentStats.vendorPerformance.toFixed(1)}%`}
					description="vendor SLA compliance"
				/>
			</div>

			{/* Charts Section */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Monthly Ticket Trends */}
				<Card className="p-2">
					<CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-1">
						<div className="flex flex-col gap-1">
							<CardTitle className="font-semibold text-base">
								Tickets per Month
							</CardTitle>
							{latestMonthlyValue !== null && (
								<Badge className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-md w-fit font-semibold">
									Latest: {latestMonthlyValue}
								</Badge>
							)}
						</div>
						<div className="mt-2 md:mt-0">
							<select
								className="rounded px-2 py-1 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
								value={selectedYear as string}
								onChange={(e) => setSelectedYear(e.target.value)}
							>
								<option value="All Years">All Years</option>
								{availableYears.map((year) => (
									<option key={year} value={year}>
										{year}
									</option>
								))}
							</select>
						</div>
					</CardHeader>
					<CardContent className="p-6">
						{filteredMonthlyStatsData &&
							filteredMonthlyStatsData.labels &&
							filteredMonthlyStatsData.labels.length > 0 ? (
							<div className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart
										data={toRechartsData(
											filteredMonthlyStatsData.labels,
											filteredMonthlyStatsData.datasets,
										)}
										margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
									>
										<defs>
											<linearGradient
												id="colorIncoming"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#6366F1"
													stopOpacity={0.6}
												/>
												<stop
													offset="95%"
													stopColor="#6366F1"
													stopOpacity={0.05}
												/>
											</linearGradient>
											<linearGradient
												id="colorClosed"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#22C55E"
													stopOpacity={0.6}
												/>
												<stop
													offset="95%"
													stopColor="#22C55E"
													stopOpacity={0.05}
												/>
											</linearGradient>
										</defs>
										<XAxis
											dataKey="label"
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											minTickGap={24}
											tick={{ fill: "#6B7280", fontSize: 11, fontWeight: 500 }}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											minTickGap={24}
											tick={{ fill: "#6B7280", fontSize: 11, fontWeight: 500 }}
										/>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="#E5E7EB"
										/>
										<RechartsTooltip
											content={({ active, payload, label }) => {
												if (active && payload && payload.length) {
													return (
														<div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
															<p className="font-semibold text-gray-900 mb-2">
																{label}
															</p>
															{payload.map((entry, index) => (
																<div
																	key={index}
																	className="flex items-center gap-2 mb-1"
																>
																	<div
																		className="w-3 h-3 rounded-full"
																		style={{ backgroundColor: entry.color }}
																	/>
																	<span className="text-sm text-gray-600">
																		{entry.name}:
																	</span>
																	<span className="text-sm font-semibold text-gray-900">
																		{entry.value?.toLocaleString()}
																	</span>
																</div>
															))}
														</div>
													);
												}
												return null;
											}}
										/>
										<RechartsLegend
											wrapperStyle={{ paddingTop: "10px" }}
											formatter={(value) => (
												<span style={{ color: "#6B7280", fontSize: "10px" }}>
													{value}
												</span>
											)}
										/>
										<Area
											type="monotone"
											dataKey="incoming"
											stroke="#6366F1"
											fill="url(#colorIncoming)"
											name="Incoming Tickets"
											strokeWidth={1.5}
										/>
										<Area
											type="monotone"
											dataKey="closed"
											stroke="#22C55E"
											fill="url(#colorClosed)"
											name="Closed Tickets"
											strokeWidth={1.5}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						) : (
							<div className="text-center text-muted-foreground py-12">
								No data for this chart
							</div>
						)}
					</CardContent>
				</Card>

				{/* Incident Trends */}
				<Card className="p-2">
					<CardHeader className="flex flex-col gap-1 pb-1">
						<CardTitle className="font-semibold text-base">
							Incident Trends
						</CardTitle>
						<div className="flex flex-wrap gap-2">
							<Badge className="bg-orange-600 text-white text-xs px-1.5 py-0.5 rounded-md font-semibold">
								Total: {incidentStats.total.toLocaleString()}
							</Badge>
							<Badge className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-md font-semibold">
								Avg Rate:{" "}
								{incidentTrendsData.length > 0
									? (
										incidentTrendsData.reduce(
											(sum, item) => sum + item.resolutionRate,
											0,
										) / incidentTrendsData.length
									).toFixed(1)
									: 0}
								%
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="p-6">
						{incidentTrendsData.length > 0 ? (
							<div className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart
										data={incidentTrendsData}
										margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
									>
										<XAxis
											dataKey="month"
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
										/>
										<YAxis
											yAxisId="left"
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
											label={{
												value: "Incidents",
												angle: -90,
												position: "insideLeft",
												style: {
													textAnchor: "middle",
													fill: "#6B7280",
													fontSize: 12,
												},
											}}
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
											domain={[0, 100]}
											label={{
												value: "Resolution Rate (%)",
												angle: 90,
												position: "insideRight",
												style: {
													textAnchor: "middle",
													fill: "#6B7280",
													fontSize: 12,
												},
											}}
										/>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="#E5E7EB"
										/>
										<RechartsTooltip
											content={({ active, payload, label }) => {
												if (active && payload && payload.length) {
													return (
														<div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
															<p className="font-semibold text-gray-900 mb-2">
																{label}
															</p>
															{payload.map((entry, index) => (
																<div
																	key={index}
																	className="flex items-center gap-2 mb-1"
																>
																	<div
																		className="w-3 h-3 rounded-full"
																		style={{ backgroundColor: entry.color }}
																	/>
																	<span className="text-sm text-gray-600">
																		{entry.name}:
																	</span>
																	<span className="text-sm font-semibold text-gray-900">
																		{entry.name === "Resolution Rate %"
																			? `${entry.value?.toFixed(1)}%`
																			: entry.value?.toLocaleString()}
																	</span>
																</div>
															))}
														</div>
													);
												}
												return null;
											}}
										/>
										<RechartsLegend
											wrapperStyle={{ paddingTop: "10px" }}
											formatter={(value) => (
												<span style={{ color: "#6B7280", fontSize: "10px" }}>
													{value}
												</span>
											)}
										/>
										<Line
											yAxisId="left"
											type="monotone"
											dataKey="incidents"
											stroke="#F59E0B"
											strokeWidth={2}
											name="Incidents"
											dot={{ fill: "#F59E0B", strokeWidth: 1, r: 2 }}
											activeDot={{ r: 4, stroke: "#F59E0B", strokeWidth: 1 }}
										/>
										<Line
											yAxisId="right"
											type="monotone"
											dataKey="resolutionRate"
											stroke="#10B981"
											strokeWidth={2}
											name="Resolution Rate %"
											dot={{ fill: "#10B981", strokeWidth: 1, r: 2 }}
											activeDot={{ r: 4, stroke: "#10B981", strokeWidth: 1 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						) : (
							<div className="text-center text-muted-foreground py-12">
								No incident data available
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Yearly Trends */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Yearly Ticket Trends */}
				<Card className="p-2">
					<CardHeader className="flex flex-col gap-1 pb-1">
						<CardTitle className="font-semibold text-base">
							Tickets per Year
						</CardTitle>
						{latestYearlyValue !== null && (
							<Badge className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-md w-fit font-semibold">
								Latest: {latestYearlyValue}
							</Badge>
						)}
					</CardHeader>
					<CardContent className="p-6">
						{yearlyStatsData &&
							yearlyStatsData.labels &&
							yearlyStatsData.labels.length > 0 ? (
							<div className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart
										data={toRechartsData(
											yearlyStatsData.labels,
											yearlyStatsData.datasets,
										)}
										margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
									>
										<defs>
											<linearGradient
												id="colorIncomingY"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#6366F1"
													stopOpacity={0.6}
												/>
												<stop
													offset="95%"
													stopColor="#6366F1"
													stopOpacity={0.05}
												/>
											</linearGradient>
											<linearGradient
												id="colorClosedY"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#22C55E"
													stopOpacity={0.6}
												/>
												<stop
													offset="95%"
													stopColor="#22C55E"
													stopOpacity={0.05}
												/>
											</linearGradient>
										</defs>
										<XAxis
											dataKey="label"
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											minTickGap={24}
											tick={{ fill: "#6B7280", fontSize: 11, fontWeight: 500 }}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											minTickGap={24}
											tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
										/>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="#E5E7EB"
										/>
										<RechartsTooltip
											content={({ active, payload, label }) => {
												if (active && payload && payload.length) {
													return (
														<div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
															<p className="font-semibold text-gray-900 mb-2">
																{label}
															</p>
															{payload.map((entry, index) => (
																<div
																	key={index}
																	className="flex items-center gap-2 mb-1"
																>
																	<div
																		className="w-3 h-3 rounded-full"
																		style={{ backgroundColor: entry.color }}
																	/>
																	<span className="text-sm text-gray-600">
																		{entry.name}:
																	</span>
																	<span className="text-sm font-semibold text-gray-900">
																		{entry.value?.toLocaleString()}
																	</span>
																</div>
															))}
														</div>
													);
												}
												return null;
											}}
										/>
										<RechartsLegend
											wrapperStyle={{ paddingTop: "10px" }}
											formatter={(value) => (
												<span style={{ color: "#6B7280", fontSize: "10px" }}>
													{value}
												</span>
											)}
										/>
										<Area
											type="monotone"
											dataKey="incoming"
											stroke="#6366F1"
											fill="url(#colorIncomingY)"
											name="Incoming Tickets"
											strokeWidth={1.5}
										/>
										<Area
											type="monotone"
											dataKey="closed"
											stroke="#22C55E"
											fill="url(#colorClosedY)"
											name="Closed Tickets"
											strokeWidth={1.5}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						) : (
							<div className="text-center text-muted-foreground py-12">
								No data for this chart
							</div>
						)}
					</CardContent>
				</Card>

				{/* NCAL Performance */}
				<Card className="p-2">
					<CardHeader className="flex flex-col gap-1 pb-1">
						<CardTitle className="font-semibold text-base">
							NCAL Performance
						</CardTitle>
						<Badge className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-md w-fit font-semibold">
							Compliance: {incidentStats.ncalCompliance.toFixed(1)}%
						</Badge>
					</CardHeader>
					<CardContent className="p-6">
						{allIncidents && allIncidents.length > 0 ? (
							<div className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart
										data={Object.entries(
											calculateIncidentStats(allIncidents).ncalCounts,
										).map(([ncal, count]) => ({
											ncal,
											count,
											compliance:
												(allIncidents.filter((inc) => {
													const incNcal = normalizeNCAL(inc.ncal);
													if (incNcal !== ncal) return false;
													const duration = inc.durationMin || 0;
													const targets: Record<string, number> = {
														NCAL1: 60,
														NCAL2: 120,
														NCAL3: 240,
														NCAL4: 480,
													};
													return duration <= (targets[ncal] || 240);
												}).length /
													(count as number)) *
												100,
										}))}
										margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
									>
										<defs>
											<linearGradient
												id="colorIncidents"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#8B5CF6"
													stopOpacity={0.8}
												/>
												<stop
													offset="95%"
													stopColor="#7C3AED"
													stopOpacity={1}
												/>
											</linearGradient>
											<linearGradient
												id="colorCompliance"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#10B981"
													stopOpacity={0.8}
												/>
												<stop
													offset="95%"
													stopColor="#059669"
													stopOpacity={1}
												/>
											</linearGradient>
										</defs>
										<XAxis
											dataKey="ncal"
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
										/>
										<YAxis
											tickLine={false}
											axisLine={false}
											tickMargin={8}
											tick={{ fill: "#6B7280", fontSize: 12, fontWeight: 500 }}
										/>
										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="#E5E7EB"
										/>
										<RechartsTooltip
											content={({ active, payload, label }) => {
												if (active && payload && payload.length) {
													return (
														<div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
															<p className="font-semibold text-gray-900 mb-2">
																{label}
															</p>
															{payload.map((entry, index) => (
																<div
																	key={index}
																	className="flex items-center gap-2 mb-1"
																>
																	<div
																		className="w-3 h-3 rounded-full"
																		style={{ backgroundColor: entry.color }}
																	/>
																	<span className="text-sm text-gray-600">
																		{entry.name}:
																	</span>
																	<span className="text-sm font-semibold text-gray-900">
																		{entry.name === "Compliance %"
																			? `${entry.value?.toFixed(1)}%`
																			: entry.value?.toLocaleString()}
																	</span>
																</div>
															))}
														</div>
													);
												}
												return null;
											}}
										/>
										<RechartsLegend
											wrapperStyle={{ paddingTop: "10px" }}
											formatter={(value) => (
												<span style={{ color: "#6B7280", fontSize: "10px" }}>
													{value}
												</span>
											)}
										/>
										<Bar
											dataKey="count"
											fill="url(#colorIncidents)"
											name="Incidents"
											radius={[4, 4, 0, 0]}
										/>
										<Bar
											dataKey="compliance"
											fill="url(#colorCompliance)"
											name="Compliance %"
											radius={[4, 4, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							</div>
						) : (
							<div className="text-center text-muted-foreground py-12">
								No incident data available
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Enhanced Agent Leaderboard - Card Layout */}
			<Card className="p-2">
				<CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-1">
					<CardTitle className="font-extrabold text-lg">
						Agent Leaderboard
					</CardTitle>
					<div className="flex items-center gap-2">
						<select
							className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
							value={selectedYear}
							onChange={(e) => setSelectedYear(e.target.value)}
						>
							<option value="All Years">All Years</option>
							{availableYears.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</div>
				</CardHeader>
				<CardContent className="p-4">
					<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
						{agentLeaderboard.map((row, i) => (
							<div
								key={row.agent}
								className={`relative bg-gradient-to-br rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer ${i === 0
									? "from-amber-500 to-orange-600 text-white"
									: i === 1
										? "from-gray-500 to-gray-700 text-white"
										: i === 2
											? "from-orange-500 to-red-600 text-white"
											: "from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-700 text-gray-900 dark:text-gray-100"
									}`}
							>
								{/* Rank Badge */}
								<div className="absolute top-2 right-2 flex items-center gap-1">
									<span className="font-semibold text-sm">#{i + 1}</span>
									{i < 3 && (
										<EmojiEventsIcon
											className={`${i === 0 ? "text-amber-100" : i === 1 ? "text-gray-100" : "text-orange-100"}`}
											sx={{ fontSize: 16 }}
										/>
									)}
								</div>

								{/* Agent Info */}
								<div className="flex items-center gap-3 mb-3">
									<Avatar
										className={`w-12 h-12 border-2 ${i < 3
											? "border-white/30"
											: "border-gray-200 dark:border-gray-600"
											}`}
									>
										<AvatarImage
											src={getAgentPhotoPath(row.agent)}
											alt={row.agent}
											className="object-cover"
										/>
										<AvatarFallback
											className={`font-semibold text-lg ${i < 3
												? "bg-white/20 text-white"
												: "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
												}`}
										>
											{getAgentInitials(row.agent)}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<h3
											className={`font-bold text-xs leading-tight break-words line-clamp-2 ${i < 3
												? "text-white"
												: "text-gray-900 dark:text-gray-100"
												}`}
										>
											{row.agent}
										</h3>
										<p
											className={`text-xs opacity-80 leading-tight mt-1 ${i < 3
												? "text-white/80"
												: "text-gray-500 dark:text-gray-400"
												}`}
										>
											{row.tickets} tickets • {row.slaPct.toFixed(1)}% SLA
										</p>
									</div>
								</div>

								{/* Performance Metrics */}
								<div className="grid grid-cols-2 gap-1">
									<div className="text-center">
										<div
											className={`text-sm font-bold leading-tight ${i < 3
												? "text-white"
												: "text-gray-900 dark:text-gray-100"
												}`}
										>
											{row.tickets.toLocaleString()}
										</div>
										<div
											className={`text-xs opacity-80 leading-tight ${i < 3
												? "text-white/80"
												: "text-gray-500 dark:text-gray-400"
												}`}
										>
											Tickets
										</div>
									</div>
									<div className="text-center">
										<div
											className={`text-sm font-bold leading-tight ${i < 3
												? "text-white"
												: row.slaPct >= 85
													? "text-green-600"
													: row.slaPct >= 70
														? "text-amber-600"
														: "text-red-600"
												}`}
										>
											{row.slaPct.toFixed(1)}%
										</div>
										<div
											className={`text-xs opacity-80 leading-tight ${i < 3
												? "text-white/80"
												: "text-gray-500 dark:text-gray-400"
												}`}
										>
											SLA
										</div>
									</div>
									<div className="text-center">
										<div
											className={`text-xs font-bold leading-tight ${i < 3
												? "text-white"
												: row.frtAvg <= 120
													? "text-green-600"
													: row.frtAvg <= 240
														? "text-amber-600"
														: "text-red-600"
												}`}
										>
											{formatDurationDHM(row.frtAvg)}
										</div>
										<div
											className={`text-xs opacity-80 leading-tight ${i < 3
												? "text-white/80"
												: "text-gray-500 dark:text-gray-400"
												}`}
										>
											FRT
										</div>
									</div>
									<div className="text-center">
										<div
											className={`text-xs font-bold leading-tight ${i < 3
												? "text-white"
												: row.artAvg <= 1440
													? "text-green-600"
													: row.artAvg <= 2880
														? "text-amber-600"
														: "text-red-600"
												}`}
										>
											{formatDurationDHM(row.artAvg)}
										</div>
										<div
											className={`text-xs opacity-80 leading-tight ${i < 3
												? "text-white/80"
												: "text-gray-500 dark:text-gray-400"
												}`}
										>
											ART
										</div>
									</div>
								</div>

								{/* Score & Grade */}
								<div className="mt-2 flex items-center justify-between">
									<div className="text-center">
										<div
											className={`text-sm font-bold leading-tight ${i < 3
												? "text-white"
												: row.score >= 80
													? "text-green-600"
													: row.score >= 60
														? "text-amber-600"
														: "text-red-600"
												}`}
										>
											{row.score.toFixed(1)}
										</div>
										<div
											className={`text-xs opacity-80 leading-tight ${i < 3
												? "text-white/80"
												: "text-gray-500 dark:text-gray-400"
												}`}
										>
											Score
										</div>
									</div>
									<div className="text-center">
										<span
											className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${row.grade === "A"
												? "bg-green-600 text-white"
												: row.grade === "B"
													? "bg-blue-600 text-white"
													: row.grade === "C"
														? "bg-amber-600 text-white"
														: "bg-red-600 text-white"
												}`}
										>
											{row.grade}
										</span>
										<div
											className={`text-xs opacity-80 mt-1 leading-tight ${i < 3
												? "text-white/80"
												: "text-gray-500 dark:text-gray-400"
												}`}
										>
											Grade
										</div>
									</div>
								</div>

								{/* Performance Bar */}
								<div className="mt-2">
									<div
										className={`w-full bg-opacity-20 rounded-full h-1 ${i < 3 ? "bg-white/30" : "bg-gray-200 dark:bg-gray-600"
											}`}
									>
										<div
											className={`h-1 rounded-full transition-all duration-500 ${i < 3
												? "bg-white/80"
												: row.score >= 80
													? "bg-green-600"
													: row.score >= 60
														? "bg-amber-600"
														: "bg-red-600"
												}`}
											style={{ width: `${Math.min(row.score, 100)}%` }}
										></div>
									</div>
								</div>
							</div>
						))}
						{agentLeaderboard.length === 0 && (
							<div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">
								No data available for selected year
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Workload Analytics Section */}
			<WorkloadSection />
		</div>
	);

	return standalone ? <PageWrapper maxW="4xl">{content}</PageWrapper> : content;
};

export default SummaryDashboard;
