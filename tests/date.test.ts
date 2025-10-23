// tests/date.test.ts
import { describe, it, expect } from 'vitest';
import { parseDateSafe, monthYearToRange, inRange } from '../src/utils/date';

describe('parseDateSafe', () => {
  it('parses ISO', () => {
    const d = parseDateSafe('2024-12-01T10:00:00Z');
    expect(d).toBeInstanceOf(Date);
  });
  it('parses mm/dd/yyyy', () => {
    const d = parseDateSafe('12/25/2024');
    expect(d).toBeInstanceOf(Date);
  });
  it('invalid -> null', () => {
    expect(parseDateSafe('not a date')).toBeNull();
  });
});

describe('monthYearToRange', () => {
  it('ALL year -> undefined', () => {
    expect(monthYearToRange('ALL' as any, 'ALL' as any)).toBeUndefined();
  });
  it('month+year limits correctly', () => {
    const r = monthYearToRange(2, 2024)!;
    expect(inRange('2024-02-15', r)).toBe(true);
    expect(inRange('2024-03-01', r)).toBe(false);
  });
});
