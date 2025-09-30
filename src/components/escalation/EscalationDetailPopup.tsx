import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEscalationStore } from '@/store/escalationStore';
import type { Escalation, EscalationHistory } from '@/types/escalation';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';
import { getOriginalProblemFromHistory } from '@/utils/escalationHelpers';
import { Clock, User, Edit, CheckCircle, XCircle } from 'lucide-react';

interface EscalationDetailPopupProps {
  escalation: Escalation | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EscalationDetailPopup({ escalation, isOpen, onClose }: EscalationDetailPopupProps) {
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
      const historyData = await getHistory(escalation.id);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(escalation.status)}
            Detail Eskalasi - {escalation.customerName}
          </DialogTitle>
          <DialogDescription>
            Lihat detail lengkap dan history update untuk eskalasi ini
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi Eskalasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer</label>
                    <p className="text-sm">{escalation.customerName}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(escalation.status)}
                    <Badge variant={escalation.status === 'active' ? 'default' : 'secondary'}>
                      {escalation.status === 'active' ? 'Active' : 'Closed'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Problem</label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                    {getOriginalProblemFromHistory(history, escalation.problem)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    * Menampilkan deskripsi problem asli dari baris pertama penyebab di history
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{escalation.action || 'Tidak ada action'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Rekomendasi</label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md">{escalation.recommendation || 'Tidak ada rekomendasi'}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-muted-foreground">Dibuat</label>
                    <p className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTimeDDMMYYYY(escalation.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Diupdate</label>
                    <p className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTimeDDMMYYYY(escalation.updatedAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">History Update</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading history...</div>
                  </div>
                ) : history.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {history.map((item, index) => (
                        <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                          <div className="flex-shrink-0 mt-1">
                            {getActionIcon(item.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {getFieldLabel(item.field)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {item.action}
                              </Badge>
                            </div>
                            
                            {item.action === 'created' ? (
                              <p className="text-sm text-muted-foreground">
                                Eskalasi dibuat
                              </p>
                            ) : item.action === 'closed' ? (
                              <p className="text-sm text-muted-foreground">
                                Status diubah dari <span className="font-medium">{item.oldValue}</span> menjadi <span className="font-medium">{item.newValue}</span>
                              </p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Dari:</span> 
                                  <span className="ml-1 font-medium">{item.oldValue || 'Kosong'}</span>
                                </p>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Ke:</span> 
                                  <span className="ml-1 font-medium">{item.newValue}</span>
                                </p>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{item.updatedBy}</span>
                              <Clock className="h-3 w-3 ml-2" />
                              <span>{formatDateTimeDDMMYYYY(item.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Belum ada history update</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
