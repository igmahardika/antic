import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Clock, Save, X } from 'lucide-react';
import { useEscalationStore } from '@/store/escalationStore';
import { EscalationCode, CodeBadgeClasses, type Escalation, type EscalationHistory } from '@/utils/escalation';
import { formatDateTimeDDMMYYYYHHMMSS } from '@/lib/utils';
import { toast } from 'sonner';

const CODES: EscalationCode[] = [
  EscalationCode.OS,
  EscalationCode.AS,
  EscalationCode.BS,
  EscalationCode.DCS,
  EscalationCode.EOS,
  EscalationCode.IPC,
  EscalationCode.M
];

interface EscalationUpdateCardProps {
  escalation: Escalation;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EscalationUpdateCard({ 
  escalation, 
  isOpen, 
  onClose, 
  onSuccess 
}: EscalationUpdateCardProps) {
  console.log('🎯 EscalationUpdateCard rendered with props:', { 
    escalation: escalation?.id, 
    isOpen, 
    hasEscalation: !!escalation 
  });
  
  const { update, getHistory } = useEscalationStore();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<EscalationHistory[]>([]);
  const [problem, setProblem] = useState('');
  const [action, setAction] = useState('');
  const [noteInternal, setNoteInternal] = useState('');
  const [code, setCode] = useState<EscalationCode>(EscalationCode.OS);

  // Always render dialog but control visibility with open prop
  console.log('✅ Dialog component rendered, isOpen:', isOpen);

  // Initialize form with current escalation data
  useEffect(() => {
    if (escalation) {
      setProblem(escalation.problem || '');
      setAction(escalation.action || '');
      setCode(escalation.code as EscalationCode);
      setNoteInternal('');
    }
  }, [escalation]);

  // Load history when dialog opens
  useEffect(() => {
    if (isOpen && escalation) {
      loadHistory();
    }
  }, [isOpen, escalation]);

  const loadHistory = async () => {
    if (!escalation) return;
    setLoading(true);
    try {
      const historyData = await getHistory(escalation.id);
      
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
      toast.error('Problem dan Action harus diisi!');
      return;
    }
    
    try {
      setLoading(true);
      
      // Update action and code fields only (skip automatic history creation)
      // Note: problem field should not be updated as it contains the original problem description
      await update(escalation.id, { action, code }, true);
      
      // Create a single combined history entry for problem and action only
      const { addHistory } = useEscalationStore.getState();
      const now = new Date().toISOString();
      const user = JSON.parse(localStorage.getItem('user') || '{"username":"System"}');
      
      // Create a combined history entry for problem and action updates
      const combinedEntry = {
        id: `combined-${Date.now()}`,
        escalationId: escalation.id,
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
      await addHistory(escalation.id, 'problem_action_update', '', combinedEntry.newValue, 'updated');
      
      // Reload history immediately
      await loadHistory();
      
      setNoteInternal(''); // Clear note internal after save
      toast.success('Update penanganan berhasil disimpan');
      onSuccess();
    } catch (error) {
      console.error('Error saving update:', error);
      toast.error('Gagal menyimpan update. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProblem(escalation.problem || '');
    setAction(escalation.action || '');
    setCode(escalation.code as EscalationCode);
    setNoteInternal('');
    onClose();
  };

  console.log('🎭 Rendering Dialog with isOpen:', isOpen, 'escalation:', escalation?.id);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Update Penanganan - {escalation?.customerName || 'Loading...'}
          </DialogTitle>
          <DialogDescription>
            Edit dan update informasi eskalasi dengan riwayat lengkap
          </DialogDescription>
        </DialogHeader>

        {!escalation ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading escalation data...</p>
            </div>
          </div>
        ) : (

        <div className="space-y-6">
          {/* Data Eskalasi Section */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Data Eskalasi</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Nomor Case</label>
                <div className="p-3 bg-muted rounded-md text-sm font-mono">{escalation.id}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Customer</label>
                <div className="p-3 bg-muted rounded-md text-sm">{escalation.customerName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Code</label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  <Badge className={`text-xs font-medium ${CodeBadgeClasses[escalation.code as EscalationCode] || 'bg-muted text-muted-foreground border-border'}`}>
                    {escalation.code}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <div className="h-2 w-2 bg-orange-500 rounded-full" />
                  <span className="text-sm">Active</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Tanggal, Waktu Open</label>
                <div className="p-3 bg-muted rounded-md text-sm font-mono">{formatDateTimeDDMMYYYYHHMMSS(escalation.createdAt)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Durasi Active</label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-orange-500" />
                    {Math.floor((Date.now() - new Date(escalation.createdAt).getTime()) / (1000 * 60 * 60))} jam
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Riwayat Penanganan Section */}
          <div className="bg-card rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Riwayat Penanganan</h3>
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
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">#</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Code</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-64">Penyebab</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-64">Penanganan</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-48">Note Internal</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Waktu</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Author</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history
                      .filter(item => !(item.action === 'created' && item.field !== 'initial_list'))
                      .map((item, index) => {
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
                              console.error('Error parsing update data:', error);
                            }
                          }
                          
                          // Check for direct code changes
                          const directCodeChange = codeChanges.find(h => h.field === 'code');
                          if (directCodeChange) {
                            return directCodeChange.newValue;
                          }
                          
                          return escalation.code; // Default to current code
                        };
                        
                        const currentCode = getCodeAtTime(item);
                        
                        // Show combined updates (new format)
                        if (item.field === 'problem_action_update') {
                          try {
                            const updateData = JSON.parse(item.newValue);
                            return (
                              <tr key={item.id} className="hover:bg-muted/50">
                                <td className="px-4 py-3 text-center">{index + 1}</td>
                                <td className="px-4 py-3 max-w-xs">
                                  <Badge className={`text-xs font-medium ${CodeBadgeClasses[currentCode as EscalationCode] || 'bg-muted text-muted-foreground border-border'}`}>
                                    {currentCode}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm whitespace-pre-wrap break-words">
                                    {updateData.problem || '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm whitespace-pre-wrap break-words">
                                    {updateData.action || '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm whitespace-pre-wrap break-words">
                                    {updateData.noteInternal || '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono">{formatDateTimeDDMMYYYYHHMMSS(item.updatedAt)}</td>
                                <td className="px-4 py-3 text-sm">{item.updatedBy}</td>
                              </tr>
                            );
                          } catch (error) {
                            console.error('Error parsing update data:', error);
                            return null;
                          }
                        }
                        
                        return null;
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Belum ada history penanganan</p>
                <p className="text-sm text-muted-foreground/70 mt-1">History akan muncul setelah ada update</p>
              </div>
            )}
          </div>

          {/* Form Update Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Analisis Penyebab *</label>
                <Textarea 
                  value={problem} 
                  onChange={(e) => setProblem(e.target.value)} 
                  placeholder="Analisis penyebab kendala berdasarkan investigasi..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Penanganan *</label>
                <Textarea 
                  value={action} 
                  onChange={(e) => setAction(e.target.value)} 
                  placeholder="Tuliskan penanganan yang dilakukan..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Code Eskalasi</label>
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
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Tanggal, Waktu Penanganan</label>
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
                    <div className="px-3 py-2 bg-muted rounded-md text-sm flex items-center">
                      WIB
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Note Internal</label>
                <Textarea 
                  value={noteInternal}
                  onChange={(e) => setNoteInternal(e.target.value)}
                  placeholder="Catatan internal (opsional)..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Batal
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading || !problem.trim() || !action.trim()}
              className="flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Menyimpan...' : 'Simpan Update'}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
