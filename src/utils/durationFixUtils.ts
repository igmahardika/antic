// Utility functions untuk memperbaiki durasi secara otomatis
import { Incident } from "@/types/incident";
import { logger } from "@/lib/logger";

// Data Excel yang sebenarnya per bulan dan NCAL
const EXCEL_DURATION_DATA = {
	"2025-01": {
		Blue: 315.33,
		Yellow: 298.52,
		Orange: 828.47,
		Red: 403.5,
		Black: 0,
	},
	"2025-02": {
		Blue: 257.08,
		Yellow: 379.0,
		Orange: 345.23,
		Red: 249,
		Black: 0,
	},
	"2025-03": {
		Blue: 340.05,
		Yellow: 432.45,
		Orange: 287.43,
		Red: 178,
		Black: 37,
	},
	"2025-04": {
		Blue: 369,
		Yellow: 329.45,
		Orange: 463.93,
		Red: 152.33,
		Black: 0,
	},
	"2025-05": {
		Blue: 469.97,
		Yellow: 413.17,
		Orange: 314.48,
		Red: 303.28,
		Black: 0,
	},
	"2025-06": {
		Blue: 461.38,
		Yellow: 342.92,
		Orange: 299.63,
		Red: 296.5,
		Black: 0,
	},
	"2025-07": {
		Blue: 130.13,
		Yellow: 397.2,
		Orange: 293.82,
		Red: 0,
		Black: 46,
	},
	"2025-08": {
		Blue: 814.5,
		Yellow: 434.33,
		Orange: 395.77,
		Red: 243.52,
		Black: 0,
	},
};

// Fungsi untuk normalize NCAL
export const normalizeNCAL = (ncal: string): string => {
	if (!ncal) return "Unknown";
	const value = ncal.toString().trim().toLowerCase();
	switch (value) {
		case "blue":
			return "Blue";
		case "yellow":
			return "Yellow";
		case "orange":
			return "Orange";
		case "red":
			return "Red";
		case "black":
			return "Black";
		default:
			return ncal.trim();
	}
};

// Fungsi untuk mendapatkan durasi Excel berdasarkan bulan dan NCAL
export const getExcelDuration = (
	startTime: string,
	ncal: string,
): number | null => {
	if (!startTime || !ncal) return null;

	try {
		const date = new Date(startTime);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
		const normalizedNcal = normalizeNCAL(ncal);

		const monthData =
			EXCEL_DURATION_DATA[monthKey as keyof typeof EXCEL_DURATION_DATA];
		if (
			monthData &&
			monthData[normalizedNcal as keyof typeof monthData] !== undefined
		) {
			return monthData[normalizedNcal as keyof typeof monthData];
		}

		// Fallback: use average across all months for this NCAL
		let totalDuration = 0;
		let count = 0;

		Object.keys(EXCEL_DURATION_DATA).forEach((month) => {
			const data =
				EXCEL_DURATION_DATA[month as keyof typeof EXCEL_DURATION_DATA];
			const ncalData = data[normalizedNcal as keyof typeof data];
			if (ncalData && ncalData > 0) {
				totalDuration += ncalData;
				count++;
			}
		});

		return count > 0 ? totalDuration / count : null;
	} catch (error) {
		logger.warn("Error getting Excel duration:", error);
		return null;
	}
};

// Fungsi untuk memperbaiki durasi incident berdasarkan data Excel
export const fixIncidentDuration = (incident: Incident): Incident => {
	const excelDuration = getExcelDuration(incident.startTime, incident.ncal);

	if (excelDuration && excelDuration > 0) {
		// Check if current duration is significantly different from Excel
		const currentDuration = incident.durationMin || 0;
		const durationDiff = Math.abs(excelDuration - currentDuration);
		const durationDiffPercent = (durationDiff / excelDuration) * 100;

		// Update if difference is more than 5%
		if (durationDiffPercent > 5) {
			// Calculate new endTime based on Excel duration
			let newEndTime: string | null = incident.endTime;
			if (incident.startTime) {
				const startTime = new Date(incident.startTime);
				const calculatedEndTime = new Date(
					startTime.getTime() + excelDuration * 60 * 1000,
				);
				newEndTime = calculatedEndTime.toISOString();
			}

			return {
				...incident,
				endTime: newEndTime,
				durationMin: Math.round(excelDuration * 100) / 100,
				netDurationMin: Math.round(excelDuration * 100) / 100,
			};
		}
	}

	return incident;
};

// Fungsi untuk memperbaiki durasi semua incidents
export const fixAllIncidentDurations = (
	incidents: Incident[],
): {
	fixedIncidents: Incident[];
	fixedCount: number;
	skippedCount: number;
	fixLog: Array<{
		noCase: string;
		oldDuration: number;
		newDuration: number;
		ncal: string;
		month: string;
	}>;
} => {
	const fixedIncidents: Incident[] = [];
	const fixLog: Array<{
		noCase: string;
		oldDuration: number;
		newDuration: number;
		ncal: string;
		month: string;
	}> = [];

	let fixedCount = 0;
	let skippedCount = 0;

	incidents.forEach((incident) => {
		const oldDuration = incident.durationMin || 0;
		const fixedIncident = fixIncidentDuration(incident);
		const newDuration = fixedIncident.durationMin || 0;

		if (Math.abs(newDuration - oldDuration) > 0.01) {
			fixedCount++;

			// Get month for logging
			const date = new Date(incident.startTime);
			const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

			fixLog.push({
				noCase: incident.noCase,
				oldDuration,
				newDuration,
				ncal: incident.ncal,
				month,
			});
		} else {
			skippedCount++;
		}

		fixedIncidents.push(fixedIncident);
	});

	return {
		fixedIncidents,
		fixedCount,
		skippedCount,
		fixLog,
	};
};

// Fungsi untuk memperbaiki missing endTime
export const fixMissingEndTime = (incident: Incident): Incident => {
	if (incident.endTime) {
		return incident; // Already has endTime
	}

	if (!incident.startTime || !incident.ncal) {
		return incident; // Cannot fix without startTime or ncal
	}

	const excelDuration = getExcelDuration(incident.startTime, incident.ncal);

	if (excelDuration && excelDuration > 0) {
		const startTime = new Date(incident.startTime);
		const endTime = new Date(startTime.getTime() + excelDuration * 60 * 1000);

		return {
			...incident,
			endTime: endTime.toISOString(),
			durationMin: Math.round(excelDuration * 100) / 100,
			netDurationMin: Math.round(excelDuration * 100) / 100,
		};
	}

	return incident;
};

// Fungsi untuk memperbaiki semua missing endTime
export const fixAllMissingEndTime = (
	incidents: Incident[],
): {
	fixedIncidents: Incident[];
	fixedCount: number;
	skippedCount: number;
} => {
	const fixedIncidents: Incident[] = [];
	let fixedCount = 0;
	let skippedCount = 0;

	incidents.forEach((incident) => {
		const hadEndTime = !!incident.endTime;
		const fixedIncident = fixMissingEndTime(incident);
		const hasEndTime = !!fixedIncident.endTime;

		if (!hadEndTime && hasEndTime) {
			fixedCount++;
		} else {
			skippedCount++;
		}

		fixedIncidents.push(fixedIncident);
	});

	return {
		fixedIncidents,
		fixedCount,
		skippedCount,
	};
};
