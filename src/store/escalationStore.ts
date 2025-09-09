import { nanoid } from 'nanoid';
import { create } from 'zustand';
import type { Escalation, EscalationStatus, EscalationHistory } from '@/types/escalation';
import { escalationDB, lsGet, lsSet } from '@/lib/db/escalation';

interface State {
  rows: Escalation[];
  loading: boolean;
}

interface Actions {
  load: () => Promise<void>;
  add: (payload: Omit<Escalation, 'id'|'status'|'createdAt'|'updatedAt'> & { status?: EscalationStatus }) => Promise<void>;
  update: (id: string, patch: Partial<Escalation>) => Promise<void>;
  close: (id: string) => Promise<void>;
  getHistory: (escalationId: string) => Promise<EscalationHistory[]>;
  addHistory: (escalationId: string, field: string, oldValue: string, newValue: string, action: 'created' | 'updated' | 'closed') => Promise<void>;
}

export const useEscalationStore = create<State & Actions>((set, get) => ({
  rows: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      // Ensure database is ready
      await escalationDB.open();
      const rows = await escalationDB.escalations.toArray();
      set({ rows, loading: false });
    } catch (error) {
      console.warn('Failed to load from IndexedDB, using localStorage fallback:', error);
      set({ rows: lsGet(), loading: false });
    }
  },
  add: async (payload) => {
    const now = new Date().toISOString();
    const row: Escalation = { id: nanoid(), status: payload.status ?? 'active', createdAt: now, updatedAt: now, ...payload } as Escalation;
    try {
      // Ensure database is ready
      await escalationDB.open();
      await escalationDB.escalations.add(row);
      // Add creation history
      await get().addHistory(row.id, 'escalation', '', 'created', 'created');
      set({ rows: [...get().rows, row] });
    } catch (error) {
      console.warn('Failed to add to IndexedDB, using localStorage fallback:', error);
      const rows = [...get().rows, row];
      set({ rows }); lsSet(rows);
    }
  },
  update: async (id, patch) => {
    const currentRow = get().rows.find(r => r.id === id);
    if (!currentRow) return;

    const now = new Date().toISOString();
    const rows = get().rows.map(r => r.id === id ? { ...r, ...patch, updatedAt: now } : r);
    
    try {
      await escalationDB.escalations.update(id, { ...patch, updatedAt: now });
      
      // Track changes in history
      const user = JSON.parse(localStorage.getItem('user') || '{"username":"System"}');
      for (const [field, newValue] of Object.entries(patch)) {
        if (field !== 'updatedAt' && currentRow[field as keyof Escalation] !== newValue) {
          await get().addHistory(id, field, String(currentRow[field as keyof Escalation] || ''), String(newValue), 'updated');
        }
      }
      
      set({ rows });
    } catch {
      set({ rows }); lsSet(rows);
    }
  },
  close: async (id) => {
    const currentRow = get().rows.find(r => r.id === id);
    if (!currentRow) return;

    const now = new Date().toISOString();
    const rows = get().rows.map(r => r.id === id ? { ...r, status: 'closed', updatedAt: now } : r);
    
    try {
      await escalationDB.escalations.update(id, { status: 'closed', updatedAt: now });
      // Add close history
      await get().addHistory(id, 'status', 'active', 'closed', 'closed');
      set({ rows });
    } catch {
      set({ rows }); lsSet(rows);
    }
  },
  getHistory: async (escalationId) => {
    try {
      return await escalationDB.escalationHistory
        .where('escalationId')
        .equals(escalationId)
        .orderBy('updatedAt')
        .reverse()
        .toArray();
    } catch {
      return [];
    }
  },
  addHistory: async (escalationId, field, oldValue, newValue, action) => {
    const now = new Date().toISOString();
    const user = JSON.parse(localStorage.getItem('user') || '{"username":"System"}');
    
    const historyEntry: EscalationHistory = {
      id: nanoid(),
      escalationId,
      field,
      oldValue,
      newValue,
      updatedBy: user.username || 'System',
      updatedAt: now,
      action
    };

    try {
      await escalationDB.escalationHistory.add(historyEntry);
    } catch (error) {
      console.error('Failed to add history:', error);
    }
  }
}));
