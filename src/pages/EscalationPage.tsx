import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import EscalationForm from '@/components/escalation/EscalationForm';
import EscalationTable from '@/components/escalation/EscalationTable';
import { useEscalationStore } from '@/store/escalationStore';

export default function EscalationPage() {
  const { load, rows, loading } = useEscalationStore();
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const activeCount = rows.filter(r => r.status === 'active').length;
  const closedCount = rows.filter(r => r.status === 'closed').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Escalation Management</h1>
          <p className="text-muted-foreground">Kelola eskalasi tiket dan masalah customer</p>
        </div>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Escalation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Escalation Baru</DialogTitle>
              <DialogDescription>
                Buat eskalasi baru untuk customer yang mengalami kendala
              </DialogDescription>
            </DialogHeader>
            <EscalationForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Escalations</CardTitle>
            <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              Eskalasi yang sedang berlangsung
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
              Eskalasi yang sudah selesai
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
                Daftar eskalasi yang sedang berlangsung dan memerlukan perhatian
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading...</div>
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
                Daftar eskalasi yang sudah selesai dan ditutup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading...</div>
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
