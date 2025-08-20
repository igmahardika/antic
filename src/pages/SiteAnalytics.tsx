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
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle,
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
import LocationOnIcon from '@mui/icons-material/LocationOn';

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

export const SiteAnalytics: React.FC = () => {
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

  // Calculate Site-focused statistics
  const siteStats = useMemo(() => {
    if (!filteredIncidents || filteredIncidents.length === 0) {
      return {
        totalSites: 0,
        uniqueSites: 0,
        avgSiteDuration: 0,
        avgSiteRecovery: 0,
        siteReliability: 0,
        bySite: {},
        bySiteDuration: {},
        bySiteNCAL: {},
        bySiteMonth: {},
        sitePerformance: {},
        siteRiskScore: {},
        topAffectedSites: [],
        siteProblemAnalysis: {},
        ncalPerformance: {},
        targetCompliance: {}
      };
    }

    const incidentsWithSite = filteredIncidents.filter(i => i.site);
    const resolvedIncidents = filteredIncidents.filter(i => i.endTime);

    // Site Performance Analysis with NCAL Target Compliance
    const bySite = incidentsWithSite.reduce((acc, incident) => {
      const site = incident.site || 'Unknown';
      if (!acc[site]) {
        acc[site] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          resolved: 0,
          byNCAL: {},
          byPriority: {},
          byProblem: {},
          totalRecoveryTime: 0,
          avgRecoveryTime: 0,
          targetCompliance: 0
        };
      }
      acc[site].count += 1;
      
      if (incident.durationMin && incident.durationMin > 0) {
        acc[site].totalDuration += incident.durationMin;
      }
      
      if (incident.endTime) {
        acc[site].resolved += 1;
      }

      // NCAL breakdown with target compliance
      const ncal = normalizeNCAL(incident.ncal);
      if (!acc[site].byNCAL[ncal]) {
        acc[site].byNCAL[ncal] = { count: 0, totalDuration: 0, avgDuration: 0, compliance: 0 };
      }
      acc[site].byNCAL[ncal].count += 1;
      acc[site].byNCAL[ncal].totalDuration += incident.durationMin || 0;
      
      // Calculate NCAL compliance
      const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
      const isCompliant = (incident.durationMin || 0) <= target;
      acc[site].byNCAL[ncal].compliance += isCompliant ? 1 : 0;

      // Priority breakdown
      const priority = incident.priority || 'Unknown';
      acc[site].byPriority[priority] = (acc[site].byPriority[priority] || 0) + 1;

      // Problem breakdown
      const problem = incident.problem || 'Unknown';
      acc[site].byProblem[problem] = (acc[site].byProblem[problem] || 0) + 1;

      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and compliance rates
    Object.keys(bySite).forEach(site => {
      if (bySite[site].count > 0) {
        bySite[site].avgDuration = bySite[site].totalDuration / bySite[site].count;
        bySite[site].resolutionRate = (bySite[site].resolved / bySite[site].count) * 100;
        
        // Calculate overall target compliance
        let totalCompliant = 0;
        let totalIncidents = 0;
        Object.keys(bySite[site].byNCAL).forEach(ncal => {
          const ncalData = bySite[site].byNCAL[ncal];
          ncalData.avgDuration = ncalData.totalDuration / ncalData.count;
          ncalData.complianceRate = (ncalData.compliance / ncalData.count) * 100;
          totalCompliant += ncalData.compliance;
          totalIncidents += ncalData.count;
        });
        bySite[site].targetCompliance = totalIncidents > 0 ? (totalCompliant / totalIncidents) * 100 : 0;
      }
    });

    // Site Duration Analysis with NCAL Targets
    const bySiteDuration = incidentsWithSite.reduce((acc, incident) => {
      const site = incident.site || 'Unknown';
      if (!acc[site]) {
        acc[site] = { 
          total: 0, 
          count: 0, 
          avg: 0, 
          max: 0, 
          min: Infinity,
          byNCAL: {},
          targetCompliance: 0
        };
      }
      const duration = incident.durationMin || 0;
      acc[site].total += duration;
      acc[site].count += 1;
      acc[site].max = Math.max(acc[site].max, duration);
      acc[site].min = Math.min(acc[site].min, duration);
      
      // NCAL-specific duration analysis
      const ncal = normalizeNCAL(incident.ncal);
      if (!acc[site].byNCAL[ncal]) {
        acc[site].byNCAL[ncal] = { total: 0, count: 0, avg: 0, target: 0, compliance: 0 };
      }
      acc[site].byNCAL[ncal].total += duration;
      acc[site].byNCAL[ncal].count += 1;
      acc[site].byNCAL[ncal].target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
      
      // Check compliance
      const isCompliant = duration <= acc[site].byNCAL[ncal].target;
      acc[site].byNCAL[ncal].compliance += isCompliant ? 1 : 0;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and compliance for duration analysis
    Object.keys(bySiteDuration).forEach(site => {
      if (bySiteDuration[site].count > 0) {
        bySiteDuration[site].avg = bySiteDuration[site].total / bySiteDuration[site].count;
        
        // Calculate overall compliance
        let totalCompliant = 0;
        let totalIncidents = 0;
        Object.keys(bySiteDuration[site].byNCAL).forEach(ncal => {
          const ncalData = bySiteDuration[site].byNCAL[ncal];
          ncalData.avg = ncalData.total / ncalData.count;
          ncalData.complianceRate = (ncalData.compliance / ncalData.count) * 100;
          totalCompliant += ncalData.compliance;
          totalIncidents += ncalData.count;
        });
        bySiteDuration[site].targetCompliance = totalIncidents > 0 ? (totalCompliant / totalIncidents) * 100 : 0;
      }
    });

    // Site by NCAL with target analysis
    const bySiteNCAL = incidentsWithSite.reduce((acc, incident) => {
      const site = incident.site || 'Unknown';
      const ncal = normalizeNCAL(incident.ncal);
      
      if (!acc[site]) acc[site] = {};
      if (!acc[site][ncal]) {
        acc[site][ncal] = { 
          count: 0, 
          totalDuration: 0, 
          avgDuration: 0, 
          target: 0, 
          compliance: 0,
          complianceRate: 0
        };
      }
      acc[site][ncal].count += 1;
      acc[site][ncal].totalDuration += incident.durationMin || 0;
      acc[site][ncal].target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
      
      // Check compliance
      const isCompliant = (incident.durationMin || 0) <= acc[site][ncal].target;
      acc[site][ncal].compliance += isCompliant ? 1 : 0;
      
      return acc;
    }, {} as Record<string, Record<string, any>>);

    // Calculate averages and compliance rates for NCAL analysis
    Object.keys(bySiteNCAL).forEach(site => {
      Object.keys(bySiteNCAL[site]).forEach(ncal => {
        const data = bySiteNCAL[site][ncal];
        data.avgDuration = data.totalDuration / data.count;
        data.complianceRate = (data.compliance / data.count) * 100;
      });
    });

    // Site by Month
    const bySiteMonth = incidentsWithSite.reduce((acc, incident) => {
      if (!incident.startTime) return acc;
      const date = new Date(incident.startTime);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const site = incident.site || 'Unknown';
      
      if (!acc[monthKey]) acc[monthKey] = {};
      acc[monthKey][site] = (acc[monthKey][site] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Site Performance Ranking with target compliance
    const sitePerformance = Object.entries(bySite)
      .map(([site, data]) => ({
        site,
        count: data.count,
        avgDuration: data.avgDuration,
        resolutionRate: data.resolutionRate,
        riskScore: data.count * (data.avgDuration / 60), // Risk score based on frequency and duration
        targetCompliance: data.targetCompliance
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Top Affected Sites with compliance
    const topAffectedSites = Object.entries(bySite)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([site, data]) => ({
        site,
        count: data.count,
        avgDuration: data.avgDuration,
        resolutionRate: data.resolutionRate,
        targetCompliance: data.targetCompliance
      }));

    // Site Problem Analysis
    const siteProblemAnalysis = incidentsWithSite.reduce((acc, incident) => {
      const site = incident.site || 'Unknown';
      const problem = incident.problem || 'Unknown';
      
      if (!acc[site]) acc[site] = {};
      if (!acc[site][problem]) acc[site][problem] = 0;
      acc[site][problem] += 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Site Risk Score with NCAL consideration
    const siteRiskScore = Object.entries(bySite).reduce((acc, [site, data]) => {
      const frequencyScore = data.count / Math.max(...Object.values(bySite).map((d: any) => d.count));
      const durationScore = data.avgDuration / Math.max(...Object.values(bySite).map((d: any) => d.avgDuration));
      const complianceScore = data.targetCompliance / 100; // Normalize compliance to 0-1
      const riskScore = (frequencyScore * 0.5 + durationScore * 0.3 + (1 - complianceScore) * 0.2) * 100;
      
      acc[site] = {
        riskScore: Math.min(riskScore, 100),
        frequencyScore: frequencyScore * 100,
        durationScore: durationScore * 100,
        complianceScore: data.targetCompliance,
        level: riskScore > 80 ? 'High' : riskScore > 50 ? 'Medium' : 'Low'
      };
      return acc;
    }, {} as Record<string, any>);

    // NCAL Performance Analysis for Sites
    const ncalPerformance = NCAL_ORDER.reduce((acc, ncal) => {
      const ncalIncidents = incidentsWithSite.filter(i => normalizeNCAL(i.ncal) === ncal);
      const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
      
      acc[ncal] = {
        count: ncalIncidents.length,
        avgDuration: ncalIncidents.length > 0 
          ? ncalIncidents.reduce((sum, i) => sum + (i.durationMin || 0), 0) / ncalIncidents.length 
          : 0,
        target: target,
        compliance: ncalIncidents.filter(i => (i.durationMin || 0) <= target).length,
        complianceRate: ncalIncidents.length > 0 
          ? (ncalIncidents.filter(i => (i.durationMin || 0) <= target).length / ncalIncidents.length) * 100 
          : 0
      };
      return acc;
    }, {} as Record<string, any>);

    // Overall Target Compliance for Sites
    const targetCompliance = NCAL_ORDER.reduce((acc, ncal) => {
      const ncalIncidents = incidentsWithSite.filter(i => normalizeNCAL(i.ncal) === ncal);
      const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
      
      acc[ncal] = {
        target: target,
        targetFormatted: formatDurationHMS(target),
        count: ncalIncidents.length,
        compliant: ncalIncidents.filter(i => (i.durationMin || 0) <= target).length,
        nonCompliant: ncalIncidents.filter(i => (i.durationMin || 0) > target).length,
        complianceRate: ncalIncidents.length > 0 
          ? (ncalIncidents.filter(i => (i.durationMin || 0) <= target).length / ncalIncidents.length) * 100 
          : 0
      };
      return acc;
    }, {} as Record<string, any>);

    const avgSiteDuration = incidentsWithSite.length > 0
      ? incidentsWithSite.reduce((sum, i) => sum + (i.durationMin || 0), 0) / incidentsWithSite.length
      : 0;

    const siteReliability = incidentsWithSite.length > 0
      ? (resolvedIncidents.length / incidentsWithSite.length) * 100
      : 0;

    return {
      totalSites: incidentsWithSite.length,
      uniqueSites: Object.keys(bySite).length,
      avgSiteDuration,
      avgSiteRecovery: avgSiteDuration,
      siteReliability,
      bySite,
      bySiteDuration,
      bySiteNCAL,
      bySiteMonth,
      sitePerformance,
      siteRiskScore,
      topAffectedSites,
      siteProblemAnalysis,
      ncalPerformance,
      targetCompliance
    };
  }, [filteredIncidents]);

  // Prepare chart data
  const sitePerformanceData = Array.isArray(siteStats.sitePerformance) ? siteStats.sitePerformance.map((site, index) => ({
    name: site.site,
    count: site.count,
    avgDuration: site.avgDuration,
    resolutionRate: site.resolutionRate,
    riskScore: site.riskScore,
    rank: index + 1,
    fill: index < 3 ? '#ef4444' : index < 7 ? '#f97316' : '#eab308'
  })) : [];

  const topAffectedSitesData = Array.isArray(siteStats.topAffectedSites) ? siteStats.topAffectedSites.map((site, index) => ({
    name: site.site,
    count: site.count,
    avgDuration: site.avgDuration,
    resolutionRate: site.resolutionRate,
    targetCompliance: site.targetCompliance || 0,
    rank: index + 1
  })) : [];

  const siteReliabilityData = Object.entries(siteStats.bySite || {})
    .map(([site, data]) => ({
      name: site,
      reliability: data.resolutionRate,
      count: data.count,
      avgDuration: data.avgDuration
    }))
    .sort((a, b) => b.reliability - a.reliability)
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Site Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive analytics and performance metrics for affected sites
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
            icon={<LocationOnIcon className="w-7 h-7 text-white" />}
            title="Total Sites Affected"
            value={siteStats.totalSites}
            description={`${siteStats.uniqueSites} unique sites`}
            iconBg="bg-blue-700"
          />

          <SummaryCard
            icon={<AccessTimeIcon className="w-7 h-7 text-white" />}
            title="Avg Site Duration"
            value={siteStats.avgSiteDuration > 0 ? formatDurationHMS(siteStats.avgSiteDuration) : '0:00:00'}
            description="Average incident duration per site"
            iconBg="bg-orange-500"
          />

          <SummaryCard
            icon={<CheckCircleIcon className="w-7 h-7 text-white" />}
            title="Site Reliability"
            value={`${siteStats.siteReliability.toFixed(1)}%`}
            description="Resolution rate across sites"
            iconBg="bg-green-600"
          />

          <SummaryCard
            icon={<AlertTriangle className="w-7 h-7 text-white" />}
            title="High Risk Sites"
            value={Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'High').length}
            description="Sites with high risk score"
            iconBg="bg-red-600"
          />
        </div>

        {/* Site Performance Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Affected Sites */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Top Affected Sites
              </CardTitle>
              <CardDescription>Most frequently affected sites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topAffectedSitesData.length > 0 ? topAffectedSitesData.map((site, index) => (
                  <div key={site.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index < 3 ? 'bg-red-500' : index < 7 ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {site.name}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {site.count} incidents • {formatDurationHMS(site.avgDuration)} avg
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        {site.count}
                      </Badge>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {site.resolutionRate.toFixed(1)}% resolved
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No site data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Site Reliability Analysis */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                Site Reliability Analysis
              </CardTitle>
              <CardDescription>Most reliable sites by resolution rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {siteReliabilityData.length > 0 ? siteReliabilityData.map((site, index) => (
                  <div key={site.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index < 3 ? 'bg-green-500' : index < 7 ? 'bg-blue-500' : 'bg-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {site.name}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {site.count} incidents handled
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600">
                        {site.reliability.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        reliability
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No reliability data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Site Risk Assessment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Site Risk Score */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WarningAmberIcon className="w-5 h-5" />
                Site Risk Assessment
              </CardTitle>
              <CardDescription>Risk score based on frequency, duration, and NCAL compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.keys(siteStats.siteRiskScore || {}).length > 0 ? Object.entries(siteStats.siteRiskScore || {})
                  .sort((a, b) => b[1].riskScore - a[1].riskScore)
                  .slice(0, 10)
                  .map(([site, data], index) => (
                    <div key={site} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          data.level === 'High' ? 'bg-red-500' : data.level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {site}
                          </span>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {data.level} Risk • {data.complianceScore ? data.complianceScore.toFixed(1) : '0.0'}% compliance
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${
                          data.level === 'High' ? 'text-red-600' : data.level === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {data.riskScore.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          risk score
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No risk assessment data available
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Site Performance Metrics */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AssessmentIcon className="w-5 h-5" />
                Site Performance Metrics
              </CardTitle>
              <CardDescription>Key performance indicators for sites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {siteStats.siteReliability.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Reliability Rate</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {siteStats.uniqueSites}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Unique Sites</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Avg Recovery Time:</span>
                    <span className="font-medium">{formatDurationHMS(siteStats.avgSiteRecovery)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">High Risk Sites:</span>
                    <span className="font-medium text-red-600">
                      {Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'High').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Incidents:</span>
                    <span className="font-medium">{siteStats.totalSites}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* NCAL Target Compliance Analysis for Sites */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Site NCAL Target Compliance
              </CardTitle>
              <CardDescription>Compliance analysis by NCAL categories and targets for sites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {NCAL_ORDER.map((ncal) => {
                  const data = siteStats.targetCompliance[ncal];
                  if (!data || data.count === 0) return null;
                  
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
                          variant={data.complianceRate >= 80 ? "success" : data.complianceRate >= 60 ? "warning" : "danger"}
                          className="text-xs"
                        >
                          {data.complianceRate.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Target:</span>
                          <span className="ml-2 font-medium">{data.targetFormatted}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Incidents:</span>
                          <span className="ml-2 font-medium">{data.count}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Compliant:</span>
                          <span className="ml-2 font-medium text-green-600">{data.compliant}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Non-Compliant:</span>
                          <span className="ml-2 font-medium text-red-600">{data.nonCompliant}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Compliance Rate</span>
                          <span>{data.complianceRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              data.complianceRate >= 80 ? 'bg-green-500' : 
                              data.complianceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(data.complianceRate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Site Performance by NCAL */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SpeedIcon className="w-5 h-5" />
                Site Performance by NCAL
              </CardTitle>
              <CardDescription>Average resolution time vs target by NCAL category for sites</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {NCAL_ORDER.map((ncal) => {
                  const data = siteStats.ncalPerformance[ncal];
                  if (!data || data.count === 0) return null;
                  
                  const isCompliant = data.avgDuration <= data.target;
                  const efficiencyRate = data.target > 0 ? (data.target / data.avgDuration) * 100 : 0;
                  
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
                          <span className="ml-2 font-medium">{formatDurationHMS(data.target)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Average:</span>
                          <span className={`ml-2 font-medium ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                            {formatDurationHMS(data.avgDuration)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Incidents:</span>
                          <span className="ml-2 font-medium">{data.count}</span>
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

        {/* Site Trend Analysis */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TimelineIcon className="w-5 h-5" />
              Site Incident Trend
            </CardTitle>
            <CardDescription>Monthly incident trend for affected sites</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(siteStats.bySiteMonth || {}).length > 0 ? (
              <ChartContainer config={{}}>
                <LineChart
                  data={Object.entries(siteStats.bySiteMonth || {})
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([month, siteData]) => ({
                      month,
                      totalIncidents: Object.values(siteData).reduce((sum: number, count: any) => sum + count, 0),
                      uniqueSites: Object.keys(siteData).length
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
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    name="Total Incidents"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueSites" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    name="Unique Sites"
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

export default SiteAnalytics;
