// src/utils/date.ts
export type DateInput = Date | string | number | null | undefined;

export function parseDateSafe(v: DateInput): Date | null {
  if (v == null) return null;
  if (v instanceof Date && !isNaN(v.valueOf())) return v;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.valueOf()) ? null : d;
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    const iso = new Date(s);
    if (!isNaN(iso.valueOf())) return iso;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const y = Number(m[3].length === 2 ? (Number(m[3]) + 2000) : m[3]);
      const mmFirstLikely = a <= 12 && (b > 12 || a !== b);
      const month = (mmFirstLikely ? a : b) - 1;
      const day = mmFirstLikely ? b : a;
      const d = new Date(y, month, day);
      return isNaN(d.valueOf()) ? null : d;
    }
  }
  return null;
}

export type DateRange = { start?: Date; end?: Date; inclusive?: boolean };

export function startOfDay(d: Date): Date { const r = new Date(d); r.setHours(0,0,0,0); return r; }
export function endOfDay(d: Date): Date { const r = new Date(d); r.setHours(23,59,59,999); return r; }

export function inRange(input: DateInput, range?: DateRange): boolean {
  if (!range) return true;
  const date = parseDateSafe(input);
  if (!date) return false;
  const inc = range.inclusive ?? true;
  if (range.start) {
    const s = startOfDay(range.start);
    if (inc ? date < s : date <= s) return false;
  }
  if (range.end) {
    const e = endOfDay(range.end);
    if (inc ? date > e : date >= e) return false;
  }
  return true;
}

export function createDateFilter(range?: DateRange) {
  return (d: DateInput) => inRange(d, range);
}

/** month = 1..12 atau "ALL"; year = tahun atau "ALL" */
export function monthYearToRange(month: number | 'ALL', year: number | 'ALL'): DateRange | undefined {
  if (year === 'ALL') return undefined;
  if (typeof month === 'number') {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start, end, inclusive: true };
  }
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { start, end, inclusive: true };
}
