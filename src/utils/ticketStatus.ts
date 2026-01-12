/**
 * Standardized ticket status utilities
 * Ensures consistent OPEN, CLOSED, and BACKLOG definitions across all components
 */

export interface ITicket {
	id?: string;
	status?: string;
	openTime?: string;
	closeTime?: string;
	closeHandling?: string;
	openBy?: string;
	customerId?: string;
	name?: string;
	description?: string;
	classification?: string;
	duration?: {
		rawHours?: number;
		formatted?: string;
	};
}

export type TicketStatus = 'OPEN' | 'CLOSED' | 'BACKLOG';

/**
 * Parse date safely, return null if invalid
 */
function parseDateSafe(dateString: string | undefined): Date | null {
	if (!dateString) return null;
	const d = new Date(dateString);
	return isNaN(d.getTime()) ? null : d;
}

/**
 * Get standardized ticket status based on business rules
 */
export const getTicketStatus = (ticket: ITicket): TicketStatus => {
	const status = (ticket.status || "").trim().toLowerCase();
	const hasCloseTime = ticket.closeTime && !isNaN(new Date(ticket.closeTime).getTime());
	const now = new Date();

	// Kriteria 1: Status field priority (explicit status)
	if (status === "closed" || status === "close" || status === "close ticket") {
		return 'CLOSED';
	}
	if (status === "open" || status === "open ticket") {
		// If explicitly marked as open, check if it should be backlog
		if (!hasCloseTime) return 'BACKLOG';

		const closeDate = new Date(ticket.closeTime!);
		// If closeTime is in future, it's still backlog
		if (closeDate > now) return 'BACKLOG';

		// If closeTime is more than 30 days from openTime, it's backlog
		if (ticket.openTime) {
			const openDate = new Date(ticket.openTime);
			const daysDiff = (closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24);
			if (daysDiff > 30) return 'BACKLOG';
		}

		return 'OPEN';
	}

	// Kriteria 2: No closeTime = BACKLOG
	if (!hasCloseTime) {
		return 'BACKLOG';
	}

	// Kriteria 3: closeTime di masa depan = BACKLOG
	const closeDate = new Date(ticket.closeTime!);
	if (closeDate > now) {
		return 'BACKLOG';
	}

	// Kriteria 4: Durasi > 30 hari = BACKLOG
	if (ticket.openTime) {
		const openDate = new Date(ticket.openTime);
		const daysDiff = (closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24);
		if (daysDiff > 30) {
			return 'BACKLOG';
		}
	}

	// Kriteria 5: closeTime di bulan berbeda dari openTime = BACKLOG
	if (ticket.openTime) {
		const openDate = new Date(ticket.openTime);
		const openMonth = openDate.getMonth();
		const openYear = openDate.getFullYear();
		const closeMonth = closeDate.getMonth();
		const closeYear = closeDate.getFullYear();

		if (closeYear > openYear || (closeYear === openYear && closeMonth > openMonth)) {
			return 'BACKLOG';
		}
	}

	// Default: CLOSED
	return 'CLOSED';
};

/**
 * Check if ticket is OPEN (includes both OPEN and BACKLOG)
 */
export const isOpenTicket = (ticket: ITicket): boolean => {
	const status = getTicketStatus(ticket);
	return status === 'OPEN' || status === 'BACKLOG';
};

/**
 * Check if ticket is BACKLOG specifically
 */
export const isBacklogTicket = (ticket: ITicket): boolean => {
	return getTicketStatus(ticket) === 'BACKLOG';
};

/**
 * Check if ticket is CLOSED
 */
export const isClosedTicket = (ticket: ITicket): boolean => {
	return getTicketStatus(ticket) === 'CLOSED';
};

/**
 * Check if ticket is OPEN (not BACKLOG)
 */
export const isOpenOnlyTicket = (ticket: ITicket): boolean => {
	return getTicketStatus(ticket) === 'OPEN';
};

/**
 * Get ticket age in hours (for backlog analysis)
 */
export const getTicketAgeHours = (ticket: ITicket): number | null => {
	if (!ticket.openTime) return null;

	const openDate = parseDateSafe(ticket.openTime);
	if (!openDate) return null;

	const now = new Date();
	return (now.getTime() - openDate.getTime()) / (1000 * 60 * 60);
};

/**
 * Get ticket duration in hours (open to close)
 */
export const getTicketDurationHours = (ticket: ITicket): number | null => {
	if (!ticket.openTime || !ticket.closeTime) return null;

	const openDate = parseDateSafe(ticket.openTime);
	const closeDate = parseDateSafe(ticket.closeTime);

	if (!openDate || !closeDate) return null;

	return (closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60);
};

/**
 * Filter tickets by status
 */
export const filterTicketsByStatus = (tickets: ITicket[], status: TicketStatus): ITicket[] => {
	return tickets.filter(ticket => getTicketStatus(ticket) === status);
};

/**
 * Get backlog statistics
 */
export const getBacklogStats = (tickets: ITicket[]) => {
	const backlogTickets = filterTicketsByStatus(tickets, 'BACKLOG');
	const openTickets = filterTicketsByStatus(tickets, 'OPEN');
	const closedTickets = filterTicketsByStatus(tickets, 'CLOSED');

	const backlogAges = backlogTickets
		.map(getTicketAgeHours)
		.filter((age): age is number => age !== null);

	return {
		total: tickets.length,
		backlog: backlogTickets.length,
		open: openTickets.length,
		closed: closedTickets.length,
		backlogAges,
		avgBacklogAge: backlogAges.length > 0
			? backlogAges.reduce((a, b) => a + b, 0) / backlogAges.length
			: 0,
		maxBacklogAge: backlogAges.length > 0 ? backlogAges.reduce((max, v) => v > max ? v : max, backlogAges[0]) : 0,
		minBacklogAge: backlogAges.length > 0 ? backlogAges.reduce((min, v) => v < min ? v : min, backlogAges[0]) : 0,
	};
};

/**
 * Status constants for consistency
 */
export const TICKET_STATUS_VALUES = {
	OPEN: ['open', 'open ticket'],
	CLOSED: ['closed', 'close', 'close ticket'],
} as const;

/**
 * Log ticket status for debugging
 */
export const logTicketStatus = (ticket: ITicket, label: string = 'Ticket') => {
	const status = getTicketStatus(ticket);
	const age = getTicketAgeHours(ticket);
	const duration = getTicketDurationHours(ticket);

	console.log(`${label}:`, {
		id: ticket.id,
		status: ticket.status,
		openTime: ticket.openTime,
		closeTime: ticket.closeTime,
		calculatedStatus: status,
		ageHours: age,
		durationHours: duration,
	});
};
