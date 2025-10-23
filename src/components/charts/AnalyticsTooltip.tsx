// src/components/charts/AnalyticsTooltip.tsx
import { TooltipProps } from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

export function AnalyticsTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded border bg-background px-3 py-2 text-sm shadow">
      {label && <div className="mb-1 font-medium">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4">
          <span className="opacity-70">{p.name}</span>
          <span>{String(p.value ?? '')}</span>
        </div>
      ))}
    </div>
  );
}
