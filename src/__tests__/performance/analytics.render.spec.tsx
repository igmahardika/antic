import { describe, it, expect } from 'vitest';

describe('Performance tests', () => {
  it('basic performance test', () => {
    const start = performance.now();
    // Simple operation
    const result = Array.from({ length: 1000 }, (_, i) => i * 2);
    const end = performance.now();
    
    expect(result.length).toBe(1000);
    expect(end - start).toBeLessThan(100); // Should be very fast
  });
});
