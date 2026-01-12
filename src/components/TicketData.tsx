import { useEffect, useMemo, useState } from "react";
import { ITicket } from "@/lib/db";
import { formatDateTimeDDMMYYYY } from "@/lib/utils";
import { useAnalytics } from "./AnalyticsContext";
import { parseDateSafe } from '../utils/date';
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import GroupIcon from "@mui/icons-material/Group";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import SummaryCard from "./ui/SummaryCard";
import PageWrapper from "./PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	CardHeaderTitle,
	CardHeaderDescription,
} from "@/components/ui/CardTypography";
import { FileSpreadsheet, Search, Filter } from "lucide-react";
import { Badge } from "./ui/badge";
import { usePageUrlState } from "@/hooks/usePageUrlState";
import { PaginationControls } from "@/components";
import { OverflowX } from "@/components/OverflowX";
import { logger } from "@/lib/logger";


// Use deterministic date parser
const parseDateForFilter = (dateString: string) => {
	if (!dateString) return { month: "", year: "" };

	const date = parseDateSafe(dateString);
	if (!date) return { month: "", year: "" };

	return {
		month: String(date.getMonth() + 1).padStart(2, "0"),
		year: String(date.getFullYear())
	};
};

// Helper functions untuk validasi durasi
const isValidDuration = (duration: number): boolean => {
	return duration > 0 && duration <= 24; // Max 24 hours
};

const getDurationColor = (duration: number): string => {
	if (!duration || duration === 0) return "text-gray-500";
	if (!isValidDuration(duration)) return "text-red-500";
	if (duration > 8) return "text-amber-500";
	return "text-green-500";
};

const renderDuration = (duration: any) => {
	const durationValue = duration?.rawHours || 0;
	const formatted = duration?.formatted || "";
	const color = getDurationColor(durationValue);

	return (
		<div className={`text-xs font-mono ${color}`}>
			{formatted || "-"}
			{!isValidDuration(durationValue) && durationValue > 0 && (
				<div className="text-[8px] text-red-500 opacity-90">Overtime</div>
			)}
		</div>
	);
};

// Helper function untuk durasi penanganan dengan logika khusus
const renderHandlingDuration = (duration: any) => {
	const durationValue = duration?.rawHours || 0;
	const formatted = duration?.formatted || "";

	// Jika durasi 0 atau tidak ada, kosongkan
	if (durationValue === 0 || !formatted || formatted === "00:00:00") {
		return <span className="text-xs"></span>;
	}

	// Tentukan warna berdasarkan durasi
	let colorClass = "text-gray-500"; // default
	if (durationValue > 24) {
		colorClass = "text-red-500"; // overtime
	} else if (durationValue > 8) {
		colorClass = "text-amber-500"; // long duration
	} else if (durationValue > 0) {
		colorClass = "text-green-500"; // normal
	}

	return (
		<div className={`text-xs font-mono ${colorClass}`}>
			{formatted}
			{durationValue > 24 && (
				<div className="text-[8px] text-red-500 opacity-90">Overtime</div>
			)}
		</div>
	);
};

