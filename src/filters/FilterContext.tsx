// src/filters/FilterContext.tsx
import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { DateRange, monthYearToRange, createDateFilter } from '../utils/date';
import { useSearchParams } from 'react-router-dom';

export type Filters = {
  year: number | 'ALL';
  month: number | 'ALL'; // 1-12 atau 'ALL'
  dateRange?: DateRange; // override month/year
  status?: string[];
  agentIds?: string[];
  query?: string;
};

const DEFAULTS: Filters = { year: 'ALL', month: 'ALL' };

const Ctx = createContext<{
  filters: Filters;
  setFilters: (next: Partial<Filters>) => void;
  matchesDate: (d: any) => boolean;
} | null>(null);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<Filters>(() => {
    const yearStr = params.get('year');
    const monthStr = params.get('month');
    const year = yearStr === 'ALL' ? 'ALL' : yearStr ? Number(yearStr) : 'ALL';
    const month = monthStr === 'ALL' ? 'ALL' : monthStr ? Number(monthStr) : 'ALL';
    const status = params.getAll('status');
    const agentIds = params.getAll('agentId');
    const query = params.get('q') || undefined;
    return { ...DEFAULTS, year, month, status: status.length ? status : undefined, agentIds: agentIds.length ? agentIds : undefined, query };
  }, [params]);

  const setFilters = useCallback((next: Partial<Filters>) => {
    const merged: Filters = { ...filters, ...next };
    const p = new URLSearchParams();
    p.set('year', String(merged.year));
    p.set('month', String(merged.month));
    merged.status?.forEach((s) => p.append('status', s));
    merged.agentIds?.forEach((a) => p.append('agentId', a));
    if (merged.query) p.set('q', merged.query);
    setParams(p, { replace: true });
  }, [filters, setParams]);

  const matchesDate = useMemo(() => {
    const range = filters.dateRange ?? monthYearToRange(filters.month, filters.year);
    return createDateFilter(range);
  }, [filters.dateRange, filters.month, filters.year]);

  return <Ctx.Provider value={{ filters, setFilters, matchesDate }}>{children}</Ctx.Provider>;
};

export function useFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
