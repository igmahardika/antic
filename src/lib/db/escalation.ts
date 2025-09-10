import Dexie, { Table } from 'dexie';
import type { Escalation, EscalationHistory } from '@/types/escalation';

class EscalationDB extends Dexie {
  escalations!: Table<Escalation, string>;
  escalationHistory!: Table<EscalationHistory, string>;
  constructor() {
    super('antic-escalation-db');
    this.version(1).stores({
      escalations: 'id, status, code, customerId, createdAt, updatedAt'
    });
    this.version(2).stores({
      escalations: 'id, status, code, customerId, createdAt, updatedAt',
      escalationHistory: 'id, escalationId, field, updatedAt, action'
    });
    
    this.version(3).stores({
      escalations: 'id, status, code, customerId, createdAt, updatedAt',
      escalationHistory: 'id, escalationId, field, updatedAt, action, updatedBy'
    });
    
    // Handle database upgrade conflicts
    this.on('versionchange', () => {
      this.close();
    });
  }
}

export const escalationDB = new EscalationDB();

// Fallback localStorage adapter (if Dexie fails)
export const escalationLSKey = 'antic-escalations';
export function lsGet(): Escalation[] {
  try { return JSON.parse(localStorage.getItem(escalationLSKey) || '[]'); } catch { return []; }
}
export function lsSet(rows: Escalation[]) {
  localStorage.setItem(escalationLSKey, JSON.stringify(rows));
}