const columns = [
	{ key: "customerId", label: "Customer ID", width: "120px" },
	{ key: "name", label: "Nama", width: "150px" },
	{ key: "category", label: "Kategori", width: "120px" },
	{ key: "description", label: "Deskripsi", width: "200px" },
	{ key: "cause", label: "Penyebab", width: "180px" },
	{ key: "handling", label: "Penanganan", width: "180px" },
	{
		key: "openTime",
		label: "Waktu Open",
		width: "140px",
		render: (v: any) =>
			v ? <span className="text-xs">{formatDateTimeDDMMYYYY(v)}</span> : "",
	},
	{
		key: "closeTime",
		label: "Waktu Close Tiket",
		width: "140px",
		render: (v: any) =>
			v ? <span className="text-xs">{formatDateTimeDDMMYYYY(v)}</span> : "",
	},
	{
		key: "duration",
		label: "Durasi",
		width: "120px",
		render: (_v: any, row: any) => renderDuration(row.duration),
	},
	{
		key: "closeHandling",
		label: "Close Penanganan",
		width: "140px",
		render: (v: any) =>
			v ? <span className="text-xs">{formatDateTimeDDMMYYYY(v)}</span> : "",
	},
	{
		key: "handlingDuration",
		label: "Durasi Penanganan (ART)",
		width: "140px",
		render: (_v: any, row: any) => renderDuration(row.handlingDuration),
	},
	{ key: "handling1", label: "Penanganan 1", width: "180px" },
	{
		key: "closeHandling1",
		label: "Close Penanganan 1",
		width: "140px",
		render: (v: any) =>
			v ? <span className="text-xs">{formatDateTimeDDMMYYYY(v)}</span> : "",
	},
	{
		key: "handlingDuration1",
		label: "Durasi Penanganan 1 (FRT)",
		width: "140px",
		render: (_v: any, row: any) => renderDuration(row.handlingDuration1),
	},
	{ key: "handling2", label: "Penanganan 2", width: "180px" },
	{
		key: "closeHandling2",
		label: "Close Penanganan 2",
		width: "140px",
		render: (v: any) =>
			v ? <span className="text-xs">{formatDateTimeDDMMYYYY(v)}</span> : "",
	},
	{
		key: "handlingDuration2",
		label: "Durasi Penanganan 2",
		width: "160px",
		render: (_v: any, row: any) => renderHandlingDuration(row.handlingDuration2),
	},
	{ key: "handling3", label: "Penanganan 3", width: "180px" },
	{
		key: "closeHandling3",
		label: "Close Penanganan 3",
		width: "140px",
		render: (v: any) =>
			v ? <span className="text-xs">{formatDateTimeDDMMYYYY(v)}</span> : "",
	},
	{
		key: "handlingDuration3",
		label: "Durasi Penanganan 3",
		width: "160px",
		render: (_v: any, row: any) => renderHandlingDuration(row.handlingDuration3),
	},
	{ key: "handling4", label: "Penanganan 4", width: "180px" },
	{
		key: "closeHandling4",
		label: "Close Penanganan 4",
		width: "140px",
		render: (v: any) =>
			v ? <span className="text-xs">{formatDateTimeDDMMYYYY(v)}</span> : "",
	},
	{
		key: "handlingDuration4",
		label: "Durasi Penanganan 4",
		width: "160px",
		render: (_v: any, row: any) => renderHandlingDuration(row.handlingDuration4),
	},
	{ key: "handling5", label: "Penanganan 5", width: "180px" },
	{
		key: "closeHandling5",
		label: "Close Penanganan 5",
		width: "140px",
		render: (v: any) =>
			v ? <span className="text-xs">{formatDateTimeDDMMYYYY(v)}</span> : "",
	},
	{
		key: "handlingDuration5",
		label: "Durasi Penanganan 5",
		width: "160px",
		render: (_v: any, row: any) => renderHandlingDuration(row.handlingDuration5),
	},
	{ key: "openBy", label: "Open By", width: "120px" },
	{ key: "cabang", label: "Cabang", width: "100px" },
	{ key: "status", label: "Status", width: "100px" },
	{ key: "classification", label: "Klasifikasi", width: "120px" },
	{ key: "subClassification", label: "Sub Klasifikasi", width: "140px" },
];

