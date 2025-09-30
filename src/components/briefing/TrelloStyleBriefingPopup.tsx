import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  X, 
  Edit, 
  Trash2, 
  Calendar, 
  User, 
  Tag, 
  Clock, 
  MessageSquare, 
  Paperclip,
  Check,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';

interface BriefingItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  assignee: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  category: 'shift-pagi' | 'shift-sore' | 'shift-malam' | 'monitoring' | 'request';
  labels?: string[];
  comments?: Array<{
    id: string;
    text: string;
    author: string;
    timestamp: string;
  }>;
}

interface TrelloStyleBriefingPopupProps {
  briefing: BriefingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (briefing: BriefingItem) => void;
  onDelete: (id: string) => void;
}

const PriorityColors = {
  low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
};

const CategoryColors = {
  'shift-pagi': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'shift-sore': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'shift-malam': { bg: 'bg-blue-100', text: 'text-blue-800' },
  monitoring: { bg: 'bg-green-100', text: 'text-green-800' },
  request: { bg: 'bg-purple-100', text: 'text-purple-800' }
};

const LabelColors = [
  { name: 'Frontend', color: 'bg-blue-500' },
  { name: 'Backend', color: 'bg-green-500' },
  { name: 'Design', color: 'bg-purple-500' },
  { name: 'Bug', color: 'bg-red-500' },
  { name: 'Feature', color: 'bg-yellow-500' },
  { name: 'Urgent', color: 'bg-orange-500' }
];

export default function TrelloStyleBriefingPopup({
  briefing,
  isOpen,
  onClose,
  onSave,
  onDelete
}: TrelloStyleBriefingPopupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<BriefingItem>>({});
  const [newComment, setNewComment] = useState('');
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [showDueDateMenu, setShowDueDateMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Initialize edit data when briefing changes
  useEffect(() => {
    if (briefing) {
      setEditData({
        title: briefing.title,
        description: briefing.description,
        priority: briefing.priority,
        status: briefing.status,
        assignee: briefing.assignee,
        dueDate: briefing.dueDate,
        category: briefing.category,
        labels: briefing.labels || []
      });
    }
  }, [briefing]);

  // Auto-resize title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
    }
  }, [editData.title]);

  const handleSave = async () => {
    if (!briefing || !editData.title?.trim()) {
      toast.error('Title is required!');
      return;
    }

    setLoading(true);
    try {
      const updatedBriefing: BriefingItem = {
        ...briefing,
        ...editData,
        updatedAt: new Date().toISOString()
      };
      onSave(updatedBriefing);
      setIsEditing(false);
      toast.success('Briefing updated successfully!');
    } catch (error) {
      console.error('Error saving briefing:', error);
      toast.error('Failed to save briefing');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!briefing) return;
    
    if (window.confirm('Are you sure you want to delete this briefing?')) {
      setLoading(true);
      try {
        onDelete(briefing.id);
        onClose();
        toast.success('Briefing deleted successfully!');
      } catch (error) {
        console.error('Error deleting briefing:', error);
        toast.error('Failed to delete briefing');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !briefing) return;
    
    const comment = {
      id: `comment-${Date.now()}`,
      text: newComment,
      author: 'Current User', // In real app, get from auth context
      timestamp: new Date().toISOString()
    };
    
    setEditData(prev => ({
      ...prev,
      comments: [...(prev.comments || []), comment]
    }));
    setNewComment('');
  };

  const handleToggleLabel = (labelName: string) => {
    setEditData(prev => {
      const currentLabels = prev.labels || [];
      const newLabels = currentLabels.includes(labelName)
        ? currentLabels.filter(l => l !== labelName)
        : [...currentLabels, labelName];
      return { ...prev, labels: newLabels };
    });
  };

  const handleClose = () => {
    setIsEditing(false);
    setEditData({});
    setNewComment('');
    onClose();
  };

  if (!isOpen || !briefing) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex h-full">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <Textarea
                      ref={titleRef}
                      value={editData.title || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                      className="text-xl font-semibold border-none p-0 resize-none focus:ring-0 min-h-[32px]"
                      placeholder="Enter briefing title..."
                      autoFocus
                    />
                  ) : (
                    <h1 className="text-xl font-semibold text-gray-900">{briefing.title}</h1>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
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

            {/* Labels and Meta Info */}
            <div className="p-6 pb-4">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {/* Labels */}
                {(editData.labels || []).map((label) => {
                  const labelColor = LabelColors.find(l => l.name === label);
                  return (
                    <Badge
                      key={label}
                      className={`${labelColor?.color || 'bg-gray-500'} text-white text-xs px-2 py-1`}
                    >
                      {label}
                    </Badge>
                  );
                })}
                
                {/* Category Badge */}
                <Badge className={`text-xs ${CategoryColors[editData.category || 'request'].bg} ${CategoryColors[editData.category || 'request'].text}`}>
                  {editData.category?.replace('-', ' ').toUpperCase()}
                </Badge>
                
                {/* Priority Badge */}
                <Badge className={`text-xs ${PriorityColors[editData.priority || 'medium'].bg} ${PriorityColors[editData.priority || 'medium'].text}`}>
                  {editData.priority?.toUpperCase()}
                </Badge>
              </div>

              {/* Meta Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
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
                  <span>Status: {editData.status?.replace('-', ' ').toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="px-6 pb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              {isEditing ? (
                <Textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-[100px] resize-none"
                  placeholder="Add a more detailed description..."
                />
              ) : (
                <div className="text-gray-600 whitespace-pre-wrap">
                  {briefing.description || 'No description provided'}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="px-6 pb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Comments</h3>
              
              {/* Existing Comments */}
              <div className="space-y-3 mb-4">
                {(editData.comments || []).map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {comment.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm text-gray-900">{comment.text}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {comment.author} • {formatDateTimeDDMMYYYY(comment.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  U
                </div>
                <div className="flex-1">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="min-h-[80px] resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Add to card</h3>
            
            <div className="space-y-2">
              {/* Labels */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-600"
                  onClick={() => setShowLabelMenu(!showLabelMenu)}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Labels
                </Button>
                {showLabelMenu && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10">
                    <div className="text-sm font-medium text-gray-700 mb-2">Labels</div>
                    <div className="space-y-1">
                      {LabelColors.map((label) => (
                        <div
                          key={label.name}
                          className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => handleToggleLabel(label.name)}
                        >
                          <div className={`w-4 h-4 rounded ${label.color}`} />
                          <span className="text-sm">{label.name}</span>
                          {(editData.labels || []).includes(label.name) && (
                            <Check className="h-4 w-4 text-green-600 ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-600"
                onClick={() => setShowDueDateMenu(!showDueDateMenu)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Due Date
              </Button>

              {/* Assignee */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-600"
                onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
              >
                <User className="h-4 w-4 mr-2" />
                Assignee
              </Button>

              {/* Priority */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-600"
                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              >
                <Tag className="h-4 w-4 mr-2" />
                Priority
              </Button>

              {/* Category */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-600"
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Category
              </Button>

              {/* Attachments */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-600"
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Attachments
              </Button>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="mt-6 space-y-2">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
