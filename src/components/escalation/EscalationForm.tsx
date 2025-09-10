import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useEscalationStore } from '@/store/escalationStore';
import { EscalationCode } from '@/utils/escalation';
import { fetchCustomers } from '@/utils/customerSource';

const CODES: EscalationCode[] = [
  EscalationCode.OS,
  EscalationCode.AS,
  EscalationCode.BS,
  EscalationCode.DCS,
  EscalationCode.EOS,
  EscalationCode.IPC
];

interface EscalationFormProps {
  onSuccess?: () => void;
  escalation?: any; // For edit mode
}

export default function EscalationForm({ onSuccess, escalation }: EscalationFormProps) {
  const add = useEscalationStore(s => s.add);
  const update = useEscalationStore(s => s.update);
  const isEditMode = !!escalation;
  const [customers, setCustomers] = useState<{id:string;name:string}[]>([]);
  const [caseNumber, setCaseNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [problem, setProblem] = useState('');
  const [action, setAction] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [code, setCode] = useState<EscalationCode>(EscalationCode.OS);

  useEffect(() => { fetchCustomers().then(setCustomers); }, []);

  // Populate form with existing data in edit mode
  useEffect(() => {
    if (escalation) {
      setCaseNumber(escalation.caseNumber || '');
      setCustomerId(escalation.customerId || '');
      setProblem(escalation.problem || '');
      setAction(escalation.action || '');
      setRecommendation(escalation.recommendation || '');
      setCode(escalation.code || EscalationCode.OS);
    }
  }, [escalation]);

  const selectedName = customers.find(c=>c.id===customerId)?.name || '';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!customerId || !problem.trim()) return;
    
    if (isEditMode && escalation) {
      // Update existing escalation
      await update(escalation.id, { 
        caseNumber,
        customerId, 
        customerName: selectedName, 
        problem, 
        action, 
        recommendation, 
        code 
      });
    } else {
      // Create the escalation entry
      const escalationId = await add({ caseNumber, customerId, customerName: selectedName, problem, action, recommendation, code });
    
    // Create history entry as a list format for the first row
    const { addHistory } = useEscalationStore.getState();
    const now = new Date().toISOString();
    const user = JSON.parse(localStorage.getItem('user') || '{"username":"System"}');
    
    // Create a list-formatted history entry as the primary first entry
    const listEntry = {
      id: `list-${Date.now()}`,
      escalationId: escalationId,
      field: 'initial_list',
      oldValue: '',
      newValue: JSON.stringify({
        problem: problem,
        action: action,
        recommendation: recommendation,
        code: code,
        format: 'list'
      }),
      updatedBy: user.username || 'System',
      updatedAt: now,
      action: 'created' as const
    };
    
      // Add the list-formatted history entry as the primary entry
      await addHistory(escalationId, 'initial_list', '', listEntry.newValue, 'created');
    }
    
    if (!isEditMode) {
      setCaseNumber(''); setProblem(''); setAction(''); setRecommendation('');
      setCustomerId(''); // Reset customer selection
    }
    onSuccess?.(); // Call success callback
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Nomor Case</Label>
          <Input 
            value={caseNumber} 
            onChange={(e) => setCaseNumber(e.target.value)} 
            placeholder="Masukkan nomor case"
          />
        </div>
        <div>
          <Label>Customer</Label>
          <SearchableSelect
            options={customers}
            value={customerId}
            onValueChange={setCustomerId}
            placeholder="Pilih customer"
          />
        </div>
        <div>
          <Label>Code Eskalasi</Label>
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
      </div>

      <div>
        <Label>Problem</Label>
        <Textarea value={problem} onChange={(e)=>setProblem(e.target.value)} placeholder="Kendala yang terjadi"/>
      </div>
      <div>
        <Label>Action</Label>
        <Textarea value={action} onChange={(e)=>setAction(e.target.value)} placeholder="Action terakhir yang dilakukan"/>
      </div>
      <div>
        <Label>Rekomendasi</Label>
        <Textarea value={recommendation} onChange={(e)=>setRecommendation(e.target.value)} placeholder="Rekomendasi penanganan"/>
      </div>

      <div className="pt-2">
        <Button type="submit">{isEditMode ? 'Update Escalation' : 'Simpan'}</Button>
      </div>
    </form>
  );
}
