import { create } from "zustand";
import {
	AgentMetric,
	Ticket,
	sanitizeTickets,
	calcAllMetrics,
} from "@/utils/agentKpi";
import { logger } from "@/lib/logger";

interface AgentStore {
	tickets: Ticket[];
	agentMetrics: AgentMetric[];
	setTickets: (tickets: Ticket[]) => void;
	setAgentMetrics: (tickets: Ticket[]) => void;
}

// Fungsi mapping field tiket agar sesuai agentKpi
function mapTicketFieldsForAgentKpi(ticket: any) {
	// Normalisasi status
	let status = ticket.status || ticket.STATUS;
	if (typeof status === "string") {
		const s = status.trim().toLowerCase();
		if (s === "close ticket" || s === "closed") status = "Closed";
		else if (s === "open ticket" || s === "open") status = "Open";
	}

	// Mapping Timestamp (Handle Excel Headers, CamelCase, and API snake_case)
	// WaktuOpen is crucial for fallback calculation
	const WaktuOpen = ticket["OPEN TIME"] || ticket.openTime || ticket.open_time;
	const WaktuCloseTicket = ticket["CLOSE TIME"] || ticket.closeTime || ticket.close_time;
	const OpenBy = ticket["OPEN BY"] || ticket.openBy || ticket.open_by;

	// Mapping Handling Timestamp
	// closeHandling = Total/Final handling close time (for ART)
	const closeHandling = ticket["CLOSE PENANGANAN"] || ticket.closeHandling || ticket.close_handling;
	// closeHandling1 = First handling close time (for FRT)
	const closeHandling1 = ticket["CLOSE PENANGANAN 1"] || ticket.closeHandling1 || ticket.close_handling1;
	// Legacy mapping: ClosePenanganan often refers to step 1 in legacy code
	const ClosePenanganan = closeHandling1;

	// Mapping Handling Content (for FCR)
	const Penanganan2 =
		ticket["PENANGANAN 2"] ||
		ticket.Penanganan2 ||
		ticket.handling2 ||
		ticket["CLOSE PENANGANAN 2"] ||
		ticket.closeHandling2;

	// Mapping Duration Structs (Support API flat fields from MySQL)
	// TicketData.tsx maps these manually, we must do the same here for Agent Store.
	let handlingDuration = ticket.handlingDuration;
	if (!handlingDuration && ticket.handling_duration_raw_hours !== undefined) {
		handlingDuration = {
			rawHours: Number(ticket.handling_duration_raw_hours) || 0,
			formatted: ticket.handling_duration_formatted || "00:00:00"
		};
	}

	let handlingDuration1 = ticket.handlingDuration1;
	if (!handlingDuration1 && ticket.handling_duration1_raw_hours !== undefined) {
		handlingDuration1 = {
			rawHours: Number(ticket.handling_duration1_raw_hours) || 0,
			formatted: ticket.handling_duration1_formatted || "00:00:00"
		};
	}

	const mapped = {
		...ticket,
		WaktuOpen,
		WaktuCloseTicket,
		ClosePenanganan,
		closeHandling,
		closeHandling1,
		Penanganan2,
		handlingDuration,
		handlingDuration1,
		OpenBy,
		status,
		// Standardize keys for consistency
		openTime: WaktuOpen,
		closeTime: WaktuCloseTicket,
	};
	// Debug: log satu tiket hasil mapping
	if (
		typeof window !== "undefined" &&
		window &&
		!(window as any).__agentKpiDebugged
	) {
		logger.info("=== AGENT KPI FIELD MAPPING DEBUG ===");
		logger.info("Raw Ticket Keys:", Object.keys(ticket));
		logger.info("Mapped WaktuOpen:", WaktuOpen);
		logger.info("Mapped closeHandling1:", closeHandling1);
		logger.info("Mapped handlingDuration:", handlingDuration);
		logger.info("Mapped handlingDuration1:", handlingDuration1);
		(window as any).__agentKpiDebugged = true;
	}
	return mapped;
}



export const useAgentStore = create<AgentStore>((set) => ({
	tickets: [],
	agentMetrics: [],
	setTickets: (tickets) => {
		set({ tickets });
		set({
			agentMetrics: calcAllMetrics(
				sanitizeTickets(tickets.map(mapTicketFieldsForAgentKpi)),
			),
		});
	},
	setAgentMetrics: (tickets) => {
		set({
			agentMetrics: calcAllMetrics(
				sanitizeTickets(tickets.map(mapTicketFieldsForAgentKpi)),
			),
		});
	},
}));
