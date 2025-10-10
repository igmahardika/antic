import type { CustomerOption } from "@/types/escalation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// Get the last 2 months in YYYY-MM format
function getLastTwoMonths(): string[] {
	const now = new Date();
	const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format

	const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonthStr = lastMonth.toISOString().slice(0, 7);

	return [lastMonthStr, currentMonth];
}

// Fetch customers from IndexedDB (optimized to only load last 2 months)
export async function fetchCustomers(): Promise<CustomerOption[]> {
	try {
		logger.info("🔍 fetchCustomers: Starting to fetch customers...");

		// Get all customers from IndexedDB first
		const allCustomers = await db.customers.toArray();
		logger.info(
			`🔍 fetchCustomers: Found ${allCustomers.length} total customers in IndexedDB`,
		);

		if (allCustomers.length === 0) {
			logger.info(
				"⚠️ fetchCustomers: No customers found in IndexedDB, using fallback data",
			);
			// Return more comprehensive fallback data
			return [
				{ id: "CUST-001", name: "PT Nusantara Net" },
				{ id: "CUST-002", name: "CV Sinar Jaya" },
				{ id: "CUST-003", name: "Universitas Semarang" },
				{ id: "CUST-004", name: "PT Telkom Indonesia" },
				{ id: "CUST-005", name: "Bank Mandiri" },
				{ id: "CUST-006", name: "PT Indosat" },
				{ id: "CUST-007", name: "Universitas Gadjah Mada" },
				{ id: "CUST-008", name: "PT XL Axiata" },
				{ id: "CUST-009", name: "Bank BCA" },
				{ id: "CUST-010", name: "PT Smartfren" },
			];
		}

		// Get last 2 months
		const lastTwoMonths = getLastTwoMonths();
		logger.info(
			`🔍 fetchCustomers: Filtering for months: ${lastTwoMonths.join(", ")}`,
		);

		// Filter customers from last 2 months only
		const recentCustomers = allCustomers.filter((customer) => {
			const month = (customer.id || "").split("-")[0];
			return lastTwoMonths.includes(month);
		});

		logger.info(
			`🔍 fetchCustomers: Found ${recentCustomers.length} customers from last 2 months`,
		);

		// If no recent customers, return all customers instead
		if (recentCustomers.length === 0) {
			logger.info(
				"⚠️ fetchCustomers: No recent customers found, returning all customers",
			);
			const uniqueCustomers = new Map<string, CustomerOption>();
			allCustomers.forEach((customer) => {
				if (!uniqueCustomers.has(customer.nama)) {
					uniqueCustomers.set(customer.nama, {
						id: customer.id,
						name: customer.nama,
					});
				}
			});

			const result = Array.from(uniqueCustomers.values()).sort((a, b) =>
				a.name.localeCompare(b.name),
			);

			logger.info(
				`✅ fetchCustomers: Returning ${result.length} unique customers (all data)`,
			);
			return result;
		}

		// Get unique customers by name (in case same customer appears in multiple months)
		const uniqueCustomers = new Map<string, CustomerOption>();
		recentCustomers.forEach((customer) => {
			if (!uniqueCustomers.has(customer.nama)) {
				uniqueCustomers.set(customer.nama, {
					id: customer.id,
					name: customer.nama,
				});
			}
		});

		// Convert Map to Array and sort by name
		const result = Array.from(uniqueCustomers.values()).sort((a, b) =>
			a.name.localeCompare(b.name),
		);

		logger.info(
			`✅ fetchCustomers: Returning ${result.length} unique customers from last 2 months`,
		);
		return result;
	} catch (error) {
		logger.error("❌ fetchCustomers: Error fetching customers:", error);
		// Fallback to dummy data if IndexedDB fails
		return [
			{ id: "CUST-001", name: "PT Nusantara Net" },
			{ id: "CUST-002", name: "CV Sinar Jaya" },
			{ id: "CUST-003", name: "Universitas Semarang" },
			{ id: "CUST-004", name: "PT Telkom Indonesia" },
			{ id: "CUST-005", name: "Bank Mandiri" },
		];
	}
}
