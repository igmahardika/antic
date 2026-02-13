import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ITicket } from "@/lib/db";
import { formatDurationDHM, formatDateTimeDDMMYYYY } from "@/lib/utils";
import { useAnalytics } from "./AnalyticsContext";
import SummaryCard from "./ui/SummaryCard";
import GroupIcon from "@mui/icons-material/Group";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import PageWrapper from "./PageWrapper";


import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import SecurityIcon from "@mui/icons-material/Security";
import FileTextIcon from "@mui/icons-material/Description";
import TableChartIcon from "@mui/icons-material/TableChart";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";

import {
	PDFDownloadLink,
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Image,
} from "@react-pdf/renderer";
import { exportToExcel, exportToCSV } from "../utils/exportUtils";
import {
	LineChart,
	Line,
	ResponsiveContainer,
	XAxis,
	YAxis,
	LabelList,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import { FixedSizeList as List } from "react-window";
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
	TooltipProvider,
} from "./ui/tooltip";
import TimeFilter from "./TimeFilter";
import * as RadixDialog from "@radix-ui/react-dialog";
import { usePageUrlState } from "@/hooks/usePageUrlState";
import { PaginationControls } from "@/components";
import { logger } from "@/lib/logger";
import {
	isClosedTicket,
	getTicketStatus
} from "@/utils/ticketStatus";

// Using built-in fonts for reliability - no external font loading needed

// Buffer polyfill for browser environment
if (typeof window !== "undefined" && !window.Buffer) {
	import("buffer").then(({ Buffer }) => {
		window.Buffer = Buffer;
	});
}

// Configurable risk thresholds
const RISK_THRESHOLDS = {
	PERSISTENT: 3,
	CHRONIC: 10,
	EXTREME: 18
} as const;

// Helper function for risk classification
const getRiskClassification = (ticketCount: number): string => {
	if (ticketCount >= RISK_THRESHOLDS.EXTREME) return "Ekstrem";
	if (ticketCount >= RISK_THRESHOLDS.CHRONIC) return "Kronis";
	if (ticketCount >= RISK_THRESHOLDS.PERSISTENT) return "Persisten";
	return "Normal";
};

// Helper function for safe date parsing
const parseDateSafe = (dateString: string | undefined): Date | null => {
	if (!dateString) return null;
	const date = new Date(dateString);
	return isNaN(date.getTime()) ? null : date;
};

// Error boundary component
const ErrorFallback = ({ error, customer }: { error: string; customer?: any }) => (
	<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
		<div className="flex items-center gap-2 text-red-700">
			<WarningAmberIcon className="w-5 h-5" />
			<span className="font-semibold">Error loading customer data</span>
		</div>
		<p className="text-red-600 text-sm mt-1">{error}</p>
		{customer && (
			<p className="text-red-500 text-xs mt-2">
				Customer: {customer.name || customer.customerId || "Unknown"}
			</p>
		)}
	</div>
);


