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
    className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 flex flex-col min-h-[180px] transition-all duration-300 min-w-0 overflow-hidden
      ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]' : ''}
      ${active ? 'ring-2 ring-blue-500 shadow-2xl' : ''}
      ${className}`}
    onClick={onClick}
    tabIndex={onClick ? 0 : undefined}
    role={onClick ? 'button' : undefined}
    aria-pressed={active}
  >
    <div className="flex items-center gap-4 mb-2">
      <div
        className={`w-12 h-12 min-w-12 min-h-12 rounded-xl flex items-center justify-center ${iconBg} shadow-lg ring-2 ring-white`}
      >
        <span className="text-white" style={{ fontSize: 28 }}>{icon}</span>
      </div>
      <div className="flex-1 flex items-center">
        <span className="text-xs sm:text-sm md:text-base font-semibold uppercase tracking-wide break-words whitespace-normal">
          {title}
        </span>
        {badge && (
          <span
            className={`ml-2 px-3 py-1 rounded-lg text-xs font-bold text-white ${badgeColor}`}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
    <div className="text-base md:text-lg lg:text-xl font-extrabold break-words whitespace-normal min-h-[40px] flex items-center">
      {value}
      {subvalue && <span className="text-blue-600 font-bold ml-2">{subvalue}</span>}
    </div>
    <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 break-words whitespace-normal">
      {description}
    </div>
  </div>
);

export default SummaryCard; 