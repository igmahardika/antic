import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as ExcelJS from "exceljs";
import { Incident } from "@/types/incident";
import {
	mkId,
	generateBatchId,
	saveIncidentsChunked,
	parseDateSafe,
} from "@/utils/incidentUtils";
import { fixAllMissingEndTime } from "@/utils/durationFixUtils";
import { db } from "@/lib/db";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import TableChartIcon from "@mui/icons-material/TableChart";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import DeleteByFileDialog from "./DeleteByFileDialog";
import { createUploadSession, finalizeUploadSession } from '../services/uploadSessions';

/**
 * ——————— WHY THIS FIX ———————
 * 1) Excel date cells sering terbaca sebagai angka (serial Excel). Kita set cellDates:true dan sediakan coerceDate()
 * 2) Pencarian kolom sebelumnya memakai `includes` → mudah salah tangkap (mis. "duration" vs "duration vendor").
 *    Sekarang kita normalisasi header dan cocokkan secara EQUALS berdasarkan sinonim.
 * 3) Otomatis deteksi baris header (kalau file punya judul/row kosong di atas).
 * 4) Perhitungan durasi vendor hanya mengurangi JEDA yang overlap dengan window vendor (adil).
 */

// ——————— Konstanta: Header yang dibutuhkan (kanonikal) ———————
const CANON = {
	priority: "priority",
	site: "site",
	noCase: "no case",
	ncal: "ncal",
	status: "status",
	level: "level",
	ts: "ts",
	odpBts: "odp bts",
	start: "start",
	startEscalationVendor: "start escalation vendor",
	end: "end",
	duration: "duration",
	durationVendor: "duration vendor",
	problem: "problem",
	penyebab: "penyebab",
	actionTerakhir: "action terakhir",
	note: "note",
	klasifikasiGangguan: "klasifikasi gangguan",
	powerBefore: "power before",
	powerAfter: "power after",
	pause1: "start pause",
	resume1: "end pause",
	pause2: "start pause 2",
	resume2: "end pause 2",
	totalDurationPause: "total duration pause",
	totalDurationVendor: "total duration vendor",
} as const;

// ——————— Sinonim (sudah dinormalisasi) ———————
const HEADER_SYNONYMS: Record<string, string[]> = {
	[CANON.priority]: ["priority", "prio", "prioritas", "level priority"],
	[CANON.site]: ["site", "lokasi", "lokasi site", "nama site", "site name"],
	[CANON.noCase]: [
		"no case",
		"nocase",
		"case",
		"no kasus",
		"kasus",
		"case number",
		"nomor case",
		"no case number",
	],
	[CANON.ncal]: ["ncal", "ncals", "ncal level"],
	[CANON.status]: ["status", "status gangguan", "status case"],
	[CANON.level]: ["level", "level gangguan", "level case"],
	[CANON.ts]: [
		"ts",
		"technical support",
		"vendor",
		"technical support vendor",
		"vendor ts",
	],
	[CANON.odpBts]: [
		"odp bts",
		"odp",
		"bts",
		"odp/bts",
		"odp bts name",
		"nama odp bts",
	],
	[CANON.start]: [
		"start",
		"mulai",
		"start time",
		"waktu mulai",
		"start gangguan",
	],
	[CANON.startEscalationVendor]: [
		"start escalation vendor",
		"mulai eskalasi vendor",
		"mulai vendor",
		"vendor start",
		"start escalation",
		"escalation start",
		"mulai eskalasi",
		"start vendor",
		"vendor start time",
	],
	[CANON.end]: ["end", "selesai", "end time", "waktu selesai", "end gangguan"],
	[CANON.duration]: ["duration", "durasi", "total duration", "durasi total"],
	[CANON.durationVendor]: [
		"duration vendor",
		"durasi vendor",
		"vendor duration",
		"durasi vendor total",
	],
	[CANON.problem]: [
		"problem",
		"masalah",
		"problem description",
		"deskripsi masalah",
	],
	[CANON.penyebab]: ["penyebab", "cause", "root cause", "penyebab gangguan"],
	[CANON.actionTerakhir]: [
		"action terakhir",
		"last action",
		"aksi terakhir",
		"action",
		"action taken",
		"tindakan terakhir",
	],
	[CANON.note]: ["note", "catatan", "notes", "keterangan"],
	[CANON.klasifikasiGangguan]: [
		"klasifikasi gangguan",
		"klasifikasi",
		"classification",
		"jenis gangguan",
	],
	[CANON.powerBefore]: [
		"power before",
		"powerbefore",
		"daya sebelum",
		"power before repair",
		"daya sebelum perbaikan",
	],
	[CANON.powerAfter]: [
		"power after",
		"powerafter",
		"daya sesudah",
		"power after repair",
		"daya sesudah perbaikan",
	],
	[CANON.pause1]: [
		"start pause",
		"pause",
		"jeda",
		"jeda 1",
		"pause start",
		"mulai jeda",
		"start pause 1",
	],
	[CANON.resume1]: [
		"end pause",
		"restart",
		"lanjut",
		"lanjut 1",
		"pause end",
		"selesai jeda",
		"end pause 1",
		"resume",
	],
	[CANON.pause2]: [
		"start pause 2",
		"pause 2",
		"pause2",
		"jeda 2",
		"pause start 2",
		"mulai jeda 2",
	],
	[CANON.resume2]: [
		"end pause 2",
		"restart 2",
		"restart2",
		"lanjut 2",
		"pause end 2",
		"selesai jeda 2",
		"end pause 2",
		"resume 2",
	],
	[CANON.totalDurationPause]: [
		"total duration pause",
		"total pause",
		"durasi jeda total",
		"total pause duration",
	],
	[CANON.totalDurationVendor]: [
		"total duration vendor",
		"durasi vendor total",
		"vendor total duration",
	],
};

