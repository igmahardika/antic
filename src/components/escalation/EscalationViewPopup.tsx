import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEscalationStore } from '@/store/escalationStore';
import type { Escalation, EscalationHistory } from '@/types/escalation';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';
import { Clock, User, Edit, CheckCircle, XCircle } from 'lucide-react';

interface EscalationViewPopupProps {
  escalation: Escalation | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EscalationViewPopup({ 
  escalation, 
  isOpen, 
  onClose 
}: EscalationViewPopupProps) {
  const { getHistory } = useEscalationStore();
  const [history, setHistory] = useState<EscalationHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (escalation && isOpen) {
      loadHistory();
    }
  }, [escalation, isOpen]);

  const loadHistory = async () => {
    if (!escalation) return;
    setLoading(true);
    try {
      console.log('Loading history for escalation:', escalation.id);
      const historyData = await getHistory(escalation.id);
      console.log('History data loaded:', historyData);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!escalation) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Edit className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFieldLabel = (field: string) => {
    const fieldLabels: { [key: string]: string } = {
      'problem': 'Problem',
      'action': 'Action',
      'recommendation': 'Rekomendasi',
      'code': 'Code Eskalasi',
      'status': 'Status',
      'customerName': 'Customer',
      'escalation': 'Eskalasi'
    };
    return fieldLabels[field] || field;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Detail Escalation - {escalation.customerName}</DialogTitle>
          <DialogDescription>
            Informasi lengkap dan riwayat penanganan eskalasi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Data Eskalasi Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Eskalasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Eskalasi</label>
                  <div className="p-3 bg-gray-50 border rounded-md text-sm font-mono">{escalation.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <div className="p-3 bg-gray-50 border rounded-md text-sm">{escalation.customerName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <div className="p-3 bg-gray-50 border rounded-md text-sm">{escalation.code}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-md">
                    {getStatusIcon(escalation.status)}
                    <span className="text-sm">{escalation.status === 'active' ? 'Active' : 'Closed'}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal, Waktu Open</label>
                  <div className="p-3 bg-gray-50 border rounded-md text-sm">{formatDateTimeDDMMYYYY(escalation.createdAt)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal, Waktu Close</label>
                  <div className="p-3 bg-gray-50 border rounded-md text-sm">
                    {escalation.status === 'closed' ? formatDateTimeDDMMYYYY(escalation.updatedAt) : 'Status masih open'}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Problem</label>
                <div className="p-3 bg-gray-50 border rounded-md text-sm min-h-[60px]">{escalation.problem}</div>
              </div>
              {escalation.action && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <div className="p-3 bg-gray-50 border rounded-md text-sm min-h-[60px]">{escalation.action}</div>
                </div>
              )}
              {escalation.recommendation && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rekomendasi</label>
                  <div className="p-3 bg-gray-50 border rounded-md text-sm min-h-[60px]">{escalation.recommendation}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Riwayat Penanganan</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading history...</p>
                  </div>
                </div>
              ) : history.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {history.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getActionIcon(item.action)}
                            <span className="font-medium text-sm">
                              {getFieldLabel(item.field)} - {item.action}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDateTimeDDMMYYYY(item.updatedAt)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Updated by:</strong> {item.updatedBy}
                        </div>
                        {item.oldValue && (
                          <div className="text-sm mb-2">
                            <strong>Old Value:</strong>
                            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs mt-1">
                              {item.oldValue}
                            </div>
                          </div>
                        )}
                        {item.newValue && (
                          <div className="text-sm">
                            <strong>New Value:</strong>
                            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs mt-1">
                              {item.newValue}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Belum ada history penanganan</p>
                  <p className="text-sm text-gray-400 mt-1">History akan muncul setelah ada update</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
