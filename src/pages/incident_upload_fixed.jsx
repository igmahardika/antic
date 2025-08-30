import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Incident } from "@/types/incident";
import { mkId, generateBatchId, saveIncidentsChunked } from "@/utils/incidentUtils";
import { fixAllMissingEndTime } from "@/utils/durationFixUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import TableChartIcon from "@mui/icons-material/TableChart";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DownloadIcon from "@mui/icons-material/Download";
import InfoIcon from "@mui/icons-material/Info";
import DescriptionIcon from "@mui/icons-material/Description";

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

type CanonKey = keyof typeof CANON;

// ——————— Sinonim (sudah dinormalisasi) ———————
const HEADER_SYNONYMS: Record<string, string[]> = {
  [CANON.priority]: ["priority", "prio"],
  [CANON.site]: ["site", "lokasi", "lokasi site"],
  [CANON.noCase]: ["no case", "nocase", "case", "no kasus", "kasus"],
  [CANON.ncal]: ["ncal"],
  [CANON.status]: ["status"],
  [CANON.level]: ["level"],
  [CANON.ts]: ["ts", "technical support", "vendor"],
  [CANON.odpBts]: ["odp bts", "odp", "bts", "odp/bts"],
  [CANON.start]: ["start", "mulai"],
  [CANON.startEscalationVendor]: [
    "start escalation vendor",
    "mulai eskalasi vendor",
    "mulai vendor",
    "vendor start",
  ],
  [CANON.end]: ["end", "selesai"],
  [CANON.duration]: ["duration", "durasi"],
  [CANON.durationVendor]: ["duration vendor", "durasi vendor"],
  [CANON.problem]: ["problem", "masalah"],
  [CANON.penyebab]: ["penyebab", "cause"],
  [CANON.actionTerakhir]: ["action terakhir", "last action", "aksi terakhir", "action"],
  [CANON.note]: ["note", "catatan"],
  [CANON.klasifikasiGangguan]: ["klasifikasi gangguan", "klasifikasi"],
  [CANON.powerBefore]: ["power before", "powerbefore", "daya sebelum"],
  [CANON.powerAfter]: ["power after", "powerafter", "daya sesudah"],
  [CANON.pause1]: ["start pause", "pause", "jeda", "jeda 1"],
  [CANON.resume1]: ["end pause", "restart", "lanjut", "lanjut 1"],
  [CANON.pause2]: ["start pause 2", "pause 2", "pause2", "jeda 2"],
  [CANON.resume2]: ["end pause 2", "restart 2", "restart2", "lanjut 2"],
  [CANON.totalDurationPause]: ["total duration pause", "total pause", "durasi jeda total"],
  [CANON.totalDurationVendor]: ["total duration vendor", "durasi vendor total"],
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
  return typeof i === "number" ? row[i] ?? null : null;
}

