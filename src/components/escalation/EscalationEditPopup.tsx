import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEscalationStore } from '@/store/escalationStore';
import type { Escalation, EscalationHistory } from '@/types/escalation';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface EscalationEditPopupProps {
  escalation: Escalation | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EscalationEditPopup({ 
  escalation, 
  isOpen, 
  onClose, 
  onSuccess 
}: EscalationEditPopupProps) {
  const { update, getHistory } = useEscalationStore();
  const [history, setHistory] = useState<EscalationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState('');
  const [action, setAction] = useState('');
  const [noteInternal, setNoteInternal] = useState('');

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

  useEffect(() => {
    if (escalation && isOpen) {
      setProblem(escalation.problem);
      setAction(escalation.action);
      setNoteInternal('');
      loadHistory();
    }
  }, [escalation, isOpen]);

  const handleSave = async () => {
    if (!escalation || !problem.trim() || !action.trim()) return;
    
    try {
      await update(escalation.id, { 
        problem: problem.trim(),
        action: action.trim()
      });
      
      // Add history entry for the update
      const { addHistory } = useEscalationStore.getState();
      const now = new Date().toISOString();
      const user = JSON.parse(localStorage.getItem('user') || '{"username":"System"}');
      
      // Create a combined history entry
      const combinedData = {
        problem: problem.trim(),
        action: action.trim(),
        noteInternal: noteInternal.trim(),
        format: 'combined'
      };
      
      await addHistory(escalation.id, 'combined_update', '', JSON.stringify(combinedData), 'updated');
      
      onSuccess();
    } catch (error) {
      console.error('Failed to update escalation:', error);
    }
  };

  if (!escalation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Escalation - {escalation.customerName}</DialogTitle>
          <DialogDescription>
            Edit dan update informasi eskalasi dengan riwayat lengkap
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Data Eskalasi Section */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Data Eskalasi</h3>
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
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Active</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal, Waktu Open</label>
                <div className="p-3 bg-gray-50 border rounded-md text-sm">{formatDateTimeDDMMYYYY(escalation.createdAt)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal, Waktu Close</label>
                <div className="p-3 bg-gray-50 border rounded-md text-sm">
                  Status masih open
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Problem</label>
              <div className="p-3 bg-gray-50 border rounded-md text-sm min-h-[60px]">{escalation.problem}</div>
            </div>
          </div>

          {/* Penyebab / Penanganan Section */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Penyebab / Penanganan</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading history...</p>
                </div>
              </div>
            ) : history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">#</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Penyebab</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Penanganan</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Note Internal</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Waktu</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Author</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.map((item, index) => {
                      // Show initial list format (from form submission)
                      if (item.field === 'initial_list') {
                        try {
                          const listData = JSON.parse(item.newValue);
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 bg-blue-50">
                              <td className="px-4 py-3 text-center font-semibold">{index + 1}</td>
                              <td className="px-4 py-3 max-w-xs">
                                <div className="space-y-1">
                                  {listData.problem && (
                                    <div className="text-sm">
                                      <span className="font-medium">Problem:</span> {listData.problem}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                <div className="space-y-1">
                                  {listData.action && (
                                    <div className="text-sm">
                                      <span className="font-medium">Action:</span> {listData.action}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                {listData.noteInternal || '-'}
                              </td>
                              <td className="px-4 py-3">{formatDateTimeDDMMYYYY(item.updatedAt)}</td>
                              <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                            </tr>
                          );
                        } catch (error) {
                          console.error('Error parsing list data:', error);
                          return null;
                        }
                      }
                      
                      // Show combined update format
                      if (item.field === 'combined_update') {
                        try {
                          const combinedData = JSON.parse(item.newValue);
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 bg-green-50">
                              <td className="px-4 py-3 text-center font-semibold">{index + 1}</td>
                              <td className="px-4 py-3 max-w-xs">
                                <div className="space-y-1">
                                  {combinedData.problem && (
                                    <div className="text-sm">
                                      <span className="font-medium">Problem:</span> {combinedData.problem}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                <div className="space-y-1">
                                  {combinedData.action && (
                                    <div className="text-sm">
                                      <span className="font-medium">Action:</span> {combinedData.action}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 max-w-xs">
                                {combinedData.noteInternal || '-'}
                              </td>
                              <td className="px-4 py-3">{formatDateTimeDDMMYYYY(item.updatedAt)}</td>
                              <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                            </tr>
                          );
                        } catch (error) {
                          console.error('Error parsing combined data:', error);
                          return null;
                        }
                      }
                      
                      // Show individual field updates
                      if (item.field === 'problem') {
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-center">{index + 1}</td>
                            <td className="px-4 py-3 max-w-xs">{item.newValue}</td>
                            <td className="px-4 py-3 max-w-xs">-</td>
                            <td className="px-4 py-3 max-w-xs">-</td>
                            <td className="px-4 py-3">{formatDateTimeDDMMYYYY(item.updatedAt)}</td>
                            <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                          </tr>
                        );
                      }
                      
                      if (item.field === 'action') {
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-center">{index + 1}</td>
                            <td className="px-4 py-3 max-w-xs">-</td>
                            <td className="px-4 py-3 max-w-xs">{item.newValue}</td>
                            <td className="px-4 py-3 max-w-xs">-</td>
                            <td className="px-4 py-3">{formatDateTimeDDMMYYYY(item.updatedAt)}</td>
                            <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                          </tr>
                        );
                      }
                      
                      // Show creation entries
                      if (item.action === 'created') {
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-center">{index + 1}</td>
                            <td className="px-4 py-3 max-w-xs">Eskalasi dibuat</td>
                            <td className="px-4 py-3 max-w-xs">Eskalasi dibuat</td>
                            <td className="px-4 py-3 max-w-xs">-</td>
                            <td className="px-4 py-3">{formatDateTimeDDMMYYYY(item.updatedAt)}</td>
                            <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                          </tr>
                        );
                      }
                      
                      return null;
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Belum ada history penanganan</p>
                <p className="text-sm text-gray-400 mt-1">History akan muncul setelah ada update</p>
              </div>
            )}
          </div>

          {/* Form Update Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Penyebab *</label>
                <Textarea 
                  value={problem} 
                  onChange={(e)=>setProblem(e.target.value)} 
                  placeholder="Deskripsikan penyebab kendala..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Penanganan *</label>
                <Textarea 
                  value={action} 
                  onChange={(e)=>setAction(e.target.value)} 
                  placeholder="Tuliskan penanganan yang dilakukan..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal, Waktu Penanganan</label>
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={new Date().toISOString().split('T')[0]}
                    className="flex-1"
                    readOnly
                  />
                  <Input 
                    type="time" 
                    value={new Date().toTimeString().slice(0, 5)}
                    className="flex-1"
                    readOnly
                  />
                  <div className="px-3 py-2 bg-gray-50 border rounded-md text-sm flex items-center">
                    WIB
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note Internal</label>
                <Textarea 
                  value={noteInternal}
                  onChange={(e) => setNoteInternal(e.target.value)}
                  placeholder="Catatan internal..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Batal
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              ✓ Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
