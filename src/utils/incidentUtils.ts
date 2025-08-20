import { db } from '@/lib/db';
import type { Incident } from '@/types/incident';

export const normalizeNCAL = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (['blue','b'].includes(s)) return 'Blue';
  if (['yellow','y'].includes(s)) return 'Yellow';
  if (['orange','o'].includes(s)) return 'Orange';
  if (['red','r'].includes(s)) return 'Red';
  if (['black','bl'].includes(s)) return 'Black';
  return null;
};

export const toMinutes = (v: unknown): number => {
  if (v == null || v === '') return 0;
  if (v instanceof Date) return v.getUTCHours()*60 + v.getUTCMinutes() + Math.round(v.getUTCSeconds()/60);
  const s = String(v).trim();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) return (+m[1])*60 + (+m[2]) + Math.round((+m[3]||0)/60);
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

// Mendukung: Date | Excel serial (number) | "DD/MM/YY[YY] HH:MM[:SS]" | string ISO
export const parseDateSafe = (v: any): string | null => {
  if (v == null || v === '') return null;
  if (v instanceof Date) return new Date(v).toISOString();
  if (typeof v === 'number') {
    // Excel serial date: days since 1899-12-30 UTC
    const base = new Date(Date.UTC(1899, 11, 30));
    return new Date(base.getTime() + v * 86400000).toISOString();
    // catatan: jika v termasuk fraksi, tetap akurat ke jam/menit
  }
  const str = String(v).trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(str);
  if (m) {
    const d = +m[1], mo = +m[2]-1, yr = +m[3] < 100 ? 2000 + (+m[3]) : +m[3];
    const hh = +(m[4]||0), mm = +(m[5]||0), ss = +(m[6]||0);
    return new Date(Date.UTC(yr, mo, d, hh, mm, ss)).toISOString();
  }
  const dt = new Date(str);
  return isNaN(+dt) ? null : dt.toISOString();
};

// ID berbasis NCAL|Start|Site (No Case tidak dijadikan acuan unik)
export const mkId = (base: string) =>
  'INC-' + Array.from(base).reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0)|0,0) + '-' + base.length;

// Simpan chunked + verifikasi
export async function saveIncidentsChunked(rows: Incident[], chunkSize = 2000) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await db.incidents.bulkPut(rows.slice(i, i + chunkSize));
  }
  const finalCount = await db.incidents.count();
  console.log(`[INCIDENT IMPORT] Final DB count: ${finalCount}`);
  return finalCount;
}
