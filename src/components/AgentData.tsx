import React, { useMemo, useState } from "react";
// import { useLiveQuery } from "dexie-react-hooks";
// import { db } from "@/lib/db";
import { cacheService } from "@/services/cacheService";
import PageWrapper from "./PageWrapper";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";
import PhotoManagement from "./PhotoManagement";
import { Users, Image as ImageIcon } from "lucide-react";

const CURRENT_YEAR = 2025;

function formatDurationHMS(hours: number) {
	if (!isFinite(hours)) return "-";
	const totalSeconds = Math.round(hours * 3600);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
function formatMasaAktif(
	first: string | number | Date,
	last: string | number | Date,
) {
	if (!first || !last) return "-";
	const d1 = new Date(first);
	const d2 = new Date(last);
	if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return "-";
	const diff = Math.abs(Number(d2.getTime()) - Number(d1.getTime()));
	const _totalDays = Number.isFinite(diff)
		? Math.floor(diff / (1000 * 60 * 60 * 24))
		: 0;
	const _years = Number.isFinite(_totalDays) ? Math.floor(_totalDays / 365) : 0;
	const _daysAfterYears =
		Number.isFinite(_totalDays) && Number.isFinite(_years)
			? _totalDays - _years * 365
			: 0;
	const _months = Number.isFinite(_daysAfterYears)
		? Math.floor(_daysAfterYears / 30)
		: 0;
	const _daysLeft =
		Number.isFinite(_daysAfterYears) && Number.isFinite(_months)
			? _daysAfterYears - _months * 30
			: 0;
	let str = "";
	if (_years > 0) str += _years + " thn ";
	if (_months > 0) str += _months + " bln ";
	if (_daysLeft > 0) str += _daysLeft + " hr";
	return str.trim() || "0 hr";
}

const AgentData: React.FC = () => {
	const [activeTab, setActiveTab] = useState<'data' | 'photos'>('data');
	const [allTickets, setAllTickets] = useState<any[]>([]);

	React.useEffect(() => {
		const fetchTickets = async () => {
			try {
				const tickets = await cacheService.getTickets();
				setAllTickets(tickets);
			} catch (error) {
				console.error("Failed to fetch tickets in AgentData:", error);
			}
		};
		fetchTickets();
	}, []);

	const { activeAgents, nonActiveAgents } = useMemo(() => {
		if (!allTickets) return { activeAgents: [], nonActiveAgents: [] };
		const map = new Map();
		allTickets.forEach((t) => {
			const agent = t.openBy?.trim() || "Unknown";
			if (!map.has(agent)) map.set(agent, []);
			map.get(agent).push(t);
		});
		const all = Array.from(map.entries())
			.map(([name, tickets]) => {
				const years = Array.from(
					new Set(
						tickets
							.map((t) => {
								const d = new Date(t.openTime);
								return isNaN(d.getTime()) ? null : d.getFullYear();
							})
							.filter(Boolean),
					),
				);
				const sortedYears = years
					.map(Number)
					.filter((x) => typeof x === "number" && !isNaN(x))
					.sort((a, b) => a - b);
				const lastYear =
					sortedYears.length > 0 ? Number(Math.max(...sortedYears)) : 0;
				// Jumlah tiket
				const ticketCount = tickets.length;
				// Tiket pertama & terakhir
				const sortedTickets = tickets
					.slice()
					.sort(
						(a, b) =>
							new Date(a.openTime).getTime() - new Date(b.openTime).getTime(),
					);
				const firstTicket = sortedTickets[0];
				const lastTicket = sortedTickets[sortedTickets.length - 1];
				// Rata-rata durasi penanganan
				const avgHandling =
					tickets.length > 0
						? tickets.reduce(
							(acc, t) => acc + (t.handlingDuration?.rawHours || 0),
							0,
						) / tickets.length
						: 0;
				// Jumlah customer unik
				const uniqueCustomers = new Set(
					tickets.map(
						(t) => t.customer || t.customerId || t.customer_id || "-",
					),
				).size;
				// Jumlah tiket selesai di hari yang sama (openTime dan closeTime di tanggal yang sama, jam boleh beda, status apapun)
				const sameDayResolved = tickets.filter((t) => {
					if (!t.openTime || !t.closeTime) return false;
					const open = new Date(t.openTime);
					const close = new Date(t.closeTime);
					return (
						open.getFullYear() === close.getFullYear() &&
						open.getMonth() === close.getMonth() &&
						open.getDate() === close.getDate()
					);
				}).length;
				// Jumlah escalation: tiket dengan closeHandling2/3/4/5 tidak kosong (logika sama dengan halaman lain)
				const escalationCount = tickets.filter((t) =>
					[
						t.closeHandling2,
						t.closeHandling3,
						t.closeHandling4,
						t.closeHandling5,
					].some((h) => h && h.trim && h.trim() !== ""),
				).length;
				return {
					name,
					years: sortedYears,
					lastYear,
					ticketCount,
					masaAktif:
						firstTicket &&
							lastTicket &&
							firstTicket.openTime &&
							lastTicket.openTime
							? formatMasaAktif(
								typeof firstTicket.openTime === "number" ||
									typeof firstTicket.openTime === "string"
									? firstTicket.openTime
									: String(firstTicket.openTime),
								typeof lastTicket.openTime === "number" ||
									typeof lastTicket.openTime === "string"
									? lastTicket.openTime
									: String(lastTicket.openTime),
							)
							: "-",
					avgHandling,
					uniqueCustomers,
					sameDayResolved,
					escalationCount,
					// topCategory,
					// topShift,
				};
			})
			// Urutkan berdasarkan jumlah tiket terbanyak ke terkecil
			.sort((a, b) => b.ticketCount - a.ticketCount);
		return {
			activeAgents: all.filter((a) => a.lastYear === CURRENT_YEAR),
			nonActiveAgents: all.filter((a) => a.lastYear < CURRENT_YEAR),
		};
	}, [allTickets]);

	// Get all unique agent names for photo management
	const allAgentNames = useMemo(() => {
		if (!allTickets) return [];
		const agentSet = new Set<string>();
		allTickets.forEach((t) => {
			const agent = t.openBy?.trim();
			if (agent) agentSet.add(agent);
		});
		return Array.from(agentSet).sort();
	}, [allTickets]);

	const renderTable = (agents: any[], title: string) => (
		<div className="mb-12">
			<h2 className="text-lg md:text-xl font-bold mb-4 text-card-foreground">
				{title}
			</h2>
			<div className="overflow-x-auto rounded-xl shadow-lg ring-1 ring-gray-200 dark:ring-zinc-800 bg-card text-card-foreground ">
				<table className="min-w-full table-fixed text-sm rounded-xl overflow-hidden">
					<colgroup>
						<col className="w-14" />
						<col className="w-[20%] min-w-[160px]" />
						<col className="w-[13%] min-w-[110px]" />
						<col className="w-[13%] min-w-[110px]" />
						<col className="w-[15%] min-w-[120px]" />
						<col className="w-[12%] min-w-[100px]" />
						<col className="w-[15%] min-w-[120px]" />
						<col className="w-[13%] min-w-[110px]" />
						<col className="w-[13%] min-w-[110px]" />
					</colgroup>
					<thead>
						<tr className="bg-blue-600 text-white font-bold text-xs uppercase">
							<th className="w-14 px-4 py-3 text-left rounded-tl-xl">No</th>
							<th className="w-[20%] min-w-[160px] px-5 py-3 text-left">
								Nama Agent
							</th>
							<th className="w-[13%] min-w-[110px] px-5 py-3 text-left">
								Tahun Aktif
							</th>
							<th className="w-[13%] min-w-[110px] px-5 py-3 text-center">
								Jumlah Tiket
							</th>
							<th className="w-[15%] min-w-[120px] px-5 py-3 text-left">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="cursor-help">Masa Aktif Handle</span>
										</TooltipTrigger>
										<TooltipContent side="top" align="center">
											Rentang waktu antara tiket pertama dan terakhir yang
											di-handle agent (berdasarkan tanggal tiket)
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</th>
							<th className="w-[12%] min-w-[100px] px-5 py-3 text-left">
								Rata-rata Durasi
							</th>
							<th className="w-[15%] min-w-[120px] px-5 py-3 text-center">
								Jumlah Customer Unik
							</th>
							<th className="w-[13%] min-w-[110px] px-5 py-3 text-center">
								Jumlah Tiket Selesai di Hari yang Sama
							</th>
							<th className="w-[13%] min-w-[110px] px-5 py-3 text-center rounded-tr-xl">
								Jumlah Escalation
							</th>
						</tr>
					</thead>
					<tbody>
						{agents.length === 0 ? (
							<tr>
								<td colSpan={9} className="text-center py-8 text-gray-400">
									Tidak ada data agent.
								</td>
							</tr>
						) : (
							agents.map((agent, i) => (
								<tr
									key={agent.name}
									className={
										`transition-colors duration-200 cursor-pointer ` +
										(i % 2 === 0
											? "bg-card text-card-foreground "
											: "bg-gray-50 dark:bg-gray-800") +
										" hover:bg-blue-50/60 dark:hover:bg-blue-900/40 ring-b-1 ring-gray-100 dark:ring-zinc-800"
									}
								>
									<td className="w-14 px-4 py-3 text-card-foreground font-semibold text-center align-top">
										{i + 1}
									</td>
									<td className="w-[20%] min-w-[160px] px-5 py-3 text-card-foreground font-semibold align-top whitespace-nowrap">
										{agent.name}
									</td>
									<td className="w-[13%] min-w-[110px] px-5 py-3 align-top">
										<div className="flex flex-wrap gap-2">
											{agent.years.map((y: number) => (
												<Badge
													key={y}
													className="rounded-md text-xs px-2 py-0.5 font-bold text-white bg-blue-600"
												>
													{y}
												</Badge>
											))}
										</div>
									</td>
									<td className="w-[13%] min-w-[110px] px-5 py-3 align-top text-center">
										{agent.ticketCount}
									</td>
									<td className="w-[15%] min-w-[120px] px-5 py-3 align-top">
										{agent.masaAktif}
									</td>
									<td className="w-[12%] min-w-[100px] px-5 py-3 align-top">
										{formatDurationHMS(agent.avgHandling)}
									</td>
									<td className="w-[15%] min-w-[120px] px-5 py-3 align-top text-center">
										{agent.uniqueCustomers}
									</td>
									<td className="w-[13%] min-w-[110px] px-5 py-3 align-top text-center">
										{agent.sameDayResolved}
									</td>
									<td className="w-[13%] min-w-[110px] px-5 py-3 align-top text-center">
										{agent.escalationCount}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);

	return (
		<PageWrapper maxW="4xl">
			<div className="mb-8">
				<h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-card-foreground">
					Master Data Agent
				</h1>
				<p className="text-gray-500 dark:text-gray-400 mb-6">
					List agent otomatis dari data tiket, beserta tahun aktif masing-masing
					agent dan manajemen foto agent.
				</p>
			</div>

			{/* Tab Navigation */}
			<div className="flex gap-4 mb-8">
				<Button
					variant={activeTab === 'data' ? 'default' : 'outline'}
					onClick={() => setActiveTab('data')}
					className="flex items-center space-x-2"
				>
					<Users className="w-4 h-4" />
					<span>Agent Data</span>
				</Button>
				<Button
					variant={activeTab === 'photos' ? 'default' : 'outline'}
					onClick={() => setActiveTab('photos')}
					className="flex items-center space-x-2"
				>
					<ImageIcon className="w-4 h-4" />
					<span>Photo Management</span>
				</Button>
			</div>

			{/* Tab Content */}
			{activeTab === 'data' && (
				<div>
					{renderTable(activeAgents, `Active Agent (${CURRENT_YEAR})`)}
					{renderTable(nonActiveAgents, "Nonaktif Agent")}
				</div>
			)}

			{activeTab === 'photos' && (
				<PhotoManagement allAgents={allAgentNames} />
			)}
		</PageWrapper>
	);
};

export default AgentData;
