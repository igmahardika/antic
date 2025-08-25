import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTicketAnalytics } from './TicketAnalyticsContext';
import SummaryCard from './ui/SummaryCard';
import TimeFilter from './TimeFilter';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import BarChartIcon from '@mui/icons-material/BarChart';
import LabelIcon from '@mui/icons-material/Label';
import WarningIcon from '@mui/icons-material/Warning';
import ShowChartIcon from '@mui/icons-material/ShowChart';

import AssignmentIcon from '@mui/icons-material/Assignment';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend as RechartsLegend, Tooltip as RechartsTooltip, BarChart, Bar } from 'recharts';
import PageWrapper from './PageWrapper';
import { PDFDownloadLink, Document, Page, Text, View } from '@react-pdf/renderer';
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Badge } from './ui/badge';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

// type ClassificationDetails = {
//   count: number;
//   sub: { [key: string]: number };
//   trendline?: { labels: string[]; data: number[] };
//   trendPercent?: number;
// };



type TicketAnalyticsProps = {
  data?: any;
};

const MONTH_OPTIONS = [
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

// Palet warna modern untuk area chart
const AREA_COLORS = [
  '#11A69C', // teal/cyan
  '#0081FE', // biru
  '#924AF7', // ungu
  '#FBBF24', // kuning
  '#FF5383', // merah muda neon
  '#4ADE80', // hijau segar
  '#F2681F', // oranye
];

// Helper: convert chart.js-like data to recharts format
function toRechartsData(labels: string[], datasets: any[]) {
  // Datasets sekarang: [closed, incoming] sesuai urutan baru
  return labels.map((label, i) => ({
    label,
    closed: datasets[0]?.data[i] ?? 0,
    incoming: datasets[1]?.data[i] ?? 0,
  }));
}

// ====================== ACCURATE TIME HELPERS (NEW) ======================
/** Parse Date dengan fallback aman untuk string "YYYY-MM-DD HH:mm:ss" */
function parseDateSafe(dt?: string | Date | null): Date | null {
  if (!dt) return null;
  if (dt instanceof Date) return isNaN(dt.getTime()) ? null : dt;
  // Jadikan "2025-07-01 08:10:00" valid di semua browser
  const isoish = dt.includes('T') || dt.includes('Z') ? dt : dt.replace(' ', 'T');
  const d = new Date(isoish);
  return isNaN(d.getTime()) ? null : d;
}

/** Ambil durasi (jam) akurat: pakai duration.rawHours jika ada, fallback ke (close - open) */
function toRawHours(t: any): number | null {
  if (t?.duration && typeof t.duration.rawHours === 'number') return t.duration.rawHours;
  const open = parseDateSafe(t?.openTime);
  const close = parseDateSafe(t?.closeTime);
  if (!open || !close) return null;
  const diffH = (close.getTime() - open.getTime()) / 3_600_000;
  return Number.isFinite(diffH) ? Math.max(0, diffH) : null;
}

/** Percentile util (0..1) untuk array angka */
function percentile(values: number[], p: number): number | null {
  const v = (values || []).filter(n => Number.isFinite(n)).sort((a,b)=>a-b);
  if (!v.length) return null;
  const idx = (v.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return v[lo];
  return v[lo] + (v[hi] - v[lo]) * (idx - lo);
}

// ====================== SHIFT MAPPING (UPDATE) ======================
/** Standar: Pagi 06:00–13:59, Sore 14:00–21:59, Malam 22:00–05:59 */
function getShift(dateStr: string) {
  const d = parseDateSafe(dateStr);
  if (!d) return 'Unknown';
  const h = d.getHours();
  if (h >= 6 && h < 14) return 'Pagi';
  if (h >= 14 && h < 22) return 'Sore';
  // 22:00–23:59 & 00:00–05:59
  return 'Malam';
}
// ====================================================================



// Automated Insight Generator Hook
function useInsightFromTicketAnalytics({ monthlyStatsData, classificationData, customerStats }) {
  // Bulan tersibuk
  let busiestMonth = null;
  if (monthlyStatsData && monthlyStatsData.labels && monthlyStatsData.labels.length > 0) {
    const counts = monthlyStatsData.datasets[0]?.data || [];
    if (counts.length > 0) {
      const maxCount = Math.max(...counts);
      const maxIdx = counts.indexOf(maxCount);
      const prev = counts[maxIdx - 1] || 0;
      const trend = prev > 0 ? ((maxCount - prev) / prev) * 100 : null;
      busiestMonth = {
        label: monthlyStatsData.labels[maxIdx],
        count: maxCount,
        trend: trend !== null ? trend.toFixed(1) : null
      };
    }
  }
  // Kategori dominan
  let topCategory = null;
  if (classificationData && Object.keys(classificationData).length > 0) {
    const arr = Object.entries(classificationData).map(([cat, d]) => {
      const det = d as any;
      return { cat, count: det.count, trend: det.trendPercent, topSub: det.topSubCategory };
    });
    arr.sort((a, b) => b.count - a.count);
    if (arr.length > 0) {
      topCategory = arr[0];
    }
  }
  // Pelanggan kronis/ekstrem
  let chronicPercent = null;
  if (customerStats && customerStats.length > 0) {
    const chronic = customerStats.filter(c => c.repClass === 'Kronis' || c.repClass === 'Ekstrem').length;
    chronicPercent = ((chronic / customerStats.length) * 100).toFixed(1);
  }
  return { busiestMonth, topCategory, chronicPercent };
}

// Helper: format HH:MM:SS dari jam desimal
function formatDurationHMS(hours: number): string {
  if (!hours || isNaN(hours) || hours < 0) return '00:00:00';
  const totalSeconds = Math.floor(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}



// Helper: status badge (untuk PDF export, harus return style object)
const pdfStatusBadge = status => {
  const s = (status || '').toLowerCase();
  if (s === 'closed') return { backgroundColor: '#bbf7d0', color: '#166534', borderRadius: 4, padding: '2px 6px', fontWeight: 700, fontSize: 9 };
  if (s === 'open') return { backgroundColor: '#fde68a', color: '#92400e', borderRadius: 4, padding: '2px 6px', fontWeight: 700, fontSize: 9 };
  if (s === 'escalated' || s === 'overdue') return { backgroundColor: '#fecaca', color: '#991b1b', borderRadius: 4, padding: '2px 6px', fontWeight: 700, fontSize: 9 };
  return { backgroundColor: '#f3f4f6', color: '#334155', borderRadius: 4, padding: '2px 6px', fontWeight: 700, fontSize: 9 };
};

const TicketAnalytics = ({}: TicketAnalyticsProps) => {
  // Semua hook harus di awal



  const [normalizePer1000, setNormalizePer1000] = useState(false);
  const {
    ticketAnalyticsData,
    gridData, // filtered tickets
    startMonth, setStartMonth,
    endMonth, setEndMonth,
    selectedYear, setSelectedYear,
    allYearsInData,
    refresh
  } = useTicketAnalytics() || {};
  const allCustomers = useLiveQuery(() => db.customers.toArray(), []);
  const customerJenisKlienMap = useMemo(() => {
    // Normalize various labels/typos to canonical buckets
    const normalizeType = (val: string): string => {
      const s = (val || '').toString().trim().toLowerCase();
      if (!s) return 'Unknown';
      if (/(dedicated|ddi?c?at|dedi\b)/.test(s)) return 'Dedicated';
      if (/(broadband\s*business|broadband\s*bisnis|bb\s*business|biz\s*broadband|broadband\s*buss?iness)/.test(s)) return 'Broadband Business';
      if (/\bbroad\s*band\b|\bbroadband\b/.test(s)) return 'Broadband';
      return 'Unknown';
    };
    const map = new Map<string, string>();
    (allCustomers || []).forEach(c => {
      map.set((c.nama || '').trim().toLowerCase(), normalizeType((c as any).jenisKlien));
    });
    return map;
  }, [allCustomers]);
  const customerMonthMap = useMemo(() => {
    // Build active months per customer from uploaded Customer Data sheets.
    // Try to infer month from several possible fields or from the saved id that contains sheet name.
    const MONTH_NAME_ID: Record<string, string> = {
      januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
    };
    function normalizeSheetToMonth(sheet: string): string | null {
      const s = (sheet || '').toLowerCase().trim();
      if (!s) return null;
      // Case 1: already 'YYYY-MM'
      const m1 = s.match(/(20\d{2})[-_/ ](0[1-9]|1[0-2])/);
      if (m1) return `${m1[1]}-${m1[2]}`;
      // Case 2: contains month name (assume 2025 if year missing)
      const monthName = Object.keys(MONTH_NAME_ID).find(n => s.includes(n));
      if (monthName) {
        const mm = MONTH_NAME_ID[monthName];
        const y = (s.match(/\b(20\d{2})\b/) || [])[1] || '2025';
        return `${y}-${mm}`;
      }
      return null;
    }

    const monthSetByCustomer = new Map<string, Set<string>>();
    (allCustomers || []).forEach(c => {
      const nameKey = (c.nama || '').trim().toLowerCase();
      if (!nameKey) return;
      const cAny = c as any;
      const monthSet = monthSetByCustomer.get(nameKey) || new Set<string>();

      // 1) Explicit arrays on record
      const arrayFields = ['bulan', 'periode', 'months', 'activeMonths'];
      for (const f of arrayFields) {
        const val = cAny?.[f];
        if (Array.isArray(val)) {
          val.forEach((v: string) => {
            const norm = normalizeSheetToMonth(String(v));
            if (norm) monthSet.add(norm);
          });
        }
      }

      // 2) Single string fields that may contain month info
      const singleFields = ['sheet', 'Sheet', 'periode', 'bulan', 'sheetName'];
      for (const f of singleFields) {
        const v = cAny?.[f];
        if (typeof v === 'string') {
          const norm = normalizeSheetToMonth(v);
          if (norm) monthSet.add(norm);
        }
      }

      // 3) Derive from stored id which originally encodes sheetName + index + nama
      const id: string = String((c as any).id || (c as any).customerId || '');
      if (id) {
        // Try robust extraction: prefer YYYY-MM if present anywhere in id
        let canonical = normalizeSheetToMonth(id);
        if (!canonical) {
          const sheetPart = id.split(`-${(c as any).nama || ''}`)[0] || id; // fallback
          const firstSeg = id.split('-')[0];
          canonical = normalizeSheetToMonth(sheetPart) || normalizeSheetToMonth(firstSeg);
        }
        if (canonical) monthSet.add(canonical);
      }

      if (monthSet.size > 0) {
        monthSetByCustomer.set(nameKey, monthSet);
      }
    });

    const map = new Map<string, string[]>();
    monthSetByCustomer.forEach((set, key) => map.set(key, Array.from(set).sort()));
    return map;
  }, [allCustomers]);

  // Row-based monthly client count from uploaded sheets (no dedup by name)
  const customerMonthRowCount = useMemo(() => {
    const MONTH_NAME_ID: Record<string, string> = {
      januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
    };
    const norm = (sheet: string): string | null => {
      const s = (sheet || '').toLowerCase().trim();
      if (!s) return null;
      const m1 = s.match(/(20\d{2})[-_/ ](0[1-9]|1[0-2])/);
      if (m1) return `${m1[1]}-${m1[2]}`;
      const monthName = Object.keys(MONTH_NAME_ID).find(n => s.includes(n));
      if (monthName) {
        const mm = MONTH_NAME_ID[monthName];
        const y = (s.match(/\b(20\d{2})\b/) || [])[1] || '2025';
        return `${y}-${mm}`;
      }
      return null;
    };
    const map = new Map<string, number>();
    (allCustomers || []).forEach(c => {
      const id: string = String((c as any).id || (c as any).customerId || '');
      const sheetPart = id.split('-')[0] || id;
      const canon = norm(sheetPart) || norm(id);
      if (!canon) return;
      map.set(canon, (map.get(canon) || 0) + 1);
    });
    return map;
  }, [allCustomers]);

  // Row-based monthly client count per Service Type (from uploaded sheets)
  const customerMonthRowCountByType = useMemo(() => {
    const MONTH_NAME_ID: Record<string, string> = {
      januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
    };
    const normMonth = (sheet: string): string | null => {
      const s = (sheet || '').toLowerCase().trim();
      if (!s) return null;
      const m1 = s.match(/(20\d{2})[-_/ ](0[1-9]|1[0-2])/);
      if (m1) return `${m1[1]}-${m1[2]}`;
      const monthName = Object.keys(MONTH_NAME_ID).find(n => s.includes(n));
      if (monthName) {
        const mm = MONTH_NAME_ID[monthName];
        const y = (s.match(/\b(20\d{2})\b/) || [])[1] || '2025';
        return `${y}-${mm}`;
      }
      return null;
    };
    const normalizeType = (val: string): string => {
      const s = (val || '').toString().trim().toLowerCase();
      if (!s) return 'Unknown';
      if (/(dedicated|ddi?c?at|dedi\b)/.test(s)) return 'Dedicated';
      if (/(broadband\s*business|broadband\s*bisnis|bb\s*business|biz\s*broadband|broadband\s*buss?iness)/.test(s)) return 'Broadband Business';
      if (/\bbroad\s*band\b|\bbroadband\b/.test(s)) return 'Broadband';
      return 'Unknown';
    };
    const map = new Map<string, { [k: string]: number }>();
    (allCustomers || []).forEach(c => {
      const id: string = String((c as any).id || (c as any).customerId || '');
      const sheetPart = id.split('-')[0] || id;
      const month = normMonth(sheetPart) || normMonth(id);
      if (!month) return;
      const type = normalizeType((c as any).jenisKlien);
      if (!map.has(month)) map.set(month, {});
      const obj = map.get(month)!;
      obj[type] = (obj[type] || 0) + 1;
    });
    return map;
  }, [allCustomers]);

  // Row-based monthly client count per Category (from uploaded sheets)
  const customerMonthRowCountByCategory = useMemo(() => {
    const MONTH_NAME_ID: Record<string, string> = {
      januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
    };
    const normMonth = (sheet: string): string | null => {
      const s = (sheet || '').toLowerCase().trim();
      if (!s) return null;
      const m1 = s.match(/(20\d{2})[-_/ ](0[1-9]|1[0-2])/);
      if (m1) return `${m1[1]}-${m1[2]}`;
      const monthName = Object.keys(MONTH_NAME_ID).find(n => s.includes(n));
      if (monthName) {
        const mm = MONTH_NAME_ID[monthName];
        const y = (s.match(/\b(20\d{2})\b/) || [])[1] || '2025';
        return `${y}-${mm}`;
      }
      return null;
    };
    const map = new Map<string, { [k: string]: number }>();
    (allCustomers || []).forEach(c => {
      const id: string = String((c as any).id || (c as any).customerId || '');
      const sheetPart = id.split('-')[0] || id;
      const month = normMonth(sheetPart) || normMonth(id);
      if (!month) return;
      const cat = ((c as any).kategori || 'Unknown') as string;
      if (!map.has(month)) map.set(month, {});
      const obj = map.get(month)!;
      obj[cat] = (obj[cat] || 0) + 1;
    });
    return map;
  }, [allCustomers]);
  const jenisKlienList = ['Broadband', 'Broadband Business', 'Dedicated'];
  const allCategories = useMemo(() => Array.from(new Set((allCustomers || []).map(c => c.kategori).filter(Boolean))), [allCustomers]);
  const customerKategoriMap = useMemo(() => {
    const map = new Map<string, string>();
    (allCustomers || []).forEach(c => {
      map.set((c.nama || '').trim().toLowerCase(), c.kategori);
    });
    return map;
  }, [allCustomers]);
  const kategoriList = allCategories;
  const gridData2025 = useMemo(() => (
    Array.isArray(gridData)
      ? gridData.filter(t => {
          const classification = (t.classification || '').trim().toLowerCase();
          return t.openTime &&
            t.openTime.startsWith('2025') &&
            classification !== 'gangguan diluar layanan' &&
            classification !== 'request';
        })
      : []
  ), [gridData]);
  const tiketPerJenisKlienPerBulan = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    gridData2025.forEach(t => {
      if (!t.openTime || !t.name) return;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nama = (t.name || '').trim().toLowerCase();
      const jenisKlien = customerJenisKlienMap.get(nama) || 'Unknown';
      if (!result[month]) result[month] = { Broadband: 0, 'Broadband Business': 0, Dedicated: 0, Unknown: 0 };
      if (jenisKlienList.includes(jenisKlien)) result[month][jenisKlien] += 1;
      else result[month].Unknown += 1;
    });
    return result;
  }, [gridData2025, customerJenisKlienMap]);
  const tiketPerKategoriPerBulan = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    gridData2025.forEach(t => {
      if (!t.openTime || !t.name) return;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nama = (t.name || '').trim().toLowerCase();
      const kategori = customerKategoriMap.get(nama) || 'Unknown';
      if (!result[month]) result[month] = {};
      if (!result[month][kategori]) result[month][kategori] = 0;
      result[month][kategori] += 1;
    });
    return result;
  }, [gridData2025, customerKategoriMap]);

  // Deklarasi variabel yang dibutuhkan sebelum digunakan
  const monthOptions = MONTH_OPTIONS;
  // Filtering logic for all years
  const filteredGridData = useMemo(() => {
    if (!gridData || !startMonth || !endMonth || !selectedYear) return [];
    if (selectedYear === 'ALL') {
      return gridData; // Sudah benar: tampilkan semua data
    }
    // Default: filter by year and month
    return gridData.filter(t => {
      if (!t.openTime) return false;
      const d = new Date(t.openTime);
      const y = Number(selectedYear);
      const mStart = Number(startMonth) - 1;
      const mEnd = Number(endMonth) - 1;
      return d.getFullYear() === y && d.getMonth() >= mStart && d.getMonth() <= mEnd;
    });
  }, [gridData, startMonth, endMonth, selectedYear]);

  // ====================== ADVANCED KPIs (NEW) ======================
  const slaHoursBySeverity: Record<string, number> = { P1: 4, P2: 8, P3: 24, P4: 48 };

  const advancedKpis = useMemo(() => {
    const periodTickets = Array.isArray(filteredGridData) ? filteredGridData : [];
    const allTickets = Array.isArray(gridData) ? gridData : [];

    const isClosed = (t: any) => {
      const s = String(t?.status || '').toLowerCase();
      return s === 'closed' || !!t?.closeTime;
    };

    // Close rate (periode)
    const totalPeriod = periodTickets.length;
    const closedPeriod = periodTickets.filter(isClosed).length;
    const closeRatePeriod = totalPeriod ? (closedPeriod / totalPeriod) * 100 : 0;

    // Resolution rate (lifetime)
    const totalAll = allTickets.length;
    const closedAll = allTickets.filter(isClosed).length;
    const resolutionRateLifetime = totalAll ? (closedAll / totalAll) * 100 : 0;

    // SLA attainment (periode, hanya tiket closed)
    const closedWithDur = periodTickets.filter(t => isClosed(t)).map(t => {
      const h = toRawHours(t);
      const sev = (t?.severity || 'P3').toString().toUpperCase();
      const slaH = slaHoursBySeverity[sev] ?? slaHoursBySeverity['P3'];
      return { h, slaH };
    });
    const slaOK = closedWithDur.filter(x => x.h != null && x.h <= x.slaH).length;
    const slaDen = closedWithDur.length || 1;
    const slaAttainment = (slaOK / slaDen) * 100;

    return {
      closeRatePeriod,
      resolutionRateLifetime,
      slaAttainment
    };
  }, [filteredGridData, gridData]);
  // =================================================================
  const monthlyStatsData = ticketAnalyticsData?.monthlyStatsChartData || { labels: [], datasets: [] };
  const classificationData = ticketAnalyticsData?.classificationAnalysis || {};
  const topComplaintsTable = ticketAnalyticsData?.topComplaintsTableData || [];

  // --- Repeat-Complainer Analysis ---
  // Agregasi per customer
  const customerStats = useMemo(() => {
    if (!Array.isArray(gridData)) return [];
    const map = new Map();
    gridData.forEach(t => {
      if (!t.customer) return;
      if (!map.has(t.customer)) {
        map.set(t.customer, { customer: t.customer, count: 0, repClass: t.repClass });
      }
      const obj = map.get(t.customer) as any;
      obj.count += 1;
      obj.repClass = t.repClass; // asumsikan repClass sudah final per customer
    });
    return Array.from(map.values());
  }, [gridData]);



  // Export to CSV
  const handleExportCSV = () => {
    if (!Array.isArray(gridData)) return;
    const rows = [
      ['Title', 'Value', 'Description'],
      ...gridData.map(stat => [stat.title, stat.value, stat.description])
    ];
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ticket-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Agent Ticket per Shift Chart (Area) ---
  type ShiftAreaDatum = { month: string; Pagi: number; Sore: number; Malam: number };
  const agentShiftAreaData: ShiftAreaDatum[] = useMemo(() => {
    if (!Array.isArray(gridData)) return [];
    // { [month]: { Pagi: 0, Sore: 0, Malam: 0 } }
    const map: Record<string, ShiftAreaDatum> = {};
    gridData.forEach(t => {
      if (!t.openTime) return;
      const d = new Date(t.openTime);
      if (isNaN(d.getTime())) return;
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const shift = getShift(t.openTime);
      if (!map[month]) map[month] = { month, Pagi: 0, Sore: 0, Malam: 0 };
      map[month][shift] = (map[month][shift] || 0) + 1;
    });
    // Urutkan bulan
    return (Object.values(map) as ShiftAreaDatum[]).sort((a, b) => a.month.localeCompare(b.month));
  }, [gridData]);

  // VALIDASI DISTRIBUSI SHIFT DAN PARSING OPENTIME
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    try {
      const shiftCount = { Pagi: 0, Sore: 0, Malam: 0, Unknown: 0 };
      (Array.isArray(gridData) ? gridData : []).forEach(t => {
        const shift = getShift(t.openTime);
        shiftCount[shift] = (shiftCount[shift] || 0) + 1;
      });
      console.log('Distribusi tiket per shift:', shiftCount);
      console.log('Contoh parsing openTime:', (Array.isArray(gridData) ? gridData.slice(0, 10) : []).map(t => ({ openTime: t.openTime, shift: getShift(t.openTime) })));
    } catch (e) { console.error('Validasi shift error:', e); }
  }

  // VALIDASI LANJUTAN: Print 20 tiket pertama per shift ke console
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    try {
      const shiftBuckets = { Pagi: [], Sore: [], Malam: [], Unknown: [] };
      (Array.isArray(gridData) ? gridData : []).forEach(t => {
        const shift = getShift(t.openTime);
        if (shiftBuckets[shift]) shiftBuckets[shift].push(t);
        else shiftBuckets.Unknown.push(t);
      });
      ['Pagi', 'Sore', 'Malam'].forEach(shift => {
        console.log(`Contoh 20 tiket shift ${shift}:`, shiftBuckets[shift].slice(0, 20).map(t => ({ openTime: t.openTime, parsedHour: new Date(t.openTime).getHours(), parsedMinute: new Date(t.openTime).getMinutes(), shift: getShift(t.openTime) })));
      });
    } catch (e) { console.error('Validasi shift detail error:', e); }
  }

  const pdfPageStyle = { padding: 24, fontFamily: 'Helvetica' };
  const pdfSectionTitle = { fontSize: 13, fontWeight: 700, marginBottom: 6, marginTop: 12, fontFamily: 'Helvetica' };
  const pdfTableCellStyle = { fontSize: 10, padding: 6, fontFamily: 'Helvetica' };
  const pdfTableHeaderStyleColor = { fontWeight: 700, fontSize: 11, backgroundColor: '#38bdf8', color: '#fff', padding: 6, borderBottom: '1px solid #38bdf8', fontFamily: 'Helvetica' };
  const pdfTableRowEvenColor = { backgroundColor: '#e0f2fe' };
  const pdfTableRowOddColor = { backgroundColor: '#fff' };

  const pdfSummaryCardColors = [
    { bg: '#e0f2fe', color: '#0369a1' }, // biru
    { bg: '#dcfce7', color: '#166534' }, // hijau
    { bg: '#fef9c3', color: '#92400e' }, // oranye
    { bg: '#fee2e2', color: '#991b1b' }, // merah
    { bg: '#ede9fe', color: '#6d28d9' }, // ungu
  ];

  // ====================== SHIFT AGG (UPDATE) ======================
  const shiftMap: Record<'Pagi'|'Sore'|'Malam', number[]> = { Pagi: [], Sore: [], Malam: [] };
  (Array.isArray(gridData) ? gridData : []).forEach(t => {
    const h = toRawHours(t);
    if (h == null) return;
    const sh = getShift(t.openTime);
    if (sh === 'Pagi' || sh === 'Sore' || sh === 'Malam') shiftMap[sh].push(h);
  });
  const shiftStats = (Object.entries(shiftMap) as [string, number[]][])
    .map(([shift, arr]) => {
      const avg = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
      const p50 = percentile(arr, 0.5) ?? 0;
      const p75 = percentile(arr, 0.75) ?? 0;
      const p90 = percentile(arr, 0.9) ?? 0;
      return {
    shift,
        avg, median: p50, count: arr.length, p75, p90,
        formattedAvg: formatDurationHMS(avg),
        formattedMedian: formatDurationHMS(p50)
      };
    });

  // Chart data tetap sama + tambahkan jika mau dipakai di tooltip:
  const chartData = shiftStats.map(s => ({
    shift: s.shift, avg: Number(s.avg.toFixed(2)), median: Number(s.median.toFixed(2)),
    count: s.count, avgLabel: s.formattedAvg, medianLabel: s.formattedMedian, p90: s.p90
  }));
  // =================================================================
  // Chart config warna baru
  const chartConfig = {
    avg: { label: 'Avg Handling Time (h)', color: '#2563eb' }, // biru
    median: { label: 'Median (h)', color: '#f59e42' }, // oranye
  };
  // Insight footer
  const maxAvg = shiftStats.reduce((max, s) => (s.avg > max.avg ? s : max), shiftStats[0] || { shift: '', avg: 0, median: 0, count: 0 });

  // ====================== CATEGORY AGG (UPDATE) ======================
  const catMap: Record<string, number[]> = {};
  (Array.isArray(gridData) ? gridData : []).forEach(t => {
    if (!t?.category) return;
    const h = toRawHours(t);
    if (h == null) return;
    (catMap[t.category] ||= []).push(h);
  });
  const catStats = Object.entries(catMap).map(([cat, arr]) => {
    const avg = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    const p50 = percentile(arr, 0.5) ?? 0;
    const p75 = percentile(arr, 0.75) ?? 0;
    const p90 = percentile(arr, 0.9) ?? 0;
    return {
      cat, avg, median: p50, count: arr.length, p75, p90,
      formattedAvg: formatDurationHMS(avg),
      formattedMedian: formatDurationHMS(p50),
    };
  });
  const catChartData = catStats.map(s => ({
    category: s.cat, avg: Number(s.avg.toFixed(2)), median: Number(s.median.toFixed(2)),
    count: s.count, avgLabel: s.formattedAvg, medianLabel: s.formattedMedian, p90: s.p90
  }));
  const maxAvgCat = catStats.reduce((max, s) => (s.avg > max.avg ? s : max), catStats[0] || { cat: '', avg: 0, median: 0, count: 0 });
  // =================================================================

  // Hitung tren shift: bandingkan avg shift dengan rata-rata semua shift
  const avgAllShift = shiftStats.reduce((a, s) => a + s.avg, 0) / (shiftStats.length || 1);
  const shiftTrends = shiftStats.map(s => ({ ...s, trend: ((s.avg - avgAllShift) / (avgAllShift || 1)) * 100 }));

  // Hitung tren kategori: bandingkan avg kategori dengan rata-rata semua kategori
  const avgAllCat = catStats.reduce((a, s) => a + s.avg, 0) / (catStats.length || 1);
  const catTrends = catStats.map(s => ({ ...s, trend: ((s.avg - avgAllCat) / (avgAllCat || 1)) * 100 }));

  // Insight otomatis
  const insightCards: { icon: React.ReactNode, title: string, description: string, type: 'info'|'warning'|'success', badge?: string }[] = [];
  // Deteksi anomali handling time shift
  const outlierShift = shiftStats.find(s => s.avg > 2 * avgAllShift);
  if (outlierShift) {
    insightCards.push({
      icon: <WarningIcon className="text-red-500" />,
      title: `Anomali: Shift ${outlierShift.shift}`,
      description: `Rata-rata handling time shift ${outlierShift.shift} (${outlierShift.formattedAvg}) jauh di atas rata-rata (${formatDurationHMS(avgAllShift)}). Periksa penyebabnya!`,
      type: 'warning',
      badge: 'Anomali',
    });
  }
  // Deteksi anomali kategori
  const outlierCat = catStats.find(s => s.avg > 2 * avgAllCat);
  if (outlierCat) {
    insightCards.push({
      icon: <WarningIcon className="text-red-500" />,
      title: `Anomali: Kategori ${outlierCat.cat}`,
      description: `Rata-rata handling time kategori ${outlierCat.cat} (${outlierCat.formattedAvg}) jauh di atas rata-rata (${formatDurationHMS(avgAllCat)}). Periksa penyebabnya!`,
      type: 'warning',
      badge: 'Anomali',
    });
  }
  // --- Insight tren volume tiket multi-bulan ---
  const monthMap = {};
  (Array.isArray(gridData) ? gridData : []).forEach(t => {
    if (!t.openTime) return;
    const d = new Date(t.openTime);
    if (isNaN(d.getTime())) return;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[month]) monthMap[month] = 0;
    monthMap[month] += 1;
  });
  const months = Object.keys(monthMap).sort();
  if (months.length >= 2) {
    let naik = 0, turun = 0, stabil = 0;
    let maxUp = { month: '', delta: -Infinity };
    let maxDown = { month: '', delta: Infinity };
    let prev = null;
    months.forEach((month, idx) => {
      const total = monthMap[month];
      if (idx === 0) {
        prev = total;
      } else {
        const delta = total - prev;
        if (delta > 0) { naik++; if (delta > maxUp.delta) maxUp = { month, delta }; }
        else if (delta < 0) { turun++; if (delta < maxDown.delta) maxDown = { month, delta }; }
        else { stabil++; }
        prev = total;
      }
    });
    let trendType = 'fluktuatif';
    if (naik > turun && naik > stabil) trendType = 'naik';
    else if (turun > naik && turun > stabil) trendType = 'turun';
    else if (stabil > naik && stabil > turun) trendType = 'stabil';
    let narasi = '';
    if (trendType === 'naik') {
      narasi = 'Volume tiket secara umum menunjukkan tren meningkat sepanjang periode. Terdapat beberapa bulan dengan lonjakan signifikan, menandakan adanya peningkatan kebutuhan atau gangguan layanan.';
    } else if (trendType === 'turun') {
      narasi = 'Volume tiket secara umum menunjukkan tren menurun sepanjang periode. Penurunan ini bisa menandakan perbaikan layanan atau penurunan aktivitas pelanggan.';
    } else {
      narasi = 'Volume tiket cenderung stabil sepanjang periode, tanpa fluktuasi besar.';
    }
    if (maxUp.delta > 0) narasi += ' Kenaikan terbesar terjadi pada salah satu bulan, menandakan adanya faktor pemicu khusus.';
    if (maxDown.delta < 0) narasi += ' Penurunan terbesar juga tercatat pada periode tertentu, perlu dicermati penyebabnya.';
    insightCards.push({
      icon: trendType === 'naik' ? <TrendingUpIcon className="text-green-600" /> : trendType === 'turun' ? <TrendingDownIcon className="text-blue-600" /> : <TrendingFlatIcon className="text-gray-500" />,
      title: `Tren Volume Tiket: ${trendType.charAt(0).toUpperCase()+trendType.slice(1)}`,
      description: narasi,
      type: trendType === 'naik' ? 'success' : trendType === 'turun' ? 'info' : 'info',
      badge: trendType === 'naik' ? '+Tiket' : trendType === 'turun' ? '-Tiket' : 'Stabil',
    });
  }
  // Rekomendasi tindakan
  if (outlierShift || outlierCat) {
    insightCards.push({
      icon: <AssignmentIcon className="text-orange-500" />,
      title: 'Rekomendasi',
      description: 'Segera lakukan investigasi pada shift/kategori yang terdeteksi anomali untuk mencegah penumpukan backlog atau penurunan kualitas layanan.',
      type: 'info',
      badge: 'Saran',
    });
  }

  // Deklarasi ulang stats dan insights setelah dependensi tersedia
  const stats = useMemo(() => {
    if (!ticketAnalyticsData || !Array.isArray(ticketAnalyticsData.stats)) return [];
    return ticketAnalyticsData.stats
      .filter(s => s.title !== 'Average Duration' && s.title !== 'Active Agents')
      .map(s => ({
        title: s.title.replace('Closed Tickets', 'Closed'),
        value: s.value,
        description: s.description,
      }));
  }, [ticketAnalyticsData]);
  const insights = useInsightFromTicketAnalytics({ monthlyStatsData, classificationData, customerStats });

  // --- Penetrasi Komplain Tertinggi per Jenis Klien ---
  const complaintPenetrationByType = useMemo(() => {
    if (!tiketPerJenisKlienPerBulan || !jenisKlienList || !allCustomers) return undefined;
    // Hitung total klien unik per jenis
    const totalByType: Record<string, number> = {};
    allCustomers.forEach(c => {
      if (jenisKlienList.includes(c.jenisKlien)) {
        totalByType[c.jenisKlien] = (totalByType[c.jenisKlien] || 0) + 1;
      }
    });
    // Hitung klien unik komplain per jenis (akumulasi semua bulan)
    const uniqueComplainingByType: Record<string, Set<string>> = {};
    jenisKlienList.forEach(jk => { uniqueComplainingByType[jk] = new Set(); });
    gridData2025.forEach(t => {
      const jk = customerJenisKlienMap.get((t.name || '').trim().toLowerCase());
      if (jenisKlienList.includes(jk)) {
        uniqueComplainingByType[jk].add((t.name || '').trim().toLowerCase());
      }
    });
    // Hitung rasio penetrasi per jenis
    let maxType = '';
    let maxValue = 0;
    jenisKlienList.forEach(jk => {
      const total = totalByType[jk] || 1;
      const value = Math.round((uniqueComplainingByType[jk].size / total) * 100);
      if (value > maxValue) {
        maxValue = value;
        maxType = jk;
      }
    });
    return { maxType, maxValue };
  }, [tiketPerJenisKlienPerBulan, jenisKlienList, allCustomers, gridData2025, customerJenisKlienMap]);

  // --- Penetrasi Komplain Tertinggi per Kategori Klien ---
  const complaintPenetrationByCategory = useMemo(() => {
    if (!tiketPerKategoriPerBulan || !kategoriList || !allCustomers) return undefined;
    // Hitung total klien unik per kategori
    const totalByCat: Record<string, number> = {};
    allCustomers.forEach(c => {
      if (c.kategori) {
        totalByCat[c.kategori] = (totalByCat[c.kategori] || 0) + 1;
      }
    });
    // Hitung klien unik komplain per kategori (akumulasi semua bulan)
    const uniqueComplainingByCat: Record<string, Set<string>> = {};
    kategoriList.forEach(cat => { uniqueComplainingByCat[cat] = new Set(); });
    gridData2025.forEach(t => {
      const cat = customerKategoriMap.get((t.name || '').trim().toLowerCase());
      if (cat && kategoriList.includes(cat)) {
        uniqueComplainingByCat[cat].add((t.name || '').trim().toLowerCase());
      }
    });
    // Hitung rasio penetrasi per kategori
    let maxCategory = '';
    let maxValue = 0;
    kategoriList.forEach(cat => {
      const total = totalByCat[cat] || 1;
      const value = Math.round((uniqueComplainingByCat[cat].size / total) * 100);
      if (value > maxValue) {
        maxValue = value;
        maxCategory = cat;
      }
    });
    return { maxCategory, maxValue };
  }, [tiketPerKategoriPerBulan, kategoriList, allCustomers, gridData2025, customerKategoriMap]);

  // Pastikan maxAvg dan maxAvgCat selalu punya formattedAvg
  const safeMaxAvg: { shift: string; avg: number; median: number; count: number; formattedAvg: string } =
    maxAvg && typeof maxAvg === 'object' && 'shift' in maxAvg
      ? { shift: maxAvg.shift || '', avg: maxAvg.avg || 0, median: typeof maxAvg.median === 'number' ? maxAvg.median : 0, count: maxAvg.count || 0, formattedAvg: (maxAvg as any).formattedAvg || formatDurationHMS(maxAvg.avg || 0) || '00:00:00' }
      : { shift: '', avg: 0, median: 0, count: 0, formattedAvg: '00:00:00' };
  const safeMaxAvgCat: { cat: string; avg: number; median: number; count: number; formattedAvg: string } =
    maxAvgCat && typeof maxAvgCat === 'object' && 'cat' in maxAvgCat
      ? { cat: maxAvgCat.cat || '', avg: maxAvgCat.avg || 0, median: typeof maxAvgCat.median === 'number' ? maxAvgCat.median : 0, count: maxAvgCat.count || 0, formattedAvg: (maxAvgCat as any).formattedAvg || formatDurationHMS(maxAvgCat.avg || 0) || '00:00:00' }
      : { cat: '', avg: 0, median: 0, count: 0, formattedAvg: '00:00:00' };

  // Guard clause for when data tidak tersedia
  if (!gridData || gridData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Ticket Analytics</h1>
        <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Data Analisis Tiket</h3>
        <p>Tidak ada data yang cukup untuk ditampilkan. Unggah file untuk memulai.</p>
      </div>
    );
  }

  // DEBUG LOG untuk validasi data customer dan kategori
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log('allCustomers:', allCustomers);
    console.log('kategoriList:', kategoriList);
    console.log('customerKategoriMap:', customerKategoriMap);
    console.log('gridData2025:', gridData2025.slice(0, 10));
  }

  return (
    <PageWrapper>
      {/* Page Title & Description */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Ticket Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400">Analysis of ticket statistics, trends, and complaint categories for the selected period.</p>
      </div>
      <div className="flex justify-center mb-6">
        <TimeFilter
          startMonth={startMonth}
          setStartMonth={setStartMonth}
          endMonth={endMonth}
          setEndMonth={setEndMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          monthOptions={monthOptions}
          allYearsInData={allYearsInData}
          onRefresh={refresh}
        />
      </div>
      
      {/* ====================== NORMALIZE TOGGLE (NEW) ====================== */}
      <div className="flex items-center justify-end mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={normalizePer1000}
            onChange={(e) => setNormalizePer1000(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Normalize per 1.000 active clients
        </label>
      </div>
      {/* =================================================================== */}
      {/* Summary Cards - Top Row (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {/* Total Tickets */}
        <SummaryCard
          icon={<ConfirmationNumberIcon className="w-7 h-7 text-white" />}
          title="Total Tickets"
          value={stats.find(s => s.title === 'Total Tickets')?.value || '0'}
          description={stats.find(s => s.title === 'Total Tickets')?.description || ''}
          iconBg="bg-blue-700"
        />
        
        {/* Closed */}
        <SummaryCard
          icon={<CheckCircleIcon className="w-7 h-7 text-white" />}
          title="Closed"
          value={stats.find(s => s.title === 'Closed')?.value || '0'}
          description={stats.find(s => s.title === 'Closed')?.description || ''}
          iconBg="bg-green-600"
        />
        
        {/* Open */}
        <SummaryCard
          icon={<ErrorOutlineIcon className="w-7 h-7 text-white" />}
          title="Open"
          value={stats.find(s => s.title === 'Open')?.value || '0'}
          description={stats.find(s => s.title === 'Open')?.description || ''}
          iconBg="bg-orange-500"
        />
        
        {/* SLA Attainment */}
        <SummaryCard
          icon={<AccessTimeIcon className="w-7 h-7 text-white" />}
          title="SLA Attainment"
          value={`${advancedKpis.slaAttainment.toFixed(1)}%`}
          description="Closed ≤ SLA target (by severity) di periode terpilih"
          iconBg="bg-indigo-600"
        />
      </div>

      {/* Summary Cards - Second Row (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {/* Overdue */}
        <SummaryCard
          icon={<AccessTimeIcon className="w-7 h-7 text-white" />}
          title="Overdue"
          value={stats.find(s => s.title === 'Overdue')?.value || '0'}
          description={stats.find(s => s.title === 'Overdue')?.description || ''}
          iconBg="bg-red-600"
        />
        
        {/* Escalated */}
        <SummaryCard
          icon={<WarningAmberIcon className="w-7 h-7 text-white" />}
          title="Escalated"
          value={stats.find(s => s.title === 'Escalated')?.value || '0'}
          description={stats.find(s => s.title === 'Escalated')?.description || ''}
          iconBg="bg-yellow-400"
        />
        
        {/* Close Rate (Periode) */}
        <SummaryCard
          icon={<CheckCircleIcon className="w-7 h-7 text-white" />}
          title="Close Rate (Periode)"
          value={`${advancedKpis.closeRatePeriod.toFixed(1)}%`}
          description="Closed / total tiket yang DIBUKA di periode"
          iconBg="bg-emerald-600"
        />
        
        {/* Resolution Rate (Lifetime) */}
        <SummaryCard
          icon={<HowToRegIcon className="w-7 h-7 text-white" />}
          title="Resolution Rate (Lifetime)"
          value={`${advancedKpis.resolutionRateLifetime.toFixed(1)}%`}
          description="Closed / total semua tiket (histori)"
          iconBg="bg-slate-700"
        />
      </div>

      {/* Backlog Cards - Third Row (3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {(() => {
          const now = new Date();
          // Gunakan definisi yang sama dengan Open tickets (logika kompleks)
          const openTickets = (Array.isArray(gridData) ? gridData : []).filter(t => {
            // Jika tidak ada closeTime, termasuk tiket open
            if (!t?.closeTime) return true;
            
            const openDate = parseDateSafe(t?.openTime);
            const closeDate = parseDateSafe(t?.closeTime);
            
            if (!openDate || !closeDate) return true;
            
            // Fallback 1: jika closeTime di masa depan dari sekarang, anggap open
            if (closeDate > now) return true;
            
            // Fallback 2: jika closeTime di bulan berikutnya dari openTime, anggap open
            const openMonth = openDate.getMonth();
            const openYear = openDate.getFullYear();
            const closeMonth = closeDate.getMonth();
            const closeYear = closeDate.getFullYear();
            
            if (closeYear > openYear || (closeYear === openYear && closeMonth > openMonth)) {
              return true;
            }
            
            // Fallback 3: jika closeTime lebih dari 30 hari setelah openTime, anggap open
            const daysDiff = (closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > 30) return true;
            
            return false;
          });
          
          const agesH = openTickets.map(t => {
            const open = parseDateSafe(t?.openTime);
            return open ? (now.getTime() - open.getTime()) / 3_600_000 : null;
          }).filter(n => Number.isFinite(n)) as number[];
          const p50 = percentile(agesH, 0.5) ?? 0;
          const p90 = percentile(agesH, 0.9) ?? 0;

          return (
            <>
            <SummaryCard
                icon={<ErrorOutlineIcon className="w-7 h-7 text-white" />}
                title="Backlog (Open)"
                value={openTickets.length.toLocaleString()}
                description="Tiket open: no closeTime, future closeTime, atau >30 hari"
                iconBg="bg-amber-600"
              />
              <SummaryCard
                icon={<AccessTimeIcon className="w-7 h-7 text-white" />}
                title="Backlog Age P50"
                value={formatDurationHMS(p50)}
                description="Median umur backlog (jam)"
                iconBg="bg-sky-600"
              />
              <SummaryCard
                icon={<AccessTimeIcon className="w-7 h-7 text-white" />}
                title="Backlog Age P90"
                value={formatDurationHMS(p90)}
                description="90% backlog lebih muda dari ini"
                iconBg="bg-indigo-600"
              />
            </>
          );
        })()}
      </div>

      {/* Automated Insights - Professional & Informative Design */}
      {insights && (
        <div className="mb-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Automated Insights</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">Analisis otomatis berdasarkan data tiket dan performa</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Real-time</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Key Metrics */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-zinc-700 pb-1">Key Metrics</h3>
                
            {/* Bulan tersibuk */}
            {insights.busiestMonth && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <BarChartIcon className="text-blue-500 text-xs" />
                        <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Bulan Tersibuk</span>
                      </div>
                      <Badge variant="info" className="text-blue-600 text-xs">Peak</Badge>
                    </div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                      {insights.busiestMonth.label}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                      {insights.busiestMonth.count} tiket diproses
                    </div>
                    {insights.busiestMonth.trend && (
                      <div className={`text-xs font-medium ${
                        insights.busiestMonth.trend > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {insights.busiestMonth.trend > 0 ? <TrendingUpIcon className="w-3 h-3 inline mr-1" /> : <TrendingDownIcon className="w-3 h-3 inline mr-1" />} {Math.abs(insights.busiestMonth.trend)}% dari bulan sebelumnya
                      </div>
                    )}
                  </div>
                )}
                
            {/* Kategori dominan */}
            {insights.topCategory && (
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <LabelIcon className="text-purple-500 text-xs" />
                        <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Kategori Dominan</span>
                      </div>
                      <Badge variant="info" className="text-purple-600 text-xs">Top</Badge>
                    </div>
                    <div className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                      {insights.topCategory.cat}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                      {insights.topCategory.count} tiket ({((insights.topCategory.count / (Array.isArray(gridData) ? gridData.length : 1)) * 100).toFixed(1)}% dari total)
                    </div>
                    {typeof insights.topCategory.trend === 'number' && (
                      <div className={`text-xs font-medium ${
                        insights.topCategory.trend > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {insights.topCategory.trend > 0 ? <TrendingUpIcon className="w-3 h-3 inline mr-1" /> : <TrendingDownIcon className="w-3 h-3 inline mr-1" />} {Math.abs(insights.topCategory.trend).toFixed(1)}% tren {insights.topCategory.trend > 0 ? 'naik' : 'turun'}
                      </div>
                    )}
                  </div>
                )}
                
            {/* Pelanggan kronis/ekstrem */}
            {insights.chronicPercent && (
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <WarningIcon className="text-orange-500 text-xs" />
                        <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Pelanggan Kronis/Ekstrem</span>
                      </div>
                      <Badge variant="warning" className="text-orange-600 text-xs">Alert</Badge>
                    </div>
                    <div className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-0.5">
                      {insights.chronicPercent}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Pelanggan dengan &gt;10 tiket (kategori Kronis/Ekstrem)
                    </div>
                  </div>
                )}
              </div>
              
              {/* Performance Insights */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-zinc-700 pb-1">Performance Insights</h3>
                
                {/* Complaint Penetration */}
            {typeof complaintPenetrationByType !== 'undefined' && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <ShowChartIcon className="text-red-500 text-xs" />
                        <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Rasio Komplain Tertinggi</span>
                      </div>
                      <Badge variant="danger" className="text-red-600 text-xs">High</Badge>
                    </div>
                    <div className="text-sm font-bold text-red-600 dark:text-red-400 mb-0.5">
                      {complaintPenetrationByType.maxType}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {complaintPenetrationByType.maxValue}% penetrasi komplain
                    </div>
                  </div>
                )}
                
                {/* Handling Time Insights */}
                <div className="space-y-3">
            {typeof safeMaxAvg !== 'undefined' && safeMaxAvg.shift && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-1">
                        <AssignmentIcon className="text-amber-500 text-xs" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">Handling Time Shift</span>
                      </div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {safeMaxAvg.shift}: {safeMaxAvg.formattedAvg}
                      </div>
                    </div>
                  )}
                  
            {typeof safeMaxAvgCat !== 'undefined' && safeMaxAvgCat.cat && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-1">
                        <AssignmentIcon className="text-amber-500 text-xs" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">Handling Time Kategori</span>
                      </div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        {safeMaxAvgCat.cat}: {safeMaxAvgCat.formattedAvg}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Category Penetration */}
                {typeof complaintPenetrationByCategory !== 'undefined' && (
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <TrackChangesIcon className="text-indigo-500 text-xs" />
                        <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">Penetrasi Kategori</span>
                      </div>
                      <Badge variant="info" className="text-indigo-600 text-xs">Focus</Badge>
                    </div>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                      {complaintPenetrationByCategory.maxCategory}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {complaintPenetrationByCategory.maxValue}% penetrasi komplain
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Automated Recommendations */}
            {insightCards && insightCards.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Automated Recommendations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {insightCards.map((card, index) => (
                    <div 
                      key={index}   
                      className={`p-2 rounded-lg border transition-all duration-200 ${
                        card.type === 'warning' 
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                          : card.type === 'success'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex items-start gap-1">
                        <span className={`text-xs ${
                          card.type === 'warning' 
                            ? 'text-red-500' 
                            : card.type === 'success'
                            ? 'text-green-500'
                            : 'text-blue-500'
                        }`}>{card.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            <h4 className="font-semibold text-xs text-gray-900 dark:text-gray-100">{card.title}</h4>
                            {card.badge && (
                              <Badge 
                                variant={card.type === 'warning' ? 'danger' : card.type === 'success' ? 'success' : 'info'}
                                className="text-xs"
                              >
                                {card.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tombol Export PDF & CSV */}
      <div className="flex gap-4 mb-6">
        <PDFDownloadLink
          document={
            <Document>
              <Page size="A4" style={pdfPageStyle}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 20, fontWeight: 700 }}>Ticket Analytics Report</Text>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Exported: {new Date().toLocaleString()}</Text>
                </View>
                {/* Summary Cards */}
                <Text style={pdfSectionTitle}>Summary</Text>
                <View style={{ flexDirection: 'row', marginBottom: 18 }}>
                  {stats.slice(0, 5).map((s, i) => (
                    <View key={i} style={{ flex: 1, marginRight: i < 4 ? 8 : 0, backgroundColor: pdfSummaryCardColors[i]?.bg, borderRadius: 8, padding: 10, minWidth: 90, alignItems: 'center', justifyContent: 'center', border: `1px solid ${pdfSummaryCardColors[i]?.bg}` }}>
                      <Text style={{ fontSize: 12, fontWeight: 700, color: pdfSummaryCardColors[i]?.color, marginBottom: 2 }}>{s.title}</Text>
                      <Text style={{ fontSize: 18, fontWeight: 900, color: pdfSummaryCardColors[i]?.color }}>{s.value}</Text>
                      <Text style={{ fontSize: 9, color: '#666', textAlign: 'center' }}>{s.description}</Text>
                    </View>
                  ))}
                </View>
                {/* Automated Insights */}
                {insights && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={pdfSectionTitle}>Automated Insights</Text>
                    {insights.busiestMonth && (
                      <Text style={{ fontSize: 10 }}>
                        Bulan tersibuk: <Text style={{ color: '#0ea5e9', fontWeight: 700 }}>{insights.busiestMonth.label}</Text> dengan <Text style={{ color: '#0ea5e9', fontWeight: 700 }}>{insights.busiestMonth.count}</Text> tiket
                        {insights.busiestMonth.trend && <Text style={{ color: '#16a34a', fontWeight: 700 }}> ({insights.busiestMonth.trend > 0 ? '+' : ''}{insights.busiestMonth.trend}% dari bulan sebelumnya)</Text>}.
                      </Text>
                    )}
                    {insights.topCategory && (
                      <Text style={{ fontSize: 10 }}>
                        Kategori dominan: <Text style={{ color: '#a21caf', fontWeight: 700 }}>{insights.topCategory.cat}</Text> (<Text style={{ color: '#a21caf', fontWeight: 700 }}>{insights.topCategory.count}</Text> tiket)
                        {typeof insights.topCategory.trend === 'number' && <Text style={{ color: insights.topCategory.trend > 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>, tren {insights.topCategory.trend > 0 ? 'naik' : 'turun'} {Math.abs(insights.topCategory.trend).toFixed(1)}%</Text>}.
                      </Text>
                    )}
                    {insights.chronicPercent && (
                      <Text style={{ fontSize: 10 }}><Text style={{ color: '#f59e42', fontWeight: 700 }}>{insights.chronicPercent}%</Text> pelanggan termasuk kategori Kronis/Ekstrem (lebih dari 10 tiket).</Text>
                    )}
                  </View>
                )}
                {/* Ticket per Shift Table (per bulan) */}
                <Text style={pdfSectionTitle}>Ticket per Shift (per Month)</Text>
                <View style={{ flexDirection: 'row', borderBottom: '1px solid #38bdf8' }}>
                  <Text style={pdfTableHeaderStyleColor}>Month</Text>
                  <Text style={pdfTableHeaderStyleColor}>Pagi</Text>
                  <Text style={pdfTableHeaderStyleColor}>Sore</Text>
                  <Text style={pdfTableHeaderStyleColor}>Malam</Text>
                </View>
                {(() => {
                  const monthMap = {};
                  (Array.isArray(gridData) ? gridData : []).forEach(t => {
                    if (!t.openTime) return;
                    const d = new Date(t.openTime);
                    if (isNaN(d.getTime())) return;
                    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthMap[month]) monthMap[month] = { Pagi: 0, Sore: 0, Malam: 0 };
                    const shift = getShift(t.openTime);
                    if (monthMap[month][shift] !== undefined) monthMap[month][shift] += 1;
                  });
                  const months = Object.keys(monthMap).sort();
                  return months.map((month, idx) => (
                    <View key={month} style={{ flexDirection: 'row', ...(idx % 2 === 0 ? pdfTableRowEvenColor : pdfTableRowOddColor) }}>
                      <Text style={pdfTableCellStyle}>{month}</Text>
                      <Text style={pdfTableCellStyle}>{monthMap[month].Pagi}</Text>
                      <Text style={pdfTableCellStyle}>{monthMap[month].Sore}</Text>
                      <Text style={pdfTableCellStyle}>{monthMap[month].Malam}</Text>
                    </View>
                  ));
                })()}
                {/* Ticket per Month Table (total) */}
                <Text style={pdfSectionTitle}>Ticket per Month (Total)</Text>
                <View style={{ flexDirection: 'row', borderBottom: '1px solid #38bdf8' }}>
                  <Text style={pdfTableHeaderStyleColor}>Month</Text>
                  <Text style={pdfTableHeaderStyleColor}>Total Tickets</Text>
                </View>
                {(() => {
                  const monthMap = {};
                  (Array.isArray(gridData) ? gridData : []).forEach(t => {
                    if (!t.openTime) return;
                    const d = new Date(t.openTime);
                    if (isNaN(d.getTime())) return;
                    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    if (!monthMap[month]) monthMap[month] = 0;
                    monthMap[month] += 1;
                  });
                  const months = Object.keys(monthMap).sort();
                  return months.map((month, idx) => (
                    <View key={month} style={{ flexDirection: 'row', ...(idx % 2 === 0 ? pdfTableRowEvenColor : pdfTableRowOddColor) }}>
                      <Text style={pdfTableCellStyle}>{month}</Text>
                      <Text style={pdfTableCellStyle}>{monthMap[month]}</Text>
                    </View>
                  ));
                })()}
                {/* Shift Breakdown Table */}
                <Text style={pdfSectionTitle}>Shift Breakdown (Total)</Text>
                <View style={{ flexDirection: 'row', borderBottom: '1px solid #38bdf8' }}>
                  <Text style={pdfTableHeaderStyleColor}>Shift</Text>
                  <Text style={pdfTableHeaderStyleColor}>Tickets</Text>
                </View>
                {(() => {
                  const shiftCount = { Pagi: 0, Sore: 0, Malam: 0, Unknown: 0 };
                  (Array.isArray(gridData) ? gridData : []).forEach(t => {
                    const shift = getShift(t.openTime);
                    shiftCount[shift] = (shiftCount[shift] || 0) + 1;
                  });
                  return Object.entries(shiftCount).filter(([shift]) => shift !== 'Unknown').map(([shift, count], idx) => (
                    <View key={shift} style={{ flexDirection: 'row', ...(idx % 2 === 0 ? pdfTableRowEvenColor : pdfTableRowOddColor) }}>
                      <Text style={pdfTableCellStyle}>{shift}</Text>
                      <Text style={pdfTableCellStyle}>{count}</Text>
                    </View>
                  ));
                })()}
                {/* Ticket List (first 20) */}
                <Text style={pdfSectionTitle}>Ticket List (first 20)</Text>
                <View style={{ border: '1px solid #38bdf8', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#38bdf8', borderBottom: '1px solid #38bdf8' }}>
                    <Text style={{ ...pdfTableHeaderStyleColor, flex: 2, borderRight: '1px solid #38bdf8' }}>Subject</Text>
                    <Text style={{ ...pdfTableHeaderStyleColor, flex: 1, borderRight: '1px solid #38bdf8' }}>Agent</Text>
                    <Text style={{ ...pdfTableHeaderStyleColor, flex: 1, borderRight: '1px solid #38bdf8' }}>Customer</Text>
                    <Text style={{ ...pdfTableHeaderStyleColor, flex: 1.5, borderRight: '1px solid #38bdf8' }}>Open Time</Text>
                    <Text style={{ ...pdfTableHeaderStyleColor, flex: 1 }}>Status</Text>
                  </View>
                  {/* Rows */}
                  {(Array.isArray(gridData) ? gridData.slice(0, 20) : []).map((t, i) => (
                    <View key={i} style={{ flexDirection: 'row', ...(i % 2 === 0 ? pdfTableRowEvenColor : pdfTableRowOddColor), borderBottom: '1px solid #bae6fd' }}>
                      <Text style={{ ...pdfTableCellStyle, flex: 2, borderRight: '1px solid #e0f2fe' }}>{t.description && t.description.trim() ? t.description : '-'}</Text>
                      <Text style={{ ...pdfTableCellStyle, flex: 1, borderRight: '1px solid #e0f2fe' }}>{t.openBy && t.openBy.trim() ? t.openBy : '-'}</Text>
                      <Text style={{ ...pdfTableCellStyle, flex: 1, borderRight: '1px solid #e0f2fe' }}>{t.name && t.name.trim() ? t.name : (t.customerId || '-')}</Text>
                      <Text style={{ ...pdfTableCellStyle, flex: 1.5, borderRight: '1px solid #e0f2fe' }}>{t.openTime ? t.openTime.replace('T', ' ') : '-'}</Text>
                      <Text style={{ ...pdfTableCellStyle, flex: 1 }}><Text style={pdfStatusBadge(t.status)}>{t.status || '-'}</Text></Text>
                    </View>
                  ))}
                </View>
              </Page>
            </Document>
          }
          fileName="ticket-analytics-report.pdf"
        >
          {({ loading }) => (
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow">
              {loading ? 'Preparing PDF...' : 'Export PDF'}
            </button>
          )}
        </PDFDownloadLink>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded shadow"
          onClick={handleExportCSV}
        >
          Export CSV
        </button>
      </div>

      {/* --- Agent Ticket per Shift Chart (Area) --- */}

      {/* --- ANALYTICS CARDS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 w-full">
        {/* 1. Tickets per Month */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Tickets per Month</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 h-auto flex flex-col gap-4 min-w-0">
            <div className="w-full h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={toRechartsData(monthlyStatsData.labels, monthlyStatsData.datasets)} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EC4899" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <RechartsTooltip />
                  <RechartsLegend />
                  {/* Area harus incoming dulu, lalu closed, dan dataKey case sensitive */}
                  <Area type="monotone" dataKey="incoming" stroke="#6366F1" fill="url(#colorIncoming)" name="Incoming" strokeWidth={3} />
                  <Area type="monotone" dataKey="closed" stroke="#EC4899" fill="url(#colorClosed)" name="Closed" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="min-w-max w-full text-sm text-left mt-6 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
                <thead className="bg-white dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-2">Tipe</th>
                    {monthlyStatsData.labels.map((month) => (
                      <th key={month} className="px-4 py-2 font-bold font-mono text-center">{month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900">
                  <tr>
                    <td className="px-4 py-2 font-bold text-pink-600">Closed</td>
                    {monthlyStatsData.labels.map((month, idx) => (
                      <td key={month} className="px-4 py-2 text-center font-mono">{monthlyStatsData.datasets[0]?.data[idx] ?? 0}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-bold text-blue-600">Incoming</td>
                    {monthlyStatsData.labels.map((month, idx) => (
                      <td key={month} className="px-4 py-2 text-center font-mono">{monthlyStatsData.datasets[1]?.data[idx] ?? 0}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {/* 2. Agent Tickets per Shift */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Agent Tickets per Shift</CardTitle>
        </CardHeader>
          <CardContent className="pt-2 h-auto flex flex-col gap-4 min-w-0">
            <div className="w-full h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={agentShiftAreaData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                        <linearGradient id="colorMalam" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                        </linearGradient>
                <linearGradient id="colorPagi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorSore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <RechartsTooltip />
                      <RechartsLegend />
              <Area type="monotone" dataKey="Malam" stroke="#ef4444" fill="url(#colorMalam)" name="Malam (01:00–07:59)" strokeWidth={3} />
              <Area type="monotone" dataKey="Pagi" stroke="#22c55e" fill="url(#colorPagi)" name="Pagi (08:00–16:59)" strokeWidth={3} />
              <Area type="monotone" dataKey="Sore" stroke="#3b82f6" fill="url(#colorSore)" name="Sore (00:00–00:59 & 17:00–23:59)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
                </div>
                <div className="overflow-x-auto w-full">
                  <table className="min-w-max w-full text-sm text-left mt-6 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
                    <thead className="bg-white dark:bg-zinc-900">
                      <tr>
                        <th className="px-4 py-2">Shift</th>
                        {agentShiftAreaData.map((row) => (
                          <th key={row.month} className="px-4 py-2 font-bold font-mono text-center">{row.month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900">
                      <tr>
                        <td className="px-4 py-2 font-bold text-green-600">Pagi</td>
                        {agentShiftAreaData.map((row) => (
                          <td key={row.month} className="px-4 py-2 text-center font-mono">{row.Pagi}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-blue-600">Sore</td>
                        {agentShiftAreaData.map((row) => (
                          <td key={row.month} className="px-4 py-2 text-center font-mono">{row.Sore}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-red-600">Malam</td>
                        {agentShiftAreaData.map((row) => (
                          <td key={row.month} className="px-4 py-2 text-center font-mono">{row.Malam}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
        </CardContent>
      </Card>
        {/* 3. Tickets by Client Type (2025) */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
            <CardTitle>Tickets by Client Type (2025)</CardTitle>
            </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={(() => {
                  const months = Object.keys(tiketPerJenisKlienPerBulan).sort();
                  return months.map(month => {
                    const row: any = { month };
                    jenisKlienList.forEach(jk => {
                      const tickets = (tiketPerJenisKlienPerBulan[month]?.[jk] || 0);
                      if (normalizePer1000) {
                        const denom = (customerMonthRowCountByType.get(month)?.[jk] || 0);
                        row[jk] = denom > 0 ? +(tickets / denom * 1000).toFixed(2) : 0;
                      } else {
                        row[jk] = tickets;
                      }
                    });
                    return row;
                  });
                })()}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                    <defs>
                  <linearGradient id="colorBroadband" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                  <linearGradient id="colorBroadbandBusiness" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorDedicated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e42" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e42" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <RechartsTooltip />
                    <RechartsLegend />
                <Area type="monotone" dataKey="Broadband" stroke="#3b82f6" fill="url(#colorBroadband)" name="Broadband" strokeWidth={3} />
                <Area type="monotone" dataKey="Broadband Business" stroke="#22c55e" fill="url(#colorBroadbandBusiness)" name="Broadband Business" strokeWidth={3} />
                <Area type="monotone" dataKey="Dedicated" stroke="#f59e42" fill="url(#colorDedicated)" name="Dedicated" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
            {/* Table */}
            <div className="overflow-x-auto w-full">
            <table className="min-w-max w-full text-xs md:text-sm text-left mt-4 table-fixed break-words bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
              <thead>
                <tr>
                  <th className="px-4 py-2">Client Type</th>
                    {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => (
                      <th key={month} className="px-4 py-2">{month}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {jenisKlienList.map(jk => (
                  <tr key={jk}>
                    <td className="px-4 py-2 font-bold text-blue-700 dark:text-blue-300">{jk}</td>
                    {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => {
                      const tickets = (tiketPerJenisKlienPerBulan[month]?.[jk] || 0);
                      const val = normalizePer1000
                        ? (() => {
                            const denom = (customerMonthRowCountByType.get(month)?.[jk] || 0);
                            return denom > 0 ? `${(tickets / denom * 1000).toFixed(2)}` : '0';
                          })()
                        : `${tickets}`;
                      return <td key={month} className="px-4 py-2 text-center font-mono">{val}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-2 font-bold">Total</td>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => {
                    const obj = customerMonthRowCountByType.get(month) || {};
                    const totalTickets = jenisKlienList.reduce((s, jk) => s + (tiketPerJenisKlienPerBulan[month]?.[jk] || 0), 0);
                    const totalActive = (obj['Dedicated']||0)+(obj['Broadband Business']||0)+(obj['Broadband']||0);
                    const totalVal = normalizePer1000
                      ? (totalActive > 0 ? (totalTickets / totalActive * 1000).toFixed(2) : '0')
                      : String(totalTickets);
                    return <td key={month} className="px-4 py-2 text-center font-bold font-mono">{totalVal}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
            </div>
            </CardContent>
          </Card>
        {/* 4. Tickets by Client Category (2025) */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
            <CardTitle>Tickets by Client Category (2025)</CardTitle>
            </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={(() => {
                  const months = Object.keys(tiketPerKategoriPerBulan).sort();
                  return months.map(month => {
                    const row: any = { month };
                    kategoriList.forEach(kat => {
                      const tickets = (tiketPerKategoriPerBulan[month]?.[kat] || 0);
                      if (normalizePer1000) {
                        const denom = (customerMonthRowCountByCategory.get(month)?.[kat] || 0);
                        row[kat] = denom > 0 ? +(tickets / denom * 1000).toFixed(2) : 0;
                      } else {
                        row[kat] = tickets;
                      }
                    });
                    return row;
                  });
                })()}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  {kategoriList.map((kat, idx) => (
                    <linearGradient key={kat} id={`colorKategori${kat.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={AREA_COLORS[idx%AREA_COLORS.length]} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={AREA_COLORS[idx%AREA_COLORS.length]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} allowDecimals={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip />
                <RechartsLegend />
                {kategoriList.map((kat, idx) => (
                  <Area
                    key={kat}
                    type="monotone"
                    dataKey={kat}
                    stroke={AREA_COLORS[idx%AREA_COLORS.length]}
                    fill={`url(#colorKategori${kat.replace(/\s/g, '')})`}
                    name={kat}
                    strokeWidth={3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            {/* Table */}
            <div className="overflow-x-auto w-full">
            <table className="min-w-max w-full text-xs md:text-sm text-left mt-4 table-fixed break-words bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
              <thead>
                <tr>
                  <th className="px-4 py-2">Client Category</th>
                  {Object.keys(tiketPerKategoriPerBulan).sort().map(month => (
                    <th key={month} className="px-4 py-2">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kategoriList.map(kat => (
                  <tr key={kat}>
                    <td className="px-4 py-2 font-bold text-blue-700 dark:text-blue-300">{kat}</td>
                    {Object.keys(tiketPerKategoriPerBulan).sort().map(month => {
                      const tickets = (tiketPerKategoriPerBulan[month]?.[kat] || 0);
                      const val = normalizePer1000
                        ? (() => {
                            const denom = (customerMonthRowCountByCategory.get(month)?.[kat] || 0);
                            return denom > 0 ? `${(tickets / denom * 1000).toFixed(2)}` : '0';
                          })()
                        : `${tickets}`;
                      return <td key={month} className="px-4 py-2 text-center font-mono">{val}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-2 font-bold">Total</td>
                  {Object.keys(tiketPerKategoriPerBulan).sort().map(month => {
                    const obj = customerMonthRowCountByCategory.get(month) || {};
                    const totalTickets = kategoriList.reduce((s, k) => s + (tiketPerKategoriPerBulan[month]?.[k] || 0), 0);
                    const totalActive = kategoriList.reduce((s, k) => s + (obj[k] || 0), 0);
                    const totalVal = normalizePer1000
                      ? (totalActive > 0 ? (totalTickets / totalActive * 1000).toFixed(2) : '0')
                      : String(totalTickets);
                    return <td key={month} className="px-4 py-2 text-center font-bold font-mono">{totalVal}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
            </div>
          </CardContent>
        </Card>
        {/* 5. Unique Complaining Clients by Type (2025) */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
            <CardTitle>Unique Complaining Clients by Type (2025)</CardTitle>
            </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={(() => {
                  const months = Object.keys(tiketPerJenisKlienPerBulan).sort();
                  return months.map(month => {
                    const row: any = { month };
                    jenisKlienList.forEach(jk => {
                      row[jk] = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const name = (t.name || '').trim().toLowerCase();
                        const jenis = customerJenisKlienMap.get(name) || 'Unknown';
                        const cls = (t.classification || '').toString().trim().toLowerCase();
                        const activeMonths = customerMonthMap.get(name) || [];
                        return m === month && jenis === jk && name && activeMonths.includes(month) && cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                    });
                    return row;
                  });
                })()}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorBroadbandU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorBroadbandBusinessU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorDedicatedU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e42" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e42" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} allowDecimals={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip />
                <RechartsLegend />
                <Area type="monotone" dataKey="Broadband" stroke="#3b82f6" fill="url(#colorBroadbandU)" name="Broadband" strokeWidth={3} />
                <Area type="monotone" dataKey="Broadband Business" stroke="#22c55e" fill="url(#colorBroadbandBusinessU)" name="Broadband Business" strokeWidth={3} />
                <Area type="monotone" dataKey="Dedicated" stroke="#f59e42" fill="url(#colorDedicatedU)" name="Dedicated" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
            {/* Table */}
            <div className="overflow-x-auto w-full">
            <table className="min-w-max w-full text-xs md:text-sm text-left mt-4 table-fixed break-words bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
              <thead>
                <tr>
                  <th className="px-4 py-2">Client Type</th>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => (
                    <th key={month} className="px-4 py-2">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jenisKlienList.map(jk => (
                  <tr key={jk}>
                    <td className="px-4 py-2 font-bold text-blue-700 dark:text-blue-300">{jk}</td>
                    {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => {
                      const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const name = (t.name || '').trim().toLowerCase();
                        const jenis = customerJenisKlienMap.get(name) || 'Unknown';
                        const cls = (t.classification || '').toString().trim().toLowerCase();
                        const activeMonths = customerMonthMap.get(name) || [];
                        return m === month && jenis === jk && name && activeMonths.includes(month) && cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                              return (
                        <td key={month} className="px-4 py-2 text-center font-mono">{uniqueClients}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-2 font-bold">Total</td>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => {
                    // Total unique clients across ALL types this month (union, active, excluded classifications)
                    const unionSet = new Set<string>(
                      gridData2025
                        .filter(t => {
                          const d = new Date(t.openTime);
                          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          if (m !== month) return false;
                          const name = (t.name || '').trim().toLowerCase();
                          if (!name) return false;
                          const cls = (t.classification || '').toString().trim().toLowerCase();
                          if (cls === 'di luar layanan' || cls === 'gangguan diluar layanan' || cls === 'request') return false;
                          const activeMonths = customerMonthMap.get(name) || [];
                          return activeMonths.includes(month);
                        })
                        .map(t => (t.name || '').trim().toLowerCase())
                    );
                    return <td key={month} className="px-4 py-2 text-center font-bold font-mono">{unionSet.size}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
            </div>
          </CardContent>
        </Card>
        {/* 6. Unique Complaining Clients by Category (2025) */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Unique Complaining Clients by Category (2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={(() => {
                  const months = Object.keys(tiketPerKategoriPerBulan).sort();
                  return months.map(month => {
                    const row: any = { month };
                    kategoriList.forEach(kat => {
                      row[kat] = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const name = (t.name || '').trim().toLowerCase();
                        const kategori = customerKategoriMap.get(name) || 'Unknown';
                        const cls = (t.classification || '').toString().trim().toLowerCase();
                        const activeMonths = customerMonthMap.get(name) || [];
                        return m === month && kategori === kat && name && activeMonths.includes(month) && cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                    });
                    return row;
                  });
                })()}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  {kategoriList.map((kat, idx) => (
                    <linearGradient key={kat} id={`colorUKategori${kat.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={AREA_COLORS[idx%AREA_COLORS.length]} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={AREA_COLORS[idx%AREA_COLORS.length]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} allowDecimals={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip />
                <RechartsLegend />
                {kategoriList.map((kat, idx) => (
                  <Area
                    key={kat}
                    type="monotone"
                    dataKey={kat}
                    stroke={AREA_COLORS[idx%AREA_COLORS.length]}
                    fill={`url(#colorUKategori${kat.replace(/\s/g, '')})`}
                    name={kat}
                    strokeWidth={3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            {/* Table */}
            <div className="overflow-x-auto w-full">
            <table className="min-w-max w-full text-xs md:text-sm text-left mt-4 table-fixed break-words bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
              <thead>
                <tr>
                  <th className="px-4 py-2">Client Category</th>
                  {Object.keys(tiketPerKategoriPerBulan).sort().map(month => (
                    <th key={month} className="px-4 py-2">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kategoriList.map(kat => (
                  <tr key={kat}>
                    <td className="px-4 py-2 font-bold text-blue-700 dark:text-blue-300">{kat}</td>
                    {Object.keys(tiketPerKategoriPerBulan).sort().map(month => {
                      const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const kategori = customerKategoriMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && kategori === kat;
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      return (
                        <td key={month} className="px-4 py-2 text-center font-mono">{uniqueClients}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-2 font-bold">Total</td>
                  {Object.keys(tiketPerKategoriPerBulan).sort().map(month => {
                    // Total unique clients across ALL categories this month (union, active, excluded classifications)
                    const unionSet = new Set<string>(
                      gridData2025
                        .filter(t => {
                          const d = new Date(t.openTime);
                          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          if (m !== month) return false;
                          const name = (t.name || '').trim().toLowerCase();
                          if (!name) return false;
                          const cls = (t.classification || '').toString().trim().toLowerCase();
                          if (cls === 'di luar layanan' || cls === 'gangguan diluar layanan' || cls === 'request') return false;
                          const activeMonths = customerMonthMap.get(name) || [];
                          return activeMonths.includes(month);
                        })
                        .map(t => (t.name || '').trim().toLowerCase())
                    );
                    return <td key={month} className="px-4 py-2 text-center font-bold font-mono">{unionSet.size}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
            </div>
          </CardContent>
        </Card>
        {/* 7. Complaint Penetration Ratio by Type (2025) */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Complaint Penetration Ratio by Type (2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={(() => {
                  const months = Object.keys(tiketPerJenisKlienPerBulan).sort();
                  return months.map(month => {
                    const row: any = { month };
                    jenisKlienList.forEach(jk => {
                      const denom = Array.from(customerJenisKlienMap.entries())
                        .filter(([name, jenis2]) => jenis2 === jk && (customerMonthMap.get(name) || []).includes(month)).length;
                      const numer = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const jenis = customerJenisKlienMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        const cls = (t.classification || '').toString().trim().toLowerCase();
                        return m === month && jenis === jk && t.name && t.name.trim() && cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      row[jk] = denom > 0 ? (numer / denom) * 100 : 0;
                    });
                    return row;
                  });
                })()}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorBroadbandP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorBroadbandBusinessP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorDedicatedP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e42" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e42" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} allowDecimals={true} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip formatter={v => (typeof v === 'number' ? `${v.toFixed(2)}%` : v)} />
                <RechartsLegend />
                <Area type="monotone" dataKey="Broadband" stroke="#3b82f6" fill="url(#colorBroadbandP)" name="Broadband" strokeWidth={3} />
                <Area type="monotone" dataKey="Broadband Business" stroke="#22c55e" fill="url(#colorBroadbandBusinessP)" name="Broadband Business" strokeWidth={3} />
                <Area type="monotone" dataKey="Dedicated" stroke="#f59e42" fill="url(#colorDedicatedP)" name="Dedicated" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
            {/* Table */}
            <div className="overflow-x-auto w-full">
            <table className="min-w-max w-full text-xs md:text-sm text-left mt-4 table-fixed break-words bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
              <thead>
                <tr>
                  <th className="px-4 py-2">Client Type</th>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => (
                    <th key={month} className="px-4 py-2">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jenisKlienList.map(jk => (
                  <tr key={jk}>
                    <td className="px-4 py-2 font-bold text-blue-700 dark:text-blue-300">{jk}</td>
                    {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => {
                      const denom = Array.from(customerJenisKlienMap.entries())
                        .filter(([name, jenis2]) => jenis2 === jk && (customerMonthMap.get(name) || []).includes(month)).length;
                      const numer = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const jenis = customerJenisKlienMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        const cls = (t.classification || '').toString().trim().toLowerCase();
                        return m === month && jenis === jk && t.name && t.name.trim() && cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      const ratio = denom > 0 ? (numer / denom) * 100 : 0;
                      return <td key={month} className="px-4 py-2 text-center font-mono">{ratio.toFixed(2)}%</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
        {/* 8. Complaint Penetration Ratio by Category (2025) */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Complaint Penetration Ratio by Category (2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={(() => {
                  const months = Object.keys(tiketPerKategoriPerBulan).sort();
                  return months.map(month => {
                    const row: any = { month };
                    kategoriList.forEach(kat => {
                      // Klien unik yang komplain bulan ini
                      const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const kategori = customerKategoriMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && kategori === kat;
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      // Denominator: total rows uploaded for that category this month
                      const obj = customerMonthRowCountByCategory.get(month) || {};
                      const totalClients = obj[kat] || 0;
                      row[kat] = totalClients > 0 ? (uniqueClients / totalClients) * 100 : 0;
                    });
                    return row;
                  });
                })()}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  {kategoriList.map((kat, idx) => (
                    <linearGradient key={kat} id={`colorPKategori${kat.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={AREA_COLORS[idx%AREA_COLORS.length]} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={AREA_COLORS[idx%AREA_COLORS.length]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} allowDecimals={true} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip formatter={v => (typeof v === 'number' ? `${v.toFixed(2)}%` : v)} />
                <RechartsLegend />
                {kategoriList.map((kat, idx) => (
                  <Area
                    key={kat}
                    type="monotone"
                    dataKey={kat}
                    stroke={AREA_COLORS[idx%AREA_COLORS.length]}
                    fill={`url(#colorPKategori${kat.replace(/\s/g, '')})`}
                    name={kat}
                    strokeWidth={3}
                  />
                ))}
              </AreaChart>
                  </ResponsiveContainer>
            {/* Table */}
            <div className="overflow-x-auto w-full">
            <table className="min-w-max w-full text-sm text-left mt-4 table-fixed break-words bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
              <thead>
                <tr>
                  <th className="px-4 py-2">Client Category</th>
                  {Object.keys(tiketPerKategoriPerBulan).sort().map(month => (
                    <th key={month} className="px-4 py-2">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kategoriList.map(kat => (
                  <tr key={kat}>
                    <td className="px-4 py-2 font-bold text-blue-700 dark:text-blue-300">{kat}</td>
                    {Object.keys(tiketPerKategoriPerBulan).sort().map(month => {
                      // Klien unik yang komplain bulan ini (aktif + exclude klasifikasi)
                      const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const name = (t.name || '').trim().toLowerCase();
                        const kategori = customerKategoriMap.get(name) || 'Unknown';
                        const cls = (t.classification || '').toString().trim().toLowerCase();
                        const activeMonths = customerMonthMap.get(name) || [];
                        return m === month && kategori === kat && name && activeMonths.includes(month) && cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      // Denominator: total rows uploaded for that category this month
                      const obj = customerMonthRowCountByCategory.get(month) || {};
                      const totalClients = obj[kat] || 0;
                      const ratio = totalClients > 0 ? (uniqueClients / totalClients) * 100 : 0;
                      return (
                        <td key={month} className="px-4 py-2 text-center font-mono">{ratio.toFixed(2)}%</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
        {/* Active Clients per Month (2025) */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Active Clients per Month (2025)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={(() => {
                  const months = Object.keys(tiketPerJenisKlienPerBulan).sort();
                  return months.map(month => {
                    const totalActive = customerMonthRowCount.get(month) || 0;
                    const complainCount = (() => {
                      const names = new Set(
                        gridData2025
                          .filter(t => {
                            const d = new Date(t.openTime);
                            const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            if (m !== month) return false;
                            const cls = (t.classification || '').toString().trim().toLowerCase();
                            if (!t.name || !t.name.trim()) return false;
                            return cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                          })
                          .map(t => (t.name || '').trim().toLowerCase())
                      );
                      return names.size;
                    })();
                    return { month, 'Active Clients': totalActive, 'Complaint Clients': complainCount };
                  });
                })()}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorActiveClients2025" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorComplaintClients2025" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip formatter={v => (typeof v === 'number' ? v.toLocaleString() : v)} />
                <RechartsLegend />
                <Area type="monotone" dataKey="Active Clients" stroke="#6366F1" fill="url(#colorActiveClients2025)" name="Active Clients" strokeWidth={3} />
                <Area type="monotone" dataKey="Complaint Clients" stroke="#F43F5E" fill="url(#colorComplaintClients2025)" name="Complaint Clients" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="max-w-full overflow-x-auto">
            <table className="min-w-max w-full text-xs md:text-sm text-left table-fixed break-words">
              <thead>
                <tr>
                  <th className="px-4 py-2">Month</th>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => (
                    <th key={month} className="px-4 py-2">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 font-bold text-blue-700 dark:text-blue-300">Active Clients</td>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => {
                    const totalClients = customerMonthRowCount.get(month) || 0;
                    return (
                      <td key={month} className="px-4 py-2 text-center font-mono">{totalClients}</td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="px-4 py-2 font-bold text-rose-700 dark:text-rose-300">Complaint Clients</td>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => {
                    // Complaining clients that are also active this month (union)
                    const activeNames = new Set(
                      Array.from(customerMonthMap.entries())
                        .filter(([_name, monthsArr]) => Array.isArray(monthsArr) && monthsArr.includes(month))
                        .map(([name]) => (name || '').trim().toLowerCase())
                    );
                    const complainNames = new Set(
                      gridData2025
                        .filter(t => {
                          const d = new Date(t.openTime);
                          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          if (m !== month) return false;
                          const cls = (t.classification || '').toString().trim().toLowerCase();
                          if (!t.name || !t.name.trim()) return false;
                          return cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                        })
                        .map(t => (t.name || '').trim().toLowerCase())
                    );
                    let uniqueActiveComplain = 0; complainNames.forEach(n => { if (activeNames.has(n)) uniqueActiveComplain += 1; });
                    return (
                      <td key={month} className="px-4 py-2 text-center font-mono">{uniqueActiveComplain}</td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>

        {/* Active Clients by Service Type (2025) - removed per request */}

        {/* 9. Total Complaint Penetration Ratio (2025) */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Total Complaint Penetration Ratio (2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={(() => {
                  const months = Object.keys(tiketPerJenisKlienPerBulan).sort();
                  return months.map(month => {
                    // Active unique names this month
                    const activeNames = new Set(
                      Array.from(customerMonthMap.entries())
                        .filter(([_name, monthsArr]) => Array.isArray(monthsArr) && monthsArr.includes(month))
                        .map(([name]) => (name || '').trim().toLowerCase())
                    );
                    // Distinct complaining names in this month (filtered classifications)
                    const complainNames = new Set(
                      gridData2025
                        .filter(t => {
                          const d = new Date(t.openTime);
                          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          if (m !== month) return false;
                          const cls = (t.classification || '').toString().trim().toLowerCase();
                          if (!t.name || !t.name.trim()) return false;
                          return cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                        })
                        .map(t => (t.name || '').trim().toLowerCase())
                    );
                    // Numerator: only complaining names that are also active this month
                    let uniqueClients = 0; complainNames.forEach(n => { if (activeNames.has(n)) uniqueClients += 1; });
                    // Denominator: total uploaded rows for this month
                    const totalClients = customerMonthRowCount.get(month) || 0;
                    return {
                      month,
                      'Total Ratio': totalClients > 0 ? (uniqueClients / totalClients) * 100 : 0
                    };
                  });
                })()}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorTotalRatio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} allowDecimals={true} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip formatter={v => (typeof v === 'number' ? `${v.toFixed(2)}%` : v)} />
                <RechartsLegend />
                <Area type="monotone" dataKey="Total Ratio" stroke="#6366F1" fill="url(#colorTotalRatio)" name="Total Ratio" strokeWidth={3} />
              </AreaChart>
                  </ResponsiveContainer>
            {/* Table */}
            <div className="overflow-x-auto w-full">
            <table className="min-w-max w-full text-xs md:text-sm text-left mt-4 table-fixed break-words bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
              <thead>
                <tr>
                  <th className="px-4 py-2">Month</th>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => (
                    <th key={month} className="px-4 py-2">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 font-bold text-blue-700 dark:text-blue-300">Total</td>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => {
                    // Denominator: total rows uploaded for this month
                    const totalClients = customerMonthRowCount.get(month) || 0;
                    // Active names this month
                    const activeNames = new Set(
                      Array.from(customerMonthMap.entries())
                        .filter(([_name, monthsArr]) => Array.isArray(monthsArr) && monthsArr.includes(month))
                        .map(([name]) => (name || '').trim().toLowerCase())
                    );
                    // Distinct complainants this month (filtered classifications)
                    const complainNames = new Set(
                      gridData2025
                        .filter(t => {
                          const d = new Date(t.openTime);
                          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          if (m !== month) return false;
                          const cls = (t.classification || '').toString().trim().toLowerCase();
                          if (!t.name || !t.name.trim()) return false;
                          return cls !== 'di luar layanan' && cls !== 'gangguan diluar layanan' && cls !== 'request';
                        })
                        .map(t => (t.name || '').trim().toLowerCase())
                    );
                    // Numerator: complainants who are also active this month
                    let uniqueClients = 0; complainNames.forEach(n => { if (activeNames.has(n)) uniqueClients += 1; });
                    const ratio = totalClients > 0 ? (uniqueClients / totalClients) * 100 : 0;
                    return (
                      <td key={month} className="px-4 py-2 text-center font-mono">{ratio.toFixed(2)}%</td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
            </div>
            </CardContent>
          </Card>
      </div>

      {/* Category Hotspot Analysis - Professional & Informative Design */}
      {topComplaintsTable && topComplaintsTable.length > 0 && (
        <div className="mb-12">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Category Hotspot Analysis</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Analisis kategori berdasarkan impact score dan volume tiket</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-600 rounded"></div>
                  <span>High Impact</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded"></div>
                  <span>Medium Impact</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded"></div>
                  <span>Low Impact</span>
                </div>
              </div>
            </div>
            
            <div className="grid gap-4">
                              {topComplaintsTable.slice(0, 10).map((item, index) => {
                // ====================== IMPACT SCORE SUPPORT (NEW) ======================
                const { catP90Map, catEscalationRate, impactScore } = (() => {
                  const m: Record<string, number> = {};
                  catStats.forEach(cs => { m[cs.cat] = (cs.p90 ?? 0); });
                  
                  const mCount: Record<string, {total: number; escal: number}> = {};
                  (Array.isArray(gridData) ? gridData : []).forEach(t => {
                    const cat = t?.category || 'Unknown';
                    (mCount[cat] ||= { total: 0, escal: 0 }).total += 1;
                    const s = String(t?.status || '').toLowerCase();
                    if (s === 'escalated') mCount[cat].escal += 1;
                  });
                  const out: Record<string, number> = {};
                  Object.entries(mCount).forEach(([k, v]) => out[k] = v.total ? v.escal / v.total : 0);
                  
                  const impactScoreFn = (x: {tickets: number; p90Hours: number; escalRate: number; severityScore: number}, w = {w1:1, w2:2, w3:3, w4:2}) =>
                    (x.tickets * w.w1) + (x.p90Hours * w.w2) + (x.severityScore * w.w3) + (x.escalRate * 100 * w.w4);
                  
                  return { catP90Map: m, catEscalationRate: out, impactScore: impactScoreFn };
                })();
                
                const computedImpact = Number.isFinite(item?.impactScore)
                  ? item.impactScore
                  : impactScore({
                      tickets: item.count || 0,
                      p90Hours: (catP90Map[item.category] || 0),
                      escalRate: (catEscalationRate[item.category] || 0),
                      severityScore: 2 // fallback: P3
                    });
                
                    // --- Trend Calculation (MoM) ---
                    let trendValue: number | null = null;
                    if (monthlyStatsData && monthlyStatsData.labels && monthlyStatsData.labels.length > 1) {
                      const monthKeys = monthlyStatsData.labels;
                      const catTicketsPerMonth: number[] = monthKeys.map((label) => {
                        const [monthName, year] = label.split(' ');
                        const monthIdx = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"].indexOf(monthName);
                        const tickets = gridData.filter(t => {
                          if (t.category !== item.category) return false;
                          if (!t.openTime) return false;
                          const d = new Date(t.openTime);
                          return d.getFullYear() === Number(year) && d.getMonth() === monthIdx;
                        });
                        return tickets.length;
                      });
                      if (catTicketsPerMonth.length > 1) {
                        const prev = catTicketsPerMonth[catTicketsPerMonth.length-2];
                        const curr = catTicketsPerMonth[catTicketsPerMonth.length-1];
                        if (prev > 0) {
                          trendValue = ((curr - prev) / Math.abs(prev)) * 100;
                    }
                  }
                }
                
                    // --- Contribution Calculation ---
                    const totalTickets = gridData.length;
                    const contrib = totalTickets > 0 ? (item.count / totalTickets) * 100 : 0;
                
                // Get impact color based on score
                const getImpactColor = (score: number, maxScore: number) => {
                  const ratio = score / maxScore;
                  if (ratio > 0.7) return 'from-red-400 to-red-600';
                  if (ratio > 0.4) return 'from-yellow-400 to-yellow-600';
                  return 'from-green-400 to-green-600';
                };
                
                const maxImpact = topComplaintsTable[0]?.impactScore || computedImpact;
                const impactColor = getImpactColor(computedImpact, maxImpact);
                
                    return (
                  <div
                        key={index}
                    className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-200 dark:border-zinc-700 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      {/* Left: Rank & Category Info */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-sm">
                          #{index + 1}
                            </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{item.category}</h3>
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                              {item.count} tiket
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Avg Duration</div>
                              <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{item.avgDurationFormatted}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Contribution</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{contrib.toFixed(1)}%</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Trend (MoM)</div>
                              <div className="flex items-center gap-1">
                                {trendValue !== null ? (
                                  <>
                                    <span className={`text-xs ${trendValue > 0 ? 'text-green-600 dark:text-green-400' : trendValue < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                      {trendValue > 0 ? <TrendingUpIcon className="w-3 h-3" /> : trendValue < 0 ? <TrendingDownIcon className="w-3 h-3" /> : <TrendingFlatIcon className="w-3 h-3" />}
                                    </span>
                                    <span className="text-sm font-medium">{trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%</span>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
              </div>
          </div>
                            <div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Top Sub</div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={item.topSubCategory}>
                                {item.topSubCategory}
        </div>
                          </div>
                          </div>
                          
                          {/* Impact Score Bar */}
                  <div>
                            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                              <span>Impact Score</span>
                              <span className="font-bold text-gray-900 dark:text-gray-100">{computedImpact.toFixed(2)}</span>
                        </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <div 
                                className={`bg-gradient-to-r ${impactColor} h-2 rounded-full transition-all duration-700`}
                                style={{ width: `${(computedImpact / maxImpact) * 100}%` }}
                              ></div>
                              </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Show more button if there are more than 10 items */}
              {topComplaintsTable.length > 10 && (
                <div className="text-center pt-4">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium">
                    Tampilkan {topComplaintsTable.length - 10} kategori lainnya...
                  </button>
                </div>
              )}
            </div>
                        </div>
        </div>
      )}


      {/* Classification Analytics - Modern & Professional Design */}
      <div className="mb-12">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Classification Analytics</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Analisis klasifikasi pelanggan berdasarkan frekuensi komplain</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Normal</span>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Persisten</span>
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Kronis</span>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Ekstrem</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(classificationData).map(([classification, details]) => {
              const d = details as { count: number, sub: { [key: string]: number }, trendline?: { labels: string[], data: number[] } };
              const trend = (d.trendline && d.trendline.data.length > 1)
                ? d.trendline.data.map((val, i, arr) => {
                    if (i === 0) return null;
                    const prev = arr[i - 1];
                    if (prev === 0) return null;
                    const percent = ((val - prev) / Math.abs(prev)) * 100;
                    return percent;
                  })
                : [];
              
              // Color mapping untuk setiap klasifikasi
              const getClassificationColor = (classType: string) => {
                switch (classType.toLowerCase()) {
                  case 'normal': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
                  case 'persisten': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
                  case 'kronis': return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
                  case 'ekstrem': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
                  default: return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
                }
              };
              
              const getClassificationIconColor = (classType: string) => {
                switch (classType.toLowerCase()) {
                  case 'normal': return 'text-green-600 dark:text-green-400';
                  case 'persisten': return 'text-yellow-600 dark:text-yellow-400';
                  case 'kronis': return 'text-orange-600 dark:text-orange-400';
                  case 'ekstrem': return 'text-red-600 dark:text-red-400';
                  default: return 'text-gray-600 dark:text-gray-400';
                }
              };
              
                  return (
                <div key={classification} className={`rounded-xl border p-4 ${getClassificationColor(classification)} transition-all duration-200 hover:shadow-md`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getClassificationIconColor(classification)} bg-white dark:bg-zinc-800 shadow-sm`}>
                        <span className="text-sm font-bold">{classification.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{classification}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{d.count} pelanggan</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100">{d.count}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">total</div>
                    </div>
                  </div>
                  
                  {/* Trend Data */}
                  {d.trendline && d.trendline.labels.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                        <span>Tren bulanan</span>
                        <span>Perubahan</span>
                      </div>
                      <div className="space-y-2">
                      {d.trendline.labels.map((label, i) => (
                          <div key={label} className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[40px]">{label}</span>
                              <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{d.trendline.data[i]}</span>
                            </div>
                          {i > 0 && trend[i] !== null && (
                              <div className={`flex items-center gap-1 text-xs font-medium ${
                                trend[i]! > 0 ? 'text-green-600 dark:text-green-400' : 
                                trend[i]! < 0 ? 'text-red-600 dark:text-red-400' : 
                                'text-gray-600 dark:text-gray-400'
                              }`}>
                                <span>{trend[i]! > 0 ? <TrendingUpIcon className="w-3 h-3" /> : trend[i]! < 0 ? <TrendingDownIcon className="w-3 h-3" /> : <TrendingFlatIcon className="w-3 h-3" />}</span>
                                <span>{trend[i]! > 0 ? '+' : ''}{trend[i]!.toFixed(1)}%</span>
                              </div>
                          )}
                          </div>
                      ))}
                      </div>
                  </div>
                  )}
                  
                  {/* Sub-classification */}
                  {d.sub && Object.keys(d.sub).length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Sub-klasifikasi</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(d.sub).sort((a, b) => b[1] - a[1]).map(([sub, count]) => (
                          <span key={sub} className="bg-white dark:bg-zinc-800 rounded-full px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700">
                            {sub}: <span className="font-bold text-gray-900 dark:text-gray-100">{count}</span>
                          </span>
                        ))}
                      </div>
                          </div>
                  )}
                        </div>
              );
                })}
              </div>
        </div>
        </div>
        
      {/* Handling Time Analytics - Professional & Informative Design */}
      <div className="mb-12">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Handling Time Analytics</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Analisis waktu penanganan berdasarkan shift dan kategori</p>
              </div>
            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Average</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span>Median</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>P90</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Shift Analysis */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Per Shift</h3>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Rata-rata global: <span className="font-medium">{formatDurationHMS(avgAllShift)}</span>
                </div>
              </div>
              
              {/* Chart */}
              <div className="mb-4">
                <ChartContainer config={chartConfig} className="w-full">
                  <BarChart data={chartData} height={120} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                  <defs>
                      <linearGradient id="shiftAvgGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
                    </linearGradient>
                      <linearGradient id="shiftMedianGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="shift" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <ChartTooltip 
                      cursor={false} 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 p-3">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
                              {payload.map((entry, index) => (
                                <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                                  {entry.name}: <span className="font-medium text-gray-900 dark:text-gray-100">{entry.value}</span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="avg" fill="url(#shiftAvgGradient)" radius={[4,4,0,0]} />
                    <Bar dataKey="median" fill="url(#shiftMedianGradient)" radius={[4,4,0,0]} />
                </BarChart>
              </ChartContainer>
              </div>
              
              {/* Shift Cards */}
              <div className="space-y-3">
                {shiftTrends.map((shift) => {
                  const isOutlier = shift.avg > 2 * avgAllShift;
                  const trendColor = shift.trend > 0 ? 'text-red-600 dark:text-red-400' : shift.trend < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400';
                  const trendIcon = shift.trend > 0 ? <TrendingUpIcon className="w-4 h-4" /> : shift.trend < 0 ? <TrendingDownIcon className="w-4 h-4" /> : <TrendingFlatIcon className="w-4 h-4" />;
                  
                  return (
                    <div 
                      key={shift.shift} 
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        isOutlier 
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                          : 'bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            isOutlier ? 'bg-red-500' : 'bg-blue-500'
                          }`}>
                            {shift.shift.charAt(0)}
            </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{shift.shift}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{shift.count} tiket</p>
        </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-bold text-gray-900 dark:text-gray-100">{shift.formattedAvg}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">rata-rata</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Median</div>
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{shift.formattedMedian}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">P90</div>
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{formatDurationHMS(shift.p90)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Trend</div>
                          <div className={`text-sm font-medium ${trendColor}`}>
                            {trendIcon} {shift.trend > 0 ? '+' : ''}{shift.trend.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      {isOutlier && (
                        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
                          <WarningIcon className="w-3 h-3 inline mr-1" /> Anomali: {shift.formattedAvg} vs rata-rata {formatDurationHMS(avgAllShift)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Category Analysis */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Per Kategori</h3>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Rata-rata global: <span className="font-medium">{formatDurationHMS(avgAllCat)}</span>
                </div>
              </div>
              
              {/* Chart */}
              <div className="mb-4">
                <ChartContainer config={chartConfig} className="w-full">
                  <BarChart data={catChartData} height={120} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                  <defs>
                      <linearGradient id="catAvgGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity={1} />
                    </linearGradient>
                      <linearGradient id="catMedianGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={1} />
                        <stop offset="100%" stopColor="#f472b6" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <ChartTooltip 
                      cursor={false} 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 p-3">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
                              {payload.map((entry, index) => (
                                <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
                                  {entry.name}: <span className="font-medium text-gray-900 dark:text-gray-100">{entry.value}</span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="avg" fill="url(#catAvgGradient)" radius={[4,4,0,0]} />
                    <Bar dataKey="median" fill="url(#catMedianGradient)" radius={[4,4,0,0]} />
                </BarChart>
              </ChartContainer>
      </div>
              
              {/* Category Cards */}
              <div className="space-y-3">
                {catTrends.map((cat) => {
                  const isOutlier = cat.avg > 2 * avgAllCat;
                  const trendColor = cat.trend > 0 ? 'text-red-600 dark:text-red-400' : cat.trend < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400';
                  const trendIcon = cat.trend > 0 ? <TrendingUpIcon className="w-4 h-4" /> : cat.trend < 0 ? <TrendingDownIcon className="w-4 h-4" /> : <TrendingFlatIcon className="w-4 h-4" />;
                  
                  return (
                    <div 
                      key={cat.cat} 
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        isOutlier 
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                          : 'bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            isOutlier ? 'bg-red-500' : 'bg-purple-500'
                          }`}>
                            <AssignmentIcon className="text-white text-xs" />
    </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[120px]" title={cat.cat}>{cat.cat}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{cat.count} tiket</p>
        </div>
      </div>
                        <div className="text-right">
                          <div className="text-base font-bold text-gray-900 dark:text-gray-100">{cat.formattedAvg}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">rata-rata</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Median</div>
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{cat.formattedMedian}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">P90</div>
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{formatDurationHMS(cat.p90)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Trend</div>
                          <div className={`text-sm font-medium ${trendColor}`}>
                            {trendIcon} {cat.trend > 0 ? '+' : ''}{cat.trend.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      {isOutlier && (
                        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
                          <WarningIcon className="w-3 h-3 inline mr-1" /> Anomali: {cat.formattedAvg} vs rata-rata {formatDurationHMS(avgAllCat)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>


    </PageWrapper>
  );
};

export default TicketAnalytics;
