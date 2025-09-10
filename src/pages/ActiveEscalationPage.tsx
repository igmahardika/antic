import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Plus, Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import EscalationForm from '@/components/escalation/EscalationForm';
import EscalationTable from '@/components/escalation/EscalationTable';
import { useEscalationStore } from '@/store/escalationStore';
import PageWrapper from '@/components/PageWrapper';
import PageHeader from '@/components/ui/PageHeader';
import { CardHeaderTitle, CardHeaderDescription } from '@/components/ui/CardTypography';
import SummaryCard from '@/components/ui/SummaryCard';

export default function ActiveEscalationPage() {
  const { load, rows } = useEscalationStore();
  const [addEscalationOpen, setAddEscalationOpen] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for storage changes (when data is updated from other tabs/pages)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'escalations' && e.newValue) {
        console.log('Storage change detected in Active Escalation, refreshing data...');
        load();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [load]);

  // Listen for custom escalation data changes
  useEffect(() => {
    const handleEscalationChange = (e: CustomEvent) => {
      console.log('Escalation data changed in Active Escalation:', e.detail);
      load();
    };

    window.addEventListener('escalationDataChanged', handleEscalationChange as EventListener);
    return () => window.removeEventListener('escalationDataChanged', handleEscalationChange as EventListener);
  }, [load]);

  const activeEscalations = rows.filter(row => row.status === 'active');
  const closedEscalations = rows.filter(row => row.status === 'closed');
  
  // Calculate statistics
  const totalEscalations = rows.length;
  const activeCount = activeEscalations.length;
  const closedCount = closedEscalations.length;
  
  // Calculate average duration for active escalations
  const avgDuration = activeEscalations.length > 0 
    ? Math.round(activeEscalations.reduce((acc, escalation) => {
        const created = new Date(escalation.createdAt);
        const now = new Date();
        const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return acc + diffHours;
      }, 0) / activeEscalations.length)
    : 0;


  return (
    <PageWrapper>
      <div className="space-y-6 lg:space-y-8">
        <PageHeader 
          title="Active Escalation" 
          description="Kelola eskalasi aktif dan tambah eskalasi baru"
        />

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <Dialog open={addEscalationOpen} onOpenChange={setAddEscalationOpen}>
            <DialogTrigger asChild>
              <Button className="px-2 py-1 text-xs h-7">
                <Plus className="w-2.5 h-2.5 mr-1" />
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
              <EscalationForm onSuccess={() => setAddEscalationOpen(false)} />
            </DialogContent>
          </Dialog>
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
            title="Avg Duration"
            value={`${avgDuration}h`}
            description="Average active time"
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-purple-500"
          />
        </div>


        {/* Main Data Table */}
        <Card>
          <CardHeader>
            <CardHeaderTitle>Active Escalations</CardHeaderTitle>
            <CardHeaderDescription>
              Daftar eskalasi yang sedang aktif ({activeEscalations.length} items)
            </CardHeaderDescription>
          </CardHeader>
          <CardContent>
            <EscalationTable mode="active" />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
