import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { calculateCustomDuration, calculateNetDuration, normalizeNCAL, safeMinutes } from '@/utils/incidentUtils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SummaryCard from '@/components/ui/SummaryCard';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts';

import PageWrapper from '@/components/PageWrapper';
// MUI icons
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import PieChartIconMUI from '@mui/icons-material/PieChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TimelineIcon from '@mui/icons-material/Timeline';
import FilterListIcon from '@mui/icons-material/FilterList';

// NCAL colors and targets
const NCAL_COLORS: Record<string, string> = {
  Blue: '#3b82f6',
  Yellow: '#eab308',
  Orange: '#f97316',
  Red: '#ef4444',
  Black: '#1f2937',
};
const NCAL_TARGETS: Record<string, number> = {
  Blue: 6 * 60,
  Yellow: 5 * 60,
  Orange: 4 * 60,
  Red: 3 * 60,
  Black: 1 * 60,
};
const NCAL_ORDER = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];

// Helper functions for deep analytics
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const percentile = (arr: number[], p = 0.95) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((x, y) => x - y);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
};
const dayDiff = (now: Date, date: Date) => {
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));
};
const takeTop = <T extends string>(map: Record<T, number>, n = 5) => {
  return Object.entries(map as Record<string, number>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
};





// Custom tooltip for SLA Breach Analysis
const SLABreachTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-card text-card-foreground  rounded-xl shadow-lg  p-4 min-w-[180px] text-xs">
                      <div className="font-semibold text-sm mb-2 text-card-foreground">
        {label} NCAL
      </div>
      <div className="space-y-1">
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-semibold text-card-foreground">
                Breach Count
              </span>
            </div>
            <span className="font-mono text-red-600 dark:text-red-400 font-bold">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main component
const IncidentAnalytics: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  
  // Get all incidents with robust database connection
  const allIncidents = useLiveQuery(async () => {
    try {
      const incidents = await db.incidents.toArray();
      console.log('✅ IncidentAnalytics: Successfully loaded', incidents.length, 'incidents from database');
      
      // Validate data integrity
      const validIncidents = incidents.filter(incident => {
        if (!incident.id || !incident.noCase) {
          console.warn('❌ IncidentAnalytics: Found invalid incident:', incident);
          return false;
        }
        return true;
      });
      
      if (validIncidents.length !== incidents.length) {
        console.warn(`❌ IncidentAnalytics: Filtered out ${incidents.length - validIncidents.length} invalid incidents`);
      }
      
      return validIncidents;
    } catch (error) {
      console.error('❌ IncidentAnalytics: Failed to load incidents from database:', error);
      return [];
    }
  }, []); // Empty dependency array to ensure stable reference

  // Debug: Check if incidents data exists
  console.log('IncidentAnalytics Debug:', {
    allIncidentsCount: allIncidents?.length || 0,
    hasIncidents: !!allIncidents && allIncidents.length > 0,
    sampleIncidents: allIncidents?.slice(0, 3).map(inc => ({
      id: inc.id,
      ncal: inc.ncal,
      startTime: inc.startTime,
      status: inc.status,
      durationMin: inc.durationMin
    })) || []
  });

  // Debug: Log sample incident structure
  React.useEffect(() => {
    if (allIncidents && allIncidents.length > 0) {
      console.log('🔍 DEBUG: Sample incident structure:', allIncidents[0]);
      console.log('🔍 DEBUG: All incident keys:', Object.keys(allIncidents[0]));
      console.log('🔍 DEBUG: Total incidents:', allIncidents.length);
      
      // Check for time-related fields
      const timeFields = ['start', 'end', 'startTime', 'endTime', 'startEscalationVendor', 
                         'startPause', 'endPause', 'startPause1', 'endPause1', 
                         'startPause2', 'endPause2', 'closeTime', 'openTime'];
      
      timeFields.forEach(field => {
        const incidentsWithField = allIncidents.filter(inc => inc[field]);
        console.log(`🔍 DEBUG: Incidents with ${field}:`, incidentsWithField.length);
        if (incidentsWithField.length > 0) {
          console.log(`🔍 DEBUG: Sample ${field} value:`, incidentsWithField[0][field]);
        }
      });
      
      // Show all available fields that contain 'time' or 'date'
      const allFields = Object.keys(allIncidents[0]);
      const timeRelatedFields = allFields.filter(field => 
        field.toLowerCase().includes('time') || 
        field.toLowerCase().includes('date') ||
        field.toLowerCase().includes('start') ||
        field.toLowerCase().includes('end') ||
        field.toLowerCase().includes('close') ||
        field.toLowerCase().includes('open')
      );
      console.log('🔍 DEBUG: All time-related fields:', timeRelatedFields);
    }
  }, [allIncidents]);

  // Normalize NCAL text to capitalized key
  // Menggunakan fungsi normalizeNCAL dari utils yang tidak bergantung pada IndexedDB

  // Format minutes into HH:MM:SS
  const formatDurationHMS = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '0:00:00';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.floor((minutes % 1) * 60);
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Menggunakan fungsi calculateCustomDuration dari utils yang tidak bergantung pada IndexedDB

  // Filter incidents by period
  const filteredIncidents = useMemo(() => {
    if (!allIncidents) return [] as any[];
    
    // Debug: Log filtering process
          console.log('🔍 Filtering incidents:', {
        totalIncidents: allIncidents.length,
        selectedPeriod,
        incidentsWithStartTime: allIncidents.filter(inc => inc.startTime).length
      });
      
      const now = new Date();
      let cutoff: Date;
      switch (selectedPeriod) {
      case '3m':
        cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6m':
        cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1y':
        cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        console.log('📊 Using all incidents (no period filter)');
        return allIncidents;
    }
    
    const filtered = allIncidents.filter((inc) => {
      if (!inc.startTime) return false;
      const date = new Date(inc.startTime);
      return date >= cutoff;
    });
    
    console.log('📊 Filtered incidents:', {
      filteredCount: filtered.length,
      cutoffDate: cutoff.toISOString(),
      sampleDates: filtered.slice(0, 3).map(inc => inc.startTime)
    });
    
          return filtered;
    }, [allIncidents, selectedPeriod]);

  // Stats aggregator (simple summary for KPI cards)
  const stats = useMemo(() => {
    if (!filteredIncidents || filteredIncidents.length === 0) {
      return {
        total: 0,
        open: 0,
        closed: 0,
        mttr: 0,
      };
    }
    const total = filteredIncidents.length;
    const open = filteredIncidents.filter((i) => (i.status || '').toLowerCase() !== 'done').length;
    const closed = total - open;
    const durations = filteredIncidents
      .map((i) => calculateCustomDuration(i))
      .filter((m) => m > 0);
    const mttr = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return { total, open, closed, mttr };
  }, [filteredIncidents]);



  const byMonthNCAL = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filteredIncidents.forEach((inc) => {
      if (!inc.startTime) return;
      const date = new Date(inc.startTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const ncal = normalizeNCAL(inc.ncal);
      if (!map[key]) map[key] = {};
      map[key][ncal] = (map[key][ncal] || 0) + 1;
    });
    return map;
  }, [filteredIncidents]);

  const byMonthNCALDuration = useMemo(() => {
    const map: Record<string, Record<string, { total: number; count: number; avg: number }>> = {};
    
    // Debug: Log all incidents for manual verification
    console.log('🔍 DEBUG: All incidents for duration calculation:');
    filteredIncidents.forEach((inc, index) => {
      if (inc.startTime) {
        const date = new Date(inc.startTime);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const ncal = normalizeNCAL(inc.ncal);
        const dur = calculateCustomDuration(inc);
        console.log(`Incident ${index + 1}: Month=${month}, NCAL=${ncal}, Duration=${dur}min (${formatDurationHMS(dur)})`);
      }
    });
    
    filteredIncidents.forEach((inc) => {
      if (!inc.startTime) return;
      const date = new Date(inc.startTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const ncal = normalizeNCAL(inc.ncal);
      if (!map[key]) map[key] = {};
      if (!map[key][ncal]) map[key][ncal] = { total: 0, count: 0, avg: 0 };
      const dur = calculateCustomDuration(inc);
      if (dur > 0) {
        map[key][ncal].total += dur;
        map[key][ncal].count += 1;
      }
    });
    
    // compute averages - FIXED VERSION
    console.log('🔧 DEBUG: Starting average calculation...');
    console.log('🔧 DEBUG: Map keys:', Object.keys(map));
    
    Object.keys(map).forEach((month) => {
      console.log(`🔧 DEBUG: Processing month: ${month}`);
      console.log(`🔧 DEBUG: Month keys:`, Object.keys(map[month]));
      
      Object.keys(map[month]).forEach((ncal) => {
        const obj = map[month][ncal];
        console.log(`🔧 DEBUG: Before calculation - ${month} ${ncal}:`, JSON.stringify(obj));
        
        // Ensure proper calculation
        if (obj.count > 0 && obj.total > 0) {
          obj.avg = obj.total / obj.count;
          console.log(`🔧 DEBUG: Calculated avg = ${obj.total} / ${obj.count} = ${obj.avg}`);
        } else {
          obj.avg = 0;
          console.log(`🔧 DEBUG: Set avg = 0 (count=${obj.count}, total=${obj.total})`);
        }
        
        console.log(`🔧 DEBUG: After calculation - ${month} ${ncal}:`, JSON.stringify(obj));
      });
    });
    
    // Debug: Log calculated results AFTER calculation
    console.log('📊 DEBUG: Calculated duration results:');
    console.log('📊 DEBUG: Final map state:', JSON.stringify(map, null, 2));
    
    Object.keys(map).sort().forEach((month) => {
      console.log(`\nMonth: ${month}`);
      Object.keys(map[month]).forEach((ncal) => {
        const obj = map[month][ncal];
        const avgHours = Math.floor(obj.avg / 60);
        const avgMinutes = Math.floor(obj.avg % 60);
        const avgSeconds = Math.floor((obj.avg % 1) * 60);
        console.log(`  ${ncal}: Total=${obj.total}min, Count=${obj.count}, Avg=${obj.avg}min (${avgHours}:${avgMinutes.toString().padStart(2, '0')}:${avgSeconds.toString().padStart(2, '0')})`);
        
        // Additional debug: Check if calculation is correct
        const expectedAvg = obj.count > 0 ? obj.total / obj.count : 0;
        if (Math.abs(obj.avg - expectedAvg) > 0.01) {
          console.log(`  ⚠️  BUG: Expected avg=${expectedAvg}, but got avg=${obj.avg}`);
          console.log(`  🔍 DEBUG: Object reference check:`, obj === map[month][ncal]);
        }
      });
    });
    return map;
  }, [filteredIncidents]);

  // Prepare chart data arrays (sorted by month)
  const monthlyNCALData = useMemo(() => {
    return Object.keys(byMonthNCAL)
      .sort()
      .map((month) => {
        const row: any = { month };
        NCAL_ORDER.forEach((ncal) => {
          row[ncal] = byMonthNCAL[month]?.[ncal] || 0;
        });
        return row;
      });
  }, [byMonthNCAL]);
  const monthlyNCALDurationData = useMemo(() => {
    const chartData = Object.keys(byMonthNCALDuration)
      .sort()
      .map((month) => {
        const row: any = { month };
        NCAL_ORDER.forEach((ncal) => {
          row[ncal] = byMonthNCALDuration[month]?.[ncal]?.avg || 0;
        });
        return row;
      });
    
    // Debug: Log chart data to ensure correct values
    console.log('📊 DEBUG: Chart data for Monthly Duration Trends:');
    chartData.forEach((row) => {
      console.log(`  ${row.month}:`, {
        Blue: row.Blue > 0 ? `${Math.floor(row.Blue / 60)}:${Math.floor(row.Blue % 60).toString().padStart(2, '0')}:${Math.floor((row.Blue % 1) * 60).toString().padStart(2, '0')}` : '0:00:00',
        Yellow: row.Yellow > 0 ? `${Math.floor(row.Yellow / 60)}:${Math.floor(row.Yellow % 60).toString().padStart(2, '0')}:${Math.floor((row.Yellow % 1) * 60).toString().padStart(2, '0')}` : '0:00:00',
        Orange: row.Orange > 0 ? `${Math.floor(row.Orange / 60)}:${Math.floor(row.Orange % 60).toString().padStart(2, '0')}:${Math.floor((row.Orange % 1) * 60).toString().padStart(2, '0')}` : '0:00:00',
        Red: row.Red > 0 ? `${Math.floor(row.Red / 60)}:${Math.floor(row.Red % 60).toString().padStart(2, '0')}:${Math.floor((row.Red % 1) * 60).toString().padStart(2, '0')}` : '0:00:00',
        Black: row.Black > 0 ? `${Math.floor(row.Black / 60)}:${Math.floor(row.Black % 60).toString().padStart(2, '0')}:${Math.floor((row.Black % 1) * 60).toString().padStart(2, '0')}` : '0:00:00'
      });
    });
    
    return chartData;
  }, [byMonthNCALDuration]);

  // Monthly duration trends with pause time included per NCAL
  const monthlyDurationWithPauseData = useMemo(() => {
    const map: Record<string, Record<string, { total: number; count: number; avg: number }>> = {};
    
    filteredIncidents.forEach((inc) => {
      if (!inc.startTime) return;
      const date = new Date(inc.startTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const ncal = normalizeNCAL(inc.ncal);
      
      if (!map[key]) map[key] = {};
      if (!map[key][ncal]) map[key][ncal] = { total: 0, count: 0, avg: 0 };
      
      // Calculate net duration (duration minus pause time) - menggunakan fungsi dari utils
      const netDuration = calculateNetDuration(inc);
      
      if (netDuration > 0) {
        map[key][ncal].total += netDuration;
        map[key][ncal].count += 1;
      }
    });
    
    // Calculate averages for each NCAL per month
    Object.keys(map).forEach((month) => {
      Object.keys(map[month]).forEach((ncal) => {
        const obj = map[month][ncal];
        if (obj.count > 0 && obj.total > 0) {
          obj.avg = obj.total / obj.count;
        } else {
          obj.avg = 0;
        }
      });
    });
    
    // Convert to chart data format with NCAL lines
    const chartData = Object.keys(map)
      .sort()
      .map((month) => {
        const row: any = { month };
        NCAL_ORDER.forEach((ncal) => {
          row[ncal] = map[month]?.[ncal]?.avg || 0;
        });
        return row;
      });
    
    console.log('📊 DEBUG: Monthly Net Duration data per NCAL (duration minus pause time):', chartData);
    
    return chartData;
  }, [filteredIncidents]);



  // Priority distribution data for bar chart
  const priorityData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredIncidents.forEach((inc) => {
      const p = inc.priority || 'Unknown';
      map[p] = (map[p] || 0) + 1;
    });
    const order = { High: 1, Medium: 2, Low: 3, Unknown: 4 } as Record<string, number>;
    return Object.entries(map)
      .sort((a, b) => (order[a[0]] || 5) - (order[b[0]] || 5))
      .map(([name, value]) => {
        let color = '#6b7280';
        if (name === 'High') color = '#ef4444';
                        else if (name === 'Medium') color = '#eab308';
        else if (name === 'Low') color = '#10b981';
        return { name, value, fill: color };
      });
  }, [filteredIncidents]);

  // Deep analytics calculations with improved error handling and fallbacks
  const deep = useMemo(() => {
    const now = new Date();
    
    // Consider incidents with duration
    const withDuration = filteredIncidents.filter((i) => calculateCustomDuration(i) > 0);
    const compliant: any[] = [];
    const breach: any[] = [];
    
    withDuration.forEach((i) => {
      const n = normalizeNCAL(i.ncal);
      const target = NCAL_TARGETS[n] || 0;
      const dur = calculateCustomDuration(i);
      if (dur <= target) compliant.push(i);
      else breach.push(i);
    });
    
    // Breach by NCAL
    const breachByNCAL: Record<string, number> = {};
    breach.forEach((i) => {
      const n = normalizeNCAL(i.ncal);
      breachByNCAL[n] = (breachByNCAL[n] || 0) + 1;
    });
    
    // Top sites and causes for breach with fallback column names
    const siteMap: Record<string, number> = {};
    const causeMap: Record<string, number> = {};
    breach.forEach((i) => {
      const site = i.site || i.location || i.area || 'Unknown Site';
      siteMap[site] = (siteMap[site] || 0) + 1;
      
      // Multiple fallback options for cause/classification
      const cause = i.penyebab || i.klasifikasiGangguan || i.problem || i.issue || i.cause || i.classification || 'Unknown Cause';
      causeMap[cause] = (causeMap[cause] || 0) + 1;
    });
    
    // Pause impact with fallback column names
    const avgPauseBreach = breach.reduce((s, i) => s + safeMinutes(i.totalDurationPauseMin || i.pauseDuration || i.pauseTime || 0), 0) / (breach.length || 1);
    const avgPauseCompliant = compliant.reduce((s, i) => s + safeMinutes(i.totalDurationPauseMin || i.pauseDuration || i.pauseTime || 0), 0) / (compliant.length || 1);
    
    // Escalation rate with fallback column names
    const escalated = filteredIncidents.filter((i) => 
      i.startEscalationVendor || i.escalationVendor || i.escalated || i.escalation || false
    ).length;
    const escalationRate = pct(escalated, filteredIncidents.length);
    
    // Aging buckets for open incidents with fallback status names
    const open = filteredIncidents.filter((i) => {
      const status = (i.status || i.state || i.condition || '').toLowerCase();
      return status !== 'done' && status !== 'closed' && status !== 'resolved' && status !== 'completed' && i.startTime;
    });
    
    const agingBuckets: Record<string, number> = { '<1d': 0, '1-3d': 0, '3-7d': 0, '>7d': 0 };
    open.forEach((i) => {
      const d = dayDiff(now, new Date(i.startTime));
      if (d < 1) agingBuckets['<1d']++;
      else if (d <= 3) agingBuckets['1-3d']++;
      else if (d <= 7) agingBuckets['3-7d']++;
      else agingBuckets['>7d']++;
    });
    
    const topAging = open
      .map((i) => ({
        site: i.site || i.location || i.area || 'Unknown Site',
        ncal: normalizeNCAL(i.ncal),
        priority: i.priority || i.level || i.severity || '-',
        days: dayDiff(now, new Date(i.startTime)),
        start: i.startTime,
        hours: Math.floor(dayDiff(now, new Date(i.startTime)) * 24),
      }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);
    
    // Time patterns
    const byHour: number[] = Array.from({ length: 24 }, () => 0);
    const byWeekday: number[] = Array.from({ length: 7 }, () => 0);
    filteredIncidents.forEach((i) => {
      if (!i.startTime) return;
      const d = new Date(i.startTime);
      byHour[d.getHours()]++;
      byWeekday[d.getDay()]++;
    });
    
    // Outliers
    const durations = withDuration.map((i) => calculateCustomDuration(i));
    const p95 = percentile(durations, 0.95);
    const outliers = withDuration
      .filter((i) => calculateCustomDuration(i) >= p95)
      .sort((a, b) => calculateCustomDuration(b) - calculateCustomDuration(a))
      .slice(0, 5)
      .map((i) => ({
        site: i.site || i.location || i.area || 'Unknown Site',
        ncal: normalizeNCAL(i.ncal),
        duration: calculateCustomDuration(i),
        start: i.startTime,
        level: i.level || i.priority || i.severity || '-',
        priority: i.priority || i.level || i.severity || '-',
      }));
    
    // Auto insights bullet list
    const insights: string[] = [];
    const breachRate = pct(breach.length, withDuration.length);
    insights.push(`SLA breach ${breachRate.toFixed(1)}% (${breach.length}/${withDuration.length})`);
    insights.push(`Escalated ${escalationRate.toFixed(1)}% (${escalated} of ${filteredIncidents.length})`);
    
    const topSite = takeTop(siteMap, 1)[0];
    if (topSite) insights.push(`Top breach site: ${topSite[0]} (${topSite[1]})`);
    
    const topCause = takeTop(causeMap, 1)[0];
    if (topCause) insights.push(`Main breach cause: ${topCause[0]} (${topCause[1]})`);
    
    if (avgPauseBreach || avgPauseCompliant) {
      insights.push(`Pause: breach ${formatDurationHMS(avgPauseBreach)} vs compliant ${formatDurationHMS(avgPauseCompliant)}`);
    }
    
    if (p95) insights.push(`95th percentile duration: ${formatDurationHMS(p95)}`);
    
    // Add backlog insights
    const totalBacklog = Object.values(agingBuckets).reduce((a, b) => a + b, 0);
    if (totalBacklog > 0) {
      insights.push(`Backlog: ${totalBacklog} open incidents`);
      const oldest = topAging[0];
      if (oldest) insights.push(`Oldest: ${oldest.site} (${oldest.days}d)`);
    }
    
    return {
      breachRate,
      breachByNCAL,
      avgPauseBreach,
      avgPauseCompliant,
      escalated,
      escalationRate,
      agingBuckets,
      topAging,
      byHour,
      byWeekday,
      p95,
      outliers,
      insights,
      topSitesBreach: takeTop(siteMap, 5),
      topCausesBreach: takeTop(causeMap, 5),
      totalBacklog,
    };
  }, [filteredIncidents]);

  if (!allIncidents || allIncidents.length === 0) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-bold text-card-foreground">Incident Analytics</h1>
              <p className="text-muted-foreground">Comprehensive analysis of incident data and performance metrics</p>
            </div>
            
            {/* Data Status Alert */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <WarningAmberIcon className="w-5 h-5 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">No Incident Data Found</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Please upload incident data first via the{' '}
                    <a href="/incident/data" className="underline font-medium hover:text-yellow-800 dark:hover:text-yellow-100">
                      Incident Data page
                    </a>
                    {' '}to view analytics and calculations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageWrapper>
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
                { key: 'all', label: 'All' },
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
        {/* KPI Cards - Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
                          icon={<ErrorOutlineIcon className="w-5 h-5 text-white" />}
                            title="Total Tickets"
            value={stats.total}
            description={selectedPeriod === 'all' ? 'All time' : `Last ${selectedPeriod}`}
            iconBg="bg-blue-700"
          />
          <SummaryCard
                          icon={<AccessTimeIcon className="w-5 h-5 text-white" />}
                            title="Open Tickets"
            value={stats.open}
            subvalue={`${stats.total > 0 ? ((stats.open / stats.total) * 100).toFixed(1) : 0}%`}
                            description="of total tickets"
            iconBg="bg-orange-500"
          />
          <SummaryCard
                          icon={<AssignmentIcon className="w-5 h-5 text-white" />}
                            title="Avg Duration"
            value={formatDurationHMS(stats.mttr)}
            description="Mean Time To Resolution"
            iconBg="bg-indigo-600"
          />
          <SummaryCard
                          icon={<TrackChangesIcon className="w-5 h-5 text-white" />}
                            title="Close Rate"
            value={`${stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : 0}%`}
            description={`${stats.closed} of ${stats.total} resolved`}
            iconBg="bg-green-600"
          />
        </div>

        {/* Auto Insights - Key Findings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                              <TrackChangesIcon className="w-6 h-6 text-green-600" />
              Key Insights
            </CardTitle>
                          <CardDescription className="text-muted-foreground">Critical findings from the selected period</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {deep.insights.map((txt, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-3 rounded-xl  bg-gray-50 dark:bg-zinc-800"
              >
                <div className="mt-1 w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-card-foreground">{txt}</span>
              </div>
            ))}
          </CardContent>
        </Card>



        {/* Monthly Duration Trends & Monthly Incident Volume */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card text-card-foreground rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShowChartIcon className="w-6 h-6 text-green-600" /> Monthly Duration Trends
              </CardTitle>
              <CardDescription>Average resolution time trends by NCAL level</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyNCALDurationData.length > 0 ? (
                <ChartContainer config={{}}>
                  <LineChart data={monthlyNCALDurationData} margin={{ top: 0, right: 12, left: 12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value: string) => {
                      const [year, month] = value.split('-');
                      const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      return `${names[parseInt(month) - 1]} ${year}`;
                    }} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(v: number) => formatDurationHMS(v)} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatDurationHMS(value)} />} />
                    {NCAL_ORDER.map((ncal) => (
                      <Line
                        key={ncal}
                        dataKey={ncal}
                        type="natural"
                        stroke={NCAL_COLORS[ncal]}
                        strokeWidth={2}
                        dot={{ fill: NCAL_COLORS[ncal] }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <ShowChartIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No duration data</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {filteredIncidents.length === 0 ? 'No incidents found' : 'No duration data available'}
                  </p>
                </div>
              )}
            </CardContent>
            
            {/* Duration Trends Table */}
            {monthlyNCALDurationData.length > 0 && (
              <CardFooter className="pt-0">
                <div className="w-full">
                  <h4 className="text-sm font-semibold text-card-foreground mb-3">Monthly Duration Values (HH:MM:SS)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 font-medium text-muted-foreground">NCAL</th>
                          {monthlyNCALDurationData.map((row) => (
                            <th key={row.month} className="text-center p-2 font-medium text-muted-foreground">
                              {(() => {
                                const [year, month] = row.month.split('-');
                                const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                return `${monthNames[parseInt(month) - 1]} ${year}`;
                              })()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {NCAL_ORDER.map((ncal) => (
                          <tr key={ncal} className="border-b border-border hover:bg-muted/50">
                            <td className="p-2 font-medium text-card-foreground" style={{ color: NCAL_COLORS[ncal] }}>
                              {ncal}
                            </td>
                            {monthlyNCALDurationData.map((row) => {
                              const value = row[ncal] || 0;
                              const hours = Math.floor(value / 60);
                              const minutes = Math.floor(value % 60);
                              const seconds = Math.floor((value % 1) * 60);
                              const formattedTime = value > 0 
                                ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                                : '0:00:00';
                              
                              return (
                                <td key={row.month} className="text-center p-2 text-card-foreground">
                                  {formattedTime}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>

          <Card className="bg-card text-card-foreground  rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShowChartIcon className="w-6 h-6 text-blue-600" /> Monthly Incident Volume
              </CardTitle>
              <CardDescription>Trend of incident count by NCAL level over time</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyNCALData.length > 0 ? (
                <ChartContainer config={{}}>
                  <LineChart data={monthlyNCALData} margin={{ top: 0, right: 12, left: 12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value: string) => {
                      const [year, month] = value.split('-');
                      const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      return `${names[parseInt(month) - 1]} ${year}`;
                    }} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(v: number) => v.toLocaleString()} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {NCAL_ORDER.map((ncal) => (
                      <Line
                        key={ncal}
                        dataKey={ncal}
                        type="natural"
                        stroke={NCAL_COLORS[ncal]}
                        strokeWidth={2}
                        dot={{ fill: NCAL_COLORS[ncal] }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <ShowChartIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No monthly data</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {filteredIncidents.length === 0 ? 'No incidents found' : 'No monthly incident data'}
                  </p>
                </div>
              )}
            </CardContent>
            
            {/* Incident Volume Table */}
            {monthlyNCALData.length > 0 && (
              <CardFooter className="pt-0">
                <div className="w-full">
                  <h4 className="text-sm font-semibold text-card-foreground mb-3">Monthly Incident Count</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 font-medium text-muted-foreground">NCAL</th>
                          {monthlyNCALData.map((row) => (
                            <th key={row.month} className="text-center p-2 font-medium text-muted-foreground">
                              {(() => {
                                const [year, month] = row.month.split('-');
                                const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                return `${monthNames[parseInt(month) - 1]} ${year}`;
                              })()}
                            </th>
                          ))}
                          <th className="text-center p-2 font-medium text-muted-foreground bg-muted/50">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {NCAL_ORDER.map((ncal) => {
                          const total = monthlyNCALData.reduce((sum, row) => sum + (row[ncal] || 0), 0);
                          return (
                            <tr key={ncal} className="border-b border-border hover:bg-muted/50">
                              <td className="p-2 font-medium text-card-foreground" style={{ color: NCAL_COLORS[ncal] }}>
                                {ncal}
                              </td>
                              {monthlyNCALData.map((row) => (
                                <td key={row.month} className="text-center p-2 text-card-foreground">
                                  {(row[ncal] || 0).toLocaleString()}
                                </td>
                              ))}
                              <td className="text-center p-2 font-semibold text-card-foreground bg-muted/50">
                                {total.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* NCAL Performance vs Targets & Root Cause Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card text-card-foreground rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AssignmentIcon className="w-6 h-6 text-indigo-600" /> NCAL Performance vs Targets
              </CardTitle>
              <CardDescription className="text-muted-foreground">How each NCAL level performs against SLA targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {NCAL_ORDER.map((ncal) => {
                  const target = NCAL_TARGETS[ncal];
                  const ncalInc = filteredIncidents.filter((i) => normalizeNCAL(i.ncal) === ncal);
                  const avgDur = ncalInc.length > 0 ? ncalInc.reduce((s, i) => s + calculateCustomDuration(i), 0) / ncalInc.length : 0;
                  const perf = target > 0 ? ((target - avgDur) / target) * 100 : 0;
                  return (
                    <div key={ncal} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg ">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NCAL_COLORS[ncal] }} />
                        <span className="text-sm font-medium text-card-foreground">{ncal}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-card-foreground">
                          {formatDurationHMS(avgDur)} / {formatDurationHMS(target)}
                        </div>
                        <div className={`text-xs ${perf >= 0 ? 'text-green-600' : 'text-red-600'}`}>{perf >= 0 ? '+' : ''}{perf.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground  rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HourglassEmptyIcon className="w-6 h-6 text-orange-600" /> Root Cause Analysis
              </CardTitle>
              <CardDescription>Top contributors to SLA breaches by site and cause</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Problem Sites</div>
                {deep.topSitesBreach.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No breach sites</div>}
                {deep.topSitesBreach.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-zinc-800">
                    <span className="text-sm truncate max-w-[70%] text-card-foreground">{name}</span>
                    <Badge variant="danger" className="bg-red-600 text-white">{count}</Badge>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Main Causes</div>
                {deep.topCausesBreach.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">No breach causes</div>}
                {deep.topCausesBreach.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-zinc-800">
                    <span className="text-sm truncate max-w-[70%] text-card-foreground">{name}</span>
                    <Badge variant="danger" className="bg-red-600 text-white">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Distribution & SLA Breach Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card text-card-foreground rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIconMUI className="w-6 h-6 text-purple-600" /> Priority Distribution
              </CardTitle>
              <CardDescription>Distribution of incidents by priority level</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}}>
                <BarChart data={priorityData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={8}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground  rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WarningAmberIcon className="w-6 h-6 text-yellow-600" /> SLA Breach Analysis
              </CardTitle>
              <CardDescription>Performance against SLA targets and breach patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{deep.breachRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Breach Rate</div>
                </div>
                <div className="text-center p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                  <div className="text-sm font-bold text-violet-600">Pause Impact</div>
                  <div className="text-xs font-mono text-gray-700 dark:text-gray-300">{formatDurationHMS(deep.avgPauseBreach)}</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-sm font-bold text-green-600">Compliant Time</div>
                  <div className="text-xs font-mono text-gray-700 dark:text-gray-300">{formatDurationHMS(deep.avgPauseCompliant)}</div>
                </div>
              </div>
              <ChartContainer config={{}}>
                <BarChart data={NCAL_ORDER.map((ncal) => ({ ncal, value: deep.breachByNCAL[ncal] || 0 }))} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="ncal" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <ChartTooltip content={<SLABreachTooltip />} />
                  <Bar dataKey="value" radius={8} fill="#ef4444">
                    {NCAL_ORDER.map((ncal) => (
                      <Cell key={ncal} fill={NCAL_COLORS[ncal]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Incident Patterns & Hourly Incident Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card text-card-foreground  rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TimelineIcon className="w-6 h-6 text-green-600" /> Weekly Incident Patterns
              </CardTitle>
              <CardDescription>Day-of-week distribution for incident volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}}>
                <BarChart data={[ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ].map((d, i) => ({ name: d, value: deep.byWeekday[i] }))} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={8} fill="#10b981" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground  rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShowChartIcon className="w-6 h-6 text-purple-600" /> Hourly Incident Patterns
              </CardTitle>
              <CardDescription>Time-of-day distribution for incident occurrence</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}}>
                <BarChart data={Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, '0')}:00`, value: deep.byHour[h] }))} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={8} fill="#8b5cf6" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* NCAL Duration Trends by Month (net duration minus pause time) & Performance Outliers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card text-card-foreground  rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShowChartIcon className="w-6 h-6 text-blue-600" /> NCAL Duration Trends by Month
              </CardTitle>
              <CardDescription>Average net duration trends by NCAL level per month (duration minus pause time)</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyDurationWithPauseData.length > 0 ? (
                <ChartContainer config={{}}>
                  <LineChart data={monthlyDurationWithPauseData} margin={{ top: 0, right: 12, left: 12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value: string) => {
                      const [year, month] = value.split('-');
                      const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      return `${names[parseInt(month) - 1]} ${year}`;
                    }} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(v: number) => formatDurationHMS(v)} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatDurationHMS(value)} />} />
                    {NCAL_ORDER.map((ncal) => (
                      <Line
                        key={ncal}
                        dataKey={ncal}
                        type="natural"
                        stroke={NCAL_COLORS[ncal]}
                        strokeWidth={2}
                        dot={{ fill: NCAL_COLORS[ncal] }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <ShowChartIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No duration data</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {filteredIncidents.length === 0 ? 'No incidents found' : 'No duration data available'}
                  </p>
                </div>
              )}
            </CardContent>
            
            {/* Duration Trends Table */}
            {monthlyDurationWithPauseData.length > 0 && (
              <CardFooter className="pt-0">
                <div className="w-full">
                  <h4 className="text-sm font-semibold text-card-foreground mb-3">Monthly Average Net Duration per NCAL (HH:MM:SS)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 font-medium text-muted-foreground">NCAL</th>
                          {monthlyDurationWithPauseData.map((row) => (
                            <th key={row.month} className="text-center p-2 font-medium text-muted-foreground">
                              {(() => {
                                const [year, month] = row.month.split('-');
                                const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                return `${monthNames[parseInt(month) - 1]} ${year}`;
                              })()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {NCAL_ORDER.map((ncal) => (
                          <tr key={ncal} className="border-b border-border hover:bg-muted/50">
                            <td className="p-2 font-medium text-card-foreground" style={{ color: NCAL_COLORS[ncal] }}>
                              {ncal}
                            </td>
                            {monthlyDurationWithPauseData.map((row) => {
                              const value = row[ncal] || 0;
                              const hours = Math.floor(value / 60);
                              const minutes = Math.floor(value % 60);
                              const seconds = Math.floor((value % 1) * 60);
                              const formattedTime = value > 0 
                                ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                                : '0:00:00';
                              
                              return (
                                <td key={row.month} className="text-center p-2 text-card-foreground">
                                  {formattedTime}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardFooter>
            )}
          </Card>

          <Card className="bg-card text-card-foreground rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="w-6 h-6 text-red-600" /> Performance Outliers
              </CardTitle>
              <CardDescription>Incidents exceeding 95th percentile duration ({formatDurationHMS(deep.p95)})</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {deep.outliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <TrendingUpIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No outliers</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">All incidents within normal range</p>
                </div>
              ) : (
                deep.outliers.map((o, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-card-foreground">{o.site}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {o.priority} • Level {o.level} • {o.ncal}
                      </div>
                    </div>
                    <Badge variant="danger" className="ml-4 bg-red-600 text-white">
                      {formatDurationHMS(o.duration)}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

export default IncidentAnalytics;