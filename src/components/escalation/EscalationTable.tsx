import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEscalationStore } from '@/store/escalationStore';
import type { Escalation } from '@/types/escalation';
import EscalationDetailPopup from './EscalationDetailPopup';
import { Eye } from 'lucide-react';

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
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Problem</th>
              <th className="p-2 text-left">Action</th>
              <th className="p-2 text-left">Rekomendasi</th>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Updated</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => <Row key={row.id} row={row} onUpdate={update} onClose={close} mode={mode} />)}
            {data.length===0 && (
              <tr><td className="p-3" colSpan={8}>Tidak ada data</td></tr>
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
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [problem, setProblem] = useState(row.problem);
  const [action, setAction] = useState(row.action);
  const [recommendation, setRecommendation] = useState(row.recommendation);

  const handleSave = async () => {
    await onUpdate(row.id, { problem, action, recommendation });
    setOpen(false);
  };

  const handleClose = async () => {
    await onClose(row.id);
  };

  return (
    <tr className="border-t hover:bg-muted/50">
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
            onClick={() => setDetailOpen(true)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            Detail
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">Edit</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Escalation - {row.customerName}</DialogTitle>
                <DialogDescription>
                  Update informasi eskalasi untuk customer ini
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Problem</Label>
                  <Textarea value={problem} onChange={(e)=>setProblem(e.target.value)} />
                </div>
                <div>
                  <Label>Action</Label>
                  <Textarea value={action} onChange={(e)=>setAction(e.target.value)} />
                </div>
                <div>
                  <Label>Rekomendasi</Label>
                  <Textarea value={recommendation} onChange={(e)=>setRecommendation(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {mode === 'active' && (
            <Button size="sm" variant="destructive" onClick={handleClose}>Close</Button>
          )}
        </div>
        
        {/* Detail Popup */}
        <EscalationDetailPopup
          escalation={row}
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      </td>
    </tr>
  );
}
