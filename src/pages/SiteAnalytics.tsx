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

// Constants
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
			ncal: i.ncal
		})).filter(d => d.val > 0);

		const avgDuration = durations.length ? durations.reduce((a, b) => a + b.val, 0) / durations.length : 0;
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
					durCount: 0,
					highSeverity: 0,
					problems: {} as Record<string, number>
				};
			}
			siteStats[site].count++;
			if (inc.status === 'Done') siteStats[site].resolved++;

			// Track problems
			const prob = inc.problem || inc.penyebab || inc.klasifikasiGangguan || "Other";
			siteStats[site].problems[prob] = (siteStats[site].problems[prob] || 0) + 1;

			const dur = calculateCustomDuration(inc);
			if (dur > 0) {
				siteStats[site].totalDur += dur;
				siteStats[site].durCount++;
				if (dur > getSLATarget(inc.ncal)) siteStats[site].highSeverity++;
			}
		});

		// Calculate Risk Score & Metrics
		const siteMetrics = Object.values(siteStats).map((s: any) => {
			const avgDur = s.durCount ? s.totalDur / s.durCount : 0;
			const reliability = s.count ? (s.resolved / s.count) * 100 : 0;
			const slaCompliance = s.count ? ((s.count - s.highSeverity) / s.count) * 100 : 100;

			// Find most frequent problem
			const topProb = Object.entries(s.problems)
				.sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "None";

			// Risk Score Algorithm:
			// 30% Volume, 30% Duration, 20% Unresolved, 20% SLA Breach
			const volumeRisk = Math.min(s.count * 2, 30);
			const durationRisk = Math.min((avgDur / 120) * 10, 30); // 120min as baseline
			const reliabilityRisk = Math.min((100 - reliability) * 0.2, 20);
			const slaRisk = Math.min((100 - slaCompliance) * 0.2, 20);
			const riskScore = volumeRisk + durationRisk + reliabilityRisk + slaRisk;

			return {
				...s,
				avgDur,
				reliability,
				slaCompliance,
				topProb,
				riskScore
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

			if (!trends[key]) trends[key] = { month: key, count: 0, distinctSites: new Set(), totalDur: 0, durCount: 0, resolved: 0 };
			trends[key].count++;
			trends[key].distinctSites.add(inc.site);
			if (inc.status === 'Done') trends[key].resolved++;
			const dur = calculateCustomDuration(inc);
			if (dur > 0) {
				trends[key].totalDur += dur;
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
						title="Avg Downtime"
						value={formatDurationHMS(stats.avgDuration)}
						description="Average incident duration"
						icon={<AccessTimeIcon className="text-white" />}
						iconBg="bg-amber-500"
						trend={stats.momTrends.duration.value.toFixed(1) + "%"}
						trendType={stats.momTrends.duration.type}
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
													if (name === "AvgDuration") {
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
										dataKey="ActiveSites"
										stroke="#f97316"
										strokeWidth={3}
										dot={{ r: 4 }}
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
										<th className="py-3 px-4 text-right font-semibold">Avg Duration</th>
										<th className="py-3 px-4 text-center font-semibold">Risk Level</th>
									</tr>
								</thead>
								<tbody>
									{stats.siteMetrics.slice(0, 20).map((site: any, idx: number) => (
										<tr key={idx} className="border-b hover:bg-muted/10 transition-colors">
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
											<td className="py-3 px-4 text-center">
												<span className={`font-mono text-sm font-bold ${site.slaCompliance < 80 ? "text-rose-600" : site.slaCompliance < 95 ? "text-amber-600" : "text-emerald-600"}`}>
													{site.slaCompliance.toFixed(0)}%
												</span>
											</td>
											<td className="py-3 px-4 text-center">
												<span className={`font-mono text-xs ${site.reliability < 90 ? "text-amber-600" : "text-emerald-600"}`}>
													{site.reliability.toFixed(0)}%
												</span>
											</td>
											<td className="py-3 px-4">
												<div className="flex flex-col">
													<span className="text-xs text-foreground truncate max-w-[200px]" title={site.topProb}>
														{site.topProb}
													</span>
													{site.count > 5 && (
														<span className="text-[10px] text-rose-500 font-bold uppercase tracking-tight">Recurring Issue</span>
													)}
												</div>
											</td>
											<td className="py-3 px-4 text-right font-mono text-xs">
												<span className={`${site.avgDur > 240 ? "text-rose-500" : site.avgDur < 120 ? "text-emerald-500" : "text-amber-500"}`}>
													{formatDurationHMS(site.avgDur)}
												</span>
											</td>
											<td className="py-3 px-4 text-center">
												<div className="flex items-center justify-center gap-2">
													<div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
														<div
															className={`h-full transition-all duration-500 ${site.riskScore > 70 ? "bg-rose-500" :
																site.riskScore > 40 ? "bg-amber-500" : "bg-emerald-500"
																}`}
															style={{ width: `${site.riskScore}%` }}
														/>
													</div>
													<span className="text-[10px] font-bold text-muted-foreground">{site.riskScore.toFixed(0)}</span>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			</div>
		</PageWrapper>
	);
};

import { withBoundary } from "@/components/withBoundary";
export default withBoundary(SiteAnalytics);
