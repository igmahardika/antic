import { useState, useMemo, useEffect } from "react";

import { usePerf } from "@/hooks/usePerf";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	calculateCustomDuration,
	normalizeNCAL,
	getSLATarget,
	formatDurationHMS as formatDurationHMSUtil
} from "@/utils/incidentUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import SummaryCard from "@/components/ui/SummaryCard";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	XAxis,
	YAxis,
	CartesianGrid,
	PieChart,
	Pie,
	Line,
	Cell,
	Legend,
	AreaChart,
	Area
} from "@/charts/rechartsLazy";

import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/ui/PageHeader";
import TimeFilter from "@/components/TimeFilter";
import {
	CardHeaderDescription,
} from "@/components/ui/CardTypography";
import {
	BarChart,
	Bar,
} from "recharts";

// MUI Icons
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssessmentIcon from "@mui/icons-material/Assessment";
import TimelineIcon from "@mui/icons-material/Timeline";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FilterListIcon from "@mui/icons-material/FilterList";
import PersonIcon from "@mui/icons-material/Person";
import SpeedIcon from "@mui/icons-material/Speed";
import PeakHoursIcon from "@mui/icons-material/AccessTimeFilled";
import { logger } from "@/lib/logger";

// Constants & Helpers
const VENDOR_SLA_MINUTES = 240; // 4 hours

