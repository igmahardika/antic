import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as ExcelJS from "exceljs";
import { Incident } from "@/types/incident";
import {
	mkId,
	parseDateSafe,
} from "@/utils/incidentUtils";
import { fixAllMissingEndTime } from "@/utils/durationFixUtils";
import { incidentAPI } from "@/lib/api";
import { cacheService } from "@/services/cacheService";
import { saveAs } from "file-saver";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import TableChartIcon from "@mui/icons-material/TableChart";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteByFileDialog from "./DeleteByFileDialog";
import SummaryCard from "./ui/SummaryCard";
import { createUploadSession, finalizeUploadSession, deleteAllData } from '../services/uploadSessions';

/**
 * IncidentUpload Component
 * Refactored to match UploadData.tsx pattern:
 * 1. Server-side session tracking
 * 2. Bulk insert to MySQL
 * 3. Delete by File / Reset functionality
 * 4. Summary cards and layout
 */

// ——————— Constants: Required Canonical Headers ———————
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

// ——————— Synonyms ———————
const HEADER_SYNONYMS: Record<string, string[]> = {
	[CANON.priority]: ["priority", "prio", "prioritas", "level priority"],
	[CANON.site]: ["site", "lokasi", "lokasi site", "nama site", "site name"],
	[CANON.noCase]: ["no case", "nocase", "case", "no kasus", "kasus", "case number", "nomor case", "no case number"],
	[CANON.ncal]: ["ncal", "ncals", "ncal level"],
	[CANON.status]: ["status", "status gangguan", "status case"],
	[CANON.level]: ["level", "level gangguan", "level case"],
	[CANON.ts]: ["ts", "technical support", "vendor", "technical support vendor", "vendor ts"],
	[CANON.odpBts]: ["odp bts", "odp", "bts", "odp/bts", "odp bts name", "nama odp bts"],
	[CANON.start]: ["start", "mulai", "start time", "waktu mulai", "start gangguan"],
	[CANON.startEscalationVendor]: ["start escalation vendor", "mulai eskalasi vendor", "mulai vendor", "vendor start", "start escalation", "escalation start", "mulai eskalasi", "start vendor", "vendor start time"],
	[CANON.end]: ["end", "selesai", "end time", "waktu selesai", "end gangguan"],
	[CANON.duration]: ["duration", "durasi", "total duration", "durasi total"],
	[CANON.durationVendor]: ["duration vendor", "durasi vendor", "vendor duration", "durasi vendor total"],
	[CANON.problem]: ["problem", "masalah", "problem description", "deskripsi masalah"],
	[CANON.penyebab]: ["penyebab", "cause", "root cause", "penyebab gangguan"],
	[CANON.actionTerakhir]: ["action terakhir", "last action", "aksi terakhir", "action", "action taken", "tindakan terakhir"],
	[CANON.note]: ["note", "catatan", "notes", "keterangan"],
	[CANON.klasifikasiGangguan]: ["klasifikasi gangguan", "klasifikasi", "classification", "jenis gangguan"],
	[CANON.powerBefore]: ["power before", "powerbefore", "daya sebelum", "power before repair", "daya sebelum perbaikan"],
	[CANON.powerAfter]: ["power after", "powerafter", "daya sesudah", "power after repair", "daya sesudah perbaikan"],
	[CANON.pause1]: ["start pause", "pause", "jeda", "jeda 1", "pause start", "mulai jeda", "start pause 1"],
	[CANON.resume1]: ["end pause", "restart", "lanjut", "lanjut 1", "pause end", "selesai jeda", "end pause 1", "resume"],
	[CANON.pause2]: ["start pause 2", "pause 2", "pause2", "jeda 2", "pause start 2", "mulai jeda 2"],
	[CANON.resume2]: ["end pause 2", "restart 2", "restart2", "lanjut 2", "pause end 2", "selesai jeda 2", "end pause 2", "resume 2"],
	[CANON.totalDurationPause]: ["total duration pause", "total pause", "durasi jeda total", "total pause duration"],
	[CANON.totalDurationVendor]: ["total duration vendor", "durasi vendor total", "vendor total duration"],
};

