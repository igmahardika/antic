import { useState, useMemo, useEffect } from "react";

import { usePerf } from "@/hooks/usePerf";
import { logger } from "@/lib/logger";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	calculateCustomDuration,
	calculateNetDuration,
	normalizeNCAL,
	getSLATarget,
	formatDurationHMS as formatDurationHMSUtil,
} from "@/utils/incidentUtils";
import { Badge } from "@/components/ui/badge";

import SummaryCard from "@/components/ui/SummaryCard";


import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/ui/PageHeader";
import TimeFilter from "@/components/TimeFilter";
import {
	CardHeaderDescription,
} from "@/components/ui/CardTypography";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Legend,
	Line,
	ComposedChart,
} from "recharts";

// MUI Icons
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DomainDisabledIcon from "@mui/icons-material/DomainDisabled";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import WarningIcon from "@mui/icons-material/Warning";
import BuildIcon from "@mui/icons-material/Build";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import DetailModal from "@/components/analytics/DetailModal";

// Constants
const NCAL_COLORS = {
	Blue: "#3b82f6",
	Yellow: "#eab308",
	Orange: "#f97316",
	Red: "#ef4444",
	Black: "#1f2937",
};

const formatDurationHMS = (minutes: number): string => {
	return formatDurationHMSUtil(minutes);
};

const MONTH_OPTIONS = [
	{ value: "01", label: "January" },
	{ value: "02", label: "February" },
	{ value: "03", label: "March" },
	{ value: "04", label: "April" },
	{ value: "05", label: "May" },
	{ value: "06", label: "June" },
	{ value: "07", label: "July" },
	{ value: "08", label: "August" },
	{ value: "09", label: "September" },
	{ value: "10", label: "October" },
	{ value: "11", label: "November" },
	{ value: "12", label: "December" },
];

