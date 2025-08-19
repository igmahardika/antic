import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Incident, IncidentFilter } from '@/types/incident';
import { queryIncidents } from '@/utils/incidentUtils';
import { IncidentUpload } from '@/components/IncidentUpload';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Download, 
  Upload,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';

export const IncidentData: React.FC = () => {
  const [filter, setFilter] = useState<IncidentFilter>({
    page: 1,
    limit: 50
  });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // Get unique values for filter options
  const allIncidents = useLiveQuery(() => 
    db.incidents.toArray()
  );

  const uniqueStatuses = [...new Set(allIncidents?.map(i => i.status).filter(Boolean) || [])];
  const uniquePriorities = [...new Set(allIncidents?.map(i => i.priority).filter(Boolean) || [])];
  const uniqueSites = [...new Set(allIncidents?.map(i => i.site).filter(Boolean) || [])];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const result = await queryIncidents(filter);
        setIncidents(result.rows);
        setTotal(result.total);
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

  const handlePageChange = (newPage: number) => {
    setFilter(prev => ({
      ...prev,
      page: newPage
    }));
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

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID');
  };

  const getStatusBadgeVariant = (status: string | null | undefined) => {
    if (!status) return 'secondary';
    const s = status.toLowerCase();
    if (s === 'done') return 'success';
    if (s === 'open') return 'warning';
    if (s === 'escalated') return 'danger';
    return 'default';
  };

  const getPriorityBadgeVariant = (priority: string | null | undefined) => {
    if (!priority) return 'secondary';
    const p = priority.toLowerCase();
    if (p === 'high') return 'danger';
    if (p === 'medium') return 'warning';
    if (p === 'low') return 'success';
    return 'default';
  };

  const totalPages = Math.ceil(total / (filter.limit || 50));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Incident Data</h1>
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
        </div>
      </div>

      {showUpload && (
        <IncidentUpload />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search No Case, Site, Problem..."
                  value={filter.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select 
                value={filter.status || ''} 
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select 
                value={filter.priority || ''} 
                onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priority</option>
                {uniquePriorities.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Site</label>
              <select 
                value={filter.site || ''} 
                onChange={(e) => handleFilterChange('site', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sites</option>
                {uniqueSites.map(site => (
                  <option key={site} value={site}>{site}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">No Case</th>
                      <th className="px-4 py-3 text-left font-medium">Site</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Priority</th>
                      <th className="px-4 py-3 text-left font-medium">Level</th>
                      <th className="px-4 py-3 text-left font-medium">Start Time</th>
                      <th className="px-4 py-3 text-left font-medium">Duration</th>
                      <th className="px-4 py-3 text-left font-medium">Problem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {incidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 font-medium">{incident.noCase}</td>
                        <td className="px-4 py-3">{incident.site || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusBadgeVariant(incident.status)}>
                            {incident.status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getPriorityBadgeVariant(incident.priority)}>
                            {incident.priority || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{incident.level || '-'}</td>
                        <td className="px-4 py-3">{formatDate(incident.startTime)}</td>
                        <td className="px-4 py-3">{formatDuration(incident.durationMin)}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={incident.problem || ''}>
                          {incident.problem || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {incidents.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500">
                  No incidents found matching your criteria
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {filter.page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange((filter.page || 1) - 1)}
                      disabled={(filter.page || 1) <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange((filter.page || 1) + 1)}
                      disabled={(filter.page || 1) >= totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