// ——————— Util: normalisasi string header ———————
function normalizeHeader(s: any): string {
	if (s == null) return "";
	return String(s)
		.replace(/\ufeff/g, "")
		.trim()
		.toLowerCase()
		.replace(/[\/_-]+/g, " ")
		.replace(/\s+/g, " ");
}

// ——————— Util: temukan baris header terbaik ———————
function findHeaderRow(rows: any[][], maxScan = 10): number {
	const want = Object.values(CANON);
	let bestIdx = 0;
	let bestScore = -1;
	const limit = Math.min(maxScan, rows.length);
	for (let i = 0; i < limit; i++) {
		const row = rows[i] || [];
		const cells = row.map(normalizeHeader);
		let score = 0;
		for (const need of want) {
			const aliases = HEADER_SYNONYMS[need] || [need];
			const hit = cells.some((c) => aliases.includes(c));
			if (hit) score++;
		}
		if (score > bestScore) {
			bestScore = score;
			bestIdx = i;
		}
	}
	return bestIdx;
}

// ——————— Util: buat index kolom dari header ———————
function buildHeaderIndex(headersRaw: any[]): Map<string, number> {
	const headers = headersRaw.map(normalizeHeader);
	const map = new Map<string, number>();
	// isi langsung (exact normalized string)
	headers.forEach((h, i) => {
		if (!map.has(h)) map.set(h, i);
	});
	// kemudian isi alias → kanonikal
	for (const canon of Object.values(CANON)) {
		const aliases = HEADER_SYNONYMS[canon] || [canon];
		for (const a of aliases) {
			if (map.has(a)) {
				map.set(canon, map.get(a)!);
				break;
			}
		}
	}
	return map;
}

// ——————— Util: ambil sel berdasarkan kanonikal ———————
function pick(row: any[], idx: Map<string, number>, canon: string) {
	const i = idx.get(canon);
	if (typeof i !== "number") return null;

	const value = row[i];

	// Handle berbagai tipe data Excel
	if (value === null || value === undefined) return null;
	if (value === "") return null;

	// Handle Excel boolean values
	if (typeof value === "boolean") return value ? "Yes" : "No";

	// Handle Excel numbers (termasuk serial dates)
	if (typeof value === "number") {
		// Jika ini adalah Excel serial date (biasanya > 1000), return as is untuk parsing nanti
		if (value > 1000 && value < 100000) return value;
		return value;
	}

	// Handle Excel dates
	if (value instanceof Date) return value;

	// Handle strings
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed === "" ? null : trimmed;
	}

	// Handle other types by converting to string
	return String(value).trim() || null;
}

// ——————— Util: konversi Excel value → ISO string ———————
function excelSerialToDate(n: number): Date {
	// Excel epoch (Windows): 1899-12-30
	const ms = (n - 25569) * 86400 * 1000;
	return new Date(ms);
}

// Menggunakan parseDateSafe yang lebih robust untuk parsing tanggal
function coerceDate(v: any): string | null {
	if (v == null || v === "") return null;
	if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
	if (typeof v === "number" && isFinite(v)) {
		const d = excelSerialToDate(v);
		return isNaN(d.getTime()) ? null : d.toISOString();
	}
	// Gunakan parseDateSafe yang lebih robust untuk string dates
	if (typeof v === "string") {
		return parseDateSafe(v);
	}
	return null;
}

// ——————— Util: menit antar dua waktu ISO ———————
function diffMinutes(aIso: string | null, bIso: string | null): number {
	if (!aIso || !bIso) return 0;
	const a = new Date(aIso).getTime();
	const b = new Date(bIso).getTime();
	if (!isFinite(a) || !isFinite(b)) return 0;
	const d = (b - a) / 60000;
	return d > 0 ? Math.round(d * 100) / 100 : 0;
}

// ——————— Util: overlap menit dua interval (a ∩ b) ———————
function overlapMinutes(
	aStart: string | null,
	aEnd: string | null,
	bStart: string | null,
	bEnd: string | null,
): number {
	if (!aStart || !aEnd || !bStart || !bEnd) return 0;
	const s = Math.max(new Date(aStart).getTime(), new Date(bStart).getTime());
	const e = Math.min(new Date(aEnd).getTime(), new Date(bEnd).getTime());
	const d = (e - s) / 60000;
	return d > 0 ? Math.round(d * 100) / 100 : 0;
}

// ——————— Data structures ———————
interface UploadResult {
	success: number;
	failed: number;
	errors: string[];
	preview: Incident[];
	uploadLog: UploadLogEntry[];
	totalRowsProcessed: number;
	totalRowsInFile: number;
	skippedRows: number;
}

interface UploadLogEntry {
	type: "success" | "error" | "skipped" | "info" | "warning";
	row: number;
	sheet: string;
	message: string;
	noCase?: string;
	details?: any;
}

