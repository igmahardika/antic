import React from 'react';
import { cn } from '@/lib/utils';

// Example usage:
// <SummaryCard bg="from-blue-200 to-blue-100 text-blue-900" ... />
// <SummaryCard bg="from-green-200 to-green-100 text-green-900" ... />
// <SummaryCard bg="from-purple-200 to-purple-100 text-purple-900" ... />

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  description?: string;
  bg?: string; // Tailwind gradient class
  iconBg?: string; // Tailwind bg class
  className?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  label,
  value,
  description,
  // Default: sharper blue gradient for light mode
  bg = 'bg-white/30 backdrop-blur-lg border border-white/50',
  iconBg = 'bg-blue-100 dark:bg-blue-900/40',
  className = '',
}) => (
  <div className={cn(
    'rounded-2xl shadow-lg p-6 flex flex-row items-center gap-4',
    bg,
    className
  )}>
    <div className={cn('flex items-center justify-center w-12 h-12 min-w-12 min-h-12 rounded-xl', iconBg)}>
      {icon}
    </div>
    <div>
      <span className="text-xs sm:text-sm md:text-base font-semibold uppercase tracking-wide">{label}</span>
      <div className="text-xs sm:text-sm md:text-base lg:text-lg font-extrabold">{value}</div>
      {description && <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 break-words whitespace-normal">{description}</div>}
    </div>
  </div>
);

export default SummaryCard; 