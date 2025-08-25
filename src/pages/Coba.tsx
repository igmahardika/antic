import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import SummaryCard from '@/components/ui/SummaryCard';
import { 
  ChartConfig,
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
  Cell,
  Label,
  LabelList,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  Filter,
  Gauge,
  CheckSquare
} from 'lucide-react';

import PageWrapper from '@/components/PageWrapper';

// MUI Icons for consistency with project standards
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIconMUI from '@mui/icons-material/PieChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import LabelIcon from '@mui/icons-material/Label';
import MonitorIcon from '@mui/icons-material/Monitor';
import BugReportIcon from '@mui/icons-material/BugReport';

// NCAL Color mapping - using project standard colors
const NCAL_COLORS = {
  Blue: '#3b82f6',    // blue-500
  Yellow: '#eab308',  // yellow-500
  Orange: '#f97316',  // orange-500
  Red: '#ef4444',     // red-500
  Black: '#1f2937'    // gray-800
};



// NCAL Target durations in minutes (higher severity = shorter target time)
const NCAL_TARGETS = {
  Blue: 6 * 60,    // 6:00:00 - Least critical
  Yellow: 5 * 60,  // 5:00:00 - Low critical
  Orange: 4 * 60,  // 4:00:00 - Medium critical (shorter than Yellow)
  Red: 3 * 60,     // 3:00:00 - High critical
  Black: 1 * 60    // 1:00:00 - Most critical (shortest target)
};

const NCAL_ORDER = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];

