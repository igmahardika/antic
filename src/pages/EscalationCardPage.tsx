import { useMemo, useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, RefreshCw, TrendingUp, Calendar, MessageSquare, Plus, User, Shield, Edit, Trash2 } from 'lucide-react';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';
import PageWrapper from '@/components/PageWrapper';
import PageHeader from '@/components/ui/PageHeader';
import SummaryCard from '@/components/ui/SummaryCard';
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard
} from '@/components/ui/shadcn-io/kanban';
import TrelloStyleEscalationPopup from '@/components/escalation/TrelloStyleEscalationPopup';
import EscalationForm from '@/components/escalation/EscalationForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useEscalationStore } from '@/store/escalationStore';
import { EscalationStatus, computePriority, CodeHeaderClasses, CodeBadgeClasses } from '@/utils/escalation';
import { toast } from 'sonner';

// Escalation card item interface that maps to real escalation data
interface EscalationCardItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'assigned' | 'in-progress' | 'resolved' | 'closed';
  assignee: string;
  customer: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  category: 'technical' | 'billing' | 'support' | 'security';
  escalationLevel: number;
  escalationCode: string;
  labels?: string[];
  comments?: Array<{
    id: string;
    text: string;
    author: string;
    timestamp: string;
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: string;
  }>;
}

// Function to convert escalation data to card format
const convertEscalationToCard = (escalation: any): EscalationCardItem => {
  const priority = (escalation.priority as any) || computePriority(escalation.createdAt);
  // Prefer saved kanbanStatus; fallback to mapping from active/closed
  const status = (escalation.kanbanStatus as any) || (escalation.status === EscalationStatus.Active ? 'in-progress' : 'closed');
  
  // Determine category based on escalation code
  const getCategory = (code: string): 'technical' | 'billing' | 'support' | 'security' => {
    if (code.includes('OS') || code.includes('DCS')) return 'technical';
    if (code.includes('BS')) return 'billing';
    if (code.includes('AS') || code.includes('IPC')) return 'support';
    return 'security';
  };

  // Determine escalation level based on code
  const getEscalationLevel = (code: string): number => {
    if (code.includes('EOS')) return 3;
    if (code.includes('DCS') || code.includes('IPC')) return 2;
    return 1;
  };

  // Calculate due date based on SLA (24 hours from creation for now)
  const calculateDueDate = (createdAt: string): string => {
    const created = new Date(createdAt);
    const dueDate = new Date(created);
    dueDate.setHours(dueDate.getHours() + 24);
    return dueDate.toISOString();
  };

  return {
    id: escalation.id,
    title: escalation.problem?.substring(0, 50) + (escalation.problem?.length > 50 ? '...' : '') || 'No Problem Description',
    description: escalation.problem || 'No description available',
    priority,
    status,
    assignee: escalation.assignee || 'Unassigned', // Use assignee field if available
    customer: escalation.customerName || 'Unknown Customer',
    dueDate: escalation.dueDate || calculateDueDate(escalation.createdAt), // Use provided due date if set
    createdAt: escalation.createdAt,
    updatedAt: escalation.updatedAt,
    category: (escalation.category as any) || getCategory(escalation.code),
    escalationLevel: escalation.escalationLevel || getEscalationLevel(escalation.code),
    escalationCode: escalation.code,
    // Include any additional fields from Active Escalation
    labels: escalation.tags || [],
    comments: escalation.comments || []
  };
};

const PriorityDotClasses = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const PriorityBorderClasses = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500'
};

const CategoryIcons = {
  technical: Shield,
  billing: MessageSquare,
  support: User,
  security: AlertTriangle
};

const StatusColors = {
  new: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  assigned: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  resolved: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' }
};

const EscalationLevelColors = {
  1: 'bg-blue-100 text-blue-800 border-blue-300',
  2: 'bg-orange-100 text-orange-800 border-orange-300',
  3: 'bg-red-100 text-red-800 border-red-300'
};

