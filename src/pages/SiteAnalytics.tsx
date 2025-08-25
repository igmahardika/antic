import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SummaryCard from '@/components/ui/SummaryCard';
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart,
  Line
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

      // Calculate risk score based on frequency and duration
      const frequencyScore = totalIncidents * 10;
      const durationScore = avgDuration > 240 ? 50 : avgDuration > 120 ? 30 : 10;
      const riskScore = frequencyScore + durationScore;
      
      let riskLevel = 'Low';
      if (riskScore > 100) riskLevel = 'High';
      else if (riskScore > 50) riskLevel = 'Medium';

      bySite[site] = {
        count: totalIncidents,
        resolved: resolvedIncidents,
        avgDuration,
        resolutionRate,
        riskScore,
        level: riskLevel
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

    // Site risk assessment
    const siteRiskScore = Object.entries(bySite)
      .map(([site, data]) => ({
        site,
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
    
    for (let i = 0; i < 12; i++) {
      const monthIncidents = filteredIncidents.filter(inc => {
        if (!inc.startTime) return false;
        const date = new Date(inc.startTime);
        return date.getMonth() === i;
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
        month: months[i],
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
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100">Site Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive analytics and performance metrics for affected sites
            </p>
          </div>
          
          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <FilterListIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
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
            icon={<ErrorOutlineIcon className="w-7 h-7 text-white" />}
            title="High Risk Sites"
            value={Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'High').length}
            description="Sites with high risk score"
            iconBg="bg-red-600"
          />
        </div>

        {/* Top Affected Sites & Site Risk Assessment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Affected Sites */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-900 dark:text-gray-100">
                <ErrorOutlineIcon className="w-5 h-5 text-red-600" />
                Top Affected Sites
              </CardTitle>
                          <CardDescription className="text-gray-600 dark:text-gray-400">
              Sites ranked by incident frequency, resolution time, and impact severity
            </CardDescription>
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">Ranking Criteria:</div>
              <div className="text-xs text-red-700 dark:text-red-300">
                <strong>Primary: Incident Count</strong> • <strong>Secondary: Resolution Time</strong> • <strong>Tertiary: Resolution Rate</strong><br/>
                <span className="text-red-600 dark:text-red-400">
                  • 🔴 Top 3: Critical sites • 🟡 Rank 4-5: High priority • 🟢 Rank 6-8: Monitor
                </span>
              </div>
            </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topAffectedSitesData.length > 0 ? topAffectedSitesData.slice(0, 8).map((site, index) => (
                  <div key={site.name} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          index < 3 ? 'bg-red-500' : index < 5 ? 'bg-orange-500' : 'bg-yellow-500'
                      }`}>
                        {index + 1}
                      </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base">
                          {site.name}
                        </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
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
                        <div className="text-xs text-gray-600 dark:text-gray-400">Incident Count</div>
                        <div className="text-xs text-blue-600 font-medium">
                          {((site.count / siteStats.totalSites) * 100).toFixed(1)}% of total
              </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {formatDurationHMS(site.avgDuration)}
                      </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Avg Resolution</div>
                        <div className="text-xs text-orange-600 font-medium">
                          {site.avgDuration > siteStats.avgSiteRecovery ? 'Above avg' : 'Below avg'}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {site.resolutionRate.toFixed(1)}%
                    </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Resolution Rate</div>
                        <div className="text-xs text-green-600 font-medium">
                          {site.resolutionRate === 100 ? 'All resolved' : 'Some pending'}
                      </div>
                      </div>
                    </div>
                    
                    {/* Impact Assessment */}
                    <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Impact Assessment:</div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        {site.count >= 6 ? '🔴 High Impact' : site.count >= 4 ? '🟡 Medium Impact' : '🟢 Low Impact'} • 
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
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-900 dark:text-gray-100">
                <WarningAmberIcon className="w-5 h-5 text-amber-600" />
                Site Risk Assessment
              </CardTitle>
                          <CardDescription className="text-gray-600 dark:text-gray-400">
              Risk score calculated from incident frequency, duration, and resolution patterns
            </CardDescription>
            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Risk Score Formula:</div>
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Risk Score = (Incident Count × 10) + (Avg Duration in hours × 2) + (100 - Resolution Rate)</strong><br/>
                <span className="text-amber-600 dark:text-amber-400">
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
                      <div key={site} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                              siteData.level === 'High' ? 'bg-red-500' : siteData.level === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                          {index + 1}
                        </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-900 dark:text-gray-100 truncate text-base">
                            {site}
                          </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
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
                            <div className="text-xs text-gray-600 dark:text-gray-400">Incident Count</div>
                            <div className="text-xs text-purple-600 font-medium">
                              Frequency Factor
                    </div>
              </div>
                          
                          <div className="text-center">
                            <div className="text-lg font-bold text-orange-600">
                              {formatDurationHMS(siteData.avgDuration || 0)}
                    </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Avg Duration</div>
                            <div className="text-xs text-orange-600 font-medium">
                              Duration Factor
                  </div>
                    </div>
                          
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {siteData.resolutionRate ? siteData.resolutionRate.toFixed(1) : '0'}%
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Resolution Rate</div>
                            <div className="text-xs text-blue-600 font-medium">
                              Resolution Factor
                            </div>
                  </div>
                </div>
                
                        {/* Risk Calculation Explanation */}
                        <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Risk Calculation:</div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            {siteData.level === 'High' ? '🔴 High Risk' : siteData.level === 'Medium' ? '🟡 Medium Risk' : '🟢 Low Risk'} • 
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
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-900 dark:text-gray-100">
              <AssessmentIcon className="w-5 h-5 text-indigo-600" />
              Site Performance Overview
              </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Comprehensive site reliability and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Reliability Rate */}
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
                <CheckCircleIcon className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-green-600">
                  {siteStats.siteReliability.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Reliability Rate</div>
                <div className="text-xs text-green-600 mt-1">Resolution Success</div>
              </div>

              {/* Unique Sites */}
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                <LocationOnIcon className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-blue-600">
                  {siteStats.uniqueSites}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unique Sites</div>
                <div className="text-xs text-blue-600 mt-1">Affected Locations</div>
              </div>

              {/* Recovery Time */}
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm">
                <AccessTimeIcon className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-orange-600">
                  {formatDurationHMS(siteStats.avgSiteRecovery)}
                        </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg Recovery</div>
                <div className="text-xs text-orange-600 mt-1">Time per Site</div>
                      </div>
                      
              {/* Risk Assessment */}
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
                <WarningAmberIcon className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-red-600">
                  {Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'High').length}
                        </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">High Risk Sites</div>
                <div className="text-xs text-red-600 mt-1">Requires Attention</div>
                        </div>
                        </div>

            {/* Additional Metrics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Incidents:</span>
                        </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{siteStats.totalSites}</span>
                      </div>
                      
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Medium Risk:</span>
                        </div>
                <span className="font-semibold text-yellow-600">
                  {Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'Medium').length}
                </span>
                        </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Low Risk:</span>
                      </div>
                <span className="font-semibold text-green-600">
                  {Object.values(siteStats.siteRiskScore).filter((site: any) => site.level === 'Low').length}
                </span>
                    </div>
              </div>
            </CardContent>
          </Card>

        {/* NCAL Performance & Compliance Analysis */}
        <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-900 dark:text-gray-100">
              <TrackChangesIcon className="w-5 h-5 text-purple-600" />
              NCAL Performance & Compliance Analysis
              </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">Comprehensive NCAL target compliance and performance metrics by severity levels</CardDescription>
            </CardHeader>
            <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
                <div className="text-lg font-bold text-green-600">
                  {ncalPerformanceData.filter(item => {
                    const target = NCAL_TARGETS[item.name as keyof typeof NCAL_TARGETS] || 0;
                    return item.avgDuration <= target;
                  }).length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Compliant Levels</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
                <div className="text-lg font-bold text-red-600">
                  {ncalPerformanceData.filter(item => {
                    const target = NCAL_TARGETS[item.name as keyof typeof NCAL_TARGETS] || 0;
                    return item.avgDuration > target;
                  }).length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Exceeded Levels</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                <div className="text-lg font-bold text-blue-600">
                  {ncalPerformanceData.reduce((sum, item) => sum + item.count, 0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Incidents</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm">
                <div className="text-lg font-bold text-orange-600">
                  {formatDurationHMS(ncalPerformanceData.reduce((sum, item) => sum + item.avgDuration, 0) / ncalPerformanceData.length)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Avg Duration</div>
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
                  <div key={item.name} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
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
                          <span className="text-gray-600 dark:text-gray-400">Target:</span>
                        <span className="font-medium">{formatDurationHMS(target)}</span>
                        </div>
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Average:</span>
                        <span className={`font-medium ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                            {formatDurationHMS(avgDuration)}
                          </span>
                        </div>
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Incidents:</span>
                        <span className="font-medium">{item.count}</span>
                        </div>
                      <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Efficiency:</span>
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
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${isCompliant ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(efficiency, 100)}%` }}
                          ></div>
                        </div>
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
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-900 dark:text-gray-100">
                <TimelineIcon className="w-5 h-5 text-blue-600" />
                Site Incident Volume Trend
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Monthly incident volume trends by top sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                incidents: { label: "Total Incidents", color: "#3b82f6" },
                uniqueSites: { label: "Unique Sites", color: "#10b981" }
              }}>
                <LineChart data={siteTrendData} height={300} width={undefined} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <CartesianGrid stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value: string) => {
                      const [year, month] = value.split('-');
                      const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      return `${names[parseInt(month) - 1]} ${year}`;
                    }}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="incidents" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uniqueSites" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ChartContainer>
              <div className="mt-4 flex justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Incidents</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Unique Sites</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Site Performance Trend */}
          <Card className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-gray-900 dark:text-gray-100">
                <TrackChangesIcon className="w-5 h-5 text-green-600" />
                Site Performance Trend
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Average resolution time trends by top sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{
                avgDuration: { label: "Average Duration", color: "#f59e0b" },
                resolutionRate: { label: "Resolution Rate", color: "#ef4444" }
              }}>
                <LineChart data={sitePerformanceData} height={300} width={undefined} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                  <CartesianGrid stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value: string) => {
                      const [year, month] = value.split('-');
                      const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      return `${names[parseInt(month) - 1]} ${year}`;
                    }}
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(v: number) => formatDurationHMS(v)}
                  />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value: number) => formatDurationHMS(value)} />} />
                  <Line 
                    type="monotone" 
                    dataKey="avgDuration" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolutionRate" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                  />
                </LineChart>
              </ChartContainer>
              <div className="mt-4 flex justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Resolution Rate</span>
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
