import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import SummaryCard from '@/components/ui/SummaryCard';
import { 
  Tooltip as RechartsTooltip,
} from "recharts";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  AreaChart,
  Area,
  ResponsiveContainer
} from 'recharts';
import PageWrapper from '@/components/PageWrapper';

// MUI Icons for consistency with project standards
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssessmentIcon from '@mui/icons-material/Assessment';
// import SpeedIcon from '@mui/icons-material/Speed'; // Removed unused import
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FilterListIcon from '@mui/icons-material/FilterList';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';

// NCAL Color mapping - using project standard colors
const NCAL_COLORS = {
  Blue: '#3b82f6',
  Yellow: '#eab308',
  Orange: '#f97316',
  Red: '#ef4444',
  Black: '#1f2937'
};

const NCAL_TARGETS = {
  Blue: 360,    // 6:00:00
  Yellow: 300,  // 5:00:00
  Orange: 240,  // 4:00:00
  Red: 180,     // 3:00:00
  Black: 60     // 1:00:00
};

const NCAL_ORDER = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];

// Helper functions
const formatDurationHMS = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0:00:00';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to validate and calculate risk score
const calculateRiskScore = (incidentCount: number, avgDurationMinutes: number, resolutionRate: number): {
  riskScore: number;
  level: string;
  breakdown: {
    frequencyScore: number;
    durationScore: number;
    resolutionPenalty: number;
  };
} => {
  // Validate inputs
  const count = Math.max(0, incidentCount || 0);
  const duration = Math.max(0, avgDurationMinutes || 0);
  const resolution = Math.max(0, Math.min(100, resolutionRate || 0));
  
  // Calculate components
  const frequencyScore = count * 10;
  const durationInHours = duration / 60;
  const durationScore = durationInHours * 2;
  const resolutionPenalty = 100 - resolution;
  
  // Calculate total risk score
  const riskScore = frequencyScore + durationScore + resolutionPenalty;
  
  // Determine risk level
  let level = 'Low';
  if (riskScore >= 100) level = 'High';
  else if (riskScore >= 50) level = 'Medium';
  
  return {
    riskScore: Math.round(riskScore * 10) / 10, // Round to 1 decimal place
    level,
    breakdown: {
      frequencyScore,
      durationScore,
      resolutionPenalty
    }
  };
};

  const normalizeNCAL = (ncal: string | null | undefined): string => {
    if (!ncal) return 'Unknown';
  const value = ncal.toString().trim().toLowerCase();
  switch (value) {
      case 'blue': return 'Blue';
      case 'yellow': return 'Yellow';
      case 'orange': return 'Orange';
      case 'red': return 'Red';
      case 'black': return 'Black';
      default: return ncal.trim();
    }
  };

const SiteAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '1y' | 'all'>('6m');

  // Get all incidents for live updates
  const allIncidents = useLiveQuery(() => 
    db.incidents.toArray()
  );

  // Filter incidents by period
  const filteredIncidents = useMemo(() => {
    if (!allIncidents) return [];
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
        return allIncidents;
    }
    return allIncidents.filter((inc) => {
      if (!inc.startTime) return false;
      const date = new Date(inc.startTime);
      return date >= cutoff;
    });
  }, [allIncidents, selectedPeriod]);

  // Calculate site statistics
  const siteStats = useMemo(() => {
    if (!filteredIncidents || filteredIncidents.length === 0) {
      return {
        totalSites: 0,
        uniqueSites: 0,
        avgSiteDuration: 0,
        siteReliability: 0,
        avgSiteRecovery: 0,
        bySite: {},
        topAffectedSites: [],
        siteRiskScore: {},
        sitePerformance: [],
        siteTrends: [],
        ncalBySite: {},
        ncalPerformance: []
      };
    }

    // Group incidents by site
    const siteGroups: Record<string, any[]> = {};
    filteredIncidents.forEach(inc => {
      const site = inc.site || 'Unknown Site';
      if (!siteGroups[site]) siteGroups[site] = [];
      siteGroups[site].push(inc);
    });

    // Calculate site statistics
    const bySite: Record<string, any> = {};
    const sites = Object.keys(siteGroups);
    
    sites.forEach(site => {
      const incidents = siteGroups[site];
      const totalIncidents = incidents.length;
      const resolvedIncidents = incidents.filter(inc => 
        (inc.status || '').toLowerCase() === 'done'
      ).length;
      
      const durations = incidents
        .map(inc => inc.durationMin || 0)
        .filter(dur => dur > 0);
      
      const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;
      
      const resolutionRate = totalIncidents > 0 
        ? (resolvedIncidents / totalIncidents) * 100 
        : 0;

      // Calculate risk score using the validated helper function
      const riskCalculation = calculateRiskScore(totalIncidents, avgDuration, resolutionRate);
      
      bySite[site] = {
        count: totalIncidents,
        resolved: resolvedIncidents,
        avgDuration,
        resolutionRate,
        riskScore: riskCalculation.riskScore,
        level: riskCalculation.level,
        riskBreakdown: riskCalculation.breakdown
      };
    });

    // Top affected sites
    const topAffectedSites = Object.entries(bySite)
      .map(([site, data]) => ({
        site,
        count: data.count,
        avgDuration: data.avgDuration,
        resolutionRate: data.resolutionRate
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Site risk assessment - include all data for UI display
    const siteRiskScore = Object.entries(bySite)
      .map(([site, data]) => ({
        site,
        count: data.count,
        avgDuration: data.avgDuration,
        resolutionRate: data.resolutionRate,
        riskScore: data.riskScore,
        level: data.level
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .reduce((acc, item) => {
        acc[item.site] = item;
        return acc;
      }, {} as Record<string, any>);

    // NCAL analysis by site
    const ncalBySite: Record<string, Record<string, number>> = {};
    sites.forEach(site => {
      const incidents = siteGroups[site];
      const ncalCounts: Record<string, number> = {};
      
      incidents.forEach(inc => {
        const ncal = normalizeNCAL(inc.ncal);
        ncalCounts[ncal] = (ncalCounts[ncal] || 0) + 1;
      });
      
      ncalBySite[site] = ncalCounts;
    });

    // NCAL performance analysis
    const ncalPerformance = NCAL_ORDER.map(ncal => {
      const ncalIncidents = filteredIncidents.filter(inc => 
        normalizeNCAL(inc.ncal) === ncal
      );
      
      const durations = ncalIncidents
        .map(inc => inc.durationMin || 0)
        .filter(dur => dur > 0);
      
      const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;
      
      const target = NCAL_TARGETS[ncal as keyof typeof NCAL_TARGETS] || 0;
      const compliance = target > 0 ? Math.max(0, ((target - avgDuration) / target) * 100) : 0;

      return {
        ncal,
        count: ncalIncidents.length,
        avgDuration,
        target,
        compliance
      };
    });

    // Site trends by month
    const siteTrends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    for (let i = 0; i < 12; i++) {
      const monthIncidents = filteredIncidents.filter(inc => {
        if (!inc.startTime) return false;
        const date = new Date(inc.startTime);
        return date.getMonth() === i && date.getFullYear() === currentYear;
      });
      
      const uniqueSites = new Set(monthIncidents.map(inc => inc.site || 'Unknown')).size;
      
      // Calculate average duration for this month
      const monthDurations = monthIncidents
        .map(inc => inc.durationMin || 0)
        .filter(dur => dur > 0);
      const avgDuration = monthDurations.length > 0 
        ? monthDurations.reduce((a, b) => a + b, 0) / monthDurations.length 
        : 0;
      
      // Calculate resolution rate for this month
      const monthResolved = monthIncidents.filter(inc => 
        (inc.status || '').toLowerCase() === 'done'
      ).length;
      const resolutionRate = monthIncidents.length > 0 
        ? (monthResolved / monthIncidents.length) * 100 
        : 0;
      
      siteTrends.push({
        month: `${months[i]} ${currentYear}`,
        incidents: monthIncidents.length,
        uniqueSites,
        avgDuration,
        resolutionRate
      });
    }

    // Overall statistics
    const totalSites = sites.length;
    const uniqueSites = new Set(filteredIncidents.map(inc => inc.site || 'Unknown')).size;
    const allDurations = filteredIncidents
      .map(inc => inc.durationMin || 0)
      .filter(dur => dur > 0);
    const avgSiteDuration = allDurations.length > 0 
      ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length 
      : 0;
    
    const totalResolved = filteredIncidents.filter(inc => 
      (inc.status || '').toLowerCase() === 'done'
    ).length;
    const siteReliability = filteredIncidents.length > 0 
      ? (totalResolved / filteredIncidents.length) * 100 
      : 0;

    return {
      totalSites,
      uniqueSites,
      avgSiteDuration,
      siteReliability,
      avgSiteRecovery: avgSiteDuration,
      bySite,
      topAffectedSites,
      siteRiskScore,
      sitePerformance: topAffectedSites,
      siteTrends,
      ncalBySite,
      ncalPerformance
    };
  }, [filteredIncidents]);

  // Prepare chart data
  const topAffectedSitesData = Array.isArray(siteStats.topAffectedSites) ? siteStats.topAffectedSites.map((site, index) => ({
    name: site.site,
    count: site.count,
    avgDuration: site.avgDuration,
    resolutionRate: site.resolutionRate,
    rank: index + 1
  })) : [];



  const ncalPerformanceData = siteStats.ncalPerformance.map(item => ({
    name: item.ncal,
    count: item.count,
    avgDuration: item.avgDuration,
    target: item.target,
    compliance: item.compliance,
    fill: NCAL_COLORS[item.ncal as keyof typeof NCAL_COLORS] || '#6b7280'
  }));

  const siteTrendData = siteStats.siteTrends.map(item => ({
    month: item.month,
    incidents: item.incidents,
    uniqueSites: item.uniqueSites
  }));

  const sitePerformanceData = siteStats.siteTrends.map(item => ({
    month: item.month,
    avgDuration: item.avgDuration || 0,
    resolutionRate: item.resolutionRate || 0
  }));

  // Debug logging untuk validasi data
  console.log('Site Analytics Debug:', {
    totalIncidents: filteredIncidents.length,
    currentYear: new Date().getFullYear(),
    siteTrends: siteStats.siteTrends,
    siteTrendData,
    sitePerformanceData,
    resolutionRateValidation: sitePerformanceData.map(item => ({
      month: item.month,
      resolutionRate: item.resolutionRate,
      isPercentage: item.resolutionRate >= 0 && item.resolutionRate <= 100,
      avgDuration: item.avgDuration
    })),
    riskScoreValidation: Object.entries(siteStats.siteRiskScore || {}).map(([site, data]: [string, any]) => ({
      site,
      count: data.count,
      avgDuration: data.avgDuration,
      resolutionRate: data.resolutionRate,
      riskScore: data.riskScore,
      level: data.level,
      calculatedScore: (data.count * 10) + ((data.avgDuration / 60) * 2) + (100 - data.resolutionRate)
    }))
  });

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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
                          icon={<LocationOnIcon className="w-5 h-5 text-white" />}
            title="Total Sites Affected"
            value={siteStats.totalSites}
            description={`${siteStats.uniqueSites} unique sites`}
            iconBg="bg-blue-700"
          />

          <SummaryCard
                          icon={<AccessTimeIcon className="w-5 h-5 text-white" />}
            title="Avg Site Duration"
            value={siteStats.avgSiteDuration > 0 ? formatDurationHMS(siteStats.avgSiteDuration) : '0:00:00'}
            description="Average incident duration per site"
            iconBg="bg-orange-500"
          />

          <SummaryCard
                          icon={<CheckCircleIcon className="w-5 h-5 text-white" />}
            title="Site Reliability"
            value={`${siteStats.siteReliability.toFixed(1)}%`}
            description="Resolution rate across sites"
            iconBg="bg-green-600"
          />

          <SummaryCard
                          icon={<ErrorOutlineIcon className="w-5 h-5 text-white" />}
            title="High Risk Sites"
            value={Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'High').length}
            description="Sites with high risk score"
            iconBg="bg-red-600"
          />
        </div>

        {/* Top Affected Sites & Site Risk Assessment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Affected Sites */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
                <ErrorOutlineIcon className="w-5 h-5 text-red-600" />
                Top Affected Sites
              </CardTitle>
                          <CardDescription className="text-muted-foreground">
              Sites ranked by incident frequency, resolution time, and impact severity
            </CardDescription>
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg ">
              <div className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">Ranking Criteria:</div>
              <div className="text-xs text-red-700 dark:text-red-300">
                <strong>Primary: Incident Count</strong> • <strong>Secondary: Resolution Time</strong> • <strong>Tertiary: Resolution Rate</strong><br/>
                <span className="text-red-600 dark:text-red-400">
                  • <ErrorOutlineIcon className="w-4 h-4 inline" /> Top 3: Critical sites • <WarningAmberIcon className="w-4 h-4 inline" /> Rank 4-5: High priority • <CheckCircleIcon className="w-4 h-4 inline" /> Rank 6-8: Monitor
                </span>
              </div>
            </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topAffectedSitesData.length > 0 ? topAffectedSitesData.slice(0, 8).map((site, index) => (
                  <div key={site.name} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl  shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          index < 3 ? 'bg-red-500' : index < 5 ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}>
                        {index + 1}
                      </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-card-foreground truncate text-base">
                          {site.name}
                        </div>
                          <div className="text-sm text-muted-foreground">
                            {site.count} incidents • {formatDurationHMS(site.avgDuration)} avg resolution
                      </div>
                    </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                                        <div className="text-lg font-bold text-red-600">
                        {site.count}
                      </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Total Incidents</div>
                    </div>
                  </div>
                    
                    {/* Detailed Metrics */}
                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {site.count}
                  </div>
                        <div className="text-xs text-muted-foreground">Incident Count</div>
                        <div className="text-xs text-blue-600 font-medium">
                          {((site.count / siteStats.totalSites) * 100).toFixed(1)}% of total
              </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {formatDurationHMS(site.avgDuration)}
                      </div>
                        <div className="text-xs text-muted-foreground">Avg Resolution</div>
                        <div className="text-xs text-orange-600 font-medium">
                          {site.avgDuration > siteStats.avgSiteRecovery ? 'Above avg' : 'Below avg'}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {site.resolutionRate.toFixed(1)}%
                    </div>
                        <div className="text-xs text-muted-foreground">Resolution Rate</div>
                        <div className="text-xs text-green-600 font-medium">
                          {site.resolutionRate === 100 ? 'All resolved' : 'Some pending'}
                      </div>
                      </div>
                    </div>
                    
                    {/* Impact Assessment */}
                    <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="text-xs text-muted-foreground mb-1">Impact Assessment:</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        {site.count >= 6 ? '<ErrorOutlineIcon className="w-3 h-3 inline" /> High Impact' : site.count >= 4 ? '<WarningAmberIcon className="w-3 h-3 inline" /> Medium Impact' : '<CheckCircleIcon className="w-3 h-3 inline" /> Low Impact'} • 
                        {site.avgDuration > 1440 ? ' Long resolution time' : site.avgDuration > 720 ? ' Moderate resolution time' : ' Quick resolution'} • 
                        {site.resolutionRate === 100 ? ' Fully resolved' : ' Has pending cases'}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No site data available for the selected period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        {/* Site Risk Assessment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
                <WarningAmberIcon className="w-5 h-5 text-yellow-600" />
                Site Risk Assessment
              </CardTitle>
                          <CardDescription className="text-muted-foreground">
              Risk score calculated from incident frequency, duration, and resolution patterns
            </CardDescription>
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Risk Score Formula:</div>
              <div className="text-xs text-yellow-700 dark:text-yellow-300">
                <strong>Risk Score = (Incident Count × 10) + (Avg Duration in hours × 2) + (100 - Resolution Rate)</strong><br/>
                <span className="text-yellow-600 dark:text-yellow-400">
                  • High Risk: Score ≥ 100 • Medium Risk: Score 50-99 • Low Risk: Score &lt; 50
                </span>
              </div>
            </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.keys(siteStats.siteRiskScore || {}).length > 0 ? Object.entries(siteStats.siteRiskScore || {})
                  .sort((a, b) => (b[1] as any).riskScore - (a[1] as any).riskScore)
                  .slice(0, 8)
                  .map(([site, data], index) => {
                    const siteData = data as any;
                    return (
                      <div key={site} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl  shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                              siteData.level === 'High' ? 'bg-red-500' : siteData.level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                          {index + 1}
                        </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-card-foreground truncate text-base">
                            {site}
                          </div>
                              <div className="text-sm text-muted-foreground">
                                {siteData.level} Risk Level
                        </div>
                      </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className={`text-lg font-bold ${
                              siteData.level === 'High' ? 'text-red-600' : siteData.level === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {siteData.riskScore.toFixed(1)}
                        </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Risk Score</div>
                        </div>
                      </div>
                        
                        {/* Risk Factors Breakdown */}
                        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">
                              {siteData.count || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">Incident Count</div>
                            <div className="text-xs text-purple-600 font-medium">
                              (×10 = {(siteData.count || 0) * 10})
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-600">
                              {formatDurationHMS(siteData.avgDuration || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">Avg Duration</div>
                            <div className="text-xs text-orange-600 font-medium">
                              (×2 = {((siteData.avgDuration || 0) / 60 * 2).toFixed(1)})
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {siteData.resolutionRate ? siteData.resolutionRate.toFixed(1) : '0'}%
                            </div>
                            <div className="text-xs text-muted-foreground">Resolution Rate</div>
                            <div className="text-xs text-blue-600 font-medium">
                              (Penalty: {100 - (siteData.resolutionRate || 0)})
                            </div>
                          </div>
                        </div>
                
                        {/* Risk Calculation Explanation */}
                        <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">Risk Calculation:</div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            {siteData.level === 'High' ? <><ErrorOutlineIcon className="w-3 h-3 inline mr-1" /> High Risk</> : siteData.level === 'Medium' ? <><WarningAmberIcon className="w-3 h-3 inline mr-1" /> Medium Risk</> : <><CheckCircleIcon className="w-3 h-3 inline mr-1" /> Low Risk</>} • 
                            Score: {siteData.riskScore.toFixed(1)} • 
                            {siteData.level === 'High' ? ' Requires immediate attention' : siteData.level === 'Medium' ? ' Monitor closely' : ' Low priority'} • 
                            {siteData.count >= 5 ? ' High frequency' : siteData.count >= 3 ? ' Moderate frequency' : ' Low frequency'} incidents
                  </div>
                  </div>
                  </div>
                    );
                  }) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      No risk assessment data available
                </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Site Performance Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
              <AssessmentIcon className="w-5 h-5 text-indigo-600" />
              Site Performance Overview
              </CardTitle>
            <CardDescription className="text-muted-foreground">Comprehensive site reliability and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Reliability Rate */}
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl shadow-sm">
                <CheckCircleIcon className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-green-600">
                  {siteStats.siteReliability.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Reliability Rate</div>
                <div className="text-xs text-green-600 mt-1">Resolution Success</div>
              </div>

              {/* Unique Sites */}
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm">
                <LocationOnIcon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-blue-600">
                  {siteStats.uniqueSites}
                </div>
                <div className="text-sm text-muted-foreground">Unique Sites</div>
                <div className="text-xs text-blue-600 mt-1">Affected Locations</div>
              </div>

              {/* Recovery Time */}
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl shadow-sm">
                <AccessTimeIcon className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-orange-600">
                  {formatDurationHMS(siteStats.avgSiteRecovery)}
                        </div>
                <div className="text-sm text-muted-foreground">Avg Recovery</div>
                <div className="text-xs text-orange-600 mt-1">Time per Site</div>
                      </div>
                      
              {/* Risk Assessment */}
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl  shadow-sm">
                <WarningAmberIcon className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-red-600">
                  {Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'High').length}
                        </div>
                <div className="text-sm text-muted-foreground">High Risk Sites</div>
                <div className="text-xs text-red-600 mt-1">Requires Attention</div>
                        </div>
                        </div>

            {/* Additional Metrics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t ">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Total Incidents:</span>
                        </div>
                <span className="font-semibold text-card-foreground">{siteStats.totalSites}</span>
                      </div>
                      
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Medium Risk:</span>
                        </div>
                <span className="font-semibold text-yellow-600">
                  {Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'Medium').length}
                </span>
                        </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">Low Risk:</span>
                      </div>
                <span className="font-semibold text-green-600">
                  {Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'Low').length}
                </span>
                    </div>
              </div>
            </CardContent>
          </Card>

        {/* NCAL Performance & Compliance Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
              <TrackChangesIcon className="w-5 h-5 text-purple-600" />
              NCAL Performance & Compliance Analysis
              </CardTitle>
            <CardDescription className="text-muted-foreground">Comprehensive NCAL target compliance and performance metrics by severity levels</CardDescription>
            </CardHeader>
            <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl shadow-sm">
                <div className="text-lg font-bold text-green-600">
                  {ncalPerformanceData.filter(item => {
                    const target = NCAL_TARGETS[item.name as keyof typeof NCAL_TARGETS] || 0;
                    return item.avgDuration <= target;
                  }).length}
                </div>
                <div className="text-xs text-muted-foreground">Compliant Levels</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl  shadow-sm">
                <div className="text-lg font-bold text-red-600">
                  {ncalPerformanceData.filter(item => {
                    const target = NCAL_TARGETS[item.name as keyof typeof NCAL_TARGETS] || 0;
                    return item.avgDuration > target;
                  }).length}
                </div>
                <div className="text-xs text-muted-foreground">Exceeded Levels</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm">
                <div className="text-lg font-bold text-blue-600">
                  {ncalPerformanceData.reduce((sum, item) => sum + item.count, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Incidents</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl shadow-sm">
                <div className="text-lg font-bold text-orange-600">
                  {formatDurationHMS(ncalPerformanceData.reduce((sum, item) => sum + item.avgDuration, 0) / ncalPerformanceData.length)}
                </div>
                <div className="text-xs text-muted-foreground">Avg Duration</div>
              </div>
            </div>

            {/* NCAL Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ncalPerformanceData.map((item) => {
                const target = NCAL_TARGETS[item.name as keyof typeof NCAL_TARGETS] || 0;
                const avgDuration = item.avgDuration;
                const isCompliant = avgDuration <= target;
                const efficiency = target > 0 ? Math.max(0, ((target - avgDuration) / target) * 100) : 0;
                  
                  return (
                  <div key={item.name} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl  shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div 
                          className="w-5 h-5 rounded-full border-2 border-white dark:border-zinc-700 shadow-sm" 
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {item.name} NCAL
                        </span>
                        </div>
                      <Badge className={isCompliant ? 'bg-green-600' : 'bg-red-600'}>
                        {isCompliant ? 'Compliant' : 'Exceeded'}
                        </Badge>
                      </div>
                      
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Target:</span>
                        <span className="font-medium">{formatDurationHMS(target)}</span>
                        </div>
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Average:</span>
                        <span className={`font-medium ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                            {formatDurationHMS(avgDuration)}
                          </span>
                        </div>
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Incidents:</span>
                        <span className="font-medium">{item.count}</span>
                        </div>
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Efficiency:</span>
                        <span className={`font-medium ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                          {efficiency.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                    {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Performance vs Target</span>
                          <span>{isCompliant ? 'Compliant' : 'Non-Compliant'}</span>
                        </div>
                        <Progress 
                          value={Math.min(efficiency, 100)} 
                          className={`h-2 ${isCompliant ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        {/* Site Incident Trend Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Site Incident Volume Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
                <TimelineIcon className="w-5 h-5 text-blue-600" />
                Site Incident Volume Trend
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Monthly incident volume trends by top sites
              </CardDescription>
            </CardHeader>
                          <CardContent>
                <div className="w-full h-[260px]">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={siteTrendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorUniqueSites" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="month" 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="incidents" 
                        stroke="#3b82f6" 
                        fill="url(#colorIncidents)" 
                        name="Total Incidents"
                        strokeWidth={1.5} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="uniqueSites" 
                        stroke="#10b981" 
                        fill="url(#colorUniqueSites)" 
                        name="Unique Sites"
                        strokeWidth={1.5} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Total Incidents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Unique Sites</span>
                  </div>
                </div>
              </CardContent>
          </Card>

          {/* Site Performance Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold">
                <TrackChangesIcon className="w-5 h-5 text-green-600" />
                Site Performance Trend
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Average resolution time trends by top sites
              </CardDescription>
            </CardHeader>
                          <CardContent>
                <div className="w-full h-[260px]">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={sitePerformanceData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorAvgDuration" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorResolutionRate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="month" 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      {/* Left Y-axis for Average Duration */}
                      <YAxis 
                        yAxisId="left"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(v: number) => formatDurationHMS(v)}
                      />
                      {/* Right Y-axis for Resolution Rate */}
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                        domain={[0, 100]}
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'Average Duration') {
                            return [formatDurationHMS(value), name];
                          }
                          if (name === 'Resolution Rate (%)') {
                            return [`${value.toFixed(1)}%`, name];
                          }
                          return [value, name];
                        }}
                      />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="avgDuration" 
                        stroke="#3b82f6" 
                        fill="url(#colorAvgDuration)" 
                        name="Average Duration"
                        strokeWidth={1.5} 
                      />
                      <Area 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="resolutionRate" 
                        stroke="#10b981" 
                        fill="url(#colorResolutionRate)" 
                        name="Resolution Rate (%)"
                        strokeWidth={1.5} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Avg Duration (Left)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-muted-foreground">Resolution Rate % (Right)</span>
                  </div>
                </div>
              </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};

export default SiteAnalytics;
