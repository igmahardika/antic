import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Incident, IncidentFilter } from '@/types/incident';
import { queryIncidents, cleanDuplicateIncidents, getDatabaseStats, validateAndRepairDatabase, calculateIncidentStats, filterIncidents, paginateIncidents } from '@/utils/incidentUtils';
import { IncidentUpload } from '@/components/IncidentUpload';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import SummaryCard from '@/components/ui/SummaryCard';
import PageWrapper from '@/components/PageWrapper';
import PageHeader from '@/components/ui/PageHeader';
import { CardHeaderTitle, CardHeaderDescription } from '@/components/ui/CardTypography';
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
  Database,
  Calculator
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
  const [isRecalculating, setIsRecalculating] = useState(false);

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

  // Get unique values for filter options with error handling
  const allIncidents = useLiveQuery(async () => {
    try {
      const incidents = await db.incidents.toArray();
      console.log('✅ IncidentData: Successfully loaded', incidents.length, 'incidents from database');
      return incidents;
    } catch (error) {
      console.error('❌ IncidentData: Failed to load incidents from database:', error);
      return [];
    }
  });

  // Debug: Log when allIncidents changes
  React.useEffect(() => {
    console.log('AllIncidents updated:', allIncidents?.length || 0);
    if (allIncidents && allIncidents.length > 0) {
      console.log('Sample incident:', allIncidents[0]);
      console.log('NCAL values in data:', [...new Set(allIncidents.map(i => i.ncal))]);
    }
  }, [allIncidents]);

  // Calculate summary data for ALL uploaded data (not filtered) - menggunakan fungsi yang tidak bergantung pada IndexedDB
  const allDataSummary = React.useMemo(() => {
    if (!allIncidents) return { total: 0, open: 0, closed: 0, avgDuration: 0, avgNetDuration: 0, ncalCounts: {} };
    
    return calculateIncidentStats(allIncidents);
  }, [allIncidents]);

  // Calculate summary data for filtered data (for comparison) - menggunakan fungsi yang tidak bergantung pada IndexedDB
  const filteredDataSummary = React.useMemo(() => {
    if (!incidents) return { total: 0, open: 0, closed: 0, avgDuration: 0, avgNetDuration: 0 };
    
    return calculateIncidentStats(incidents);
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
        // Gunakan fungsi yang tidak bergantung pada IndexedDB
        if (allIncidents) {
          const filtered = filterIncidents(allIncidents, filter);
          const result = paginateIncidents(filtered, filter.page, filter.limit);
          setIncidents(result.rows);
          setTotal(result.total);
        } else {
          setIncidents([]);
          setTotal(0);
        }
        
        // Load database stats for debugging
        const stats = await getDatabaseStats();
        setDbStats(stats);
        console.log('[IncidentData] Database stats:', stats);
      } catch (error) {
        console.error('Error loading incidents:', error);
        setIncidents([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [filter, allIncidents]);

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

  // Function to recalculate all durations
  const handleRecalculateDurations = async () => {
    if (!allIncidents || allIncidents.length === 0) {
      toast({
        title: "No Data",
        description: "No incidents found to recalculate.",
        duration: 3000,
      });
      return;
    }

    setIsRecalculating(true);
    
    try {
      console.log('🔄 Starting duration recalculation for', allIncidents.length, 'incidents...');
      
      // Helper function untuk menghitung durasi
      const calculateDuration = (startTime: string | null, endTime: string | null): number => {
        if (!startTime || !endTime) return 0;
        try {
          const start = new Date(startTime);
          const end = new Date(endTime);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
          const diffMs = end.getTime() - start.getTime();
          const diffMinutes = diffMs / (1000 * 60);
          return Math.max(0, diffMinutes);
        } catch (error) {
          console.warn('Error calculating duration:', error);
          return 0;
        }
      };

      const incidentsToUpdate = [];
      let recalculatedCount = 0;
      let problematicCount = 0;

      allIncidents.forEach((incident) => {
        const updatedIncident = { ...incident };
        let needsUpdate = false;

        // 1. Recalculate Duration (Start → End)
        if (incident.startTime && incident.endTime) {
          const calculatedDuration = calculateDuration(incident.startTime, incident.endTime);
          if (calculatedDuration > 0) {
            updatedIncident.durationMin = Math.round(calculatedDuration * 100) / 100;
            needsUpdate = true;
            recalculatedCount++;
          } else {
            updatedIncident.durationMin = 0;
            needsUpdate = true;
            problematicCount++;
          }
        } else {
          updatedIncident.durationMin = 0;
          needsUpdate = true;
          problematicCount++;
        }

        // 2. Recalculate Duration Vendor (Start Escalation Vendor → End)
        if (incident.startEscalationVendor && incident.endTime) {
          const calculatedVendorDuration = calculateDuration(incident.startEscalationVendor, incident.endTime);
          if (calculatedVendorDuration > 0) {
            updatedIncident.durationVendorMin = Math.round(calculatedVendorDuration * 100) / 100;
            needsUpdate = true;
          } else {
            updatedIncident.durationVendorMin = 0;
            needsUpdate = true;
          }
        } else {
          updatedIncident.durationVendorMin = 0;
          needsUpdate = true;
        }

        // 3. Recalculate Total Duration Pause (Pause 1 + Pause 2)
        let totalPauseMinutes = 0;
        if (incident.startPause1 && incident.endPause1) {
          const pause1Duration = calculateDuration(incident.startPause1, incident.endPause1);
          if (pause1Duration > 0) {
            totalPauseMinutes += pause1Duration;
          }
        }
        if (incident.startPause2 && incident.endPause2) {
          const pause2Duration = calculateDuration(incident.startPause2, incident.endPause2);
          if (pause2Duration > 0) {
            totalPauseMinutes += pause2Duration;
          }
        }
        updatedIncident.totalDurationPauseMin = Math.round(totalPauseMinutes * 100) / 100;
        needsUpdate = true;

        // 4. Recalculate Total Duration Vendor (Duration Vendor - Total Duration Pause)
        const totalVendorDuration = Math.max(updatedIncident.durationVendorMin - updatedIncident.totalDurationPauseMin, 0);
        updatedIncident.totalDurationVendorMin = Math.round(totalVendorDuration * 100) / 100;
        needsUpdate = true;



        if (needsUpdate) {
          incidentsToUpdate.push(updatedIncident);
        }
      });

      // Update database
      if (incidentsToUpdate.length > 0) {
        console.log(`💾 Updating ${incidentsToUpdate.length} incidents...`);
        await db.incidents.bulkPut(incidentsToUpdate);
        console.log('✅ Database updated successfully!');
      }

      // Show success message
      toast({
        title: "Duration Recalculation Complete",
        description: `Successfully recalculated ${recalculatedCount} durations. ${problematicCount} incidents had issues.`,
        duration: 5000,
      });

      // Force refresh data
      window.location.reload();

    } catch (error) {
      console.error('❌ Error recalculating durations:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate durations. Please try again.",
        duration: 5000,
      });
    } finally {
      setIsRecalculating(false);
    }
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
      'Total Duration Pause', 'Total Duration Vendor'
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

  const validateDatabase = async () => {
    try {
      toast({
        title: "Validating Database",
        description: "Please wait while we validate and repair the database...",
      });
      
      const result = await validateAndRepairDatabase();
      
      // Refresh data
      const queryResult = await queryIncidents(filter);
      setIncidents(queryResult.rows);
      setTotal(queryResult.total);
      
      toast({
        title: "Database Validation Complete",
        description: `Total: ${result.totalIncidents}, Valid: ${result.validIncidents}, Invalid: ${result.invalidIncidents}, Repaired: ${result.repairedIncidents}`,
        variant: "default",
      });
      
      if (result.errors.length > 0) {
        console.error('Database validation errors:', result.errors);
        toast({
          title: "Validation Warnings",
          description: `${result.errors.length} errors found during validation. Check console for details.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating database:', error);
      toast({
        title: "Validation Failed",
        description: `Error: ${error}`,
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

  // Fungsi untuk menghitung durasi berdasarkan start dan end time
  const calculateDuration = (startTime: string | null, endTime: string | null): number => {
    if (!startTime || !endTime) return 0;
    
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
      }
      
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      return Math.max(0, diffMinutes);
    } catch (error) {
      console.warn('Error calculating duration:', error);
      return 0;
    }
  };

  // Fungsi untuk validasi durasi yang bermasalah
  const isProblematicDuration = (minutes: number): boolean => {
    const problematicDurations = [434, 814, 314]; // 07:14:19, 13:34:30, 05:14:28 dalam menit
    return problematicDurations.includes(Math.round(minutes));
  };

  // Fungsi untuk memformat tanggal dengan format DD/MM/YYYY HH:MM:SS
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.warn('Error formatting date:', error);
      return '-';
    }
  };

  // Definisi kolom untuk tabel incident dengan visual improvements
  const columns: Array<{
    key: keyof Incident;
    label: string;
    render?: (value: any) => React.ReactNode;
    width?: string;
  }> = [
    { key: 'noCase', label: 'No Case', width: 'w-24' },
    { 
      key: 'priority', 
      label: 'Priority', 
      width: 'w-20',
      render: (v: string) => v ? (
        <Badge variant={getPriorityBadgeVariant(v)} className="text-xs font-medium">
          {v.toUpperCase()}
        </Badge>
      ) : '-' 
    },
    { key: 'site', label: 'Site', width: 'w-32' },
    { 
      key: 'ncal', 
      label: 'NCAL', 
      width: 'w-20',
      render: (v: string) => v ? (
        <Badge variant={getNCALBadgeVariant(v)} className="text-xs font-medium">
          {v}
        </Badge>
      ) : '-' 
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: 'w-24',
      render: (v: string) => v ? (
        <div className="flex items-center gap-2">
          {getStatusIcon(v)}
          <Badge variant={getStatusBadgeVariant(v)} className="text-xs font-medium">
            {v}
          </Badge>
        </div>
      ) : '-' 
    },
    { key: 'level', label: 'Level', width: 'w-16' },
    { key: 'ts', label: 'TS', width: 'w-28' },
    { key: 'odpBts', label: 'ODP/BTS', width: 'w-24' },
    { 
      key: 'startTime', 
      label: 'Start Time', 
      width: 'w-32',
      render: (v: string) => (
        <div className="text-xs font-mono">
          {formatDate(v)}
        </div>
      ) 
    },
    { 
      key: 'startEscalationVendor', 
      label: 'Start Escalation Vendor', 
      width: 'w-32',
      render: (v: string) => (
        <div className="text-xs font-mono">
          {formatDate(v)}
        </div>
      ) 
    },
    { 
      key: 'endTime', 
      label: 'End Time', 
      width: 'w-32',
      render: (v: string) => (
        <div className="text-xs font-mono">
          {formatDate(v)}
        </div>
      ) 
    },
    { 
      key: 'durationMin', 
      label: 'Duration', 
      width: 'w-20'
      // Render akan dihandle di level tabel untuk perhitungan real-time
    },
    { 
      key: 'durationVendorMin', 
      label: 'Duration Vendor', 
      width: 'w-24'
      // Render akan dihandle di level tabel untuk perhitungan real-time
    },
    { key: 'problem', label: 'Problem', width: 'w-40' },
    { key: 'penyebab', label: 'Penyebab', width: 'w-40' },
    { key: 'actionTerakhir', label: 'Action Terakhir', width: 'w-40' },
    { key: 'note', label: 'Note', width: 'w-40' },
    { key: 'klasifikasiGangguan', label: 'Klasifikasi Gangguan', width: 'w-32' },
    { 
      key: 'powerBefore', 
      label: 'Power Before (dBm)', 
      width: 'w-24',
      render: (v: number) => v ? (
        <div className="text-xs font-mono text-orange-600 dark:text-orange-400">
          {v} dBm
        </div>
      ) : '-' 
    },
    { 
      key: 'powerAfter', 
      label: 'Power After (dBm)', 
      width: 'w-24',
      render: (v: number) => v ? (
        <div className="text-xs font-mono text-purple-600 dark:text-purple-400">
          {v} dBm
        </div>
      ) : '-' 
    },
    { 
      key: 'startPause1', 
      label: 'Start Pause 1', 
      width: 'w-32',
      render: (v: string) => (
        <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {formatDate(v)}
        </div>
      ) 
    },
    { 
      key: 'endPause1', 
      label: 'End Pause 1', 
      width: 'w-32',
      render: (v: string) => (
        <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {formatDate(v)}
        </div>
      ) 
    },
    { 
      key: 'startPause2', 
      label: 'Start Pause 2', 
      width: 'w-32',
      render: (v: string) => (
        <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {formatDate(v)}
        </div>
      ) 
    },
    { 
      key: 'endPause2', 
      label: 'End Pause 2', 
      width: 'w-32',
      render: (v: string) => (
        <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
          {formatDate(v)}
        </div>
      ) 
    },
    { 
      key: 'totalDurationPauseMin', 
      label: 'Total Duration Pause', 
      width: 'w-28',
      render: (v: number) => (
        <div className="text-xs font-mono font-medium text-red-600 dark:text-red-400">
          {formatDuration(v)}
        </div>
      ) 
    },
    { 
      key: 'totalDurationVendorMin', 
      label: 'Total Duration Vendor', 
      width: 'w-32',
      render: (v: number) => (
        <div className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400">
          {formatDuration(v)}
        </div>
      ) 
    },

  ];



  const getStatusBadgeVariant = (status: string | null | undefined) => {
    if (!status || typeof status !== 'string') return 'secondary';
    const s = status.toLowerCase();
    if (s === 'done') return 'success';
    if (s === 'open') return 'warning';
    if (s === 'escalated') return 'danger';
    if (s === 'closed') return 'success';
    if (s === 'pending') return 'warning';
    return 'default';
  };

  const getStatusIcon = (status: string | null | undefined) => {
    if (!status || typeof status !== 'string') return null;
    const s = status.toLowerCase();
    if (s === 'done' || s === 'closed') return <CheckCircle className="w-3 h-3" />;
    if (s === 'open' || s === 'pending') return <Clock className="w-3 h-3" />;
    if (s === 'escalated') return <AlertTriangle className="w-3 h-3" />;
    return null;
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
      <div className="space-y-6 lg:space-y-8">
        <PageHeader title="Incident Data" description="Upload and manage incident records" />
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-2">
            <Button onClick={() => setShowUpload(!showUpload)} variant="outline" className="px-2 py-1 text-xs h-7">
              <Upload className="w-2.5 h-2.5 mr-1" />
              Upload Data
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="px-2 py-1 text-xs h-7">
              <Download className="w-2.5 h-2.5 mr-1" />
              Export CSV
            </Button>
            {dbStats && dbStats.duplicateGroups > 0 && (
              <Button 
                onClick={() => setShowCleanupConfirm(true)} 
                variant="outline"
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 text-xs h-7"
              >
                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                Clean Duplicates ({dbStats.duplicateGroups})
              </Button>
            )}
            <Button
              onClick={validateDatabase}
              variant="outline"
              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 text-xs h-7"
            >
              <Database className="w-2.5 h-2.5 mr-1" />
              Validate Database
            </Button>
            <Button
              onClick={handleRecalculateDurations}
              disabled={isRecalculating}
              variant="outline"
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs h-7"
            >
              <Calculator className="w-2.5 h-2.5 mr-1" />
              {isRecalculating ? 'Recalculating...' : 'Recalculate Durations'}
            </Button>
            <Button 
              onClick={() => setShowResetConfirm(true)} 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs h-7"
            >
              <Trash2 className="w-2.5 h-2.5 mr-1" />
              Reset Data
            </Button>
          </div>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
                          title="Total Tickets"
          value={allDataSummary.total}
          description="All uploaded data"
          icon={<AlertTriangle className="h-4 w-4" />}
          iconBg="bg-blue-500"
        />
        <SummaryCard
                          title="Open Tickets"
          value={allDataSummary.open}
          description="Pending resolution"
          icon={<Clock className="h-4 w-4" />}
          iconBg="bg-yellow-500"
        />
        <SummaryCard
                          title="Closed Tickets"
          value={allDataSummary.closed}
                          description="Resolved tickets"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-card-foreground">Database Status</span>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <div>• Total incidents in database: <strong>{dbStats.totalIncidents}</strong></div>
            <div>• Unique No Cases: <strong>{dbStats.uniqueNoCases}</strong></div>
            <div>• Unique Start Times: <strong>{dbStats.uniqueStartTimes}</strong></div>
            {dbStats.duplicateGroups > 0 && (
              <div className="text-yellow-600 dark:text-yellow-400">
                <strong>{dbStats.duplicateGroups} duplicate groups</strong> detected. Consider cleaning duplicates.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Status Information */}
      {filter.dateFrom || filter.status || filter.priority || filter.site || filter.search ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
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
          <div className="bg-card text-card-foreground  rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-card-foreground">
                  Reset Incident Data
                </h3>
                <p className="text-sm text-muted-foreground">
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
          <div className="bg-card text-card-foreground  rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-card-foreground">
                  Clean Duplicate Incidents
                </h3>
                <p className="text-sm text-muted-foreground">
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
                              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>
            
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
              className="px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm h-9"
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
              className="px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm h-9"
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
              className="px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm h-9"
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
            <div className="mt-3 pt-3 border-t ">
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
            No valid months found in data. Please check that the "Start" column contains valid dates.
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card text-card-foreground  rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-card-foreground">
                  Reset Incident Data
                </h3>
                <p className="text-sm text-muted-foreground">
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
            <CardHeaderTitle className="text-base md:text-lg">Incident Data</CardHeaderTitle>
          </CardTitle>
          <CardHeaderDescription className="text-xs">
            Showing {incidents.length} of {total} incidents
          </CardHeaderDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                    <tr>
                      {columns.map(col => (
                        <th key={col.key} className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 dark:border-gray-600 last:border-r-0">
                          <div className="flex items-center gap-2">
                            <span>{col.label}</span>
                            {col.key === 'priority' && <span className="text-red-500">*</span>}
                            {col.key === 'status' && <span className="text-green-500">*</span>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <FileSpreadsheet className="w-6 h-6 text-gray-400" />
                            </div>
                            <span className="text-sm font-medium">No data found</span>
                            <span className="text-xs text-gray-400">Try adjusting your filters or upload new data</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      incidents.map((incident, i) => (
                        <tr key={incident.id} className={
                          i % 2 === 0 
                            ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150' 
                            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150'
                        }>
                          {columns.map(col => {
                            let displayValue: React.ReactNode;
                            
                            // Special handling for duration columns - SELALU gunakan perhitungan real-time
                            if (col.key === 'durationMin') {
                              // SELALU hitung durasi berdasarkan start dan end time yang sebenarnya
                              if (incident.startTime && incident.endTime) {
                                const calculatedDuration = calculateDuration(incident.startTime, incident.endTime);
                                
                                // Debug: Log untuk memastikan perhitungan berjalan
                                console.log(`🔍 Duration Debug for ${incident.noCase}:`, {
                                  startTime: incident.startTime,
                                  endTime: incident.endTime,
                                  calculatedDuration: calculatedDuration,
                                  formattedDuration: formatDuration(calculatedDuration),
                                  oldDurationMin: incident.durationMin
                                });
                                
                                // Validasi durasi - hanya tolak durasi yang bermasalah seperti 07:14:19, 13:34:30, 05:14:28
                                const isProblematic = isProblematicDuration(calculatedDuration);
                                
                                // Debug: Log detail validasi
                                console.log(`🔍 Duration Validation for ${incident.noCase}:`, {
                                  calculatedDuration,
                                  isProblematic,
                                  isValid: calculatedDuration > 0 && !isProblematic,
                                  reason: calculatedDuration <= 0 ? 'Zero/Negative' : 
                                          isProblematic ? 'Problematic Data' : 'Valid'
                                });
                                
                                if (calculatedDuration > 0 && !isProblematic) {
                                  displayValue = (
                                    <div className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400">
                                      {formatDuration(calculatedDuration)}
                                    </div>
                                  );
                                } else {
                                  let invalidReason = 'Invalid';
                                  if (calculatedDuration <= 0) {
                                    invalidReason = 'Zero/Neg';
                                  } else if (isProblematic) {
                                    invalidReason = 'Invalid Data';
                                  }
                                  
                                  displayValue = (
                                    <div className="text-xs font-mono font-medium text-red-500 dark:text-red-400" 
                                         title={`Duration: ${calculatedDuration} minutes. Reason: ${invalidReason}`}>
                                      {invalidReason}
                                    </div>
                                  );
                                }
                              } else {
                                // Jika tidak ada start/end time, tampilkan '-'
                                console.log(`⚠️ No start/end time for ${incident.noCase}:`, {
                                  startTime: incident.startTime,
                                  endTime: incident.endTime,
                                  oldDurationMin: incident.durationMin
                                });
                                displayValue = (
                                  <div className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                                    -
                                  </div>
                                );
                              }
                            } else if (col.key === 'durationVendorMin') {
                              // SELALU hitung durasi vendor berdasarkan start escalation vendor dan end time
                              if (incident.startEscalationVendor && incident.endTime) {
                                const calculatedDuration = calculateDuration(incident.startEscalationVendor, incident.endTime);
                                
                                // Validasi durasi - hanya tolak durasi yang bermasalah seperti 07:14:19, 13:34:30, 05:14:28
                                const isProblematic = isProblematicDuration(calculatedDuration);
                                
                                // Debug: Log detail validasi vendor
                                console.log(`🔍 Vendor Duration Validation for ${incident.noCase}:`, {
                                  startEscalationVendor: incident.startEscalationVendor,
                                  endTime: incident.endTime,
                                  calculatedDuration,
                                  isProblematic,
                                  isValid: calculatedDuration > 0 && !isProblematic,
                                  reason: calculatedDuration <= 0 ? 'Zero/Negative' : 
                                          isProblematic ? 'Problematic Data' : 'Valid'
                                });
                                
                                if (calculatedDuration > 0 && !isProblematic) {
                                  displayValue = (
                                    <div className="text-xs font-mono font-medium text-green-600 dark:text-green-400">
                                      {formatDuration(calculatedDuration)}
                                    </div>
                                  );
                                } else {
                                  let invalidReason = 'Invalid';
                                  if (calculatedDuration <= 0) {
                                    invalidReason = 'Zero/Neg';
                                  } else if (isProblematic) {
                                    invalidReason = 'Invalid Data';
                                  }
                                  
                                  displayValue = (
                                    <div className="text-xs font-mono font-medium text-red-500 dark:text-red-400"
                                         title={`Vendor Duration: ${calculatedDuration} minutes. Reason: ${invalidReason}`}>
                                      {invalidReason}
                                    </div>
                                  );
                                }
                              } else {
                                // Jika tidak ada start escalation vendor atau end time, tampilkan '-'
                                console.log(`⚠️ No vendor escalation data for ${incident.noCase}:`, {
                                  startEscalationVendor: incident.startEscalationVendor,
                                  endTime: incident.endTime,
                                  hasStartEscalation: !!incident.startEscalationVendor,
                                  hasEndTime: !!incident.endTime
                                });
                                
                                displayValue = (
                                  <div className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400"
                                       title={`No vendor escalation data. Start Escalation: ${incident.startEscalationVendor || 'Missing'}, End: ${incident.endTime || 'Missing'}`}>
                                    -
                                  </div>
                                );
                              }
                            } else if (col.key === 'totalDurationPauseMin') {
                              // Hitung Total Duration Pause berdasarkan pause data yang sebenarnya
                              let totalPauseMinutes = 0;
                              
                              // Pause 1
                              if (incident.startPause1 && incident.endPause1) {
                                const pause1Duration = calculateDuration(incident.startPause1, incident.endPause1);
                                if (pause1Duration > 0) {
                                  totalPauseMinutes += pause1Duration;
                                }
                              }
                              
                              // Pause 2
                              if (incident.startPause2 && incident.endPause2) {
                                const pause2Duration = calculateDuration(incident.startPause2, incident.endPause2);
                                if (pause2Duration > 0) {
                                  totalPauseMinutes += pause2Duration;
                                }
                              }
                              
                              // TOLAK durasi yang bermasalah seperti 07:14:19, 13:34:30, 05:14:28
                              const isProblematic = isProblematicDuration(totalPauseMinutes);
                              
                              if (totalPauseMinutes > 0 && !isProblematic) {
                                displayValue = (
                                  <div className="text-xs font-mono font-medium text-orange-600 dark:text-orange-400">
                                    {formatDuration(totalPauseMinutes)}
                                  </div>
                                );
                              } else {
                                displayValue = (
                                  <div className="text-xs font-mono font-medium text-red-500 dark:text-red-400">
                                    {isProblematic ? 'Invalid Data' : '-'}
                                  </div>
                                );
                              }
                            } else if (col.key === 'totalDurationVendorMin') {
                              // Hitung Total Duration Vendor: Duration Vendor - Total Duration Pause
                              let vendorDuration = 0;
                              let pauseDuration = 0;
                              
                              // Get vendor duration
                              if (incident.startEscalationVendor && incident.endTime) {
                                vendorDuration = calculateDuration(incident.startEscalationVendor, incident.endTime);
                              }
                              
                              // Get pause duration
                              if (incident.startPause1 && incident.endPause1) {
                                const pause1Duration = calculateDuration(incident.startPause1, incident.endPause1);
                                if (pause1Duration > 0) {
                                  pauseDuration += pause1Duration;
                                }
                              }
                              if (incident.startPause2 && incident.endPause2) {
                                const pause2Duration = calculateDuration(incident.startPause2, incident.endPause2);
                                if (pause2Duration > 0) {
                                  pauseDuration += pause2Duration;
                                }
                              }
                              
                              const totalVendorDuration = Math.max(vendorDuration - pauseDuration, 0);
                              
                              // TOLAK durasi yang bermasalah seperti 07:14:19, 13:34:30, 05:14:28
                              const isProblematic = isProblematicDuration(totalVendorDuration);
                              
                              if (totalVendorDuration > 0 && !isProblematic) {
                                displayValue = (
                                  <div className="text-xs font-mono font-medium text-purple-600 dark:text-purple-400">
                                    {formatDuration(totalVendorDuration)}
                                  </div>
                                );
                              } else {
                                displayValue = (
                                  <div className="text-xs font-mono font-medium text-red-500 dark:text-red-400">
                                    {isProblematic ? 'Invalid Data' : '-'}
                                  </div>
                                );
                              }

                            } else {
                              // Untuk kolom lain, gunakan render function atau nilai default
                              if (col.render) {
                                displayValue = col.render(incident[col.key as keyof Incident]);
                              } else {
                                const value = incident[col.key as keyof Incident];
                                displayValue = value !== null && value !== undefined ? String(value) : '-';
                              }
                            }
                            
                            return (
                              <td key={col.key} className={`px-4 py-4 text-sm text-gray-900 dark:text-gray-100 align-top border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${col.width || ''}`}>
                                <div className="max-w-full truncate" title={String(incident[col.key as keyof Incident] || '-')}>
                                  {displayValue}
                                </div>
                            </td>
                            );
                          })}
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