// ——————— Util: konversi Excel value → ISO string ———————
function excelSerialToDate(n: number): Date {
  // Excel epoch (Windows): 1899-12-30
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
  if (typeof v === "string") {
    const s = v.trim().replace(/\./g, "/"); // 01.02.2024 → 01/02/2024
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
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
function overlapMinutes(aStart: string | null, aEnd: string | null, bStart: string | null, bEnd: string | null): number {
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
  type: "success" | "error" | "skipped" | "info";
  row: number;
  sheet: string;
  message: string;
  noCase?: string;
  details?: any;
}

const REQUIRED_HEADERS = [
  "Priority",
  "Site",
  "No Case",
  "NCAL",
  "Status",
  "Level",
  "TS",
  "ODP/BTS",
  "Start",
  "Start Escalation Vendor",
  "End",
  "Duration",
  "Duration Vendor",
  "Problem",
  "Penyebab",
  "Action Terakhir",
  "Note",
  "Klasifikasi Gangguan",
  "Power Before",
  "Power After",
  "Start Pause",
  "End Pause",
  "Start Pause 2",
  "End Pause 2",
  "Total Duration Pause",
  "Total Duration Vendor",
];

export const IncidentUpload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [showDetailedLog, setShowDetailedLog] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsUploading(true);
    setProgress(0);
    setUploadResult(null);

    try {
      const file = acceptedFiles[0];
      // Penting: cellDates:true agar tanggal jadi Date, bukan angka
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });

      const allRows: Incident[] = [];
      const errors: string[] = [];
      const uploadLog: UploadLogEntry[] = [];
      let successCount = 0;
      let failedCount = 0;
      let totalRowsInFile = 0;
      let totalRowsProcessed = 0;
      let skippedRows = 0;

      uploadLog.push({
        type: "info",
        row: 0,
        sheet: "SYSTEM",
        message: `Upload started for file: ${file.name}`,
        details: {
          fileSize: file.size,
          fileType: file.type,
          sheets: workbook.SheetNames,
        },
      });

      for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        if (!ws) continue;
        // raw:true → nilai asli (Date untuk tanggal jika cellDates:true)
        // defval:null → cell kosong jadi null, bukan undefined
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
        if (!rows || rows.length === 0) {
          uploadLog.push({ type: "info", row: 0, sheet: sheetName, message: `Sheet "${sheetName}" empty` });
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

        for (let r = 0; r < data.length; r++) {
          const rowNum = headerIdx + 1 + r + 1; // 1-based untuk user
          const row = data[r] || [];
          totalRowsProcessed++;

          // Abaikan baris benar-benar kosong
          const hasData = row.some((c: any) => c !== null && c !== undefined && String(c).trim() !== "");
          if (!hasData) {
            skippedRows++;
            uploadLog.push({ type: "skipped", row: rowNum, sheet: sheetName, message: "Row kosong" });
            continue;
          }

          try {
            const noCaseRaw = pick(row, idx, CANON.noCase);
            const startRaw = pick(row, idx, CANON.start);
            if (!noCaseRaw || String(noCaseRaw).trim() === "" || !startRaw) {
              skippedRows++;
              uploadLog.push({
                type: "skipped",
                row: rowNum,
                sheet: sheetName,
                message: "Row tanpa No Case atau Start",
                details: { noCaseRaw, startRaw },
              });
              continue;
            }

            const startIso = coerceDate(startRaw);
            if (!startIso) {
              skippedRows++;
              uploadLog.push({
                type: "skipped",
                row: rowNum,
                sheet: sheetName,
                message: "Format Start tidak dikenal",
                details: { startRaw },
              });
              continue;
            }

            const endIso = coerceDate(pick(row, idx, CANON.end));
            const sevIso = coerceDate(pick(row, idx, CANON.startEscalationVendor));
            const p1Start = coerceDate(pick(row, idx, CANON.pause1));
            const p1End = coerceDate(pick(row, idx, CANON.resume1));
            const p2Start = coerceDate(pick(row, idx, CANON.pause2));
            const p2End = coerceDate(pick(row, idx, CANON.resume2));

            const incident: Incident = {
              id: mkId(String(noCaseRaw), startIso),
              noCase: String(noCaseRaw),
              priority: (pick(row, idx, CANON.priority) ?? null) as any,
              site: (pick(row, idx, CANON.site) ?? null) as any,
              ncal: (pick(row, idx, CANON.ncal) ?? null) as any,
              status: (pick(row, idx, CANON.status) ?? null) as any,
              level: ((): any => {
                const v = pick(row, idx, CANON.level);
                const n = Number(v);
                return Number.isFinite(n) ? n : (v ?? null);
              })(),
              ts: (pick(row, idx, CANON.ts) ?? null) as any,
              odpBts: (pick(row, idx, CANON.odpBts) ?? null) as any,
              startTime: startIso,
              startEscalationVendor: sevIso,
              endTime: endIso,
              durationMin: 0,
              durationVendorMin: 0,
              problem: (pick(row, idx, CANON.problem) ?? null) as any,
              penyebab: (pick(row, idx, CANON.penyebab) ?? null) as any,
              actionTerakhir: (pick(row, idx, CANON.actionTerakhir) ?? null) as any,
              note: (pick(row, idx, CANON.note) ?? null) as any,
              klasifikasiGangguan: (pick(row, idx, CANON.klasifikasiGangguan) ?? null) as any,
              powerBefore: ((): any => {
                const v = pick(row, idx, CANON.powerBefore);
                const n = Number(v);
                return Number.isFinite(n) ? n : (v ?? null);
              })(),
              powerAfter: ((): any => {
                const v = pick(row, idx, CANON.powerAfter);
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
            uploadLog.push({ type: "success", row: rowNum, sheet: sheetName, message: "Parsed", noCase: incident.noCase });
          } catch (e: any) {
            failedCount++;
            const msg = `Row ${rowNum} in "${sheetName}": ${e?.message || e}`;
            errors.push(msg);
            uploadLog.push({ type: "error", row: rowNum, sheet: sheetName, message: msg });
          }
        }

        setProgress(((workbook.SheetNames.indexOf(sheetName) + 1) / workbook.SheetNames.length) * 50);
      }

      // ——————— Auto-fix EndTime lalu hitung durasi ———————
      if (allRows.length > 0) {
        setProgress(60);
        uploadLog.push({ type: "info", row: 0, sheet: "DURATION_FIX", message: "Fixing endTime & durations..." });

        const { fixedIncidents: incidentsWithEnd, fixedCount } = fixAllMissingEndTime(allRows);
        if (fixedCount > 0) {
          uploadLog.push({ type: "success", row: 0, sheet: "DURATION_FIX", message: `Fixed ${fixedCount} missing endTime` });
        }

        const finalIncidents = incidentsWithEnd.map((inc) => {
          const updated = { ...inc };
          // Duration
          updated.durationMin = diffMinutes(inc.startTime, inc.endTime);
          // Vendor duration
          updated.durationVendorMin = diffMinutes(inc.startEscalationVendor || null, inc.endTime);
          // Pause total
          const p1 = diffMinutes(inc.startPause1 || null, inc.endPause1 || null);
          const p2 = diffMinutes(inc.startPause2 || null, inc.endPause2 || null);
          updated.totalDurationPauseMin = Math.round((p1 + p2) * 100) / 100;
          // Hanya kurangi pause yang overlap dengan window vendor (adil)
          const overlapVendor =
            (inc.startEscalationVendor && inc.endTime ? overlapMinutes(inc.startPause1 || null, inc.endPause1 || null, inc.startEscalationVendor, inc.endTime) : 0) +
            (inc.startEscalationVendor && inc.endTime ? overlapMinutes(inc.startPause2 || null, inc.endPause2 || null, inc.startEscalationVendor, inc.endTime) : 0);
          const vendorAfterPause = Math.max(updated.durationVendorMin - overlapVendor, 0);
          updated.totalDurationVendorMin = Math.round(vendorAfterPause * 100) / 100;
          return updated;
        });

        uploadLog.push({ type: "info", row: 0, sheet: "DURATION_FIX", message: "Durations recalculated (with vendor-overlap rule)" });

        setProgress(80);
        uploadLog.push({ type: "info", row: 0, sheet: "DATABASE", message: `Saving ${finalIncidents.length} incidents...` });
        await saveIncidentsChunked(finalIncidents);
        uploadLog.push({ type: "success", row: 0, sheet: "DATABASE", message: `Saved ${finalIncidents.length} incidents` });

        setProgress(100);
      }

      uploadLog.push({
        type: "info",
        row: 0,
        sheet: "SUMMARY",
        message: `Upload completed. Summary: ${successCount} success, ${failedCount} failed, ${skippedRows} skipped out of ${totalRowsInFile}`,
        details: { successCount, failedCount, skippedRows, totalRowsInFile, totalRowsProcessed },
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
    } catch (error: any) {
      const errorMsg = `Upload failed: ${error?.message || error}`;
      setUploadResult({
        success: 0,
        failed: 1,
        errors: [errorMsg],
        preview: [],
        uploadLog: [{ type: "error", row: 0, sheet: "SYSTEM", message: errorMsg }],
        totalRowsProcessed: 0,
        totalRowsInFile: 0,
        skippedRows: 0,
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ——————— UI (tetap sama dengan versi Anda, diringkas) ———————
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  const getLogEntryIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "error":
        return <CancelIcon className="w-4 h-4 text-red-500" />;
      case "skipped":
        return <WarningAmberIcon className="w-4 h-4 text-yellow-500" />;
      case "info":
        return <InfoIcon className="w-4 h-4 text-blue-500" />;
      default:
        return <DescriptionIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getLogEntryColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800";
      case "error":
        return "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800";
      case "skipped":
        return "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "info":
        return "border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800";
      default:
        return "border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableChartIcon className="w-5 h-5" />
            Upload Incident Data (Fixed)
          </CardTitle>
          <CardDescription>
            Excel dengan header bervariasi akan otomatis dipetakan. Tanggal dari Excel (serial) juga dideteksi.
            <br />
            <span className="text-xs text-green-600 mt-1 block font-medium">
              ✅ Durasi vendor hanya mengurangi jeda yang overlap dengan window vendor.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : " hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              <input {...getInputProps()} />
              <CloudUploadIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-lg font-medium text-blue-600 dark:text-blue-400">Drop the Excel file here...</p>
              ) : (
                <div>
                  <p className="text-lg font-medium text-card-foreground">Drag & drop an Excel file here, or click to select</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Supports .xlsx and .xls files</p>
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
                    <div className="text-lg font-bold text-green-600">{uploadResult.success}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Success</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg ring-1 ring-red-200 dark:ring-red-800">
                    <div className="text-lg font-bold text-red-600">{uploadResult.failed}</div>
                    <div className="text-sm text-red-700 dark:text-red-300">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg ring-1 ring-yellow-200 dark:ring-yellow-800">
                    <div className="text-lg font-bold text-yellow-600">{uploadResult.skippedRows}</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">Skipped</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg ring-1 ring-blue-200 dark:ring-blue-800">
                    <div className="text-lg font-bold text-blue-600">{uploadResult.totalRowsInFile}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Total in File</div>
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
                            <li key={i} className="text-red-600 dark:text-red-400">{e}</li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {uploadResult.preview.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Preview (first 20 rows):</h4>
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
                                <td className="px-3 py-2">{hh}:{String(mm).padStart(2, "0")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