// ——————— Utility Functions ———————
function normalizeHeader(s: any): string {
	if (s == null) return "";
	return String(s).replace(/\ufeff/g, "").trim().toLowerCase().replace(/[\/_-]+/g, " ").replace(/\s+/g, " ");
}

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

function buildHeaderIndex(headersRaw: any[]): Map<string, number> {
	const headers = headersRaw.map(normalizeHeader);
	const map = new Map<string, number>();
	headers.forEach((h, i) => {
		if (!map.has(h)) map.set(h, i);
	});
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

function pick(row: any[], idx: Map<string, number>, canon: string) {
	const i = idx.get(canon);
	if (typeof i !== "number") return null;
	const value = row[i];
	if (value === null || value === undefined || value === "") return null;
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "number") return value;
	if (value instanceof Date) return value;
	return String(value).trim() || null;
}

function excelSerialToDate(n: number): Date {
	const ms = (n - 25569) * 86400 * 1000;
	return new Date(ms);
}

function coerceDate(v: any): string | null {
	if (v == null || v === "") return null;
	if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
	if (typeof v === "number" && isFinite(v)) {
		const d = excelSerialToDate(v);
		return isNaN(d.getTime()) ? null : d.toISOString();
	}
	if (typeof v === "string") return parseDateSafe(v);
	return null;
}

function diffMinutes(aIso: string | null, bIso: string | null): number {
	if (!aIso || !bIso) return 0;
	const a = new Date(aIso).getTime();
	const b = new Date(bIso).getTime();
	if (!isFinite(a) || !isFinite(b)) return 0;
	const d = (b - a) / 60000;
	return d > 0 ? Math.round(d * 100) / 100 : 0;
}

function overlapMinutes(aStart: string | null, aEnd: string | null, bStart: string | null, bEnd: string | null): number {
	if (!aStart || !aEnd || !bStart || !bEnd) return 0;
	const s = Math.max(new Date(aStart).getTime(), new Date(bStart).getTime());
	const e = Math.min(new Date(aEnd).getTime(), new Date(bEnd).getTime());
	const d = (e - s) / 60000;
	return d > 0 ? Math.round(d * 100) / 100 : 0;
}

// ——————— UI Components ———————
interface UploadResult {
	success: number;
	failed: number;
	errors: string[];
	totalRowsProcessed: number;
	totalRowsInFile: number;
	skippedRows: number;
}

interface IncidentUploadProps {
	onComplete?: () => void;
}

