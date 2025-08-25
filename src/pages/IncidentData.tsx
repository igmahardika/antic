import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Incident, IncidentFilter } from '@/types/incident';
import { queryIncidents, cleanDuplicateIncidents, getDatabaseStats } from '@/utils/incidentUtils';
import { IncidentUpload } from '@/components/IncidentUpload';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import SummaryCard from '@/components/ui/SummaryCard';
import PageWrapper from '@/components/PageWrapper';
import { 
  Search, 
  Filter, 
  Download, 
  Upload,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  Database
} from 'lucide-react';

export const IncidentData: React.FC = () => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<IncidentFilter>({
    page: 1,
    limit: 50
  });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [dbStats, setDbStats] = useState<any>(null);

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
      default: return ncal.trim(); // Return original if not recognized
    }
  };

  // Helper function to get NCAL count with case-insensitive lookup
  const getNCALCount = (ncalCounts: Record<string, number>, targetNCAL: string): number => {
    const normalizedTarget = normalizeNCAL(targetNCAL);
    return ncalCounts[normalizedTarget] || 0;
  };

  // Get unique values for filter options
  const allIncidents = useLiveQuery(() => 
    db.incidents.toArray()
  );

  // Debug: Log when allIncidents changes
  React.useEffect(() => {
    console.log('AllIncidents updated:', allIncidents?.length || 0);
    if (allIncidents && allIncidents.length > 0) {
      console.log('Sample incident:', allIncidents[0]);
      console.log('NCAL values in data:', [...new Set(allIncidents.map(i => i.ncal))]);
    }
  }, [allIncidents]);

  // Calculate summary data for ALL uploaded data (not filtered)
  const allDataSummary = React.useMemo(() => {
    if (!allIncidents) return { total: 0, open: 0, closed: 0, avgDuration: 0, ncalCounts: {} };
    
    const total = allIncidents.length;
    const open = allIncidents.filter(i => i.status?.toLowerCase() !== 'done').length;
    const closed = allIncidents.filter(i => i.status?.toLowerCase() === 'done').length;
    const incidentsWithDuration = allIncidents.filter(i => i.durationMin && i.durationMin > 0);
    const avgDuration = incidentsWithDuration.length > 0 
      ? Math.round(incidentsWithDuration.reduce((sum, i) => sum + (i.durationMin || 0), 0) / incidentsWithDuration.length)
      : 0;

    // Calculate NCAL distribution with normalized values
    const ncalCounts = allIncidents.reduce((acc, incident) => {
      const normalizedNcal = normalizeNCAL(incident.ncal);
      acc[normalizedNcal] = (acc[normalizedNcal] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Debug: Log NCAL counts
    console.log('NCAL Counts:', ncalCounts);
    console.log('All Incidents Count:', allIncidents.length);
    console.log('Sample NCAL values:', allIncidents.slice(0, 5).map(i => i.ncal));

    return { total, open, closed, avgDuration, ncalCounts };
  }, [allIncidents]);

  // Calculate summary data for filtered data (for comparison)
  const filteredDataSummary = React.useMemo(() => {
    if (!incidents) return { total: 0, open: 0, closed: 0, avgDuration: 0 };
    
    const total = incidents.length;
    const open = incidents.filter(i => i.status?.toLowerCase() !== 'done').length;
    const closed = incidents.filter(i => i.status?.toLowerCase() === 'done').length;
    const incidentsWithDuration = incidents.filter(i => i.durationMin && i.durationMin > 0);
    const avgDuration = incidentsWithDuration.length > 0 
      ? Math.round(incidentsWithDuration.reduce((sum, i) => sum + (i.durationMin || 0), 0) / incidentsWithDuration.length)
      : 0;

    return { total, open, closed, avgDuration };
  }, [incidents]);

  // Get available months from data based on startTime column
  const availableMonths = React.useMemo(() => {
    if (!allIncidents) return [];
    
    const months = new Set<string>();
    allIncidents.forEach(incident => {
      // Use startTime column from Excel data
      if (incident.startTime) {
        try {
          const date = new Date(incident.startTime);
          // Validate that the date is valid
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(monthKey);
          }
        } catch (error) {
          console.warn('Invalid startTime format:', incident.startTime, 'for incident:', incident.noCase);
        }
      }
    });
    
    return Array.from(months).sort().reverse();
  }, [allIncidents]);

  const uniquePriorities = [...new Set(allIncidents?.map(i => i.priority).filter(Boolean) || [])];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const result = await queryIncidents(filter);
        setIncidents(result.rows);
        setTotal(result.total);
        
        // Load database stats for debugging
        const stats = await getDatabaseStats();
        setDbStats(stats);
        console.log('[IncidentData] Database stats:', stats);
      } catch (error) {
        console.error('Error loading incidents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [filter]);

  const handleFilterChange = (key: keyof IncidentFilter, value: any) => {
    setFilter(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filter changes
    }));
  };

  const handleRefreshFilters = () => {
    // Reset all filters to default values
    setFilter({
      page: 1,
      limit: 50
    });
    setSelectedMonth('');
    
    // Show toast notification
    toast({
      title: "Filters Reset",
      description: "All filters have been cleared and data refreshed.",
      duration: 2000,
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilter(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
  };

  const handleMonthChange = (monthKey: string) => {
    setSelectedMonth(monthKey);
    if (monthKey) {
      const [year, month] = monthKey.split('-');
      // Create date range for the selected month
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      setFilter(prev => ({
        ...prev,
        dateFrom: startDate.toISOString(),
        dateTo: endDate.toISOString(),
        page: 1
      }));
    } else {
      setFilter(prev => ({
        ...prev,
        dateFrom: undefined,
        dateTo: undefined,
        page: 1
      }));
    }
  };

  const exportToCSV = () => {
    if (incidents.length === 0) return;

    const headers = [
      'No Case', 'Priority', 'Site', 'NCAL', 'Status', 'Level', 'TS', 'ODP/BTS',
      'Start Time', 'Start Escalation Vendor', 'End Time', 'Duration', 'Duration Vendor',
      'Problem', 'Penyebab', 'Action Terakhir', 'Note', 'Klasifikasi Gangguan',
      'Power Before', 'Power After', 'Start Pause 1', 'End Pause 1', 'Start Pause 2', 'End Pause 2',
      'Total Duration Pause', 'Total Duration Vendor', 'Net Duration'
    ];

    const data = incidents.map(incident => [
      incident.noCase,
      incident.priority,
      incident.site,
      incident.ncal,
      incident.status,
      incident.level,
      incident.ts,
      incident.odpBts,
      incident.startTime,
      incident.startEscalationVendor,
      incident.endTime,
      incident.durationMin,
      incident.durationVendorMin,
      incident.problem,
      incident.penyebab,
      incident.actionTerakhir,
      incident.note,
      incident.klasifikasiGangguan,
      incident.powerBefore,
      incident.powerAfter,
      incident.startPause1,
      incident.endPause1,
      incident.startPause2,
      incident.endPause2,
      incident.totalDurationPauseMin,
      incident.totalDurationVendorMin,
      incident.netDurationMin
    ]);

    const csvContent = [headers, ...data].map(row => 
      row.map(cell => `"${cell || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetData = async () => {
    try {
      await db.incidents.clear();
      setShowResetConfirm(false);
      // Refresh data
      const result = await queryIncidents(filter);
      setIncidents(result.rows);
      setTotal(result.total);
      
      toast({
        title: "Data Reset Successfully",
        description: "All incident data has been deleted from the database.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Error",
        description: "Failed to reset data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cleanupDuplicates = async () => {
    try {
      const result = await cleanDuplicateIncidents();
      setShowCleanupConfirm(false);
      
      // Refresh data
      const queryResult = await queryIncidents(filter);
      setIncidents(queryResult.rows);
      setTotal(queryResult.total);
      
      toast({
        title: "Duplicate Cleanup Complete",
        description: `Removed ${result.removed} duplicate incidents. ${result.remaining} incidents remaining.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to clean duplicates. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes || minutes === 0) return '-';
    const totalSeconds = Math.floor(minutes * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Definisi kolom untuk tabel incident
  const columns: Array<{
    key: keyof Incident;
    label: string;
    render?: (value: any) => React.ReactNode;
  }> = [
    { key: 'noCase', label: 'No Case' },
    { key: 'priority', label: 'Priority', render: (v: string) => v ? <Badge variant={getPriorityBadgeVariant(v)}>{v}</Badge> : '-' },
    { key: 'site', label: 'Site' },
    { key: 'ncal', label: 'NCAL', render: (v: string) => v ? <Badge variant={getNCALBadgeVariant(v)}>{v}</Badge> : '-' },
    { key: 'status', label: 'Status', render: (v: string) => v ? <Badge variant={getStatusBadgeVariant(v)}>{v}</Badge> : '-' },
    { key: 'level', label: 'Level' },
    { key: 'ts', label: 'TS' },
    { key: 'odpBts', label: 'ODP/BTS' },
    { key: 'startTime', label: 'Start Time', render: (v: string) => formatDate(v) },
    { key: 'startEscalationVendor', label: 'Start Escalation Vendor', render: (v: string) => formatDate(v) },
    { key: 'endTime', label: 'End Time', render: (v: string) => formatDate(v) },
    { key: 'durationMin', label: 'Duration', render: (v: number) => formatDuration(v) },
    { key: 'durationVendorMin', label: 'Duration Vendor', render: (v: number) => formatDuration(v) },
    { key: 'problem', label: 'Problem' },
    { key: 'penyebab', label: 'Penyebab' },
    { key: 'actionTerakhir', label: 'Action Terakhir' },
    { key: 'note', label: 'Note' },
    { key: 'klasifikasiGangguan', label: 'Klasifikasi Gangguan' },
    { key: 'powerBefore', label: 'Power Before (dBm)' },
    { key: 'powerAfter', label: 'Power After (dBm)' },
    { key: 'startPause1', label: 'Start Pause 1', render: (v: string) => formatDate(v) },
    { key: 'endPause1', label: 'End Pause 1', render: (v: string) => formatDate(v) },
    { key: 'startPause2', label: 'Start Pause 2', render: (v: string) => formatDate(v) },
    { key: 'endPause2', label: 'End Pause 2', render: (v: string) => formatDate(v) },
    { key: 'totalDurationPauseMin', label: 'Total Duration Pause', render: (v: number) => formatDuration(v) },
    { key: 'totalDurationVendorMin', label: 'Total Duration Vendor', render: (v: number) => formatDuration(v) },
    { key: 'netDurationMin', label: 'Net Duration', render: (v: number) => formatDuration(v) },
  ];

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID');
  };

  const getStatusBadgeVariant = (status: string | null | undefined) => {
    if (!status || typeof status !== 'string') return 'secondary';
    const s = status.toLowerCase();
    if (s === 'done') return 'success';
    if (s === 'open') return 'warning';
    if (s === 'escalated') return 'danger';
    return 'default';
  };

  const getPriorityBadgeVariant = (priority: string | null | undefined) => {
    if (!priority || typeof priority !== 'string') return 'secondary';
    const p = priority.toLowerCase();
    if (p === 'high') return 'danger';
    if (p === 'medium') return 'warning';
    if (p === 'low') return 'success';
    return 'default';
  };

  const getNCALBadgeVariant = (ncal: string | null | undefined) => {
    if (!ncal || typeof ncal !== 'string') return 'secondary';
    const n = ncal.toLowerCase();
    if (n === 'black') return 'danger';
    if (n === 'red') return 'danger';
    if (n === 'orange') return 'warning';
    if (n === 'yellow') return 'warning';
    if (n === 'blue') return 'info';
    return 'secondary';
  };

  const totalPages = Math.max(1, Math.ceil(total / (filter.limit || 50)));

  return (
    <PageWrapper>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100">Incident Data</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and view incident data with filtering and search capabilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowUpload(!showUpload)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload Data
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {dbStats && dbStats.duplicateGroups > 0 && (
            <Button 
              onClick={() => setShowCleanupConfirm(true)} 
              variant="outline"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Clean Duplicates ({dbStats.duplicateGroups})
            </Button>
          )}
          <Button 
            onClick={() => setShowResetConfirm(true)} 
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reset Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          title="Total Incidents"
          value={allDataSummary.total}
          description="All uploaded data"
          icon={<AlertTriangle className="h-4 w-4" />}
          iconBg="bg-blue-500"
        />
        <SummaryCard
          title="Open Incidents"
          value={allDataSummary.open}
          description="Pending resolution"
          icon={<Clock className="h-4 w-4" />}
          iconBg="bg-yellow-500"
        />
        <SummaryCard
          title="Closed Incidents"
          value={allDataSummary.closed}
          description="Resolved incidents"
          icon={<CheckCircle className="h-4 w-4" />}
          iconBg="bg-green-500"
        />
        <SummaryCard
          title="Avg Duration"
          value={formatDuration(allDataSummary.avgDuration)}
          description="Minutes per incident"
          icon={<XCircle className="h-4 w-4" />}
          iconBg="bg-red-500"
        />
        <SummaryCard
          title="Total NCAL"
          value={Object.keys(allDataSummary.ncalCounts).length}
          description="NCAL categories found"
          icon={<Filter className="h-4 w-4" />}
          iconBg="bg-purple-500"
        />
      </div>

      {/* NCAL Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <SummaryCard
          title="BLUE NCAL"
          value={getNCALCount(allDataSummary.ncalCounts, 'Blue')}
          description={`${allDataSummary.total > 0 ? ((getNCALCount(allDataSummary.ncalCounts, 'Blue') / allDataSummary.total) * 100).toFixed(1) : 0}% of total`}
          icon={<div className="w-4 h-4 bg-blue-500 rounded"></div>}
          iconBg="bg-blue-500"
        />
        <SummaryCard
          title="YELLOW NCAL"
          value={getNCALCount(allDataSummary.ncalCounts, 'Yellow')}
          description={`${allDataSummary.total > 0 ? ((getNCALCount(allDataSummary.ncalCounts, 'Yellow') / allDataSummary.total) * 100).toFixed(1) : 0}% of total`}
          icon={<div className="w-4 h-4 bg-yellow-500 rounded"></div>}
          iconBg="bg-yellow-500"
        />
        <SummaryCard
          title="ORANGE NCAL"
          value={getNCALCount(allDataSummary.ncalCounts, 'Orange')}
          description={`${allDataSummary.total > 0 ? ((getNCALCount(allDataSummary.ncalCounts, 'Orange') / allDataSummary.total) * 100).toFixed(1) : 0}% of total`}
          icon={<div className="w-4 h-4 bg-orange-500 rounded"></div>}
          iconBg="bg-orange-500"
        />
        <SummaryCard
          title="RED NCAL"
          value={getNCALCount(allDataSummary.ncalCounts, 'Red')}
          description={`${allDataSummary.total > 0 ? ((getNCALCount(allDataSummary.ncalCounts, 'Red') / allDataSummary.total) * 100).toFixed(1) : 0}% of total`}
          icon={<div className="w-4 h-4 bg-red-500 rounded"></div>}
          iconBg="bg-red-500"
        />
        <SummaryCard
          title="BLACK NCAL"
          value={getNCALCount(allDataSummary.ncalCounts, 'Black')}
          description={`${allDataSummary.total > 0 ? ((getNCALCount(allDataSummary.ncalCounts, 'Black') / allDataSummary.total) * 100).toFixed(1) : 0}% of total`}
          icon={<div className="w-4 h-4 bg-gray-900 rounded"></div>}
          iconBg="bg-gray-900"
        />
      </div>

      {/* Database Status Information */}
      {dbStats && (
        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Database Status</span>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <div>• Total incidents in database: <strong>{dbStats.totalIncidents}</strong></div>
            <div>• Unique No Cases: <strong>{dbStats.uniqueNoCases}</strong></div>
            <div>• Unique Start Times: <strong>{dbStats.uniqueStartTimes}</strong></div>
            {dbStats.duplicateGroups > 0 && (
              <div className="text-yellow-600 dark:text-yellow-400">
                ⚠️ <strong>{dbStats.duplicateGroups} duplicate groups</strong> detected. Consider cleaning duplicates.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Status Information */}
      {filter.dateFrom || filter.status || filter.priority || filter.site || filter.search ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Active Filters</span>
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            Showing {filteredDataSummary.total} of {allDataSummary.total} incidents
            {filter.dateFrom && (
              <span className="ml-2">
                • Date range: {new Date(filter.dateFrom).toLocaleDateString()} - {filter.dateTo ? new Date(filter.dateTo).toLocaleDateString() : 'Now'}
              </span>
            )}
            {filter.status && <span className="ml-2">• Status: {filter.status}</span>}
            {filter.priority && <span className="ml-2">• Priority: {filter.priority}</span>}
            {filter.site && <span className="ml-2">• Site: {filter.site}</span>}
            {filter.search && <span className="ml-2">• Search: "{filter.search}"</span>}
          </div>
        </div>
      ) : null}





      {showUpload && (
        <IncidentUpload />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Reset Incident Data
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete all incident data? This will permanently remove all uploaded incidents from the database.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                onClick={() => setShowResetConfirm(false)} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={resetData} 
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Duplicates Confirmation Modal */}
      {showCleanupConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Clean Duplicate Incidents
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Remove duplicate entries from database
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              This will remove duplicate incidents based on No Case and Start Time. Only the first occurrence of each duplicate will be kept. This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                onClick={() => setShowCleanupConfirm(false)} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={cleanupDuplicates} 
                variant="outline"
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Clean Duplicates
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>
            
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search No Case, Site, Problem..."
                  value={filter.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            <select 
              value={selectedMonth} 
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm h-9"
            >
              <option value="">All Months</option>
              {availableMonths.map(monthKey => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>

            <select 
              value={filter.ncal || ''} 
              onChange={(e) => handleFilterChange('ncal', e.target.value || undefined)}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm h-9"
            >
              <option value="">All NCAL</option>
              <option value="Blue">Blue</option>
              <option value="Yellow">Yellow</option>
              <option value="Orange">Orange</option>
              <option value="Red">Red</option>
              <option value="Black">Black</option>
            </select>

            <select 
              value={filter.priority || ''} 
              onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm h-9"
            >
              <option value="">All Priority</option>
              {uniquePriorities.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>

            <Button
              onClick={handleRefreshFilters}
              variant="outline"
              size="sm"
              className="h-9 px-3 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
          
          {/* Active Filters Display */}
          {(filter.search || selectedMonth || filter.ncal || filter.priority) && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">Active filters:</span>
                {filter.search && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    Search: {filter.search}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-blue-900 dark:hover:text-blue-100" 
                      onClick={() => handleFilterChange('search', '')}
                    />
                  </span>
                )}
                {selectedMonth && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                    Month: {formatMonthLabel(selectedMonth)}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-green-900 dark:hover:text-green-100" 
                      onClick={() => handleMonthChange('')}
                    />
                  </span>
                )}
                {filter.ncal && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                    NCAL: {filter.ncal}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-purple-900 dark:hover:text-purple-100" 
                      onClick={() => handleFilterChange('ncal', undefined)}
                    />
                  </span>
                )}
                {filter.priority && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full">
                    Priority: {filter.priority}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-orange-900 dark:hover:text-orange-100" 
                      onClick={() => handleFilterChange('priority', undefined)}
                    />
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMonth && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            📅 Showing data for: <span className="font-medium">{formatMonthLabel(selectedMonth)}</span>
          </div>
        </div>
      )}
      
      {availableMonths.length === 0 && allIncidents && allIncidents.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            ⚠️ No valid months found in data. Please check that the "Start" column contains valid dates.
          </div>
        </div>
      )}

      {showUpload && (
        <IncidentUpload />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Reset Incident Data
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete all incident data? This will permanently remove all uploaded incidents from the database.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                onClick={() => setShowResetConfirm(false)} 
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={resetData} 
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Data
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Incident Data
          </CardTitle>
          <CardDescription>
            Showing {incidents.length} of {total} incidents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {columns.map(col => (
                        <th key={col.key} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {incidents.length === 0 ? (
                      <tr><td colSpan={columns.length} className="text-center py-8 text-gray-400">No data found</td></tr>
                    ) : (
                      incidents.map((incident, i) => (
                        <tr key={incident.id} className={
                          i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                        }>
                          {columns.map(col => (
                            <td key={col.key} className="px-5 py-3 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200 align-top">
                              {col.render ? col.render(incident[col.key as keyof Incident]) : incident[col.key as keyof Incident] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {incidents.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500">
                  No incidents found matching your criteria
                </div>
              )}

              {/* Pagination */}
              <div className="py-5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Page Size:</span>
                  <select 
                    value={filter.limit || 50} 
                    onChange={(e) => handleFilterChange('limit', Number(e.target.value))}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handlePageChange(1)} 
                    disabled={filter.page === 1} 
                    className="text-gray-400 hover:text-blue-600 p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50 dark:text-gray-500 dark:hover:text-blue-400"
                  >
                    «
                  </button>
                  <button 
                    onClick={() => handlePageChange((filter.page || 1) - 1)} 
                    disabled={filter.page === 1} 
                    className="text-gray-400 hover:text-blue-600 p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50 dark:text-gray-500 dark:hover:text-blue-400"
                  >
                    ‹
                  </button>
                  <span className="w-10 h-10 bg-blue-600 text-white p-2 inline-flex items-center justify-center text-sm font-medium rounded-full dark:bg-blue-500">
                    {filter.page || 1}
                  </span>
                  <button 
                    onClick={() => handlePageChange((filter.page || 1) + 1)} 
                    disabled={(filter.page || 1) >= totalPages} 
                    className="text-gray-400 hover:text-blue-600 p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50 dark:text-gray-500 dark:hover:text-blue-400"
                  >
                    ›
                  </button>
                  <button 
                    onClick={() => handlePageChange(totalPages)} 
                    disabled={(filter.page || 1) >= totalPages} 
                    className="text-gray-400 hover:text-blue-600 p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50 dark:text-gray-500 dark:hover:text-blue-400"
                  >
                    »
                  </button>
                  <span className="text-sm">{`Page ${filter.page || 1} of ${totalPages}`}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </PageWrapper>
  );
};
