import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { formatDurationDHM } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

import SummaryCard from '@/components/ui/SummaryCard';
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  PieChart,
  Pie,
  LineChart,
  Line,
  ReferenceLine,
  Cell
} from 'recharts';


import PageWrapper from '@/components/PageWrapper';

// MUI Icons for consistency with project standards
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SupportIcon from '@mui/icons-material/Support';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InsightsIcon from '@mui/icons-material/Insights';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';
import EngineeringIcon from '@mui/icons-material/Engineering';
import FilterListIcon from '@mui/icons-material/FilterList';

// Constants sesuai requirements
const VENDOR_SLA_MINUTES = 240; // 4 jam
const POWER_DELTA_OK_DBM = 1.0;

const NCAL_COLORS = {
  Blue: '#3b82f6',    // blue-500
  Yellow: '#eab308',  // yellow-500
  Orange: '#f97316',  // orange-500
  Red: '#ef4444',     // red-500
  Black: '#1f2937'    // gray-800
};

const NCAL_TARGETS = {
  Blue: 360,    // 6:00:00
  Yellow: 300,  // 5:00:00
  Orange: 240,  // 4:00:00
  Red: 180,     // 3:00:00
  Black: 60     // 1:00:00
};

const NCAL_ORDER = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];

// Month names in chronological order for sorting charts and tables
const MONTH_ORDER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Constants for Waneda payment calculations
const WANEDA_FULL_PAYMENT_JAN_JUN = 30000000; // Rp 30.000.000 per bulan (Jan-Jun)
const WANEDA_FULL_PAYMENT_JUL_DEC = 37500000; // Rp 37.500.000 per bulan (Jul-Dec)
const WANEDA_PENALTY_PER_NON_TARGET = 0; // No penalty per non-target case

// Helper function to get full payment based on month
const getFullPaymentForMonth = (month: string): number => {
  const monthUpper = month.toUpperCase();
  // Jan-Jun: Rp 30.000.000, Jul-Dec: Rp 37.500.000
  if (['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'].includes(monthUpper)) {
    return WANEDA_FULL_PAYMENT_JAN_JUN;
  } else {
    return WANEDA_FULL_PAYMENT_JUL_DEC;
  }
};

// Helper to format currency IDR
const formatCurrency = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) return 'Rp 0';
  const parts = Math.round(num).toString().split('');
  let formatted = '';
  for (let i = 0; i < parts.length; i++) {
    const idx = parts.length - i - 1;
    formatted = parts[idx] + formatted;
    if (i % 3 === 2 && idx !== 0) {
      formatted = '.' + formatted;
    }
  }
  return 'Rp ' + formatted;
};

const TSAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [selectedWanedaMonth, setSelectedWanedaMonth] = useState<string | null>(null);

  // Get all incidents for live updates
  const allIncidents = useLiveQuery(() => 
    db.incidents.toArray()
  );

  // Helper function to categorize TS
  const categorizeTS = (ts: string | null | undefined): 'vendor' | 'internal' => {
    if (!ts) return 'internal';
    const tsLower = ts.toLowerCase();
    if (tsLower.includes('waneda') || tsLower.includes('lintas') || tsLower.includes('fiber')) {
      return 'vendor';
    }
    return 'internal';
  };

  // Helper function to normalize NCAL values
  const normalizeNCAL = (ncal: string | null | undefined): string => {
    if (!ncal) return 'Unknown';
    const normalized = ncal.trim().toLowerCase();
    switch (normalized) {
      case 'blue': return 'Blue';
      case 'yellow': return 'Yellow';
      case 'orange': return 'Orange';
      case 'red': return 'Red';
      case 'black': return 'Black';
      default: return ncal.trim();
    }
  };

  // Helper function to format duration HH:MM:SS
  const formatDurationHMS = (minutes: number): string => {
    if (!minutes || minutes <= 0 || isNaN(minutes)) return '0:00:00';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to format duration to H:MM (no seconds) used in summary table
  const formatDurationHM = (minutes: number): string => {
    if (!minutes || minutes <= 0 || isNaN(minutes)) return '0:00';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  // -----------------------------------------------------------------------------
  // Generic datetime helper
  //
  // Many of the incident objects in our data store originate from Excel sheets
  // or CSV exports where column names may vary (e.g. "start pause", "StartPause",
  // "pause1", etc.). To avoid hard‑coding every possible variation when
  // displaying timestamps in the detail view, we provide a helper that accepts
  // a logical field name (e.g. 'start', 'pause1') and returns the first
  // matching value formatted as a localized date/time string. This helper looks
  // through a list of possible property names on the incident object and
  // attempts to parse a valid date. If none are found it returns '-'.
  const getDateTime = (incident: any, field: string): string => {
    const lower = field.toLowerCase();
    // map logical names to potential property names on the incident object
    const fieldMap: Record<string, string[]> = {
      start: ['start', 'Start', 'startTime', 'start_time', 'start time', 'begin', 'beginTime', 'begintime'],
      end: ['end', 'End', 'endTime', 'end_time', 'end time', 'finish', 'finishTime', 'finish_time'],
      pause1: [
        'pause1', 'Pause1', 'pause', 'pauseTime', 'pause_time', 'pause1Time', 'startPause',
        'start_pause', 'start pause', 'pause1Start', 'pause1_start', 'pause1 start',
        'startPause1', 'pause1_start_time'
      ],
      restart1: [
        'restart1', 'Restart1', 'restart', 'restartTime', 'restart_time', 'restart1Time',
        'endPause', 'end_pause', 'end pause', 'pause1End', 'pause1_end', 'pause1 end',
        'restartPause', 'restart_pause', 'restart pause'
      ],
      pause2: [
        'pause2', 'Pause2', 'pause2Time', 'pause2_time', 'pause2Start', 'startPause2',
        'start_pause_2', 'start pause 2', 'pause2_start', 'pause2 start',
        'pause2StartTime'
      ],
      restart2: [
        'restart2', 'Restart2', 'restart2Time', 'restart2_time', 'pause2End', 'endPause2',
        'end_pause_2', 'end pause 2', 'pause2_end', 'pause2 end', 'restart2Time',
        'restartPause2', 'restart_pause_2', 'restart pause 2'
      ]
    };
    const candidates = fieldMap[lower] || [field];
    for (const name of candidates) {
      const value = incident[name];
      if (value !== undefined && value !== null && value !== '') {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toLocaleString('id-ID', {
              timeZone: 'Asia/Jakarta',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        } catch {
          // ignore parse errors and continue
        }
      }
    }
    return '-';
  };

  // Helper function to get duration with priority and pause deduction
  const getDurationMinutes = (incident: any): number => {
    let totalDuration = 0;
    
    // Priority: Total Duration Vendor > Duration Vendor > Duration
    if (incident.totalDurationVendorMin && incident.totalDurationVendorMin > 0) {
      totalDuration = incident.totalDurationVendorMin;
    } else if (incident.durationVendorMin && incident.durationVendorMin > 0) {
      totalDuration = incident.durationVendorMin;
    } else if (incident.durationMin && incident.durationMin > 0) {
      totalDuration = incident.durationMin;
    } else {
      return 0;
    }
    
    // Calculate pause duration to be deducted
    let pauseDuration = 0;
    
    // Pause 1: startPause to endPause
    if (incident.startPause && incident.endPause) {
      const startPause = new Date(incident.startPause);
      const endPause = new Date(incident.endPause);
      if (!isNaN(startPause.getTime()) && !isNaN(endPause.getTime()) && endPause > startPause) {
        pauseDuration += (endPause.getTime() - startPause.getTime()) / (1000 * 60); // Convert to minutes
      }
    }
    
    // Pause 2: startPause2 to endPause2
    if (incident.startPause2 && incident.endPause2) {
      const startPause2 = new Date(incident.startPause2);
      const endPause2 = new Date(incident.endPause2);
      if (!isNaN(startPause2.getTime()) && !isNaN(endPause2.getTime()) && endPause2 > startPause2) {
        pauseDuration += (endPause2.getTime() - startPause2.getTime()) / (1000 * 60); // Convert to minutes
      }
    }
    
    // Alternative pause field names
    const pauseFields = [
      'start pause', 'end pause', 'start_pause', 'end_pause',
      'start pause 2', 'end pause 2', 'start_pause_2', 'end_pause_2',
      'pauseStart', 'pauseEnd', 'pauseStart2', 'pauseEnd2'
    ];
    
    // Check for alternative pause field names
    for (let i = 0; i < pauseFields.length; i += 2) {
      const startField = pauseFields[i];
      const endField = pauseFields[i + 1];
      
      if (incident[startField] && incident[endField]) {
        const startPause = new Date(incident[startField]);
        const endPause = new Date(incident[endField]);
        if (!isNaN(startPause.getTime()) && !isNaN(endPause.getTime()) && endPause > startPause) {
          pauseDuration += (endPause.getTime() - startPause.getTime()) / (1000 * 60); // Convert to minutes
        }
      }
    }
    
    // Deduct pause duration from total duration
    const finalDuration = Math.max(0, totalDuration - pauseDuration);
    
    return finalDuration;
  };

  // Helper function to format power values with dBm unit
  const formatPower = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return `${value.toFixed(2)} dBm`;
  };

  // Helper function to calculate average power between two values (unused - removed)
  // const calculateAvgPowerBetween = (powerBefore: number | null, powerAfter: number | null): number | null => {
  //   if (powerBefore === null && powerAfter === null) return null;
  //   if (powerBefore === null) return powerAfter;
  //   if (powerAfter === null) return powerBefore;
  //   return (powerBefore + powerAfter) / 2;
  // };

  // Helper function to get customer name with flexible column mapping
  const getCustomerName = (incident: any): string => {
    return incident.site || 
           incident.customer || 
           incident.namaCustomer || 
           incident.customerName || 
           incident.nama || 
           incident.client || 
           'N/A';
  };

  // Helper function to get case number with flexible column mapping
  const getCaseNumber = (incident: any): string => {
    const caseNumber = incident.noCase || 
                      incident['no case'] ||
                      incident.no_case ||
                      incident.caseId || 
                      incident.caseNo || 
                      incident.nomorCase || 
                      incident.caseNumber || 
                      incident.id || 
                      incident.incidentId || 
                      incident.case_id ||
                      incident.case_id ||
                      incident['case id'] ||
                      incident['case-id'] ||
                      '';
    
    // Handle empty or null values
    if (!caseNumber || caseNumber === 'N/A') return 'N/A';
    
    // Convert to string and trim whitespace
    const cleanCaseNumber = String(caseNumber).trim();
    
    // Handle format N000000 or C000000 (exact match)
    if (cleanCaseNumber.match(/^[NC]\d{6}$/)) {
      return cleanCaseNumber; // Return as is for N252432 or C250583
    }
    
    // Handle format with spaces or special characters
    const normalizedCaseNumber = cleanCaseNumber.replace(/[^NC0-9]/g, '');
    if (normalizedCaseNumber.match(/^[NC]\d{6}$/)) {
      return normalizedCaseNumber;
    }
    
    // Handle other formats
    if (cleanCaseNumber) {
      return cleanCaseNumber;
    }
    
    return 'N/A';
  };

  // Helper function to get classification with flexible column mapping
  const getClassification = (incident: any): string => {
    return incident.classification || 
           incident.klasifikasiGangguan || 
           incident.klasifikasi || 
           incident.issueType || 
           incident.issue || 
           'N/A';
  };

  // Helper function to get note with flexible column mapping
  const getNote = (incident: any): string => {
    return incident.note || 
           incident.notes || 
           incident.keterangan ||
           incident.catatan || 
           incident.description || 
           incident.deskripsi || 
           incident.comment || 
           incident.komentar || 
           incident.remarks || 
           'N/A';
  };

  // Helper function to calculate power difference
  const calculatePowerDifference = (powerBefore: number, powerAfter: number): number => {
    if (powerBefore === null || powerAfter === null || isNaN(powerBefore) || isNaN(powerAfter)) return 0;
    return powerAfter - powerBefore; // Positive means increase in attenuation
  };

  // Filter incidents based on selected period
  const filteredIncidents = useMemo(() => {
    if (!allIncidents) return [];
    const now = new Date();
    const cutoffDate = new Date();
    switch (selectedPeriod) {
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return allIncidents;
    }
    return allIncidents.filter(incident => {
      if (!incident.startTime) return false;
      const incidentDate = new Date(incident.startTime);
      return incidentDate >= cutoffDate;
    });
  }, [allIncidents, selectedPeriod]);

  // Calculate comprehensive statistics
  const analyticsData = useMemo(() => {
    if (!filteredIncidents || filteredIncidents.length === 0) {
      return {
        total: 0,
        vendor: {
          total: 0,
          unique: 0,
          avgDuration: 0,
          slaCompliance: 0,
          escalationRate: 0,
          powerCompliance: 0,
          byVendor: {},
          byMonth: {}
        },
        internal: {
          total: 0,
          unique: 0,
          avgDuration: 0,
        escalationRate: 0,
        byTS: {},
          byNCAL: {},
          byMonth: {}
        }
      };
    }
    // Separate vendor and internal incidents
    const vendorIncidents = filteredIncidents.filter(i => categorizeTS(i.ts) === 'vendor');
    const internalIncidents = filteredIncidents.filter(i => categorizeTS(i.ts) === 'internal');
    // Vendor analytics
    const vendorStats = {
      total: vendorIncidents.length,
      unique: new Set(vendorIncidents.map(i => i.ts)).size,
      avgDuration: 0,
      slaCompliance: 0,
      escalationRate: 0,
      powerCompliance: 0,
      byVendor: {} as Record<string, any>,
      byMonth: {} as Record<string, any>
    };
    if (vendorIncidents.length > 0) {
      const validDurations = vendorIncidents
        .map(i => getDurationMinutes(i))
        .filter(d => d > 0);
      vendorStats.avgDuration = validDurations.length > 0 
        ? validDurations.reduce((a, b) => a + b, 0) / validDurations.length 
        : 0;
      const slaCompliant = vendorIncidents.filter(i => {
        const duration = getDurationMinutes(i);
        return duration > 0 && duration <= VENDOR_SLA_MINUTES;
      }).length;
      vendorStats.slaCompliance = (slaCompliant / vendorIncidents.length) * 100;
      const escalated = vendorIncidents.filter(i => i.startEscalationVendor).length;
      vendorStats.escalationRate = (escalated / vendorIncidents.length) * 100;
      const powerValid = vendorIncidents.filter(i => 
        i.powerBefore !== null && i.powerAfter !== null
      );
      const powerCompliant = powerValid.filter(i => {
        const powerDiff = calculatePowerDifference(i.powerBefore, i.powerAfter);
        return powerDiff <= POWER_DELTA_OK_DBM;
      }).length;
      vendorStats.powerCompliance = powerValid.length > 0 
        ? (powerCompliant / powerValid.length) * 100 
        : 0;
      // Group by vendor
      vendorIncidents.forEach(incident => {
        const vendor = incident.ts || 'Unknown';
        if (!vendorStats.byVendor[vendor]) {
          vendorStats.byVendor[vendor] = {
            total: 0,
            slaCompliant: 0,
            powerCompliant: 0,
            totalDuration: 0,
            avgDuration: 0
          };
        }
        vendorStats.byVendor[vendor].total++;
        const duration = getDurationMinutes(incident);
        if (duration > 0) {
          vendorStats.byVendor[vendor].totalDuration += duration;
          if (duration <= VENDOR_SLA_MINUTES) {
            vendorStats.byVendor[vendor].slaCompliant++;
          }
        }
        if (incident.powerBefore !== null && incident.powerAfter !== null) {
          const powerDiff = calculatePowerDifference(incident.powerBefore, incident.powerAfter);
          if (powerDiff <= POWER_DELTA_OK_DBM) {
            vendorStats.byVendor[vendor].powerCompliant++;
          }
        }
      });
      // Calculate averages for vendors
      Object.keys(vendorStats.byVendor).forEach(vendor => {
        const data = vendorStats.byVendor[vendor];
        data.avgDuration = data.totalDuration / data.total;
      });
      // Group by month for vendors
      vendorIncidents.forEach(incident => {
        if (!incident.startTime) return;
        const month = new Date(incident.startTime).toLocaleString('en-US', { month: 'short' }).toUpperCase();
        if (!vendorStats.byMonth[month]) {
          vendorStats.byMonth[month] = {
            total: 0,
            slaCompliant: 0,
            powerCompliant: 0,
            totalDuration: 0
          };
        }
        vendorStats.byMonth[month].total++;
        const duration = getDurationMinutes(incident);
        if (duration > 0) {
          vendorStats.byMonth[month].totalDuration += duration;
          if (duration <= VENDOR_SLA_MINUTES) {
            vendorStats.byMonth[month].slaCompliant++;
          }
        }
        if (incident.powerBefore !== null && incident.powerAfter !== null) {
          const powerDiff = calculatePowerDifference(incident.powerBefore, incident.powerAfter);
          if (powerDiff <= POWER_DELTA_OK_DBM) {
            vendorStats.byMonth[month].powerCompliant++;
          }
        }
      });
    }
    // Internal analytics
    const internalStats = {
      total: internalIncidents.length,
      unique: new Set(internalIncidents.map(i => i.ts)).size,
      avgDuration: 0,
      escalationRate: 0,
      byTS: {} as Record<string, any>,
      byNCAL: {} as Record<string, any>,
      byMonth: {} as Record<string, any>
    };
    if (internalIncidents.length > 0) {
      const validDurations = internalIncidents
        .map(i => getDurationMinutes(i))
        .filter(d => d > 0);
      internalStats.avgDuration = validDurations.length > 0 
        ? validDurations.reduce((a, b) => a + b, 0) / validDurations.length 
        : 0;
      const escalated = internalIncidents.filter(i => i.startEscalationVendor).length;
      internalStats.escalationRate = (escalated / internalIncidents.length) * 100;
      // Group by TS
      internalIncidents.forEach(incident => {
      const ts = incident.ts || 'Unknown';
        if (!internalStats.byTS[ts]) {
          internalStats.byTS[ts] = {
            total: 0,
          totalDuration: 0,
          avgDuration: 0,
            byNCAL: {}
          };
        }
        internalStats.byTS[ts].total++;
        const duration = getDurationMinutes(incident);
        if (duration > 0) {
          internalStats.byTS[ts].totalDuration += duration;
        }
      });
      // Calculate averages per TS
      Object.keys(internalStats.byTS).forEach(ts => {
        const data = internalStats.byTS[ts];
        data.avgDuration = data.totalDuration / data.total;
      });
      // Group by NCAL
      internalIncidents.forEach(incident => {
        const ncal = normalizeNCAL(incident.ncal);
        if (!internalStats.byNCAL[ncal]) {
          internalStats.byNCAL[ncal] = {
            total: 0,
            compliant: 0,
            totalDuration: 0,
            avgDuration: 0,
            complianceRate: 0
          };
        }
        internalStats.byNCAL[ncal].total++;
        const duration = getDurationMinutes(incident);
        if (duration > 0) {
          internalStats.byNCAL[ncal].totalDuration += duration;
          const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
          if (duration <= target) {
            internalStats.byNCAL[ncal].compliant++;
          }
        }
      });
      // Calculate compliance rates per NCAL
      Object.keys(internalStats.byNCAL).forEach(ncal => {
        const data = internalStats.byNCAL[ncal];
        data.avgDuration = data.totalDuration / data.total;
        data.complianceRate = (data.compliant / data.total) * 100;
      });
      // Group by month for internal
      internalIncidents.forEach(incident => {
        if (!incident.startTime) return;
        const month = new Date(incident.startTime).toLocaleString('en-US', { month: 'short' }).toUpperCase();
        if (!internalStats.byMonth[month]) {
          internalStats.byMonth[month] = {
            total: 0,
            totalDuration: 0,
            byNCAL: {}
          };
        }
        internalStats.byMonth[month].total++;
        const duration = getDurationMinutes(incident);
        if (duration > 0) {
          internalStats.byMonth[month].totalDuration += duration;
        }
      const ncal = normalizeNCAL(incident.ncal);
        if (!internalStats.byMonth[month].byNCAL[ncal]) {
          internalStats.byMonth[month].byNCAL[ncal] = {
            total: 0,
            compliant: 0
          };
        }
        internalStats.byMonth[month].byNCAL[ncal].total++;
        const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
        if (duration <= target) {
          internalStats.byMonth[month].byNCAL[ncal].compliant++;
        }
      });
    }
    return {
      total: filteredIncidents.length,
      vendor: vendorStats,
      internal: internalStats
    };
  }, [filteredIncidents]);

  // Compute Waneda-specific monthly recap and performance details
  const wanedaStats = useMemo(() => {
    // filter vendor incidents for Waneda only
    const wanedaIncidents = filteredIncidents.filter(i => {
      return categorizeTS(i.ts) === 'vendor' && i.ts && i.ts.toLowerCase().includes('waneda');
    });
    if (wanedaIncidents.length === 0) {
      return {
        items: [] as any[],
        total: {
          total: 0,
          target: 0,
          nonTarget: 0,
          totalDuration: 0,
          extraDuration: 0,
          avgDuration: 0,
          avgExtra: 0,
          actualSLA: 0,
          deduction: 0,
          actualPayment: 0,
          costPerCase: 0
        },
        donutData: [] as any[]
      };
    }
    // Group by month
    const monthMap: Record<string, any> = {};
    wanedaIncidents.forEach(incident => {
      if (!incident.startTime) return;
      const month = new Date(incident.startTime).toLocaleString('en-US', { month: 'short' }).toUpperCase();
      if (!monthMap[month]) {
        monthMap[month] = {
          month,
          total: 0,
          target: 0,
          nonTarget: 0,
          totalDuration: 0,
          extraDuration: 0,
          totalPowerDiff: 0,
          countPowerDiff: 0,
          incidents: [] as any[]
        };
      }
      monthMap[month].total++;
      const duration = getDurationMinutes(incident);
      const extraTime = Math.max(duration - VENDOR_SLA_MINUTES, 0);
      monthMap[month].totalDuration += duration;
      monthMap[month].extraDuration += extraTime;
      // accumulate power difference (powerAfter - powerBefore) for attenuation calculation
      if (typeof incident.powerBefore === 'number' && typeof incident.powerAfter === 'number' && 
          !isNaN(incident.powerBefore) && !isNaN(incident.powerAfter)) {
        const diff = incident.powerAfter - incident.powerBefore; // Positive means increase in attenuation
        monthMap[month].totalPowerDiff += diff;
        monthMap[month].countPowerDiff++;
      }
      if (duration <= VENDOR_SLA_MINUTES) {
        monthMap[month].target++;
      } else {
        monthMap[month].nonTarget++;
      }
      monthMap[month].incidents.push(incident);
    });
    // define month order for sorting
    const monthOrder = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const items = Object.values(monthMap).sort((a: any, b: any) => {
      const idxA = monthOrder.indexOf(a.month);
      const idxB = monthOrder.indexOf(b.month);
      return idxA - idxB;
    }).map((data: any) => {
      const avgDuration = data.total > 0 ? data.totalDuration / data.total : 0;
      const avgExtra = data.nonTarget > 0 ? data.extraDuration / data.nonTarget : 0;
      
      // Calculate Actual SLA (Definisi B): score_i = min(1, 240/duration_i)
      let actualSLA = 0;
      if (data.incidents.length > 0) {
        const scores = data.incidents.map((incident: any) => {
          const d = getDurationMinutes(incident);
          if (!d || d <= 0 || isNaN(d)) return 0;
          return Math.min(1, VENDOR_SLA_MINUTES / d);
        });
        actualSLA = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      }
      
      // Calculate SLA Type2 using Target/Total formula
      const slaType2 = data.total > 0 ? data.target / data.total : 0;
      
      const deduction = data.nonTarget * WANEDA_PENALTY_PER_NON_TARGET;
      const actualPayment = getFullPaymentForMonth(data.month) - deduction;
      const costPerCase = data.total > 0 ? actualPayment / data.total : 0;
      const avgPowerDiff = data.countPowerDiff > 0 ? data.totalPowerDiff / data.countPowerDiff : 0;
      return {
        month: data.month,
        total: data.total,
        target: data.target,
        nonTarget: data.nonTarget,
        avgDuration,
        avgExtra,
        actualSLA,
        slaType2,
        deduction,
        actualPayment,
        costPerCase,
        avgPowerDiff,
        incidents: data.incidents,
        totalDuration: data.totalDuration,
        extraDuration: data.extraDuration,
        totalPowerDiff: data.totalPowerDiff,
        countPowerDiff: data.countPowerDiff
      };
    });
    // accumulate totals across months
    const acc = items.reduce((accum: any, m: any) => {
      accum.total += m.total;
      accum.target += m.target;
      accum.nonTarget += m.nonTarget;
      accum.totalDuration += m.totalDuration;
      accum.extraDuration += m.extraDuration;
      accum.deduction += m.deduction;
      accum.actualPayment += m.actualPayment;
      accum.totalPowerDiff += (m.totalPowerDiff || 0);
      accum.countPowerDiff += (m.countPowerDiff || 0);
      return accum;
    }, { total: 0, target: 0, nonTarget: 0, totalDuration: 0, extraDuration: 0, deduction: 0, actualPayment: 0, totalPowerDiff: 0, countPowerDiff: 0 });
    const avgDurationTotal = acc.total > 0 ? acc.totalDuration / acc.total : 0;
    const avgExtraTotal = acc.nonTarget > 0 ? acc.extraDuration / acc.nonTarget : 0;
    const avgPowerDiffTotal = acc.countPowerDiff > 0 ? acc.totalPowerDiff / acc.countPowerDiff : 0;
    
    // Calculate total Actual SLA (Definisi B): score_i = min(1, 240/duration_i)
    let actualSLATotal = 0;
    if (items.length > 0) {
      const allScores: number[] = [];
      items.forEach((item: any) => {
        item.incidents.forEach((incident: any) => {
          const d = getDurationMinutes(incident);
          if (!d || d <= 0 || isNaN(d)) {
            allScores.push(0);
          } else {
            allScores.push(Math.min(1, VENDOR_SLA_MINUTES / d));
          }
        });
      });
      actualSLATotal = allScores.length > 0 ? 
        allScores.reduce((sum: number, score: number) => sum + score, 0) / allScores.length : 0;
    }
    
    // Calculate total SLA Type2 using Target/Total formula
    const slaType2Total = acc.total > 0 ? acc.target / acc.total : 0;
    
    const costPerCaseTotal = acc.total > 0 ? acc.actualPayment / acc.total : 0;
    const donutData = [
      { name: 'Target', value: acc.target },
      { name: 'Non Target', value: acc.nonTarget }
    ];
      return {
      items,
      total: {
        total: acc.total,
        target: acc.target,
        nonTarget: acc.nonTarget,
        totalDuration: acc.totalDuration,
        extraDuration: acc.extraDuration,
        avgDuration: avgDurationTotal,
        avgExtra: avgExtraTotal,
        avgPowerDiff: avgPowerDiffTotal,
        actualSLA: actualSLATotal,
        slaType2: slaType2Total,
        deduction: acc.deduction,
        actualPayment: acc.actualPayment,
        costPerCase: costPerCaseTotal
      },
      donutData
    };
  }, [filteredIncidents]);

  // Sort Waneda monthly items chronologically from January to December.
  // Without sorting, months derived from object keys may appear in arbitrary order.
  const wanedaItemsSorted = useMemo(() => {
    return [...wanedaStats.items].sort((a: any, b: any) => {
      return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month);
    });
  }, [wanedaStats.items]);

  // Build fiscal months list (Jul to Jun) and prepare monthly view data for Waneda
  const fiscalMonths = ['JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MAR','APR','MAY','JUN'];
  const wanedaMonthlyViewData = fiscalMonths.map(month => {
    const item = wanedaStats.items.find((i: any) => i.month === month);
    if (item) {
      // compute average power difference (powerAfter - powerBefore) per month for attenuation
      const powerDiffs: number[] = [];
      item.incidents.forEach((inc: any) => {
        if (typeof inc.powerBefore === 'number' && typeof inc.powerAfter === 'number' && 
            !isNaN(inc.powerBefore) && !isNaN(inc.powerAfter)) {
          const diff = inc.powerAfter - inc.powerBefore; // Positive means increase in attenuation
          powerDiffs.push(diff);
        }
      });
      // Calculate average power difference with proper handling of decimal places
      const avgPowerBetween = powerDiffs.length > 0 ? 
        Math.round((powerDiffs.reduce((a, b) => a + b, 0) / powerDiffs.length) * 100) / 100 : 0;
      // actual SLA as percentage (0-100) - menggunakan perhitungan per case yang sudah dihitung
      const actualSlaPercent = item.actualSLA * 100;
      // deduction and payments using definisi B (proportional)
      const fullPayment = getFullPaymentForMonth(month);
      const deduction = fullPayment * (1 - (actualSlaPercent / 100));
      const actualPayment = fullPayment - deduction;
      const costPerCase = item.total > 0 ? actualPayment / item.total : 0;
      const slaType2 = item.slaType2 * 100; // percentage
      const paymentType2 = fullPayment * item.slaType2;
    return {
        month,
        totalCase: item.total,
        nonTarget: item.nonTarget,
        target: item.target,
        mttr: item.avgDuration,
        avgExtra: item.avgExtra,
        avgPowerBetween,
        actualSlaPercent,
        targetSlaPercent: 100,
        fullPayment: fullPayment,
        actualPayment,
        deduction,
        costPerCase,
        slaType2,
        paymentType2
      };
          } else {
        // months with no data: assume zero cases and full deduction
        const fullPayment = getFullPaymentForMonth(month);
        return {
          month,
          totalCase: 0,
          nonTarget: 0,
          target: 0,
          mttr: 0,
          avgExtra: 0,
          avgPowerBetween: 0,
          actualSlaPercent: 0,
          targetSlaPercent: 100,
          fullPayment: fullPayment,
          actualPayment: 0,
          deduction: fullPayment,
          costPerCase: 0,
          slaType2: 0,
          paymentType2: 0
        };
      }
  });

  // Helper function for simple averages
  const monthsWithData = wanedaMonthlyViewData.filter(m => m.totalCase > 0);
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // Compute totals across fiscal year using definisi B
  const totalWanedaDefB = wanedaMonthlyViewData.reduce((acc: any, row: any) => {
    acc.totalCase += row.totalCase;
    acc.nonTarget += row.nonTarget;
    acc.target += row.target;
    acc.totalPayments += row.actualPayment;
    acc.totalDeductions += row.deduction;
    acc.totalPaymentType2 += row.paymentType2;
    return acc;
  }, { totalCase: 0, nonTarget: 0, target: 0, totalPayments: 0, totalDeductions: 0, totalPaymentType2: 0 });

  // Auto-generated insights based on Waneda and Internal TS performance
  const insights = useMemo(() => {
    const items: { icon: JSX.Element; title: string; description: string }[] = [];
    // Insights for Waneda vendor: determine best and worst SLA months and longest average extra time
    if (wanedaStats.items && wanedaStats.items.length > 0) {
      let bestSlaItem = wanedaStats.items[0];
      let worstSlaItem = wanedaStats.items[0];
      let longestExtraItem = wanedaStats.items[0];
      wanedaStats.items.forEach(item => {
        if (item.actualSLA > bestSlaItem.actualSLA) bestSlaItem = item;
        if (item.actualSLA < worstSlaItem.actualSLA) worstSlaItem = item;
        if (item.avgExtra > longestExtraItem.avgExtra) longestExtraItem = item;
      });
      items.push({
                        icon: <TrendingUpIcon className="w-5 h-5 text-green-600" />, 
        title: 'Best SLA Month',
        description: `${bestSlaItem.month}: ${(bestSlaItem.actualSLA * 100).toFixed(1)}% SLA`
      });
      items.push({
                        icon: <TrendingDownIcon className="w-5 h-5 text-red-600" />, 
        title: 'Worst SLA Month',
        description: `${worstSlaItem.month}: ${(worstSlaItem.actualSLA * 100).toFixed(1)}% SLA`
      });
      // convert average extra time (minutes) to hours for readability
      const longestExtraHours = longestExtraItem.avgExtra / 60;
      items.push({
                        icon: <AccessTimeIcon className="w-5 h-5 text-yellow-600" />, 
        title: 'Longest Extra Time',
        description: `${longestExtraItem.month}: ${formatDurationDHM(longestExtraHours)}`
      });
    }
    // Best NCAL category among internal TS
    if (analyticsData.internal && analyticsData.internal.byNCAL) {
      const ncalEntries = Object.entries(analyticsData.internal.byNCAL);
      if (ncalEntries.length > 0) {
        let bestCatName = ncalEntries[0][0];
        let bestCatRate = (ncalEntries[0][1] as any).complianceRate;
        ncalEntries.forEach(([name, data]) => {
          const rate = (data as any).complianceRate;
          if (rate > bestCatRate) {
            bestCatName = name;
            bestCatRate = rate;
          }
        });
        items.push({
                          icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />, 
          title: 'Top NCAL Category',
          description: `${bestCatName}: ${bestCatRate.toFixed(1)}% compliance`
        });
      }
    }
    // Fastest internal TS team (lowest average duration)
    if (analyticsData.internal && analyticsData.internal.byTS) {
      const tsEntries = Object.entries(analyticsData.internal.byTS);
      if (tsEntries.length > 0) {
        let fastestName = tsEntries[0][0];
        let fastestAvg = (tsEntries[0][1] as any).avgDuration;
        tsEntries.forEach(([name, data]) => {
          const avg = (data as any).avgDuration;
          if (avg < fastestAvg) {
            fastestName = name;
            fastestAvg = avg;
          }
        });
        items.push({
          icon: <TimelineIcon className="w-5 h-5 text-blue-600" />, 
          title: 'Fastest TS Team',
          description: `${fastestName}: ${formatDurationHM(fastestAvg)}`
        });
      }
    }
    return items;
  }, [wanedaStats, analyticsData]);


  useEffect(() => {
    setIsLoading(false);
  }, [allIncidents]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-4">
          {/* Period Filter */}
          <div className="flex items-center gap-2 scale-75 transform origin-right">
            <FilterListIcon className="w-4 h-4 text-muted-foreground" />
            <div className="flex bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-lg p-2">
              {[
                { key: '3m', label: '3M' },
                { key: '6m', label: '6M' },
                { key: '1y', label: '1Y' },
                { key: 'all', label: 'All' }
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant={selectedPeriod === key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedPeriod(key as any)}
                  className={`text-xs rounded-xl ${
                    selectedPeriod === key 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        {/* Overall Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            icon={<SupportIcon />}
            title="Total Incidents"
            value={analyticsData.total}
            description={`${analyticsData.vendor.unique + analyticsData.internal.unique} unique teams`}
            iconBg="bg-blue-500"
          />
          <SummaryCard
            icon={<BusinessIcon />}
            title="Vendor Incidents"
            value={analyticsData.vendor.total}
            description={`${analyticsData.vendor.unique} vendors`}
            iconBg="bg-blue-600"
          />
          <SummaryCard
            icon={<EngineeringIcon />}
            title="Internal TS"
            value={analyticsData.internal.total}
            description={`${analyticsData.internal.unique} teams`}
                            iconBg="bg-green-600"
          />
          <SummaryCard
            icon={<AccessTimeIcon />}
            title="Avg Response Time"
            value={formatDurationHMS(analyticsData.vendor.avgDuration || analyticsData.internal.avgDuration)}
            description="Overall average"
                            iconBg="bg-yellow-500"
          />
        </div>
        {/* Auto Insights Section */}
        {insights.length > 0 && (
          <Card>
            <CardHeader className="flex flex-col gap-1 pb-1">
              <CardTitle className="font-extrabold text-xl flex items-center gap-2">
                <InsightsIcon className="w-6 h-6 text-indigo-600" />
                Key Insights
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Automatically generated highlights from recent performance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-shrink-0">
                      {insight.icon}
                      </div>
                    <div className="space-y-0.5">
                      <div className="font-medium text-sm">{insight.title}</div>
                      <div className="text-xs text-muted-foreground">{insight.description}</div>
                        </div>
                      </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor vs Internal Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendor Performance */}
          <Card>
            <CardHeader className="flex flex-col gap-1 pb-1">
              <CardTitle className="font-extrabold text-xl flex items-center gap-2">
                <BusinessIcon className="w-6 h-6 text-blue-600" />
                Vendor Performance
                <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">
                  SLA 4H
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Waneda & Lintas Fiber performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* SLA Compliance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">SLA Compliance (≤4h)</span>
                    <span className="text-base font-bold text-blue-600">
                      {analyticsData.vendor.slaCompliance.toFixed(1)}%
                    </span>
                      </div>
                  <Progress 
                    value={analyticsData.vendor.slaCompliance} 
                    className="h-2"
                  />
                </div>
                {/* Power Compliance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Power Compliance (≤+1dBm)</span>
                    <span className="text-base font-bold text-purple-600">
                      {analyticsData.vendor.powerCompliance.toFixed(1)}%
                        </span>
                        </div>
                    <Progress 
                      value={analyticsData.vendor.powerCompliance} 
                      className="h-2"
                    />
                </div>
                {/* Vendor Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">By Vendor</h4>
                  {Object.entries(analyticsData.vendor.byVendor).map(([vendor, data]) => (
                    <div key={vendor} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{vendor}</div>
                        <div className="text-xs text-muted-foreground">
                          {data.total} cases • {formatDurationHMS(data.avgDuration)}
                      </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-blue-600">
                          {data.total > 0 ? ((data.slaCompliant / data.total) * 100).toFixed(1) : 0}%
                      </div>
                        <div className="text-xs text-muted-foreground">SLA</div>
                      </div>
                    </div>
                  ))}
                  </div>
              </div>
            </CardContent>
          </Card>
          {/* Internal TS Performance */}
          <Card>
            <CardHeader className="flex flex-col gap-1 pb-1">
              <CardTitle className="font-extrabold text-xl flex items-center gap-2">
                <EngineeringIcon className="w-6 h-6 text-green-600" />
                Internal TS Performance
                <Badge className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">
                  NCAL Targets
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Internal Technical Support team performance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* NCAL Compliance Overview */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">NCAL Compliance</h4>
                  {NCAL_ORDER.map(ncal => {
                    const data = analyticsData.internal.byNCAL[ncal];
                    if (!data) return null;
                  return (
                      <div key={ncal} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS] }}
                          />
                          <div>
                            <div className="font-medium text-sm">{ncal}</div>
                            <div className="text-xs text-muted-foreground">
                              {data.total} cases • {formatDurationHMS(data.avgDuration)}
                        </div>
                      </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-600">
                            {data.complianceRate.toFixed(1)}%
                        </div>
                          <div className="text-xs text-muted-foreground">Target: {formatDurationHMS(NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS])}</div>
                        </div>
                        </div>
                    );
                  })}
                      </div>
                {/* TS Team Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">By Team</h4>
                  {Object.entries(analyticsData.internal.byTS).slice(0, 5).map(([ts, data]) => (
                    <div key={ts} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{ts}</div>
                        <div className="text-xs text-muted-foreground">
                          {data.total} cases • {formatDurationHMS(data.avgDuration)}
                        </div>
                        </div>
                      </div>
                  ))}
                    </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* NCAL Compliance Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendor NCAL Compliance */}
          <Card>
            <CardHeader className="flex flex-col gap-1 pb-1">
              <CardTitle className="font-extrabold text-xl flex items-center gap-2">
                <AssessmentIcon className="w-6 h-6 text-blue-600" />
                Vendor NCAL Compliance
                <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">
                  SLA Focus
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Vendor performance against NCAL levels
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <ChartContainer config={{
                  slaCompliant: { label: "SLA Compliant", color: "#10b981" },
                  slaExceeded: { label: "SLA Exceeded", color: "#ef4444" },
                }}>
                  <BarChart 
                    accessibilityLayer
                    data={Object.entries(analyticsData.vendor.byMonth)
                      .sort(([a], [b]) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b))
                      .map(([month, data]) => ({
                        month,
                        slaCompliant: data.slaCompliant,
                        slaExceeded: data.total - data.slaCompliant
                      }))}
                  >
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      tickLine={false} 
                      tickMargin={10} 
                      axisLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="slaCompliant" fill="#10b981" radius={4} />
                    <Bar dataKey="slaExceeded" fill="#ef4444" radius={4} />
                  </BarChart>
                </ChartContainer>
                      </div>
            </CardContent>
          </Card>
          {/* Internal NCAL Compliance */}
          <Card>
            <CardHeader className="flex flex-col gap-1 pb-1">
              <CardTitle className="font-extrabold text-xl flex items-center gap-2">
                <AssessmentIcon className="w-6 h-6 text-green-600" />
                Internal NCAL Compliance
                <Badge className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">
                  Target Focus
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Internal TS performance against NCAL targets
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <ChartContainer config={{
                  compliant: { label: "Compliant", color: "#10b981" },
                  exceeded: { label: "Exceeded", color: "#ef4444" },
                }}>
                  <BarChart 
                    accessibilityLayer
                    data={NCAL_ORDER.map(ncal => {
                      const data = analyticsData.internal.byNCAL[ncal];
                      return {
                        ncal,
                        compliant: data ? data.compliant : 0,
                        exceeded: data ? data.total - data.compliant : 0
                      };
                    })}
                  >
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="ncal" 
                      tickLine={false} 
                      tickMargin={10} 
                      axisLine={false}
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="compliant" fill="#10b981" radius={4} />
                    <Bar dataKey="exceeded" fill="#ef4444" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Vendor Redaman Analysis & Workload Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendor Redaman Analysis */}
          <Card>
            <CardHeader className="flex flex-col gap-1 pb-1">
              <CardTitle className="font-extrabold text-xl flex items-center gap-2">
                <TrendingDownIcon className="w-6 h-6 text-purple-600" />
                Vendor Redaman Analysis
                <Badge className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">
                  Δ ≥ +1 dBm
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Signal attenuation analysis for vendor incidents
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                                <ChartContainer config={{
                  powerCompliant: { label: "≤ +1 dBm", color: "var(--chart-2)" },
                  powerExceeded: { label: "> +1 dBm", color: "var(--chart-1)" },
                }}>
                <BarChart 
                    accessibilityLayer
                    data={Object.entries(analyticsData.vendor.byMonth)
                      .sort(([a],[b]) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b))
                      .map(([month, data]) => ({
                        month,
                        powerCompliant: data.powerCompliant,
                        powerExceeded: data.total - data.powerCompliant
                      }))}
                  >
                    <CartesianGrid vertical={false} />
                  <XAxis 
                      dataKey="month" 
                      tickLine={false} 
                      tickMargin={10} 
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                  <ChartTooltip
                    cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                                         <Bar dataKey="powerCompliant" fill="#a855f7" radius={4} />
                     <Bar dataKey="powerExceeded" fill="#ef4444" radius={4} />
                </BarChart>
              </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Workload Distribution */}
          <Card>
            <CardHeader className="flex flex-col gap-1 pb-1">
              <CardTitle className="font-extrabold text-xl flex items-center gap-2">
                <BarChartIcon className="w-6 h-6 text-zinc-600" />
                Workload Distribution
                <Badge className="bg-zinc-600 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">
                  By Month
                </Badge>
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Incident distribution across vendor and internal teams
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <ChartContainer config={{
                  vendor: { label: "Vendor", color: "var(--chart-1)" },
                  internal: { label: "Internal TS", color: "var(--chart-2)" },
                }}>
                  <BarChart 
                    accessibilityLayer
                    data={(() => {
                      const allMonths = new Set([
                        ...Object.keys(analyticsData.vendor.byMonth),
                        ...Object.keys(analyticsData.internal.byMonth)
                      ]);
                      return Array.from(allMonths)
                        .sort((a: any, b: any) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b))
                        .map(month => ({
                          month,
                          vendor: analyticsData.vendor.byMonth[month]?.total || 0,
                          internal: analyticsData.internal.byMonth[month]?.total || 0
                        }));
                    })()}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      tickLine={false} 
                      tickMargin={10} 
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="vendor" fill="#3b82f6" radius={4} />
                    <Bar dataKey="internal" fill="#10b981" radius={4} />
                  </BarChart>
                </ChartContainer>
                    </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between p-4 pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded"></div>
                  <span>Vendor</span>
                  </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-600 rounded"></div>
                  <span>Internal TS</span>
                    </div>
                  </div>
              <div className="text-sm text-muted-foreground">
                Total: {analyticsData.total} incidents
                </div>
            </CardFooter>
          </Card>
        </div>
        {/* Waneda Monthly Recap and Performance */}
        <Card>
          <CardHeader className="flex flex-col gap-1 pb-1">
            <CardTitle className="font-extrabold text-xl flex items-center gap-2">
              <BusinessIcon className="w-6 h-6 text-blue-700" />
              Waneda Monthly Recap
              <Badge className="bg-blue-700 text-white text-xs px-2 py-0.5 rounded-md w-fit font-semibold">
                Vendor Focus
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Detailed monthly metrics and payment analysis for Waneda
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* Charts section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar chart for Target vs Non-Target */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Case Count (Target vs Non-Target)</h4>
                <ChartContainer config={{
                  target: { label: 'Target', color: 'var(--chart-2)' },
                  nonTarget: { label: 'Non Target', color: 'var(--chart-1)' },
                }}>
                  <BarChart
                    accessibilityLayer
                    data={wanedaItemsSorted.map(item => ({
                      month: item.month,
                      target: item.target,
                      nonTarget: item.nonTarget
                    }))}
                    onClick={(data: any) => {
                      if (data && data.activeLabel) {
                        setSelectedWanedaMonth(data.activeLabel as string);
                      }
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} />
                  <ChartTooltip
                    cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="target" fill="#10b981" radius={4} />
                    <Bar dataKey="nonTarget" fill="#ef4444" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
              {/* Performance percentage */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Performance (%)</h4>
                <ChartContainer config={{
                  actual: { label: 'Actual SLA', color: 'hsl(var(--chart-2))' },
                  targetLine: { label: 'Target SLA', color: 'hsl(var(--chart-1))' },
                }}>
                <LineChart
                    data={wanedaItemsSorted.map(item => ({
                      month: item.month,
                      actual: item.actualSLA * 100,
                      targetLine: 100
                    }))}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} className="text-xs" />
                    <YAxis tickLine={false} tickMargin={10} axisLine={false} className="text-xs" domain={[0, 120]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="actual" stroke="#10b981" activeDot={{ r: 4 }} />
                    <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" ifOverflow="visible" />
                </LineChart>
              </ChartContainer>
              </div>
              {/* Performance hours (MTTR & Avg Extra Time) */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Performance (Hours)</h4>
                <ChartContainer config={{
                  mttr: { label: 'MTTR', color: 'var(--chart-2)' },
                  extra: { label: 'Avg Extra Time', color: 'var(--chart-1)' },
                }}>
                  <BarChart
                    accessibilityLayer
                    data={wanedaItemsSorted.map(item => ({
                      month: item.month,
                      mttr: item.avgDuration / 60, // convert minutes to hours
                      extra: item.avgExtra / 60
                    }))}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 3)} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="mttr" fill="#3b82f6" radius={4} />
                    <Bar dataKey="extra" fill="#eab308" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
                             {/* Donut chart total */}
               <div className="space-y-2">
                 <h4 className="text-sm font-semibold text-muted-foreground">Total Summary</h4>
                 <ChartContainer
                   config={{
                     target: { label: "Target", color: "var(--chart-2)" },
                     nonTarget: { label: "Non Target", color: "var(--chart-1)" },
                   }}
                   className="mx-auto aspect-square w-full max-w-[250px]"
                 >
                   <PieChart>
                     <ChartTooltip
                       cursor={false}
                       content={<ChartTooltipContent indicator="dashed" />}
                     />
                     <Pie
                       data={wanedaStats.donutData}
                       dataKey="value"
                       nameKey="name"
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={80}
                       fill="#8884d8"
                       label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                     >
                       {wanedaStats.donutData.map((_, index) => (
                         <Cell
                           key={`cell-${index}`}
                           fill={index === 0 ? '#10b981' : '#ef4444'}
                         />
                       ))}
                     </Pie>
                   </PieChart>
                 </ChartContainer>
               </div>
            </div>
            {/* Excel-like Monthly Summary Table */}
            <div className="overflow-x-auto mt-6">
              {/* Define categories for summary table */}
              {(() => {
                const categories = [
                  { key: 'totalCase', label: 'Total Case', color: '' },
                  { key: 'nonTarget', label: 'Non Target', color: 'text-red-600' },
                  { key: 'target', label: 'Target', color: 'text-green-600' },
                  { key: 'mttr', label: 'MTTR', color: '' },
                  { key: 'avgExtra', label: 'Avg Extra Time', color: 'text-red-600' },
                  { key: 'avgPowerBetween', label: 'Avg Power Between', color: '' },
                  { key: 'actualSlaPercent', label: 'Actual SLA', color: '' },
                  { key: 'targetSlaPercent', label: 'Target SLA', color: '' },
                  { key: 'fullPayment', label: 'Full Payment', color: '' },
                  { key: 'actualPayment', label: 'Actual Payment', color: 'text-green-600' },
                  { key: 'deduction', label: 'Deduction', color: 'text-red-600' },
                  { key: 'costPerCase', label: 'Cost/Case', color: '' },
                  { key: 'slaType2', label: 'SLA Type 2', color: '' },
                  { key: 'paymentType2', label: 'Payment Type 2', color: '' }
                ];
                const totalsMap: Record<string, any> = {
                  // sums
                  totalCase: totalWanedaDefB.totalCase,
                  nonTarget: totalWanedaDefB.nonTarget,
                  target: totalWanedaDefB.target,
                  fullPayment: wanedaMonthlyViewData.reduce((sum, row) => sum + row.fullPayment, 0),
                  actualPayment: totalWanedaDefB.totalPayments,
                  deduction: totalWanedaDefB.totalDeductions,
                  paymentType2: totalWanedaDefB.totalPaymentType2,

                  // simple (unweighted) averages across months with data
                  mttr: avg(monthsWithData.map(m => m.mttr)),
                  avgExtra: avg(monthsWithData.map(m => m.avgExtra)),
                  avgPowerBetween: avg(monthsWithData.map(m => m.avgPowerBetween)),
                  actualSlaPercent: avg(monthsWithData.map(m => m.actualSlaPercent)),
                  slaType2: avg(monthsWithData.map(m => m.slaType2)),
                  costPerCase: avg(monthsWithData.map(m => m.costPerCase)),

                  // constant
                  targetSlaPercent: 100,
                };
                return (
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Category</th>
                        {fiscalMonths.map(m => (
                          <th key={m} className="px-3 py-2 font-semibold text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <span>{m}</span>
                              {/* View detail button for each month */}
                                                             <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setSelectedWanedaMonth(m)}
                                 className="px-2 py-0.5 text-xs"
                               >
                                 View
                               </Button>
                            </div>
                          </th>
                        ))}
                        {/* Highlight the TOTAL column header for readability */}
                        <th className="px-3 py-2 font-semibold text-right bg-blue-50 dark:bg-blue-900/20">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat.key} className="border-b border-gray-200 dark:border-zinc-800">
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{cat.label}</td>
                          {wanedaMonthlyViewData.map((row: any) => (
                            <td key={row.month + cat.key} className={`px-3 py-2 text-right ${cat.color}`}>{(() => {
                              const val = (row as any)[cat.key];
                              switch (cat.key) {
                                case 'mttr':
                                case 'avgExtra':
                                  return formatDurationHM(val);
                                case 'avgPowerBetween':
                                  return isNaN(val) || val === 0 ? 'N/A' : `${Number(val).toFixed(2)} dBm`;
                                case 'actualSlaPercent':
                                case 'targetSlaPercent':
                                case 'slaType2':
                                  return `${Number(val).toFixed(1)}%`;
                                case 'fullPayment':
                                case 'actualPayment':
                                case 'deduction':
                                case 'costPerCase':
                                case 'paymentType2':
                                  return formatCurrency(val);
                                default:
                                  return val;
                              }
                            })()}</td>
                          ))}
                          <td className={`px-3 py-2 text-right font-semibold bg-blue-50 dark:bg-blue-900/20 ${cat.color}`}>{(() => {
                            const val = (totalsMap as any)[cat.key];
                            switch (cat.key) {
                              case 'mttr':
                              case 'avgExtra':
                                return formatDurationHM(val);
                              case 'avgPowerBetween':
                                return isNaN(val) || val === 0 ? 'N/A' : `${Number(val).toFixed(2)} dBm`;
                              case 'actualSlaPercent':
                              case 'targetSlaPercent':
                              case 'slaType2':
                                return `${Number(val).toFixed(1)}%`;
                              case 'fullPayment':
                              case 'actualPayment':
                              case 'deduction':
                              case 'costPerCase':
                              case 'paymentType2':
                                return formatCurrency(val);
                              default:
                                return val;
                            }
                          })()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
            {/* Drill-down details */}
            {selectedWanedaMonth && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Detail Cases - {selectedWanedaMonth}</h4>
                  <button
                    onClick={() => setSelectedWanedaMonth(null)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Close
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-2 py-2 font-semibold">Customer</th>
                        <th className="px-2 py-2 font-semibold">Case No</th>
                        <th className="px-2 py-2 font-semibold">Start</th>
                        <th className="px-2 py-2 font-semibold">Pause</th>
                        <th className="px-2 py-2 font-semibold">Restart</th>
                        <th className="px-2 py-2 font-semibold">Pause2</th>
                        <th className="px-2 py-2 font-semibold">Restart2</th>
                        <th className="px-2 py-2 font-semibold">End</th>
                        <th className="px-2 py-2 font-semibold text-right">Duration</th>
                        <th className="px-2 py-2 font-semibold text-right">Target</th>
                        <th className="px-2 py-2 font-semibold text-right">Selisih</th>
                        <th className="px-2 py-2 font-semibold text-right">Performa</th>
                        <th className="px-2 py-2 font-semibold text-right">Power Before</th>
                        <th className="px-2 py-2 font-semibold text-right">Power After</th>
                        <th className="px-2 py-2 font-semibold text-right">Δ Power</th>
                        <th className="px-2 py-2 font-semibold">Classification</th>
                        <th className="px-2 py-2 font-semibold">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wanedaStats.items
                        .find(item => item.month === selectedWanedaMonth)?.incidents.map((incident: any, idx: number) => {
                                                     const duration = getDurationMinutes(incident);
                          const start = getDateTime(incident, 'start');
                          const pause1 = getDateTime(incident, 'pause1');
                          const restart1 = getDateTime(incident, 'restart1');
                          const pause2 = getDateTime(incident, 'pause2');
                          const restart2 = getDateTime(incident, 'restart2');
                          const end = getDateTime(incident, 'end');
                          const targetStr = formatDurationHMS(VENDOR_SLA_MINUTES);
                          const diffMin = duration - VENDOR_SLA_MINUTES;
                          const diffStr = (diffMin < 0 ? '-' : '') + formatDurationHMS(Math.abs(diffMin));
                          const performance = duration <= VENDOR_SLA_MINUTES ? 100 : (VENDOR_SLA_MINUTES / duration) * 100;
                          const perfStr = performance.toFixed(1) + '%';
                          const powerBefore = formatPower(incident.powerBefore);
                          const powerAfter = formatPower(incident.powerAfter);
                          const powerDiff = (typeof incident.powerBefore === 'number' && typeof incident.powerAfter === 'number' && 
                                            !isNaN(incident.powerBefore) && !isNaN(incident.powerAfter)) ? 
                                            `${(incident.powerAfter - incident.powerBefore).toFixed(2)} dBm` : 'N/A';
                          const customer = getCustomerName(incident);
                          const caseNo = getCaseNumber(incident);
                          const classification = getClassification(incident);
                          const note = getNote(incident);
                          return (
                            <tr key={idx} className="border-b border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800">
                              <td className="px-2 py-2">{customer}</td>
                              <td className="px-2 py-2">{caseNo}</td>
                              <td className="px-2 py-2">{start}</td>
                              <td className="px-2 py-2">{pause1 || '-'}</td>
                              <td className="px-2 py-2">{restart1 || '-'}</td>
                              <td className="px-2 py-2">{pause2 || '-'}</td>
                              <td className="px-2 py-2">{restart2 || '-'}</td>
                              <td className="px-2 py-2">{end || '-'}</td>
                              <td className="px-2 py-2 text-right">{formatDurationHMS(duration)}</td>
                              <td className="px-2 py-2 text-right">{targetStr}</td>
                              <td className="px-2 py-2 text-right">{diffStr}</td>
                              <td className="px-2 py-2 text-right">{perfStr}</td>
                              <td className="px-2 py-2 text-right">{powerBefore}</td>
                              <td className="px-2 py-2 text-right">{powerAfter}</td>
                              <td className="px-2 py-2 text-right">{powerDiff}</td>
                              <td className="px-2 py-2">{classification}</td>
                              <td className="px-2 py-2 whitespace-pre-wrap">{note}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default TSAnalytics;