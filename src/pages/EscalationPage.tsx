import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import EscalationForm from '@/components/escalation/EscalationForm';
import EscalationTable from '@/components/escalation/EscalationTable';
import { useEscalationStore } from '@/store/escalationStore';
import { EscalationStatus } from '@/utils/escalation';
import { toast } from 'sonner';

export default function EscalationPage() {
  const { load, rows, loading } = useEscalationStore();
  const [formOpen, setFormOpen] = useState(false);
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
  const { activeCount, closedCount } = useMemo(() => {
    const active = rows.filter(r => r.status === EscalationStatus.Active).length;
    const closed = rows.filter(r => r.status === EscalationStatus.Closed).length;
    return { activeCount: active, closedCount: closed };
  }, [rows]);

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false);
    toast.success('Escalation created successfully');
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Escalation Management</h1>
          <p className="text-muted-foreground">Manage ticket escalations and customer issues</p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Add new escalation">
              <Plus className="w-4 h-4 mr-2" />
              Add Escalation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Escalation</DialogTitle>
              <DialogDescription>
                Create a new escalation for customers experiencing issues
              </DialogDescription>
            </DialogHeader>
            <EscalationForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {lastError && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
          Error: {lastError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Escalations</CardTitle>
            <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              Currently active escalations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Escalations</CardTitle>
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedCount}</div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved escalations
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closedCount})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Escalations</CardTitle>
              <CardDescription>
                List of ongoing escalations that require attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ) : (
                <EscalationTable mode="active" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Closed Escalations</CardTitle>
              <CardDescription>
                List of completed and resolved escalations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ) : (
                <EscalationTable mode="closed" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
