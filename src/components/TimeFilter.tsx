import React from 'react';
import { Calendar } from 'lucide-react';
import * as Select from '@radix-ui/react-select';
import { Button } from './ui/button';

interface TimeFilterProps {
  startMonth: string | null;
  setStartMonth: (v: string | null) => void;
  endMonth: string | null;
  setEndMonth: (v: string | null) => void;
  selectedYear: string | null;
  setSelectedYear: (v: string | null) => void;
  monthOptions: { value: string, label: string }[];
  allYearsInData: string[];
  onRefresh?: () => void;
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function normalizeMonthOptions(monthOptions: { value: string, label: string }[]): { value: string, label: string }[] {
  return monthOptions.map(opt => {
    // Jika label sudah nama bulan, biarkan
    if (MONTH_LABELS.includes(opt.label)) return opt;
    // Jika value berupa angka 01-12, ubah label ke nama bulan
    const idx = parseInt(opt.value, 10) - 1;
    if (idx >= 0 && idx < 12) {
      return { value: opt.value, label: MONTH_LABELS[idx] };
    }
    return opt;
  });
}

function RadixSelect({ value, onValueChange, options, placeholder }: { value: string | null, onValueChange: (v: string) => void, options: { value: string, label: string }[], placeholder: string }) {
  return (
    <Select.Root value={value ?? ''} onValueChange={onValueChange}>
      <Select.Trigger className="text-xs h-8 px-4 border border-blue-200 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-400 min-w-[100px] transition-all flex items-center justify-between">
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="ml-2">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="z-50 mt-1 w-32 bg-white dark:bg-zinc-800 border rounded-lg shadow-lg max-h-60 overflow-auto text-xs">
          <Select.Viewport>
            {options.map(opt => (
              <Select.Item key={opt.value} value={opt.value} className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded flex items-center">
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

const TimeFilter: React.FC<TimeFilterProps> = ({
  startMonth, setStartMonth, endMonth, setEndMonth, selectedYear, setSelectedYear, monthOptions, allYearsInData
}) => (
  <div className="flex items-center gap-3 p-2 bg-white/70 dark:bg-zinc-900/70 rounded-xl shadow border border-gray-100 dark:border-zinc-800 mb-4">
    <Calendar className="h-4 w-4 text-blue-400 mr-1" />
    <span className="text-xs font-semibold text-gray-600 dark:text-gray-200 mr-1">Time:</span>
    <RadixSelect
      value={startMonth}
      onValueChange={setStartMonth}
      options={normalizeMonthOptions(monthOptions)}
      placeholder="Start Month"
    />
    <RadixSelect
      value={endMonth}
      onValueChange={setEndMonth}
      options={normalizeMonthOptions(monthOptions)}
      placeholder="End Month"
    />
    <RadixSelect
      value={selectedYear}
      onValueChange={setSelectedYear}
      options={[{ value: 'ALL', label: 'All Years' }, ...allYearsInData.map(y => ({ value: y, label: y }))]}
      placeholder="Year"
    />
  </div>
);

export default TimeFilter; 