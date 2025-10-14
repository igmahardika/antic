export const toPct = (num: number, den: number): string =>
  den > 0 ? ((num / den) * 100).toFixed(1) + '%' : '0%';

export const guardNumber = (v: unknown, def = 0): number =>
  typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v) ? v : def;
