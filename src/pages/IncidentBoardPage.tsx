import React, { useMemo, useState, useEffect } from 'react';
import { useEscalationStore } from '@/store/escalationStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, AlertTriangle, Edit, Eye, RefreshCw, TrendingUp } from 'lucide-react';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';
import type { EscalationCode } from '@/types/escalation';
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
import EscalationViewPopup from '@/components/escalation/EscalationViewPopup';

// Utility function to calculate active duration
const calculateActiveDuration = (createdAt: string) => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days} hari ${hours} jam`;
  } else if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  } else {
    return `${minutes} menit`;
  }
};

// Get color for escalation code
const getCodeColor = (code: EscalationCode) => {
  const colors = {
    'CODE-OS': 'bg-red-100 text-red-800 border-red-200',
    'CODE-AS': 'bg-orange-100 text-orange-800 border-orange-200',
    'CODE-BS': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'CODE-DCS': 'bg-blue-100 text-blue-800 border-blue-200',
    'CODE-EOS': 'bg-purple-100 text-purple-800 border-purple-200',
    'CODE-IPC': 'bg-green-100 text-green-800 border-green-200',
  };
  return colors[code] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// Utility function to get header color for each code
const getHeaderColor = (code: string) => {
  const colorMap: { [key: string]: string } = {
    'CODE-OS': 'bg-blue-500',
    'CODE-AS': 'bg-green-500', 
    'CODE-BS': 'bg-yellow-500',
    'CODE-DCS': 'bg-purple-500',
    'CODE-EOS': 'bg-red-500',
    'CODE-IPC': 'bg-indigo-500'
  };
  return colorMap[code] || 'bg-gray-500';
};

// Utility function to get header text color
const getHeaderTextColor = (code: string) => {
  return 'text-white';
};

// Get priority level based on duration
const getPriorityLevel = (createdAt: string) => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  
  if (diffHours > 72) return 'critical';
  if (diffHours > 24) return 'high';
  if (diffHours > 8) return 'medium';
  return 'low';
};

// Get priority color
const getPriorityColor = (priority: string) => {
  const colors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };
  return colors[priority as keyof typeof colors] || 'bg-gray-500';
};

interface EscalationCardProps {
  escalation: any;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

function EscalationCard({ escalation, onEdit, onView }: EscalationCardProps) {
  const priority = getPriorityLevel(escalation.createdAt);
  const priorityColor = getPriorityColor(priority);
  const codeColor = getCodeColor(escalation.code);

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer border-l-4" 
          style={{ borderLeftColor: priorityColor === 'bg-red-500' ? '#ef4444' : 
                                 priorityColor === 'bg-orange-500' ? '#f97316' :
                                 priorityColor === 'bg-yellow-500' ? '#eab308' : '#22c55e' }}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${codeColor} text-xs font-medium`}>
                {escalation.code}
              </Badge>
              <div className={`w-2 h-2 rounded-full ${priorityColor}`}></div>
            </div>
            <CardTitle className="text-sm font-medium text-gray-900 line-clamp-2">
              {escalation.customerName}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Problem */}
          <div>
            <p className="text-xs text-gray-600 line-clamp-3">
              {escalation.problem}
            </p>
          </div>
          
          {/* Duration */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{calculateActiveDuration(escalation.createdAt)}</span>
          </div>
          
          {/* Created Date */}
          <div className="text-xs text-gray-500">
            Created: {formatDateTimeDDMMYYYY(escalation.createdAt)}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-1 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 text-xs h-7"
              onClick={() => onView(escalation.id)}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button 
              size="sm" 
              variant="default" 
              className="flex-1 text-xs h-7"
              onClick={() => onEdit(escalation.id)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IncidentBoardPage() {
  const { rows, load } = useEscalationStore();
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [editEscalationOpen, setEditEscalationOpen] = useState(false);
  const [viewEscalationOpen, setViewEscalationOpen] = useState(false);
  const [selectedEscalation, setSelectedEscalation] = useState<any>(null);

  // Debug state changes
  useEffect(() => {
    console.log('=== STATE DEBUG ===');
    console.log('editEscalationOpen:', editEscalationOpen);
    console.log('viewEscalationOpen:', viewEscalationOpen);
    console.log('selectedEscalation:', selectedEscalation);
    console.log('==================');
  }, [editEscalationOpen, viewEscalationOpen, selectedEscalation]);
  
  // Load data on component mount
  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh data every 30 seconds to ensure real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      load().then(() => {
        setLastUpdated(new Date());
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [load]);

  // Listen for storage changes (when data is updated from other tabs/pages)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'escalations' && e.newValue) {
        console.log('Storage change detected, refreshing data...');
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
      console.log('Escalation data changed:', e.detail);
      load().then(() => {
        setLastUpdated(new Date());
      });
    };

    window.addEventListener('escalationDataChanged', handleEscalationChange as EventListener);
    return () => window.removeEventListener('escalationDataChanged', handleEscalationChange as EventListener);
  }, [load]);

  
  // Filter only active escalations
  const activeEscalations = useMemo(() => 
    rows.filter(r => r.status === 'active'), 
    [rows]
  );

  // Group escalations by code
  const groupedEscalations = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    activeEscalations.forEach(escalation => {
      if (!groups[escalation.code]) {
        groups[escalation.code] = [];
      }
      groups[escalation.code].push(escalation);
    });
    
    return groups;
  }, [activeEscalations]);

  // Transform escalations for Kanban
  const kanbanData = useMemo(() => {
    return activeEscalations.map(escalation => ({
      id: escalation.id,
      name: escalation.customerName,
      column: escalation.code,
      escalation: escalation
    }));
  }, [activeEscalations]);

  // Debug: Log data changes
  useEffect(() => {
    console.log('=== INCIDENT BOARD DEBUG ===');
    console.log('Total rows:', rows.length);
    console.log('Active escalations:', activeEscalations.length, 'items');
    console.log('Active escalations data:', activeEscalations);
    console.log('Kanban data:', kanbanData.length, 'items');
    console.log('Kanban data structure:', kanbanData);
    console.log('===========================');
  }, [activeEscalations, kanbanData, rows]);


  // Kanban columns
  const kanbanColumns = useMemo(() => [
    { id: 'CODE-OS', name: 'CODE-OS' },
    { id: 'CODE-AS', name: 'CODE-AS' },
    { id: 'CODE-BS', name: 'CODE-BS' },
    { id: 'CODE-DCS', name: 'CODE-DCS' },
    { id: 'CODE-EOS', name: 'CODE-EOS' },
    { id: 'CODE-IPC', name: 'CODE-IPC' }
  ], []);

  // Define column order
  const columnOrder: EscalationCode[] = ['CODE-OS', 'CODE-AS', 'CODE-BS', 'CODE-DCS', 'CODE-EOS', 'CODE-IPC'];

  // Calculate statistics
  const totalActive = activeEscalations.length;
  const criticalCount = activeEscalations.filter(e => getPriorityLevel(e.createdAt) === 'critical').length;
  const highCount = activeEscalations.filter(e => getPriorityLevel(e.createdAt) === 'high').length;
  const avgDuration = activeEscalations.length > 0 ? 
    Math.round(activeEscalations.reduce((acc, e) => {
      const hours = (new Date().getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60);
      return acc + hours;
    }, 0) / activeEscalations.length) : 0;

  const handleEdit = (id: string) => {
    console.log('=== HANDLE EDIT ===');
    console.log('Edit button clicked for escalation:', id);
    console.log('Active escalations:', activeEscalations);
    const escalation = activeEscalations.find(e => e.id === id);
    console.log('Found escalation:', escalation);
    if (escalation) {
      console.log('Setting selected escalation:', escalation);
      setSelectedEscalation(escalation);
      console.log('Setting edit dialog open to true');
      setEditEscalationOpen(true);
      console.log('Edit dialog should be opened now');
    } else {
      console.log('No escalation found with id:', id);
    }
    console.log('==================');
  };

  const handleEditSuccess = () => {
    setEditEscalationOpen(false);
    setSelectedEscalation(null);
    setLastUpdated(new Date());
  };

  const handleView = (id: string) => {
    console.log('=== HANDLE VIEW ===');
    console.log('View button clicked for escalation:', id);
    console.log('Active escalations:', activeEscalations);
    const escalation = activeEscalations.find(e => e.id === id);
    console.log('Found escalation:', escalation);
    if (escalation) {
      console.log('Setting selected escalation:', escalation);
      setSelectedEscalation(escalation);
      console.log('Setting view dialog open to true');
      setViewEscalationOpen(true);
      console.log('View dialog should be opened now');
    } else {
      console.log('No escalation found with id:', id);
    }
    console.log('==================');
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await load();
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  };

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
              disabled={isLoading}
              variant="outline" 
              className="px-2 py-1 text-xs h-7"
            >
              <RefreshCw className={`w-2.5 h-2.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Auto-refresh every 30s
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
            <div className="w-full min-w-[800px]">
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
                      <div className={`flex items-center justify-between p-3 rounded-t-md ${getHeaderColor(column.id)} ${getHeaderTextColor(column.id)}`}>
                        <span className="font-semibold text-sm">{column.name}</span>
                        <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                          {kanbanData.filter(item => item.column === column.id).length}
                        </Badge>
                      </div>
                    </KanbanHeader>
                    <KanbanCards id={column.id}>
                      {(item) => {
                        console.log('Rendering KanbanCard for item:', item);
                        return (
                        <KanbanCard key={item.id} id={item.id} name={item.name}>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm truncate">{item.escalation.customerName}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {item.escalation.code}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.escalation.problem}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="truncate">{formatDateTimeDDMMYYYY(item.escalation.createdAt)}</span>
                              <span className="shrink-0">{calculateActiveDuration(item.escalation.createdAt)}</span>
                            </div>
                            <div className="flex gap-1 pt-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs flex-1 hover:bg-blue-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('VIEW BUTTON CLICKED!', item.escalation.id);
                                  alert('View button clicked for: ' + item.escalation.customerName);
                                  handleView(item.escalation.id);
                                }}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs flex-1 hover:bg-green-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('EDIT BUTTON CLICKED!', item.escalation.id);
                                  alert('Edit button clicked for: ' + item.escalation.customerName);
                                  handleEdit(item.escalation.id);
                                }}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
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
          </CardContent>
        </Card>

        {/* Edit Escalation Dialog */}
        {editEscalationOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Edit Escalation</h2>
              <p>Selected Escalation: {selectedEscalation?.customerName}</p>
              <p>ID: {selectedEscalation?.id}</p>
              <button 
                onClick={() => setEditEscalationOpen(false)}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <EscalationEditPopup
          escalation={selectedEscalation}
          isOpen={editEscalationOpen}
          onClose={() => setEditEscalationOpen(false)}
          onSuccess={handleEditSuccess}
        />

        {/* View Escalation Dialog */}
        {viewEscalationOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
              <h2 className="text-xl font-bold mb-4">View Escalation</h2>
              <p>Selected Escalation: {selectedEscalation?.customerName}</p>
              <p>ID: {selectedEscalation?.id}</p>
              <button 
                onClick={() => setViewEscalationOpen(false)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <EscalationViewPopup
          escalation={selectedEscalation}
          isOpen={viewEscalationOpen}
          onClose={() => setViewEscalationOpen(false)}
        />

      </div>
    </PageWrapper>
  );
}
