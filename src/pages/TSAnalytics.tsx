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
  Users,
  Clock,
  TrendingUp,
  Award,
  Target
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
import SupportIcon from '@mui/icons-material/Support';
import GroupIcon from '@mui/icons-material/Group';
import SpeedIcon from '@mui/icons-material/Speed';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';

// NCAL Color mapping - using project standard colors
const NCAL_COLORS = {
  Blue: '#3b82f6',    // blue-500
  Yellow: '#eab308',  // yellow-500
  Orange: '#f97316',  // orange-500
  Red: '#ef4444',     // red-500
  Black: '#1f2937'    // gray-800
};

// NCAL Target durations in minutes
const NCAL_TARGETS = {
  Blue: 6 * 60,    // 6:00:00
  Yellow: 5 * 60,  // 5:00:00
  Orange: 4 * 60,  // 4:00:00
  Red: 3 * 60,     // 3:00:00
  Black: 1 * 60    // 1:00:00
};

const NCAL_ORDER = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];

export const TSAnalytics: React.FC = () => {
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
    
    return allIncidents.filter(incident => {
      if (!incident.startTime) return false;
      const incidentDate = new Date(incident.startTime);
      return incidentDate >= cutoffDate;
    });
  }, [allIncidents, selectedPeriod]);

  // Define incidentsWithVendor outside useMemo so it can be used in the component
  const incidentsWithVendor = useMemo(() => {
    return filteredIncidents.filter(i => i.durationVendorMin && i.durationVendorMin > 0);
  }, [filteredIncidents]);

  // Calculate TS-focused statistics
  const tsStats = useMemo(() => {
    if (!filteredIncidents || filteredIncidents.length === 0) {
      return {
        totalTS: 0,
        uniqueTS: 0,
        avgVendorDuration: 0,
        avgResponseTime: 0,
        escalationRate: 0,
        byTS: {},
        byTSDuration: {},
        byTSNCAL: {},
        byTSMonth: {},
        tsPerformance: {},
        vendorEfficiency: 0
      };
    }

    const incidentsWithTS = filteredIncidents.filter(i => i.ts);
    const escalatedIncidents = filteredIncidents.filter(i => i.startEscalationVendor);

    // TS Performance Analysis
    const byTS = incidentsWithTS.reduce((acc, incident) => {
      const ts = incident.ts || 'Unknown';
      if (!acc[ts]) {
        acc[ts] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          escalations: 0,
          byNCAL: {},
          byPriority: {}
        };
      }
      acc[ts].count += 1;
      
      if (incident.durationVendorMin && incident.durationVendorMin > 0) {
        acc[ts].totalDuration += incident.durationVendorMin;
      }
      
      if (incident.startEscalationVendor) {
        acc[ts].escalations += 1;
      }

      // NCAL breakdown
      const ncal = normalizeNCAL(incident.ncal);
      acc[ts].byNCAL[ncal] = (acc[ts].byNCAL[ncal] || 0) + 1;

      // Priority breakdown
      const priority = incident.priority || 'Unknown';
      acc[ts].byPriority[priority] = (acc[ts].byPriority[priority] || 0) + 1;

      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.keys(byTS).forEach(ts => {
      if (byTS[ts].count > 0) {
        byTS[ts].avgDuration = byTS[ts].totalDuration / byTS[ts].count;
        byTS[ts].escalationRate = (byTS[ts].escalations / byTS[ts].count) * 100;
      }
    });

    // TS Duration Analysis
    const byTSDuration = incidentsWithVendor.reduce((acc, incident) => {
      const ts = incident.ts || 'Unknown';
      if (!acc[ts]) {
        acc[ts] = { total: 0, count: 0, avg: 0 };
      }
      acc[ts].total += incident.durationVendorMin || 0;
      acc[ts].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number; avg: number }>);

    // Calculate averages
    Object.keys(byTSDuration).forEach(ts => {
      if (byTSDuration[ts].count > 0) {
        byTSDuration[ts].avg = byTSDuration[ts].total / byTSDuration[ts].count;
      }
    });

    // TS by NCAL
    const byTSNCAL = incidentsWithTS.reduce((acc, incident) => {
      const ts = incident.ts || 'Unknown';
      const ncal = normalizeNCAL(incident.ncal);
      
      if (!acc[ts]) acc[ts] = {};
      if (!acc[ts][ncal]) acc[ts][ncal] = 0;
      acc[ts][ncal] += 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // TS by Month
    const byTSMonth = incidentsWithTS.reduce((acc, incident) => {
      if (!incident.startTime) return acc;
      const date = new Date(incident.startTime);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const ts = incident.ts || 'Unknown';
      
      if (!acc[monthKey]) acc[monthKey] = {};
      acc[monthKey][ts] = (acc[monthKey][ts] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // TS Performance Ranking
    const tsPerformance = Object.entries(byTS)
      .map(([ts, data]) => ({
        ts,
        count: data.count,
        avgDuration: data.avgDuration,
        escalationRate: data.escalationRate,
        efficiency: data.count > 0 ? (data.totalDuration / data.count) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const avgVendorDuration = incidentsWithVendor.length > 0
      ? incidentsWithVendor.reduce((sum, i) => sum + (i.durationVendorMin || 0), 0) / incidentsWithVendor.length
      : 0;

    const escalationRate = filteredIncidents.length > 0
      ? (escalatedIncidents.length / filteredIncidents.length) * 100
      : 0;

    const vendorEfficiency = incidentsWithVendor.length > 0
      ? incidentsWithVendor.filter(i => {
          const ncal = normalizeNCAL(i.ncal);
          const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
          return (i.durationVendorMin || 0) <= target;
        }).length / incidentsWithVendor.length * 100
      : 0;

    return {
      totalTS: incidentsWithTS.length,
      uniqueTS: Object.keys(byTS).length,
      avgVendorDuration,
      avgResponseTime: avgVendorDuration,
      escalationRate,
      byTS,
      byTSDuration,
      byTSNCAL,
      byTSMonth,
      tsPerformance,
      vendorEfficiency
    };
  }, [filteredIncidents]);

  // Prepare chart data
  const tsPerformanceData = Array.isArray(tsStats.tsPerformance) ? tsStats.tsPerformance.map((ts, index) => ({
    name: ts.ts,
    count: ts.count,
    avgDuration: ts.avgDuration,
    escalationRate: ts.escalationRate,
    efficiency: ts.efficiency,
    rank: index + 1,
    fill: index < 3 ? '#3b82f6' : index < 7 ? '#6b7280' : '#d1d5db'
  })) : [];

  const tsWorkloadData = Object.entries(tsStats.byTS || {})
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0,10)
    .map(([ts, data]) => ({
      name: ts,
      count: data.count,
      avgDuration: data.avgDuration,
      escalationRate: data.escalationRate
    }));

  const tsEfficiencyData = Object.entries(tsStats.byTSDuration || {})
    .map(([ts, data]) => ({
      name: ts,
      avgDuration: data.avg,
      count: data.count,
      totalDuration: data.total
    }))
    .sort((a, b) => a.avgDuration - b.avgDuration)
    .slice(0, 10);

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Technical Support Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive analytics and performance metrics for Technical Support teams
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
            icon={<SupportIcon className="w-7 h-7 text-white" />}
            title="Total TS Involved"
            value={tsStats.totalTS}
            description={`${tsStats.uniqueTS} unique TS`}
            iconBg="bg-blue-700"
          />

          <SummaryCard
            icon={<AccessTimeIcon className="w-7 h-7 text-white" />}
            title="Avg Vendor Duration"
            value={tsStats.avgVendorDuration > 0 ? formatDurationHMS(tsStats.avgVendorDuration) : '0:00:00'}
            description="Average vendor response time"
            iconBg="bg-orange-500"
          />

          <SummaryCard
            icon={<TrendingUpIcon className="w-7 h-7 text-white" />}
            title="Vendor Efficiency"
            value={`${tsStats.vendorEfficiency.toFixed(1)}%`}
            description="Within target duration"
            iconBg="bg-green-600"
          />

          <SummaryCard
            icon={<WarningAmberIcon className="w-7 h-7 text-white" />}
            title="Escalation Rate"
            value={`${tsStats.escalationRate.toFixed(1)}%`}
            description="Incidents requiring escalation"
            iconBg="bg-red-600"
          />
        </div>

        {/* TS Performance Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TS Performance Ranking */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                TS Performance Ranking
              </CardTitle>
              <CardDescription>Top 10 Technical Support by incident count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tsPerformanceData.length > 0 ? tsPerformanceData.map((ts, index) => (
                  <div key={ts.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index < 3 ? 'bg-blue-500' : index < 7 ? 'bg-gray-500' : 'bg-gray-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {ts.name}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {ts.count} incidents • {formatDurationHMS(ts.avgDuration)} avg
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {ts.count}
                      </Badge>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {ts.escalationRate.toFixed(1)}% escalation
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No TS performance data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* TS Efficiency Analysis */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SpeedIcon className="w-5 h-5" />
                TS Efficiency Analysis
              </CardTitle>
              <CardDescription>Fastest responding Technical Support teams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tsEfficiencyData.length > 0 ? tsEfficiencyData.map((ts, index) => (
                  <div key={ts.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index < 3 ? 'bg-green-500' : index < 7 ? 'bg-yellow-500' : 'bg-orange-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {ts.name}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {ts.count} incidents handled
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatDurationHMS(ts.avgDuration)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        avg duration
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No TS efficiency data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NCAL Target Compliance Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                NCAL Target Compliance
              </CardTitle>
              <CardDescription>Compliance analysis by NCAL categories and targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {NCAL_ORDER.map((ncal) => {
                  const ncalIncidents = incidentsWithVendor.filter(i => normalizeNCAL(i.ncal) === ncal);
                  const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
                  const avgDuration = ncalIncidents.length > 0 
                    ? ncalIncidents.reduce((sum, i) => sum + (i.durationVendorMin || 0), 0) / ncalIncidents.length 
                    : 0;
                  const compliant = ncalIncidents.filter(i => (i.durationVendorMin || 0) <= target).length;
                  const complianceRate = ncalIncidents.length > 0 ? (compliant / ncalIncidents.length) * 100 : 0;
                  
                  if (ncalIncidents.length === 0) return null;
                  
                  return (
                    <div key={ncal} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS] }}
                          ></div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{ncal}</span>
                        </div>
                        <Badge 
                          variant={complianceRate >= 80 ? "success" : complianceRate >= 60 ? "warning" : "danger"}
                          className="text-xs"
                        >
                          {complianceRate.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Target:</span>
                          <span className="ml-2 font-medium">{formatDurationHMS(target)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Average:</span>
                          <span className={`ml-2 font-medium ${avgDuration <= target ? 'text-green-600' : 'text-red-600'}`}>
                            {formatDurationHMS(avgDuration)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Incidents:</span>
                          <span className="ml-2 font-medium">{ncalIncidents.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Compliant:</span>
                          <span className="ml-2 font-medium text-green-600">{compliant}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Compliance Rate</span>
                          <span>{complianceRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              complianceRate >= 80 ? 'bg-green-500' : 
                              complianceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(complianceRate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* TS Performance by NCAL */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SpeedIcon className="w-5 h-5" />
                TS Performance by NCAL
              </CardTitle>
              <CardDescription>Average response time vs target by NCAL category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {NCAL_ORDER.map((ncal) => {
                  const ncalIncidents = incidentsWithVendor.filter(i => normalizeNCAL(i.ncal) === ncal);
                  const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
                  const avgDuration = ncalIncidents.length > 0 
                    ? ncalIncidents.reduce((sum, i) => sum + (i.durationVendorMin || 0), 0) / ncalIncidents.length 
                    : 0;
                  const isCompliant = avgDuration <= target;
                  const efficiencyRate = target > 0 ? (target / avgDuration) * 100 : 0;
                  
                  if (ncalIncidents.length === 0) return null;
                  
                  return (
                    <div key={ncal} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS] }}
                          ></div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{ncal}</span>
                        </div>
                        <Badge 
                          variant={isCompliant ? "success" : "danger"}
                          className="text-xs"
                        >
                          {isCompliant ? 'On Target' : 'Over Target'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Target:</span>
                          <span className="ml-2 font-medium">{formatDurationHMS(target)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Average:</span>
                          <span className={`ml-2 font-medium ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                            {formatDurationHMS(avgDuration)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Incidents:</span>
                          <span className="ml-2 font-medium">{ncalIncidents.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Efficiency:</span>
                          <span className={`ml-2 font-medium ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                            {efficiencyRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Performance vs Target</span>
                          <span>{isCompliant ? 'Compliant' : 'Non-Compliant'}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${isCompliant ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(efficiencyRate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TS Workload Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TS Workload Chart */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="w-5 h-5" />
                TS Workload Distribution
              </CardTitle>
              <CardDescription>Incident distribution across Technical Support teams</CardDescription>
            </CardHeader>
            <CardContent>
                          {tsWorkloadData.length > 0 ? (
              <ChartContainer config={{}}>
                <BarChart 
                  data={tsWorkloadData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tickFormatter={(value) => value.length > 8 ? value.substring(0, 8) + '...' : value}
                  />
                  <YAxis />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                  >
                    <LabelList position="top" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No workload data available
              </div>
            )}
            </CardContent>
          </Card>

          {/* TS Performance Metrics */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AssessmentIcon className="w-5 h-5" />
                TS Performance Metrics
              </CardTitle>
              <CardDescription>Key performance indicators for Technical Support</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {tsStats.vendorEfficiency.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Efficiency Rate</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {tsStats.uniqueTS}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Active TS</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Avg Response Time:</span>
                    <span className="font-medium">{formatDurationHMS(tsStats.avgVendorDuration)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Escalation Rate:</span>
                    <span className="font-medium text-red-600">{tsStats.escalationRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Incidents:</span>
                    <span className="font-medium">{tsStats.totalTS}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TS Trend Analysis */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TimelineIcon className="w-5 h-5" />
              TS Performance Trend
            </CardTitle>
            <CardDescription>Monthly performance trend for Technical Support teams</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(tsStats.byTSMonth || {}).length > 0 ? (
              <ChartContainer config={{}}>
                <LineChart
                  data={Object.entries(tsStats.byTSMonth || {})
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([month, tsData]) => ({
                      month,
                      totalIncidents: Object.values(tsData).reduce((sum: number, count: any) => sum + count, 0),
                      uniqueTS: Object.keys(tsData).length
                    }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalIncidents" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    name="Total Incidents"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueTS" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    name="Unique TS"
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default TSAnalytics;
