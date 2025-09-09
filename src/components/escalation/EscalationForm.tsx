import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useEscalationStore } from '@/store/escalationStore';
import type { EscalationCode } from '@/types/escalation';
import { fetchCustomers } from '@/utils/customerSource';

const CODES: EscalationCode[] = ['CODE-OS','CODE-AS','CODE-BS','CODE-DCS','CODE-EOS','CODE-IPC'];

export default function EscalationForm() {
  const add = useEscalationStore(s => s.add);
  const [customers, setCustomers] = useState<{id:string;name:string}[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [problem, setProblem] = useState('');
  const [action, setAction] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [code, setCode] = useState<EscalationCode>('CODE-OS');

  useEffect(() => { fetchCustomers().then(setCustomers); }, []);

  const selectedName = customers.find(c=>c.id===customerId)?.name || '';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!customerId || !problem.trim()) return;
    await add({ customerId, customerName: selectedName, problem, action, recommendation, code });
    setProblem(''); setAction(''); setRecommendation('');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  );
}
