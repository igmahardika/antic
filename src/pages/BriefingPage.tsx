import { useMemo, useState, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, RefreshCw, TrendingUp, Calendar, MessageSquare, Plus, FileText, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
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
import TrelloStyleBriefingPopup from '@/components/briefing/TrelloStyleBriefingPopup';
import { toast } from 'sonner';

// Mock data untuk briefing
interface BriefingItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  assignee: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  category: 'shift-pagi' | 'shift-sore' | 'shift-malam' | 'monitoring' | 'request';
  labels?: string[];
  comments?: Array<{
    id: string;
    text: string;
    author: string;
    timestamp: string;
  }>;
}

const mockBriefingData: BriefingItem[] = [
  {
    id: 'brief-001',
    title: 'Daily Standup Meeting',
    description: 'Daily standup meeting untuk review progress dan blocking issues',
    priority: 'high',
    status: 'pending',
    assignee: 'Team Lead',
    dueDate: '2024-01-15T09:00:00Z',
    createdAt: '2024-01-14T10:00:00Z',
    updatedAt: '2024-01-14T10:00:00Z',
    category: 'shift-pagi'
  },
  {
    id: 'brief-002',
    title: 'System Maintenance Notice',
    description: 'Pemberitahuan maintenance sistem pada jam 02:00-04:00 WIB',
    priority: 'critical',
    status: 'in-progress',
    assignee: 'DevOps Team',
    dueDate: '2024-01-15T02:00:00Z',
    createdAt: '2024-01-14T08:00:00Z',
    updatedAt: '2024-01-14T08:00:00Z',
    category: 'shift-malam'
  },
  {
    id: 'brief-003',
    title: 'Documentation Update',
    description: 'Update dokumentasi API untuk versi terbaru',
    priority: 'medium',
    status: 'completed',
    assignee: 'Technical Writer',
    dueDate: '2024-01-14T17:00:00Z',
    createdAt: '2024-01-13T14:00:00Z',
    updatedAt: '2024-01-14T16:30:00Z',
    category: 'request'
  },
  {
    id: 'brief-004',
    title: 'Client Meeting Reminder',
    description: 'Reminder meeting dengan client untuk review proposal',
    priority: 'high',
    status: 'pending',
    assignee: 'Account Manager',
    dueDate: '2024-01-16T14:00:00Z',
    createdAt: '2024-01-14T11:00:00Z',
    updatedAt: '2024-01-14T11:00:00Z',
    category: 'shift-sore'
  },
  {
    id: 'brief-005',
    title: 'Server Performance Monitoring',
    description: 'Monitoring performa server dan database setiap 15 menit',
    priority: 'high',
    status: 'in-progress',
    assignee: 'System Admin',
    dueDate: '2024-01-15T23:59:00Z',
    createdAt: '2024-01-14T12:00:00Z',
    updatedAt: '2024-01-14T12:00:00Z',
    category: 'monitoring'
  },
  {
    id: 'brief-006',
    title: 'Backup Database',
    description: 'Backup database harian pada jam 03:00 WIB',
    priority: 'critical',
    status: 'completed',
    assignee: 'Database Admin',
    dueDate: '2024-01-14T03:00:00Z',
    createdAt: '2024-01-13T20:00:00Z',
    updatedAt: '2024-01-14T03:30:00Z',
    category: 'shift-malam'
  },
  {
    id: 'brief-007',
    title: 'User Training Session',
    description: 'Training untuk user baru tentang sistem',
    priority: 'medium',
    status: 'pending',
    assignee: 'Training Team',
    dueDate: '2024-01-16T10:00:00Z',
    createdAt: '2024-01-14T13:00:00Z',
    updatedAt: '2024-01-14T13:00:00Z',
    category: 'shift-pagi'
  }
];

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
  'shift-pagi': Clock,
  'shift-sore': Clock,
  'shift-malam': Clock,
  monitoring: TrendingUp,
  request: MessageSquare
};

const StatusColors = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  'in-progress': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
};

