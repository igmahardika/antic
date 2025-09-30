import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
  category: 'meeting' | 'announcement' | 'task' | 'reminder';
}

interface BriefingEditDialogProps {
  briefing: BriefingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (briefing: BriefingItem) => void;
  onDelete: (id: string) => void;
}

export default function BriefingEditDialog({
  briefing,
  isOpen,
  onClose,
  onSave,
  onDelete
}: BriefingEditDialogProps) {
  const [formData, setFormData] = useState<Partial<BriefingItem>>({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when briefing changes
  useEffect(() => {
    if (briefing) {
      setFormData({
        id: briefing.id,
        title: briefing.title,
        description: briefing.description,
        priority: briefing.priority,
        status: briefing.status,
        assignee: briefing.assignee,
        dueDate: briefing.dueDate.split('T')[0], // Convert to date input format
        category: briefing.category
      });
    } else {
      setFormData({});
    }
  }, [briefing]);

  const handleSave = async () => {
    if (!formData.title?.trim() || !formData.description?.trim()) {
      toast.error('Title and Description are required!');
      return;
    }

    setLoading(true);
    try {
      const updatedBriefing: BriefingItem = {
        id: formData.id || `brief-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        priority: formData.priority || 'medium',
        status: formData.status || 'pending',
        assignee: formData.assignee || 'Unassigned',
        dueDate: new Date(formData.dueDate || new Date()).toISOString(),
        createdAt: briefing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: formData.category || 'task'
      };

      onSave(updatedBriefing);
      toast.success('Briefing saved successfully!');
      onClose();
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
        toast.success('Briefing deleted successfully!');
        onClose();
      } catch (error) {
        console.error('Error deleting briefing:', error);
        toast.error('Failed to delete briefing');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    setFormData({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {briefing ? 'Edit Briefing' : 'Add New Briefing'}
          </DialogTitle>
          <DialogDescription>
            {briefing ? 'Update briefing information' : 'Create a new briefing item'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Title *
              </label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter briefing title"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Description *
              </label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter briefing description"
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Category
              </label>
              <Select
                value={formData.category || 'task'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Priority
              </label>
              <Select
                value={formData.priority || 'medium'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status and Assignee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status
              </label>
              <Select
                value={formData.status || 'pending'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Assignee
              </label>
              <Input
                value={formData.assignee || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                placeholder="Enter assignee name"
                className="w-full"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Due Date
            </label>
            <Input
              type="date"
              value={formData.dueDate || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-border">
            <div>
              {briefing && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading} className="flex items-center gap-2">
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