const mapApiTicketToITicket = (apiTicket: any): ITicket | null => {
	if (!apiTicket) return null;
	try {
		return {
			id: apiTicket.id,
			customerId: String(apiTicket.customer_id || "Unknown"),
			name: String(apiTicket.name || "Unknown"),
			category: String(apiTicket.category || ""),
			description: String(apiTicket.description || ""),
			cause: String(apiTicket.cause || ""),
			handling: String(apiTicket.handling || ""),
			openTime: String(apiTicket.open_time || ""),
			closeTime: apiTicket.close_time ? String(apiTicket.close_time) : undefined,
			duration: {
				rawHours: Number(apiTicket.duration_raw_hours) || 0,
				formatted: String(apiTicket.duration_formatted || ""),
			},
			closeHandling: apiTicket.close_handling ? String(apiTicket.close_handling) : undefined,
			handlingDuration: {
				rawHours: Number(apiTicket.handling_duration_raw_hours) || 0,
				formatted: String(apiTicket.handling_duration_formatted || ""),
			},
			classification: String(apiTicket.classification || ""),
			subClassification: String(apiTicket.sub_classification || ""),
			status: String(apiTicket.status || ""),
			cabang: String(apiTicket.cabang || ""),
			handling1: String(apiTicket.handling1 || ""),
			closeHandling1: apiTicket.close_handling1 ? String(apiTicket.close_handling1) : undefined,
			handlingDuration1: {
				rawHours: Number(apiTicket.handling_duration1_raw_hours) || 0,
				formatted: String(apiTicket.handling_duration1_formatted || ""),
			},
			handling2: String(apiTicket.handling2 || ""),
			closeHandling2: apiTicket.close_handling2 ? String(apiTicket.close_handling2) : undefined,
			handlingDuration2: {
				rawHours: Number(apiTicket.handling_duration2_raw_hours) || 0,
				formatted: String(apiTicket.handling_duration2_formatted || ""),
			},
			handling3: String(apiTicket.handling3 || ""),
			closeHandling3: apiTicket.close_handling3 ? String(apiTicket.close_handling3) : undefined,
			handlingDuration3: {
				rawHours: Number(apiTicket.handling_duration3_raw_hours) || 0,
				formatted: String(apiTicket.handling_duration3_formatted || ""),
			},
			handling4: String(apiTicket.handling4 || ""),
			closeHandling4: apiTicket.close_handling4 ? String(apiTicket.close_handling4) : undefined,
			handlingDuration4: {
				rawHours: Number(apiTicket.handling_duration4_raw_hours) || 0,
				formatted: String(apiTicket.handling_duration4_formatted || ""),
			},
			handling5: String(apiTicket.handling5 || ""),
			closeHandling5: apiTicket.close_handling5 ? String(apiTicket.close_handling5) : undefined,
			handlingDuration5: {
				rawHours: Number(apiTicket.handling_duration5_raw_hours) || 0,
				formatted: String(apiTicket.handling_duration5_formatted || ""),
			},
			openBy: String(apiTicket.open_by || ""),
			uploadTimestamp: Number(apiTicket.upload_timestamp) || 0,
		};
	} catch (e) {
		console.error("Failed to map ticket:", apiTicket, e);
		return null;
	}
};

import { ticketAPI } from "@/lib/api";