export default function BriefingPage() {
  const [briefingData, setBriefingData] = useState<BriefingItem[]>(mockBriefingData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState<BriefingItem | null>(null);

  // Kanban columns
  const kanbanColumns = useMemo(() => [
    {
      id: 'pending',
      name: 'Pending',
      color: '#6b7280',
      count: briefingData.filter(item => item.status === 'pending').length
    },
    {
      id: 'in-progress',
      name: 'In Progress',
      color: '#3b82f6',
      count: briefingData.filter(item => item.status === 'in-progress').length
    },
    {
      id: 'completed',
      name: 'Completed',
      color: '#10b981',
      count: briefingData.filter(item => item.status === 'completed').length
    },
    {
      id: 'cancelled',
      name: 'Cancelled',
      color: '#ef4444',
      count: briefingData.filter(item => item.status === 'cancelled').length
    }
  ], [briefingData]);

  // Transform data for Kanban
  const kanbanData = useMemo(() => {
    return briefingData.map(item => ({
      id: item.id,
      name: item.title,
      column: item.status,
      briefing: item
    }));
  }, [briefingData]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = briefingData.length;
    const pending = briefingData.filter(item => item.status === 'pending').length;
    const inProgress = briefingData.filter(item => item.status === 'in-progress').length;
    const completed = briefingData.filter(item => item.status === 'completed').length;
    const critical = briefingData.filter(item => item.priority === 'critical').length;

    return { total, pending, inProgress, completed, critical };
  }, [briefingData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastUpdated(new Date());
      toast.success('Briefing data refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handleKanbanDataChange = useCallback((newData: any[]) => {
    // Update briefing data based on kanban changes
    const updatedBriefingData = briefingData.map(item => {
      const newItem = newData.find(d => d.id === item.id);
      if (newItem) {
        return { ...item, status: newItem.column as any };
      }
      return item;
    });
    setBriefingData(updatedBriefingData);
    toast.success('Briefing status updated!');
  }, [briefingData]);

  const handleAddBriefing = useCallback(() => {
    setSelectedBriefing(null);
    setEditDialogOpen(true);
  }, []);

  const handleEditBriefing = useCallback((briefing: BriefingItem) => {
    console.log('🔧 handleEditBriefing called with:', briefing.id);
    setSelectedBriefing(briefing);
    setEditDialogOpen(true);
  }, []);

  const handleSaveBriefing = useCallback((briefing: BriefingItem) => {
    if (selectedBriefing) {
      // Update existing briefing
      setBriefingData(prev => prev.map(item => 
        item.id === briefing.id ? briefing : item
      ));
    } else {
      // Add new briefing
      setBriefingData(prev => [...prev, briefing]);
    }
    setLastUpdated(new Date());
  }, [selectedBriefing]);

  const handleDeleteBriefing = useCallback((id: string) => {
    setBriefingData(prev => prev.filter(item => item.id !== id));
    setLastUpdated(new Date());
  }, []);

  // Automation: Auto-move cards based on time
  useEffect(() => {
    const automationInterval = setInterval(() => {
      const now = new Date();
      setBriefingData(prev => prev.map(item => {
        const dueDate = new Date(item.dueDate);
        const timeDiff = dueDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Auto-move to in-progress if due within 2 hours and still pending
        if (hoursDiff <= 2 && hoursDiff > 0 && item.status === 'pending') {
          return { ...item, status: 'in-progress' as const, updatedAt: now.toISOString() };
        }
        
        // Auto-move to completed if overdue and in-progress
        if (hoursDiff < 0 && item.status === 'in-progress') {
          return { ...item, status: 'completed' as const, updatedAt: now.toISOString() };
        }

        return item;
      }));
    }, 60000); // Check every minute

    return () => clearInterval(automationInterval);
  }, []);

  // Get closed tasks (completed + cancelled)
  const closedTasks = useMemo(() => {
    return briefingData.filter(item => item.status === 'completed' || item.status === 'cancelled');
  }, [briefingData]);

  return (
    <PageWrapper>
      <div className="space-y-6 lg:space-y-8">
        <PageHeader
          title="Briefing Management"
          description="Manage team briefings, meetings, and announcements with Kanban board"
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
            <Button 
              onClick={handleAddBriefing}
              variant="default" 
              className="px-2 py-1 text-xs h-7"
            >
              <Plus className="w-2.5 h-2.5 mr-1" />
              Add Briefing
            </Button>
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <SummaryCard
            title="Total Briefings"
            value={summaryStats.total}
            icon={<FileText className="h-4 w-4" />}
            iconBg="bg-blue-100"
            description="Total briefing items"
          />
          <SummaryCard
            title="Pending"
            value={summaryStats.pending}
            icon={<Clock className="h-4 w-4" />}
            iconBg="bg-yellow-100"
            description="Pending items"
          />
          <SummaryCard
            title="In Progress"
            value={summaryStats.inProgress}
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-blue-100"
            description="In progress items"
          />
          <SummaryCard
            title="Completed"
            value={summaryStats.completed}
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-green-100"
            description="Completed items"
          />
          <SummaryCard
            title="Critical"
            value={summaryStats.critical}
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-red-100"
            description="Critical priority items"
          />
        </div>

        {/* Kanban Board */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[1200px]">
            <KanbanProvider
              columns={kanbanColumns}
              data={kanbanData}
              onDataChange={handleKanbanDataChange}
              className="w-full"
            >
              {(column) => (
                <KanbanBoard id={column.id} className="min-h-[500px] w-full">
                  <KanbanHeader>
                    <div
                      className="flex items-center justify-between p-4 rounded-t-md text-white"
                      style={{ backgroundColor: column.color }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                        />
                        <h3 className="font-semibold text-sm">{column.name}</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30 font-medium">
                        {column.count}
                      </Badge>
                    </div>
                  </KanbanHeader>
                  <KanbanCards id={column.id}>
                    {(item: { id: string; name: string; column: string; briefing: BriefingItem }) => {
                      const CategoryIcon = CategoryIcons[item.briefing.category];
                      const statusStyle = StatusColors[item.briefing.status];
                      
                      return (
                        <KanbanCard
                          key={item.id}
                          id={item.id}
                          name={item.name}
                          column={item.column}
                          className={`hover:shadow-lg transition-all duration-200 border-l-4 ${PriorityBorderClasses[item.briefing.priority]} hover:scale-[1.02]`}
                        >
                          <div className="space-y-3 w-full">
                            {/* Header with title and priority */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`h-2 w-2 rounded-full ${PriorityDotClasses[item.briefing.priority]} shrink-0`} />
                                <span className="font-medium text-sm break-words flex-1 min-w-0">
                                  {item.briefing.title}
                                </span>
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs shrink-0 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                              >
                                {item.briefing.status.replace('-', ' ').toUpperCase()}
                              </Badge>
                            </div>

                            {/* Description */}
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {item.briefing.description}
                            </div>

                            {/* Category and Assignee */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <CategoryIcon className="h-3 w-3" />
                                <span className="capitalize">{item.briefing.category}</span>
                              </div>
                              <span className="text-muted-foreground">{item.briefing.assignee}</span>
                            </div>

                            {/* Due Date */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Due: {formatDateTimeDDMMYYYY(item.briefing.dueDate)}</span>
                            </div>

                            {/* Priority indicator and ID */}
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  item.briefing.priority === 'critical' ? 'border-red-500 text-red-600 bg-red-50' :
                                  item.briefing.priority === 'high' ? 'border-orange-500 text-orange-600 bg-orange-50' :
                                  item.briefing.priority === 'medium' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                                  'border-green-500 text-green-600 bg-green-50'
                                }`}
                              >
                                {item.briefing.priority.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                #{item.briefing.id}
                              </span>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  console.log('🖱️ Edit button clicked for briefing:', item.briefing.id);
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEditBriefing(item.briefing);
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
                                  console.log('🖱️ Delete button clicked for briefing:', item.briefing.id);
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this briefing?')) {
                                    handleDeleteBriefing(item.briefing.id);
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

        {/* Closed Tasks Table */}
        {closedTasks.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Closed Tasks ({closedTasks.length})
              </h3>
              <p className="text-sm text-gray-600 mt-1">Tasks that have been completed or cancelled</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {closedTasks.map((task) => {
                    const CategoryIcon = CategoryIcons[task.category];
                    return (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <CategoryIcon className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{task.title}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="text-xs bg-gray-100 text-gray-800">
                            {task.category.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {task.assignee}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            className={`text-xs ${
                              task.priority === 'critical' ? 'border-red-500 text-red-600 bg-red-50' :
                              task.priority === 'high' ? 'border-orange-500 text-orange-600 bg-orange-50' :
                              task.priority === 'medium' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
                              'border-green-500 text-green-600 bg-green-50'
                            }`}
                          >
                            {task.priority.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            className={`text-xs ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                              'bg-red-100 text-red-800 border-red-300'
                            }`}
                          >
                            {task.status === 'completed' ? (
                              <><CheckCircle className="h-3 w-3 mr-1" />COMPLETED</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" />CANCELLED</>
                            )}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTimeDDMMYYYY(task.dueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTimeDDMMYYYY(task.updatedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trello Style Popup */}
        <TrelloStyleBriefingPopup
          briefing={selectedBriefing}
          isOpen={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSave={handleSaveBriefing}
          onDelete={handleDeleteBriefing}
        />
      </div>
    </PageWrapper>
  );
}
