export type EscalationCode = 'CODE-OS'|'CODE-AS'|'CODE-BS'|'CODE-DCS'|'CODE-EOS'|'CODE-IPC';
export type EscalationStatus = 'active'|'closed';

export interface EscalationHistory {
  id: string;
  escalationId: string;
  field: string;
  oldValue: string;
  newValue: string;
  updatedBy: string;
  updatedAt: string; // ISO
  action: 'created' | 'updated' | 'closed';
}

export interface Escalation {
  id: string;
  customerId: string;
  customerName: string;
  problem: string;
  action: string;
  recommendation: string;
  code: EscalationCode;
  status: EscalationStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  history?: EscalationHistory[];
}

export interface CustomerOption { id: string; name: string; }
