import { useMemo, useState, useEffect, useCallback } from 'react';
import { useEscalationStore } from '@/store/escalationStore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';
import { 
  EscalationCode, 
  EscalationStatus, 
  computePriority, 
  humanizeActiveDuration,
  CodeHeaderClasses,
  type Escalation,
  type Priority
} from '@/utils/escalation';
import PageWrapper from '@/components/PageWrapper';
import PageHeader from '@/components/ui/PageHeader';
import { CardHeaderTitle, CardHeaderDescription } from '@/components/ui/CardTypography';
import SummaryCard from '@/components/ui/SummaryCard';
import { 
  KanbanProvider, 
  KanbanBoard, 
  KanbanHeader, 
  KanbanCards, 
  KanbanCard 
} from '@/components/ui/shadcn-io/kanban';
import EscalationEditPopup from '@/components/escalation/EscalationEditPopup';
import { toast } from 'sonner';

// Enhanced escalation type with materialized data
type EscalationWithMetadata = Escalation & {
  priority: Priority;
  durationText: string;
};

export default function IncidentBoardPage() {
  const { rows, load, loading } = useEscalationStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [lastError, setLastError] = useState<string | null>(null);
  const [editEscalationOpen, setEditEscalationOpen] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationWithMetadata | null>(null);

  // Load data on component mount with error handling
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

  // Auto-refresh with Page Visibility API support
  useEffect(() => {
    let timer: number | undefined;

    const tick = async () => {
      try {
        await load();
        setLastUpdated(new Date());
        setLastError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh data';
        setLastError(errorMessage);
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error refreshing escalation data:', error);
        }
      } finally {
        // Schedule next tick only if tab is active
        if (!document.hidden) {
          timer = window.setTimeout(tick, 30000);
        }
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        // Resume immediately when tab becomes active
        tick();
      } else if (timer) {
        clearTimeout(timer);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    tick();

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  // Listen for storage changes (when data is updated from other tabs/pages)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'escalations' && e.newValue) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Storage change detected, refreshing data...');
        }
        load().then(() => {
          setLastUpdated(new Date());
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [load]);

  // Listen for custom escalation data changes
  useEffect(() => {
    const handleEscalationChange = (e: CustomEvent) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Escalation data changed:', e.detail);
      }
      load().then(() => {
        setLastUpdated(new Date());
      });
    };

    window.addEventListener('escalationDataChanged', handleEscalationChange as EventListener);
    return () => window.removeEventListener('escalationDataChanged', handleEscalationChange as EventListener);
  }, [load]);

  
  // Materialize active escalations with computed properties
  const activeEscalations = useMemo(() => {
    return rows
      .filter(r => r.status === EscalationStatus.Active)
      .map(r => {
        const priority = computePriority(r.createdAt);
        return {
          ...r,
          priority,
          durationText: humanizeActiveDuration(r.createdAt),
        };
      });
  }, [rows]);

  // Transform escalations for Kanban
  const kanbanData = useMemo(() => {
    return activeEscalations.map(escalation => ({
      id: escalation.id,
      name: escalation.customerName,
      column: escalation.code,
      escalation: escalation
    }));
  }, [activeEscalations]);


  // Kanban columns
  const kanbanColumns = useMemo(() => [
    { id: EscalationCode.OS, name: EscalationCode.OS },
    { id: EscalationCode.AS, name: EscalationCode.AS },
    { id: EscalationCode.BS, name: EscalationCode.BS },
    { id: EscalationCode.DCS, name: EscalationCode.DCS },
    { id: EscalationCode.EOS, name: EscalationCode.EOS },
    { id: EscalationCode.IPC, name: EscalationCode.IPC },
    { id: EscalationCode.M, name: EscalationCode.M }
  ], []);


  // Calculate statistics with memoization
  const { totalActive, criticalCount, highCount, avgDuration } = useMemo(() => {
    const total = activeEscalations.length;
    const critical = activeEscalations.filter(e => e.priority === 'critical').length;
    const high = activeEscalations.filter(e => e.priority === 'high').length;
    const avg = total > 0 ? 
      Math.round(activeEscalations.reduce((acc, e) => {
        const hours = (new Date().getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60);
        return acc + hours;
      }, 0) / total) : 0;

    return { totalActive: total, criticalCount: critical, highCount: high, avgDuration: avg };
  }, [activeEscalations]);

  const handleEdit = useCallback((id: string) => {
    const escalation = activeEscalations.find(e => e.id === id);
    if (escalation) {
      setSelectedEscalation(escalation);
      setEditEscalationOpen(true);
    } else {
      toast.error('Escalation not found');
    }
  }, [activeEscalations]);

  const handleEditSuccess = useCallback(async () => {
    setEditEscalationOpen(false);
    setSelectedEscalation(null);
    setLastUpdated(new Date());
    
    // Reload data to reflect changes
    try {
      await load();
      toast.success('Escalation updated successfully');
    } catch (error) {
      console.error('Error reloading data after update:', error);
      toast.error('Update successful but failed to refresh data');
    }
  }, [load]);


  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setLastError(null);
      await load();
      setLastUpdated(new Date());
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

  return (
    <PageWrapper>
      <div className="space-y-6 lg:space-y-8">
        <PageHeader 
          title="Escalation Incident Board" 
          description="Monitor and manage active escalations by category"
        />

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
            {lastError && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-2 py-1 rounded">
                Error: {lastError}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Auto-refresh every 30s (paused when tab inactive)
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <SummaryCard
            title="Total Active"
            value={totalActive}
            description="Active escalations"
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-orange-500"
          />
          <SummaryCard
            title="Critical Priority"
            value={criticalCount}
            description="Urgent escalations"
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-red-500"
          />
          <SummaryCard
            title="High Priority"
            value={highCount}
            description="High priority escalations"
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-yellow-500"
          />
          <SummaryCard
            title="Avg. Duration"
            value={`${avgDuration}h`}
            description="Average active time"
            icon={<Clock className="h-4 w-4" />}
            iconBg="bg-blue-500"
          />
        </div>

        {/* Kanban Board */}
        <Card className="w-full">
          <CardHeader>
            <CardHeaderTitle>Escalation Board</CardHeaderTitle>
            <CardHeaderDescription>
              Active escalations organized by code ({activeEscalations.length} items)
            </CardHeaderDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="w-full min-w-[1200px]">
              <KanbanProvider
                columns={kanbanColumns}
                data={kanbanData}
                onDataChange={(newData) => {
                  // Handle data changes if needed
                  console.log('Kanban data changed:', newData);
                }}
                className="w-full"
              >
                {(column) => (
                  <KanbanBoard id={column.id} className="min-h-[400px] w-full">
                    <KanbanHeader>
                      <div className={`flex items-center justify-between p-3 rounded-t-md ${CodeHeaderClasses[column.id as EscalationCode]}`}>
                        <span className="font-semibold text-sm">{column.name}</span>
                        <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                          {kanbanData.filter(item => item.column === column.id).length}
                        </Badge>
                      </div>
                    </KanbanHeader>
                    <KanbanCards id={column.id}>
                      {(item: { id: string; name: string; column: string; escalation: EscalationWithMetadata }) => {
                        return (
                        <KanbanCard 
                          key={item.id} 
                          id={item.id} 
                          name={item.name} 
                          column={item.column}
                          className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                          onClick={() => handleEdit(item.escalation.id)}
                        >
                          <div className="space-y-2 w-full">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-sm break-words flex-1 min-w-0">{item.escalation.customerName}</span>
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {item.escalation.code}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap line-clamp-3">
                              {item.escalation.problem}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                              <span className="truncate flex-1 min-w-0">{formatDateTimeDDMMYYYY(item.escalation.createdAt)}</span>
                              <span className="shrink-0">{item.escalation.durationText}</span>
                            </div>
                            {item.escalation.action && (
                              <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap line-clamp-2">
                                <span className="font-medium">Action:</span> {item.escalation.action}
                              </div>
                            )}
                          </div>
                        </KanbanCard>
                        );
                      }}
                    </KanbanCards>
                  </KanbanBoard>
                )}
              </KanbanProvider>
            </div>
          </CardContent>
        </Card>

        {/* Single Dialog System - No Duplicate Overlays */}
        <EscalationEditPopup
          escalation={selectedEscalation}
          isOpen={editEscalationOpen}
          onClose={() => setEditEscalationOpen(false)}
          onSuccess={handleEditSuccess}
        />


      </div>
    </PageWrapper>
  );
}
