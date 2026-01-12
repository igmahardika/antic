import { nanoid } from "nanoid";
import { create } from "zustand";
import type {
	Escalation,
	EscalationHistory,
} from "@/types/escalation";
import { EscalationStatus } from "@/types/escalation";
import { escalationDB, lsGet, lsSet } from "@/lib/db/escalation";
import { logger } from "@/lib/logger";

interface State {
	rows: Escalation[];
	loading: boolean;
}

interface Actions {
	load: () => Promise<void>;
	add: (
		payload: Omit<Escalation, "id" | "status" | "createdAt" | "updatedAt"> & {
			status?: EscalationStatus;
		},
	) => Promise<string>;
	update: (
		id: string,
		patch: Partial<Escalation>,
		skipHistory?: boolean,
	) => Promise<void>;
	close: (id: string) => Promise<void>;
	delete: (id: string) => Promise<void>;
	getHistory: (escalationId: string) => Promise<EscalationHistory[]>;
	addHistory: (
		escalationId: string,
		field: string,
		oldValue: string,
		newValue: string,
		action: "created" | "updated" | "closed",
	) => Promise<void>;
}

export const useEscalationStore = create<State & Actions>((set, get) => ({
	rows: [],
	loading: false,
	load: async () => {
		set({ loading: true });
		try {
			// Ensure database is ready
			await escalationDB.open();
			const rows = await escalationDB.escalations.toArray();
			set({ rows, loading: false });
		} catch (error) {
			logger.warn(
				"Failed to load from IndexedDB, using localStorage fallback:",
				error,
			);
			set({ rows: lsGet(), loading: false });
		}
	},
	add: async (payload) => {
		const now = new Date().toISOString();
		const row: Escalation = {
			id: nanoid(),
			status: payload.status ?? EscalationStatus.Active,
			createdAt: now,
			updatedAt: now,
			...payload,
		} as Escalation;
		try {
			// Ensure database is ready
			await escalationDB.open();
			await escalationDB.escalations.add(row);
			// Add creation history
			await get().addHistory(row.id, "escalation", "", "created", "created");
			set({ rows: [...get().rows, row] });

			// Dispatch custom event for real-time updates
			window.dispatchEvent(
				new CustomEvent("escalationDataChanged", {
					detail: { action: "add", data: row },
				}),
			);

			return row.id; // Return the escalation ID
		} catch (error) {
			logger.warn(
				"Failed to add to IndexedDB, using localStorage fallback:",
				error,
			);
			const rows = [...get().rows, row];
			set({ rows });
			lsSet(rows);

			// Dispatch custom event for real-time updates
			window.dispatchEvent(
				new CustomEvent("escalationDataChanged", {
					detail: { action: "add", data: row },
				}),
			);

			return row.id; // Return the escalation ID
		}
	},
	update: async (id, patch, skipHistory = false) => {
		const currentRow = get().rows.find((r) => r.id === id);
		if (!currentRow) return;

		const now = new Date().toISOString();
		const rows = get().rows.map((r) =>
			r.id === id ? { ...r, ...patch, updatedAt: now } : r,
		);

		try {
			await escalationDB.escalations.update(id, { ...patch, updatedAt: now });

			// Track changes in history only if not skipped
			if (!skipHistory) {
				for (const [field, newValue] of Object.entries(patch)) {
					if (
						field !== "updatedAt" &&
						currentRow[field as keyof Escalation] !== newValue
					) {
						await get().addHistory(
							id,
							field,
							String(currentRow[field as keyof Escalation] || ""),
							String(newValue),
							"updated",
						);
					}
				}
			}

			set({ rows });

			// Dispatch custom event for real-time updates
			window.dispatchEvent(
				new CustomEvent("escalationDataChanged", {
					detail: { action: "update", data: { id, ...patch } },
				}),
			);
		} catch {
			set({ rows });
			lsSet(rows);

			// Dispatch custom event for real-time updates
			window.dispatchEvent(
				new CustomEvent("escalationDataChanged", {
					detail: { action: "update", data: { id, ...patch } },
				}),
			);
		}
	},
	close: async (id) => {
		const currentRow = get().rows.find((r) => r.id === id);
		if (!currentRow) return;

		const now = new Date().toISOString();
		const rows: Escalation[] = get().rows.map((r) =>
			r.id === id ? { ...r, status: EscalationStatus.Closed, updatedAt: now } : r,
		);

		try {
			await escalationDB.escalations.update(id, {
				status: EscalationStatus.Closed,
				updatedAt: now,
			});
			// Add close history
			await get().addHistory(id, "status", EscalationStatus.Active, EscalationStatus.Closed, "closed");
			set({ rows });

			// Dispatch custom event for real-time updates
			window.dispatchEvent(
				new CustomEvent("escalationDataChanged", {
					detail: { action: "close", data: { id } },
				}),
			);
		} catch {
			set({ rows });
			lsSet(rows);

			// Dispatch custom event for real-time updates
			window.dispatchEvent(
				new CustomEvent("escalationDataChanged", {
					detail: { action: "close", data: { id } },
				}),
			);
		}
	},
	delete: async (id) => {
		const currentRow = get().rows.find((r) => r.id === id);
		if (!currentRow) return;

		// Only allow deletion of closed escalations
		if (currentRow.status !== "closed") {
			throw new Error("Only closed escalations can be deleted");
		}

		const rows = get().rows.filter((r) => r.id !== id);

		try {
			await escalationDB.escalations.delete(id);
			// Also delete related history
			await escalationDB.escalationHistory
				.where("escalationId")
				.equals(id)
				.delete();
			set({ rows });

			// Dispatch custom event for real-time updates
			window.dispatchEvent(
				new CustomEvent("escalationDataChanged", {
					detail: { action: "delete", data: { id } },
				}),
			);
		} catch {
			set({ rows });
			lsSet(rows);

			// Dispatch custom event for real-time updates
			window.dispatchEvent(
				new CustomEvent("escalationDataChanged", {
					detail: { action: "delete", data: { id } },
				}),
			);
		}
	},
	getHistory: async (escalationId) => {
		try {
			logger.info("Getting history for escalation:", escalationId);
			const history = await escalationDB.escalationHistory
				.where("escalationId")
				.equals(escalationId)
				.toArray();

			// Sort by updatedAt in descending order (newest first)
			const sortedHistory = history.sort(
				(a, b) =>
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
			);

			logger.info("Retrieved history:", sortedHistory);
			return sortedHistory;
		} catch (error) {
			logger.error("Error getting history:", error);
			return [];
		}
	},
	addHistory: async (escalationId, field, oldValue, newValue, action) => {
		const now = new Date().toISOString();
		const user = JSON.parse(
			localStorage.getItem("user") || '{"username":"System"}',
		);

		const historyEntry: EscalationHistory = {
			id: nanoid(),
			escalationId,
			field,
			oldValue,
			newValue,
			updatedBy: user.username || "System",
			updatedAt: now,
			action,
		};

		logger.info("Adding history entry:", historyEntry);

		try {
			await escalationDB.escalationHistory.add(historyEntry);
			logger.info("History entry added successfully");
		} catch (error) {
			logger.error("Failed to add history:", error);
		}
	},
}));
