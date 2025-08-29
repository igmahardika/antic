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

// Helper untuk memastikan format HH:MM:SS diproses dengan benar
const parseHHMMSS = (timeString: string): number => {
  // Remove any extra spaces and ensure proper format
  const cleanTime = timeString.trim();
  
  // Strict HH:MM:SS format validation
  const hhmmssRegex = /^(\d{1,2}):(\d{2}):(\d{2})$/;
  const match = cleanTime.match(hhmmssRegex);
  
  if (match) {
    const [, hours, minutes, seconds] = match;
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const s = parseInt(seconds, 10);
    
    // Validate ranges
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
      const totalMinutes = h * 60 + m + Math.round(s / 60);
      console.log(`Successfully parsed HH:MM:SS: "${timeString}" -> ${h}h ${m}m ${s}s -> ${totalMinutes} minutes`);
      return totalMinutes;
    }
  }
  
  console.warn(`Invalid HH:MM:SS format: "${timeString}"`);
  return 0;
};

// Helper untuk membuat ID unik
export const mkId = (noCase: string, startIso: string | undefined | null): string => {
  const base = `${(noCase || '').trim()}|${(startIso || '').trim()}`;
  // Generate unique ID dengan timestamp dan random string untuk menghindari collision
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const hash = Array.from(base).reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  return `INC-${Math.abs(hash).toString(36)}-${timestamp}-${random}`;
};

