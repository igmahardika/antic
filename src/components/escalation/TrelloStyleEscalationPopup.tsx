import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  X, 
  Trash2, 
  Calendar, 
  User, 
  Tag, 
  Clock, 
  MessageSquare, 
  Paperclip,
  Check,
  Shield,
  AlertTriangle,
  Building,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTimeDDMMYYYY, formatDateTimeDDMMYYYYHHMMSS } from '@/lib/utils';
import { useEscalationStore } from '@/store/escalationStore';
import { CodeBadgeClasses, EscalationCode, getCodeColor } from '@/utils/escalation';
import { getOriginalProblemFromHistory } from '@/utils/escalationHelpers';
import type { EscalationHistory } from '@/types/escalation';

interface EscalationCardItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'assigned' | 'in-progress' | 'resolved' | 'closed';
  assignee: string;
  customer: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  category: 'technical' | 'billing' | 'support' | 'security';
  escalationLevel: number;
  escalationCode: string;
  labels?: string[];
  comments?: Array<{
    id: string;
    text: string;
    author: string;
    timestamp: string;
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    size: string;
  }>;
}

interface TrelloStyleEscalationPopupProps {
  escalation: EscalationCardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (escalation: EscalationCardItem) => void;
  onDelete: (id: string) => void;
}

const PriorityColors = {
  low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
};

const CategoryColors = {
  technical: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Shield },
  billing: { bg: 'bg-green-100', text: 'text-green-800', icon: Building },
  support: { bg: 'bg-purple-100', text: 'text-purple-800', icon: MessageSquare },
  security: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertTriangle }
};

