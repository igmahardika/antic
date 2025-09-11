import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';
import EscalationTable from '@/components/escalation/EscalationTable';
import { useEscalationStore } from '@/store/escalationStore';
import PageWrapper from '@/components/PageWrapper';
import PageHeader from '@/components/ui/PageHeader';
import { CardHeaderTitle, CardHeaderDescription } from '@/components/ui/CardTypography';
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
  const { closedEscalations, closedCount, codeStats } = useMemo(() => {
    const closed = rows.filter(row => row.status === EscalationStatus.Closed);
    const closedCount = closed.length;

    // Initialize all possible escalation codes with 0 count
    const allCodes = [
      EscalationCode.OS,
      EscalationCode.AS,
      EscalationCode.BS,
      EscalationCode.DCS,
      EscalationCode.EOS,
      EscalationCode.IPC,
      EscalationCode.M
    ];

    // Group by escalation code with proper typing, including unused codes
    const codeStats = allCodes.reduce((acc, code) => {
      acc[code] = closed.filter(escalation => escalation.code === code).length;
      return acc;
    }, {} as Record<EscalationCode, number>);

    return {
      closedEscalations: closed,
      closedCount,
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

        {/* Escalation Code Statistics */}
        <Card>
            <CardHeader>
              <CardHeaderTitle>Escalation Summary</CardHeaderTitle>
              <CardHeaderDescription>
                Summary of closed escalations by code type
              </CardHeaderDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Code Statistics Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {Object.entries(codeStats)
                    .sort(([a], [b]) => a.localeCompare(b)) // Sort alphabetically by code
                    .map(([code, count]) => {
                      const percentage = closedCount > 0 ? Math.round((count / closedCount) * 100) : 0;
                      const codeColor = getCodeColor(code as EscalationCode);

                      return (
                        <div key={code} className="bg-card text-card-foreground rounded-xl shadow-md p-2 flex flex-col min-h-[70px] transition-all duration-300 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-1 mb-1">
                            <div className={`w-5 h-5 min-w-5 min-h-5 rounded-md flex items-center justify-center ${codeColor} shadow-sm`}>
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            </div>
                            <div className="flex-1 flex items-center">
                              <span className="text-[8px] font-semibold uppercase tracking-wide break-words whitespace-normal">
                                {code}
                              </span>
                              <span className="ml-1 px-1 py-0.5 rounded text-[7px] font-bold text-white bg-blue-500">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="flex items-end min-h-[16px]">
                            <span className="text-sm font-mono font-extrabold tracking-tight break-words">
                              {count}
                            </span>
                            <span className="text-[8px] font-semibold text-muted-foreground ml-1 mb-0.5 align-bottom">
                              resolved
                            </span>
                          </div>
                          <div className="text-[6px] text-muted-foreground mt-0.5 break-words whitespace-normal">
                            Statistics
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Additional Info */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {Object.values(codeStats).filter(count => count > 0).length} of {Object.keys(codeStats).length} escalation codes have been resolved
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