const CustomerAnalytics = () => {
	const analytics = useAnalytics();
	const {
		allTickets,
		startMonth,
		setStartMonth,
		endMonth,
		setEndMonth,
		selectedYear,
		setSelectedYear,
	} = analytics;
	// --- All state and ref hooks must be at the top ---
	const [openDialogId, setOpenDialogId] = useState<string | null>(null);
	const [repClassFilter, setRepClassFilter] = useState<string>("Total");
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Hapus state lokal filter waktu

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

	// --- Filter allTickets sesuai waktu ---
	const filteredTickets = useMemo(() => {
		if (!allTickets || !startMonth || !endMonth || !selectedYear) return [];
		if (selectedYear === "ALL") {
			// All Year: tampilkan semua tiket tanpa filter waktu
			return allTickets;
		}
		const y = Number(selectedYear);
		const mStart = Number(startMonth) - 1;
		const mEnd = Number(endMonth) - 1;
		const cutoffStart = new Date(y, mStart, 1, 0, 0, 0, 0);
		const cutoffEnd = new Date(y, mEnd + 1, 0, 23, 59, 59, 999);
		return allTickets.filter((t) => {
			const openDate = parseDateSafe(t.openTime);
			if (!openDate) return false;
			return openDate >= cutoffStart && openDate <= cutoffEnd;
		});
	}, [allTickets, startMonth, endMonth, selectedYear]);

	// --- Agregasi customer dari tiket hasil filter ---
	const customerCards = useMemo(() => {
		if (!filteredTickets || !allTickets) return [];

		// Create a map of ALL tickets grouped by customerId for faster access
		// This replaces the nested .filter() call later, making it O(N+M) instead of O(N*M)
		const fullHistoryMap = new Map<string, ITicket[]>();
		allTickets.forEach(t => {
			const cid = t.customerId || "Unknown";
			if (!fullHistoryMap.has(cid)) fullHistoryMap.set(cid, []);
			fullHistoryMap.get(cid)!.push(t);
		});

		// LOGGING: Show number of customer cards
		logger.info(
			"[KanbanBoard] customerCards processing:",
			filteredTickets.length,
			"tickets,",
			new Set(filteredTickets.map((t) => t.customerId || "Unknown")).size,
			"unique customers",
		);

		// Map customer hanya dari filteredTickets
		const currentPeriodMap = new Map<string, ITicket[]>();
		filteredTickets.forEach((t) => {
			const customerId = t.customerId || "Unknown";
			if (!currentPeriodMap.has(customerId)) {
				currentPeriodMap.set(customerId, []);
			}
			currentPeriodMap.get(customerId)!.push(t);
		});

		// Ambil bulan & tahun dari filter untuk trend analysis
		const { endMonth, selectedYear } = analytics;
		const y = Number(selectedYear);
		const mEnd = Number(endMonth) - 1;
		const mPrev = mEnd - 1;

		// Hanya customer yang punya tiket di periode filter
		return Array.from(currentPeriodMap.entries()).map(([customerId, tickets]) => {
			// Use configurable risk classification
			const repClass = getRiskClassification(tickets.length);

			// Analisis insight
			const analysis = {
				description: tickets.map((t) => t.description).filter(Boolean),
				cause: tickets.map((t) => t.cause).filter(Boolean),
				handling: tickets.map((t) => t.handling).filter(Boolean),
				conclusion: "",
			};

			// Gunakan map yang sudah di-pregroup, jauh lebih cepat dari .filter()
			const fullTicketHistory = fullHistoryMap.get(customerId) || [];

			// Trend analysis: bandingkan jumlah tiket bulan ini vs bulan sebelumnya
			let trend: "Naik" | "Turun" | "Stabil" = "Stabil";
			if (tickets.length > 0) {
				// Bulan ini
				const ticketsThisMonthCount = tickets.filter((t) => {
					const openDate = parseDateSafe(t.openTime);
					return openDate && openDate.getFullYear() === y && openDate.getMonth() === mEnd;
				}).length;

				// Bulan sebelumnya (harus cek dari tickets periode ini atau tickets histori?)
				// Logika asli mengecek dari 'tickets' (yang sudah difilter range). 
				// Jika range > 1 bulan, tickets bisa punya data bulan sebelumnya.
				const ticketsPrevMonthCount = tickets.filter((t) => {
					const openDate = parseDateSafe(t.openTime);
					return openDate && openDate.getFullYear() === y && openDate.getMonth() === mPrev;
				}).length;

				if (ticketsThisMonthCount > ticketsPrevMonthCount) trend = "Naik";
				else if (ticketsThisMonthCount < ticketsPrevMonthCount) trend = "Turun";
			}

			return {
				id: customerId,
				name: tickets[0]?.name || customerId,
				customerId,
				ticketCount: tickets.length,
				totalHandlingDurationFormatted: formatDurationDHM(
					tickets.reduce(
						(acc, t) => acc + (t.handlingDuration?.rawHours || 0),
						0,
					),
				),
				allTickets: tickets,
				fullTicketHistory,
				analysis,
				repClass,
				trend,
			};
		});
	}, [filteredTickets, allTickets, analytics]);

	// --- Risk summary & total customers ---
	const processedData = useMemo(() => {
		if (!customerCards) {
			return {
				repClassSummary: [],
				totalCustomers: 0,
			};
		}
		const summaryMap: Record<
			string,
			{ key: string; label: string; count: number }
		> = {
			Normal: { key: "Normal", label: "Normal", count: 0 },
			Persisten: { key: "Persisten", label: "Persisten", count: 0 },
			Kronis: { key: "Kronis", label: "Kronis", count: 0 },
			Ekstrem: { key: "Ekstrem", label: "Ekstrem", count: 0 },
		};
		customerCards.forEach((customer) => {
			const customerClass = customer.repClass || "Normal";
			if (summaryMap[customerClass]) {
				summaryMap[customerClass].count++;
			}
		});
		return {
			repClassSummary: Object.values(summaryMap),
			totalCustomers: customerCards.length,
		};
	}, [customerCards]);
	const { repClassSummary, totalCustomers } = processedData;

	// --- Filtered customer cards by risk filter and search ---
	const filteredCustomers = useMemo(() => {
		if (!customerCards) return [];
		let filtered = customerCards;

		// Apply risk filter
		if (repClassFilter && repClassFilter !== "Total") {
			filtered = customerCards.filter((c) => c.repClass === repClassFilter);
		}

		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();
			filtered = filtered.filter((customer) => {
				const nameMatch = customer.name?.toLowerCase().includes(query);
				const customerIdMatch = customer.customerId?.toLowerCase().includes(query);
				const repClassMatch = customer.repClass?.toLowerCase().includes(query);
				return nameMatch || customerIdMatch || repClassMatch;
			});
		}

		return filtered.slice().sort((a, b) => {
			const aTickets = a.ticketCount || 0;
			const bTickets = b.ticketCount || 0;
			return bTickets - aTickets;
		});
	}, [customerCards, repClassFilter, searchQuery]);

	// URL-synced pagination
	const {
		page,
		pageSize,
		setPage,
		setPageSize,
		totalPages: paginationTotalPages,
	} = usePageUrlState({
		paramPage: "kanban_page",
		paramPageSize: "kanban_pageSize",
		initialPage: 1,
		initialPageSize: 20,
		allowedPageSizes: [10, 20, 50, 100],
		totalItems: filteredCustomers.length,
		resetOnDeps: [startMonth, endMonth, selectedYear, repClassFilter, searchQuery],
	});

	const selectedCustomer = useMemo(() => {
		if (!openDialogId) return null;
		return filteredCustomers.find((c) => c.id === openDialogId);
	}, [openDialogId, filteredCustomers]);

	// --- Month & year options ---
	// --- Month & year options ---
	const monthOptions = MONTH_OPTIONS;
	const [allYearsInData, setAllYearsInData] = useState<string[]>([]);

	useEffect(() => {
		const fetchYears = async () => {
			try {
				const { ticketAPI } = await import("@/lib/api");
				const { years } = await ticketAPI.getTicketYears();
				if (Array.isArray(years)) {
					setAllYearsInData(years.map(String));
				}
			} catch (error) {
				console.error("Failed to fetch ticket years:", error);
				// Fallback
				if (allTickets && allTickets.length > 0) {
					const yearSet = new Set<string>();
					allTickets.forEach((t) => {
						const openDate = parseDateSafe(t.openTime);
						if (openDate) yearSet.add(String(openDate.getFullYear()));
					});
					setAllYearsInData(Array.from(yearSet).sort().reverse());
				} else {
					setAllYearsInData(["2026", "2025", "2024"]);
				}
			}
		};
		fetchYears();
	}, [allTickets]);

	// --- Early return check after all hooks have been called ---
	if (!allTickets || allTickets.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-gray-500">
				<h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-card-foreground">
					Customer Analytics
				</h1>
				<p>Upload file untuk melihat data Kanban.</p>
			</div>
		);
	}

	// --- Component Logic & Render ---
	const calculatedTotalPages =
		paginationTotalPages ?? Math.ceil(filteredCustomers.length / pageSize);

	// Risk color mapping for buttons and summary cards
	const riskColors = {
		Total: {
			badge: "bg-blue-700",
			iconBg: "bg-blue-700",
			text: "text-blue-800",
		},
		Normal: {
			badge: "bg-green-600",
			iconBg: "bg-green-600",
			text: "text-green-800",
		},
		Persisten: {
			badge: "bg-yellow-400",
			iconBg: "bg-yellow-400",
			text: "text-yellow-800",
		},
		Kronis: {
			badge: "bg-orange-500",
			iconBg: "bg-orange-500",
			text: "text-orange-800",
		},
		Ekstrem: {
			badge: "bg-red-600",
			iconBg: "bg-red-600",
			text: "text-red-800",
		},
	};

	// Pada summary card customer risk, ubah label dan deskripsi ke bahasa Inggris natural
	const riskCategories = [
		{
			label: "NORMAL",
			badge: "Normal Risk",
			description:
				"Customers with fewer than 3 complaints during the period. Very low risk.",
		},
		{
			label: "PERSISTENT",
			badge: "Medium Risk",
			description:
				"Customers with 3–9 complaints during the period. Medium risk, needs attention.",
		},
		{
			label: "CHRONIC",
			badge: "High Risk",
			description:
				"Customers with 10–18 complaints during the period. High risk, intervention needed.",
		},
		{
			label: "EXTREME",
			badge: "Extreme Risk",
			description:
				"Customers with more than 18 complaints during the period. Very high risk, special action required.",
		},
	];

	function top(items: string[]) {
		if (!items || items.length === 0) return "-";
		const counts: Record<string, number> = {};
		items.forEach((item) => {
			counts[item] = (counts[item] || 0) + 1;
		});
		return Object.keys(counts).reduce((a, b) =>
			counts[a] > counts[b] ? a : b,
		);
	}

	function generateInsight(tickets: ITicket[]) {
		if (!tickets || tickets.length === 0)
			return {
				masalah: "-",
				penyebab: "-",
				solusi: "-",
				rekomendasi: "Data tidak cukup untuk insight.",
				kategori: "-",
			};
		const analysis = {
			description: tickets
				.map((t) => t.description)
				.filter(Boolean) as string[],
			cause: tickets.map((t) => t.cause).filter(Boolean) as string[],
			handling: tickets.map((t) => t.handling).filter(Boolean) as string[],
		};
		const masalah = top(analysis.description);
		const penyebab = top(analysis.cause);
		const solusi = top(analysis.handling);
		// Smart mapping kategori umum dari description
		const descText = (analysis.description.join(" ") || "").toLowerCase();
		let kategori = "-";
		if (/lambat|lelet|lemot|slow|delay/.test(descText))
			kategori = "Koneksi Lambat";
		else if (/putus|disconnect|drop|terputus/.test(descText))
			kategori = "Koneksi Terputus";
		else if (/tidak bisa|cannot|unable|gagal/.test(descText))
			kategori = "Akses Gagal";
		// Smart rekomendasi dari cause
		let rekomendasi = "";
		if (/limiter/i.test(penyebab)) {
			rekomendasi =
				"Rekomendasi: Lakukan perbaikan otomatis pada router/NMS terkait limiter.";
		} else if (masalah !== "-" && penyebab !== "-" && solusi !== "-") {
			rekomendasi = `Pelanggan ini paling sering mengalami masalah ${masalah}, yang umumnya dipicu oleh ${penyebab}. Solusi yang terbukti efektif adalah ${solusi}. Disarankan untuk memperkuat edukasi dan SOP terkait ${solusi}, serta meningkatkan kemampuan deteksi dini pada ${penyebab}, agar penanganan masalah ${masalah} dapat dilakukan lebih cepat dan efisien.`;
		} else {
			rekomendasi = "Perbanyak data agar insight lebih akurat.";
		}
		return { masalah, penyebab, solusi, rekomendasi, kategori };
	}

	const totalSummary = {
		key: "Total",
		label: "Total Customers",
		color: "bg-gray-100 text-gray-800",
		count: totalCustomers,
	};

	const finalSummary = [totalSummary, ...repClassSummary];

	function TicketHistoryTable({ tickets }) {
		if (!Array.isArray(tickets) || tickets.length === 0) {
			return (
				<div className="text-center py-8">
					<div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
						<FileTextIcon className="w-6 h-6 text-gray-400" />
					</div>
					<p className="text-gray-500 dark:text-gray-400 text-sm">
						No tickets found in this period.
					</p>
				</div>
			);
		}

		// Group tickets by month-year
		const groups = {};
		tickets.forEach((t) => {
			const openDate = parseDateSafe(t.openTime);
			if (!openDate) return;
			const key = `${openDate.getFullYear()}-${String(openDate.getMonth() + 1).padStart(2, "0")}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(t);
		});

		// Sort group keys descending
		const sortedKeys = Object.keys(groups).sort(
			(a, b) => Number(new Date(b + "-01")) - Number(new Date(a + "-01")),
		);
		const monthNames = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];

		return (
			<div className="space-y-6">
				{sortedKeys.map((key) => {
					const [yyyy, mm] = key.split("-");
					const monthLabel = `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
					const monthTickets = groups[key].sort(
						(a, b) => {
							const dateA = parseDateSafe(a.openTime);
							const dateB = parseDateSafe(b.openTime);
							if (!dateA || !dateB) return 0;
							return dateA.getTime() - dateB.getTime();
						}
					);

					return (
						<div key={key} className="space-y-3">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
								<h4 className="text-lg font-semibold text-card-foreground">
									{monthLabel}
								</h4>
								<span className="text-sm text-gray-500 dark:text-gray-400">
									({monthTickets.length} tickets)
								</span>
							</div>

							<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800">
								<table className="w-full text-sm">
									<thead>
										<tr className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
											<th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
												Open Date
											</th>
											<th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
												Description
											</th>
											<th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
												Root Cause
											</th>
											<th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
												Solution
											</th>
											<th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
												Duration
											</th>
											<th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
												Status
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
										{monthTickets.map((t, index) => (
											<tr
												key={t.id}
												className={`hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${index % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-gray-50/50 dark:bg-zinc-800/50"}`}
											>
												<td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100 font-medium">
													{formatDateTimeDDMMYYYY(t.openTime)}
												</td>
												<td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-sm">
													<div className="line-clamp-3">
														{t.description || "-"}
													</div>
												</td>
												<td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-sm">
													<div className="line-clamp-3">{t.cause || "-"}</div>
												</td>
												<td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-sm">
													<div className="line-clamp-3">
														{t.handling || "-"}
													</div>
												</td>
												<td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
													{t.handlingDuration?.formatted || "-"}
												</td>
												<td className="px-4 py-3">
													<Badge
														variant={
															getTicketStatus(t) === "CLOSED"
																? "success"
																: getTicketStatus(t) === "OPEN"
																	? "warning"
																	: getTicketStatus(t) === "BACKLOG"
																		? "danger"
																		: "default"
														}
														className="text-xs font-semibold"
													>
														{getTicketStatus(t)}
													</Badge>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					);
				})}
			</div>
		);
	}

	// Helper untuk historical ticket count sesuai periode filter
	function HistoricalTicketCount({ customer }) {
		const { startMonth, endMonth, selectedYear } = analytics;
		if (!startMonth || !endMonth || !selectedYear) {
			return (
				<div className="text-center py-6">
					<div className="w-10 h-10 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
						<TableChartIcon className="w-5 h-5 text-gray-400" />
					</div>
					<p className="text-gray-500 dark:text-gray-400 text-sm">
						Please select month and year to see historical analysis.
					</p>
				</div>
			);
		}

		const y = Number(selectedYear);
		const mStart = Number(startMonth) - 1;
		const mEnd = Number(endMonth) - 1;

		// Buat array bulan-tahun dari periode filter
		const months = [];
		for (let m = mStart; m <= mEnd; m++) {
			const date = new Date(y, m, 1);
			months.push({
				label: `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`,
				year: date.getFullYear(),
				month: date.getMonth(),
			});
		}

		// Hitung jumlah tiket customer per bulan
		const tickets = customer.fullTicketHistory || customer.allTickets || [];
		const ticketsPerMonth = months.map(({ year, month }) =>
			tickets.filter((t) => {
				const openDate = parseDateSafe(t.openTime);
				if (!openDate) return false;
				return openDate.getFullYear() === year && openDate.getMonth() === month;
			}),
		);

		// Akumulasi
		const firstMonthCount = ticketsPerMonth[0]?.length || 0;
		const first3MonthsCount = ticketsPerMonth
			.slice(0, 3)
			.reduce((acc, arr) => acc + arr.length, 0);
		const all6MonthsCount = ticketsPerMonth.reduce(
			(acc, arr) => acc + arr.length,
			0,
		);
		const totalTickets = ticketsPerMonth.reduce(
			(acc, arr) => acc + arr.length,
			0,
		);

		return (
			<div className="space-y-4">
				{/* Monthly breakdown */}
				<div>
					<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
						Monthly Breakdown
					</h4>
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						{months.map((m, i) => (
							<div
								key={m.label}
								className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 text-center"
							>
								<div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
									{m.label}
								</div>
								<div className="text-lg font-bold text-blue-600 dark:text-blue-400">
									{ticketsPerMonth[i].length}
								</div>
								<div className="text-xs text-gray-500 dark:text-gray-400">
									tickets
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Summary metrics */}
				<div>
					<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
						Summary Metrics
					</h4>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
							<div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
								First Month
							</div>
							<div className="text-lg font-bold text-blue-700 dark:text-blue-300">
								{firstMonthCount}
							</div>
							<div className="text-xs text-blue-600 dark:text-blue-400">
								tickets
							</div>
						</div>
						<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
							<div className="text-xs text-green-600 dark:text-green-400 mb-1">
								First 3 Months
							</div>
							<div className="text-lg font-bold text-green-700 dark:text-green-300">
								{first3MonthsCount}
							</div>
							<div className="text-xs text-green-600 dark:text-green-400">
								tickets
							</div>
						</div>
						<div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
							<div className="text-xs text-purple-600 dark:text-purple-400 mb-1">
								All Period
							</div>
							<div className="text-lg font-bold text-purple-700 dark:text-purple-300">
								{all6MonthsCount}
							</div>
							<div className="text-xs text-purple-600 dark:text-purple-400">
								tickets
							</div>
						</div>
					</div>
				</div>

				{/* Total summary */}
				<div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
					<div className="text-center">
						<div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
							Total Tickets in Selected Period
						</div>
						<div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
							{totalTickets}
						</div>
						<div className="text-xs text-blue-600 dark:text-blue-400">
							tickets
						</div>
					</div>
				</div>
			</div>
		);
	}

	function CustomerCard({ customer, tickets }) {
		try {
			// tickets: tiket customer ini sesuai filter waktu & risk
			const closed = tickets.filter(isClosedTicket).length;
			const percentClosed =
				tickets.length > 0
					? Math.round((Number(closed) / Number(tickets.length)) * 100)
					: 0;
			// Top agent
			const agentCount = {};
			tickets.forEach((t) => {
				if (t.openBy) agentCount[t.openBy] = (agentCount[t.openBy] || 0) + 1;
			});
			const topAgent =
				Object.entries(agentCount).sort(
					(a, b) => Number(b[1]) - Number(a[1]),
				)[0]?.[0] || "-";
			// Top issue
			const issueCount = {};
			tickets.forEach((t) => {
				if (t.description)
					issueCount[t.description] = (issueCount[t.description] || 0) + 1;
			});
			const topIssue =
				Object.entries(issueCount).sort(
					(a, b) => Number(b[1]) - Number(a[1]),
				)[0]?.[0] || "-";
			// Last open ticket
			const lastTicket = tickets
				.slice()
				.sort(
					(a, b) => {
						const dateA = parseDateSafe(a.openTime);
						const dateB = parseDateSafe(b.openTime);
						if (!dateA || !dateB) return 0;
						return dateB.getTime() - dateA.getTime();
					}
				)[0];
			// Trend badge
			let trendBadge = null;
			if (customer.trend === "Naik")
				trendBadge = (
					<span className="px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-semibold dark:bg-green-200 dark:text-green-900">
						↑ Up
					</span>
				);
			else if (customer.trend === "Turun")
				trendBadge = (
					<span className="px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs font-semibold dark:bg-red-200 dark:text-red-900">
						↓ Down
					</span>
				);
			else if (customer.trend === "Stabil")
				trendBadge = (
					<span className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold dark:bg-gray-200 dark:text-gray-900">
						→ Stable
					</span>
				);

			return (
				<TooltipProvider delayDuration={200}>
					<Tooltip>
						<TooltipTrigger asChild>
							<div
								className="bg-white dark:bg-zinc-900 text-card-foreground rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-6 flex flex-col min-h-[240px] transition-all duration-300 min-w-0 overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02]"
								onClick={() => setOpenDialogId(customer.id)}
							>
								{/* Header with customer info and badges */}
								<div className="flex items-start justify-between mb-4">
									<div className="flex items-center gap-3 flex-1 min-w-0">
										<div className="w-10 h-10 min-w-10 min-h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
											<GroupIcon
												className="text-white"
												style={{ fontSize: 20 }}
											/>
										</div>
										<div className="flex-1 min-w-0">
											<h3 className="text-base font-bold text-card-foreground leading-tight line-clamp-2">
												{customer.name}
											</h3>
											<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
												ID: {customer.customerId}
											</p>
										</div>
									</div>
									<div className="flex flex-col items-end gap-1 ml-2">
										<Badge
											variant="info"
											className="text-xs font-semibold px-2 py-1"
										>
											{customer.ticketCount}
										</Badge>
										{trendBadge}
									</div>
								</div>

								{/* Metrics section */}
								<div className="space-y-3 mb-4">
									<div className="flex items-center justify-between">
										<span className="text-xs font-medium text-gray-600 dark:text-gray-400">
											Resolution Rate
										</span>
										<span className="text-sm font-bold text-green-600 dark:text-green-400">
											{percentClosed}%
										</span>
									</div>
									<div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-1.5">
										<div
											className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
											style={{ width: `${percentClosed}%` }}
										></div>
									</div>
									<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
										<span>Closed: {closed}</span>
										<span>Total: {tickets.length}</span>
									</div>
								</div>

								{/* Additional info */}
								<div className="space-y-2 mt-auto">
									<div className="flex items-center gap-2 text-xs">
										<HowToRegIcon className="text-blue-500 w-3 h-3 flex-shrink-0" />
										<span className="text-gray-600 dark:text-gray-400">
											Top Agent:
										</span>
										<span className="font-medium text-card-foreground truncate">
											{topAgent}
										</span>
									</div>
									<div className="flex items-start gap-2 text-xs">
										<Badge
											variant="warning"
											className="text-xs flex-shrink-0 px-1.5 py-0.5"
										>
											Issue
										</Badge>
										<span className="text-gray-600 dark:text-gray-400 line-clamp-2 leading-tight">
											{topIssue}
										</span>
									</div>
								</div>
							</div>
						</TooltipTrigger>
						<TooltipContent side="top" className="max-w-xs text-sm">
							<div className="font-semibold mb-2 text-blue-900 dark:text-blue-200">
								Customer Preview
							</div>
							<div className="space-y-1 text-xs">
								<div>
									<span className="font-medium text-gray-700 dark:text-gray-200">
										Top Issue:
									</span>{" "}
									{topIssue}
								</div>
								<div>
									<span className="font-medium text-gray-700 dark:text-gray-200">
										Last Ticket:
									</span>{" "}
									{lastTicket
										? `${formatDateTimeDDMMYYYY(lastTicket.openTime)}`
										: "-"}
								</div>
								<div>
									<span className="font-medium text-gray-700 dark:text-gray-200">
										Risk Trend:
									</span>{" "}
									{customer.trend === "Naik"
										? "Up"
										: customer.trend === "Turun"
											? "Down"
											: "Stable"}
								</div>
							</div>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		} catch (error) {
			logger.error("CustomerCard error:", error);
			return <ErrorFallback error={error.message} customer={customer} />;
		}
	}

	// Helper untuk normalisasi label risk ke bahasa Inggris
	function normalizeRiskLabel(label: string) {
		if (label.toLowerCase() === "persisten") return "PERSISTENT";
		if (label.toLowerCase() === "kronis") return "CHRONIC";
		if (label.toLowerCase() === "ekstrem") return "EXTREME";
		if (label.toLowerCase() === "normal") return "NORMAL";
		return label.toUpperCase();
	}

	// Professional PDF Report Component with Cover Page
	const CustomerReportPDF = ({ customer, insight, tickets }) => {
		const styles = StyleSheet.create({
			// Cover page styles
			coverPage: {
				padding: 0,
				fontSize: 10,
				fontFamily: "Helvetica",
				backgroundColor: "#ffffff",
			},
			coverBackground: {
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				objectFit: "cover",
			},
			coverContent: {
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				padding: 40,
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "flex-start",
				transform: "translateY(-70%)",
			},
			coverTitle: {
				fontSize: 40,
				fontFamily: "Helvetica-Bold",
				color: "#ffffff",
				textTransform: "uppercase",
				textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
				marginBottom: 10,
				textAlign: "left",
			},
			coverCustomerInfo: {
				marginBottom: 2,
			},
			coverCustomerName: {
				fontSize: 10,
				fontFamily: "Helvetica-Bold",
				color: "#ffffff",
				textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
				marginBottom: 8,
			},
			coverCustomerId: {
				fontSize: 8,
				color: "#ffffff",
				textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
			},
			// Content page styles
			contentPage: {
				padding: 20,
				fontSize: 10,
				fontFamily: "Helvetica",
				backgroundColor: "#ffffff",
			},
			// Page header and footer images
			pageHeaderImage: {
				width: "100%",
				height: "auto",
				marginBottom: 10,
				objectFit: "contain",
			},
			pageFooterImage: {
				position: "absolute",
				bottom: 0,
				left: 0,
				right: 0,
				width: "100%",
				height: "auto",
				objectFit: "contain",
			},
			pageHeader: {
				marginBottom: 20,
				padding: 15,
				backgroundColor: "#f8fafc",
				borderRadius: 8,
				border: "1px solid #e2e8f0",
			},
			pageTitle: {
				fontSize: 18,
				fontWeight: "bold",
				color: "#1e293b",
				marginBottom: 5,
			},
			pageSubtitle: {
				fontSize: 12,
				color: "#64748b",
			},
			// Customer information section
			customerHeader: {
				marginBottom: 12,
			},
			customerName: {
				fontSize: 15,
				fontFamily: "Helvetica-Bold",
				color: "#1e293b",
				marginBottom: 4,
			},
			customerId: {
				fontSize: 12,
				color: "#64748b",
				fontWeight: "500",
			},
			// Summary cards
			summaryGrid: {
				flexDirection: "row",
				flexWrap: "wrap",
				marginBottom: 15,
				gap: 8,
			},
			summaryCard: {
				flex: 1,
				minWidth: 120,
				padding: 10,
				backgroundColor: "#f8fafc",
				borderRadius: 6,
				border: "1px solid #e2e8f0",
				shadow: "0 1px 3px rgba(0,0,0,0.1)",
			},
			summaryLabel: {
				fontSize: 8,
				color: "#64748b",
				marginBottom: 4,
				textTransform: "uppercase",
				fontFamily: "Helvetica-Bold",
				letterSpacing: 0.5,
			},
			summaryValue: {
				fontSize: 14,
				fontFamily: "Helvetica-Bold",
				color: "#1e293b",
				marginBottom: 0,
				lineHeight: 1.2,
			},
			summaryTrend: {
				fontSize: 10,
				fontFamily: "Helvetica-Bold",
			},
			trendUp: { color: "#059669" },
			trendDown: { color: "#dc2626" },
			trendStable: { color: "#6b7280" },
			// Performance metrics
			metricsGrid: {
				flexDirection: "row",
				flexWrap: "wrap",
				marginBottom: 20,
				gap: 12,
			},
			metricItem: {
				flex: 1,
				minWidth: 140,
				padding: 12,
				backgroundColor: "#f8fafc",
				borderRadius: 6,
				border: "1px solid #e2e8f0",
			},
			metricLabel: {
				fontSize: 10,
				color: "#64748b",
				marginBottom: 4,
				textTransform: "uppercase",
				fontFamily: "Helvetica-Bold",
			},
			metricValue: {
				fontSize: 12,
				fontFamily: "Helvetica-Bold",
				color: "#1e293b",
				marginBottom: 2,
			},
			// Section titles
			sectionTitle: {
				fontSize: 12,
				fontFamily: "Helvetica-Bold",
				color: "#1e293b",
				marginTop: 12,
				marginBottom: 6,
			},
			// Insight box
			insightBox: {
				backgroundColor: "#f8fafc",
				padding: 12,
				marginBottom: 15,
				borderRadius: 8,
				border: "1px solid #e2e8f0",
			},
			insightItem: {
				marginBottom: 8,
				display: "flex",
				flexDirection: "row",
				alignItems: "flex-start",
			},
			insightLabel: {
				fontSize: 8,
				fontFamily: "Helvetica-Bold",
				color: "#ffffff",
				marginBottom: 0,
				paddingHorizontal: 8,
				paddingVertical: 2,
				borderRadius: 4,
				minWidth: 70,
				textAlign: "center",
				letterSpacing: 0.3,
			},
			insightValue: {
				fontSize: 9,
				color: "#1f2937",
				lineHeight: 1.3,
				flex: 1,
				marginLeft: 8,
				fontWeight: "500",
			},
			// Tables
			table: {
				width: "100%",
				marginTop: 4,
				marginBottom: 8,
				border: "1px solid #e5e7eb",
			},
			historyTable: {
				width: "100%",
				marginTop: 10,
				marginBottom: 15,
				border: "1px solid #e5e7eb",
			},
			monthHeader: {
				backgroundColor: "#f1f5f9",
				padding: 2,
			},
			monthLabel: {
				fontFamily: "Helvetica-Bold",
				fontSize: 8,
				color: "#1e293b",
			},
			tableHeader: {
				backgroundColor: "#f3f4f6",
				fontFamily: "Helvetica-Bold",
				fontSize: 12,
			},
			tableRow: {
				flexDirection: "row",
				borderBottom: "1px solid #e5e7eb",
			},
			tableCell: {
				padding: 3,
				fontSize: 8,
				borderRight: "1px solid #e5e7eb",
				flex: 1,
				lineHeight: 1.0,
			},
			tableCellHeader: {
				padding: 3,
				fontSize: 8,
				borderRight: "1px solid #e5e7eb",
				flex: 1,
				fontFamily: "Helvetica-Bold",
				color: "#374151",
				lineHeight: 1.0,
			},
			zebra: { backgroundColor: "#f9fafb" },
			// Status badges
			statusBadge: {
				borderRadius: 8,
				padding: "1 4",
				fontSize: 8,
				fontFamily: "Helvetica-Bold",
				textAlign: "center",
			},
			statusClosed: { backgroundColor: "#dcfce7", color: "#166534" },
			statusOpen: { backgroundColor: "#fef3c7", color: "#92400e" },
			statusPending: { backgroundColor: "#fce7f3", color: "#be185d" },
			// Footer
			footer: {
				position: "absolute",
				bottom: 20,
				left: 20,
				right: 20,
				fontSize: 10,
				color: "#6b7280",
				textAlign: "center",
				borderTop: "1px solid #e5e7eb",
				paddingTop: 10,
			},
			// Page number
			pageNumber: {
				position: "absolute",
				bottom: 10,
				right: 20,
				fontSize: 10,
				color: "#6b7280",
			},
		});
		// Calculate summary data
		const closed = customer.allTickets.filter(isClosedTicket).length;
		const avgHandling =
			customer.allTickets.length > 0
				? customer.allTickets.reduce(
					(acc, t) => acc + (t.handlingDuration?.rawHours || 0),
					0,
				) / customer.allTickets.length
				: 0;

		// Find top issue
		const issueCount = {};
		customer.allTickets.forEach((t) => {
			if (t.description)
				issueCount[t.description] = (issueCount[t.description] || 0) + 1;
		});
		const topIssue =
			Object.entries(issueCount).sort(
				(a, b) => Number(b[1]) - Number(a[1]),
			)[0]?.[0] || "-";

		const trendLabel =
			customer.trend === "Naik"
				? "Up"
				: customer.trend === "Turun"
					? "Down"
					: "Stable";
		const trendStyle =
			customer.trend === "Naik"
				? styles.trendUp
				: customer.trend === "Turun"
					? styles.trendDown
					: styles.trendStable;

		// Group tickets by month-year for ticket history
		const groups = {};
		(tickets || []).forEach((t) => {
			const openDate = parseDateSafe(t.openTime);
			if (!openDate) return;
			const key = `${openDate.getFullYear()}-${String(openDate.getMonth() + 1).padStart(2, "0")}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(t);
		});
		const sortedTicketKeys = Object.keys(groups).sort(
			(a, b) => Number(new Date(b + "-01")) - Number(new Date(a + "-01")),
		);

		// Helper function for status badge
		const getStatusBadge = (ticket) => {
			const status = getTicketStatus(ticket);
			switch (status) {
				case "CLOSED":
					return [styles.statusBadge, styles.statusClosed];
				case "OPEN":
					return [styles.statusBadge, styles.statusOpen];
				case "BACKLOG":
					return [styles.statusBadge, styles.statusPending];
				default:
					return [styles.statusBadge, styles.statusPending];
			}
		};

		return (
			<Document>
				{/* Cover Page */}
				<Page size="A4" style={styles.coverPage}>
					{/* Full Cover Background */}
					<Image src="/Cover.png" style={styles.coverBackground} />

					{/* Cover Content */}
					<View style={styles.coverContent}>
						{/* Report Title */}
						<Text style={styles.coverTitle}>TICKET REPORT</Text>

						{/* Customer Information */}
						<View style={styles.coverCustomerInfo}>
							<Text style={styles.coverCustomerName}>{customer.name}</Text>
							<Text style={styles.coverCustomerId}>
								Customer ID: {customer.customerId}
							</Text>
						</View>
					</View>
				</Page>

				{/* Content Page */}
				<Page size="A4" style={styles.contentPage}>
					{/* Page Header */}
					<Image src="/Header.png" style={styles.pageHeaderImage} />

					{/* Summary Metrics Section */}
					<Text style={styles.sectionTitle}>Summary Metrics</Text>
					<View style={styles.summaryGrid}>
						<View style={styles.summaryCard}>
							<Text style={styles.summaryLabel}>Total Tickets</Text>
							<Text style={styles.summaryValue}>
								{customer.allTickets.length}
							</Text>
						</View>
						<View style={styles.summaryCard}>
							<Text style={styles.summaryLabel}>Closed</Text>
							<Text style={styles.summaryValue}>{closed}</Text>
						</View>
						<View style={styles.summaryCard}>
							<Text style={styles.summaryLabel}>Avg Handling</Text>
							<Text style={styles.summaryValue}>
								{avgHandling ? formatDurationDHM(avgHandling) : "-"}
							</Text>
						</View>
						<View style={styles.summaryCard}>
							<Text style={styles.summaryLabel}>Risk Trend</Text>
							<Text style={[styles.summaryValue, trendStyle]}>
								{trendLabel}
							</Text>
						</View>
						<View style={styles.summaryCard}>
							<Text style={styles.summaryLabel}>Top Issue</Text>
							<Text style={styles.summaryValue}>{topIssue}</Text>
						</View>
					</View>

					{/* Automated Insight Section */}
					<Text style={styles.sectionTitle}>Automated Insight</Text>
					<View style={styles.insightBox}>
						<View style={styles.insightItem}>
							<Text
								style={[styles.insightLabel, { backgroundColor: "#3b82f6" }]}
							>
								Problem
							</Text>
							<Text style={styles.insightValue}>
								{insight.masalah || "No specific pattern identified"}
							</Text>
						</View>

						<View style={styles.insightItem}>
							<Text
								style={[styles.insightLabel, { backgroundColor: "#f59e0b" }]}
							>
								Cause
							</Text>
							<Text style={styles.insightValue}>
								{insight.penyebab || "Analysis pending"}
							</Text>
						</View>

						<View style={styles.insightItem}>
							<Text
								style={[styles.insightLabel, { backgroundColor: "#10b981" }]}
							>
								Category
							</Text>
							<Text style={styles.insightValue}>
								{insight.kategori || "Uncategorized"}
							</Text>
						</View>

						<View style={styles.insightItem}>
							<Text
								style={[styles.insightLabel, { backgroundColor: "#1e40af" }]}
							>
								Solution
							</Text>
							<Text style={styles.insightValue}>
								{insight.solusi || "Standard support protocol"}
							</Text>
						</View>
					</View>

					{/* Ticket History Section */}
					<Text style={styles.sectionTitle}>Ticket History</Text>
					<View style={styles.table}>
						<View style={[styles.tableRow, styles.tableHeader]}>
							<Text style={[styles.tableCellHeader, { flex: 1.2 }]}>Date</Text>
							<Text style={[styles.tableCellHeader, { flex: 2 }]}>
								Description
							</Text>
							<Text style={[styles.tableCellHeader, { flex: 1.5 }]}>
								Root Cause
							</Text>
							<Text style={[styles.tableCellHeader, { flex: 1.5 }]}>
								Solution Applied
							</Text>
							<Text style={[styles.tableCellHeader, { flex: 1 }]}>
								Duration
							</Text>
							<Text style={[styles.tableCellHeader, { flex: 0.8 }]}>
								Status
							</Text>
						</View>

						{sortedTicketKeys.length === 0 ? (
							<View style={styles.tableRow}>
								<Text style={[styles.tableCell, { flex: 6 }]}>
									No tickets found in this period.
								</Text>
							</View>
						) : (
							sortedTicketKeys.slice(0, 1).map((key) => {
								const [yyyy, mm] = key.split("-");
								const monthNames = [
									"January",
									"February",
									"March",
									"April",
									"May",
									"June",
									"July",
									"August",
									"September",
									"October",
									"November",
									"December",
								];
								const monthLabel = `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
								const monthTickets = groups[key]
									.slice()
									.sort(
										(a, b) =>
											Number(new Date(a.openTime)) -
											Number(new Date(b.openTime)),
									);

								return [
									<View key={key + "-label"} style={styles.monthHeader}>
										<Text style={styles.monthLabel}>{monthLabel}</Text>
									</View>,
									...monthTickets.map((t, i) => (
										<View
											key={t.id || t.openTime || i}
											style={[styles.tableRow, i % 2 === 1 && styles.zebra]}
										>
											<Text style={[styles.tableCell, { flex: 1.2 }]}>
												{(() => {
													const openDate = parseDateSafe(t.openTime);
													return openDate
														? openDate.toLocaleDateString("en-GB") +
														" " +
														openDate.toLocaleTimeString("en-GB", {
															hour: "2-digit",
															minute: "2-digit",
														})
														: "-";
												})()}
											</Text>
											<Text style={[styles.tableCell, { flex: 2 }]}>
												{t.description || "No description"}
											</Text>
											<Text style={[styles.tableCell, { flex: 1.5 }]}>
												{t.cause || "Not specified"}
											</Text>
											<Text style={[styles.tableCell, { flex: 1.5 }]}>
												{t.handling || "Standard handling"}
											</Text>
											<Text style={[styles.tableCell, { flex: 1 }]}>
												{t.handlingDuration?.formatted || "-"}
											</Text>
											<Text style={[styles.tableCell, { flex: 0.8 }]}>
												<Text style={getStatusBadge(t)}>
													{getTicketStatus(t)}
												</Text>
											</Text>
										</View>
									)),
								];
							})
						)}
					</View>

					{/* Page Footer */}
					<Image src="/Footer.png" style={styles.pageFooterImage} />

					{/* Page Number */}
					<Text style={styles.pageNumber}>Page 2</Text>
				</Page>

				{/* Additional Ticket History Pages - One Month Per Page */}
				{sortedTicketKeys.slice(1).map((key, monthIndex) => {
					const [yyyy, mm] = key.split("-");
					const monthNames = [
						"January",
						"February",
						"March",
						"April",
						"May",
						"June",
						"July",
						"August",
						"September",
						"October",
						"November",
						"December",
					];
					const monthLabel = `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`;
					const monthTickets = groups[key]
						.slice()
						.sort(
							(a, b) =>
								Number(new Date(a.openTime)) - Number(new Date(b.openTime)),
						);

					return (
						<Page
							key={`page-${monthIndex + 3}`}
							size="A4"
							style={styles.contentPage}
						>
							{/* Page Header */}
							<Image src="/Header.png" style={styles.pageHeaderImage} />

							<Text style={styles.sectionTitle}>Ticket History</Text>
							<View style={styles.table}>
								<View style={[styles.tableRow, styles.tableHeader]}>
									<Text style={[styles.tableCellHeader, { flex: 1.2 }]}>
										Date
									</Text>
									<Text style={[styles.tableCellHeader, { flex: 2 }]}>
										Description
									</Text>
									<Text style={[styles.tableCellHeader, { flex: 1.5 }]}>
										Root Cause
									</Text>
									<Text style={[styles.tableCellHeader, { flex: 1.5 }]}>
										Solution Applied
									</Text>
									<Text style={[styles.tableCellHeader, { flex: 1 }]}>
										Duration
									</Text>
									<Text style={[styles.tableCellHeader, { flex: 0.8 }]}>
										Status
									</Text>
								</View>

								<View style={styles.monthHeader}>
									<Text style={styles.monthLabel}>{monthLabel}</Text>
								</View>

								{monthTickets.map((t, i) => (
									<View
										key={t.id || t.openTime || i}
										style={[styles.tableRow, i % 2 === 1 && styles.zebra]}
									>
										<Text style={[styles.tableCell, { flex: 1.2 }]}>
											{(() => {
												const openDate = parseDateSafe(t.openTime);
												return openDate
													? openDate.toLocaleDateString("en-GB") +
													" " +
													openDate.toLocaleTimeString("en-GB", {
														hour: "2-digit",
														minute: "2-digit",
													})
													: "-";
											})()}
										</Text>
										<Text style={[styles.tableCell, { flex: 2 }]}>
											{t.description || "No description"}
										</Text>
										<Text style={[styles.tableCell, { flex: 1.5 }]}>
											{t.cause || "Not specified"}
										</Text>
										<Text style={[styles.tableCell, { flex: 1.5 }]}>
											{t.handling || "Standard handling"}
										</Text>
										<Text style={[styles.tableCell, { flex: 1 }]}>
											{t.handlingDuration?.formatted || "-"}
										</Text>
										<Text style={[styles.tableCell, { flex: 0.8 }]}>
											<Text style={getStatusBadge(t)}>
												{getTicketStatus(t)}
											</Text>
										</Text>
									</View>
								))}
							</View>

							{/* Page Footer */}
							<Image src="/Footer.png" style={styles.pageFooterImage} />
							<Text style={styles.pageNumber}>Page {monthIndex + 3}</Text>
						</Page>
					);
				})}
			</Document>
		);
	};

	// Komponen MiniTrendChart
	const MiniTrendChart = ({ data, height = 120 }) => (
		<div style={{ width: "100%", height }}>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={data}
					margin={{ top: 24, right: 48, left: 48, bottom: 24 }}
				>
					<XAxis
						dataKey="label"
						tick={{ fontSize: 11 }}
						angle={0}
						dy={16}
						height={40}
						interval={0}
					/>
					<YAxis hide domain={[0, "dataMax+2"]} />
					<Tooltip />
					<Line
						type="monotone"
						dataKey="count"
						stroke="#2563eb"
						strokeWidth={2}
						dot={{ r: 5, stroke: "#2563eb", strokeWidth: 2, fill: "#fff" }}
					>
						<LabelList
							dataKey="count"
							position="top"
							offset={12}
							style={{
								fontSize: 11,
								fill: "#1e3a8a",
								fontWeight: "bold",
								textShadow: "0 1px 2px #fff",
							}}
						/>
					</Line>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);

	// Komponen DonutChartSummary
	const DonutChartSummary = ({ data }) => {
		const COLORS = ["#22c55e", "#facc15", "#fb923c", "#ef4444"];
		const riskLabels = ["Normal", "Persisten", "Kronis", "Ekstrem"];
		const chartData = data
			.filter((d) => d.key !== "Total")
			.map((d, i) => ({
				name: riskLabels[i],
				value: d.count,
			}));
		const total = chartData.reduce((acc, d) => acc + d.value, 0);
		const percentArr = chartData.map((d) =>
			total > 0 ? Math.round((d.value / total) * 100) : 0,
		);
		return (
			<div className="flex flex-row items-center justify-center h-full w-full gap-4">
				<PieChart width={180} height={180}>
					<Pie
						data={chartData}
						cx={90}
						cy={90}
						innerRadius={54}
						outerRadius={80}
						fill="#8884d8"
						paddingAngle={2}
						dataKey="value"
						label={false}
						labelLine={false}
						stroke="none"
						strokeWidth={0}
					>
						{chartData.map((_, i) => (
							<Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
						))}
					</Pie>
				</PieChart>
				<div className="flex flex-col gap-2">
					{chartData.map((entry, i) => (
						<div key={entry.name} className="flex items-center gap-2">
							<span
								className="w-3 h-3 rounded-full"
								style={{ background: COLORS[i] }}
							></span>
							<span
								className={`text-xs ${COLORS[i] === "#facc15" || COLORS[i] === "#fb923c" ? "dark:text-black" : ""}`}
								style={{ color: COLORS[i], fontWeight: 400 }}
							>
								{entry.name}
							</span>
							<span
								className={`text-xs ${COLORS[i] === "#facc15" || COLORS[i] === "#fb923c" ? "dark:text-black" : ""}`}
								style={{ color: COLORS[i], fontWeight: 400 }}
							>
								{percentArr[i]}%
							</span>
						</div>
					))}
				</div>
			</div>
		);
	};

	return (
		<PageWrapper maxW="4xl">
			{/* Header Section with improved spacing and typography */}
			<div className="mb-8">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold text-card-foreground mb-2">
							Customer Analytics
						</h1>
						<p className="text-gray-600 dark:text-gray-400 text-base">
							Monitor customer ticket patterns and risk assessment
						</p>
					</div>
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-end gap-4">
						{/* Search Input */}
						<div className="flex items-center gap-2">
							<label htmlFor="customer-search" className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Search:
							</label>
							<div className="relative">
								<input
									id="customer-search"
									type="text"
									placeholder="Search by name, ID, or risk level..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
								/>
								{searchQuery && (
									<button
										onClick={() => setSearchQuery("")}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
										aria-label="Clear search"
									>
										×
									</button>
								)}
							</div>
						</div>

						{/* Time Filter */}
						<div className="scale-90 transform origin-right">
							<TimeFilter
								startMonth={startMonth}
								setStartMonth={setStartMonth}
								endMonth={endMonth}
								setEndMonth={setEndMonth}
								selectedYear={selectedYear}
								setSelectedYear={setSelectedYear}
								monthOptions={monthOptions}
								allYearsInData={allYearsInData}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Summary Cards with improved layout and typography */}
			<div className="w-full mb-8">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
					{finalSummary.map((item) => {
						const riskInfo =
							item.key !== "Total"
								? riskCategories.find(
									(rc) => rc.label === normalizeRiskLabel(item.key),
								)
								: null;
						const icon = {
							Normal: <CheckCircleIcon className="w-6 h-6 text-white" />,
							Persisten: <WarningAmberIcon className="w-6 h-6 text-white" />,
							Kronis: <WhatshotIcon className="w-6 h-6 text-white" />,
							Ekstrem: <SecurityIcon className="w-6 h-6 text-white" />,
							Total: <GroupIcon className="w-6 h-6 text-white" />,
						}[item.key];

						const percent =
							totalCustomers > 0
								? ((item.count / totalCustomers) * 100).toFixed(1)
								: "0.0";
						return (
							<SummaryCard
								key={item.key}
								icon={icon}
								title={item.label}
								value={
									<>
										<div className="text-2xl font-bold">{item.count}</div>
										{item.key !== "Total" && (
											<div className="text-sm font-medium text-gray-500 mt-1">
												{percent}%
											</div>
										)}
									</>
								}
								description={
									riskInfo?.description ||
									"Total unique customers in the selected period."
								}
								iconBg={riskColors[item.key]?.iconBg || "bg-gray-500"}
								badgeColor={riskColors[item.key]?.badge || "bg-blue-600"}
								badge={item.key !== "Total" ? riskInfo?.badge : undefined}
								className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${repClassFilter === item.key ? "shadow-lg" : ""}`}
								onClick={() => setRepClassFilter(item.key)}
								active={repClassFilter === item.key}
							/>
						);
					})}
					{/* Donut Chart Card with improved sizing */}
					<div className="rounded-xl shadow-lg bg-card text-card-foreground flex flex-col items-center justify-center p-6 min-h-[160px]">
						<h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
							Risk Distribution
						</h3>
						<DonutChartSummary data={finalSummary} />
					</div>
				</div>
			</div>

			{/* Search Results Indicator */}
			{searchQuery && (
				<div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-blue-800 dark:text-blue-200">
								Search Results:
							</span>
							<span className="text-sm text-blue-600 dark:text-blue-300">
								{filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found for "{searchQuery}"
							</span>
						</div>
						<button
							onClick={() => setSearchQuery("")}
							className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
						>
							Clear search
						</button>
					</div>
				</div>
			)}

			{/* Customer Cards Grid with improved layout */}
			<div className="flex-grow">
				{filteredCustomers.length > 0 ? (
					filteredCustomers.length > 50 ? (
						<List
							height={800}
							itemCount={filteredCustomers.length}
							itemSize={280}
							width={"100%"}
							className="mb-8"
						>
							{({ index, style }) => {
								const customer = filteredCustomers[index];
								const ticketsInRange = customer.allTickets || [];
								return (
									<div style={{ ...style, padding: "0 8px" }}>
										<div className="mb-4">
											<CustomerCard
												key={customer.id}
												customer={customer}
												tickets={ticketsInRange}
											/>
										</div>
									</div>
								);
							}}
						</List>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
							{filteredCustomers
								.slice((page - 1) * pageSize, page * pageSize)
								.map((customer) => {
									const ticketsInRange = customer.allTickets || [];
									return (
										<CustomerCard
											key={customer.id}
											customer={customer}
											tickets={ticketsInRange}
										/>
									);
								})}
						</div>
					)
				) : (
					<div className="text-center py-16">
						<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
							{searchQuery ? (
								<span className="text-2xl">🔍</span>
							) : (
								<GroupIcon className="w-8 h-8 text-gray-400" />
							)}
						</div>
						<h3 className="text-xl font-semibold text-card-foreground mb-2">
							{searchQuery ? "No Search Results" : "No Customers Found"}
						</h3>
						<p className="text-gray-500 dark:text-gray-400 mb-4">
							{searchQuery
								? `No customers found matching "${searchQuery}". Try adjusting your search terms.`
								: "No customers match the current filter criteria."
							}
						</p>
						{searchQuery && (
							<button
								onClick={() => setSearchQuery("")}
								className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Clear Search
							</button>
						)}
					</div>
				)}
			</div>

			{/* Customer Details Dialog with improved layout and typography */}
			<RadixDialog.Root
				open={!!openDialogId}
				onOpenChange={(open) => setOpenDialogId(open ? openDialogId : null)}
			>
				<RadixDialog.Portal>
					<RadixDialog.Overlay className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
					<RadixDialog.Content className="fixed right-0 top-0 h-full w-full md:w-[1200px] lg:w-[1400px] max-w-full bg-card text-card-foreground shadow-2xl z-50 overflow-y-auto">
						{selectedCustomer && (
							<>
								{/* Accessibility: Hidden Title and Description */}
								<RadixDialog.Title className="sr-only">
									Customer Details - {selectedCustomer.name}
								</RadixDialog.Title>
								<RadixDialog.Description className="sr-only">
									Detailed information about customer {selectedCustomer.name}{" "}
									including ticket history, analytics, and insights.
								</RadixDialog.Description>

								{/* Header with improved typography and spacing */}
								<div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-gray-200 dark:border-zinc-800">
									<div>
										<h2 className="text-2xl font-bold text-card-foreground mb-1">
											{selectedCustomer.name}
										</h2>
										<p className="text-gray-600 dark:text-gray-400">
											Customer ID: {selectedCustomer.customerId}
										</p>
									</div>
									<RadixDialog.Close asChild>
										<button
											className="text-gray-400 hover:text-red-500 text-3xl font-light focus:outline-none transition-colors duration-150 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
											aria-label="Close customer detail"
										>
											&times;
										</button>
									</RadixDialog.Close>
								</div>

								{/* Summary Grid with improved layout */}
								<div className="px-8 pt-8 pb-6">
									<h3 className="text-lg font-semibold text-card-foreground mb-4">
										Summary Metrics
									</h3>
									<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
										<div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Total Tickets
											</span>
											<div className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">
												{selectedCustomer.allTickets.length}
											</div>
										</div>
										<div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Closed
											</span>
											<div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
												{
													selectedCustomer.allTickets.filter(isClosedTicket).length
												}
											</div>
										</div>
										<div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Avg Handling
											</span>
											<div className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">
												{formatDurationDHM(
													selectedCustomer.allTickets.reduce(
														(acc, t) =>
															acc + (t.handlingDuration?.rawHours || 0),
														0,
													) / (selectedCustomer.allTickets.length || 1),
												)}
											</div>
										</div>
										<div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Top Agent
											</span>
											<div className="text-lg font-semibold text-blue-800 dark:text-blue-300 mt-1">
												{(() => {
													const agentCount = {};
													selectedCustomer.allTickets.forEach((t) => {
														if (t.openBy)
															agentCount[t.openBy] =
																(agentCount[t.openBy] || 0) + 1;
													});
													return (
														Object.entries(agentCount).sort(
															(a, b) => Number(b[1]) - Number(a[1]),
														)[0]?.[0] || "-"
													);
												})()}
											</div>
										</div>
										<div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Top Issue
											</span>
											<div className="text-lg font-semibold text-blue-800 dark:text-blue-300 mt-1">
												{(() => {
													const issueCount = {};
													selectedCustomer.allTickets.forEach((t) => {
														if (t.description)
															issueCount[t.description] =
																(issueCount[t.description] || 0) + 1;
													});
													return (
														Object.entries(issueCount).sort(
															(a, b) => Number(b[1]) - Number(a[1]),
														)[0]?.[0] || "-"
													);
												})()}
											</div>
										</div>
										<div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
											<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Risk Level
											</span>
											<div className="text-lg font-semibold text-blue-800 dark:text-blue-300 mt-1">
												{selectedCustomer.repClass}
											</div>
										</div>
									</div>
								</div>

								{/* Automated Insight Box with improved layout */}
								<div className="px-8 pb-6">
									<div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-700 rounded-xl p-6 shadow-sm">
										<h3 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
											<FileTextIcon className="w-5 h-5 text-blue-600" />
											Automated Insight
										</h3>
										<div className="space-y-3">
											<div className="flex items-start gap-3">
												<Badge variant="info" className="mt-1 flex-shrink-0">
													Problem
												</Badge>
												<span className="text-gray-700 dark:text-gray-200">
													{generateInsight(selectedCustomer.allTickets).masalah}
												</span>
											</div>
											<div className="flex items-start gap-3">
												<Badge variant="warning" className="mt-1 flex-shrink-0">
													Cause
												</Badge>
												<span className="text-gray-700 dark:text-gray-200">
													{
														generateInsight(selectedCustomer.allTickets)
															.penyebab
													}
												</span>
											</div>
											<div className="flex items-start gap-3">
												<Badge variant="info" className="mt-1 flex-shrink-0">
													Category
												</Badge>
												<span className="text-gray-700 dark:text-gray-200">
													{
														generateInsight(selectedCustomer.allTickets)
															.kategori
													}
												</span>
											</div>
											<div className="flex items-start gap-3">
												<Badge variant="success" className="mt-1 flex-shrink-0">
													Solution
												</Badge>
												<span className="text-gray-700 dark:text-gray-200">
													{generateInsight(selectedCustomer.allTickets).solusi}
												</span>
											</div>
											{/* Recommendation section hidden */}
											{/* <div className="flex items-start gap-3">
												<Badge variant="info" className="mt-1 flex-shrink-0">
													Recommendation
												</Badge>
												<span className="text-gray-700 dark:text-gray-200 text-justify">
													{
														generateInsight(selectedCustomer.allTickets)
															.rekomendasi
													}
												</span>
											</div> */}
										</div>
									</div>
								</div>

								{/* Mini Trend Chart with improved layout */}
								<div className="px-8 pb-6">
									<div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
										<h3 className="text-lg font-bold text-card-foreground mb-4">
											Ticket History Trend
										</h3>
										{(() => {
											const history = (
												selectedCustomer.allTickets || []
											).reduce((acc, t) => {
												const openDate = parseDateSafe(t.openTime);
												if (!openDate) return acc;
												const key = `${openDate.getFullYear()}-${String(openDate.getMonth() + 1).padStart(2, "0")}`;
												acc[key] = (acc[key] || 0) + 1;
												return acc;
											}, {});
											const monthNames = [
												"Jan",
												"Feb",
												"Mar",
												"Apr",
												"May",
												"Jun",
												"Jul",
												"Aug",
												"Sep",
												"Oct",
												"Nov",
												"Dec",
											];
											const sortedKeys = Object.keys(history).sort(
												(a, b) =>
													new Date(a + "-01").getTime() -
													new Date(b + "-01").getTime(),
											);
											const chartData = sortedKeys.map((key) => {
												const [yyyy, mm] = key.split("-");
												return {
													label: `${monthNames[parseInt(mm, 10) - 1]} ${yyyy}`,
													count: history[key],
												};
											});
											return chartData.length > 0 ? (
												<div className="w-full mx-auto overflow-x-auto">
													<div
														style={{
															minWidth: Math.max(400, chartData.length * 80),
														}}
													>
														<MiniTrendChart data={chartData} height={200} />
													</div>
												</div>
											) : (
												<div className="text-gray-400 text-center py-12">
													<div className="text-4xl mb-2">📊</div>
													<p className="text-sm">No ticket history data available for this customer.</p>
													<p className="text-xs text-gray-500 mt-1">Data will appear here once tickets are created.</p>
												</div>
											);
										})()}
									</div>
								</div>

								{/* Historical Count with improved layout */}
								<div className="px-8 pb-6">
									<div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800">
										<h3 className="text-lg font-bold text-card-foreground mb-4">
											Historical Analysis
										</h3>
										<HistoricalTicketCount customer={selectedCustomer} />
									</div>
								</div>

								{/* Ticket History Table with improved layout */}
								<div className="px-8 pb-6">
									<h3 className="text-lg font-bold text-card-foreground mb-4">
										Detailed Ticket History
									</h3>
									<div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 overflow-x-auto">
										<TicketHistoryTable tickets={selectedCustomer.allTickets} />
									</div>
								</div>

								{/* Export Actions with improved layout */}
								<div className="px-8 pb-8">
									<div className="flex flex-wrap justify-end gap-3">
										{/* PDF Export */}
										<PDFDownloadLink
											document={
												<CustomerReportPDF
													customer={selectedCustomer}
													insight={generateInsight(selectedCustomer.allTickets)}
													tickets={selectedCustomer.allTickets}
												/>
											}
											fileName={`CustomerReport-${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`}
										>
											{({ loading, error }) => (
												<button
													className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
													disabled={loading}
													onClick={() => {
														if (error) {
															logger.error("PDF generation error:", error);
															alert("Error generating PDF. Please try again.");
														}
													}}
												>
													<FileTextIcon className="w-4 h-4" />
													{loading ? "Generating PDF..." : "Download PDF"}
												</button>
											)}
										</PDFDownloadLink>

										{/* Excel Export */}
										<button
											className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
											onClick={async () => {
												try {
													const excelData = selectedCustomer.allTickets.map(
														(ticket) => ({
															"Ticket ID": ticket.id || "-",
															Customer: selectedCustomer.name,
															"Customer ID": selectedCustomer.customerId,
															Description: ticket.description || "-",
															Status: ticket.status || "-",
															"Open Time": (() => {
																const openDate = parseDateSafe(ticket.openTime);
																return openDate ? openDate.toLocaleString("id-ID") : "-";
															})(),
															"Close Time": (() => {
																const closeDate = parseDateSafe(ticket.closeTime);
																return closeDate ? closeDate.toLocaleString("id-ID") : "-";
															})(),
															"Handling Duration":
																ticket.handlingDuration?.formatted || "-",
															Cause: ticket.cause || "-",
															Handling: ticket.handling || "-",
														}),
													);

													await exportToExcel(
														excelData,
														`CustomerReport-${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, "_")}`,
													);
												} catch (error) {
													logger.error("Excel export error:", error);
													alert("Error exporting Excel. Please try again.");
												}
											}}
										>
											<TableChartIcon className="w-4 h-4" />
											Export Excel
										</button>

										{/* CSV Export */}
										<button
											className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold shadow-lg hover:bg-orange-700 transition-all flex items-center gap-2"
											onClick={() => {
												try {
													const csvData = selectedCustomer.allTickets.map(
														(ticket) => ({
															"Ticket ID": ticket.id || "-",
															Customer: selectedCustomer.name,
															"Customer ID": selectedCustomer.customerId,
															Description: ticket.description || "-",
															Status: ticket.status || "-",
															"Open Time": (() => {
																const openDate = parseDateSafe(ticket.openTime);
																return openDate ? openDate.toLocaleString("id-ID") : "-";
															})(),
															"Close Time": (() => {
																const closeDate = parseDateSafe(ticket.closeTime);
																return closeDate ? closeDate.toLocaleString("id-ID") : "-";
															})(),
															"Handling Duration":
																ticket.handlingDuration?.formatted || "-",
															Cause: ticket.cause || "-",
															Handling: ticket.handling || "-",
														}),
													);

													exportToCSV(
														csvData,
														`CustomerReport-${selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, "_")}`,
													);
												} catch (error) {
													logger.error("CSV export error:", error);
													alert("Error exporting CSV. Please try again.");
												}
											}}
										>
											<TextSnippetIcon className="w-4 h-4" />
											Export CSV
										</button>
									</div>
								</div>
							</>
						)}
					</RadixDialog.Content>
				</RadixDialog.Portal>
			</RadixDialog.Root>

			{/* Pagination with improved styling */}
			{calculatedTotalPages && calculatedTotalPages > 1 && (
				<div className="flex justify-center items-center gap-4 mt-8 mb-4">
					<PaginationControls
						page={page}
						pageSize={pageSize}
						totalPages={paginationTotalPages ?? 1}
						onPageChange={setPage}
						onPageSizeChange={setPageSize}
						pageSizes={[10, 20, 50, 100]}
					/>
				</div>
			)}
		</PageWrapper>
	);
};

export default CustomerAnalytics;
