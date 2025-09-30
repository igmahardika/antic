import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
}

interface EscalationCardEditDialogProps {
  escalation: EscalationCardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (escalation: EscalationCardItem) => void;
  onDelete: (id: string) => void;
}

export default function EscalationCardEditDialog({
  escalation,
  isOpen,
  onClose,
  onSave,
  onDelete
}: EscalationCardEditDialogProps) {
  const [formData, setFormData] = useState<Partial<EscalationCardItem>>({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when escalation changes
  useEffect(() => {
    if (escalation) {
      setFormData({
        id: escalation.id,
        title: escalation.title,
        description: escalation.description,
        priority: escalation.priority,
        status: escalation.status,
        assignee: escalation.assignee,
        customer: escalation.customer,
        dueDate: escalation.dueDate.split('T')[0], // Convert to date input format
        category: escalation.category,
        escalationLevel: escalation.escalationLevel
      });
    } else {
      setFormData({});
    }
  }, [escalation]);

  const handleSave = async () => {
    if (!formData.title?.trim() || !formData.description?.trim()) {
      toast.error('Title and Description are required!');
      return;
    }

    setLoading(true);
    try {
      const updatedEscalation: EscalationCardItem = {
        id: formData.id || `esc-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        priority: formData.priority || 'medium',
        status: formData.status || 'new',
        assignee: formData.assignee || 'Unassigned',
        customer: formData.customer || 'New Customer',
        dueDate: new Date(formData.dueDate || new Date()).toISOString(),
        createdAt: escalation?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: formData.category || 'support',
        escalationLevel: formData.escalationLevel || 1
      };

      onSave(updatedEscalation);
      toast.success('Escalation card saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving escalation:', error);
      toast.error('Failed to save escalation card');
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
        toast.success('Escalation card deleted successfully!');
        onClose();
      } catch (error) {
        console.error('Error deleting escalation:', error);
        toast.error('Failed to delete escalation card');
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
            {escalation ? 'Edit Escalation Card' : 'Add New Escalation Card'}
          </DialogTitle>
          <DialogDescription>
            {escalation ? 'Update escalation card information' : 'Create a new escalation card'}
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
                placeholder="Enter escalation title"
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
                placeholder="Enter escalation description"
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* Customer and Assignee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Customer
              </label>
              <Input
                value={formData.customer || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                placeholder="Enter customer name"
                className="w-full"
              />
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

          {/* Category and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Category
              </label>
              <Select
                value={formData.category || 'support'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
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

          {/* Status and Escalation Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status
              </label>
              <Select
                value={formData.status || 'new'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Escalation Level
              </label>
              <Select
                value={formData.escalationLevel?.toString() || '1'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, escalationLevel: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select escalation level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                </SelectContent>
              </Select>
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
              {escalation && (
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
