import React from 'react';
import { cn } from '@/lib/utils';

// This standardized SummaryCard is based on the new design guidelines.
// It enforces a consistent layout, typography, and spacing for all summary metrics.
// The icon background color can be customized via the `iconBg` prop for semantic coloring.
// Example: <SummaryCard iconBg="bg-green-100 dark:bg-green-900/40" ... />

interface SummaryCardProps {
  icon: React.ReactNode;
  iconBg: string; // Tailwind bg color, e.g. "bg-blue-500"
  title: string;
  badge?: string;
  badgeColor?: string; // Tailwind bg color, e.g. "bg-blue-500"
  value: string | number | React.ReactNode;
  subvalue?: string;
  description: string;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  iconBg,
  title,
  badge,
  badgeColor = "bg-blue-500",
  value,
  subvalue,
  description,
  className = "",
  onClick,
  active = false,
}) => (
  <div
    className={`bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-3 flex flex-col min-h-[120px] w-[160px] flex-shrink-0 transition-all duration-300 overflow-hidden
      ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]' : ''}
      ${active ? '' : ''}
      ${className}`}
    onClick={onClick}
    tabIndex={onClick ? 0 : undefined}
    role={onClick ? 'button' : undefined}
    aria-pressed={active}
  >
    <div className="flex items-start gap-2 mb-2">
      <div
        className={`w-8 h-8 min-w-8 min-h-8 rounded-lg flex items-center justify-center ${iconBg} shadow-md flex-shrink-0`}
      >
        <span className="text-white" style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide break-words leading-tight block">
          {title}
        </span>
        {badge && (
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-bold text-white ${badgeColor}`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-end min-h-[32px] mb-2">
      <span className="text-lg font-mono font-extrabold tracking-tight break-words leading-tight">
        {value}
      </span>
      {subvalue && (
        <span className="text-sm font-semibold text-gray-500 dark:text-gray-300 ml-1 mb-0.5 align-bottom">
          {subvalue}
        </span>
      )}
    </div>
    <div className="text-[10px] text-gray-700 dark:text-gray-300 break-words leading-tight flex-1">
      {description}
    </div>
  </div>
);

export default SummaryCard; 