import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Download, ArrowUpRight, ArrowDownRight, TicketIcon, ClockIcon, CheckCircleIcon, UserIcon, Ticket, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useTicketAnalytics } from './TicketAnalyticsContext';
import SummaryCard from './ui/SummaryCard';
import TimeFilter from './TimeFilter';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend as RechartsLegend, Tooltip as RechartsTooltip, PieChart, Pie, Sector, Cell, Label as RechartsLabel, BarChart, Bar, LabelList } from 'recharts';
import PageWrapper from './PageWrapper';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatDurationDHM } from '@/lib/utils';
import { Badge } from './ui/badge';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

type ClassificationDetails = {
  count: number;
  sub: { [key: string]: number };
  trendline?: { labels: string[]; data: number[] };
  trendPercent?: number;
};

type ClassificationData = {
  [key: string]: ClassificationDetails;
};

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

// Helper: tentukan shift dari jam (logika berbasis menit, prioritas overlap)
function getShift(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  const hour = d.getHours();
  const minute = d.getMinutes();
  const totalMinutes = hour * 60 + minute;
  if (totalMinutes >= 0 && totalMinutes < 60) return 'Sore'; // 00:00–00:59
  if (totalMinutes >= 60 && totalMinutes < 480) return 'Malam'; // 01:00–07:59
  if (totalMinutes >= 480 && totalMinutes < 1020) return 'Pagi'; // 08:00–16:59
  if (totalMinutes >= 1020 && totalMinutes < 1440) return 'Sore'; // 17:00–23:59
  return 'Unknown';
}

// Helper: Median
function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

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

// Helper: tren badge
function getTrendBadge(value: number) {
  if (value > 0.5) return <Badge variant="success">▲ {value.toFixed(1)}%</Badge>;
  if (value < -0.5) return <Badge variant="danger">▼ {Math.abs(value).toFixed(1)}%</Badge>;
  return <Badge variant="default">● 0%</Badge>;
}

// Helper: status badge (untuk PDF export, harus return style object)
const pdfStatusBadge = status => {
  const s = (status || '').toLowerCase();
  if (s === 'closed') return { backgroundColor: '#bbf7d0', color: '#166534', borderRadius: 4, padding: '2px 6px', fontWeight: 700, fontSize: 9 };
  if (s === 'open') return { backgroundColor: '#fde68a', color: '#92400e', borderRadius: 4, padding: '2px 6px', fontWeight: 700, fontSize: 9 };
  if (s === 'escalated' || s === 'overdue') return { backgroundColor: '#fecaca', color: '#991b1b', borderRadius: 4, padding: '2px 6px', fontWeight: 700, fontSize: 9 };
  return { backgroundColor: '#f3f4f6', color: '#334155', borderRadius: 4, padding: '2px 6px', fontWeight: 700, fontSize: 9 };
};

