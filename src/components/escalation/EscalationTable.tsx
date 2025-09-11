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
import { Clock, User, Edit, CheckCircle, XCircle, Save, Trash2 } from 'lucide-react';
import { CodeBadgeClasses, EscalationCode } from '@/utils/escalation';
import { toast } from 'sonner';

const CODES: EscalationCode[] = [
  EscalationCode.OS,
  EscalationCode.AS,
  EscalationCode.BS,
  EscalationCode.DCS,
  EscalationCode.EOS,
  EscalationCode.IPC
];

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
  const { rows, update, close, delete: deleteEscalation } = useEscalationStore();
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
                  <th className="p-2 text-left w-20">No</th>
                  <th className="p-2 text-left w-40">Code</th>
                  <th className="p-2 text-left w-48">Customer</th>
                  <th className="p-2 text-left w-64">Problem</th>
                  <th className="p-2 text-left w-24">Created</th>
                  <th className="p-2 text-left w-32">Durasi Active</th>
                  <th className="p-2 text-left w-32">Action</th>
                </>
              ) : (
                <>
                  <th className="p-2 text-left w-48">Customer</th>
                  <th className="p-2 text-left w-64">Problem</th>
                  <th className="p-2 text-left w-64">Action</th>
                  <th className="p-2 text-left w-64">Rekomendasi</th>
                  <th className="p-2 text-left w-32">Code</th>
                  <th className="p-2 text-left w-24">Created</th>
                  <th className="p-2 text-left w-24">Updated</th>
                  <th className="p-2 text-left w-32">Action</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map(row => <Row key={row.id} row={row} onUpdate={update} onClose={close} onDelete={deleteEscalation} mode={mode} />)}
            {data.length===0 && (
              <tr><td className="p-3" colSpan={mode === 'active' ? 7 : 8}>Tidak ada data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ row, onUpdate, onClose, onDelete, mode }: { 
  row: Escalation; 
  onUpdate: (id: string, patch: Partial<Escalation>) => Promise<void>;
  onClose: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  mode: 'active'|'closed';
}) {
  const { getHistory } = useEscalationStore();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [history, setHistory] = useState<EscalationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState('');
  const [action, setAction] = useState('');
  const [noteInternal, setNoteInternal] = useState('');
  const [code, setCode] = useState<EscalationCode>(row.code as EscalationCode);

  // Get current user role
  const user = JSON.parse(localStorage.getItem('user') || '{"role":"user"}');
  const isSuperAdmin = user.role === 'super admin';

  const loadHistory = async () => {
    if (!row) return;
    setLoading(true);
    try {
      console.log('Loading history for escalation:', row.id);
      const historyData = await getHistory(row.id);
      console.log('History data loaded:', historyData);
      console.log('History data length:', historyData.length);
      
      // Sort history by updatedAt in ascending order (oldest first, newest at bottom)
      const sortedHistory = historyData.sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateA - dateB; // Oldest first
      });
      
      setHistory(sortedHistory);
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
    
    console.log('Saving update:', { problem, action, noteInternal, code });
    
    try {
      // Update problem, action, and code fields (skip automatic history creation)
      await onUpdate(row.id, { problem, action, code }, true);
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
          code: code,
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

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this escalation? This action cannot be undone.')) {
      return;
    }
    
    try {
      await onDelete(row.id);
      toast.success('Escalation deleted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete escalation';
      toast.error(errorMessage);
      console.error('Error deleting escalation:', error);
    }
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
            <td className="p-2 text-center text-sm font-medium text-gray-600">
              {row.caseNumber || '-'}
            </td>
            <td className="p-2">
              <Badge className={`text-xs font-medium ${CodeBadgeClasses[row.code as EscalationCode] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                {row.code}
              </Badge>
            </td>
            <td className="p-2 font-medium">{row.customerName}</td>
            <td className="p-2 max-w-xs text-gray-700 whitespace-pre-wrap break-words">{row.problem}</td>
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
            <td className="p-2 font-medium">{row.customerName}</td>
            <td className="p-2 max-w-xs text-gray-700 whitespace-pre-wrap break-words">{row.problem}</td>
            <td className="p-2 max-w-xs text-gray-700 whitespace-pre-wrap break-words">{row.action}</td>
            <td className="p-2 max-w-xs text-gray-700 whitespace-pre-wrap break-words">{row.recommendation}</td>
            <td className="p-2">
              <Badge className={`text-xs font-medium ${CodeBadgeClasses[row.code as EscalationCode] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                {row.code}
              </Badge>
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
                {isSuperAdmin && (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={handleDelete}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Case</label>
                    <div className="p-3 bg-gray-50 border rounded-md text-sm font-mono">{row.id}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                    <div className="p-3 bg-gray-50 border rounded-md text-sm">{row.customerName}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                    <div className="p-3 bg-gray-50 border rounded-md text-sm">
                      <Badge className={`text-xs font-medium ${CodeBadgeClasses[row.code as EscalationCode] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                        {row.code}
                      </Badge>
                    </div>
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
                          <th className="px-4 py-3 text-left font-medium text-gray-700 w-12">#</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 w-32">Code</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 w-64">Penyebab</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 w-64">Penanganan</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 w-48">Note Internal</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 w-32">Waktu</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 w-24">Author</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {history
                          .filter(item => !(item.action === 'created' && item.field !== 'initial_list'))
                          .map((item, index) => {
                          console.log('Rendering history item:', item);
                          
                          // Function to get the code that was active at this specific time
                          const getCodeAtTime = (item: EscalationHistory) => {
                            // Find the most recent code change before or at this item's time
                            const codeChanges = history
                              .filter(h => h.field === 'code' || h.field === 'problem_action_update')
                              .filter(h => new Date(h.updatedAt) <= new Date(item.updatedAt))
                              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                            
                            // Check if there's a code change in problem_action_update
                            const latestUpdate = codeChanges.find(h => h.field === 'problem_action_update');
                            if (latestUpdate) {
                              try {
                                const updateData = JSON.parse(latestUpdate.newValue);
                                if (updateData.code) {
                                  return updateData.code;
                                }
                              } catch (error) {
                                console.error('Error parsing update data for code:', error);
                              }
                            }
                            
                            // Check for direct code changes
                            const latestCodeChange = codeChanges.find(h => h.field === 'code');
                            if (latestCodeChange) {
                              return latestCodeChange.newValue;
                            }
                            
                            // Default to current row code
                            return row.code;
                          };
                          
                          const currentCode = getCodeAtTime(item);
                          
                          // Show initial list format (from form submission)
                          if (item.field === 'initial_list') {
                            try {
                              const listData = JSON.parse(item.newValue);
                              return (
                                <tr key={item.id} className="hover:bg-gray-50 bg-blue-50">
                                  <td className="px-4 py-3 text-center font-semibold">{index + 1}</td>
                                  <td className="px-4 py-3 max-w-xs">
                                    <Badge className={`text-xs font-medium ${CodeBadgeClasses[currentCode as EscalationCode] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                      {currentCode}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      {listData.problem && (
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {listData.problem}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      {listData.action && (
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {listData.action}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      {listData.recommendation && (
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {listData.recommendation}
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
                                    <Badge className={`text-xs font-medium ${CodeBadgeClasses[currentCode as EscalationCode] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                      {currentCode}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      {updateData.problem && (
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {updateData.problem}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      {updateData.action && (
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {updateData.action}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      {updateData.noteInternal && (
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {updateData.noteInternal}
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
                                    <Badge className={`text-xs font-medium ${CodeBadgeClasses[currentCode as EscalationCode] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                      {currentCode}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="whitespace-pre-wrap break-words">
                                      {combinedData.problem || '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="whitespace-pre-wrap break-words">
                                      {combinedData.action || '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="whitespace-pre-wrap break-words">
                                      {combinedData.noteInternal || '-'}
                                    </div>
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
                                  <Badge className={`text-xs font-medium ${CodeBadgeClasses[currentCode as EscalationCode] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                    {currentCode}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="whitespace-pre-wrap break-words">
                                    {item.newValue}
                                  </div>
                                </td>
                                <td className="px-4 py-3">-</td>
                                <td className="px-4 py-3">-</td>
                                <td className="px-4 py-3">{formatDateTimeDDMMYYYY(item.updatedAt)}</td>
                                <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                              </tr>
                            );
                          }
                          
                          if (item.field === 'action') {
                            return (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-center">{index + 1}</td>
                                <td className="px-4 py-3 max-w-xs">
                                  <Badge className={`text-xs font-medium ${CodeBadgeClasses[currentCode as EscalationCode] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                    {currentCode}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">-</td>
                                <td className="px-4 py-3">
                                  <div className="whitespace-pre-wrap break-words">
                                    {item.newValue}
                                  </div>
                                </td>
                                <td className="px-4 py-3">-</td>
                                <td className="px-4 py-3">{formatDateTimeDDMMYYYY(item.updatedAt)}</td>
                                <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                              </tr>
                            );
                          }
                          
                          if (item.field === 'noteInternal') {
                            return (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-center">{index + 1}</td>
                                <td className="px-4 py-3 max-w-xs">
                                  <Badge className={`text-xs font-medium ${CodeBadgeClasses[currentCode as EscalationCode] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                    {currentCode}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">-</td>
                                <td className="px-4 py-3">-</td>
                                <td className="px-4 py-3">
                                  <div className="whitespace-pre-wrap break-words">
                                    {item.newValue}
                                  </div>
                                </td>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code Eskalasi</label>
                      <select 
                        value={code} 
                        onChange={(e) => setCode(e.target.value as EscalationCode)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {CODES.map(cd => (
                          <option key={cd} value={cd}>{cd}</option>
                        ))}
                      </select>
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