const StatusColors = {
  new: { bg: 'bg-gray-100', text: 'text-gray-800' },
  assigned: { bg: 'bg-blue-100', text: 'text-blue-800' },
  'in-progress': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  resolved: { bg: 'bg-green-100', text: 'text-green-800' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-800' }
};

const EscalationLevelColors = {
  1: { bg: 'bg-blue-100', text: 'text-blue-800' },
  2: { bg: 'bg-orange-100', text: 'text-orange-800' },
  3: { bg: 'bg-red-100', text: 'text-red-800' }
};

// Labels in this app represent Escalation Codes; we render them using code colors

export default function TrelloStyleEscalationPopup({
  escalation,
  isOpen,
  onClose,
  onSave,
  onDelete
}: TrelloStyleEscalationPopupProps) {
  const { getHistory } = useEscalationStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<EscalationCardItem>>({});
  const [newComment, setNewComment] = useState('');
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [showDueDateMenu, setShowDueDateMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [escalationHistory, setEscalationHistory] = useState<EscalationHistory[]>([]);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Load escalation history when dialog opens
  useEffect(() => {
    if (isOpen && escalation) {
      loadEscalationHistory();
    }
  }, [isOpen, escalation]);

  // Initialize edit data when escalation changes
  useEffect(() => {
    if (escalation) {
      setEditData({
        title: escalation.title,
        // Note: description is not included as it should not be editable (contains original problem)
        priority: escalation.priority,
        status: escalation.status,
        assignee: escalation.assignee,
        customer: escalation.customer,
        dueDate: escalation.dueDate,
        category: escalation.category,
        escalationLevel: escalation.escalationLevel,
        escalationCode: escalation.escalationCode,
        labels: escalation.labels || [],
        comments: escalation.comments || []
      });
    }
  }, [escalation]);

  // Helper function to extract original problem description from first history row
  const getOriginalProblemDescription = () => {
    return getOriginalProblemFromHistory(escalationHistory, escalation?.description);
  };

  const loadEscalationHistory = async () => {
    if (!escalation) return;
    
    setHistoryLoading(true);
    try {
      const history = await getHistory(escalation.id);
      
      // Sort history by updatedAt in ascending order (oldest first, newest at bottom)
      const sortedHistory = history.sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateA - dateB; // Oldest first
      });
      
      setEscalationHistory(sortedHistory);
    } catch (error) {
      console.error('Failed to load escalation history:', error);
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [editData.title]);

  const handleSave = async () => {
    if (!escalation || !editData.title?.trim()) {
      toast.error('Title is required!');
      return;
    }

    setLoading(true);
    try {
      const updatedEscalation: EscalationCardItem = {
        ...escalation,
        ...editData,
        updatedAt: new Date().toISOString()
      };
      onSave(updatedEscalation);
      setIsEditing(false);
      toast.success('Escalation updated successfully!');
    } catch (error) {
      console.error('Error saving escalation:', error);
      toast.error('Failed to save escalation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!escalation) return;
    
    if (window.confirm('Are you sure you want to delete this escalation card?')) {
      setLoading(true);
      try {
        onDelete(escalation.id);
        onClose();
        toast.success('Escalation deleted successfully!');
      } catch (error) {
        console.error('Error deleting escalation:', error);
        toast.error('Failed to delete escalation');
      } finally {
        setLoading(false);
      }
    }
  };

  const { addHistory } = useEscalationStore();

  const handleAddComment = async () => {
    if (!newComment.trim() || !escalation) return;
    
    try {
      setLoading(true);
      
      // Add comment to escalation history
      await addHistory(
        escalation.id,
        'comment',
        '',
        newComment,
        'updated'
      );
      
      // Reload history to show the new comment
      await loadEscalationHistory();
      
    setNewComment('');
      toast.success('Catatan berhasil ditambahkan');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Gagal menambahkan catatan');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLabel = (labelName: string) => {
    // Remember the last code clicked to use as primary code selection
    setLastClickedCode(labelName);
    setEditData(prev => {
      const currentLabels = prev.labels || [];
      const newLabels = currentLabels.includes(labelName)
        ? currentLabels.filter(l => l !== labelName)
        : [...currentLabels, labelName];
      return { ...prev, labels: newLabels };
    });
  };

  // Track last clicked code to pick as primary code when saving labels
  const [lastClickedCode, setLastClickedCode] = useState<string | null>(null);

  // Quick save helper to persist a single field change from the toolbar panels
  const quickSave = async (patch: Partial<EscalationCardItem>) => {
    if (!escalation) return;
    try {
      setLoading(true);
      // Update local UI instantly for responsiveness
      setEditData(prev => ({ ...prev, ...patch }));
      const updated: EscalationCardItem = {
        ...escalation,
        ...editData,
        ...patch,
        updatedAt: new Date().toISOString()
      } as EscalationCardItem;
      onSave(updated);
      toast.success('Perubahan disimpan');
    } catch (error) {
      console.error('Quick save failed:', error);
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setEditData({});
    setNewComment('');
    onClose();
  };

  if (!isOpen || !escalation) return null;

  const CategoryIcon = CategoryColors[editData.category || 'support'].icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <div className="grid grid-cols-3 h-[90vh]">
          {/* Main Content (Left 2/3) */}
          <div className="col-span-2 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {editData.customer || escalation.customer}
                  </h1>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Top Toolbar - modern Trello actions */}
            <div className="px-6 py-3 border-b bg-gray-50/50">
              <div className="flex flex-wrap items-center gap-2">
                {/* Labels */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowLabelMenu(!showLabelMenu)}>
                    <Tag className="h-3.5 w-3.5 mr-1" /> Labels
                  </Button>
                  {showLabelMenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                      <div className="text-sm font-medium text-gray-700 mb-2">Labels</div>
                      <div className="space-y-1">
                        {Object.values(EscalationCode).map((code) => (
                          <div
                            key={code}
                            className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer"
                            onClick={() => handleToggleLabel(code)}
                          >
                            <div className={`w-4 h-4 rounded ${getCodeColor(code as EscalationCode)}`} />
                            <span className="text-sm">{code}</span>
                            {(editData.labels || []).includes(code) && (
                              <Check className="h-4 w-4 text-green-600 ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setShowLabelMenu(false)}>Batal</Button>
                        <Button size="sm" onClick={async () => { 
                          // Decide primary code:
                          const labels = editData.labels || [];
                          let primary = lastClickedCode || (labels.length === 1 ? labels[0] : undefined);
                          // If current card code is among labels, prefer it
                          if (!primary && escalation && labels.includes(escalation.escalationCode)) {
                            primary = escalation.escalationCode;
                          }
                          await quickSave({ labels, escalationCode: primary || escalation?.escalationCode }); 
                          setShowLabelMenu(false); 
                        }}>Simpan</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowDueDateMenu(!showDueDateMenu)}>
                    <Calendar className="h-3.5 w-3.5 mr-1" /> Dates
                  </Button>
                  {showDueDateMenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                      <div className="text-sm font-medium text-gray-700 mb-2">Atur Due Date</div>
                      <Input
                        type="date"
                        value={editData.dueDate ? new Date(editData.dueDate).toISOString().slice(0,10) : ''}
                        onChange={(e) => {
                          const d = new Date(e.target.value);
                          setEditData(prev => ({ ...prev, dueDate: isNaN(d.getTime()) ? undefined : d.toISOString() }));
                        }}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setShowDueDateMenu(false)}>Batal</Button>
                        <Button size="sm" onClick={async () => { await quickSave({ dueDate: editData.dueDate }); setShowDueDateMenu(false); }}>Simpan</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Members (Assignee) */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}>
                    <User className="h-3.5 w-3.5 mr-1" /> Members
                  </Button>
                  {showAssigneeMenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                      <div className="text-sm font-medium text-gray-700 mb-2">Atur Assignee</div>
                      <Input value={editData.assignee || ''} onChange={(e) => setEditData(prev => ({ ...prev, assignee: e.target.value }))} placeholder="Nama penanggung jawab" />
                      <div className="text-xs text-gray-500 mt-2">Customer</div>
                      <Input value={editData.customer || ''} onChange={(e) => setEditData(prev => ({ ...prev, customer: e.target.value }))} placeholder="Nama customer" className="mt-1" />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setShowAssigneeMenu(false)}>Batal</Button>
                        <Button size="sm" onClick={async () => { await quickSave({ assignee: editData.assignee, customer: editData.customer }); setShowAssigneeMenu(false); }}>Simpan</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowPriorityMenu(!showPriorityMenu)}>
                    <Tag className="h-3.5 w-3.5 mr-1" /> Priority
                  </Button>
                  {showPriorityMenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                      <div className="text-sm font-medium text-gray-700 mb-2">Pilih Priority</div>
                      <div className="space-y-2 text-sm">
                        {['high','medium','low'].map(p => (
                          <label key={p} className="flex items-center gap-2">
                            <input type="radio" name="priority" checked={editData.priority === p} onChange={() => setEditData(prev => ({ ...prev, priority: p as any }))} />
                            <span className="capitalize">{p}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setShowPriorityMenu(false)}>Batal</Button>
                        <Button size="sm" onClick={async () => { await quickSave({ priority: editData.priority }); setShowPriorityMenu(false); }}>Simpan</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Category */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowCategoryMenu(!showCategoryMenu)}>
                    <Shield className="h-3.5 w-3.5 mr-1" /> Category
                  </Button>
                  {showCategoryMenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                      <div className="text-sm font-medium text-gray-700 mb-2">Pilih Category</div>
                      <div className="space-y-2 text-sm">
                        {["technical","billing","support","security"].map(cat => (
                          <label key={cat} className="flex items-center gap-2">
                            <input type="radio" name="category" checked={editData.category === cat} onChange={() => setEditData(prev => ({ ...prev, category: cat as any }))} />
                            <span className="capitalize">{cat}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setShowCategoryMenu(false)}>Batal</Button>
                        <Button size="sm" onClick={async () => { await quickSave({ category: editData.category }); setShowCategoryMenu(false); }}>Simpan</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowStatusMenu(!showStatusMenu)}>
                    <Clock className="h-3.5 w-3.5 mr-1" /> Status
                  </Button>
                  {showStatusMenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                      <div className="text-sm font-medium text-gray-700 mb-2">Ubah Status</div>
                      <div className="space-y-2 text-sm">
                        {["active","closed"].map(st => (
                          <label key={st} className="flex items-center gap-2">
                            <input type="radio" name="status" checked={editData.status === st} onChange={() => setEditData(prev => ({ ...prev, status: st as any }))} />
                            <span className="capitalize">{st}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setShowStatusMenu(false)}>Batal</Button>
                        <Button size="sm" onClick={async () => { 
                          if (editData.status === 'closed') {
                            // close escalation: card will move to Escalation Data list
                            await quickSave({ status: 'closed' as any });
                          } else {
                            await quickSave({ status: 'active' as any });
                          }
                          setShowStatusMenu(false); 
                        }}>Simpan</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Level */}
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setShowLevelMenu(!showLevelMenu)}>
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Level
                  </Button>
                  {showLevelMenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                      <div className="text-sm font-medium text-gray-700 mb-2">Pilih Level</div>
                      <div className="space-y-2 text-sm">
                        {[1,2,3].map(lv => (
                          <label key={lv} className="flex items-center gap-2">
                            <input type="radio" name="level" checked={editData.escalationLevel === lv} onChange={() => setEditData(prev => ({ ...prev, escalationLevel: lv }))} />
                            <span>Level {lv}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setShowLevelMenu(false)}>Batal</Button>
                        <Button size="sm" onClick={async () => { await quickSave({ escalationLevel: editData.escalationLevel }); setShowLevelMenu(false); }}>Simpan</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attachments - placeholder */}
                <Button variant="outline" size="sm">
                  <Paperclip className="h-3.5 w-3.5 mr-1" /> Attachment
                </Button>
              </div>
            </div>

            {/* Labels and Meta Info */}
            <div className="p-6 pb-4">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {/* Labels */}
                {(editData.labels || []).map((label) => (
                  <Badge
                    key={label}
                    className={`text-xs px-2 py-1 ${getCodeColor(label as EscalationCode)} text-white`}
                  >
                    {label}
                  </Badge>
                ))}
                
                {/* Category Badge */}
                <Badge className={`text-xs ${CategoryColors[editData.category || 'support'].bg} ${CategoryColors[editData.category || 'support'].text} flex items-center gap-1`}>
                  <CategoryIcon className="h-3 w-3" />
                  {editData.category?.toUpperCase()}
                </Badge>
                
                {/* Priority Badge */}
                <Badge className={`text-xs ${PriorityColors[editData.priority || 'medium'].bg} ${PriorityColors[editData.priority || 'medium'].text}`}>
                  {editData.priority?.toUpperCase()}
                </Badge>

                {/* Status Badge */}
                <Badge className={`text-xs ${StatusColors[editData.status || 'new'].bg} ${StatusColors[editData.status || 'new'].text}`}>
                  {editData.status?.replace('-', ' ').toUpperCase()}
                </Badge>

                {/* Escalation Level Badge */}
                <Badge className={`text-xs ${EscalationLevelColors[editData.escalationLevel as keyof typeof EscalationLevelColors]?.bg || 'bg-gray-100'} ${EscalationLevelColors[editData.escalationLevel as keyof typeof EscalationLevelColors]?.text || 'text-gray-800'}`}>
                  LEVEL {editData.escalationLevel}
                </Badge>
              </div>

              {/* Meta Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>Customer: {editData.customer || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Assignee: {editData.assignee || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {editData.dueDate ? formatDateTimeDDMMYYYY(editData.dueDate) : 'No due date'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Created: {formatDateTimeDDMMYYYY(escalation.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Problem Description */}
            <div className="px-6 pb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Problem Description</h3>
              <div className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                {getOriginalProblemDescription()}
                </div>
              <p className="text-xs text-gray-500 mt-2">
                * Problem description shows the original issue from the first report (baris pertama penyebab dari history)
              </p>
            </div>

            {/* Attachments */}
            {(editData.attachments || []).length > 0 && (
              <div className="px-6 pb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
                <div className="space-y-2">
                  {editData.attachments?.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <Paperclip className="h-4 w-4 text-gray-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{attachment.name}</div>
                        <div className="text-xs text-gray-500">{attachment.size}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Penanganan */}
            <div className="px-6 pb-8">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-gray-700" />
                <h3 className="text-sm font-medium text-gray-700">History Penanganan</h3>
              </div>
              
              {/* Loading State */}
              {historyLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-500">Loading history...</span>
                </div>
              )}
              
              {/* History Items */}
              {!historyLoading && (
              <div className="space-y-3 mb-4">
                  {escalationHistory
                    .filter(item => !(item.action === 'created' && item.field !== 'initial_list'))
                    .map((item) => {
                      // Function to get the code that was active at this specific time
                      const getCodeAtTime = (item: EscalationHistory) => {
                        // Find the most recent code change before or at this item's time
                        const codeChanges = escalationHistory
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
                        
                        return 'CODE-OS'; // Default code
                      };
                      
                      const currentCode = getCodeAtTime(item);
                      
                      // Show combined updates (new format)
                      if (item.field === 'problem_action_update') {
                        try {
                          const updateData = JSON.parse(item.newValue);
                          return (
                            <div key={item.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {item.updatedBy.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={`text-xs font-medium ${CodeBadgeClasses[currentCode as EscalationCode] || 'bg-muted text-muted-foreground border-border'}`}>
                                      {currentCode}
                                    </Badge>
                                    <span className="text-xs text-gray-500">Update Penanganan</span>
                                  </div>
                                  
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="font-medium text-gray-700">Penyebab:</span>
                                      <div className="text-gray-900 whitespace-pre-wrap break-words mt-1">
                                        {updateData.problem || '-'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-medium text-gray-700">Penanganan:</span>
                                      <div className="text-gray-900 whitespace-pre-wrap break-words mt-1">
                                        {updateData.action || '-'}
                                      </div>
                                    </div>
                                    {updateData.noteInternal && (
                                      <div>
                                        <span className="font-medium text-gray-700">Note Internal:</span>
                                        <div className="text-gray-900 whitespace-pre-wrap break-words mt-1">
                                          {updateData.noteInternal}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200">
                                    {item.updatedBy} • {formatDateTimeDDMMYYYYHHMMSS(item.updatedAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        } catch (error) {
                          console.error('Error parsing update data:', error);
                          return null;
                        }
                      }
                      
                      // Show comments
                      if (item.field === 'comment') {
                        return (
                          <div key={item.id} className="flex gap-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {item.updatedBy.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                                  {item.newValue}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  {item.updatedBy} • {formatDateTimeDDMMYYYYHHMMSS(item.updatedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                        );
                      }
                      
                      return null;
                    })}
                  
                  {/* Empty State */}
                  {escalationHistory.filter(item => !(item.action === 'created' && item.field !== 'initial_list')).length === 0 && (
                    <div className="text-center py-6">
                      <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Belum ada history penanganan</p>
                      <p className="text-xs text-gray-400 mt-1">History akan muncul setelah ada update</p>
                    </div>
                  )}
              </div>
              )}

            {/* (comments moved to right panel) */}
            </div>
          </div>

          {/* Right Panel - Comments & Activity */}
          <div className="col-span-1 border-l bg-white overflow-y-auto">
            <div className="p-4">
              <div className="text-sm font-medium text-gray-700 mb-3">Comments and activity</div>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>Send</Button>
              </div>

              {/* Recent comments */}
              <div className="mt-6 space-y-3">
                {escalationHistory.filter(h => h.field === 'comment').slice().reverse().map(c => (
                  <div key={c.id} className="border rounded p-3 bg-gray-50">
                    <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">{c.newValue}</div>
                    <div className="text-xs text-gray-500 mt-2">{c.updatedBy} • {formatDateTimeDDMMYYYYHHMMSS(c.updatedAt)}</div>
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="mt-6 space-y-2">
                  <Button onClick={handleSave} disabled={loading} className="w-full">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="w-full">
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