const TicketData = ({ data: propsData }: { data?: ITicket[] }) => {
	const { gridData } = useAnalytics();
	// Use allTicketsInDb directly to avoid double filtering
	// Migrated from IndexedDB to API
	const [allTicketsInDb, setTickets] = useState<ITicket[]>([]);
	// isLoading is set but currently unused in the render logic, 
	// we keep it for now but remove the IDE warning if we don't use it, 
	// actually it's better to use it or remove it. 
	// The IDE says it's never read.

	useEffect(() => {
		const fetchTickets = async () => {
			try {
				// Fetch tickets using authenticated API helper
				// Use a reasonable limit, or implement proper server-side pagination in the future
				const { tickets } = await ticketAPI.getTickets({ limit: 10000 });
				if (Array.isArray(tickets)) {
					// Map API response (snake_case) to ITicket (camelCase + nested objects)
					const mappedTickets = tickets
						.map(mapApiTicketToITicket)
						.filter((t): t is ITicket => t !== null);
					setTickets(mappedTickets);
				}
			} catch (error) {
				logger.error("Error fetching tickets:", error);
				// Notification error handled by ErrorBoundary or alert if needed
			}
		};

		fetchTickets();
	}, []);

	// Fallback to empty array if no data
	// Correct prioritized fallback: props -> local state (if not empty) -> context gridData
	const data = useMemo(() => {
		if (Array.isArray(propsData) && propsData.length > 0) return propsData;
		if (Array.isArray(allTicketsInDb) && allTicketsInDb.length > 0) return allTicketsInDb;
		return Array.isArray(gridData) ? gridData : [];
	}, [propsData, allTicketsInDb, gridData]);

	const [search, setSearch] = useState("");
	const [validasiFilter, setValidasiFilter] = useState<
		"all" | "valid" | "invalid"
	>("all");
	const [durationFilter, setDurationFilter] = useState<
		"all" | "invalid" | "long" | "zero"
	>("all");
	const [monthFilter, setMonthFilter] = useState<string>("all");
	const [yearFilter, setYearFilter] = useState<string>("all");


	// Ambil semua customer ID dari data tiket yang ada
	const customerNames = useMemo(
		() => {
			if (!Array.isArray(data)) return new Set<string>();
			return new Set(
				data
					.map((t) => String(t?.customerId || "").trim().toLowerCase())
					.filter(Boolean)
			);
		},
		[data],
	);

	// Total tickets count
	const totalTicketsInDb = data.length;

	// Duration statistics
	const durationStats = useMemo(() => {
		if (!Array.isArray(data))
			return { invalidDuration: 0, longDuration: 0, zeroDuration: 0 };

		let invalidDuration = 0;
		let longDuration = 0;
		let zeroDuration = 0;

		data.forEach((ticket) => {
			if (!ticket) return;
			const duration = ticket.duration?.rawHours || 0;
			if (duration === 0) zeroDuration++;
			else if (duration > 24) invalidDuration++;
			else if (duration > 8) longDuration++;

			// Check handling duration (ART)
			const handlingDuration = ticket.handlingDuration?.rawHours || 0;
			if (handlingDuration > 24) invalidDuration++;

			// Check handling duration 1 (FRT)
			const handlingDuration1 = ticket.handlingDuration1?.rawHours || 0;
			if (handlingDuration1 > 24) invalidDuration++;
		});

		return { invalidDuration, longDuration, zeroDuration };
	}, [data]);

	// Filter validasi customer and duration
	const filtered = useMemo(() => {
		if (!Array.isArray(data)) return [];

		// Sort data by openTime descending (newest first)
		let result = [...data].sort((a, b) => {
			if (!a || !b) return 0;
			const timeA = a.openTime ? new Date(a.openTime).getTime() : 0;
			const timeB = b.openTime ? new Date(b.openTime).getTime() : 0;

			const valA = isNaN(timeA) ? 0 : timeA;
			const valB = isNaN(timeB) ? 0 : timeB;

			return valB - valA;
		});

		if (search) {
			const s = search.toLowerCase();
			result = result.filter((row) => {
				if (!row) return false;
				return columns.some((col) => {
					const val = row[col.key];
					return val && String(val).toLowerCase().includes(s);
				});
			});
		}

		if (validasiFilter !== "all" && customerNames.size > 0) {
			result = result.filter((row) => {
				if (!row) return false;
				let is2025 = false;
				if (row.openTime) {
					try {
						const openDate = new Date(row.openTime);
						is2025 = !isNaN(openDate.getTime()) && openDate.getFullYear() === 2025;
						if (!is2025 && isNaN(openDate.getTime())) {
							is2025 = String(row.openTime).includes("2025");
						}
					} catch {
						is2025 = String(row.openTime).includes("2025");
					}
				}

				if (!is2025) return true;
				// In table rendering we check name, but filter logic uses name for validation
				const isValid = customerNames.has(
					String(row.customerId || "").trim().toLowerCase(),
				);
				return validasiFilter === "valid" ? isValid : !isValid;
			});
		}

		if (durationFilter !== "all") {
			result = result.filter((row) => {
				if (!row) return false;
				const duration = row.duration?.rawHours || 0;
				const handlingDuration = row.handlingDuration?.rawHours || 0;
				const handlingDuration1 = row.handlingDuration1?.rawHours || 0;

				switch (durationFilter) {
					case "invalid":
						return duration > 24 || handlingDuration > 24 || handlingDuration1 > 24;
					case "long":
						return (duration > 8 && duration <= 24) ||
							(handlingDuration > 8 && handlingDuration <= 24) ||
							(handlingDuration1 > 8 && handlingDuration1 <= 24);
					case "zero":
						return duration === 0 || handlingDuration === 0 || handlingDuration1 === 0;
					default:
						return true;
				}
			});
		}

		if (monthFilter !== "all" || yearFilter !== "all") {
			result = result.filter((row) => {
				if (!row?.openTime) return false;

				const { month, year } = parseDateForFilter(row.openTime);
				if (!month && !year) return false;

				const monthMatch = monthFilter === "all" || month === monthFilter;
				const yearMatch = yearFilter === "all" || year === yearFilter;

				return monthMatch && yearMatch;
			});
		}

		return result;
	}, [
		data,
		search,
		validasiFilter,
		customerNames,
		durationFilter,
		monthFilter,
		yearFilter,
	]);

	// Calculate unique counts for Summary Cards
	const uniqueCustomersCount = useMemo(() => {
		if (!Array.isArray(data)) return 0;
		return new Set(data.map(t => t.customerId)).size;
	}, [data]);

	const uniqueAgentsCount = useMemo(() => {
		if (!Array.isArray(data)) return 0;
		return new Set(data.map(t => t.openBy)).size;
	}, [data]);

	// URL-synced pagination
	const {
		page,
		pageSize,
		setPage,
		setPageSize,
		totalPages: paginationTotalPages,
	} = usePageUrlState({
		paramPage: "grid_page",
		paramPageSize: "grid_pageSize",
		initialPage: 1,
		initialPageSize: 10,
		allowedPageSizes: [10, 25, 50, 100],
		totalItems: filtered.length,
		resetOnDeps: [
			search,
			validasiFilter,
			durationFilter,
			monthFilter,
			yearFilter,
		],
	});

	const paged = useMemo(() => {
		const raw = filtered.slice((page - 1) * pageSize, page * pageSize);
		return raw.map((row) => {
			let is2025 = false;
			if (row.openTime) {
				try {
					const openDate = new Date(row.openTime);
					if (!isNaN(openDate.getTime())) {
						is2025 = openDate.getFullYear() === 2025;
					} else {
						is2025 = String(row.openTime).includes("2025");
					}
				} catch {
					is2025 = String(row.openTime).includes("2025");
				}
			}
			const isValid = customerNames.has(
				String(row.customerId || "").trim().toLowerCase(),
			);
			return { ...row, _is2025: is2025, _isValid: isValid };
		});
	}, [filtered, page, pageSize, customerNames]);

	return (
		<PageWrapper maxW="4xl">
			{/* Header Section */}
			<div className="mb-8">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold text-card-foreground mb-2">
							Ticket Data
						</h1>
						<p className="text-gray-600 dark:text-gray-400 text-base">
							Comprehensive view of all ticket information and customer data
						</p>
					</div>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
				<SummaryCard
					icon={<ConfirmationNumberIcon className="w-6 h-6 text-white" />}
					title="Total Tickets"
					value={totalTicketsInDb || 0}
					description="Total recorded tickets in database"
					iconBg="bg-blue-600"
				/>
				<SummaryCard
					icon={<GroupIcon className="w-6 h-6 text-white" />}
					title="Unique Customers"
					value={uniqueCustomersCount}
					description="Number of unique customers"
					iconBg="bg-green-600"
				/>
				<SummaryCard
					icon={<HowToRegIcon className="w-6 h-6 text-white" />}
					title="Unique Agents"
					value={uniqueAgentsCount}
					description="Number of unique agents"
					iconBg="bg-purple-600"
				/>
				<SummaryCard
					icon={<ConfirmationNumberIcon className="w-6 h-6 text-white" />}
					title="Overtime Duration"
					value={durationStats.invalidDuration}
					description="Tickets with duration > 24 hours"
					iconBg="bg-red-600"
				/>
				<SummaryCard
					icon={<ConfirmationNumberIcon className="w-6 h-6 text-white" />}
					title="Long Duration"
					value={durationStats.longDuration}
					description="Tickets with duration > 8 hours"
					iconBg="bg-amber-600"
				/>
				<SummaryCard
					icon={<ConfirmationNumberIcon className="w-6 h-6 text-white" />}
					title="Zero Duration"
					value={durationStats.zeroDuration}
					description="Tickets with 0 duration"
					iconBg="bg-gray-600"
				/>
			</div>

			{/* Search and Filter Controls */}
			<Card className="mb-6 shadow-sm">
				<CardContent className="p-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="relative max-w-md w-full">
							<div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
								<Search className="h-4 w-4 text-gray-400" />
							</div>
							<input
								type="text"
								className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
								placeholder="Search tickets, customers, descriptions..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
							/>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4 text-gray-500" />
							</div>
							<select
								value={validasiFilter}
								onChange={(e) => {
									setValidasiFilter(e.target.value as any);
									setPage(1);
								}}
								className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							>
								<option value="all">All Records</option>
								<option value="valid">Valid Customers</option>
								<option value="invalid">Invalid Customers</option>
							</select>

							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4 text-gray-500" />
							</div>
							<select
								value={durationFilter}
								onChange={(e) => {
									setDurationFilter(e.target.value as any);
									setPage(1);
								}}
								className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							>
								<option value="all">All Durations</option>
								<option value="invalid">Overtime (&gt;24h)</option>
								<option value="long">Long (8-24h)</option>
								<option value="zero">Zero Duration</option>
							</select>

							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4 text-gray-500" />
							</div>
							<select
								value={monthFilter}
								onChange={(e) => {
									setMonthFilter(e.target.value);
									setPage(1);
								}}
								className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							>
								<option value="all">All Months</option>
								<option value="01">January</option>
								<option value="02">February</option>
								<option value="03">March</option>
								<option value="04">April</option>
								<option value="05">May</option>
								<option value="06">June</option>
								<option value="07">July</option>
								<option value="08">August</option>
								<option value="09">September</option>
								<option value="10">October</option>
								<option value="11">November</option>
								<option value="12">December</option>
							</select>

							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4 text-gray-500" />
							</div>
							<select
								value={yearFilter}
								onChange={(e) => {
									setYearFilter(e.target.value);
									setPage(1);
								}}
								className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
							>
								<option value="all">All Years</option>
								<option value="2020">2020</option>
								<option value="2021">2021</option>
								<option value="2022">2022</option>
								<option value="2023">2023</option>
								<option value="2024">2024</option>
								<option value="2025">2025</option>
							</select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Data Table */}
			<Card className="shadow-sm">
				<CardHeader className="pb-4">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<FileSpreadsheet className="w-5 h-5 text-blue-600" />
								<CardHeaderTitle className="text-base md:text-lg">
									Ticket Records
								</CardHeaderTitle>
							</CardTitle>
							<CardHeaderDescription className="text-xs mt-1">
								Showing {paged.length} of {filtered.length} tickets
								{validasiFilter !== "all" && (
									<Badge
										variant="info"
										className="ml-2 text-[8px] px-1 py-0.5 opacity-90"
									>
										{validasiFilter === "valid"
											? "Valid Customers Only"
											: "Invalid Customers Only"}
									</Badge>
								)}
								{durationFilter !== "all" && (
									<Badge
										variant="warning"
										className="ml-2 text-[8px] px-1 py-0.5 opacity-90"
									>
										{durationFilter === "invalid"
											? "Overtime Duration (>24h)"
											: durationFilter === "long"
												? "Long Duration (8-24h)"
												: durationFilter === "zero"
													? "Zero Duration"
													: ""}
									</Badge>
								)}
								{monthFilter !== "all" && (
									<Badge
										variant="secondary"
										className="ml-2 text-[8px] px-1 py-0.5 opacity-90"
									>
										{new Date(0, parseInt(monthFilter) - 1).toLocaleString(
											"default",
											{ month: "long" },
										)}
									</Badge>
								)}
								{yearFilter !== "all" && (
									<Badge
										variant="secondary"
										className="ml-2 text-[8px] px-1 py-0.5 opacity-90"
									>
										{yearFilter}
									</Badge>
								)}
							</CardHeaderDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<OverflowX minWidth={800}>
						<div className="inline-block min-w-full align-middle">
							<div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
								<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
									<thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
										<tr>
											{columns.map((col) => (
												<th
													key={col.key}
													className="px-2 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 dark:border-gray-600 last:border-r-0"
													style={{ width: col.width, minWidth: col.width }}
												>
													<div className="flex items-center gap-2">
														<span>{col.label}</span>
													</div>
												</th>
											))}
										</tr>
									</thead>
									<tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
										{paged.length === 0 ? (
											<tr>
												<td
													colSpan={columns.length}
													className="text-center py-12 text-gray-500 dark:text-gray-400"
												>
													<div className="flex flex-col items-center gap-3">
														<div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
															<FileSpreadsheet className="w-6 h-6 text-gray-400" />
														</div>
														<div className="text-center">
															<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
																No tickets found
															</p>
															<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
																{search
																	? "Try adjusting your search criteria"
																	: "No data available"}
															</p>
														</div>
													</div>
												</td>
											</tr>
										) : (
											paged.map((row, i) => {
												const is2025 = row._is2025;
												const isValid = row._isValid;
												return (
													<tr
														key={i}
														className={
															i % 2 === 0
																? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
																: "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
														}
													>
														{columns.map((col) => (
															<td
																key={col.key}
																className="px-2 py-1 text-xs text-gray-900 dark:text-gray-100 align-top border-r border-gray-200 dark:border-gray-600 last:border-r-0"
																style={{
																	width: col.width,
																	minWidth: col.width,
																}}
															>
																<div className="whitespace-pre-line max-w-full overflow-hidden">
																	{col.render
																		? col.render(row[col.key], row)
																		: row[col.key] || ""}
																</div>
																{is2025 && !isValid && col.key === "name" && (
																	<Badge
																		variant="danger"
																		className="mt-1 text-[8px] px-1 py-0.5 opacity-90"
																	>
																		Invalid Customer
																	</Badge>
																)}
															</td>
														))}
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						</div>
					</OverflowX>

					{/* Pagination */}
					<div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
						<PaginationControls
							page={page}
							pageSize={pageSize}
							totalPages={paginationTotalPages ?? 1}
							onPageChange={setPage}
							onPageSizeChange={setPageSize}
							pageSizes={[10, 25, 50, 100]}
						/>
					</div>
				</CardContent>
			</Card>
		</PageWrapper>
	);
};

export default TicketData;