export default function EscalationCardPage() {
  const { rows: escalations, load, loading } = useEscalationStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addEscalationDialogOpen, setAddEscalationDialogOpen] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationCardItem | null>(null);

  // Convert real escalation data to card format
  // Filter to only include active escalations to match Active Escalation page
  const escalationCardData = useMemo(() => {
    return escalations
      .filter(escalation => escalation.status === 'active')
      .map(convertEscalationToCard);
  }, [escalations]);

  // Load escalation data on component mount
  useEffect(() => {
    load();
  }, [load]);

  // Listen for storage changes (when data is updated from other tabs/pages)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'escalations' && e.newValue) {
        console.log('Storage change detected in Escalation Card, refreshing data...');
        load();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [load]);

  // Listen for custom escalation data changes
  useEffect(() => {
    const handleEscalationChange = (e: CustomEvent) => {
      console.log('Escalation data changed in Escalation Card:', e.detail);
      load();
    };

    window.addEventListener('escalationDataChanged', handleEscalationChange as EventListener);
    return () => window.removeEventListener('escalationDataChanged', handleEscalationChange as EventListener);
  }, [load]);

  // Kanban columns by Escalation Code (requested behavior)
  const kanbanColumns = useMemo(() => {
    const codes = ['CODE-OS','CODE-AS','CODE-BS','CODE-DCS','CODE-EOS','CODE-IPC','CODE-M'];
    return codes.map(code => ({
      id: code,
      name: code,
      count: escalationCardData.filter(item => item.escalationCode === code).length
    }));
  }, [escalationCardData]);

  // Transform data for Kanban
  const kanbanData = useMemo(() => {
    return escalationCardData.map(item => ({
      id: item.id,
      name: item.title,
      column: item.escalationCode,
      escalation: item
    }));
  }, [escalationCardData]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = escalationCardData.length;
    const newCount = escalationCardData.filter(item => item.status === 'new').length;
    const inProgress = escalationCardData.filter(item => item.status === 'in-progress').length;
    const resolved = escalationCardData.filter(item => item.status === 'resolved').length;
    const critical = escalationCardData.filter(item => item.priority === 'critical').length;
    const avgEscalationLevel = escalationCardData.reduce((sum, item) => sum + item.escalationLevel, 0) / total;

    return { total, newCount, inProgress, resolved, critical, avgEscalationLevel: avgEscalationLevel.toFixed(1) };
  }, [escalationCardData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load();
      setLastUpdated(new Date());
      toast.success('Escalation card data refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const { update } = useEscalationStore();
  
  const handleKanbanDataChange = useCallback(async (newData: any[]) => {
    try {
      // Update escalation code based on kanban column changes
      const updates = newData.map(async (newItem) => {
        const originalItem = escalationCardData.find(d => d.id === newItem.id);
        if (originalItem && originalItem.escalationCode !== newItem.column) {
          await update(newItem.id, { code: newItem.column as any });
        }
      });
      
      await Promise.all(updates);
      toast.success('Escalation code updated!');
    } catch (error) {
      console.error('Error updating escalation code:', error);
      toast.error('Failed to update escalation code');
    }
  }, [escalationCardData, update]);

  // Removed unused handleAddEscalation - functionality moved to Dialog components

  const handleEditEscalation = useCallback((escalation: EscalationCardItem) => {
    console.log('🔧 handleEditEscalation called with:', escalation.id);
    setSelectedEscalation(escalation);
    setEditDialogOpen(true);
  }, []);

  const { add, delete: deleteEscalation } = useEscalationStore();

  const handleSaveEscalation = useCallback(async (escalation: EscalationCardItem) => {
    try {
      if (selectedEscalation) {
        // Update existing escalation - only update non-problem fields
        // Note: problem field should not be updated as it contains the original problem description
        await update(escalation.id, {
          customerName: escalation.customer,
          code: escalation.escalationCode as any,
          assignee: escalation.assignee,
          tags: escalation.labels,
          dueDate: escalation.dueDate,
          priority: (['high','medium','low'] as const).includes(escalation.priority as any) ? (escalation.priority as any) : undefined,
          category: escalation.category as any,
          escalationLevel: escalation.escalationLevel,
          kanbanStatus: escalation.status
        });
      } else {
        // Add new escalation
        await add({
          caseNumber: escalation.id,
          customerId: 'unknown', // Default customer ID
          customerName: escalation.customer,
          problem: escalation.description, // Only for new escalations
          action: '', // Empty action for new escalations
          recommendation: '', // Empty recommendation for new escalations
          code: escalation.escalationCode as any,
          assignee: escalation.assignee,
          tags: escalation.labels,
          dueDate: escalation.dueDate,
          priority: (['high','medium','low'] as const).includes(escalation.priority as any) ? (escalation.priority as any) : undefined,
          category: escalation.category as any,
          escalationLevel: escalation.escalationLevel,
          kanbanStatus: escalation.status,
          status: EscalationStatus.Active
        });
      }
      setLastUpdated(new Date());
      toast.success('Escalation saved successfully!');
    } catch (error) {
      console.error('Error saving escalation:', error);
      toast.error('Failed to save escalation');
    }
  }, [selectedEscalation, update, add]);

  const handleDeleteEscalation = useCallback(async (id: string) => {
    try {
      await deleteEscalation(id);
      setLastUpdated(new Date());
      toast.success('Escalation deleted successfully!');
    } catch (error) {
      console.error('Error deleting escalation:', error);
      toast.error('Failed to delete escalation');
    }
  }, [deleteEscalation]);

  return (
    <PageWrapper>
      <div className="space-y-6 lg:space-y-8">
        <PageHeader
          title="Escalation Management"
          description="Create new escalations and manage active cases with Kanban board"
        />

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              variant="outline" 
              className="px-2 py-1 text-xs h-7"
            >
              <RefreshCw className={`w-2.5 h-2.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Dialog open={addEscalationDialogOpen} onOpenChange={setAddEscalationDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="default" 
                  className="px-3 py-2 text-sm h-8"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Escalation Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Tambah Escalation Baru</DialogTitle>
                  <DialogDescription>
                    Buat eskalasi baru untuk customer yang mengalami kendala
                  </DialogDescription>
                </DialogHeader>
                <EscalationForm onSuccess={() => {
                  setAddEscalationDialogOpen(false);
                  toast.success('Escalation berhasil dibuat!');
                }} />
              </DialogContent>
            </Dialog>
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <SummaryCard
            title="Total Escalations"
            value={summaryStats.total}
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-red-100"
            description="Total escalation cards"
          />
          <SummaryCard
            title="New"
            value={summaryStats.newCount}
            icon={<Clock className="h-4 w-4" />}
            iconBg="bg-yellow-100"
            description="New escalation cards"
          />
          <SummaryCard
            title="In Progress"
            value={summaryStats.inProgress}
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-blue-100"
            description="In progress escalations"
          />
          <SummaryCard
            title="Resolved"
            value={summaryStats.resolved}
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-green-100"
            description="Resolved escalations"
          />
          <SummaryCard
            title="Critical"
            value={summaryStats.critical}
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-red-100"
            description="Critical priority escalations"
          />
          <SummaryCard
            title="Avg Level"
            value={summaryStats.avgEscalationLevel}
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-purple-100"
            description="Average escalation level"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading escalation data...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && escalationCardData.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No Active Escalations</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Belum ada eskalasi aktif. Buat eskalasi pertama untuk memulai.
              </p>
              <Dialog open={addEscalationDialogOpen} onOpenChange={setAddEscalationDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Buat Escalation Pertama
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Tambah Escalation Baru</DialogTitle>
                    <DialogDescription>
                      Buat eskalasi baru untuk customer yang mengalami kendala
                    </DialogDescription>
                  </DialogHeader>
                  <EscalationForm onSuccess={() => {
                    setAddEscalationDialogOpen(false);
                    toast.success('Escalation berhasil dibuat!');
                  }} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {!loading && escalationCardData.length > 0 && (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[1200px] md:min-w-[1400px] xl:min-w-[1600px]">
              <KanbanProvider
                columns={kanbanColumns}
                data={kanbanData}
                onDataChange={handleKanbanDataChange}
                className="w-full"
              >
              {(column) => (
                <KanbanBoard id={column.id} className="min-h-[500px] w-full">
                  <KanbanHeader>
                    <div className={`flex items-center justify-between p-4 rounded-t-md text-white ${CodeHeaderClasses[column.id as keyof typeof CodeHeaderClasses] || 'bg-gray-600'}`}>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: 'rgba(255, 255, 255, 0.85)' }}
                        />
                        <h3 className="font-semibold text-sm">{column.name}</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30 font-medium">
                        {column.count}
                      </Badge>
                    </div>
                  </KanbanHeader>
                  <KanbanCards id={column.id}>
                    {(item: { id: string; name: string; column: string; escalation: EscalationCardItem }) => {
                      const CategoryIcon = CategoryIcons[item.escalation.category];
                      const statusStyle = StatusColors[item.escalation.status];
                      const escalationLevelStyle = EscalationLevelColors[item.escalation.escalationLevel as keyof typeof EscalationLevelColors];
                      
                      return (
                        <KanbanCard
                          key={item.id}
                          id={item.id}
                          name={item.name}
                          column={item.column}
                          className={`hover:shadow-lg transition-all duration-200 border-l-4 ${PriorityBorderClasses[item.escalation.priority]} hover:scale-[1.02] overflow-visible`}
                        >
                          <div className="space-y-3 w-full">
                            {/* Header with title and priority */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`h-2 w-2 rounded-full ${PriorityDotClasses[item.escalation.priority]} shrink-0`} />
                                <span className="font-medium text-sm break-words flex-1 min-w-0 whitespace-normal">
                                  {item.escalation.title}
                                </span>
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs shrink-0 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                              >
                                {item.escalation.status.replace('-', ' ').toUpperCase()}
                              </Badge>
                            </div>

                            {/* Description */}
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {item.escalation.description}
                            </div>

                            {/* Customer and Assignee */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">{item.escalation.customer}</span>
                              </div>
                              <span className="text-muted-foreground truncate max-w-[80px]">{item.escalation.assignee}</span>
                            </div>

                            {/* Category and Escalation Level */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <CategoryIcon className="h-3 w-3" />
                                <span className="capitalize">{item.escalation.category}</span>
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${escalationLevelStyle}`}
                              >
                                Level {item.escalation.escalationLevel}
                              </Badge>
                            </div>

                            {/* Escalation Code */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Code:</span>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${CodeBadgeClasses[item.escalation.escalationCode as any] || 'bg-gray-500 text-white'}`}
                              >
                                {item.escalation.escalationCode}
                              </Badge>
                            </div>

                            {/* Labels (Codes) */}
                            {(item.escalation.labels && item.escalation.labels.length > 0) && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {item.escalation.labels.map((label) => (
                                  <Badge
                                    key={label}
                                    variant="secondary"
                                    className={`text-[10px] ${CodeBadgeClasses[label as any] || 'bg-gray-200 text-gray-800'}`}
                                  >
                                    {label}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Due Date */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {formatDateTimeDDMMYYYY(item.escalation.dueDate)}</span>
                            </div>

                            {/* Priority indicator and ID */}
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  (item.escalation.priority === 'high') ? 'border-orange-500 text-orange-600 bg-orange-50' :
                                  (item.escalation.priority === 'medium') ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                                  (item.escalation.priority === 'low') ? 'border-green-500 text-green-600 bg-green-50' :
                                  'border-gray-300 text-gray-600 bg-gray-50'
                                }`}
                              >
                                {(item.escalation.priority ? item.escalation.priority : 'default').toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                #{item.escalation.id}
                              </span>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  console.log('🖱️ Edit button clicked for escalation:', item.escalation.id);
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEditEscalation(item.escalation);
                                }}
                                className="flex-1 text-xs h-7"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  console.log('🖱️ Delete button clicked for escalation:', item.escalation.id);
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this escalation card?')) {
                                    handleDeleteEscalation(item.escalation.id);
                                  }
                                }}
                                className="flex-1 text-xs h-7"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </KanbanCard>
                      );
                    }}
                  </KanbanCards>
                </KanbanBoard>
              )}
            </KanbanProvider>
          </div>
        </div>
        )}

        {/* Trello Style Popup */}
        <TrelloStyleEscalationPopup
          escalation={selectedEscalation}
          isOpen={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSave={handleSaveEscalation}
          onDelete={handleDeleteEscalation}
        />
      </div>
    </PageWrapper>
  );
}
