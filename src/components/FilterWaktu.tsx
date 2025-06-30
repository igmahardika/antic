import React from 'react';
import { Listbox } from '@headlessui/react';
import { Calendar } from 'react-feather';
import { Button } from '@/components/ui/button';

export const monthOptions = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export interface IFilterValues {
  startMonth: string | null;
  endMonth: string | null;
  year: string | null;
}

interface FilterWaktuProps {
  filters: IFilterValues;
  setFilters: (filters: IFilterValues) => void;
  allYearsInData: string[];
  onRefresh: () => void;
}

const FilterWaktu: React.FC<FilterWaktuProps> = ({ filters, setFilters, allYearsInData, onRefresh }) => (
  <div className="flex flex-wrap items-center gap-3 p-4 bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 mb-6">
    <Calendar className="h-5 w-5 text-blue-500 mr-2" />
    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 mr-2">Time Filter:</span>
    
    <Listbox value={filters.startMonth} onChange={value => setFilters({ ...filters, startMonth: value })}>
      <div className="relative">
        <Listbox.Button className="text-sm h-9 px-4 py-2 border border-blue-200 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-400 min-w-[100px] transition-all">
          {filters.startMonth ? monthOptions.find(m => m.value === filters.startMonth)?.label : 'Start Month'}
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 w-32 bg-white dark:bg-zinc-800 border rounded-lg shadow-lg max-h-60 overflow-auto text-sm">
          {monthOptions.map(month => (
            <Listbox.Option key={month.value} value={month.value} className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded">
              {month.label}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
    
    <Listbox value={filters.endMonth} onChange={value => setFilters({ ...filters, endMonth: value })}>
      <div className="relative">
        <Listbox.Button className="text-sm h-9 px-4 py-2 border border-blue-200 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-400 min-w-[100px] transition-all">
          {filters.endMonth ? monthOptions.find(m => m.value === filters.endMonth)?.label : 'End Month'}
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 w-32 bg-white dark:bg-zinc-800 border rounded-lg shadow-lg max-h-60 overflow-auto text-sm">
          {monthOptions.map(month => (
            <Listbox.Option key={month.value} value={month.value} className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded">
              {month.label}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
    
    <Listbox value={filters.year} onChange={value => setFilters({ ...filters, year: value })}>
      <div className="relative">
        <Listbox.Button className="text-sm h-9 px-4 py-2 border border-blue-200 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-blue-400 min-w-[100px] transition-all">
          {filters.year || 'Year'}
        </Listbox.Button>
        <Listbox.Options className="absolute z-10 mt-1 w-28 bg-white dark:bg-zinc-800 border rounded-lg shadow-lg max-h-60 overflow-auto text-sm">
          {allYearsInData.map(year => (
            <Listbox.Option key={year} value={year} className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded">
              {year}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
    
    <Button size="sm" className="ml-3 h-9 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold shadow transition-all" onClick={onRefresh} variant="secondary">Refresh</Button>
  </div>
);

export default FilterWaktu; 