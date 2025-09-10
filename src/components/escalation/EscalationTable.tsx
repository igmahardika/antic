import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEscalationStore } from '@/store/escalationStore';
import type { Escalation, EscalationHistory } from '@/types/escalation';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';
import { Clock, User, Edit, CheckCircle, XCircle, Save } from 'lucide-react';

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

export default function EscalationTable({ mode }: { mode: 'active'|'closed' }) {
  const { rows, update, close } = useEscalationStore();
  const [q, setQ] = useState('');
  const data = useMemo(() => rows.filter(r => r.status===mode && (
    r.customerName.toLowerCase().includes(q.toLowerCase()) ||
    r.code.toLowerCase().includes(q.toLowerCase()) ||
    r.problem.toLowerCase().includes(q.toLowerCase())
  )), [rows, mode, q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="Cari (customer/kode/problem)" value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {mode === 'active' ? (
                <>
                  <th className="p-2 text-left">Customer</th>
                  <th className="p-2 text-left">Problem</th>
                  <th className="p-2 text-left">Created</th>
                  <th className="p-2 text-left">Durasi Active</th>
                  <th className="p-2 text-left">Action</th>
                </>
              ) : (
                <>
                  <th className="p-2 text-left">Customer</th>
                  <th className="p-2 text-left">Problem</th>
                  <th className="p-2 text-left">Action</th>
                  <th className="p-2 text-left">Rekomendasi</th>
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Created</th>
                  <th className="p-2 text-left">Updated</th>
                  <th className="p-2 text-left">Action</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map(row => <Row key={row.id} row={row} onUpdate={update} onClose={close} mode={mode} />)}
            {data.length===0 && (
              <tr><td className="p-3" colSpan={mode === 'active' ? 5 : 8}>Tidak ada data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ row, onUpdate, onClose, mode }: { 
  row: Escalation; 
  onUpdate: (id: string, patch: Partial<Escalation>) => Promise<void>;
  onClose: (id: string) => Promise<void>;
  mode: 'active'|'closed';
}) {
  const { getHistory } = useEscalationStore();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [history, setHistory] = useState<EscalationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState(row.problem);
  const [action, setAction] = useState(row.action);
  const [noteInternal, setNoteInternal] = useState('');

  const loadHistory = async () => {
    if (!row) return;
    setLoading(true);
    try {
      console.log('Loading history for escalation:', row.id);
      const historyData = await getHistory(row.id);
      console.log('History data loaded:', historyData);
      console.log('History data length:', historyData.length);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!problem.trim() || !action.trim()) {
      alert('Problem dan Action harus diisi!');
      return;
    }
    
    console.log('Saving update:', { problem, action, noteInternal });
    
    try {
      // Update only problem and action fields (skip automatic history creation)
      await onUpdate(row.id, { problem, action }, true);
      console.log('Update completed');
      
      // Create a single combined history entry for problem and action only
      const { addHistory } = useEscalationStore.getState();
      const now = new Date().toISOString();
      const user = JSON.parse(localStorage.getItem('user') || '{"username":"System"}');
      
      // Create a combined history entry for problem and action updates
      const combinedEntry = {
        id: `combined-${Date.now()}`,
        escalationId: row.id,
        field: 'problem_action_update',
        oldValue: '',
        newValue: JSON.stringify({
          problem: problem,
          action: action,
          noteInternal: noteInternal || '',
          format: 'update'
        }),
        updatedBy: user.username || 'System',
        updatedAt: now,
        action: 'updated' as const
      };
      
      // Add the combined entry to history
      await addHistory(row.id, 'problem_action_update', '', combinedEntry.newValue, 'updated');
      console.log('Combined history entry added');
      
      // Reload history immediately
      await loadHistory();
      console.log('History reloaded, current history:', history);
      
      setNoteInternal(''); // Clear note internal after save
      setUpdateOpen(false);
    } catch (error) {
      console.error('Error saving update:', error);
      alert('Gagal menyimpan update. Silakan coba lagi.');
    }
  };

  const handleClose = async () => {
    await onClose(row.id);
  };

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
    <>
      <tr className="border-t hover:bg-muted/50">
        {mode === 'active' ? (
          <>
            <td className="p-2">{row.customerName}</td>
            <td className="p-2 max-w-xs truncate">{row.problem}</td>
            <td className="p-2 text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</td>
            <td className="p-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-500" />
                {calculateActiveDuration(row.createdAt)}
              </div>
            </td>
            <td className="p-2">
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setUpdateOpen(true);
                    loadHistory();
                  }}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" />
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={handleClose}>Close</Button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td className="p-2">{row.customerName}</td>
            <td className="p-2 max-w-xs truncate">{row.problem}</td>
            <td className="p-2 max-w-xs truncate">{row.action}</td>
            <td className="p-2 max-w-xs truncate">{row.recommendation}</td>
            <td className="p-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{row.code}</span>
            </td>
            <td className="p-2 text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</td>
            <td className="p-2 text-xs text-muted-foreground">{new Date(row.updatedAt).toLocaleDateString()}</td>
            <td className="p-2">
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setUpdateOpen(true);
                    loadHistory();
                  }}
                  className="flex items-center gap-1"
                >
                  <CheckCircle className="h-3 w-3" />
                  Detail
                </Button>
              </div>
            </td>
          </>
        )}
      </tr>
      
      {/* Update Popup with Detail and Edit */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {mode === 'closed' ? 'Detail Escalation' : 'Edit Escalation'} - {row.customerName}
              </DialogTitle>
              <DialogDescription>
                {mode === 'closed' 
                  ? 'Informasi lengkap dan riwayat penanganan eskalasi yang sudah ditutup'
                  : 'Edit dan update informasi eskalasi dengan riwayat lengkap'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Data Eskalasi Section */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Data Eskalasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Eskalasi</label>
                    <div className="p-3 bg-gray-50 border rounded-md text-sm font-mono">{row.id}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <div className="p-3 bg-gray-50 border rounded-md text-sm">{row.customerName}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <div className="p-3 bg-gray-50 border rounded-md text-sm">{row.code}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-md">
                      {getStatusIcon(row.status)}
                      <span className="text-sm">{row.status === 'active' ? 'Active' : 'Closed'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal, Waktu Open</label>
                    <div className="p-3 bg-gray-50 border rounded-md text-sm">{formatDateTimeDDMMYYYY(row.createdAt)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal, Waktu Close</label>
                    <div className="p-3 bg-gray-50 border rounded-md text-sm">
                      {row.status === 'closed' ? formatDateTimeDDMMYYYY(row.updatedAt) : 'Status masih open'}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Problem</label>
                  <div className="p-3 bg-gray-50 border rounded-md text-sm min-h-[60px]">{row.problem}</div>
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
                          console.log('Rendering history item:', item);
                          
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
                                    <div className="space-y-1">
                                      {listData.recommendation && (
                                        <div className="text-sm">
                                          <span className="font-medium">Rekomendasi:</span> {listData.recommendation}
                                        </div>
                                      )}
                                    </div>
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
                          
                          // Show problem and action updates (new format)
                          if (item.field === 'problem_action_update') {
                            try {
                              const updateData = JSON.parse(item.newValue);
                              return (
                                <tr key={item.id} className="hover:bg-gray-50 bg-green-50">
                                  <td className="px-4 py-3 text-center">{index + 1}</td>
                                  <td className="px-4 py-3 max-w-xs">
                                    <div className="space-y-1">
                                      {updateData.problem && (
                                        <div className="text-sm">
                                          <span className="font-medium">Problem:</span> {updateData.problem}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 max-w-xs">
                                    <div className="space-y-1">
                                      {updateData.action && (
                                        <div className="text-sm">
                                          <span className="font-medium">Action:</span> {updateData.action}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 max-w-xs">
                                    <div className="space-y-1">
                                      {updateData.noteInternal && (
                                        <div className="text-sm">
                                          <span className="font-medium">Note Internal:</span> {updateData.noteInternal}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">{formatDateTimeDDMMYYYY(item.updatedAt)}</td>
                                  <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                                </tr>
                              );
                            } catch (error) {
                              console.error('Error parsing update data:', error);
                              return null;
                            }
                          }
                          
                          // Show combined updates (legacy format)
                          if (item.field === 'combined_update') {
                            try {
                              const combinedData = JSON.parse(item.newValue);
                              return (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-center">{index + 1}</td>
                                  <td className="px-4 py-3 max-w-xs">
                                    {combinedData.problem || '-'}
                                  </td>
                                  <td className="px-4 py-3 max-w-xs">
                                    {combinedData.action || '-'}
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
                          
                          // Show individual field updates (legacy format)
                          if (item.field === 'problem') {
                            return (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-center">{index + 1}</td>
                                <td className="px-4 py-3 max-w-xs">
                                  {item.newValue}
                                </td>
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
                                <td className="px-4 py-3 max-w-xs">
                                  {item.newValue}
                                </td>
                                <td className="px-4 py-3 max-w-xs">-</td>
                                <td className="px-4 py-3">{formatDateTimeDDMMYYYY(item.updatedAt)}</td>
                                <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                              </tr>
                            );
                          }
                          
                          if (item.field === 'noteInternal') {
                            return (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-center">{index + 1}</td>
                                <td className="px-4 py-3 max-w-xs">-</td>
                                <td className="px-4 py-3 max-w-xs">-</td>
                                <td className="px-4 py-3 max-w-xs">{item.newValue}</td>
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

              {/* Form Update Section - Only for Active Escalations */}
              {mode === 'active' && (
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <Input 
                      value={`${row.code} | Kode untuk ${row.customerName}`}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Request Visit</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center">
                        <input type="radio" name="visit" value="no" defaultChecked className="mr-2" />
                        <span className="text-sm">Tidak</span>
                      </label>
                      <label className="flex items-center">
                        <input type="radio" name="visit" value="yes" className="mr-2" />
                        <span className="text-sm">Ya</span>
                      </label>
                    </div>
                  </div>
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
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setUpdateOpen(false)} className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {mode === 'closed' ? 'Tutup' : 'Batal'}
                </Button>
                {mode === 'active' && (
                  <>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      ✓ Simpan
                    </Button>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </>
  );
}