const TicketAnalytics = ({ data: propsData }: TicketAnalyticsProps) => {
  // Semua hook harus di awal
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'type' | 'category'>('type');
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
    const map = new Map<string, string>();
    (allCustomers || []).forEach(c => {
      map.set((c.nama || '').trim().toLowerCase(), c.jenisKlien);
    });
    return map;
  }, [allCustomers]);
  const customerMonthMap = useMemo(() => {
    // Build active months per customer from uploaded Customer Data sheets.
    // Customer ID format during save: `${sheetName}-${idx}-${Nama}`.
    // We normalize `sheetName` to canonical 'YYYY-MM' keys used across analytics.
    const MONTH_NAME_ID: Record<string, string> = {
      januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
    };
    function normalizeSheetToMonth(sheet: string): string | null {
      const s = (sheet || '').toLowerCase().trim();
      // Case 1: already 'YYYY-MM'
      const m1 = s.match(/(\d{4})[-_/ ](0[1-9]|1[0-2])/);
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
      const id: string = String((c as any).id || '');
      const sheetPart = id.split(`-${(c as any).nama || ''}`)[0] || id; // fallback
      const firstSeg = id.split('-')[0];
      // Try robust extraction: prefer YYYY-MM if present anywhere in id
      let canonical = normalizeSheetToMonth(id);
      if (!canonical) canonical = normalizeSheetToMonth(sheetPart);
      if (!canonical) canonical = normalizeSheetToMonth(firstSeg);
      if (!canonical) return;
      if (!monthSetByCustomer.has(nameKey)) monthSetByCustomer.set(nameKey, new Set<string>());
      monthSetByCustomer.get(nameKey)!.add(canonical);
    });
    const map = new Map<string, string[]>();
    monthSetByCustomer.forEach((set, key) => map.set(key, Array.from(set).sort()));
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
  const complaintsData = ticketAnalyticsData?.complaintsData || { labels: [], datasets: [] };
  const monthlyStatsData = ticketAnalyticsData?.monthlyStatsChartData || { labels: [], datasets: [] };
  const classificationData = ticketAnalyticsData?.classificationAnalysis || {};
  const topComplaintsTable = ticketAnalyticsData?.topComplaintsTableData || [];
  const zeroDurationCount = useMemo(() => Array.isArray(filteredGridData) ? filteredGridData.filter(t => t.duration?.rawHours === 0).length : 0, [filteredGridData]);
  const agentStats = ticketAnalyticsData?.agentAnalyticsData || [];

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

  // Ringkasan jumlah dan persentase tiap kelas
  const repClassSummary = useMemo(() => {
    const summary = { Normal: 0, Persisten: 0, Kronis: 0, Ekstrem: 0 };
    (Array.isArray(customerStats) ? customerStats : []).forEach((c: any) => {
      if (summary[c.repClass] !== undefined) summary[c.repClass] += 1;
    });
    const total = customerStats.length;
    return { ...summary, total };
  }, [customerStats]);

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
  if (typeof window !== 'undefined') {
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
  if (typeof window !== 'undefined') {
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
  const pdfTableHeaderStyle = { fontWeight: 700, fontSize: 11, backgroundColor: '#f3f4f6', padding: 4, borderBottom: '1px solid #bbb' };
  const pdfTableCellStyle = { fontSize: 10, padding: 6, fontFamily: 'Helvetica' };
  const pdfTableRowEven = { backgroundColor: '#f9fafb' };
  const pdfTableRowOdd = { backgroundColor: '#fff' };
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

  // Agregasi data per shift
  const shiftMap = { Pagi: [], Sore: [], Malam: [] };
  (Array.isArray(gridData) ? gridData : []).forEach(t => {
    const shift = getShift(t.openTime);
    if (shiftMap[shift] && t.duration && typeof t.duration.rawHours === 'number') {
      (shiftMap[shift] as number[]).push(t.duration.rawHours);
    }
  });
  const shiftStats = Object.entries(shiftMap).map(([shift, arr]) => ({
    shift,
    avg: (arr as number[]).length ? ((arr as number[]).reduce((a, b) => a + b, 0) / (arr as number[]).length) : 0,
    median: median(arr as number[]),
    count: (arr as number[]).length,
    formattedAvg: formatDurationHMS((arr as number[]).length ? ((arr as number[]).reduce((a, b) => a + b, 0) / (arr as number[]).length) : 0),
    formattedMedian: formatDurationHMS(median(arr as number[])),
  }));
  // Untuk chartData, tambahkan formatted label
  const chartData = shiftStats.map(s => ({
    shift: s.shift,
    avg: Number(s.avg.toFixed(2)),
    median: Number(s.median.toFixed(2)),
    count: s.count,
    avgLabel: s.formattedAvg,
    medianLabel: s.formattedMedian,
  }));
  // Chart config warna baru
  const chartConfig = {
    avg: { label: 'Avg Handling Time (h)', color: '#2563eb' }, // biru
    median: { label: 'Median (h)', color: '#f59e42' }, // oranye
  };
  // Insight footer
  const maxAvg = shiftStats.reduce((max, s) => (s.avg > max.avg ? s : max), shiftStats[0] || { shift: '', avg: 0, median: 0, count: 0 });

  // Agregasi data per kategori
  const catMap: Record<string, number[]> = {};
  (Array.isArray(gridData) ? gridData : []).forEach(t => {
    if (!t.category) return;
    if (!catMap[t.category]) catMap[t.category] = [];
    if (t.duration && typeof t.duration.rawHours === 'number') catMap[t.category].push(t.duration.rawHours);
  });
  const catStats = Object.entries(catMap).map(([cat, arr]) => ({
    cat,
    avg: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
    median: median(arr),
    count: arr.length,
    formattedAvg: formatDurationHMS(arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0),
    formattedMedian: formatDurationHMS(median(arr)),
  }));
  const maxAvgCat = catStats.reduce((max, s) => (s.avg > max.avg ? s : max), catStats[0] || { cat: '', avg: 0, median: 0, count: 0 });
  const catChartData = catStats.map(s => ({
    category: s.cat,
    avg: Number(s.avg.toFixed(2)),
    median: Number(s.median.toFixed(2)),
    count: s.count,
    avgLabel: s.formattedAvg,
    medianLabel: s.formattedMedian,
  }));

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
      icon: <span className="text-red-500">⚠️</span>,
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
      icon: <span className="text-red-500">⚠️</span>,
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
      icon: trendType === 'naik' ? <span className="text-green-600">⬆️</span> : trendType === 'turun' ? <span className="text-blue-600">⬇️</span> : <span className="text-gray-500">●</span>,
      title: `Tren Volume Tiket: ${trendType.charAt(0).toUpperCase()+trendType.slice(1)}`,
      description: narasi,
      type: trendType === 'naik' ? 'success' : trendType === 'turun' ? 'info' : 'info',
      badge: trendType === 'naik' ? '+Tiket' : trendType === 'turun' ? '-Tiket' : 'Stabil',
    });
  }
  // Rekomendasi tindakan
  if (outlierShift || outlierCat) {
    insightCards.push({
      icon: <span className="text-orange-500">💡</span>,
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
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Ticket Analytics</h1>
        <h3 className="text-xl md:text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Data Analisis Tiket</h3>
        <p>Tidak ada data yang cukup untuk ditampilkan. Unggah file untuk memulai.</p>
      </div>
    );
  }

  // DEBUG LOG untuk validasi data customer dan kategori
  if (typeof window !== 'undefined') {
    console.log('allCustomers:', allCustomers);
    console.log('kategoriList:', kategoriList);
    console.log('customerKategoriMap:', customerKategoriMap);
    console.log('gridData2025:', gridData2025.slice(0, 10));
  }

  return (
    <PageWrapper>
      {/* Page Title & Description */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-gray-100">Ticket Analytics</h1>
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
      {/* Summary Cards - Standardized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
        {stats.map(s => {
          // Standardized mapping for icons and backgrounds
          const titleKey = s.title.trim().toUpperCase();
          const iconMap: Record<string, { icon: React.ReactNode; iconBg: string }> = {
            'TOTAL TICKETS': {
              icon: <ConfirmationNumberIcon className="w-7 h-7 text-white" />, iconBg: "bg-blue-700"
            },
            'CLOSED': {
              icon: <CheckCircleIcon className="w-7 h-7 text-white" />, iconBg: "bg-green-600"
            },
            'OPEN': {
              icon: <ErrorOutlineIcon className="w-7 h-7 text-white" />, iconBg: "bg-orange-500"
            },
            'OVERDUE': {
              icon: <AccessTimeIcon className="w-7 h-7 text-white" />, iconBg: "bg-red-600"
            },
            'ESCALATED': {
              icon: <WarningAmberIcon className="w-7 h-7 text-white" />, iconBg: "bg-yellow-400"
            },
          };
          const { icon, iconBg } = iconMap[titleKey] || {
            icon: <WarningAmberIcon className="w-7 h-7 text-white" />, iconBg: "bg-gray-500"
          };

          return (
            <SummaryCard
              key={s.title}
              icon={icon}
              title={s.title}
              value={s.value}
              description={s.description}
              iconBg={iconBg}
              className="w-full"
            />
          );
        })}
      </div>

      {insights && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 mb-8">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Automated Insights</div>
          <ul className="space-y-2 text-gray-700 dark:text-gray-200 list-disc pl-5">
            {/* Bulan tersibuk */}
            {insights.busiestMonth && (
              <li>Bulan tersibuk: <span className="font-bold text-blue-700 dark:text-blue-300">{insights.busiestMonth.label}</span> dengan <span className="font-bold text-blue-700 dark:text-blue-300">{insights.busiestMonth.count}</span> tiket{insights.busiestMonth.trend && <span className="ml-1 text-xs font-semibold text-blue-500 dark:text-blue-300">({insights.busiestMonth.trend > 0 ? '+' : ''}{insights.busiestMonth.trend}% dari bulan sebelumnya)</span>}.</li>
            )}
            {/* Kategori dominan */}
            {insights.topCategory && (
              <li>Kategori dominan: <span className="font-bold text-blue-700 dark:text-blue-300">{insights.topCategory.cat}</span> (<span className="font-bold text-blue-700 dark:text-blue-300">{insights.topCategory.count}</span> tiket){typeof insights.topCategory.trend === 'number' && <span className="ml-1 text-xs font-semibold text-blue-500 dark:text-blue-300">, tren {insights.topCategory.trend > 0 ? 'naik' : 'turun'} {Math.abs(insights.topCategory.trend).toFixed(1)}%</span>}.</li>
            )}
            {/* Pelanggan kronis/ekstrem */}
            {insights.chronicPercent && (
              <li><span className="font-bold text-blue-700 dark:text-blue-300">{insights.chronicPercent}%</span> pelanggan termasuk kategori <span className="font-bold text-blue-700 dark:text-blue-300">Kronis/Ekstrem</span> (lebih dari 10 tiket).</li>
            )}
            {/* Rasio komplain tertinggi */}
            {typeof complaintPenetrationByType !== 'undefined' && (
              <li>Jenis klien dengan rasio komplain tertinggi: <span className="font-bold text-blue-700 dark:text-blue-300">{complaintPenetrationByType.maxType}</span> (<span className="font-bold text-blue-700 dark:text-blue-300">{complaintPenetrationByType.maxValue}%</span>).</li>
            )}
            {/* Penetrasi komplain kategori tertinggi */}
            {typeof complaintPenetrationByCategory !== 'undefined' && (
              <li>Kategori klien dengan penetrasi komplain tertinggi: <span className="font-bold text-blue-700 dark:text-blue-300">{complaintPenetrationByCategory.maxCategory}</span> (<span className="font-bold text-blue-700 dark:text-blue-300">{complaintPenetrationByCategory.maxValue}%</span>).</li>
            )}
            {/* Shift dengan handling time terlama */}
            {typeof safeMaxAvg !== 'undefined' && safeMaxAvg.shift && (
              <li>Shift dengan rata-rata handling time terlama: <span className="font-bold text-blue-700 dark:text-blue-300">{safeMaxAvg.shift}</span> (<span className="font-bold text-blue-700 dark:text-blue-300">{safeMaxAvg.formattedAvg}</span>).</li>
            )}
            {/* Kategori dengan handling time terlama */}
            {typeof safeMaxAvgCat !== 'undefined' && safeMaxAvgCat.cat && (
              <li>Kategori dengan rata-rata handling time terlama: <span className="font-bold text-blue-700 dark:text-blue-300">{safeMaxAvgCat.cat}</span> (<span className="font-bold text-blue-700 dark:text-blue-300">{safeMaxAvgCat.formattedAvg}</span>).</li>
            )}
            {/* Rekomendasi otomatis */}
            {insightCards && insightCards.length > 0 && insightCards.map((card, idx) => (
              <li key={idx}><span className="font-bold text-orange-500 mr-1">{card.icon}</span>{card.title}: {card.description}</li>
            ))}
          </ul>
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
                    {monthlyStatsData.labels.map((month, idx) => (
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
                        {agentShiftAreaData.map((row, idx) => (
                          <th key={row.month} className="px-4 py-2 font-bold font-mono text-center">{row.month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-zinc-900">
                      <tr>
                        <td className="px-4 py-2 font-bold text-green-600">Pagi</td>
                        {agentShiftAreaData.map((row, idx) => (
                          <td key={row.month} className="px-4 py-2 text-center font-mono">{row.Pagi}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-blue-600">Sore</td>
                        {agentShiftAreaData.map((row, idx) => (
                          <td key={row.month} className="px-4 py-2 text-center font-mono">{row.Sore}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-bold text-red-600">Malam</td>
                        {agentShiftAreaData.map((row, idx) => (
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
                      row[jk] = tiketPerJenisKlienPerBulan[month][jk] || 0;
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
            <table className="min-w-max w-full text-sm text-left mt-6">
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
                    {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => (
                      <td key={month} className="px-4 py-2 text-center font-mono">{tiketPerJenisKlienPerBulan[month][jk] || 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-2 font-bold">Total</td>
                  {Object.keys(tiketPerJenisKlienPerBulan).sort().map(month => {
                    const total = Object.values(tiketPerJenisKlienPerBulan[month]).reduce((a, b) => a + b, 0);
                    return <td key={month} className="px-4 py-2 text-center font-bold font-mono">{total}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
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
                      row[kat] = tiketPerKategoriPerBulan[month][kat] || 0;
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
            <table className="min-w-max w-full text-sm text-left mt-6">
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
                    {Object.keys(tiketPerKategoriPerBulan).sort().map(month => (
                      <td key={month} className="px-4 py-2 text-center font-mono">{tiketPerKategoriPerBulan[month][kat] || 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-4 py-2 font-bold">Total</td>
                  {Object.keys(tiketPerKategoriPerBulan).sort().map(month => {
                    const total = Object.values(tiketPerKategoriPerBulan[month]).reduce((a, b) => a + b, 0);
                    return <td key={month} className="px-4 py-2 text-center font-bold font-mono">{total}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
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
                        const jenis = customerJenisKlienMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && jenis === jk;
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
            <table className="min-w-max w-full text-sm text-left mt-6">
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
                        const jenis = customerJenisKlienMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && jenis === jk;
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
                    // Jumlah total unique clients semua jenis klien di bulan ini
                    const total = jenisKlienList.reduce((sum, jk) => {
                      const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const jenis = customerJenisKlienMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && jenis === jk;
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      return sum + uniqueClients;
                    }, 0);
                    return <td key={month} className="px-4 py-2 text-center font-bold font-mono">{total}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
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
                        const kategori = customerKategoriMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && kategori === kat;
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
            <table className="min-w-max w-full text-sm text-left mt-6">
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
                    // Jumlah total unique clients semua kategori di bulan ini
                    const total = kategoriList.reduce((sum, kat) => {
                      const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const kategori = customerKategoriMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && kategori === kat;
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      return sum + uniqueClients;
                    }, 0);
                    return <td key={month} className="px-4 py-2 text-center font-bold font-mono">{total}</td>;
                  })}
                </tr>
              </tfoot>
            </table>
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
                      // Klien unik yang komplain bulan ini
                      const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const jenis = customerJenisKlienMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && jenis === jk;
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      // Total klien jenis klien bulan ini (dari data customer, filter bulan)
                      const totalClients = Array.from(customerJenisKlienMap.entries()).filter(([name, jenis2]) => jenis2 === jk && customerMonthMap.get(name) && customerMonthMap.get(name).includes(month)).length;
                      row[jk] = totalClients > 0 ? (uniqueClients / totalClients) * 100 : 0;
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
            <table className="min-w-max w-full text-sm text-left mt-6">
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
                        const jenis = customerJenisKlienMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && jenis === jk;
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      const totalClients = Array.from(customerJenisKlienMap.entries()).filter(([name, jenis2]) => jenis2 === jk && customerMonthMap.get(name) && customerMonthMap.get(name).includes(month)).length;
                      const ratio = totalClients > 0 ? (uniqueClients / totalClients) * 100 : 0;
                      return (
                        <td key={month} className="px-4 py-2 text-center font-mono">{ratio.toFixed(2)}%</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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
                      // Total klien kategori bulan ini (dari data customer, filter bulan)
                      const totalClients = Array.from(customerKategoriMap.entries()).filter(([name, kategori2]) => kategori2 === kat && customerMonthMap.get(name) && customerMonthMap.get(name).includes(month)).length;
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
            <table className="min-w-max w-full text-sm text-left mt-6">
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
                      // Klien unik yang komplain bulan ini
                      const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                        const d = new Date(t.openTime);
                        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const kategori = customerKategoriMap.get((t.name || '').trim().toLowerCase()) || 'Unknown';
                        return m === month && kategori === kat;
                      }).map(t => (t.name || '').trim().toLowerCase()))).length;
                      // Total klien kategori bulan ini (dari data customer, filter bulan)
                      const totalClients = Array.from(customerKategoriMap.entries()).filter(([name, kategori2]) => kategori2 === kat && customerMonthMap.get(name) && customerMonthMap.get(name).includes(month)).length;
                      const ratio = totalClients > 0 ? (uniqueClients / totalClients) * 100 : 0;
                      return (
                        <td key={month} className="px-4 py-2 text-center font-mono">{ratio.toFixed(2)}%</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {/* Active Clients per Month (2025) */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle>Active Clients per Month (2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="min-w-max w-full text-sm text-left">
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
                    const totalClients = Array.from(customerMonthMap.entries()).filter(([_name, monthsArr]) => Array.isArray(monthsArr) && monthsArr.includes(month)).length;
                    return (
                      <td key={month} className="px-4 py-2 text-center font-mono">{totalClients}</td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

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
                    const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                      const d = new Date(t.openTime);
                      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      return m === month;
                    }).map(t => (t.name || '').trim().toLowerCase()))).length;
                    const totalClients = Array.from(customerMonthMap.entries()).filter(([_name, monthsArr]) => monthsArr.includes(month)).length;
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
            <table className="min-w-max w-full text-sm text-left mt-6">
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
                    const uniqueClients = Array.from(new Set(gridData2025.filter(t => {
                      const d = new Date(t.openTime);
                      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      return m === month;
                    }).map(t => (t.name || '').trim().toLowerCase()))).length;
                    const totalClients = Array.from(customerMonthMap.entries()).filter(([_name, monthsArr]) => monthsArr.includes(month)).length;
                    const ratio = totalClients > 0 ? (uniqueClients / totalClients) * 100 : 0;
                      return (
                      <td key={month} className="px-4 py-2 text-center font-mono">{ratio.toFixed(2)}%</td>
                      );
                    })}
                </tr>
              </tbody>
            </table>
            </CardContent>
          </Card>
      </div>

      {/* Full-width Hotspot Table */}
      {topComplaintsTable && topComplaintsTable.length > 0 && (
        <div className="mb-12">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-extrabold mb-8 text-gray-900 dark:text-gray-100">Category Hotspot Analysis</h2>
              <div className="overflow-x-auto">
              <table className="w-full text-base text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-zinc-800">
                    <tr>
                    <th className="px-6 py-3 font-bold text-center">RANK</th>
                    <th className="px-6 py-3 font-bold">CATEGORY</th>
                    <th className="px-6 py-3 font-bold text-center">TICKETS</th>
                    <th className="px-6 py-3 font-bold text-center">AVG DURATION</th>
                    <th className="px-6 py-3 font-bold text-center">IMPACT SCORE</th>
                    <th className="px-6 py-3 font-bold text-center">TREND</th>
                    <th className="px-6 py-3 font-bold text-center">CONTRIB.</th>
                    <th className="px-6 py-3 font-bold">TOP SUB-CATEGORY</th>
                    </tr>
                  </thead>
                  <tbody>
                  {topComplaintsTable.map((item, index) => {
                    const rankColors = [
                      'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
                      'bg-gradient-to-r from-gray-400 to-gray-600 text-white',
                      'bg-gradient-to-r from-orange-400 to-orange-600 text-white',
                    ];
                    // --- Trend Calculation (MoM) ---
                    let trendBadge = '-';
                    let trendValue: number | null = null;
                    let trendColor = 'bg-gray-100 text-gray-700';
                    let trendIcon = '●';
                    // Cari trend MoM untuk kategori ini
                    if (monthlyStatsData && monthlyStatsData.labels && monthlyStatsData.labels.length > 1) {
                      // Ambil data tiket per kategori per bulan
                      const monthKeys = monthlyStatsData.labels;
                      // Buat mapping bulan -> tiket kategori ini
                      const catTicketsPerMonth: number[] = monthKeys.map((label, i) => {
                        // Ambil semua tiket di gridData yang category==item.category dan openTime di bulan ini
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
                          trendBadge = `${trendValue > 0 ? '+' : ''}${trendValue.toFixed(1)}%`;
                          if (trendValue > 0.5) { trendColor = 'bg-green-100 text-green-700'; trendIcon = '▲'; }
                          else if (trendValue < -0.5) { trendColor = 'bg-red-100 text-red-700'; trendIcon = '▼'; }
                          else { trendColor = 'bg-gray-100 text-gray-700'; trendIcon = '●'; }
                        } else if (curr > 0) {
                          trendBadge = '+∞%'; trendColor = 'bg-green-100 text-green-700'; trendIcon = '▲';
                        }
                      }
                    }
                    // --- Contribution Calculation ---
                    const totalTickets = gridData.length;
                    const contrib = totalTickets > 0 ? (item.count / totalTickets) * 100 : 0;
                    return (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-zinc-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                        onClick={() => { setSelectedCategory(item.category); setModalOpen(true); }}
                        title="Click to drilldown"
                      >
                        <td className={`px-6 py-4 text-center`}>
                          <span className={`inline-block rounded-full px-3 py-1 font-bold text-lg shadow-sm ${rankColors[index] || 'bg-gray-200 text-gray-700'}`}>#{index + 1}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">{item.category}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 rounded-lg px-3 py-1 font-bold text-base shadow-sm`}>{item.count}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-base">{item.avgDurationFormatted}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-lg text-gray-900 dark:text-zinc-100">{item.impactScore.toFixed(2)}</span>
                            <div className="w-40 h-4 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <div className="bg-gradient-to-r from-red-400 to-red-600 h-4 rounded-full transition-all duration-700" style={{ width: `${(item.impactScore / topComplaintsTable[0].impactScore) * 100}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {trendBadge !== '-' ? (
                            <Badge variant={trendValue > 0.5 ? 'success' : trendValue < -0.5 ? 'danger' : 'default'}>
                              {trendValue > 0.5 ? '▲' : trendValue < -0.5 ? '▼' : '●'} {trendBadge}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-200 rounded-lg px-3 py-1 font-bold text-base shadow-sm">{contrib.toFixed(1)}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 rounded-lg px-3 py-1 font-semibold text-base shadow-sm">{item.topSubCategory}</span>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      )}
      {modalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
            {/* Jangan panggil hook apapun di sini, hanya logic biasa */}
            {(() => {
              // Filter tickets by selectedCategory
              const tickets = gridData.filter(t => t.category === selectedCategory);
              // Agent breakdown (gunakan openBy)
              const agentMap = new Map();
              tickets.forEach(t => {
                const agent = t.openBy && t.openBy.trim() ? t.openBy : 'Unknown';
                if (!agentMap.has(agent)) agentMap.set(agent, { count: 0 });
                agentMap.get(agent).count += 1;
              });
              const agentList = Array.from(agentMap.entries()).map(([agent, v]) => ({ agent, count: v.count }));
              agentList.sort((a, b) => b.count - a.count);
              // Shift breakdown (pakai getShift global)
              const shiftMap = { Pagi: 0, Sore: 0, Malam: 0 };
              tickets.forEach(t => {
                const shift = getShift(t.openTime);
                if (shiftMap[shift] !== undefined) shiftMap[shift] += 1;
              });
              const shiftList = Object.entries(shiftMap).sort((a, b) => b[1] - a[1]);
              // Helper: status badge
              function statusBadge(status) {
                const s = (status || '').toLowerCase();
                if (s === 'closed') return <Badge variant="success">Closed</Badge>;
                if (s === 'open') return <Badge variant="warning">Open</Badge>;
                if (s === 'escalated') return <Badge variant="danger">Escalated</Badge>;
                if (s === 'overdue') return <Badge variant="warning">Overdue</Badge>;
                return <Badge variant="default">{status || '-'}</Badge>;
              }
              // Helper: readable time
              function formatTime(dt) {
                if (!dt) return '-';
                const d = new Date(dt);
                if (isNaN(d.getTime())) return '-';
                return d.toLocaleString();
              }
                  return (
                <>
                  <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Drilldown: {selectedCategory} <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">({tickets.length} tickets)</span></h3>
                  {/* Agent breakdown */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Agent Breakdown</h4>
                    {agentList.length > 0 ? (
                      <table className="w-full text-sm mb-2">
                        <thead>
                          <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-zinc-800">
                            <th className="py-1 pr-2 text-left">Agent</th>
                            <th className="py-1 px-2 text-right">Tickets</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentList.map((a, idx) => (
                            <tr key={a.agent} className={`border-b border-gray-100 dark:border-zinc-800 ${idx === 0 ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''}`}>
                              <td className="py-1 pr-2 font-medium text-gray-900 dark:text-gray-100">{a.agent}</td>
                              <td className="py-1 px-2 text-right font-mono font-bold text-blue-700 dark:text-blue-300">{a.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                    ) : <div className="text-gray-400">No agent data.</div>}
                          </div>
                  {/* Shift breakdown */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Shift Breakdown</h4>
                    <table className="w-full text-sm mb-2">
                      <thead>
                        <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-zinc-800">
                          <th className="py-1 pr-2 text-left">Shift</th>
                          <th className="py-1 px-2 text-right">Tickets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftList.map(([shift, count], idx) => (
                          <tr key={shift} className={idx === 0 ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''}>
                            <td className="py-1 pr-2 font-medium text-gray-900 dark:text-gray-100">{shift}</td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-blue-700 dark:text-blue-300">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                          </div>
                  {/* Ticket list */}
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Ticket List</h4>
                    <div className="max-h-52 overflow-y-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-zinc-800">
                            <th className="py-1 px-2 text-left">Subject</th>
                            <th className="py-1 px-2 text-left">Agent</th>
                            <th className="py-1 px-2 text-left">Customer</th>
                            <th className="py-1 px-2 text-left">Open Time</th>
                            <th className="py-1 px-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.slice(0, 20).map((t, i) => (
                            <tr key={i} className="border-b border-gray-100 dark:border-zinc-800">
                              <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{t.description && t.description.trim() ? t.description : <span className='italic text-gray-400'>No subject</span>}</td>
                              <td className="py-1 px-2">{t.openBy && t.openBy.trim() ? t.openBy : <span className='italic text-gray-400'>Unknown</span>}</td>
                              <td className="py-1 px-2">{t.name && t.name.trim() ? t.name : (t.customerId || '-')}</td>
                              <td className="py-1 px-2">{formatTime(t.openTime)}</td>
                              <td className="py-1 px-2">{statusBadge(t.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {tickets.length > 20 && <div className="text-xs text-gray-400 px-2 py-1">Showing 20 of {tickets.length} tickets...</div>}
                        </div>
                              </div>
                </>
              );
            })()}
                        </div>
        </div>
      )}

      {/* Classification Analytics Redesigned - Compact & Informative */}
      <div className="mb-12">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8">
          <h2 className="text-2xl font-extrabold mb-8 text-gray-900 dark:text-gray-100">Classification Analytics</h2>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {Object.entries(classificationData).map(([classification, details], idx) => {
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
                  return (
                <div key={classification} className="flex flex-col py-4 border-b border-gray-100 dark:border-zinc-800 last:border-b-0">
                  <div className="flex items-center">
                  <span className="font-bold min-w-[180px] text-gray-900 dark:text-gray-100 flex items-center">
                              {classification}
                    <span className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200 rounded px-2 py-0.5 text-xs font-bold">{d.count} Total</span>
                            </span>
                  {d.trendline && d.trendline.labels.length > 0 && (
                    <div className="flex-1 flex flex-row gap-4 overflow-x-auto">
                      {d.trendline.labels.map((label, i) => (
                        <div key={label} className="flex flex-col items-center min-w-[70px]">
                          <span className="text-xs text-gray-400 mb-0.5">{label}</span>
                          <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100 mb-0.5">{d.trendline.data[i]}</span>
                          {i > 0 && trend[i] !== null && (
                    <Badge variant={trend[i]! > 0 ? 'success' : trend[i]! < 0 ? 'danger' : 'default'}>
                      {trend[i]! > 0 ? '▲' : trend[i]! < 0 ? '▼' : '●'} {trend[i]! > 0 ? '+' : ''}{trend[i]!.toFixed(1)}%
                    </Badge>
                          )}
                          </div>
                      ))}
                      </div>
                    )}
                  </div>
                  {/* Sub-classification detail */}
                  {d.sub && Object.keys(d.sub).length > 0 && (
                    <div className="mt-2 ml-2">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Sub-klasifikasi:</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(d.sub).sort((a, b) => b[1] - a[1]).map(([sub, count]) => (
                          <span key={sub} className="bg-gray-100 dark:bg-zinc-800 rounded-full px-3 py-0.5 text-xs font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-zinc-700">
                            {sub}: <span className="font-bold">{count}</span>
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
        
      {/* Handling Time Deep Dive */}
      <div className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agregasi data per shift */}
          <Card className="mb-4 h-full flex flex-col bg-white dark:bg-zinc-900 px-2 md:px-4 py-2 md:py-4 shadow-md rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Avg Handling Time per Shift</CardTitle>
              <CardDescription className="text-xs">Rata-rata & median waktu penanganan per shift (jam)</CardDescription>
              <div className="mt-1 flex gap-2 flex-wrap">
                {shiftTrends.map(s => (
                  <span key={s.shift} className="flex items-center gap-1 text-xs font-medium">
                    {s.shift} {getTrendBadge(s.trend)}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pb-0">
              <ChartContainer config={chartConfig} className="w-full" style={{ width: '100%' }}>
                <BarChart data={chartData} height={85} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barAvgGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="barMedianGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e42" stopOpacity={1} />
                      <stop offset="100%" stopColor="#fde68a" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel hideIndicator />} />
                  <Bar dataKey="avg" fill="url(#barAvgGradient)" radius={[8,8,0,0]} isAnimationActive={true} animationDuration={900}>
                    <LabelList dataKey="avgLabel" position="top" />
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} cursor="pointer" style={{ filter: 'drop-shadow(0 2px 6px #2563eb22)' }} />
                    ))}
                  </Bar>
                  <Bar dataKey="median" fill="url(#barMedianGradient)" radius={[8,8,0,0]} isAnimationActive={true} animationDuration={900}>
                    <LabelList dataKey="medianLabel" position="top" />
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} cursor="pointer" style={{ filter: 'drop-shadow(0 2px 6px #f59e4222)' }} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
            <div className="px-3 pb-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs mt-2 border rounded-lg overflow-hidden min-w-[340px]">
                  <thead>
                    <tr className="bg-[#2563eb] text-white font-bold">
                      <th className="px-3 py-2 text-left">Shift</th>
                      <th className="px-3 py-2 text-right">Avg (h)</th>
                      <th className="px-3 py-2 text-right">Median (h)</th>
                      <th className="px-3 py-2 text-right">Tickets</th>
                      <th className="px-3 py-2 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftTrends.map((s, i) => (
                      <tr key={s.shift} className="bg-white dark:bg-zinc-900 hover:bg-blue-50/60 dark:hover:bg-blue-900/40 transition-colors duration-200 cursor-pointer">
                        <td className="px-3 py-2 font-semibold">{s.shift}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{s.formattedAvg}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{s.formattedMedian}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{s.count}</td>
                        <td className="px-3 py-2 text-right">{getTrendBadge(s.trend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">Shift tertinggi: <b>{maxAvg?.shift}</b> ({maxAvg?.avg?.toFixed(2)} jam)</div>
            </div>
          </Card>
          {/* Agregasi data per kategori */}
          <Card className="mb-4 h-full flex flex-col bg-white dark:bg-zinc-900 px-2 md:px-4 py-2 md:py-4 shadow-md rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Avg Handling Time per Category</CardTitle>
              <CardDescription className="text-xs">Rata-rata & median waktu penanganan per kategori (jam)</CardDescription>
              <div className="mt-1 flex gap-2 flex-wrap">
                {catTrends.map(s => (
                  <span key={s.cat} className="flex items-center gap-1 text-xs font-medium">
                    {s.cat} {getTrendBadge(s.trend)}
                  </span>
                ))}
        </div>
            </CardHeader>
            <CardContent className="pb-0">
              <ChartContainer config={chartConfig} className="w-full" style={{ width: '100%' }}>
                <BarChart data={catChartData} height={85} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barAvgGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="barMedianGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e42" stopOpacity={1} />
                      <stop offset="100%" stopColor="#fde68a" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel hideIndicator />} />
                  <Bar dataKey="avg" fill="url(#barAvgGradient)" radius={[8,8,0,0]} isAnimationActive={true} animationDuration={900}>
                    <LabelList dataKey="avgLabel" position="top" />
                    {catChartData.map((entry, idx) => (
                      <Cell key={idx} cursor="pointer" style={{ filter: 'drop-shadow(0 2px 6px #2563eb22)' }} />
                    ))}
                  </Bar>
                  <Bar dataKey="median" fill="url(#barMedianGradient)" radius={[8,8,0,0]} isAnimationActive={true} animationDuration={900}>
                    <LabelList dataKey="medianLabel" position="top" />
                    {catChartData.map((entry, idx) => (
                      <Cell key={idx} cursor="pointer" style={{ filter: 'drop-shadow(0 2px 6px #f59e4222)' }} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
            <div className="px-3 pb-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs mt-2 border rounded-lg overflow-hidden min-w-[340px]">
                  <thead>
                    <tr className="bg-[#2563eb] text-white font-bold">
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-right">Avg (h)</th>
                      <th className="px-3 py-2 text-right">Median (h)</th>
                      <th className="px-3 py-2 text-right">Tickets</th>
                      <th className="px-3 py-2 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catTrends.map((s, i) => (
                      <tr key={s.cat} className="bg-white dark:bg-zinc-900 hover:bg-blue-50/60 dark:hover:bg-blue-900/40 transition-colors duration-200 cursor-pointer">
                        <td className="px-3 py-2 font-semibold">{s.cat}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{s.formattedAvg}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{s.formattedMedian}</td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{s.count}</td>
                        <td className="px-3 py-2 text-right">{getTrendBadge(s.trend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
      </div>
              <div className="mt-2 text-xs text-muted-foreground">Kategori tertinggi: <b>{maxAvgCat?.cat}</b> ({maxAvgCat?.avg?.toFixed(2)} jam)</div>
    </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

export default TicketAnalytics;