export const IncidentUpload: React.FC<IncidentUploadProps> = ({ onComplete }) => {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
	const [progress, setProgress] = useState(0);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const onDrop = useCallback(async (acceptedFiles: File[]) => {
		if (acceptedFiles.length === 0) return;
		setIsUploading(true);
		setProgress(0);
		setUploadResult(null);

		let session: any = null;

		try {
			const file = acceptedFiles[0];
			session = await createUploadSession(file, 'incidents');

			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.load(await file.arrayBuffer());

			const allRows: Incident[] = [];
			const errors: string[] = [];
			let successCount = 0;
			let failedCount = 0;
			let totalRowsInFile = 0;
			let skippedRows = 0;

			for (const worksheet of workbook.worksheets) {
				const rows: any[][] = [];
				worksheet.eachRow((row) => {
					const rowValues: any[] = [];
					row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
						let value = cell.value;
						if (value instanceof Date) rowValues[colNumber - 1] = value;
						else if (cell.type === ExcelJS.ValueType.Date) rowValues[colNumber - 1] = new Date(cell.value as number);
						else rowValues[colNumber - 1] = value ?? null;
					});
					rows.push(rowValues);
				});

				if (!rows || rows.length === 0) continue;

				const headerIdx = findHeaderRow(rows);
				const headersRaw = rows[headerIdx] || [];
				const idx = buildHeaderIndex(headersRaw);
				const data = rows.slice(headerIdx + 1);

				totalRowsInFile += data.length;

				for (let r = 0; r < data.length; r++) {
					const rowNum = headerIdx + 1 + r + 1;
					const row = data[r] || [];

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
					};

					const hasData = Object.values(rowData).some(c => c !== null);
					if (!hasData) { skippedRows++; continue; }

					try {
						const startIso = coerceDate(rowData.start || rowData.end || rowData.startEscalationVendor);
						if (!startIso) {
							const val = rowData.start || rowData.end || rowData.startEscalationVendor;
							errors.push(`Row ${rowNum}: Invalid Date Format (Start/End: "${val}")`);
							skippedRows++;
							continue;
						}

						const incident: Incident = {
							id: mkId(String(rowData.noCase || `ROW_${rowNum}`), startIso),
							noCase: String(rowData.noCase || "-"),
							priority: String(rowData.priority || "P3"),
							site: String(rowData.site || "-"),
							ncal: String(rowData.ncal || "-"),
							status: String(rowData.status || "Open"),
							level: Number(rowData.level) || 0,
							ts: String(rowData.ts || "-"),
							odpBts: String(rowData.odpBts || "-"),
							startTime: startIso,
							startEscalationVendor: coerceDate(rowData.startEscalationVendor),
							endTime: coerceDate(rowData.end),
							durationMin: 0,
							durationVendorMin: 0,
							problem: String(rowData.problem || "-"),
							penyebab: String(rowData.penyebab || "-"),
							actionTerakhir: String(rowData.actionTerakhir || "-"),
							note: String(rowData.note || "-"),
							klasifikasiGangguan: String(rowData.klasifikasiGangguan || "-"),
							powerBefore: Number(String(rowData.powerBefore || "0").replace(",", ".")) || 0,
							powerAfter: Number(String(rowData.powerAfter || "0").replace(",", ".")) || 0,
							startPause1: coerceDate(rowData.startPause),
							endPause1: coerceDate(rowData.endPause),
							startPause2: coerceDate(rowData.startPause2),
							endPause2: coerceDate(rowData.endPause2),
							totalDurationPauseMin: 0,
							totalDurationVendorMin: 0,
							batchId: session.id,
						};
						allRows.push(incident);
						successCount++;
					} catch (e: any) {
						failedCount++;
						errors.push(`Row ${rowNum}: ${e?.message || e}`);
					}
				}
				setProgress((successCount / (totalRowsInFile || 1)) * 50);
			}

			if (allRows.length > 0) {
				setProgress(60);
				const { fixedIncidents: incidentsWithEnd } = fixAllMissingEndTime(allRows);

				const finalIncidents = incidentsWithEnd.map((inc) => {
					const updated = { ...inc };
					updated.durationMin = diffMinutes(inc.startTime, inc.endTime);
					updated.durationVendorMin = diffMinutes(inc.startEscalationVendor || null, inc.endTime);
					const p1 = diffMinutes(inc.startPause1 || null, inc.endPause1 || null);
					const p2 = diffMinutes(inc.startPause2 || null, inc.endPause2 || null);
					updated.totalDurationPauseMin = Math.round((p1 + p2) * 100) / 100;

					let overlapVendor = 0;
					if (inc.startEscalationVendor && inc.endTime) {
						overlapVendor = overlapMinutes(inc.startPause1 || null, inc.endPause1 || null, inc.startEscalationVendor, inc.endTime) +
							overlapMinutes(inc.startPause2 || null, inc.endPause2 || null, inc.startEscalationVendor, inc.endTime);
					}
					updated.totalDurationVendorMin = Math.round(Math.max(updated.durationVendorMin - overlapVendor, 0) * 100) / 100;

					// Calculate Level based on Duration (1 Level per hour)
					// 0-60m = Level 1, 61-120m = Level 2, etc.
					const duration = updated.durationMin || 0;
					updated.level = duration > 0 ? Math.ceil(duration / 60) : 1;

					return updated;
				});

				setProgress(80);
				await incidentAPI.bulkInsertIncidents(finalIncidents, {
					batchId: session.id,
					fileName: file.name,
					uploadSessionId: session.id
				});

				await finalizeUploadSession(session.id, {
					status: 'completed',
					recordCount: finalIncidents.length,
					successCount: finalIncidents.length
				});

				await cacheService.invalidateIncidents();
				setProgress(100);
			}

			setUploadResult({
				success: successCount,
				failed: failedCount,
				errors,
				totalRowsProcessed: totalRowsInFile,
				totalRowsInFile,
				skippedRows,
			});
		} catch (error: any) {
			const errorMsg = `Upload failed: ${error?.message || error}`;
			if (session) await finalizeUploadSession(session.id, { status: 'failed', errorCount: 1, errorLog: [errorMsg] });
			setUploadResult({ success: 0, failed: 1, errors: [errorMsg], totalRowsProcessed: 0, totalRowsInFile: 0, skippedRows: 0 });
		} finally {
			setIsUploading(false);
			if (onComplete) onComplete();
		}
	}, []);

	const handleReset = async () => {
		if (!window.confirm("⚠️ PERINGATAN: Semua data incident akan dihapus PERMANEN!\n\nApakah Anda yakin?")) return;
		try {
			await deleteAllData("incidents");
			setUploadResult(null);
			alert("✅ BERHASIL: Semua data incident telah dihapus!");
		} catch (error) {
			alert(`❌ GAGAL: ${error instanceof Error ? error.message : 'Error'}`);
		}
	};

	const handleDownloadTemplate = async () => {
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Template Incident");
		const headers = ["No Case", "Priority", "Site", "NCAL", "Status", "Level", "TS", "ODP/BTS", "Start", "End", "Start Escalation Vendor", "Start Pause", "End Pause", "Start Pause 2", "End Pause 2", "Problem", "Penyebab", "Action Terakhir", "Note", "Klasifikasi Gangguan", "Power Before", "Power After"];
		const headerRow = worksheet.addRow(headers);
		headerRow.font = { bold: true };
		headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
		const buffer = await workbook.xlsx.writeBuffer();
		saveAs(new Blob([buffer]), "Template_Incident_Data.xlsx");
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
		multiple: false,
	});

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TableChartIcon className="w-5 h-5" />
						Upload Incident Data
					</CardTitle>
					<CardDescription>
						Migrating incident management to server-side MySQL storage.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "hover:border-gray-400"}`}>
						<input {...getInputProps()} />
						<CloudUploadIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
						{isUploading ? (
							<div className="space-y-4 max-w-xs mx-auto">
								<p className="font-semibold text-blue-600">Processing... {progress.toFixed(0)}%</p>
								<Progress value={progress} />
							</div>
						) : (
							<p className="text-xl font-medium">Drag & drop report Excel di sini, atau klik untuk memilih</p>
						)}
					</div>

					<div className="flex flex-wrap gap-3 pt-4">
						<Button onClick={handleDownloadTemplate} variant="outline" className="flex-1">
							<DownloadIcon className="w-4 h-4 mr-2" /> Template
						</Button>
						<Button onClick={() => setShowDeleteDialog(true)} variant="outline" className="flex-1">
							<DeleteIcon className="w-4 h-4 mr-2" /> Delete by File
						</Button>
						<Button onClick={handleReset} variant="destructive" className="flex-1">
							<DeleteIcon className="w-4 h-4 mr-2" /> Reset All
						</Button>
					</div>

					{uploadResult && (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
							<SummaryCard icon={<CloudUploadIcon className="w-5 h-5 text-white" />} title="Total" value={uploadResult.totalRowsInFile} iconBg="bg-blue-600" description="Total data dalam file" />
							<SummaryCard icon={<CheckCircleIcon className="w-5 h-5 text-white" />} title="Berhasil" value={uploadResult.success} iconBg="bg-green-600" description="Data berhasil diupload" />
							<SummaryCard icon={<CancelIcon className="w-5 h-5 text-white" />} title="Gagal" value={uploadResult.failed} iconBg="bg-red-600" description="Data gagal diupload" />
							<SummaryCard icon={<WarningAmberIcon className="w-5 h-5 text-white" />} title="Lewati" value={uploadResult.skippedRows} iconBg="bg-orange-500" description="Data diabaikan (duplikat)" />
						</div>
					)}
				</CardContent>
			</Card>

			{showDeleteDialog && (
				<DeleteByFileDialog
					dataType="incidents"
					onClose={() => setShowDeleteDialog(false)}
					onDeleted={({ fileName, deletedCount }) => {
						alert(`Terhapus ${deletedCount} data dari ${fileName}`);
						cacheService.invalidateIncidents();
					}}
				/>
			)}
		</div>
	);
};
