import { describe, it, expect } from 'vitest';
import { parseDateSafe } from '../../utils/date';

describe('parseDateSafe', () => {
  it('returns null for invalid date', () => { expect(parseDateSafe('not a date')).toBeNull(); });
  it('parses ISO date', () => { expect(parseDateSafe('2024-01-02')?.getFullYear()).toBe(2024); });
});
