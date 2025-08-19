import { Incident, IncidentStats, IncidentFilter } from '@/types/incident';
import { db } from '@/lib/db';

// Helper untuk konversi Excel serial date ke JavaScript Date
const excelSerialToDate = (serial: number): Date => {
  // Excel serial date: days since January 1, 1900
  // JavaScript Date: milliseconds since January 1, 1970 (Unix epoch)
  
  // Excel epoch: January 1, 1900 = serial 1
  // Unix epoch: January 1, 1970 = serial 25569
  const unixEpochSerial = 25569;
  
  // Convert days to milliseconds
  const daysSinceUnixEpoch = serial - unixEpochSerial;
  const millisecondsSinceUnixEpoch = daysSinceUnixEpoch * 24 * 60 * 60 * 1000;
  
  return new Date(millisecondsSinceUnixEpoch);
};

// Helper untuk membuat ID unik
export const mkId = (noCase: string, startIso: string | undefined | null): string => {
  const base = `${(noCase || '').trim()}|${(startIso || '').trim()}`;
  // Simple hash function untuk browser
  const hash = Array.from(base).reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  return 'INC-' + Math.abs(hash).toString(36) + '-' + base.length;
};

// Helper untuk konversi durasi ke menit
export const toMinutes = (v: unknown): number => {
  if (v == null || v === '') return 0;
  if (v instanceof Date) return v.getUTCHours() * 60 + v.getUTCMinutes() + Math.round(v.getUTCSeconds() / 60);
  
  const s = String(v).trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) return (+m[1]) * 60 + (+m[2]) + Math.round((+m[3] || 0) / 60);
  
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

// Helper untuk parse tanggal
export const parseDateSafe = (dt?: string | Date | null): string | null => {
  if (!dt) return null;
  if (dt instanceof Date) return isNaN(dt.getTime()) ? null : dt.toISOString();
  
  const s = String(dt).trim();
  if (!s) return null;
  
  // Handle Excel serial date numbers (e.g., 45839, 45735)
  const excelSerial = Number(s);
  if (Number.isFinite(excelSerial) && excelSerial > 1000) {
    try {
      const date = excelSerialToDate(excelSerial);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch (error) {
      console.warn('Failed to convert Excel serial date:', excelSerial, error);
      return null;
    }
  }
  
  // Coba parse berbagai format string
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/, // dd/mm/yyyy hh:mm
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/, // yyyy-mm-dd hh:mm
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})/, // dd-mm-yyyy hh:mm
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // dd/mm/yyyy
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // yyyy-mm-dd
  ];
  
  for (const format of formats) {
    const match = s.match(format);
    if (match) {
      if (match.length === 6) {
        // With time
        const [, day, month, year, hour, minute] = match;
        const date = new Date(+year, +month - 1, +day, +hour, +minute);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } else if (match.length === 4) {
        // Date only
        const [, day, month, year] = match;
        const date = new Date(+year, +month - 1, +day);
        return isNaN(date.getTime()) ? null : date.toISOString();
      }
    }
  }
  
  // Fallback ke Date constructor
  const date = new Date(s);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

// Simpan ke Dexie (chunked)
export async function saveIncidentsChunked(rows: Incident[], chunkSize = 2000) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const part = rows.slice(i, i + chunkSize);
    await db.incidents.bulkPut(part);
  }
}

// Compute stats dari data incident
export async function computeStats(range?: { from: string; to: string; }): Promise<IncidentStats> {
  const rows = range
    ? await db.incidents.where('startTime').between(range.from, range.to, true, true).toArray()
    : await db.incidents.toArray();

  const total = rows.length;
  const open = rows.filter(r => (r.status || '').toLowerCase() !== 'done').length;

  const closed = rows.filter(r => r.endTime && (r.durationMin ?? 0) > 0);
  const mttrMin = closed.length ? Math.round(closed.reduce((a, b) => a + (b.durationMin || 0), 0) / closed.length) : 0;

  const withVendor = rows.filter(r => (r.durationVendorMin ?? 0) > 0);
  const avgVendorMin = withVendor.length ? Math.round(withVendor.reduce((a, b) => a + (b.durationVendorMin || 0), 0) / withVendor.length) : 0;

  const durSum = rows.reduce((a, b) => a + (b.durationMin || 0), 0);
  const pauseSum = rows.reduce((a, b) => a + (b.totalDurationPauseMin || 0), 0);
  const pauseRatio = durSum > 0 ? +(pauseSum / durSum).toFixed(3) : 0;

  const byPriority: Record<string, number> = {};
  const byKlas: Record<string, number> = {};
  const bySite: Record<string, number> = {};
  const byLevel: Record<string, number> = {};
  
  rows.forEach(r => {
    const p = (r.priority || 'N/A'); byPriority[p] = (byPriority[p] || 0) + 1;
    const k = (r.klasifikasiGangguan || 'N/A'); byKlas[k] = (byKlas[k] || 0) + 1;
    const s = (r.site || 'N/A'); bySite[s] = (bySite[s] || 0) + 1;
    const l = (r.level || 'N/A').toString(); byLevel[l] = (byLevel[l] || 0) + 1;
  });

  return { total, open, mttrMin, avgVendorMin, pauseRatio, byPriority, byKlas, bySite, byLevel };
}

// Query incidents dengan filter
export async function queryIncidents(filter: IncidentFilter): Promise<{ rows: Incident[]; total: number }> {
  let coll = db.incidents.orderBy('startTime').reverse();
  
  // Filter by date range
  if (filter.dateFrom && filter.dateTo) {
    coll = db.incidents
      .where('startTime')
      .between(filter.dateFrom, filter.dateTo, true, true);
  }
  
  let rows = await coll.toArray();

  // Secondary filters (in-memory)
  if (filter.status) rows = rows.filter(r => r.status === filter.status);
  if (filter.priority) rows = rows.filter(r => r.priority === filter.priority);
  if (filter.level !== undefined) rows = rows.filter(r => r.level === filter.level);
  if (filter.site) rows = rows.filter(r => r.site === filter.site);
  if (filter.ncal) rows = rows.filter(r => r.ncal === filter.ncal);
  if (filter.klasifikasiGangguan) rows = rows.filter(r => r.klasifikasiGangguan === filter.klasifikasiGangguan);

  // Search
  if (filter.search) {
    const q = filter.search.toLowerCase();
    rows = rows.filter(r =>
      (r.noCase || '').toLowerCase().includes(q) ||
      (r.site || '').toLowerCase().includes(q) ||
      (r.problem || '').toLowerCase().includes(q)
    );
  }

  const total = rows.length;

  // Pagination
  const page = filter.page || 1;
  const limit = filter.limit || 50;
  rows = rows.slice((page - 1) * limit, page * limit);

  return { rows, total };
}

// Format durasi dari menit ke HH:MM:SS
export const formatDurationHMS = (minutes: number): string => {
  if (!minutes || isNaN(minutes) || minutes < 0) return '00:00:00';
  const totalSeconds = Math.floor(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// Generate UUID untuk batch ID
export const generateBatchId = (): string => {
  return 'batch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};
