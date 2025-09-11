import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import EscalationTable from '@/components/escalation/EscalationTable';
import { useEscalationStore } from '@/store/escalationStore';
import PageWrapper from '@/components/PageWrapper';
import PageHeader from '@/components/ui/PageHeader';
import { CardHeaderTitle, CardHeaderDescription } from '@/components/ui/CardTypography';
import SummaryCard from '@/components/ui/SummaryCard';
import { 
  EscalationStatus, 
  EscalationCode, 
  getCodeColor, 
  exportEscalationsToCSV,
  type Escalation 
} from '@/utils/escalation';
import { toast } from 'sonner';

export default function EscalationDataPage() {
  const { load, rows, loading } = useEscalationStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLastError(null);
        await load();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load escalation data';
        setLastError(errorMessage);
        toast.error(errorMessage);
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error loading escalation data:', error);
        }
      }
    };
    loadData();
  }, [load]);

  // Memoized calculations to prevent unnecessary re-renders
  const { activeEscalations, closedEscalations, totalEscalations, activeCount, closedCount, resolutionRate, codeStats } = useMemo(() => {
    const active = rows.filter(row => row.status === EscalationStatus.Active);
    const closed = rows.filter(row => row.status === EscalationStatus.Closed);
    const total = rows.length;
    const activeCount = active.length;
    const closedCount = closed.length;
    const resolutionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

    // Group by escalation code with proper typing
    const codeStats = closed.reduce((acc, escalation) => {
      acc[escalation.code] = (acc[escalation.code] || 0) + 1;
      return acc;
    }, {} as Record<EscalationCode, number>);

    return {
      activeEscalations: active,
      closedEscalations: closed,
      totalEscalations: total,
      activeCount,
      closedCount,
      resolutionRate,
      codeStats
    };
  }, [rows]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setLastError(null);
      await load();
      toast.success('Data refreshed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
      setLastError(errorMessage);
      toast.error(errorMessage);
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error refreshing escalation data:', error);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const handleExport = useCallback(() => {
    try {
      if (closedEscalations.length === 0) {
        toast.warning('No closed escalations to export');
        return;
      }
      
      exportEscalationsToCSV(closedEscalations, `escalations_closed_${new Date().toISOString().slice(0,10)}.csv`);
      toast.success(`Exported ${closedEscalations.length} closed escalations`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export data';
      toast.error(errorMessage);
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error exporting escalation data:', error);
      }
    }
  }, [closedEscalations]);

  return (
    <PageWrapper>
      <div className="space-y-6 lg:space-y-8">
        <PageHeader 
          title="Escalation Data" 
          description="Daftar eskalasi yang sudah ditutup dan statistik lengkap"
        />

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing || loading}
              variant="outline" 
              className="px-2 py-1 text-xs h-7"
              aria-label="Refresh escalation data"
            >
              <RefreshCw className={`w-2.5 h-2.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={closedEscalations.length === 0}
              variant="outline" 
              className="px-2 py-1 text-xs h-7"
              aria-label="Export closed escalations to CSV"
            >
              <Download className="w-2.5 h-2.5 mr-1" />
              Export CSV
            </Button>
          </div>
          {lastError && (
            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              Error: {lastError}
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Escalations"
            value={totalEscalations}
            description="All escalations"
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-blue-500"
          />
          <SummaryCard
            title="Active Escalations"
            value={activeCount}
            description="Currently active"
            icon={<Clock className="h-4 w-4" />}
            iconBg="bg-yellow-500"
          />
          <SummaryCard
            title="Closed Escalations"
            value={closedCount}
            description="Successfully resolved"
            icon={<CheckCircle className="h-4 w-4" />}
            iconBg="bg-green-500"
          />
          <SummaryCard
            title="Resolution Rate"
            value={`${resolutionRate}%`}
            description="Success rate"
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-purple-500"
          />
        </div>


        {/* Escalation Code Statistics */}
        {Object.keys(codeStats).length > 0 && (
          <Card>
            <CardHeader>
              <CardHeaderTitle>Closed Escalations by Code</CardHeaderTitle>
              <CardHeaderDescription>
                Distribution of resolved escalations by code
              </CardHeaderDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Row */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Total Resolved</h3>
                      <p className="text-sm text-gray-600">All escalation codes combined</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{closedCount}</div>
                    <div className="text-sm text-gray-500">escalations</div>
                  </div>
                </div>

                {/* Code Statistics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {Object.entries(codeStats)
                    .sort(([,a], [,b]) => b - a) // Sort by count descending
                    .map(([code, count]) => {
                      const percentage = closedCount > 0 ? Math.round((count / closedCount) * 100) : 0;
                      const codeColor = getCodeColor(code as EscalationCode);

                      return (
                        <div key={code} className="group relative overflow-hidden bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 hover:border-gray-300">
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${codeColor}`}></div>
                                <span className="font-medium text-gray-900 text-xs">{code}</span>
                              </div>
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                {percentage}%
                              </Badge>
                            </div>
                            
                            <div className="space-y-1.5">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-gray-900">{count}</span>
                                <span className="text-xs text-gray-500">resolved</span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${codeColor} transition-all duration-300`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Hover Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                        </div>
                      );
                    })}
                </div>

                {/* Additional Info */}
                <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      {Object.keys(codeStats).length} different escalation codes have been resolved
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Data Table */}
        <Card>
          <CardHeader>
            <CardHeaderTitle>Closed Escalations</CardHeaderTitle>
            <CardHeaderDescription>
              Daftar eskalasi yang sudah ditutup ({closedEscalations.length} items)
            </CardHeaderDescription>
          </CardHeader>
          <CardContent>
            <EscalationTable mode="closed" />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