export const IncidentAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [selectedLevelMonth, setSelectedLevelMonth] = useState<string>('all');

  // Get all incidents for live updates
  const allIncidents = useLiveQuery(() => 
    db.incidents.toArray()
  );

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

  // Debug: Log data for verification (background only)
  useEffect(() => {
    if (allIncidents && allIncidents.length > 0) {
      console.group('🔍 INCIDENT ANALYTICS - DATA VERIFICATION');
      console.log('📊 Total incidents loaded:', allIncidents.length);
      console.log('📋 Sample incident:', allIncidents[0]);
      
      // Check NCAL values
      const ncalValues = [...new Set(allIncidents.map(i => i.ncal).filter(Boolean))];
      console.log('🎨 Unique NCAL values:', ncalValues);
      
      // Check date ranges
      const dates = allIncidents
        .filter(i => i.startTime)
        .map(i => new Date(i.startTime!))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (dates.length > 0) {
        console.log('📅 Date range:', {
          earliest: dates[0].toISOString(),
          latest: dates[dates.length - 1].toISOString()
        });
      }
      
      // Check duration values
      const durations = allIncidents
        .filter(i => i.durationMin && i.durationMin > 0)
        .map(i => i.durationMin);
      
      console.log('⏱️ Duration stats:', {
        totalWithDuration: durations.length,
        avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0
      });

      // NCAL breakdown
      const ncalBreakdown = NCAL_ORDER.map(ncal => {
        const count = allIncidents.filter(i => normalizeNCAL(i.ncal) === ncal).length;
        const withDuration = allIncidents.filter(i => 
          normalizeNCAL(i.ncal) === ncal && i.durationMin && i.durationMin > 0
        ).length;
        const totalDuration = allIncidents.filter(i => 
          normalizeNCAL(i.ncal) === ncal && i.durationMin && i.durationMin > 0
        ).reduce((sum, i) => sum + (i.durationMin || 0), 0);
        const avgDuration = withDuration > 0 ? totalDuration / withDuration : 0;

        return {
          ncal,
          count,
          withDuration,
          totalDuration,
          avgDuration: formatDurationHMS(avgDuration)
        };
      });

      console.table(ncalBreakdown);
      console.groupEnd();
    }
  }, [allIncidents]);

  // Helper function to format duration
  const formatDurationHMS = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '0:00:00';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Custom Tooltip Component for NCAL Charts
  const NCALTooltip = ({ active, payload, label, isDuration = false }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 p-3">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {(() => {
            const [year, month] = label.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
          })()}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const ncal = entry.dataKey;
            const value = entry.value;
            const color = NCAL_COLORS[ncal as keyof typeof NCAL_COLORS];
            
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {ncal}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {isDuration ? formatDurationHMS(value) : value.toLocaleString()}
                </span>
      </div>
    );
          })}
        </div>
      </div>
    );
  };

  // Filter incidents by selected period
  const filteredIncidents = useMemo(() => {
    if (!allIncidents) return [];
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (selectedPeriod) {
      case '3m':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6m':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1y':
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        return allIncidents;
    }
    
    const filtered = allIncidents.filter(incident => {
      if (!incident.startTime) return false;
      const incidentDate = new Date(incident.startTime);
      return incidentDate >= cutoffDate;
    });

      // Debug filtered data (background only)
  console.group(`🔍 FILTERED DATA - ${selectedPeriod.toUpperCase()}`);
  console.log('📊 Filtered incidents:', {
    total: filtered.length,
    withStartTime: filtered.filter(i => i.startTime).length,
    withNCAL: filtered.filter(i => i.ncal).length,
    withDuration: filtered.filter(i => i.durationMin && i.durationMin > 0).length,
    withVendorDuration: filtered.filter(i => i.durationVendorMin && i.durationVendorMin > 0).length,
    withPauseTime: filtered.filter(i => i.totalDurationPauseMin && i.totalDurationPauseMin > 0).length
  });
  
  // Sample data for verification
  if (filtered.length > 0) {
    console.log('📋 Sample incident data:', {
      priority: filtered[0].priority,
      site: filtered[0].site,
      level: filtered[0].level,
      ncal: filtered[0].ncal,
      durationMin: filtered[0].durationMin,
      durationVendorMin: filtered[0].durationVendorMin,
      totalDurationPauseMin: filtered[0].totalDurationPauseMin,
      status: filtered[0].status
    });
  }
  console.groupEnd();

    return filtered;
  }, [allIncidents, selectedPeriod]);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    if (!filteredIncidents || filteredIncidents.length === 0) {
      return {
        total: 0,
        open: 0,
        closed: 0,
        mttrMin: 0,
        avgVendorMin: 0,
        pauseRatio: 0,
        byPriority: {},
        byKlas: {},
        bySite: {},
        byLevel: {},
        byNCAL: {},
        byNCALDuration: {},
        byMonth: {},
        byMonthNCAL: {},
        byMonthNCALDuration: {},
        targetPerformance: {}
      };
    }

    const total = filteredIncidents.length;
    const open = filteredIncidents.filter(i => i.status?.toLowerCase() !== 'done').length;
    const closed = total - open;
    
    const incidentsWithDuration = filteredIncidents.filter(i => i.durationMin && i.durationMin > 0);
    const mttrMin = incidentsWithDuration.length > 0 
      ? incidentsWithDuration.reduce((sum, i) => sum + (i.durationMin || 0), 0) / incidentsWithDuration.length
      : 0;

    const incidentsWithVendor = filteredIncidents.filter(i => i.durationVendorMin && i.durationVendorMin > 0);
    const avgVendorMin = incidentsWithVendor.length > 0
      ? incidentsWithVendor.reduce((sum, i) => sum + (i.durationVendorMin || 0), 0) / incidentsWithVendor.length
      : 0;

    const totalPauseTime = filteredIncidents.reduce((sum, i) => sum + (i.totalDurationPauseMin || 0), 0);
    const totalDuration = filteredIncidents.reduce((sum, i) => sum + (i.durationMin || 0), 0);
    const pauseRatio = totalDuration > 0 ? totalPauseTime / totalDuration : 0;

    // Ensure we have valid data for calculations
    console.log('🔍 DATA VALIDATION:', {
      totalIncidents: total,
      incidentsWithDuration: incidentsWithDuration.length,
      incidentsWithVendor: incidentsWithVendor.length,
      incidentsWithPause: filteredIncidents.filter(i => i.totalDurationPauseMin && i.totalDurationPauseMin > 0).length,
      totalPauseTime,
      totalDuration,
      pauseRatio: pauseRatio * 100
    });

    // Group by various categories
    const byPriority = filteredIncidents.reduce((acc, incident) => {
      const priority = incident.priority || 'Unknown';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byKlas = filteredIncidents.reduce((acc, incident) => {
      const klas = incident.klasifikasiGangguan || 'Unknown';
      acc[klas] = (acc[klas] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySite = filteredIncidents.reduce((acc, incident) => {
      const site = incident.site || 'Unknown';
      acc[site] = (acc[site] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byLevel = filteredIncidents.reduce((acc, incident) => {
      const level = incident.level || 'Unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byNCAL = filteredIncidents.reduce((acc, incident) => {
      const ncal = normalizeNCAL(incident.ncal);
      acc[ncal] = (acc[ncal] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byNCALDuration = filteredIncidents.reduce((acc, incident) => {
      const ncal = normalizeNCAL(incident.ncal);
      if (!acc[ncal]) {
        acc[ncal] = { total: 0, count: 0, avg: 0 };
      }
      // Use netDurationMin (real duration without pause) for NCAL duration calculation
      const realDuration = incident.netDurationMin || incident.durationMin || 0;
      if (realDuration > 0) {
        acc[ncal].total += realDuration;
        acc[ncal].count += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; count: number; avg: number }>);

    // Calculate averages
    Object.keys(byNCALDuration).forEach(ncal => {
      if (byNCALDuration[ncal].count > 0) {
        byNCALDuration[ncal].avg = byNCALDuration[ncal].total / byNCALDuration[ncal].count;
      }
    });

    // Group by month
    const byMonth = filteredIncidents.reduce((acc, incident) => {
      if (!incident.startTime) return acc;
      const date = new Date(incident.startTime);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by month and NCAL
    const byMonthNCAL = filteredIncidents.reduce((acc, incident) => {
      if (!incident.startTime) return acc;
      const date = new Date(incident.startTime);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const ncal = normalizeNCAL(incident.ncal);
      
      if (!acc[monthKey]) acc[monthKey] = {};
      acc[monthKey][ncal] = (acc[monthKey][ncal] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Group by month and NCAL duration
    const byMonthNCALDuration = filteredIncidents.reduce((acc, incident) => {
      if (!incident.startTime) return acc;
      const date = new Date(incident.startTime);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const ncal = normalizeNCAL(incident.ncal);
      
      if (!acc[monthKey]) acc[monthKey] = {};
      if (!acc[monthKey][ncal]) {
        acc[monthKey][ncal] = { total: 0, count: 0, avg: 0 };
      }
      
      // Use netDurationMin (real duration without pause) for NCAL duration calculation
      const realDuration = incident.netDurationMin || incident.durationMin || 0;
      if (realDuration > 0) {
        acc[monthKey][ncal].total += realDuration;
        acc[monthKey][ncal].count += 1;
      }
      return acc;
    }, {} as Record<string, Record<string, { total: number; count: number; avg: number }>>);

    // Calculate monthly averages
    Object.keys(byMonthNCALDuration).forEach(month => {
      Object.keys(byMonthNCALDuration[month]).forEach(ncal => {
        if (byMonthNCALDuration[month][ncal].count > 0) {
          byMonthNCALDuration[month][ncal].avg = byMonthNCALDuration[month][ncal].total / byMonthNCALDuration[month][ncal].count;
        }
      });
    });

    // Debug monthly NCAL data (background only)
    console.group('📈 MONTHLY NCAL DATA');
    console.log('📊 Monthly NCAL Count:', byMonthNCAL);
    console.log('⏱️ Monthly NCAL Duration:', byMonthNCALDuration);
    
    // Detailed NCAL Duration Analysis
    console.group('🔍 DETAILED NCAL DURATION ANALYSIS');
    
    // Check Yellow and Orange specifically
    ['Yellow', 'Orange'].forEach(ncal => {
      const incidents = filteredIncidents.filter(i => normalizeNCAL(i.ncal) === ncal);
      const withDuration = incidents.filter(i => {
        const realDuration = i.netDurationMin || i.durationMin || 0;
        return realDuration > 0;
      });
      
      const totalDuration = withDuration.reduce((sum, i) => {
        const realDuration = i.netDurationMin || i.durationMin || 0;
        return sum + realDuration;
      }, 0);
      
      const avgDuration = withDuration.length > 0 ? totalDuration / withDuration.length : 0;
      
      console.log(`🎨 ${ncal} NCAL Analysis:`, {
        totalIncidents: incidents.length,
        incidentsWithDuration: withDuration.length,
        totalDurationMinutes: totalDuration,
        avgDurationMinutes: avgDuration,
        avgDurationFormatted: `${Math.floor(avgDuration / 60)}:${String(Math.floor(avgDuration % 60)).padStart(2, '0')}:${String(Math.floor((avgDuration % 1) * 60)).padStart(2, '0')}`,
        targetDuration: NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS],
        targetFormatted: `${Math.floor(NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] / 60)}:${String(Math.floor(NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] % 60)).padStart(2, '0')}:00`,
        performance: NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] > 0 ? 
          ((NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] - avgDuration) / NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] * 100) : 0
      });
      
      // Sample incidents for verification
      if (withDuration.length > 0) {
        console.log(`📋 Sample ${ncal} incidents:`, withDuration.slice(0, 3).map(i => ({
          noCase: i.noCase,
          durationMin: i.durationMin,
          netDurationMin: i.netDurationMin,
          totalDurationPauseMin: i.totalDurationPauseMin,
          usedDuration: i.netDurationMin || i.durationMin || 0
        })));
      }
    });
    
    console.groupEnd();
    console.groupEnd();

    // Debug category breakdowns (background only)
    console.group('📊 CATEGORY BREAKDOWNS');
    console.log('Priority Distribution:', Object.entries(byPriority).map(([k, v]) => ({ priority: k, count: v })));
    console.log('Site Distribution:', Object.entries(bySite).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ site: k, count: v })));
    console.log('Level Distribution:', Object.entries(byLevel).map(([k, v]) => ({ level: k, count: v })));
    console.log('NCAL Distribution:', Object.entries(byNCAL).map(([k, v]) => ({ ncal: k, count: v })));
    console.groupEnd();

    // Debug performance metrics (background only)
    console.group('⚡ PERFORMANCE METRICS');
    console.log('📊 Vendor Performance:', {
      avgVendorMin,
      incidentsWithVendor: incidentsWithVendor.length,
      totalIncidents: total
    });
    console.log('⏸️ Pause Ratio:', {
      pauseRatio: pauseRatio * 100,
      totalPauseTime,
      totalDuration,
      incidentsWithPause: filteredIncidents.filter(i => i.totalDurationPauseMin && i.totalDurationPauseMin > 0).length
    });
    console.groupEnd();

    // Calculate target performance
    const targetPerformance = Object.keys(byNCALDuration).reduce((acc, ncal) => {
      if (NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS]) {
        const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS];
        const actual = byNCALDuration[ncal].avg;
        const performance = target > 0 ? (target - actual) / target * 100 : 0;
        acc[ncal] = {
          target,
          actual,
          performance,
          status: performance >= 0 ? 'good' : 'poor'
        };
        
        // Debug target performance calculation
        console.log(`🎯 ${ncal} Target Performance:`, {
          target: target,
          targetFormatted: `${Math.floor(target / 60)}:${String(Math.floor(target % 60)).padStart(2, '0')}:00`,
          actual: actual,
          actualFormatted: `${Math.floor(actual / 60)}:${String(Math.floor(actual % 60)).padStart(2, '0')}:${String(Math.floor((actual % 1) * 60)).padStart(2, '0')}`,
          performance: performance,
          status: performance >= 0 ? 'good' : 'poor',
          interpretation: performance >= 0 ? 'Under target (good)' : 'Over target (poor)'
        });
      }
      return acc;
    }, {} as Record<string, { target: number; actual: number; performance: number; status: 'good' | 'poor' }>);

    return {
      total,
      open,
      closed,
      mttrMin,
      avgVendorMin,
      pauseRatio,
      byPriority,
      byKlas,
      bySite,
      byLevel,
      byNCAL,
      byNCALDuration,
      byMonth,
      byMonthNCAL,
      byMonthNCALDuration,
      targetPerformance
    };
  }, [filteredIncidents]);

  // Prepare chart data
  const priorityData = Object.entries(stats.byPriority)
    .sort((a, b) => {
      // Sort by priority order: High, Medium, Low, Unknown
      const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3, 'Unknown': 4 };
      const aOrder = priorityOrder[a[0] as keyof typeof priorityOrder] || 5;
      const bOrder = priorityOrder[b[0] as keyof typeof priorityOrder] || 5;
      return aOrder - bOrder;
    })
    .map(([priority, count]) => ({
      name: priority,
      value: count,
      fill: priority === 'High' ? 'var(--color-high)' : 
            priority === 'Medium' ? 'var(--color-medium)' :
            priority === 'Low' ? 'var(--color-low)' : 'var(--color-unknown)'
    }));



  const siteData = Object.entries(stats.bySite)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([site, count]) => ({
      name: site,
      value: count,
      fill: 'var(--chart-1)'
    }));

  const levelData = Object.entries(stats.byLevel)
    .sort((a, b) => {
      // Sort by level number, handle "Unknown" at the end
      const aLevel = a[0] === 'Unknown' ? 999 : parseInt(a[0]) || 999;
      const bLevel = b[0] === 'Unknown' ? 999 : parseInt(b[0]) || 999;
      return aLevel - bLevel;
    })
    .map(([level, count]) => ({
      name: `Level ${level}`,
      value: count,
      fill: level === '8' ? '#dbeafe' :      // blue-100 (lightest)
            level === '17' ? '#93c5fd' :     // blue-300 (light)
            level === '27' ? '#3b82f6' :     // blue-500 (medium)
            level === '46' ? '#1d4ed8' :     // blue-700 (dark)
            '#1e3a8a'                        // blue-900 (darkest) for unknown
    }));

  // Filtered level data based on selected month
  const filteredLevelData = useMemo(() => {
    if (selectedLevelMonth === 'all') {
      return levelData;
    }

    // Filter incidents by selected month
    const monthFilteredIncidents = filteredIncidents.filter(incident => {
      if (!incident.startTime) return false;
      const incidentDate = new Date(incident.startTime);
      const incidentMonth = `${incidentDate.getFullYear()}-${String(incidentDate.getMonth() + 1).padStart(2, '0')}`;
      return incidentMonth === selectedLevelMonth;
    });

    // Calculate level distribution for filtered incidents
    const filteredByLevel = monthFilteredIncidents.reduce((acc, incident) => {
      const level = incident.level?.toString() || 'Unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Create filtered level data
    return Object.entries(filteredByLevel)
      .sort((a, b) => {
        const aLevel = a[0] === 'Unknown' ? 999 : parseInt(a[0]) || 999;
        const bLevel = b[0] === 'Unknown' ? 999 : parseInt(b[0]) || 999;
        return aLevel - bLevel;
      })
      .map(([level, count]) => ({
        name: `Level ${level}`,
        value: count,
        fill: level === '8' ? '#dbeafe' :      // blue-100 (lightest)
              level === '17' ? '#93c5fd' :     // blue-300 (light)
              level === '27' ? '#3b82f6' :     // blue-500 (medium)
              level === '46' ? '#1d4ed8' :     // blue-700 (dark)
              '#1e3a8a'                        // blue-900 (darkest) for unknown
      }));
  }, [selectedLevelMonth, filteredIncidents, levelData]);

  // Debug filtered level data
  console.log('📊 FILTERED LEVEL DATA:', {
    selectedLevelMonth,
    totalFilteredData: filteredLevelData.length,
    filteredLevelData,
    originalLevelData: levelData
  });

  // Debug chart data preparation
  console.log('📊 CHART DATA PREPARATION:', {
    priorityData,
    siteData: siteData.slice(0, 5), // Show first 5 for debugging
    levelData,
    totalPriorityData: priorityData.length,
    totalSiteData: siteData.length,
    totalLevelData: levelData.length
  });

  const ncalData = NCAL_ORDER.map(ncal => ({
    name: ncal,
    value: stats.byNCAL[ncal] || 0,
    color: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]
  }));

  // Prepare monthly NCAL data for area charts
  const monthlyNCALData = Object.keys(stats.byMonthNCAL)
    .sort()
    .map(month => {
      const monthData: any = { month };
      NCAL_ORDER.forEach(ncal => {
        monthData[ncal] = stats.byMonthNCAL[month]?.[ncal] || 0;
      });
      return monthData;
    });

  const monthlyNCALDurationData = Object.keys(stats.byMonthNCALDuration)
    .sort()
    .map(month => {
      const monthData: any = { month };
      NCAL_ORDER.forEach(ncal => {
        const duration = stats.byMonthNCALDuration[month]?.[ncal];
        monthData[ncal] = duration?.avg || 0;
      });
      return monthData;
    });

  // Filter NCAL categories that have data (non-zero values)
  const activeNCALCategories = NCAL_ORDER.filter(ncal => {
    // Check if any month has non-zero data for this NCAL
    const hasCountData = monthlyNCALData.some(month => month[ncal] > 0);
    const hasDurationData = monthlyNCALDurationData.some(month => month[ncal] > 0);
    return hasCountData || hasDurationData;
  });

  // Create filtered chart data - only include active NCAL categories
  const filteredMonthlyNCALData = monthlyNCALData.map(month => {
    const filteredMonth: any = { month: month.month };
    activeNCALCategories.forEach(ncal => {
      filteredMonth[ncal] = month[ncal];
    });
    return filteredMonth;
  });

  const filteredMonthlyNCALDurationData = monthlyNCALDurationData.map(month => {
    const filteredMonth: any = { month: month.month };
    activeNCALCategories.forEach(ncal => {
      filteredMonth[ncal] = month[ncal];
    });
    return filteredMonth;
  });

  // Chart configurations
  const ncalChartConfig = {
    value: {
      label: "Count",
    },
    ...Object.fromEntries(
      NCAL_ORDER.map(ncal => [
        ncal.toLowerCase(),
        {
          label: ncal,
          color: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS],
        }
      ])
    )
  } satisfies ChartConfig;

  const ncalAreaChartConfig = {
    ...Object.fromEntries(
      activeNCALCategories.map(ncal => [
        ncal.toLowerCase(),
        {
          label: ncal,
          color: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS],
        }
      ])
    )
  } satisfies ChartConfig;

  const priorityChartConfig = {
    value: {
      label: "Count",
    },
    high: {
      label: "High",
      color: "#ef4444", // red-500 for high priority
    },
    medium: {
      label: "Medium", 
      color: "#f59e0b", // amber-500 for medium priority
    },
    low: {
      label: "Low",
      color: "#10b981", // emerald-500 for low priority
    },
    unknown: {
      label: "Unknown",
      color: "#6b7280", // gray-500 for unknown priority
    },
  } satisfies ChartConfig;

  const levelChartConfig = {
    value: {
      label: "Count",
    },
    level8: {
      label: "Level 8",
      color: "#dbeafe", // blue-100 (lightest)
    },
    level17: {
      label: "Level 17",
      color: "#93c5fd", // blue-300 (light)
    },
    level27: {
      label: "Level 27",
      color: "#3b82f6", // blue-500 (medium)
    },
    level46: {
      label: "Level 46",
      color: "#1d4ed8", // blue-700 (dark)
    },
    levelunknown: {
      label: "Level Unknown",
      color: "#1e3a8a", // blue-900 (darkest)
    },
  } satisfies ChartConfig;

  const siteChartConfig = {
    value: {
      label: "Count",
    },
  } satisfies ChartConfig;



  // Debug active NCAL categories
  console.log('🔍 ACTIVE NCAL CATEGORIES:', {
    allNCAL: NCAL_ORDER,
    activeNCAL: activeNCALCategories,
    originalData: {
      monthlyNCALData: monthlyNCALData.map(month => ({
        month: month.month,
        totals: NCAL_ORDER.map(ncal => ({ ncal, value: month[ncal] }))
      })),
      monthlyNCALDurationData: monthlyNCALDurationData.map(month => ({
        month: month.month,
        totals: NCAL_ORDER.map(ncal => ({ ncal, value: month[ncal] }))
      }))
    },
    filteredData: {
      filteredMonthlyNCALData: filteredMonthlyNCALData.map(month => ({
        month: month.month,
        totals: activeNCALCategories.map(ncal => ({ ncal, value: month[ncal] }))
      })),
      filteredMonthlyNCALDurationData: filteredMonthlyNCALDurationData.map(month => ({
        month: month.month,
        totals: activeNCALCategories.map(ncal => ({ ncal, value: month[ncal] }))
      }))
    }
  });

  // Validate chart data integrity
  console.log('✅ CHART DATA VALIDATION:', {
    ncalCountChart: {
      totalMonths: filteredMonthlyNCALData.length,
      activeCategories: activeNCALCategories.length,
      sampleData: filteredMonthlyNCALData.slice(0, 2).map(month => ({
        month: month.month,
        ncalValues: activeNCALCategories.map(ncal => ({ ncal, value: month[ncal] }))
      }))
    },
    ncalDurationChart: {
      totalMonths: filteredMonthlyNCALDurationData.length,
      activeCategories: activeNCALCategories.length,
      sampleData: filteredMonthlyNCALDurationData.slice(0, 2).map(month => ({
        month: month.month,
        ncalValues: activeNCALCategories.map(ncal => ({ ncal, value: month[ncal] }))
      }))
    }
  });

  // Debug chart data (background only)
  console.group('📊 CHART DATA');
  console.log('📈 Monthly NCAL Count Chart Data:', monthlyNCALData);
  console.log('⏱️ Monthly NCAL Duration Chart Data:', monthlyNCALDurationData);
  console.groupEnd();

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Incident Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive analytics and insights from incident data
          </p>
        </div>
        
        {/* Period Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="flex bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800 p-1">
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
                className="text-xs rounded-xl"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          icon={<ErrorOutlineIcon className="w-7 h-7 text-white" />}
          title="Total Incidents"
          value={stats.total}
          description={selectedPeriod === 'all' ? 'All time' : `Last ${selectedPeriod}`}
          iconBg="bg-blue-700"
        />

        <SummaryCard
          icon={<AccessTimeIcon className="w-7 h-7 text-white" />}
          title="Open Incidents"
          value={stats.open}
          subvalue={`${stats.total > 0 ? ((stats.open / stats.total) * 100).toFixed(1) : 0}%`}
          description="of total incidents"
          iconBg="bg-orange-500"
        />

        <SummaryCard
          icon={<TrackChangesIcon className="w-7 h-7 text-white" />}
          title="MTTR"
          value={stats.mttrMin > 0 ? formatDurationHMS(stats.mttrMin) : '0:00:00'}
          description="Mean Time To Resolution"
          iconBg="bg-indigo-600"
        />

        <SummaryCard
          icon={<HowToRegIcon className="w-7 h-7 text-white" />}
          title="Resolution Rate"
          value={`${stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : 0}%`}
          description={`${stats.closed} of ${stats.total} resolved`}
          iconBg="bg-green-600"
        />
      </div>

      {/* NCAL Target Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AssignmentIcon className="w-5 h-5" />
              NCAL Target Performance
            </CardTitle>
            <CardDescription>Actual vs Target duration for each NCAL level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {NCAL_ORDER.map(ncal => {
                const performance = stats.targetPerformance[ncal];
                if (!performance) return null;
                
                return (
                  <div key={ncal} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS] }}
                      />
                      <span className="font-medium">{ncal}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatDurationHMS(performance.actual)} / {formatDurationHMS(performance.target)}
                      </div>
                      <div className={`text-xs ${performance.status === 'good' ? 'text-green-600' : 'text-red-600'}`}>
                        {performance.performance >= 0 ? '+' : ''}{performance.performance.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIconMUI className="w-5 h-5" />
              NCAL Distribution
            </CardTitle>
            <CardDescription>Distribution of incidents by NCAL level</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 justify-center pb-0">
            <ChartContainer
              config={ncalChartConfig}
              className="mx-auto aspect-square w-full max-w-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={ncalData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  {ncalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        const total = ncalData.reduce((sum, item) => sum + item.value, 0);
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {total.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Incidents
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  content={({ payload }) => (
                    <div className="flex justify-center items-center gap-6 mt-4">
                      {payload?.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* NCAL Area Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShowChartIcon className="w-5 h-5" />
              NCAL Count by Month
            </CardTitle>
            <CardDescription>Monthly incident count by NCAL level</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ncalAreaChartConfig}>
              <LineChart
                accessibilityLayer
                data={filteredMonthlyNCALData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    // Format month display: "2024-01" -> "Jan 2024"
                    const [year, month] = value.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                  }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <ChartTooltip
                  cursor={false}
                  content={<NCALTooltip isDuration={false} />}
                />
                {activeNCALCategories.map(ncal => (
                  <Line
                    key={ncal}
                    dataKey={ncal}
                    type="natural"
                    stroke={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]}
                    strokeWidth={2}
                    dot={{
                      fill: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS],
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShowChartIcon className="w-5 h-5" />
              NCAL Duration by Month
            </CardTitle>
            <CardDescription>Average duration by NCAL level per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ncalAreaChartConfig}>
              <LineChart
                accessibilityLayer
                data={filteredMonthlyNCALDurationData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    // Format month display: "2024-01" -> "Jan 2024"
                    const [year, month] = value.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                  }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  tickFormatter={(value) => formatDurationHMS(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<NCALTooltip isDuration={true} />}
                />
                {activeNCALCategories.map(ncal => (
                  <Line
                    key={ncal}
                    dataKey={ncal}
                    type="natural"
                    stroke={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]}
                    strokeWidth={2}
                    dot={{
                      fill: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS],
                    }}
                    activeDot={{
                      r: 6,
                    }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LabelIcon className="w-5 h-5" />
              Priority Distribution
            </CardTitle>
            <CardDescription>Distribution of incidents by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={priorityChartConfig}>
              <BarChart 
                accessibilityLayer 
                data={priorityData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) =>
                    priorityChartConfig[value.toLowerCase() as keyof typeof priorityChartConfig]?.label || value
                  }
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="value"
                  strokeWidth={2}
                  radius={8}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ConfirmationNumberIcon className="w-5 h-5" />
              Level Distribution
            </CardTitle>
            <CardDescription>Distribution of incidents by level</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Month Filter */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Month:</span>
                <select 
                  value={selectedLevelMonth} 
                  onChange={(e) => setSelectedLevelMonth(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Months</option>
                  {Object.keys(stats.byMonth).sort().map(month => {
                    const [year, monthNum] = month.split('-');
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return (
                      <option key={month} value={month}>
                        {monthNames[parseInt(monthNum) - 1]} {year}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Showing {selectedLevelMonth === 'all' ? 'all incidents' : `incidents from ${selectedLevelMonth}`}
              </div>
            </div>

            <ChartContainer config={levelChartConfig}>
              <BarChart 
                accessibilityLayer 
                data={filteredLevelData}
                margin={{
                  top: 20,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) =>
                    levelChartConfig[value.toLowerCase().replace(' ', '') as keyof typeof levelChartConfig]?.label || value
                  }
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar 
                  dataKey="value" 
                  fill="var(--color-level)" 
                  radius={8}
                >
                  <LabelList
                    position="top"
                    offset={12}
                    className="fill-foreground"
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Analysis */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5" />
              Incident Trend Analysis
            </CardTitle>
            <CardDescription>12-month trend and forecasting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Trend Indicators */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {(() => {
                      const currentMonth = new Date().getMonth();
                      const currentYear = new Date().getFullYear();
                      const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
                      const currentCount = stats.byMonth[currentMonthKey] || 0;
                      return currentCount;
                    })()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">This Month</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {(() => {
                      const currentMonth = new Date().getMonth();
                      const currentYear = new Date().getFullYear();
                      const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
                      const lastMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
                      const currentCount = stats.byMonth[currentMonthKey] || 0;
                      const lastCount = stats.byMonth[lastMonthKey] || 0;
                      const change = lastCount > 0 ? ((currentCount - lastCount) / lastCount * 100) : 0;
                      return change >= 0 ? '+' : '';
                    })()}
                    {(() => {
                      const currentMonth = new Date().getMonth();
                      const currentYear = new Date().getFullYear();
                      const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
                      const lastMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
                      const currentCount = stats.byMonth[currentMonthKey] || 0;
                      const lastCount = stats.byMonth[lastMonthKey] || 0;
                      const change = lastCount > 0 ? ((currentCount - lastCount) / lastCount * 100) : 0;
                      return change.toFixed(1);
                    })()}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">vs Last Month</div>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {(() => {
                      // Simple forecast: average of last 3 months + 5% growth
                      const currentMonth = new Date().getMonth();
                      const currentYear = new Date().getFullYear();
                      const months = [];
                      for (let i = 2; i >= 0; i--) {
                        const month = currentMonth - i;
                        const year = currentYear;
                        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                        months.push(stats.byMonth[monthKey] || 0);
                      }
                      const avg = months.reduce((a, b) => a + b, 0) / months.length;
                      return Math.round(avg * 1.05);
                    })()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Next Month Forecast</div>
                </div>
              </div>
              
              {/* Trend Chart */}
              <div className="h-32">
                <ChartContainer config={{}}>
                  <LineChart
                    data={Object.entries(stats.byMonth)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .slice(-6)
                      .map(([month, count]) => ({
                        month: month,
                        count: count
                      }))}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return `${monthNames[parseInt(month) - 1]} ${year}`;
                      }}
                    />
                    <YAxis />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
                  </div>
            </div>
          </CardContent>
        </Card>

                {/* Root Cause Analysis */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BugReportIcon className="w-5 h-5" />
              Root Cause Analysis
            </CardTitle>
            <CardDescription>Comprehensive analysis of penyebab, action, and gangguan categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Kategori Gangguan */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Kategori Gangguan (Top 5)
                </h4>
                {(() => {
                  const klasifikasiStats = filteredIncidents.reduce((acc, incident) => {
                    const klasifikasi = incident.klasifikasiGangguan || 'Unknown';
                    acc[klasifikasi] = (acc[klasifikasi] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  return Object.entries(klasifikasiStats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([klasifikasi, count], index) => (
                      <div key={klasifikasi} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {klasifikasi.length > 35 ? klasifikasi.substring(0, 35) + '...' : klasifikasi}
                    </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {((count / filteredIncidents.length) * 100).toFixed(1)}% of total incidents
                  </div>
                </div>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {count}
                        </Badge>
                      </div>
                    ));
                })()}
              </div>
              
              {/* Penyebab Analysis */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Penyebab Analysis (Top 5)
                </h4>
                {(() => {
                  const penyebabStats = filteredIncidents.reduce((acc, incident) => {
                    const penyebab = incident.penyebab || 'Unknown';
                    acc[penyebab] = (acc[penyebab] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  return Object.entries(penyebabStats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([penyebab, count], index) => (
                      <div key={penyebab} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {penyebab.length > 35 ? penyebab.substring(0, 35) + '...' : penyebab}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {((count / filteredIncidents.length) * 100).toFixed(1)}% of total incidents
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          {count}
                        </Badge>
                      </div>
                    ));
                })()}
              </div>
              
              {/* Action Terakhir Analysis */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Action Terakhir (Top 5)
                </h4>
                {(() => {
                  const actionStats = filteredIncidents.reduce((acc, incident) => {
                    const action = incident.actionTerakhir || 'Unknown';
                    acc[action] = (acc[action] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  return Object.entries(actionStats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([action, count], index) => (
                      <div key={action} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {action.length > 35 ? action.substring(0, 35) + '...' : action}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {((count / filteredIncidents.length) * 100).toFixed(1)}% of total incidents
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {count}
                        </Badge>
                      </div>
                    ));
                })()}
              </div>
              
              {/* Problem Categories */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Problem Categories (Top 5)
                </h4>
                {(() => {
                  const problemStats = filteredIncidents.reduce((acc, incident) => {
                    const problem = incident.problem || 'Unknown';
                    acc[problem] = (acc[problem] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  return Object.entries(problemStats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([problem, count], index) => (
                      <div key={problem} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {problem.length > 35 ? problem.substring(0, 35) + '...' : problem}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {((count / filteredIncidents.length) * 100).toFixed(1)}% of total incidents
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {count}
                        </Badge>
                      </div>
                    ));
                })()}
              </div>
              
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {(() => {
                      const uniqueKlasifikasi = new Set(filteredIncidents.map(i => i.klasifikasiGangguan).filter(Boolean)).size;
                      return uniqueKlasifikasi;
                    })()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Unique Categories</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {(() => {
                      const uniquePenyebab = new Set(filteredIncidents.map(i => i.penyebab).filter(Boolean)).size;
                      return uniquePenyebab;
                    })()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Unique Causes</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance & Efficiency Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SLA Compliance */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              SLA Compliance
            </CardTitle>
            <CardDescription>Service Level Agreement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {(() => {
                    const compliantIncidents = filteredIncidents.filter(i => {
                      if (!i.durationMin || !i.startTime) return false;
                      const ncal = normalizeNCAL(i.ncal);
                      const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
                      return i.durationMin <= target;
                    }).length;
                    const complianceRate = filteredIncidents.length > 0 ? compliantIncidents / filteredIncidents.length : 0;
                    return (complianceRate * 100).toFixed(1);
                  })()}%
                  </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  SLA Compliance Rate
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Target:</span>
                  <span className="font-medium">95%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Compliant:</span>
                  <span className="font-medium text-green-600">
                    {(() => {
                      const compliantIncidents = filteredIncidents.filter(i => {
                        if (!i.durationMin || !i.startTime) return false;
                        const ncal = normalizeNCAL(i.ncal);
                        const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
                        return i.durationMin <= target;
                      }).length;
                      return compliantIncidents;
                    })()}
                    </span>
                  </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="font-medium">{filteredIncidents.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Metrics */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Efficiency Metrics
            </CardTitle>
            <CardDescription>Operational efficiency indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">
                    {(() => {
                      const incidentsWithVendor = filteredIncidents.filter(i => i.durationVendorMin && i.durationVendorMin > 0);
                      const totalVendorTime = incidentsWithVendor.reduce((sum, i) => sum + (i.durationVendorMin || 0), 0);
                      const totalPauseTime = filteredIncidents.reduce((sum, i) => sum + (i.totalDurationPauseMin || 0), 0);
                      const efficiency = totalVendorTime > 0 ? ((totalVendorTime - totalPauseTime) / totalVendorTime * 100) : 0;
                      return efficiency.toFixed(1);
                    })()}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Efficiency Rate</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {(() => {
                      const avgResolutionTime = stats.mttrMin;
                      const targetResolutionTime = 120; // 2 hours target
                      const performance = targetResolutionTime > 0 ? (targetResolutionTime - avgResolutionTime) / targetResolutionTime * 100 : 0;
                      return performance.toFixed(1);
                    })()}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Performance</div>
                </div>
      </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Avg Resolution:</span>
                  <span className="font-medium">{formatDurationHMS(stats.mttrMin)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Target Time:</span>
                  <span className="font-medium">2:00:00</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Monitoring */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorIcon className="w-5 h-5" />
              Real-time Status
            </CardTitle>
            <CardDescription>Current incident status</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-xl font-bold text-red-600">
                    {stats.open}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-xl font-bold text-green-600">
                    {stats.closed}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Resolved</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">High Priority:</span>
                                     <Badge variant="danger">
                     {filteredIncidents.filter(i => i.priority?.toLowerCase() === 'high').length}
                   </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Escalated:</span>
                  <Badge variant="warning">
                    {filteredIncidents.filter(i => i.startEscalationVendor).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Paused:</span>
                  <Badge variant="secondary">
                    {filteredIncidents.filter(i => i.totalDurationPauseMin && i.totalDurationPauseMin > 0).length}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AccessTimeIcon className="w-5 h-5" />
              Vendor Performance
            </CardTitle>
            <CardDescription>Average vendor response time</CardDescription>
          </CardHeader>
          <CardContent>
                            <div className="text-lg font-bold text-blue-600">
              {stats.avgVendorMin > 0 ? formatDurationHMS(stats.avgVendorMin) : '0:00:00'}
                  </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Average vendor duration across all incidents
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WarningAmberIcon className="w-5 h-5" />
              Pause Ratio
            </CardTitle>
            <CardDescription>Total pause time ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Main Metric */}
            <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {stats.pauseRatio > 0 ? (stats.pauseRatio * 100).toFixed(1) : '0.0'}%
              </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Percentage of total time spent on pause
                </p>
            </div>

              {/* Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Pause Time
                    </span>
              </div>
                  <span className="text-sm font-bold text-orange-600">
                    {(() => {
                      const totalPauseTime = filteredIncidents.reduce((sum, i) => sum + (i.totalDurationPauseMin || 0), 0);
                      return formatDurationHMS(totalPauseTime);
                    })()}
                  </span>
            </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Duration
                    </span>
              </div>
                  <span className="text-sm font-bold text-blue-600">
                    {(() => {
                      const totalDuration = filteredIncidents.reduce((sum, i) => sum + (i.durationMin || 0), 0);
                      return formatDurationHMS(totalDuration);
                    })()}
                  </span>
      </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Incidents with Pause
                    </span>
              </div>
                  <span className="text-sm font-bold text-gray-600">
                    {filteredIncidents.filter(i => i.totalDurationPauseMin && i.totalDurationPauseMin > 0).length}
                  </span>
            </div>
              </div>

              {/* Performance Indicator */}
              <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <WarningAmberIcon className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Performance Impact
                    </span>
            </div>
                  <span className={`text-sm font-bold ${
                    stats.pauseRatio > 0.15 ? 'text-red-600' : 
                    stats.pauseRatio > 0.10 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {stats.pauseRatio > 0.15 ? 'High' : 
                     stats.pauseRatio > 0.10 ? 'Medium' : 'Low'}
                  </span>
              </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {stats.pauseRatio > 0.15 ? 'Significant impact on resolution time' :
                   stats.pauseRatio > 0.10 ? 'Moderate impact on efficiency' :
                   'Minimal impact on operations'}
                </p>
            </div>
          </div>
        </CardContent>
      </Card>

        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartIcon className="w-5 h-5" />
              Top 10 Sites
            </CardTitle>
            <CardDescription>Most affected sites by incident count</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={siteChartConfig}>
              <BarChart 
                accessibilityLayer
                data={siteData} 
                layout="horizontal"
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis 
                  type="number" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  tickFormatter={(value) => value.toLocaleString()}
                  label={{ value: 'Incident Count', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  tickFormatter={(value) => {
                    // Truncate long site names
                    return value.length > 20 ? value.substring(0, 20) + '...' : value;
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar 
                  dataKey="value" 
                  fill="var(--chart-1)" 
                  radius={[0, 4, 4, 0]} 
                />
              </BarChart>
            </ChartContainer>
        </CardContent>
      </Card>
    </div>
      </div>
    </PageWrapper>
  );
};
