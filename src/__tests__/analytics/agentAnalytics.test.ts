import { describe, it, expect } from 'vitest';
import { guardNumber } from '../../utils/number';

describe('AHT Formula', () => {
  it('validates/guards durations', () => {
    const durations = [2.5, 3, 1.5, 4, 2].map(d => Math.max(0, guardNumber(d)));
    const avg = durations.reduce((a,b)=>a+b,0)/durations.length;
    expect(avg).toBeCloseTo(2.6, 1);
  });
});