export const IncidentUpload: React.FC = () => {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
	const [progress, setProgress] = useState(0);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteResult, setDeleteResult] = useState<{
		found: number;
		deleted: number;
		errors: string[];
		preview: Incident[];
	} | null>(null);
	const [parsedIncidents, setParsedIncidents] = useState<Incident[]>([]);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const onDrop = useCallback(async (acceptedFiles: File[]) => {
		if (acceptedFiles.length === 0) return;
		setIsUploading(true);
		setProgress(0);
		setUploadResult(null);
		
		let session: any = null;

		try {
			const file = acceptedFiles[0];
			
			// Create upload session for tracking
			session = await createUploadSession(file, 'incidents');
			
			// Read workbook using ExcelJS
			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.load(await file.arrayBuffer());

			const allRows: Incident[] = [];
			const errors: string[] = [];
			const uploadLog: UploadLogEntry[] = [];
			let successCount = 0;
			let failedCount = 0;
			let totalRowsInFile = 0;
			let totalRowsProcessed = 0;
			let skippedRows = 0;

			const sheetNames = workbook.worksheets.map(ws => ws.name);
			
			uploadLog.push({
				type: "info",
				row: 0,
				sheet: "SYSTEM",
				message: `Upload started for file: ${file.name}`,
				details: {
					fileSize: file.size,
					fileType: file.type,
					sheets: sheetNames,
				},
			});

			for (const worksheet of workbook.worksheets) {
				const sheetName = worksheet.name;
				
				// Convert worksheet to array of arrays
				const rows: any[][] = [];
				worksheet.eachRow((row, _rowNumber) => {
					const rowValues: any[] = [];
					row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
						// Get cell value, handle dates properly
						let value = cell.value;
						if (value instanceof Date) {
							// Keep as Date object
							rowValues[colNumber - 1] = value;
						} else if (cell.type === ExcelJS.ValueType.Date) {
							// Convert Excel date number to Date
							rowValues[colNumber - 1] = new Date(cell.value as number);
						} else {
							rowValues[colNumber - 1] = value ?? null;
						}
					});
					rows.push(rowValues);
				});
				if (!rows || rows.length === 0) {
					uploadLog.push({
						type: "info",
						row: 0,
						sheet: sheetName,
						message: `Sheet "${sheetName}" empty`,
					});
					continue;
				}

				const headerIdx = findHeaderRow(rows);
				const headersRaw = (rows[headerIdx] || []) as any[];
				const idx = buildHeaderIndex(headersRaw);
				const data = rows.slice(headerIdx + 1);

				const sheetRowCount = data.length;
				totalRowsInFile += sheetRowCount;

				uploadLog.push({
					type: "info",
					row: 0,
					sheet: sheetName,
					message: `Processing sheet "${sheetName}" with ${sheetRowCount} data rows`,
					details: { headers: headersRaw },
				});

				// Log detail header mapping untuk debugging
				const headerMapping = Object.fromEntries(idx);
				const mappedFields = Object.keys(CANON).map((field) => ({
					field,
					canonical: CANON[field as keyof typeof CANON],
					synonyms: HEADER_SYNONYMS[CANON[field as keyof typeof CANON]] || [],
					mappedIndex: idx.get(CANON[field as keyof typeof CANON]),
					mappedValue:
						idx.get(CANON[field as keyof typeof CANON]) !== undefined
							? headersRaw[idx.get(CANON[field as keyof typeof CANON])!]
							: null,
				}));

				uploadLog.push({
					type: "info",
					row: 0,
					sheet: sheetName,
					message: `Header mapping completed for ${Object.keys(headerMapping).length} fields`,
					details: {
						headerMapping,
						rawHeaders: headersRaw,
						mappedFields,
						totalFields: Object.keys(CANON).length,
						mappedCount: Object.keys(headerMapping).length,
						unmappedFields: Object.keys(CANON).filter(
							(field) => !idx.has(CANON[field as keyof typeof CANON]),
						),
					},
				});

				// Log warning untuk field yang tidak ter-mapping
				const unmappedFields = Object.keys(CANON).filter(
					(field) => !idx.has(CANON[field as keyof typeof CANON]),
				);
				if (unmappedFields.length > 0) {
					uploadLog.push({
						type: "warning",
						row: 0,
						sheet: sheetName,
						message: `⚠️ ${unmappedFields.length} fields tidak ter-mapping: ${unmappedFields.join(", ")}`,
						details: {
							unmappedFields,
							availableHeaders: headersRaw,
							suggestions: unmappedFields.map((field) => ({
								field,
								canonical: CANON[field as keyof typeof CANON],
								synonyms:
									HEADER_SYNONYMS[CANON[field as keyof typeof CANON]] || [],
							})),
						},
					});
				}

				for (let r = 0; r < data.length; r++) {
					const rowNum = headerIdx + 1 + r + 1; // 1-based untuk user
					const row = data[r] || [];
					totalRowsProcessed++;

					// Log detail row untuk debugging
					const rowData = {
						noCase: pick(row, idx, CANON.noCase),
						start: pick(row, idx, CANON.start),
						end: pick(row, idx, CANON.end),
						priority: pick(row, idx, CANON.priority),
						site: pick(row, idx, CANON.site),
						ncal: pick(row, idx, CANON.ncal),
						status: pick(row, idx, CANON.status),
						level: pick(row, idx, CANON.level),
						ts: pick(row, idx, CANON.ts),
						odpBts: pick(row, idx, CANON.odpBts),
						problem: pick(row, idx, CANON.problem),
						penyebab: pick(row, idx, CANON.penyebab),
						actionTerakhir: pick(row, idx, CANON.actionTerakhir),
						note: pick(row, idx, CANON.note),
						klasifikasiGangguan: pick(row, idx, CANON.klasifikasiGangguan),
						powerBefore: pick(row, idx, CANON.powerBefore),
						powerAfter: pick(row, idx, CANON.powerAfter),
						startPause: pick(row, idx, CANON.pause1),
						endPause: pick(row, idx, CANON.resume1),
						startPause2: pick(row, idx, CANON.pause2),
						endPause2: pick(row, idx, CANON.resume2),
						startEscalationVendor: pick(row, idx, CANON.startEscalationVendor),
						duration: pick(row, idx, CANON.duration),
						durationVendor: pick(row, idx, CANON.durationVendor),
						totalDurationPause: pick(row, idx, CANON.totalDurationPause),
						totalDurationVendor: pick(row, idx, CANON.totalDurationVendor),
					};

					// Log detail row untuk debugging
					uploadLog.push({
						type: "info",
						row: rowNum,
						sheet: sheetName,
						message: `Row data: ${JSON.stringify(rowData, null, 2)}`,
						details: { rowData },
					});

					// Cek apakah row benar-benar kosong (semua field null/undefined/empty string)
					const hasData = Object.values(rowData).some((c: any) => {
						if (c === null || c === undefined) return false;
						if (c === "") return false;
						if (typeof c === "string" && c.trim() === "") return false;
						if (typeof c === "number" && isNaN(c)) return false;
						return true;
					});

					if (!hasData) {
						skippedRows++;
						uploadLog.push({
							type: "skipped",
							row: rowNum,
							sheet: sheetName,
							message:
								"Row benar-benar kosong - semua field null/undefined/empty",
							details: { rowData },
						});
						continue;
					}

					// Log data yang ditemukan untuk debugging
					const foundData = Object.entries(rowData).filter(([, value]) => {
						if (value === null || value === undefined) return false;
						if (value === "") return false;
						if (typeof value === "string" && value.trim() === "") return false;
						if (typeof value === "number" && isNaN(value)) return false;
						return true;
					});

					uploadLog.push({
						type: "info",
						row: rowNum,
						sheet: sheetName,
						message: `Found ${foundData.length} fields with data: ${foundData.map(([key, value]) => `${key}=${value}`).join(", ")}`,
						details: { foundData, rowData },
					});

					try {
						const noCaseRaw = rowData.noCase;
						const startRaw = rowData.start;

						// Validasi No Case - harus ada dan tidak kosong
						let finalNoCase = String(noCaseRaw || "").trim();
						if (!finalNoCase) {
							// Coba cari No Case dari field lain jika tidak ada
							const alternativeNoCase = String(
								rowData.site || rowData.odpBts || `ROW_${rowNum}`,
							);
							uploadLog.push({
								type: "warning",
								row: rowNum,
								sheet: sheetName,
								message: `No Case kosong, menggunakan alternatif: ${alternativeNoCase}`,
								details: {
									noCaseRaw,
									noCaseStr: finalNoCase,
									noCaseType: typeof noCaseRaw,
									alternativeNoCase,
									rowData,
								},
							});
							// Gunakan alternatif sebagai No Case
							finalNoCase = alternativeNoCase;
						}

						// Validasi Start Time - harus ada dan bisa di-parse
						let finalStartRaw = startRaw;
						if (
							startRaw === null ||
							startRaw === undefined ||
							startRaw === ""
						) {
							// Coba cari Start Time dari field lain
							const alternativeStart =
								rowData.end || rowData.startEscalationVendor;
							if (alternativeStart) {
								uploadLog.push({
									type: "warning",
									row: rowNum,
									sheet: sheetName,
									message: `Start Time tidak ada, menggunakan alternatif: ${alternativeStart}`,
									details: {
										startRaw,
										startRawType: typeof startRaw,
										startRawValue: startRaw,
										alternativeStart,
										rowData,
									},
								});
								// Gunakan alternatif sebagai Start Time
								finalStartRaw = alternativeStart;
							} else {
								skippedRows++;
								uploadLog.push({
									type: "skipped",
									row: rowNum,
									sheet: sheetName,
									message: "Start Time tidak ada dan tidak ada alternatif",
									details: {
										startRaw,
										startRawType: typeof startRaw,
										startRawValue: startRaw,
										rowData,
									},
								});
								continue;
							}
						}

						const startIso = coerceDate(finalStartRaw);
						if (!startIso) {
							skippedRows++;
							uploadLog.push({
								type: "skipped",
								row: rowNum,
								sheet: sheetName,
								message: "Format Start Time tidak bisa di-parse",
								details: {
									startRaw: finalStartRaw,
									startRawType: typeof finalStartRaw,
									startRawValue: finalStartRaw,
									startRawLength: finalStartRaw
										? String(finalStartRaw).length
										: 0,
									startRawTrimmed: finalStartRaw
										? String(finalStartRaw).trim()
										: null,
									rowData,
								},
							});
							continue;
						}

						// Parse semua tanggal dengan logging detail
						const endIso = coerceDate(rowData.end);
						const sevIso = coerceDate(rowData.startEscalationVendor);
						const p1Start = coerceDate(rowData.startPause);
						const p1End = coerceDate(rowData.endPause);
						const p2Start = coerceDate(rowData.startPause2);
						const p2End = coerceDate(rowData.endPause2);

						// Log detail parsing untuk setiap field tanggal
						const dateFields = [
							{ name: "Start", raw: rowData.start, parsed: startIso },
							{ name: "End", raw: rowData.end, parsed: endIso },
							{
								name: "Escalation",
								raw: rowData.startEscalationVendor,
								parsed: sevIso,
							},
							{
								name: "Pause1 Start",
								raw: rowData.startPause,
								parsed: p1Start,
							},
							{ name: "Pause1 End", raw: rowData.endPause, parsed: p1End },
							{
								name: "Pause2 Start",
								raw: rowData.startPause2,
								parsed: p2Start,
							},
							{ name: "Pause2 End", raw: rowData.endPause2, parsed: p2End },
						];

						dateFields.forEach((field) => {
							if (field.raw && !field.parsed) {
								uploadLog.push({
									type: "warning",
									row: rowNum,
									sheet: sheetName,
									message: `⚠️ ${field.name} tidak bisa di-parse: "${field.raw}"`,
									details: {
										fieldName: field.name,
										rawValue: field.raw,
										rawType: typeof field.raw,
										rawLength: String(field.raw).length,
										rawTrimmed: String(field.raw).trim(),
									},
								});
							}
						});

						// Log detail parsing untuk debugging
						uploadLog.push({
							type: "info",
							row: rowNum,
							sheet: sheetName,
							message: `Parsing dates: Start=${startIso}, End=${endIso}, Escalation=${sevIso}, Pause1=${p1Start}-${p1End}, Pause2=${p2Start}-${p2End}`,
							details: {
								startIso,
								endIso,
								sevIso,
								p1Start,
								p1End,
								p2Start,
								p2End,
								originalValues: {
									start: rowData.start,
									end: rowData.end,
									escalation: rowData.startEscalationVendor,
									pause1: rowData.startPause,
									pause1End: rowData.endPause,
									pause2: rowData.startPause2,
									pause2End: rowData.endPause2,
								},
							},
						});

						const incident: Incident = {
							id: mkId(finalNoCase, startIso),
							noCase: finalNoCase,
							priority: rowData.priority,
							site: rowData.site,
							ncal: rowData.ncal,
							status: rowData.status,
							level: ((): any => {
								const v = rowData.level;
								const n = Number(v);
								return Number.isFinite(n) ? n : (v ?? null);
							})(),
							ts: rowData.ts,
							odpBts: rowData.odpBts,
							startTime: startIso,
							startEscalationVendor: sevIso,
							endTime: endIso,
							durationMin: 0,
							durationVendorMin: 0,
							problem: rowData.problem,
							penyebab: rowData.penyebab,
							actionTerakhir: rowData.actionTerakhir,
							note: rowData.note,
							klasifikasiGangguan: rowData.klasifikasiGangguan,
							powerBefore: ((): any => {
								const v = rowData.powerBefore;
								const n = Number(v);
								return Number.isFinite(n) ? n : (v ?? null);
							})(),
							powerAfter: ((): any => {
								const v = rowData.powerAfter;
								const n = Number(v);
								return Number.isFinite(n) ? n : (v ?? null);
							})(),
							startPause1: p1Start,
							endPause1: p1End,
							startPause2: p2Start,
							endPause2: p2End,
							totalDurationPauseMin: 0,
							totalDurationVendorMin: 0,
							batchId: generateBatchId(),
							importedAt: new Date().toISOString(),
						} as Incident;

						allRows.push(incident);
						successCount++;
						uploadLog.push({
							type: "success",
							row: rowNum,
							sheet: sheetName,
							message: `Parsed successfully: ${incident.noCase}`,
							details: {
								incident: {
									id: incident.id,
									noCase: incident.noCase,
									priority: incident.priority,
									site: incident.site,
									ncal: incident.ncal,
									status: incident.status,
									level: incident.level,
									ts: incident.ts,
									startTime: incident.startTime,
									endTime: incident.endTime,
									startEscalationVendor: incident.startEscalationVendor,
									startPause1: incident.startPause1,
									endPause1: incident.endPause1,
									startPause2: incident.startPause2,
									endPause2: incident.endPause2,
								},
								originalRowData: rowData,
							},
						});
					} catch (e: any) {
						failedCount++;
						const msg = `Row ${rowNum} in "${sheetName}": ${e?.message || e}`;
						errors.push(msg);
						uploadLog.push({
							type: "error",
							row: rowNum,
							sheet: sheetName,
							message: msg,
							details: {
								error: e?.message || e,
								errorStack: e?.stack,
								rowData: rowData,
								rowIndex: r,
								rowNumber: rowNum,
							},
						});
					}
				}

				const sheetIndex = workbook.worksheets.findIndex(ws => ws.name === sheetName);
				setProgress(
					((sheetIndex + 1) / workbook.worksheets.length) * 50,
				);
			}

			// ——————— Auto-fix EndTime lalu hitung durasi ———————
			if (allRows.length > 0) {
				setProgress(60);
				uploadLog.push({
					type: "info",
					row: 0,
					sheet: "DURATION_FIX",
					message: "Fixing endTime & durations...",
				});

				const { fixedIncidents: incidentsWithEnd, fixedCount } =
					fixAllMissingEndTime(allRows);
				if (fixedCount > 0) {
					uploadLog.push({
						type: "success",
						row: 0,
						sheet: "DURATION_FIX",
						message: `Fixed ${fixedCount} missing endTime`,
					});
				}

				const finalIncidents = incidentsWithEnd.map((inc) => {
					const updated = { ...inc };

					// Duration - dengan validasi yang lebih robust
					const durationMin = diffMinutes(inc.startTime, inc.endTime);
					updated.durationMin = durationMin > 0 ? durationMin : 0;

					// Vendor duration - dengan validasi yang lebih robust
					const vendorDurationMin = diffMinutes(
						inc.startEscalationVendor || null,
						inc.endTime,
					);
					updated.durationVendorMin =
						vendorDurationMin > 0 ? vendorDurationMin : 0;

					// Pause total - dengan validasi yang lebih robust
					const p1 = diffMinutes(
						inc.startPause1 || null,
						inc.endPause1 || null,
					);
					const p2 = diffMinutes(
						inc.startPause2 || null,
						inc.endPause2 || null,
					);
					const totalPause = p1 + p2;
					updated.totalDurationPauseMin =
						totalPause > 0 ? Math.round(totalPause * 100) / 100 : 0;

					// Hanya kurangi pause yang overlap dengan window vendor (adil)
					let overlapVendor = 0;
					if (inc.startEscalationVendor && inc.endTime) {
						const overlap1 = overlapMinutes(
							inc.startPause1 || null,
							inc.endPause1 || null,
							inc.startEscalationVendor,
							inc.endTime,
						);
						const overlap2 = overlapMinutes(
							inc.startPause2 || null,
							inc.endPause2 || null,
							inc.startEscalationVendor,
							inc.endTime,
						);
						overlapVendor = overlap1 + overlap2;
					}

					const vendorAfterPause = Math.max(
						updated.durationVendorMin - overlapVendor,
						0,
					);
					updated.totalDurationVendorMin =
						Math.round(vendorAfterPause * 100) / 100;

					// Log durasi untuk debugging
					uploadLog.push({
						type: "info",
						row: 0,
						sheet: "DURATION_CALC",
						message: `Duration calc for ${inc.noCase}: duration=${updated.durationMin}, vendor=${updated.durationVendorMin}, pause=${updated.totalDurationPauseMin}, vendorAfterPause=${updated.totalDurationVendorMin}`,
						details: {
							noCase: inc.noCase,
							startTime: inc.startTime,
							endTime: inc.endTime,
							startEscalationVendor: inc.startEscalationVendor,
							startPause1: inc.startPause1,
							endPause1: inc.endPause1,
							startPause2: inc.startPause2,
							endPause2: inc.endPause2,
							durationMin: updated.durationMin,
							durationVendorMin: updated.durationVendorMin,
							totalDurationPauseMin: updated.totalDurationPauseMin,
							totalDurationVendorMin: updated.totalDurationVendorMin,
							overlapVendor,
						},
					});

					return updated;
				});

				uploadLog.push({
					type: "info",
					row: 0,
					sheet: "DURATION_FIX",
					message: "Durations recalculated (with vendor-overlap rule)",
				});

				setProgress(80);
				uploadLog.push({
					type: "info",
					row: 0,
					sheet: "DATABASE",
					message: `Saving ${finalIncidents.length} incidents...`,
				});
				
				// Add upload session metadata to incidents
				const enrichedIncidents = finalIncidents.map(incident => ({
					...incident,
					uploadTimestamp: Date.now(),
					fileName: file.name,
					fileHash: session.fileHash,
					batchId: session.id,
					uploadSessionId: session.id
				}));
				
				await saveIncidentsChunked(enrichedIncidents);
				
				// Finalize upload session
				await finalizeUploadSession(session.id, {
					status: 'completed',
					recordCount: enrichedIncidents.length,
					successCount: enrichedIncidents.length
				});
				
				uploadLog.push({
					type: "success",
					row: 0,
					sheet: "DATABASE",
					message: `Saved ${enrichedIncidents.length} incidents with upload session tracking`,
				});

				setProgress(100);
			}

			uploadLog.push({
				type: "info",
				row: 0,
				sheet: "SUMMARY",
				message: `Upload completed. Summary: ${successCount} success, ${failedCount} failed, ${skippedRows} skipped out of ${totalRowsInFile}`,
				details: {
					successCount,
					failedCount,
					skippedRows,
					totalRowsInFile,
					totalRowsProcessed,
				},
			});

			setUploadResult({
				success: successCount,
				failed: failedCount,
				errors,
				preview: allRows.slice(0, 20),
				uploadLog,
				totalRowsProcessed,
				totalRowsInFile,
				skippedRows,
			});

			// Store parsed incidents for delete functionality
			setParsedIncidents(allRows);
		} catch (error: any) {
			const errorMsg = `Upload failed: ${error?.message || error}`;
			
			// Finalize upload session as failed
			try {
				if (session) {
					await finalizeUploadSession(session.id, {
						status: 'failed',
						errorCount: 1,
						errorLog: [errorMsg]
					});
				}
			} catch (sessionError) {
				console.error('Failed to finalize upload session:', sessionError);
			}
			
			setUploadResult({
				success: 0,
				failed: 1,
				errors: [errorMsg],
				preview: [],
				uploadLog: [
					{ type: "error", row: 0, sheet: "SYSTEM", message: errorMsg },
				],
				totalRowsProcessed: 0,
				totalRowsInFile: 0,
				skippedRows: 0,
			});
		} finally {
			setIsUploading(false);
		}
	}, []);

	// ——————— Delete Function ———————
	const handleDeleteByFile = useCallback(async () => {
		if (parsedIncidents.length === 0) {
			setDeleteResult({
				found: 0,
				deleted: 0,
				errors: ["No incidents parsed from file to delete"],
				preview: [],
			});
			return;
		}

		setIsDeleting(true);
		setProgress(0);
		setDeleteResult(null);

		try {
			const errors: string[] = [];
			let foundCount = 0;
			let deletedCount = 0;
			const foundIncidents: Incident[] = [];

			// Process in chunks to avoid memory issues
			const chunkSize = 100;
			const totalChunks = Math.ceil(parsedIncidents.length / chunkSize);

			for (let i = 0; i < parsedIncidents.length; i += chunkSize) {
				const chunk = parsedIncidents.slice(i, i + chunkSize);
				const chunkIndex = Math.floor(i / chunkSize) + 1;

				setProgress((chunkIndex / totalChunks) * 100);

				for (const parsedIncident of chunk) {
					try {
						// Find incidents that match the noCase and startTime from the file
						const matchingIncidents = await db.incidents
							.where("noCase")
							.equals(parsedIncident.noCase)
							.and(
								(incident) => incident.startTime === parsedIncident.startTime,
							)
							.toArray();

						if (matchingIncidents.length > 0) {
							foundCount += matchingIncidents.length;
							foundIncidents.push(...matchingIncidents);

							// Delete the matching incidents
							const idsToDelete = matchingIncidents.map((inc) => inc.id);
							await db.incidents.bulkDelete(idsToDelete);
							deletedCount += matchingIncidents.length;
						}
					} catch (error: any) {
						const errorMsg = `Error deleting incident ${parsedIncident.noCase}: ${error?.message || error}`;
						errors.push(errorMsg);
					}
				}
			}

			setDeleteResult({
				found: foundCount,
				deleted: deletedCount,
				errors,
				preview: foundIncidents.slice(0, 20), // Show first 20 found incidents
			});
		} catch (error: any) {
			const errorMsg = `Delete operation failed: ${error?.message || error}`;
			setDeleteResult({
				found: 0,
				deleted: 0,
				errors: [errorMsg],
				preview: [],
			});
		} finally {
			setIsDeleting(false);
			setProgress(0);
		}
	}, [parsedIncidents]);

	// ——————— UI (tetap sama dengan versi Anda, diringkas) ———————
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
				".xlsx",
			],
			"application/vnd.ms-excel": [".xls"],
		},
		multiple: false,
	});

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TableChartIcon className="w-5 h-5" />
						Upload & Delete Incident Data
					</CardTitle>
					<CardDescription>
						Upload data baru atau hapus data berdasarkan file Excel yang
						diupload.
						<br />
						<span className="text-xs text-green-600 mt-1 block font-medium">
							✅ Durasi vendor hanya mengurangi jeda yang overlap dengan window
							vendor.
						</span>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="upload" className="w-full">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="upload">Upload Data</TabsTrigger>
							<TabsTrigger value="delete">Delete Data</TabsTrigger>
						</TabsList>

						<TabsContent value="upload" className="space-y-4">
							<div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
								Excel dengan header bervariasi akan otomatis dipetakan. Tanggal
								dari Excel (serial) juga dideteksi.
							</div>

							<div
								{...getRootProps()}
								className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
									isDragActive
										? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
										: " hover:border-gray-400 dark:hover:border-gray-500"
								}`}
							>
								<input {...getInputProps()} />
								<CloudUploadIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
								{isDragActive ? (
									<p className="text-lg font-medium text-blue-600 dark:text-blue-400">
										Drop the Excel file here...
									</p>
								) : (
									<div>
										<p className="text-lg font-medium text-card-foreground">
											Drag & drop an Excel file here, or click to select
										</p>
										<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
											Supports .xlsx and .xls files
										</p>
									</div>
								)}
							</div>

							{isUploading && (
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span>Processing...</span>
										<span>{progress.toFixed(0)}%</span>
									</div>
									<Progress value={progress} />
								</div>
							)}

							{uploadResult && (
								<div className="space-y-4">
									<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
										<div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg ring-1 ring-green-200 dark:ring-green-800">
											<div className="text-lg font-bold text-green-600">
												{uploadResult.success}
											</div>
											<div className="text-sm text-green-700 dark:text-green-300">
												Success
											</div>
										</div>
										<div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg ring-1 ring-red-200 dark:ring-red-800">
											<div className="text-lg font-bold text-red-600">
												{uploadResult.failed}
											</div>
											<div className="text-sm text-red-700 dark:text-red-300">
												Failed
											</div>
										</div>
										<div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg ring-1 ring-yellow-200 dark:ring-yellow-800">
											<div className="text-lg font-bold text-yellow-600">
												{uploadResult.skippedRows}
											</div>
											<div className="text-sm text-yellow-700 dark:text-yellow-300">
												Skipped
											</div>
										</div>
										<div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg ring-1 ring-blue-200 dark:ring-blue-800">
											<div className="text-lg font-bold text-blue-600">
												{uploadResult.totalRowsInFile}
											</div>
											<div className="text-sm text-blue-700 dark:text-blue-300">
												Total in File
											</div>
										</div>
									</div>

									{uploadResult.errors.length > 0 && (
										<Alert>
											<WarningAmberIcon className="w-4 h-4" />
											<AlertDescription>
												<div className="space-y-2">
													<p className="font-medium">Errors encountered:</p>
													<ul className="text-sm space-y-1">
														{uploadResult.errors.slice(0, 10).map((e, i) => (
															<li
																key={i}
																className="text-red-600 dark:text-red-400"
															>
																{e}
															</li>
														))}
													</ul>
												</div>
											</AlertDescription>
										</Alert>
									)}

									{uploadResult.preview.length > 0 && (
										<div>
											<h4 className="font-medium mb-2">
												Preview (first 20 rows):
											</h4>
											<div className="border rounded-lg overflow-hidden">
												<table className="w-full text-sm">
													<thead className="bg-gray-50 dark:bg-gray-800">
														<tr>
															<th className="px-3 py-2 text-left">No Case</th>
															<th className="px-3 py-2 text-left">Site</th>
															<th className="px-3 py-2 text-left">Status</th>
															<th className="px-3 py-2 text-left">Priority</th>
															<th className="px-3 py-2 text-left">Duration</th>
														</tr>
													</thead>
													<tbody>
														{uploadResult.preview.map((inc, i) => {
															const minutes = Math.round(inc.durationMin || 0);
															const hh = Math.floor(minutes / 60);
															const mm = minutes % 60;
															return (
																<tr key={i} className="border-t">
																	<td className="px-3 py-2">{inc.noCase}</td>
																	<td className="px-3 py-2">{inc.site}</td>
																	<td className="px-3 py-2">{inc.status}</td>
																	<td className="px-3 py-2">{inc.priority}</td>
																	<td className="px-3 py-2">
																		{hh}:{String(mm).padStart(2, "0")}
																	</td>
																</tr>
															);
														})}
													</tbody>
												</table>
											</div>
										</div>
									)}

									{/* Upload Log Section */}
									{uploadResult.uploadLog &&
										uploadResult.uploadLog.length > 0 && (
											<div>
												<h4 className="font-medium mb-2">Upload Log:</h4>
												<div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
													<div className="space-y-1 p-2">
														{uploadResult.uploadLog.map((log, i) => (
															<div
																key={i}
																className={`text-xs p-2 rounded ${
																	log.type === "success"
																		? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
																		: log.type === "error"
																			? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
																			: log.type === "skipped"
																				? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300"
																				: log.type === "warning"
																					? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
																					: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
																}`}
															>
																<div className="flex items-center gap-2">
																	{log.type === "success" && (
																		<CheckCircleIcon className="w-3 h-3" />
																	)}
																	{log.type === "error" && (
																		<CancelIcon className="w-3 h-3" />
																	)}
																	{log.type === "skipped" && (
																		<WarningAmberIcon className="w-3 h-3" />
																	)}
																	{log.type === "info" && (
																		<InfoIcon className="w-3 h-3" />
																	)}
																	{log.type === "warning" && (
																		<WarningAmberIcon className="w-3 h-3" />
																	)}
																	<span className="font-medium">
																		[{log.sheet}]
																	</span>
																	{log.row > 0 && (
																		<span className="text-gray-500">
																			Row {log.row}:
																		</span>
																	)}
																	<span>{log.message}</span>
																	{log.noCase && (
																		<span className="text-gray-500">
																			(Case: {log.noCase})
																		</span>
																	)}
																</div>
															</div>
														))}
													</div>
												</div>
											</div>
										)}
								</div>
							)}
						</TabsContent>

						<TabsContent value="delete" className="space-y-4">
							<div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
								Hapus data berdasarkan file Excel yang diupload. Data akan
								dicocokkan berdasarkan No Case dan Start Time.
							</div>

							{parsedIncidents.length > 0 ? (
								<div className="space-y-4">
									<Alert>
										<InfoIcon className="w-4 h-4" />
										<AlertDescription>
											<div className="space-y-2">
												<p className="font-medium">
													File Excel telah diparsing
												</p>
												<p className="text-sm">
													Ditemukan {parsedIncidents.length} incident dalam
													file. Klik tombol di bawah untuk menghapus data yang
													cocok dari database.
												</p>
												<p className="text-xs text-yellow-600 dark:text-yellow-400">
													⚠️ Data akan dihapus berdasarkan No Case dan Start Time
													yang cocok dengan data di database.
												</p>
											</div>
										</AlertDescription>
									</Alert>

									<Button
										onClick={handleDeleteByFile}
										disabled={isDeleting}
										variant="destructive"
										className="w-full"
									>
										{isDeleting ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
												Menghapus Data...
											</>
										) : (
											<>
												<DeleteIcon className="w-4 h-4 mr-2" />
												Hapus Data dari Database
											</>
										)}
									</Button>

									{isDeleting && (
										<div className="space-y-2">
											<div className="flex justify-between text-sm">
												<span>Menghapus data...</span>
												<span>{progress.toFixed(0)}%</span>
											</div>
											<Progress value={progress} />
										</div>
									)}

									{deleteResult && (
										<div className="space-y-4">
											<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
												<div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg ring-1 ring-blue-200 dark:ring-blue-800">
													<div className="text-lg font-bold text-blue-600">
														{deleteResult.found}
													</div>
													<div className="text-sm text-blue-700 dark:text-blue-300">
														Ditemukan
													</div>
												</div>
												<div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg ring-1 ring-red-200 dark:ring-red-800">
													<div className="text-lg font-bold text-red-600">
														{deleteResult.deleted}
													</div>
													<div className="text-sm text-red-700 dark:text-red-300">
														Dihapus
													</div>
												</div>
												<div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg ring-1 ring-yellow-200 dark:ring-yellow-800">
													<div className="text-lg font-bold text-yellow-600">
														{deleteResult.errors.length}
													</div>
													<div className="text-sm text-yellow-700 dark:text-yellow-300">
														Error
													</div>
												</div>
											</div>

											{deleteResult.errors.length > 0 && (
												<Alert>
													<WarningAmberIcon className="w-4 h-4" />
													<AlertDescription>
														<div className="space-y-2">
															<p className="font-medium">Errors encountered:</p>
															<ul className="text-sm space-y-1">
																{deleteResult.errors
																	.slice(0, 10)
																	.map((e, i) => (
																		<li
																			key={i}
																			className="text-red-600 dark:text-red-400"
																		>
																			{e}
																		</li>
																	))}
															</ul>
														</div>
													</AlertDescription>
												</Alert>
											)}

											{deleteResult.preview.length > 0 && (
												<div>
													<h4 className="font-medium mb-2">
														Data yang dihapus (first 20 rows):
													</h4>
													<div className="border rounded-lg overflow-hidden">
														<table className="w-full text-sm">
															<thead className="bg-gray-50 dark:bg-gray-800">
																<tr>
																	<th className="px-3 py-2 text-left">
																		No Case
																	</th>
																	<th className="px-3 py-2 text-left">Site</th>
																	<th className="px-3 py-2 text-left">
																		Status
																	</th>
																	<th className="px-3 py-2 text-left">
																		Priority
																	</th>
																	<th className="px-3 py-2 text-left">
																		Start Time
																	</th>
																</tr>
															</thead>
															<tbody>
																{deleteResult.preview.map((inc, i) => (
																	<tr key={i} className="border-t">
																		<td className="px-3 py-2">{inc.noCase}</td>
																		<td className="px-3 py-2">{inc.site}</td>
																		<td className="px-3 py-2">{inc.status}</td>
																		<td className="px-3 py-2">
																			{inc.priority}
																		</td>
																		<td className="px-3 py-2">
																			{inc.startTime
																				? new Date(
																						inc.startTime,
																					).toLocaleString("id-ID")
																				: "-"}
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							) : (
								<div className="text-center p-8 border-2 border-dashed rounded-lg">
									<DeleteIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
									<p className="text-lg font-medium text-gray-600 dark:text-gray-400">
										Upload file Excel terlebih dahulu di tab "Upload Data"
									</p>
									<p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
										File akan diparsing dan dapat digunakan untuk menghapus data
										yang cocok
									</p>
								</div>
							)}
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
			
			{/* Delete by File Button */}
			<div className="mt-6 flex justify-center">
				<Button
					onClick={() => setShowDeleteDialog(true)}
					variant="outline"
					className="w-full sm:w-auto"
				>
					<DeleteIcon className="h-4 w-4 mr-2" />
					Delete by File
				</Button>
			</div>
			
			{/* Delete by File Dialog */}
			{showDeleteDialog && (
				<DeleteByFileDialog
					dataType="incidents"
					onClose={() => setShowDeleteDialog(false)}
					onDeleted={({ fileName, deletedCount }) => {
						alert(`Terhapus ${deletedCount} data incident dari ${fileName}`);
						setParsedIncidents([]);
						setUploadResult(null);
					}}
				/>
			)}
		</div>
	);
};