const NCAL_COLORS = {
	Blue: "#3b82f6",
	Yellow: "#eab308",
	Orange: "#f97316",
	Red: "#ef4444",
	Black: "#1f2937",
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

const formatDurationHMS = (minutes: number): string => {
	return formatDurationHMSUtil(minutes);
};

const TSAnalytics: React.FC = () => {
	const [startMonth, setStartMonth] = useState<string | null>("01");
	const [endMonth, setEndMonth] = useState<string | null>("12");
	const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString());
	const [selectedTS, setSelectedTS] = useState<string>("all");

	usePerf('TSAnalytics');

	// Get Data using CacheService (Sync with Server)
	const [allIncidents, setAllIncidents] = useState<any[]>([]);

	useEffect(() => {
		const fetchIncidents = async () => {
			try {
				const { cacheService } = await import("@/services/cacheService");
				const incidents = await cacheService.getIncidents();
				logger.info(
					"✅ TSAnalytics: Successfully loaded",
					incidents.length,
					"incidents from CacheService",
				);
				setAllIncidents(incidents);
			} catch (error) {
				logger.error("❌ TSAnalytics: Failed to load incidents:", error);
			}
		};
		fetchIncidents();
	}, []);

	// Extract available filters and set default year
	const { availableTS, availableYears } = useMemo(() => {
		if (!allIncidents || allIncidents.length === 0) return { availableTS: [], availableYears: [] };

		const tsSet = new Set<string>();
		const yearSet = new Set<number>();

		allIncidents.forEach(inc => {
			if (inc.ts) tsSet.add(inc.ts.trim());
			if (inc.startTime) {
				const yr = new Date(inc.startTime).getFullYear();
				if (!isNaN(yr)) yearSet.add(yr);
			}
		});

		const years = Array.from(yearSet).sort((a, b) => b - a);

		return {
			availableTS: Array.from(tsSet).sort(),
			availableYears: years
		};
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

			// 3. Filter by TS
			if (selectedTS !== "all" && (!incident.ts || incident.ts.trim() !== selectedTS)) return false;

			return true;
		});
	}, [allIncidents, startMonth, endMonth, selectedYear, selectedTS]);

	// Advanced Analytics Calculation
	const analytics = useMemo(() => {
		if (!filteredIncidents.length) return null;

		const total = filteredIncidents.length;
		const resolved = filteredIncidents.filter(i => i.status === 'Done').length;

		// Duration Stats
		const durations = filteredIncidents.map(i => ({
			val: calculateCustomDuration(i),
			ncal: i.ncal
		})).filter(d => d.val > 0);

		const avgDuration = durations.length ? durations.reduce((a, b) => a + b.val, 0) / durations.length : 0;
		const slaBreach = durations.filter(d => d.val > getSLATarget(d.ncal)).length;
		const slaCompliance = total > 0 ? ((total - slaBreach) / total) * 100 : 100;

		// NCAL Analysis
		const ncalCounts: Record<string, number> = {};
		filteredIncidents.forEach(inc => {
			const ncal = normalizeNCAL(inc.ncal);
			ncalCounts[ncal] = (ncalCounts[ncal] || 0) + 1;
		});

		const ncalData = Object.entries(ncalCounts).map(([name, value]) => ({
			name,
			value,
			fill: NCAL_COLORS[name as keyof typeof NCAL_COLORS] || "#8884d8"
		}));

		// Leaderboard & Performance
		const tsStats: Record<string, any> = {};
		filteredIncidents.forEach(inc => {
			const name = inc.ts || "Unknown";
			if (!tsStats[name]) {
				tsStats[name] = {
					name,
					count: 0,
					resolved: 0,
					totalDur: 0,
					durCount: 0,
					breaches: 0
				};
			}
			tsStats[name].count++;
			if (inc.status === 'Done') tsStats[name].resolved++;
			const dur = calculateCustomDuration(inc);
			if (dur > 0) {
				tsStats[name].totalDur += dur;
				tsStats[name].durCount++;
				if (dur > getSLATarget(inc.ncal)) tsStats[name].breaches++;
			}
		});

		const leaderboard = Object.values(tsStats).map((s: any) => ({
			...s,
			avgDur: s.durCount ? s.totalDur / s.durCount : 0,
			sla: s.count ? ((s.count - s.breaches) / s.count) * 100 : 100
		})).sort((a: any, b: any) => b.count - a.count);

		// Monthly Trends & MoM
		const trends: Record<string, any> = {};
		filteredIncidents.forEach(inc => {
			if (!inc.startTime) return;
			const d = new Date(inc.startTime);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

			if (!trends[key]) trends[key] = { month: key, count: 0, totalDur: 0, n: 0, resolved: 0 };
			trends[key].count++;
			if (inc.status === 'Done') trends[key].resolved++;
			const dur = calculateCustomDuration(inc);
			if (dur > 0) {
				trends[key].totalDur += dur;
				trends[key].n++;
			}
		});

		const trendData = Object.values(trends)
			.sort((a: any, b: any) => a.month.localeCompare(b.month))
			.map((t: any) => ({
				month: t.month,
				Tickets: t.count,
				AvgDuration: t.n ? Math.round(t.totalDur / t.n) : 0,
				Resolved: t.resolved
			}));

		// Peak Hours (Incident distribution by hour of day)
		const hourlyDistribution = new Array(24).fill(0);
		filteredIncidents.forEach(inc => {
			if (inc.startTime) {
				const hour = new Date(inc.startTime).getHours();
				hourlyDistribution[hour]++;
			}
		});

		const peakHoursData = hourlyDistribution.map((count, hour) => ({
			hour: `${hour}:00`,
			count
		}));

		// MoM Trends calculation
		let momTrends = {
			tickets: { value: 0, type: "flat" as "up" | "down" | "flat" },
			duration: { value: 0, type: "flat" as "up" | "down" | "flat" },
			sla: { value: 0, type: "flat" as "up" | "down" | "flat" },
			resolution: { value: 0, type: "flat" as "up" | "down" | "flat" }
		};

		if (trendData.length >= 2) {
			const current = trendData[trendData.length - 1];
			const previous = trendData[trendData.length - 2];

			const calcTrend = (curr: number, prev: number, inverse = false): { value: number; type: "up" | "down" | "flat" } => {
				if (prev === 0) return { value: 0, type: "flat" };
				const diff = ((curr - prev) / prev) * 100;
				// If inverse is true (like duration), positive diff is bad (red)
				const isUp = diff > 0.5;
				const isDown = diff < -0.5;

				if (!inverse) {
					return { value: Math.abs(diff), type: isUp ? "up" : isDown ? "down" : "flat" };
				} else {
					return { value: Math.abs(diff), type: isUp ? "down" : isDown ? "up" : "flat" };
				}
			};

			momTrends.tickets = calcTrend(current.Tickets, previous.Tickets);
			momTrends.duration = calcTrend(current.AvgDuration, previous.AvgDuration, true);

			// momTrends.sla = { value: 0, type: "flat" }; 

			const curResRate = current.Resolved / (current.Tickets || 1);
			const prevResRate = previous.Resolved / (previous.Tickets || 1);
			momTrends.resolution = calcTrend(curResRate * 100, prevResRate * 100);
		}

		return {
			total,
			resolved,
			avgDuration,
			slaCompliance,
			ncalData,
			leaderboard,
			trendData,
			peakHoursData,
			momTrends
		};
	}, [filteredIncidents]);

	if (!allIncidents && !analytics) return <div className="p-8">Loading analytics...</div>;

	// Render Empty State
	if (!analytics) return (
		<PageWrapper maxW="full">
			<PageHeader
				title="Technical Support Analytics"
				description="Performance analysis of Technical Support personnel"
			/>
			<div className="p-8 text-center border-2 border-dashed rounded-lg">
				No data available for the selected filtered.
			</div>
		</PageWrapper>
	);

	return (
		<PageWrapper maxW="full">
			<div className="space-y-6">
				<PageHeader
					title="Technical Support Analytics"
					description="Comprehensive performance analysis of support personnel"
				/>

				{/* Filters Panel */}
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

					<div className="bg-card border rounded-xl shadow-sm px-4 py-2 flex items-center gap-3 h-[48px]">
						<FilterListIcon className="text-muted-foreground" />
						<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TS:</span>
						<select
							className="bg-background border-none rounded-lg px-2 py-1 text-sm focus:ring-0 outline-none font-medium"
							value={selectedTS}
							onChange={(e) => setSelectedTS(e.target.value)}
						>
							<option value="all">All Personnel</option>
							{availableTS.map(ts => <option key={ts} value={ts}>{ts}</option>)}
						</select>
					</div>
				</div>

				{/* KPI Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<SummaryCard
						title="Total Tickets"
						value={analytics.total}
						description="Total assignments in period"
						icon={<AssessmentIcon className="text-white" />}
						iconBg="bg-blue-600"
						trend={analytics.momTrends.tickets.value.toFixed(1) + "%"}
						trendType={analytics.momTrends.tickets.type}
					/>
					<SummaryCard
						title="Avg Resolution Time"
						value={formatDurationHMS(analytics.avgDuration)}
						description="Average handling duration"
						icon={<AccessTimeIcon className="text-white" />}
						iconBg="bg-amber-500"
						trend={analytics.momTrends.duration.value.toFixed(1) + "%"}
						trendType={analytics.momTrends.duration.type}
					/>
					<SummaryCard
						title="SLA Compliance"
						value={`${analytics.slaCompliance.toFixed(1)}%`}
						description="Based on NCAL-specific targets"
						icon={<CheckCircleIcon className="text-white" />}
						iconBg={analytics.slaCompliance >= 90 ? "bg-emerald-500" : "bg-red-500"}
					/>
					<SummaryCard
						title="Resolution Rate"
						value={`${((analytics.resolved / analytics.total) * 100).toFixed(1)}%`}
						description={`${analytics.resolved} resolved`}
						icon={<TrendingUpIcon className="text-white" />}
						iconBg="bg-violet-500"
						trend={analytics.momTrends.resolution.value.toFixed(1) + "%"}
						trendType={analytics.momTrends.resolution.type}
					/>
				</div>

				{/* Main Charts Area */}
				<div className="grid grid-cols-1 gap-6">
					{/* Monthly Trends - Full Width */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<TimelineIcon className="text-blue-500" />
								Monthly Performance Trend
							</CardTitle>
							<CardHeaderDescription>Ticket volume vs Average duration trend</CardHeaderDescription>
						</CardHeader>
						<CardContent className="h-[400px]">
							<ChartContainer config={{}} className="h-full w-full">
								<AreaChart data={analytics.trendData}>
									<defs>
										<linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
											<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis dataKey="month" tick={{ fontSize: 12 }} />
									<YAxis yAxisId="left" />
									<YAxis yAxisId="right" orientation="right" />
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
													return undefined; // use default for others
												}}
											/>
										}
									/>
									<Legend />
									<Area
										yAxisId="left"
										type="monotone"
										dataKey="Tickets"
										stroke="#3b82f6"
										fillOpacity={1}
										fill="url(#colorTickets)"
									/>
									<Line
										yAxisId="right"
										type="monotone"
										dataKey="AvgDuration"
										name="Avg Duration"
										stroke="#f59e0b"
										strokeWidth={2}
									/>
								</AreaChart>
							</ChartContainer>
						</CardContent>
					</Card>

					{/* Side-by-side 50/50 Charts */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Peak Support Times */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<PeakHoursIcon className="text-orange-500" />
									Peak Support Times
								</CardTitle>
								<CardHeaderDescription>Incident distribution by hour of day</CardHeaderDescription>
							</CardHeader>
							<CardContent className="h-[350px]">
								<ChartContainer config={{}} className="h-full w-full">
									<BarChart data={analytics.peakHoursData}>
										<CartesianGrid strokeDasharray="3 3" vertical={false} />
										<XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
										<YAxis tick={{ fontSize: 10 }} />
										<ChartTooltip content={<ChartTooltipContent />} />
										<Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
									</BarChart>
								</ChartContainer>
							</CardContent>
						</Card>

						{/* NCAL Distribution */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<SpeedIcon className="text-purple-500" />
									NCAL Distribution
								</CardTitle>
								<CardHeaderDescription>Incidents by severity level</CardHeaderDescription>
							</CardHeader>
							<CardContent className="h-[350px]">
								<ChartContainer config={{}} className="h-full w-full">
									<PieChart>
										<Pie
											data={analytics.ncalData}
											cx="50%"
											cy="50%"
											innerRadius={60}
											outerRadius={100}
											paddingAngle={5}
											dataKey="value"
										>
											{analytics.ncalData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.fill} />
											))}
										</Pie>
										<ChartTooltip content={<ChartTooltipContent />} />
										<Legend verticalAlign="bottom" height={36} />
									</PieChart>
								</ChartContainer>
							</CardContent>
						</Card>
					</div>

					{/* Personnel Performance Matrix - Full Width */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<PersonIcon className="text-indigo-500" />
								Personnel Performance Matrix
							</CardTitle>
							<CardHeaderDescription>Detailed breakdown by technical support personnel</CardHeaderDescription>
						</CardHeader>
						<CardContent>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className="border-b bg-muted/50">
											<th className="py-3 px-4 text-left font-semibold">Rank</th>
											<th className="py-3 px-4 text-left font-semibold">Personnel Name</th>
											<th className="py-3 px-4 text-center font-semibold">Total Tickets</th>
											<th className="py-3 px-4 text-center font-semibold">Resolved</th>
											<th className="py-3 px-4 text-center font-semibold">SLA Score</th>
											<th className="py-3 px-4 text-right font-semibold">Avg Duration</th>
											<th className="py-3 px-4 text-left font-semibold w-[200px]">Performance</th>
										</tr>
									</thead>
									<tbody>
										{analytics.leaderboard.map((item: any, idx: number) => (
											<tr key={idx} className="border-b hover:bg-muted/20 transition-colors">
												<td className="py-3 px-4 text-muted-foreground">#{idx + 1}</td>
												<td className="py-3 px-4 font-medium text-foreground">{item.name}</td>
												<td className="py-3 px-4 text-center">
													<Badge variant="secondary" className="px-2 py-0.5">{item.count}</Badge>
												</td>
												<td className="py-3 px-4 text-center text-muted-foreground">
													{item.resolved}
												</td>
												<td className="py-3 px-4 text-center">
													<div className="flex flex-col items-center">
														<span className={`font-semibold ${item.sla >= 90 ? "text-emerald-600" :
															item.sla >= 70 ? "text-amber-600" : "text-red-600"
															}`}>
															{item.sla.toFixed(1)}%
														</span>
														{idx === 0 && item.sla >= 95 && (
															<Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mt-1">SLA Champion</Badge>
														)}
													</div>
												</td>
												<td className="py-3 px-4 text-right font-mono text-xs">
													{formatDurationHMS(item.avgDur)}
												</td>
												<td className="py-3 px-4">
													<div className="flex items-center gap-2">
														<Progress
															value={item.sla}
															className="h-2 flex-1"
														/>
														<span className="text-[10px] text-muted-foreground">{item.sla.toFixed(0)}</span>
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
			</div>
		</PageWrapper>
	);
};

import { withBoundary } from "@/components/withBoundary";
export default withBoundary(TSAnalytics);