const SiteAnalytics: React.FC = () => {
	const [startMonth, setStartMonth] = useState<string | null>("01");
	const [endMonth, setEndMonth] = useState<string | null>("12");
	const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString());
	const [selectedSite, setSelectedSite] = useState<any>(null);

	usePerf('SiteAnalytics');

	// Get Data using CacheService (Sync with Server)
	const [allIncidents, setAllIncidents] = useState<any[]>([]);

	useEffect(() => {
		const fetchIncidents = async () => {
			try {
				const { cacheService } = await import("@/services/cacheService");
				const incidents = await cacheService.getIncidents();
				logger.info(
					"✅ SiteAnalytics: Successfully loaded",
					incidents.length,
					"incidents from CacheService",
				);
				setAllIncidents(incidents);
			} catch (error) {
				logger.error("❌ SiteAnalytics: Failed to load incidents:", error);
			}
		};
		fetchIncidents();
	}, []);

	// Extract available years and set default year
	const availableYears = useMemo(() => {
		if (!allIncidents || allIncidents.length === 0) return [];
		const years = new Set<number>();
		allIncidents.forEach((incident) => {
			if (incident.startTime) {
				const yr = new Date(incident.startTime).getFullYear();
				if (!isNaN(yr)) years.add(yr);
			}
		});
		return Array.from(years).sort((a, b) => b - a);
	}, [allIncidents]);

	// Auto-select latest year if current selection is not available
	useEffect(() => {
		if (availableYears.length > 0 && selectedYear && selectedYear !== "ALL" && !availableYears.includes(Number(selectedYear))) {
			setSelectedYear(availableYears[0].toString());
		}
	}, [availableYears, selectedYear]);

	// Filter Logic
	const filteredIncidents = useMemo(() => {
		if (!allIncidents || !selectedYear || !startMonth || !endMonth) return [];

		const yearNum = Number(selectedYear);
		const startM = Number(startMonth) - 1;
		const endM = Number(endMonth) - 1;

		return allIncidents.filter((incident) => {
			if (!incident.startTime) return false;
			const iDate = new Date(incident.startTime);
			const iYear = iDate.getFullYear();
			const iMonth = iDate.getMonth();

			// 1. Filter by Year
			if (selectedYear !== "ALL" && yearNum !== iYear) return false;

			// 2. Filter by Month Range
			if (selectedYear !== "ALL" && (iMonth < startM || iMonth > endM)) return false;

			return true;
		});
	}, [allIncidents, startMonth, endMonth, selectedYear]);

	// Advanced Analytics Calculation
	const analytics = useMemo(() => {
		if (!filteredIncidents.length) return null;

		const totalIncidents = filteredIncidents.length;
		const uniqueSites = new Set(filteredIncidents.map(i => i.site)).size;
		const totalResolved = filteredIncidents.filter(i => i.status === 'Done').length;

		const durations = filteredIncidents.map(i => ({
			val: calculateCustomDuration(i),
			net: calculateNetDuration(i),
			ncal: i.ncal
		})).filter(d => d.val > 0);

		const totalMin = durations.reduce((a, b) => a + b.val, 0);
		const netMin = durations.reduce((a, b) => a + b.net, 0);
		const avgDuration = durations.length ? totalMin / durations.length : 0;
		const avgNetDuration = durations.length ? netMin / durations.length : 0;
		const pauseRatio = totalMin > 0 ? ((totalMin - netMin) / totalMin) * 100 : 0;

		const slaBreach = durations.filter(d => d.val > getSLATarget(d.ncal)).length;
		const slaCompliance = totalIncidents > 0 ? ((totalIncidents - slaBreach) / totalIncidents) * 100 : 100;
		const siteReliability = totalIncidents > 0 ? (totalResolved / totalIncidents) * 100 : 0;

		// Group by Site
		const siteStats: Record<string, any> = {};
		filteredIncidents.forEach(inc => {
			const site = inc.site || "Unknown";
			if (!siteStats[site]) {
				siteStats[site] = {
					site,
					count: 0,
					resolved: 0,
					totalDur: 0,
					netDur: 0,
					durCount: 0,
					highSeverity: 0,
					problems: {} as Record<string, number>,
					ncalBreakdown: { RED: 0, BLACK: 0, ORANGE: 0, YELLOW: 0, BLUE: 0 },
					breachedTickets: [] as any[]
				};
			}
			siteStats[site].count++;
			if (inc.status === 'Done') siteStats[site].resolved++;

			// Track problems
			const prob = inc.problem || inc.penyebab || inc.klasifikasiGangguan || "Other";
			siteStats[site].problems[prob] = (siteStats[site].problems[prob] || 0) + 1;

			const dur = calculateCustomDuration(inc);
			const net = calculateNetDuration(inc);
			const ncal = normalizeNCAL(inc.ncal);
			if (siteStats[site].ncalBreakdown[ncal] !== undefined) {
				siteStats[site].ncalBreakdown[ncal]++;
			}

			if (dur > 0) {
				siteStats[site].totalDur += dur;
				siteStats[site].netDur += net;
				siteStats[site].durCount++;
				const target = getSLATarget(inc.ncal);
				if (dur > target) {
					siteStats[site].highSeverity++;
					siteStats[site].breachedTickets.push({
						noCase: inc.noCase,
						ts: inc.ts || "Unknown",
						ncal,
						duration: dur,
						netDuration: net,
						target,
						startTime: inc.startTime
					});
				}
			}
		});

		// Calculate Risk Score & Metrics
		const siteMetrics = Object.values(siteStats).map((s: any) => {
			const avgDur = s.durCount ? s.totalDur / s.durCount : 0;
			const avgNetDur = s.durCount ? s.netDur / s.durCount : 0;
			const pauseGap = avgDur > 0 ? ((avgDur - avgNetDur) / avgDur) * 100 : 0;

			const reliability = s.count ? (s.resolved / s.count) * 100 : 0;
			const slaCompliance = s.count ? ((s.count - s.highSeverity) / s.count) * 100 : 100;

			const topProb = Object.entries(s.problems)
				.sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "None";

			const volumeRisk = Math.min(s.count * 2, 30);
			const durationRisk = Math.min((avgDur / 120) * 10, 30);
			const reliabilityRisk = Math.min((100 - reliability) * 0.2, 20);
			const slaRisk = Math.min((100 - slaCompliance) * 0.2, 20);
			const riskScore = volumeRisk + durationRisk + reliabilityRisk + slaRisk;

			// Generate recommendations
			const recommendations = [];
			if (slaCompliance < 85) recommendations.push("Evaluasi respon time penanganan tiket kritis.");
			if (reliability < 90) recommendations.push("Site ini memiliki banyak insiden yang belum 'Resolved'.");
			if (pauseGap > 30) recommendations.push("Gap durasi pause tinggi (" + pauseGap.toFixed(1) + "%). Verifikasi alasan pause yang berlebihan.");
			if (topProb.toLowerCase().includes("battery") || topProb.toLowerCase().includes("power")) {
				recommendations.push("Perlu dilakukan audit sistem kelistrikan (UPS/Battery).");
			}
			if (s.count > 10) recommendations.push("Volume gangguan tinggi, jadwalkan preventive maintenance.");

			return {
				...s,
				avgDur,
				avgNetDur,
				pauseGap,
				reliability,
				slaCompliance,
				topProb,
				riskScore,
				recommendations
			};
		}).sort((a, b) => b.riskScore - a.riskScore); // Default sort by Risk

		const topProblematic = [...siteMetrics].sort((a, b) => b.count - a.count).slice(0, 10);
		const topDuration = [...siteMetrics].sort((a, b) => b.avgDur - a.avgDur).slice(0, 10);

		const highRiskSites = siteMetrics.filter(s => s.riskScore > 50).length;

		// Monthly Trends & Risk Evolution
		const trends: Record<string, any> = {};
		filteredIncidents.forEach(inc => {
			if (!inc.startTime) return;
			const d = new Date(inc.startTime);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

			if (!trends[key]) trends[key] = { month: key, count: 0, distinctSites: new Set(), totalDur: 0, netDur: 0, durCount: 0, resolved: 0 };
			trends[key].count++;
			trends[key].distinctSites.add(inc.site);
			if (inc.status === 'Done') trends[key].resolved++;
			const dur = calculateCustomDuration(inc);
			const net = calculateNetDuration(inc);
			if (dur > 0) {
				trends[key].totalDur += dur;
				trends[key].netDur += net;
				trends[key].durCount++;
			}
		});

		const trendData = Object.values(trends)
			.sort((a: any, b: any) => a.month.localeCompare(b.month))
			.map((t: any) => ({
				month: t.month,
				Incidents: t.count,
				ActiveSites: t.distinctSites.size,
				AvgDuration: t.durCount ? Math.round(t.totalDur / t.durCount) : 0,
				NetDuration: t.durCount ? Math.round(t.netDur / t.durCount) : 0,
				Reliability: t.count ? (t.resolved / t.count) * 100 : 0
			}));

		// MoM Trends calculation
		let momTrends = {
			incidents: { value: 0, type: "flat" as "up" | "down" | "flat" },
			sites: { value: 0, type: "flat" as "up" | "down" | "flat" },
			duration: { value: 0, type: "flat" as "up" | "down" | "flat" },
			sla: { value: 0, type: "flat" as "up" | "down" | "flat" },
			reliability: { value: 0, type: "flat" as "up" | "down" | "flat" }
		};

		if (trendData.length >= 2) {
			const current = trendData[trendData.length - 1];
			const previous = trendData[trendData.length - 2];

			const calcTrend = (curr: number, prev: number, inverse = false): { value: number; type: "up" | "down" | "flat" } => {
				if (prev === 0) return { value: 0, type: "flat" };
				const diff = ((curr - prev) / prev) * 100;
				const isUp = diff > 0.5;
				const isDown = diff < -0.5;

				if (!inverse) {
					return { value: Math.abs(diff), type: isUp ? "up" : isDown ? "down" : "flat" };
				} else {
					return { value: Math.abs(diff), type: isUp ? "down" : isDown ? "up" : "flat" };
				}
			};

			momTrends.incidents = calcTrend(current.Incidents, previous.Incidents, true);
			momTrends.sites = calcTrend(current.ActiveSites, previous.ActiveSites);
			momTrends.duration = calcTrend(current.AvgDuration, previous.AvgDuration, true);

			// Actually I should update trendData to include sla
			momTrends.reliability = calcTrend(current.Reliability, previous.Reliability);
		}

		return {
			totalIncidents,
			uniqueSites,
			avgDuration,
			avgNetDuration,
			pauseRatio,
			siteReliability,
			highRiskSites,
			siteMetrics,
			topProblematic,
			topDuration,
			trendData,
			momTrends,
			slaCompliance
		};
	}, [filteredIncidents]);

	if (!allIncidents && !analytics) return <div className="p-8">Loading analytics...</div>;

	// Render Empty State
	if (!analytics) return (
		<PageWrapper maxW="full">
			<PageHeader
				title="Site Analytics"
				description="Performance and risk analysis of network sites"
			/>
			<div className="p-8 text-center border-2 border-dashed rounded-lg">
				No incident data available for the selected filters.
			</div>
		</PageWrapper>
	);

	const stats = analytics;

	return (
		<PageWrapper maxW="full">
			<div className="space-y-6">
				<PageHeader
					title="Site Analytics"
					description="Performance and risk analysis of network sites"
				/>

				{/* Filters */}
				<div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
					<TimeFilter
						startMonth={startMonth}
						setStartMonth={setStartMonth}
						endMonth={endMonth}
						setEndMonth={setEndMonth}
						selectedYear={selectedYear}
						setSelectedYear={setSelectedYear}
						monthOptions={MONTH_OPTIONS}
						allYearsInData={availableYears.map(y => y.toString())}
					/>
					<div className="text-xs font-semibold text-muted-foreground bg-card border rounded-xl px-4 py-2 shadow-sm h-[48px] flex items-center">
						ACTIVE SITES: <span className="text-blue-600 ml-2 font-mono text-sm">{stats.uniqueSites}</span>
					</div>
				</div>

				{/* KPI Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<SummaryCard
						title="Active Sites"
						value={stats.uniqueSites}
						description={`${stats.totalIncidents} total incidents`}
						icon={<LocationOnIcon className="text-white" />}
						iconBg="bg-blue-600"
						trend={stats.momTrends.sites.value.toFixed(1) + "%"}
						trendType={stats.momTrends.sites.type}
					/>
					<SummaryCard
						title="MTTR (Total vs Net)"
						value={formatDurationHMS(stats.avgDuration)}
						description={`Net: ${formatDurationHMS(stats.avgNetDuration)} (${stats.pauseRatio.toFixed(1)}% Pause)`}
						icon={<AccessTimeIcon className="text-white" />}
						iconBg="bg-amber-500"
						trend={analytics.momTrends.duration.value.toFixed(1) + "%"}
						trendType={analytics.momTrends.duration.type}
					/>
					<SummaryCard
						title="SLA Compliance"
						value={`${stats.slaCompliance.toFixed(1)}%`}
						description="Based on NCAL targets"
						icon={<CheckCircleIcon className="text-white" />}
						iconBg="bg-emerald-500"
					/>
					<SummaryCard
						title="Site Reliability"
						value={`${stats.siteReliability.toFixed(1)}%`}
						description="Resolution success rate"
						icon={<TrendingUpIcon className="text-white" />}
						iconBg="bg-indigo-500"
						trend={stats.momTrends.reliability.value.toFixed(1) + "%"}
						trendType={stats.momTrends.reliability.type}
					/>
					<SummaryCard
						title="High Risk Sites"
						value={stats.highRiskSites}
						description="Sites requiring attention"
						icon={<WarningAmberIcon className="text-white" />}
						iconBg="bg-rose-500"
					/>
				</div>

				{/* Charts Section */}
				<div className="grid grid-cols-1 gap-6">
					{/* Monthly Trends - Full Width */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<TrendingUpIcon className="text-blue-500" />
								Site Incident Trends
							</CardTitle>
							<CardHeaderDescription>Monthly incident volume and active site count</CardHeaderDescription>
						</CardHeader>
						<CardContent className="h-[400px]">
							<ChartContainer config={{}} className="h-full w-full">
								<ComposedChart data={stats.trendData}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis dataKey="month" tick={{ fontSize: 12 }} />
									<YAxis yAxisId="left" />
									<YAxis yAxisId="right" orientation="right" />
									<ChartTooltip
										content={
											<ChartTooltipContent
												formatter={(value, name) => {
													if (name === "Total Avg" || name === "AvgDuration") {
														return (
															<div className="flex items-center gap-2">
																<div className="h-2 w-2 rounded-full bg-[#f59e0b]" />
																<span className="text-gray-700 font-medium">Total Avg:</span>
																<span className="font-mono font-semibold text-gray-900">{formatDurationHMS(Number(value))}</span>
															</div>
														);
													}
													if (name === "Net Avg" || name === "NetDuration") {
														return (
															<div className="flex items-center gap-2">
																<div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
																<span className="text-gray-700 font-medium">Net Avg:</span>
																<span className="font-mono font-semibold text-blue-600">{formatDurationHMS(Number(value))}</span>
															</div>
														);
													}
													if (name === "Incidents") {
														return (
															<div className="flex items-center gap-2">
																<div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
																<span className="text-gray-700 font-medium">Incidents:</span>
																<span className="font-mono font-semibold text-gray-900">{value}</span>
															</div>
														);
													}
													if (name === "ActiveSites") {
														return (
															<div className="flex items-center gap-2">
																<div className="h-2 w-2 rounded-full bg-[#f97316]" />
																<span className="text-gray-700 font-medium">Active Sites:</span>
																<span className="font-mono font-semibold text-gray-900">{value}</span>
															</div>
														);
													}
													return null;
												}}
											/>
										}
									/>
									<Legend />
									<Bar
										yAxisId="left"
										dataKey="Incidents"
										fill="#3b82f6"
										radius={[4, 4, 0, 0]}
										barSize={40}
									/>
									<Line
										yAxisId="right"
										type="monotone"
										dataKey="AvgDuration"
										stroke="#f59e0b"
										strokeWidth={2}
										name="Total Avg"
									/>
									<Line
										yAxisId="right"
										type="monotone"
										dataKey="NetDuration"
										stroke="#3b82f6"
										strokeWidth={2}
										strokeDasharray="5 5"
										name="Net Avg"
									/>
								</ComposedChart>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Side-by-side secondary charts */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Top Problematic Sites (by Volume) */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<DomainDisabledIcon className="text-rose-500" />
									Most Affected Sites
								</CardTitle>
								<CardHeaderDescription>Sites with highest incident frequency</CardHeaderDescription>
							</CardHeader>
							<CardContent className="h-[350px]">
								<ChartContainer config={{}} className="h-full w-full">
									<BarChart data={stats.topProblematic} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
										<XAxis type="number" />
										<YAxis dataKey="site" type="category" width={120} tick={{ fontSize: 11 }} />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} name="Incidents" />
									</BarChart>
								</ChartContainer>
							</CardContent>
						</Card>

						{/* Longest Duration Sites */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<AccessTimeIcon className="text-amber-500" />
									Longest Downtime Sites
								</CardTitle>
								<CardHeaderDescription>Sites with highest average resolution time</CardHeaderDescription>
							</CardHeader>
							<CardContent className="h-[350px]">
								<ChartContainer config={{}} className="h-full w-full">
									<BarChart data={stats.topDuration} layout="vertical">
										<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
										<XAxis type="number" />
										<YAxis dataKey="site" type="category" width={120} tick={{ fontSize: 11 }} />
										<ChartTooltip
											content={
												<ChartTooltipContent
													formatter={(value, name) => {
														if (name === "Avg Duration") {
															return (
																<div className="flex items-center gap-2">
																	<div className="h-2 w-2 rounded-full bg-[#f59e0b]" />
																	<span className="text-gray-700 font-medium">Avg Duration:</span>
																	<span className="font-mono font-semibold text-gray-900">{formatDurationHMS(Number(value))}</span>
																</div>
															);
														}
														return undefined;
													}}
												/>
											}
										/>
										<Bar dataKey="avgDur" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Avg Duration" />
									</BarChart>
								</ChartContainer>
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Risk Evolution Matrix */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<SignalCellularAltIcon className="text-slate-500" />
							Detailed Performance Matrix (Top 20 Risk)
						</CardTitle>
						<CardHeaderDescription>Comprehensive analysis of highest risk sites</CardHeaderDescription>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/50">
										<th className="py-3 px-4 text-left font-semibold">Rank</th>
										<th className="py-3 px-4 text-left font-semibold">Site Name</th>
										<th className="py-3 px-4 text-center font-semibold text-blue-600">Vol</th>
										<th className="py-3 px-4 text-center font-semibold text-rose-600">SLA %</th>
										<th className="py-3 px-4 text-center font-semibold text-emerald-600">Success %</th>
										<th className="py-3 px-4 text-left font-semibold">Main Problem</th>
										<th className="py-3 px-4 text-center font-semibold">MTTR (Total vs Net)</th>
										<th className="py-3 px-4 text-center font-semibold text-amber-600">Pause Gap</th>
										<th className="py-3 px-4 text-center font-semibold">
											<TooltipProvider>
												<div className="flex items-center gap-1 justify-center">
													Risk Level
													<Tooltip>
														<TooltipTrigger asChild>
															<InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
														</TooltipTrigger>
														<TooltipContent className="max-w-[220px] p-3 text-left">
															<p className="text-xs font-bold mb-1">Rumus Risk Score:</p>
															<p className="text-[10px] text-muted-foreground leading-relaxed">
																(30% Vol) + (30% Durasi) + (20% Resolusi) + (20% SLA Breach)
															</p>
														</TooltipContent>
													</Tooltip>
												</div>
											</TooltipProvider>
										</th>
									</tr>
								</thead>
								<tbody>
									{stats.siteMetrics.slice(0, 20).map((site: any, idx: number) => (
										<tr
											key={idx}
											className="border-b hover:bg-muted/20 transition-colors cursor-pointer group"
											onClick={() => setSelectedSite(site)}
										>
											<td className="py-3 px-4">
												<div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${site.riskScore > 75 ? "bg-rose-100 text-rose-700 border border-rose-200" :
													site.riskScore > 40 ? "bg-amber-100 text-amber-700 border border-amber-200" :
														"bg-emerald-50 text-emerald-700 border border-emerald-100"
													}`}>
													{idx + 1}
												</div>
											</td>
											<td className="py-3 px-4 font-medium text-foreground">{site.site}</td>
											<td className="py-3 px-4 text-center">
												<Badge variant="secondary" className="font-mono">{site.count}</Badge>
											</td>
											<td className="py-3 px-4 text-center font-semibold text-rose-600">
												{site.count > 0 ? (((site.count - site.highSeverity) / site.count) * 100).toFixed(1) : "100.0"}%
											</td>
											<td className="py-3 px-4 text-center font-semibold text-emerald-600">
												{site.reliability.toFixed(1)}%
											</td>
											<td className="py-3 px-4">
												<span className="text-[11px] text-muted-foreground truncate w-32 block" title={site.topProb}>
													{site.topProb}
												</span>
											</td>
											<td className="py-3 px-4 text-center">
												<div className="flex flex-col items-center">
													<span className="font-mono text-xs text-foreground uppercase">{formatDurationHMS(site.avgDur)}</span>
													<span className="text-[10px] text-blue-600 font-bold uppercase">Net: {formatDurationHMS(site.avgNetDur)}</span>
												</div>
											</td>
											<td className="py-3 px-4 text-center">
												<Badge variant="secondary" className="font-mono text-[10px] bg-amber-50 text-amber-600 border-amber-200">
													{site.pauseGap.toFixed(1)}%
												</Badge>
											</td>
											<td className="py-3 px-4 text-center">
												<Badge
													variant={site.riskScore >= 70 ? "danger" : site.riskScore >= 40 ? "warning" : "success"}
													className="text-[10px]"
												>
													{site.riskScore.toFixed(0)}
												</Badge>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Site Drill-down Detail Modal */}
			{selectedSite && (
				<DetailModal
					isOpen={!!selectedSite}
					onClose={() => setSelectedSite(null)}
					title={selectedSite.site}
					description="Detailed Site Risk Analysis"
				>
					<div className="grid grid-cols-2 gap-4">
						<div className="p-4 rounded-xl bg-blue-100/50 border border-blue-200">
							<p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Risk Score</p>
							<p className="text-2xl font-black text-blue-700">{selectedSite.riskScore.toFixed(0)}/100</p>
							<p className="text-[11px] text-blue-600/70 font-medium">Kritikalitas Site</p>
						</div>
						<div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
							<p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total Incidents</p>
							<p className="text-2xl font-black text-slate-700">{selectedSite.count}</p>
							<p className="text-[11px] text-slate-600/70 font-medium">Beban Gangguan</p>
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<WarningIcon className="text-rose-500 h-5 w-5" />
							<h4 className="font-bold text-sm">Severity Distribution</h4>
						</div>
						<div className="flex gap-2">
							{Object.entries(selectedSite.ncalBreakdown)
								.filter(([_, count]) => (count as number) > 0)
								.map(([level, count]) => (
									<div key={level} className="flex-1 p-2 rounded-lg border text-center space-y-1">
										<p className="text-[9px] font-bold text-muted-foreground">{level}</p>
										<p className="text-sm font-black" style={{ color: (NCAL_COLORS as any)[level] || '#888' }}>{count as number}</p>
									</div>
								))
							}
						</div>
					</div>

					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<BuildIcon className="text-amber-500 h-5 w-5" />
							<h4 className="font-bold text-sm">Problem Frequency</h4>
						</div>
						<div className="grid grid-cols-1 gap-2">
							{Object.entries(selectedSite.problems)
								.sort((a: any, b: any) => b[1] - a[1])
								.slice(0, 5)
								.map(([prob, count]: any) => {
									const percentage = (count / selectedSite.count) * 100;
									return (
										<div key={prob} className="space-y-1.5">
											<div className="flex justify-between text-xs">
												<span className="font-medium text-muted-foreground truncate w-48">{prob}</span>
												<span className="font-bold">{count} cases</span>
											</div>
											<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
												<div className="h-full bg-amber-500 rounded-full" style={{ width: `${percentage}%` }} />
											</div>
										</div>
									);
								})}
						</div>
					</div>

					<Separator />

					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<LocationOnIcon className="text-blue-500 h-5 w-5" />
							<h4 className="font-bold text-sm">SLA Breach List</h4>
						</div>
						{selectedSite.breachedTickets.length > 0 ? (
							<div className="space-y-3">
								{selectedSite.breachedTickets.slice(0, 5).map((t: any, idx: number) => (
									<div key={idx} className="p-3 rounded-lg border bg-muted/20 space-y-2">
										<div className="flex justify-between items-start">
											<span className="font-mono text-xs font-bold font-mono">#{t.noCase}</span>
											<Badge
												variant="secondary"
												style={{ backgroundColor: (NCAL_COLORS as any)[t.ncal] + '20', color: (NCAL_COLORS as any)[t.ncal] }}
											>
												{t.ncal}
											</Badge>
										</div>
										<div className="flex flex-col gap-1 text-[10px]">
											<div className="flex justify-between items-center bg-muted/30 p-1.5 rounded-sm">
												<span className="text-muted-foreground">Officer: {t.ts}</span>
												<span className="text-rose-600 font-bold underline">Total: {formatDurationHMS(t.duration)}</span>
											</div>
											<div className="flex justify-between items-center bg-blue-50 p-1.5 rounded-sm">
												<span className="text-blue-700 font-bold">Net: {formatDurationHMS(t.netDuration)}</span>
												<span className="text-blue-600/70 font-medium">Pause: {formatDurationHMS(t.duration - t.netDuration)}</span>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="py-6 text-center border-2 border-dashed rounded-xl">
								<p className="text-xs text-muted-foreground italic">No SLA breaches recorded for this site.</p>
							</div>
						)}
					</div>

					<div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-3">
						<div className="flex items-center gap-2">
							<TrendingUpIcon className="h-4 w-4 text-amber-600" />
							<span className="text-xs font-bold text-amber-700 uppercase tracking-tight">AI Recommendation</span>
						</div>
						<ul className="space-y-1.5 list-disc list-inside">
							{selectedSite.recommendations.map((rec: string, i: number) => (
								<li key={i} className="text-xs text-amber-900 leading-relaxed font-medium">
									{rec}
								</li>
							))}
							{selectedSite.recommendations.length === 0 && (
								<li className="text-xs text-amber-900 italic list-none">
									Kondisi site sangat prima. Lanjutkan monitoring rutin.
								</li>
							)}
						</ul>
					</div>
				</DetailModal>
			)}
		</PageWrapper>
	);
};

import { withBoundary } from "@/components/withBoundary";
export default withBoundary(SiteAnalytics);
