import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Incident } from '@/types/incident';
import { db } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SummaryCard from '@/components/ui/SummaryCard';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Activity,
  Target,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

import PageWrapper from '@/components/PageWrapper';

// MUI Icons for consistency with project standards
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIconMUI from '@mui/icons-material/PieChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import LabelIcon from '@mui/icons-material/Label';
import WarningIcon from '@mui/icons-material/Warning';

// NCAL Color mapping - using project standard colors
const NCAL_COLORS = {
  Blue: '#3b82f6',    // blue-500
  Yellow: '#f59e0b',  // amber-500
  Orange: '#f97316',  // orange-500
  Red: '#ef4444',     // red-500
  Black: '#1f2937'    // gray-800
};

// Area chart colors matching project standards
const AREA_COLORS = [
  '#11A69C', // teal/cyan
  '#0081FE', // biru
  '#924AF7', // ungu
  '#FBBF24', // kuning
  '#FF5383', // merah muda neon
  '#4ADE80', // hijau segar
  '#F2681F', // oranye
];

// NCAL Target durations in minutes
const NCAL_TARGETS = {
  Blue: 6 * 60,    // 6:00:00
  Yellow: 5 * 60,  // 5:00:00
  Orange: 4 * 60,  // 4:00:00
  Red: 3 * 60,     // 3:00:00
  Black: 1 * 60    // 1:00:00
};

const NCAL_ORDER = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];

export const IncidentAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('6m');

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
      withDuration: filtered.filter(i => i.durationMin && i.durationMin > 0).length
    });
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
      if (incident.durationMin && incident.durationMin > 0) {
        acc[ncal].total += incident.durationMin;
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
      
      if (incident.durationMin && incident.durationMin > 0) {
        acc[monthKey][ncal].total += incident.durationMin;
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
  const priorityData = Object.entries(stats.byPriority).map(([priority, count]) => ({
    name: priority,
    value: count
  }));

  const klasifikasiData = Object.entries(stats.byKlas).map(([klas, count]) => ({
    name: klas,
    value: count
  }));

  const siteData = Object.entries(stats.bySite)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([site, count]) => ({
      name: site,
      value: count
    }));

  const levelData = Object.entries(stats.byLevel).map(([level, count]) => ({
    name: `Level ${level}`,
    value: count
  }));

  const ncalData = NCAL_ORDER.map(ncal => ({
    name: ncal,
    value: stats.byNCAL[ncal] || 0,
    color: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]
  }));

  const ncalDurationData = NCAL_ORDER.map(ncal => {
    const duration = stats.byNCALDuration[ncal];
    return {
      name: ncal,
      actual: duration?.avg || 0,
      target: NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0,
      color: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]
    };
  });

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
          value={formatDurationHMS(stats.mttrMin)}
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
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ncalData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name} ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ncalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart 
                data={monthlyNCALData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  {NCAL_ORDER.map(ncal => (
                    <linearGradient key={ncal} id={`color${ncal}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <Tooltip />
                <Legend />
                {NCAL_ORDER.map(ncal => (
                  <Area
                    key={ncal}
                    type="monotone"
                    dataKey={ncal}
                    stackId="1"
                    stroke={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]}
                    fill={`url(#color${ncal})`}
                    strokeWidth={3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart 
                data={monthlyNCALDurationData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  {NCAL_ORDER.map(ncal => (
                    <linearGradient key={ncal} id={`colorDuration${ncal}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <Tooltip 
                  formatter={(value: number) => [formatDurationHMS(value), 'Duration']}
                />
                <Legend />
                {NCAL_ORDER.map(ncal => (
                  <Area
                    key={ncal}
                    type="monotone"
                    dataKey={ncal}
                    stackId="1"
                    stroke={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]}
                    fill={`url(#colorDuration${ncal})`}
                    strokeWidth={3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={priorityData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={siteData} 
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
            <div className="text-3xl font-bold text-blue-600">
              {formatDurationHMS(stats.avgVendorMin)}
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
            <div className="text-3xl font-bold text-orange-600">
              {(stats.pauseRatio * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Percentage of total time spent on pause
            </p>
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={levelData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <Tooltip />
                <Bar dataKey="value" fill="#ffc658" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      </div>
    </PageWrapper>
  );
};
