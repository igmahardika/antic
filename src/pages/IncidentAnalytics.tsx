import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Incident } from '@/types/incident';
import { db } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

// NCAL Color mapping
const NCAL_COLORS = {
  'Blue': '#3B82F6',
  'Yellow': '#F59E0B', 
  'Orange': '#F97316',
  'Red': '#EF4444',
  'Black': '#1F2937'
};

const NCAL_ORDER = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];

export const IncidentAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('6months'); // 3months, 6months, 1year, all

  // Get all incidents for live updates
  const allIncidents = useLiveQuery(() => 
    db.incidents.toArray()
  );

  // Filter incidents based on selected period
  const filteredIncidents = useMemo(() => {
    if (!allIncidents) return [];
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (selectedPeriod) {
      case '3months':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6months':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '1year':
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
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
        byMonth: {},
        avgDurationByNCAL: {},
        totalDurationByNCAL: {}
      };
    }

    const total = filteredIncidents.length;
    const open = filteredIncidents.filter(i => i.status?.toLowerCase() !== 'done').length;
    const closed = total - open;
    
    // Calculate MTTR (Mean Time To Resolution)
    const resolvedIncidents = filteredIncidents.filter(i => i.durationMin && i.durationMin > 0);
    const mttrMin = resolvedIncidents.length > 0 
      ? Math.round(resolvedIncidents.reduce((sum, i) => sum + (i.durationMin || 0), 0) / resolvedIncidents.length)
      : 0;

    // Calculate average vendor duration
    const vendorIncidents = filteredIncidents.filter(i => i.durationVendorMin && i.durationVendorMin > 0);
    const avgVendorMin = vendorIncidents.length > 0
      ? Math.round(vendorIncidents.reduce((sum, i) => sum + (i.durationVendorMin || 0), 0) / vendorIncidents.length)
      : 0;

    // Calculate pause ratio
    const totalDuration = filteredIncidents.reduce((sum, i) => sum + (i.durationMin || 0), 0);
    const totalPause = filteredIncidents.reduce((sum, i) => sum + (i.totalDurationPauseMin || 0), 0);
    const pauseRatio = totalDuration > 0 ? totalPause / totalDuration : 0;

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
      const ncal = incident.ncal || 'Unknown';
      acc[ncal] = (acc[ncal] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average duration by NCAL
    const avgDurationByNCAL = filteredIncidents.reduce((acc, incident) => {
      const ncal = incident.ncal || 'Unknown';
      if (!acc[ncal]) {
        acc[ncal] = { total: 0, count: 0 };
      }
      if (incident.durationMin && incident.durationMin > 0) {
        acc[ncal].total += incident.durationMin;
        acc[ncal].count += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // Convert to average
    const avgDurationByNCALFinal: Record<string, number> = {};
    Object.keys(avgDurationByNCAL).forEach(ncal => {
      const data = avgDurationByNCAL[ncal];
      avgDurationByNCALFinal[ncal] = data.count > 0 ? Math.round(data.total / data.count) : 0;
    });

    // Calculate total duration by NCAL
    const totalDurationByNCAL = filteredIncidents.reduce((acc, incident) => {
      const ncal = incident.ncal || 'Unknown';
      acc[ncal] = (acc[ncal] || 0) + (incident.durationMin || 0);
      return acc;
    }, {} as Record<string, number>);

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
        avgDurationByNCAL: avgDurationByNCALFinal,
        totalDurationByNCAL
      };
  }, [filteredIncidents]);

  // Generate monthly data for NCAL charts
  const monthlyNCALData = useMemo(() => {
    if (!filteredIncidents) return [];

    const monthlyData: Record<string, Record<string, number>> = {};
    const monthlyDurationData: Record<string, Record<string, { total: number; count: number }>> = {};

    filteredIncidents.forEach(incident => {
      if (!incident.startTime) return;
      
      const date = new Date(incident.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const ncal = incident.ncal || 'Unknown';
      
      // Count incidents by NCAL per month
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      monthlyData[monthKey][ncal] = (monthlyData[monthKey][ncal] || 0) + 1;
      
      // Calculate average duration by NCAL per month
      if (!monthlyDurationData[monthKey]) {
        monthlyDurationData[monthKey] = {};
      }
      if (!monthlyDurationData[monthKey][ncal]) {
        monthlyDurationData[monthKey][ncal] = { total: 0, count: 0 };
      }
      if (incident.durationMin && incident.durationMin > 0) {
        monthlyDurationData[monthKey][ncal].total += incident.durationMin;
        monthlyDurationData[monthKey][ncal].count += 1;
      }
    });

    // Convert to chart format
    const sortedMonths = Object.keys(monthlyData).sort();
    
    return sortedMonths.map(monthKey => {
      const [year, month] = monthKey.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      const data: any = { month: monthName, monthKey };
      
      // Add NCAL counts
      NCAL_ORDER.forEach(ncal => {
        data[`${ncal}_count`] = monthlyData[monthKey]?.[ncal] || 0;
      });
      
      // Add NCAL average durations
      NCAL_ORDER.forEach(ncal => {
        const durationData = monthlyDurationData[monthKey]?.[ncal];
        data[`${ncal}_avg_duration`] = durationData && durationData.count > 0 
          ? Math.round(durationData.total / durationData.count) 
          : 0;
      });
      
      return data;
    });
  }, [filteredIncidents]);

  useEffect(() => {
    setIsLoading(false);
  }, [allIncidents]);

  const formatDurationHMS = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDurationHours = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '0';
    return (minutes / 60).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!allIncidents || allIncidents.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8 text-gray-500">
          No incident data available for analytics
        </div>
      </div>
    );
  }

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
  })).filter(item => item.value > 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Incident Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive analytics and insights from incident data
          </p>
        </div>
        
        {/* Period Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last 1 Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod === 'all' ? 'All time' : `Last ${selectedPeriod}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Incidents</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.open / stats.total) * 100).toFixed(1)}% of total` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MTTR</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDurationHMS(stats.mttrMin)}</div>
            <p className="text-xs text-muted-foreground">
              Mean Time To Resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.closed} of {stats.total} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* NCAL Area Charts - Main Feature */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NCAL Count by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AreaChartIcon className="w-5 h-5" />
              NCAL Count by Month
            </CardTitle>
            <CardDescription>
              Number of incidents by NCAL level over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyNCALData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value, 
                    String(name).replace('_count', '').replace('_', ' ')
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                {NCAL_ORDER.map((ncal, index) => (
                  <Area
                    key={ncal}
                    type="monotone"
                    dataKey={`${ncal}_count`}
                    stackId="1"
                    stroke={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]}
                    fill={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]}
                    fillOpacity={0.8}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* NCAL Average Duration by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AreaChartIcon className="w-5 h-5" />
              NCAL Avg Duration by Month
            </CardTitle>
            <CardDescription>
              Average resolution time by NCAL level over time (hours)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyNCALData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    formatDurationHours(Number(value)), 
                    String(name).replace('_avg_duration', '').replace('_', ' ')
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                {NCAL_ORDER.map((ncal, index) => (
                  <Area
                    key={ncal}
                    type="monotone"
                    dataKey={`${ncal}_avg_duration`}
                    stroke={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]}
                    fill={NCAL_COLORS[ncal as keyof typeof NCAL_COLORS]}
                    fillOpacity={0.3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NCAL Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
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
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ncalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Priority Distribution
            </CardTitle>
            <CardDescription>Distribution of incidents by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sites */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Sites</CardTitle>
            <CardDescription>Most affected sites by incident count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={siteData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Klasifikasi Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Klasifikasi Gangguan</CardTitle>
            <CardDescription>Distribution of incidents by classification</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={klasifikasiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* NCAL Performance Metrics */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>NCAL Performance Analysis</CardTitle>
            <CardDescription>Detailed metrics by NCAL level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {NCAL_ORDER.map(ncal => {
                const count = stats.byNCAL[ncal] || 0;
                const avgDuration = stats.avgDurationByNCAL[ncal] || 0;
                const totalDuration = stats.totalDurationByNCAL[ncal] || 0;
                const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0';
                
                return (
                  <div 
                    key={ncal}
                    className="p-4 rounded-lg border"
                    style={{ borderLeftColor: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS], borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: NCAL_COLORS[ncal as keyof typeof NCAL_COLORS] }}
                      />
                      <h3 className="font-semibold text-sm">{ncal}</h3>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {percentage}% of total
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Avg: {formatDurationHMS(avgDuration)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Total: {formatDurationHMS(totalDuration)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Performance</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Pause Ratio</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Data Period</CardTitle>
            <CardDescription>Current analysis period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {filteredIncidents.length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Incidents in selected period
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
