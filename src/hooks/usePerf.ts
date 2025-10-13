import { useEffect, useRef, useState } from 'react';

type Metric = { name: string; value: number };

export function usePerf(name: string) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const prefix = useRef(`${name}:${Date.now()}`);
  
  useEffect(() => {
    const start = `${prefix.current}:start`;
    performance.mark(start);
    
    return () => {
      const end = `${prefix.current}:end`;
      performance.mark(end);
      performance.measure(prefix.current, start, end);
      const m = performance.getEntriesByName(prefix.current).at(0);
      if (m) setMetrics([{ name, value: m.duration }]);
      performance.clearMarks(start);
      performance.clearMarks(end);
      performance.clearMeasures(prefix.current);
    };
  }, [name]);
  
  return metrics;
}