// Helper untuk konversi durasi ke menit
export const toMinutes = (v: unknown): number => {
  if (v == null || v === '') return 0;
  if (v instanceof Date) return v.getUTCHours() * 60 + v.getUTCMinutes() + Math.round(v.getUTCSeconds() / 60);
  
  const s = String(v).trim();
  if (!s) return 0;
  
  // Handle Excel time serial numbers (e.g., 0.5 = 12:00, 0.25 = 6:00)
  const excelTime = Number(s);
  if (Number.isFinite(excelTime) && excelTime > 0 && excelTime < 1) {
    // Excel time: fraction of 24 hours
    const totalMinutes = Math.round(excelTime * 24 * 60);
    return totalMinutes;
  }
  
  // First, try to parse as HH:MM:SS format (prioritas utama untuk kolom L, M, Y, Z)
  const hhmmssResult = parseHHMMSS(s);
  if (hhmmssResult > 0) {
    return hhmmssResult;
  }
  
  // Handle HH:MM format (prioritas tinggi setelah HH:MM:SS)
  const hhmmRegex = /^(\d{1,2}):(\d{2})$/;
  const hhmmMatch = s.match(hhmmRegex);
  if (hhmmMatch) {
    const [, hours, minutes] = hhmmMatch;
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      const totalMinutes = h * 60 + m;
      console.log(`Parsed HH:MM format: "${s}" -> ${h}h ${m}m -> ${totalMinutes} minutes`);
      return totalMinutes;
    }
  }
  
  // Handle various time formats
  const timeFormats = [
    /^(\d+)h\s*(\d+)m$/, // Xh Ym
    /^(\d+)h$/, // Xh
    /^(\d+)m$/, // Xm
    /^(\d+)\s*hours?\s*(\d+)\s*minutes?$/i, // X hours Y minutes
    /^(\d+)\s*hours?$/i, // X hours
    /^(\d+)\s*minutes?$/i, // X minutes
  ];
  
  for (const format of timeFormats) {
    const match = s.match(format);
    if (match) {
      if (format.source.includes('h\\s*\\d+m') || format.source.includes('\\d+h\\s*\\d+m')) {
        // Xh Ym format
        const [, hours, minutes] = match;
        const totalMinutes = (+hours) * 60 + (+minutes);
        console.log(`Parsed Xh Ym format: "${s}" -> ${hours}h ${minutes}m -> ${totalMinutes} minutes`);
        return totalMinutes;
      } else if (format.source.includes('\\d+h$')) {
        // Xh format
        const [, hours] = match;
        const totalMinutes = (+hours) * 60;
        console.log(`Parsed Xh format: "${s}" -> ${hours}h -> ${totalMinutes} minutes`);
        return totalMinutes;
      } else if (format.source.includes('\\d+m$')) {
        // Xm format
        const [, minutes] = match;
        const totalMinutes = +minutes;
        console.log(`Parsed Xm format: "${s}" -> ${minutes}m -> ${totalMinutes} minutes`);
        return totalMinutes;
      } else if (format.source.includes('hours.*minutes')) {
        // X hours Y minutes format
        const [, hours, minutes] = match;
        const totalMinutes = (+hours) * 60 + (+minutes);
        console.log(`Parsed "X hours Y minutes" format: "${s}" -> ${hours}h ${minutes}m -> ${totalMinutes} minutes`);
        return totalMinutes;
      } else if (format.source.includes('hours')) {
        // X hours format
        const [, hours] = match;
        const totalMinutes = (+hours) * 60;
        console.log(`Parsed "X hours" format: "${s}" -> ${hours}h -> ${totalMinutes} minutes`);
        return totalMinutes;
      } else if (format.source.includes('minutes')) {
        // X minutes format
        const [, minutes] = match;
        const totalMinutes = +minutes;
        console.log(`Parsed "X minutes" format: "${s}" -> ${minutes}m -> ${totalMinutes} minutes`);
        return totalMinutes;
      }
    }
  }
  
  // Handle numeric values (assume minutes if reasonable, hours if large)
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n > 0 && n < 1000) {
      // Likely minutes
      console.log(`Parsed numeric as minutes: "${s}" -> ${Math.round(n)} minutes`);
      return Math.round(n);
    } else if (n >= 1000) {
      // Likely seconds, convert to minutes
      const minutes = Math.round(n / 60);
      console.log(`Parsed numeric as seconds: "${s}" -> ${minutes} minutes`);
      return minutes;
    }
  }
  
  // If we reach here, the format wasn't recognized
  console.warn(`Duration format not recognized: "${s}". Returning 0 minutes.`);
  return 0;
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
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})$/, // dd/mm/yy hh:mm:ss (format utama)
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/, // dd/mm/yyyy hh:mm:ss
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/, // dd/mm/yyyy hh:mm
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/, // yyyy-mm-dd hh:mm:ss
    /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/, // yyyy-mm-dd hh:mm
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/, // dd-mm-yyyy hh:mm:ss
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})$/, // dd-mm-yyyy hh:mm
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // dd/mm/yyyy
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, // dd/mm/yy
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // yyyy-mm-dd
  ];
  
  for (const format of formats) {
    const match = s.match(format);
    if (match) {
      if (match.length === 7) {
        // With time including seconds: dd/mm/yy hh:mm:ss or dd/mm/yyyy hh:mm:ss
        const [, day, month, year, hour, minute, second] = match;
        let fullYear = +year;
        if (fullYear < 100) {
          // Convert 2-digit year to 4-digit year (assume 20xx for years < 50, 19xx for years >= 50)
          fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
        }
        const date = new Date(fullYear, +month - 1, +day, +hour, +minute, +second);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } else if (match.length === 6) {
        // With time without seconds: dd/mm/yyyy hh:mm
        const [, day, month, year, hour, minute] = match;
        let fullYear = +year;
        if (fullYear < 100) {
          fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
        }
        const date = new Date(fullYear, +month - 1, +day, +hour, +minute);
        return isNaN(date.getTime()) ? null : date.toISOString();
      } else if (match.length === 4) {
        // Date only: dd/mm/yyyy or dd/mm/yy
        const [, day, month, year] = match;
        let fullYear = +year;
        if (fullYear < 100) {
          fullYear = fullYear < 50 ? 2000 + fullYear : 1900 + fullYear;
        }
        const date = new Date(fullYear, +month - 1, +day);
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
  console.log(`[saveIncidentsChunked] Starting to save ${rows.length} incidents in chunks of ${chunkSize}`);
  
  let totalSaved = 0;
  let totalChunks = Math.ceil(rows.length / chunkSize);
  
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunkIndex = Math.floor(i / chunkSize) + 1;
    const part = rows.slice(i, i + chunkSize);
    
    console.log(`[saveIncidentsChunked] Processing chunk ${chunkIndex}/${totalChunks} with ${part.length} incidents`);
    
    try {
      // Check for duplicate IDs in this chunk
      const ids = part.map(incident => incident.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.warn(`[saveIncidentsChunked] Duplicate IDs found in chunk ${chunkIndex}:`, 
          ids.filter((id, index) => ids.indexOf(id) !== index));
      }
      
      // Save to database
      const result = await db.incidents.bulkPut(part);
      totalSaved += part.length;
      
      console.log(`[saveIncidentsChunked] Chunk ${chunkIndex} saved successfully. Total saved so far: ${totalSaved}`);
      
      // Verify the save by counting records
      const totalInDb = await db.incidents.count();
      console.log(`[saveIncidentsChunked] Total incidents in database after chunk ${chunkIndex}: ${totalInDb}`);
      
    } catch (error) {
      console.error(`[saveIncidentsChunked] Error saving chunk ${chunkIndex}:`, error);
      throw error;
    }
  }
  
  // Final verification
  const finalCount = await db.incidents.count();
  console.log(`[saveIncidentsChunked] Final count in database: ${finalCount}, Expected: ${rows.length}`);
  
  if (finalCount !== rows.length) {
    console.warn(`[saveIncidentsChunked] DISCREPANCY DETECTED: Expected ${rows.length} but found ${finalCount} in database`);
    
    // Get all incidents to check for duplicates
    const allIncidents = await db.incidents.toArray();
    const incidentIds = allIncidents.map(inc => inc.id);
    const uniqueIncidentIds = new Set(incidentIds);
    
    console.log(`[saveIncidentsChunked] Unique incident IDs: ${uniqueIncidentIds.size}, Total incidents: ${allIncidents.length}`);
    
    if (uniqueIncidentIds.size !== allIncidents.length) {
      console.error(`[saveIncidentsChunked] DUPLICATE IDs FOUND: ${allIncidents.length - uniqueIncidentIds.size} duplicates`);
    }
  }
  
  return finalCount;
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

// Format durasi untuk display di tabel (HH:MM:SS)
export const formatDurationForDisplay = (minutes: number | null | undefined): string => {
  if (!minutes || minutes === 0) return '-';
  return formatDurationHMS(minutes);
};

// Generate UUID untuk batch ID
export const generateBatchId = (): string => {
  return 'batch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Clean duplicate incidents from database
export async function cleanDuplicateIncidents(): Promise<{ removed: number; remaining: number }> {
  console.log('[cleanDuplicateIncidents] Starting duplicate cleanup...');
  
  const allIncidents = await db.incidents.toArray();
  console.log(`[cleanDuplicateIncidents] Found ${allIncidents.length} total incidents`);
  
  // Group by No Case and Start Time to find duplicates
  const grouped = new Map<string, Incident[]>();
  
  allIncidents.forEach(incident => {
    const key = `${incident.noCase}|${incident.startTime}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(incident);
  });
  
  let duplicatesToRemove: string[] = [];
  
  grouped.forEach((incidents, key) => {
    if (incidents.length > 1) {
      // Keep the first one, remove the rest
      const toRemove = incidents.slice(1);
      duplicatesToRemove.push(...toRemove.map(inc => inc.id));
      console.log(`[cleanDuplicateIncidents] Found ${incidents.length} duplicates for key "${key}", keeping first, removing ${toRemove.length}`);
    }
  });
  
  if (duplicatesToRemove.length > 0) {
    console.log(`[cleanDuplicateIncidents] Removing ${duplicatesToRemove.length} duplicate incidents`);
    await db.incidents.bulkDelete(duplicatesToRemove);
  }
  
  const remaining = await db.incidents.count();
  console.log(`[cleanDuplicateIncidents] Cleanup complete. Removed: ${duplicatesToRemove.length}, Remaining: ${remaining}`);
  
  return { removed: duplicatesToRemove.length, remaining };
}

// Get database statistics for debugging
export async function getDatabaseStats(): Promise<{
  totalIncidents: number;
  uniqueNoCases: number;
  uniqueStartTimes: number;
  duplicateGroups: number;
}> {
  const allIncidents = await db.incidents.toArray();
  
  const uniqueNoCases = new Set(allIncidents.map(inc => inc.noCase)).size;
  const uniqueStartTimes = new Set(allIncidents.map(inc => inc.startTime)).size;
  
  // Count duplicate groups
  const grouped = new Map<string, Incident[]>();
  allIncidents.forEach(incident => {
    const key = `${incident.noCase}|${incident.startTime}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(incident);
  });
  
  const duplicateGroups = Array.from(grouped.values()).filter(group => group.length > 1).length;
  
  return {
    totalIncidents: allIncidents.length,
    uniqueNoCases,
    uniqueStartTimes,
    duplicateGroups
  };
}
