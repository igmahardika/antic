import React, { useState, useEffect } from "react";
import { Incident, IncidentFilter } from "@/types/incident";
import {
	formatDurationHMS
} from "@/utils/incidentUtils";
import { IncidentUpload } from "@/components/IncidentUpload";
import { incidentAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import SummaryCard from "@/components/ui/SummaryCard";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/ui/PageHeader";
import { usePageUrlState } from "@/hooks/usePageUrlState";
import { PaginationControls } from "@/components";
import { logger } from "@/lib/logger";
import {
	Search,
	Filter,
	Download,
	Trash2,
	AlertTriangle,
	Clock,
	CheckCircle,
	XCircle,
	RefreshCw,
	Database,
	ChevronDown
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as papaparse from "papaparse";
import { saveAs } from "file-saver";
import { cacheService } from "@/services/cacheService";

export const IncidentData: React.FC = () => {
	const { toast } = useToast();

	const [filter, setFilter] = useState<IncidentFilter>({
		page: 1,
		limit: 50,
	});
	const [incidents, setIncidents] = useState<Incident[]>([]);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [showUpload, setShowUpload] = useState(false);
	const [showResetConfirm, setShowResetConfirm] = useState(false);
	const [selectedMonth, setSelectedMonth] = useState<string>("");
	const [stats, setStats] = useState<any>(null);
	const [availableMonths, setAvailableMonths] = useState<string[]>([]);

	// URL-synced pagination
	const {
		page,
		pageSize,
		setPage,
		setPageSize,
		totalPages: paginationTotalPages,
	} = usePageUrlState({
		paramPage: "incident_page",
		paramPageSize: "incident_pageSize",
		initialPage: 1,
		initialPageSize: 50,
		allowedPageSizes: [10, 25, 50, 100],
		totalItems: total,
		resetOnDeps: [selectedMonth],
	});

	const getPriorityBadgeVariant = (priority: string): any => {
		const p = priority?.toLowerCase();
		if (p === "p1" || p === "critical") return "danger";
		if (p === "p2" || p === "high") return "warning";
		if (p === "p3" || p === "medium") return "info";
		return "default";
	};

	const getNCALBadgeVariant = (ncal: string): any => {
		const n = ncal?.toLowerCase();
		if (n === "red") return "danger";
		if (n === "black") return "default";
		if (n === "orange" || n === "yellow") return "warning";
		if (n === "blue") return "info";
		return "secondary";
	};

	const getStatusBadgeVariant = (status: string): any => {
		const s = status?.toLowerCase();
		if (s === "closed" || s === "resolved") return "success";
		if (s === "open" || s === "new") return "info";
		if (s === "pending" || s === "progress") return "warning";
		return "default";
	};

	const getStatusIcon = (status: string) => {
		const s = status?.toLowerCase();
		if (s === "closed" || s === "resolved")
			return <CheckCircle className="w-3 h-3 text-green-500" />;
		if (s === "open" || s === "new")
			return <Clock className="w-3 h-3 text-blue-500" />;
		if (s === "pending" || s === "progress")
			return <Clock className="w-3 h-3 text-yellow-500" />;
		return <XCircle className="w-3 h-3 text-gray-400" />;
	};

	const loadData = async () => {
		setIsLoading(true);
		try {
			const result = await incidentAPI.getIncidents({
				page,
				limit: pageSize,
				search: filter.search,
				priority: filter.priority,
				ncal: filter.ncal,
				status: filter.status,
				month: selectedMonth
			});

			setIncidents(result.incidents);
			setTotal(result.total);

			const statsData = await incidentAPI.getIncidentStats({ month: selectedMonth });
			setStats(statsData);

			const months = await incidentAPI.getIncidentMonths();
			setAvailableMonths(months);

		} catch (error) {
			logger.error("Error loading incidents:", error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, [page, pageSize, filter, selectedMonth]);

	const handleReset = async () => {
		try {
			await incidentAPI.deleteAllIncidents();
			await cacheService.invalidateIncidents();
			setShowResetConfirm(false);
			toast({
				title: "Success",
				description: "All incident data has been deleted from server.",
			});
			loadData();
		} catch (error) {
			logger.error("Reset failed:", error);
			toast({
				title: "Error",
				description: "Failed to reset database.",
				variant: "destructive"
			});
		}
	};

	const handleFilterChange = (key: keyof IncidentFilter, value: any) => {
		setFilter((prev) => ({
			...prev,
			[key]: value,
			page: 1,
		}));
		if (key === "limit") {
			setPageSize(value);
		} else {
			setPage(1);
		}
	};

	const handleRefreshFilters = () => {
		setFilter({ page: 1, limit: 50 });
		setSelectedMonth("");
		setPage(1);
		setPageSize(50);
	};

	const formatMonthLabel = (monthKey: string) => {
		if (!monthKey) return "";
		const [year, month] = monthKey.split("-");
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString("id-ID", { year: "numeric", month: "long" });
	};

	const handleMonthChange = (monthKey: string) => {
		setSelectedMonth(monthKey);
		setPage(1);
	};

	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return "-";
		try {
			const date = new Date(dateString);
			if (isNaN(date.getTime())) return "-";
			// Format: DD/MM/YYYY HH:MM
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');
			return `${day}/${month}/${year} ${hours}:${minutes}`;
		} catch (e) { return "-"; }
	};

	const exportToCSV = async () => {
		setIsLoading(true);
		try {
			const result = await incidentAPI.getIncidents({
				limit: 1000,
				search: filter.search,
				priority: filter.priority,
				ncal: filter.ncal,
				status: filter.status,
				month: selectedMonth
			});

			const csv = papaparse.unparse(result.incidents.map(inc => ({
				"No Case": inc.noCase,
				"Priority": inc.priority,
				"Site": inc.site,
				"NCAL": inc.ncal,
				"Status": inc.status,
				"Level": inc.level,
				"TS": inc.ts,
				"ODP/BTS": inc.odpBts,
				"Start Time": inc.startTime,
				"Start Escalation Vendor": inc.startEscalationVendor,
				"End Time": inc.endTime,
				"Duration (min)": inc.durationMin,
				"Duration Vendor (min)": inc.durationVendorMin,
				"Start Pause": inc.startPause1,
				"End Pause": inc.endPause1,
				"Start Pause 2": inc.startPause2,
				"End Pause 2": inc.endPause2,
				"Total Duration Pause (min)": inc.totalDurationPauseMin,
				"Total Duration Vendor (min)": inc.totalDurationVendorMin,
				"Problem": inc.problem,
				"Penyebab": inc.penyebab,
				"Action Terakhir": inc.actionTerakhir,
				"Note": inc.note,
				"Klasifikasi": inc.klasifikasiGangguan,
				"Power Before (dBm)": inc.powerBefore,
				"Power After (dBm)": inc.powerAfter
			})));

			const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
			saveAs(blob, `incidents_${selectedMonth || "all"}_${new Date().toISOString().split("T")[0]}.csv`);
		} catch (error) {
			logger.error("Export failed:", error);
			toast({ title: "Export Failed", variant: "destructive" });
		} finally {
			setIsLoading(false);
		}
	};

	// Format duration as HH:MM:SS
	const formatDuration = (minutes: number | null | undefined) => {
		if (minutes === null || minutes === undefined || isNaN(minutes) || minutes <= 0) return "-";
		return formatDurationHMS(minutes);
	};

	const columns: Array<{
		key: keyof Incident;
		label: string;
		render?: (value: any) => React.ReactNode;
		width?: string;
	}> = [
			{ key: "noCase", label: "No Case", width: "w-28" },
			{
				key: "priority",
				label: "Priority",
				width: "w-20",
				render: (v: string) => v ? (
					<Badge variant={getPriorityBadgeVariant(v)} className="text-xs font-medium">
						{v.toUpperCase()}
					</Badge>
				) : "-"
			},
			{ key: "site", label: "Site", width: "w-32" },
			{
				key: "ncal",
				label: "NCAL",
				width: "w-20",
				render: (v: string) => v ? (
					<Badge variant={getNCALBadgeVariant(v)} className="text-xs font-medium">
						{v}
					</Badge>
				) : "-"
			},
			{
				key: "status",
				label: "Status",
				width: "w-24",
				render: (v: string) => v ? (
					<div className="flex items-center gap-2">
						{getStatusIcon(v)}
						<Badge variant={getStatusBadgeVariant(v)} className="text-xs font-medium">
							{v}
						</Badge>
					</div>
				) : "-"
			},
			{ key: "level", label: "Level", width: "w-16" },
			{ key: "ts", label: "TS/Vendor", width: "w-28" },
			{ key: "odpBts", label: "ODP/BTS", width: "w-28" },
			// Time fields
			{
				key: "startTime",
				label: "Start",
				width: "w-36",
				render: (v: string) => <div className="text-xs font-mono whitespace-nowrap">{formatDate(v)}</div>
			},
			{
				key: "startEscalationVendor",
				label: "Start Escalation",
				width: "w-36",
				render: (v: string) => <div className="text-xs font-mono whitespace-nowrap">{formatDate(v)}</div>
			},
			{
				key: "endTime",
				label: "End",
				width: "w-36",
				render: (v: string) => <div className="text-xs font-mono whitespace-nowrap">{formatDate(v)}</div>
			},
			// Duration fields
			{
				key: "durationMin",
				label: "Duration",
				width: "w-24",
				render: (v: number) => <div className="text-xs font-mono">{formatDuration(v)}</div>
			},
			{
				key: "durationVendorMin",
				label: "Duration Vendor",
				width: "w-24",
				render: (v: number) => <div className="text-xs font-mono">{formatDuration(v)}</div>
			},
			// Pause fields
			{
				key: "startPause1",
				label: "Start Pause",
				width: "w-36",
				render: (v: string) => <div className="text-xs font-mono whitespace-nowrap">{formatDate(v)}</div>
			},
			{
				key: "endPause1",
				label: "End Pause",
				width: "w-36",
				render: (v: string) => <div className="text-xs font-mono whitespace-nowrap">{formatDate(v)}</div>
			},
			{
				key: "startPause2",
				label: "Start Pause 2",
				width: "w-36",
				render: (v: string) => <div className="text-xs font-mono whitespace-nowrap">{formatDate(v)}</div>
			},
			{
				key: "endPause2",
				label: "End Pause 2",
				width: "w-36",
				render: (v: string) => <div className="text-xs font-mono whitespace-nowrap">{formatDate(v)}</div>
			},
			{
				key: "totalDurationPauseMin",
				label: "Total Pause",
				width: "w-24",
				render: (v: number) => <div className="text-xs font-mono">{formatDuration(v)}</div>
			},
			{
				key: "totalDurationVendorMin",
				label: "Net Vendor Time",
				width: "w-28",
				render: (v: number) => <div className="text-xs font-mono">{formatDuration(v)}</div>
			},
			// Description fields
			{ key: "problem", label: "Problem", width: "w-48" },
			{ key: "penyebab", label: "Penyebab", width: "w-48" },
			{ key: "actionTerakhir", label: "Action Terakhir", width: "w-48" },
			{ key: "note", label: "Note", width: "w-48" },
			{ key: "klasifikasiGangguan", label: "Klasifikasi", width: "w-40" },
			// Power levels
			{
				key: "powerBefore",
				label: "Power Before (dBm)",
				width: "w-28",
				render: (v: number) => v ? <div className="text-xs font-mono">{v} dBm</div> : "-"
			},
			{
				key: "powerAfter",
				label: "Power After (dBm)",
				width: "w-28",
				render: (v: number) => v ? <div className="text-xs font-mono">{v} dBm</div> : "-"
			}
		];

	return (
		<PageWrapper maxW="4xl">
			<div className="space-y-6 lg:space-y-8">
				<PageHeader
					title="Incident Data"
					description="Upload and manage incident records (Server-side)"
				/>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<SummaryCard
						title="Total Incidents"
						value={stats?.total ?? 0}
						icon={<Database className="w-5 h-5 text-white" />}
						iconBg="bg-blue-600"
						description="Total data tersimpan di server"
					/>
					<SummaryCard
						title="Open Cases"
						value={stats?.open ?? 0}
						icon={<Clock className="w-5 h-5 text-white" />}
						iconBg="bg-orange-500"
						description="Kasus yang masih terbuka"
					/>
					<SummaryCard
						title="Avg Duration"
						value={`${Math.round(stats?.avgDuration || 0)} min`}
						icon={<AlertTriangle className="w-5 h-5 text-white" />}
						iconBg="bg-amber-500"
						description="Rata-rata durasi kasus"
					/>
					<SummaryCard
						title="Avg Net Duration"
						value={`${Math.round(stats?.avgNetDuration || 0)} min`}
						icon={<CheckCircle className="w-5 h-5 text-white" />}
						iconBg="bg-emerald-600"
						description="Rata-rata durasi bersih"
					/>
				</div>

				{stats?.ncalCounts && Object.keys(stats.ncalCounts).length > 0 && (
					<Card className="border-none shadow-md overflow-hidden bg-white dark:bg-gray-800">
						<CardContent className="p-0">
							<div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-100 dark:divide-gray-700">
								{["Blue", "Yellow", "Orange", "Red", "Black"].map((ncal) => (
									<div key={ncal} className="p-4 flex flex-col items-center justify-center gap-1 group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
										<Badge variant={getNCALBadgeVariant(ncal)} className="mb-1">
											{ncal}
										</Badge>
										<span className="text-xl font-bold text-gray-900 dark:text-white">
											{stats.ncalCounts[ncal] || 0}
										</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div className="flex flex-wrap gap-2">
						<Button onClick={() => setShowUpload(!showUpload)} variant={showUpload ? "secondary" : "outline"} size="sm">
							<RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
							{showUpload ? "Hide Upload" : "Upload Data"}
						</Button>
						<Button onClick={exportToCSV} variant="outline" size="sm" disabled={isLoading || incidents.length === 0}>
							<Download className="w-4 h-4 mr-2" /> Export CSV
						</Button>
						<Button onClick={() => setShowResetConfirm(true)} variant="destructive" size="sm">
							<Trash2 className="w-4 h-4 mr-2" /> Reset Database
						</Button>
					</div>

					<div className="flex items-center gap-2">
						{availableMonths.length > 0 && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm" className="h-9">
										<Clock className="w-4 h-4 mr-2" />
										{selectedMonth ? formatMonthLabel(selectedMonth) : "All Time"}
										<ChevronDown className="w-4 h-4 ml-2" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-48">
									<DropdownMenuItem onClick={() => handleMonthChange("")}>All Time</DropdownMenuItem>
									{availableMonths.map(m => (
										<DropdownMenuItem key={m} onClick={() => handleMonthChange(m)}>
											{formatMonthLabel(m)}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</div>

				{showUpload && (
					<div className="animate-in fade-in slide-in-from-top-4 duration-300">
						<IncidentUpload onComplete={loadData} />
					</div>
				)}

				<Card className="border-none shadow-lg bg-white dark:bg-gray-800 overflow-hidden">
					<CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
									<Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
								</div>
								<div>
									<h2 className="text-lg font-bold text-gray-900 dark:text-white">Filter Data</h2>
								</div>
							</div>
							<Button variant="ghost" size="sm" onClick={handleRefreshFilters} className="text-xs">
								Reset Filters
							</Button>
						</div>
					</CardHeader>
					<CardContent className="pt-6 border-b border-gray-100 dark:border-gray-700">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Search</label>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
									<Input
										placeholder="No Case / Site..."
										value={filter.search || ""}
										onChange={(e) => handleFilterChange("search", e.target.value)}
										className="pl-9 h-10"
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">NCAL</label>
								<select
									value={filter.ncal || ""}
									onChange={(e) => handleFilterChange("ncal", e.target.value || undefined)}
									className="w-full h-10 px-3 bg-gray-50 dark:bg-gray-900/50 border rounded-md text-sm"
								>
									<option value="">All Levels</option>
									{["Blue", "Yellow", "Orange", "Red", "Black"].map(lvl => (
										<option key={lvl} value={lvl}>{lvl}</option>
									))}
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Priority</label>
								<select
									value={filter.priority || ""}
									onChange={(e) => handleFilterChange("priority", e.target.value || undefined)}
									className="w-full h-10 px-3 bg-gray-50 dark:bg-gray-900/50 border rounded-md text-sm"
								>
									<option value="">All Priorities</option>
									{["P1", "P2", "P3"].map(p => (
										<option key={p} value={p}>{p}</option>
									))}
								</select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</label>
								<select
									value={filter.status || ""}
									onChange={(e) => handleFilterChange("status", e.target.value || undefined)}
									className="w-full h-10 px-3 bg-gray-50 dark:bg-gray-900/50 border rounded-md text-sm"
								>
									<option value="">All Statuses</option>
									{["Open", "Closed", "Pending", "Resolved", "Progress"].map(s => (
										<option key={s} value={s}>{s}</option>
									))}
								</select>
							</div>
						</div>
					</CardContent>

					<CardContent className="p-0">
						{isLoading ? (
							<div className="flex flex-col justify-center items-center h-64 gap-3">
								<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
								<span className="text-sm text-gray-500">Loading server data...</span>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
									<thead className="bg-gray-50 dark:bg-gray-800/50">
										<tr>
											{columns.map((col) => (
												<th key={col.key} className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
													{col.label}
												</th>
											))}
										</tr>
									</thead>
									<tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
										{incidents.length === 0 ? (
											<tr>
												<td colSpan={columns.length} className="text-center py-20 text-gray-500">
													<div className="flex flex-col items-center gap-2">
														<XCircle className="w-10 h-10 text-gray-300" />
														<span className="text-base font-medium">No results found</span>
													</div>
												</td>
											</tr>
										) : (
											incidents.map((incident) => (
												<tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
													{columns.map((col) => (
														<td key={col.key} className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 align-top ${col.width || ""}`}>
															<div className="truncate max-w-[200px]" title={String(incident[col.key as keyof Incident] || "-")}>
																{col.render ? col.render(incident[col.key as keyof Incident]) : (String(incident[col.key as keyof Incident]) || "-")}
															</div>
														</td>
													))}
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
					<div className="py-4 px-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
						<PaginationControls
							page={page}
							pageSize={pageSize}
							totalPages={paginationTotalPages || 1}
							onPageChange={setPage}
							onPageSizeChange={setPageSize}
							pageSizes={[10, 25, 50, 100]}
						/>
					</div>
				</Card>

				{showResetConfirm && (
					<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
						<Card className="max-w-md w-full">
							<CardHeader>
								<div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
									<Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
								</div>
								<CardTitle>Reset Database</CardTitle>
								<CardDescription>Delete all records from server permanently?</CardDescription>
							</CardHeader>
							<CardContent className="flex justify-end gap-3 pt-2">
								<Button variant="outline" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
								<Button variant="destructive" onClick={handleReset}>Yes, Delete All</Button>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</PageWrapper>
	);
};

export default IncidentData;
