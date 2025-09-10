// Shared escalation types and utilities
export enum EscalationStatus { 
  Active = 'active', 
  Closed = 'closed' 
}

export enum EscalationCode { 
  OS = 'CODE-OS', 
  AS = 'CODE-AS', 
  BS = 'CODE-BS', 
  DCS = 'CODE-DCS', 
  EOS = 'CODE-EOS', 
  IPC = 'CODE-IPC' 
}

export type Escalation = {
  id: string;
  caseNumber?: string; // Case number for easy reference
  customerId: string;
  customerName: string;
  problem: string;
  action: string;
  recommendation: string;
  code: EscalationCode;
  status: EscalationStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  closedAt?: string; // ISO
  history?: EscalationHistory[];
};

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

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export function computePriority(createdAtISO: string): Priority {
  const diffHours = (Date.now() - new Date(createdAtISO).getTime()) / 36e5;
  if (diffHours > 72) return 'critical';
  if (diffHours > 24) return 'high';
  if (diffHours > 8) return 'medium';
  return 'low';
}

export function humanizeActiveDuration(createdAtISO: string): string {
  const ms = Date.now() - new Date(createdAtISO).getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}

// Centralized theme map
export const CodeBadgeClasses: Record<EscalationCode, string> = {
  [EscalationCode.OS]: 'bg-red-500 text-white border-red-500',
  [EscalationCode.AS]: 'bg-orange-500 text-white border-orange-500',
  [EscalationCode.BS]: 'bg-yellow-500 text-white border-yellow-500',
  [EscalationCode.DCS]: 'bg-blue-500 text-white border-blue-500',
  [EscalationCode.EOS]: 'bg-purple-500 text-white border-purple-500',
  [EscalationCode.IPC]: 'bg-green-500 text-white border-green-500',
};

export const CodeHeaderClasses: Record<EscalationCode, string> = {
  [EscalationCode.OS]: 'bg-blue-500 text-white',
  [EscalationCode.AS]: 'bg-green-500 text-white',
  [EscalationCode.BS]: 'bg-yellow-500 text-white',
  [EscalationCode.DCS]: 'bg-purple-500 text-white',
  [EscalationCode.EOS]: 'bg-red-500 text-white',
  [EscalationCode.IPC]: 'bg-indigo-500 text-white',
};

export const PriorityDotClasses: Record<Priority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

export const PriorityBorderClasses: Record<Priority, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

// Utility function to get code color for statistics
export function getCodeColor(code: EscalationCode): string {
  const colors: Record<EscalationCode, string> = {
    [EscalationCode.OS]: 'bg-red-500',
    [EscalationCode.AS]: 'bg-orange-500',
    [EscalationCode.BS]: 'bg-yellow-500',
    [EscalationCode.DCS]: 'bg-blue-500',
    [EscalationCode.EOS]: 'bg-purple-500',
    [EscalationCode.IPC]: 'bg-green-500',
  };
  return colors[code] || 'bg-gray-500';
}

// CSV Export utility
export function exportEscalationsToCSV(escalations: Escalation[], filename?: string): void {
  const headers = ['ID', 'Customer', 'Code', 'Status', 'Created At', 'Closed At', 'Problem'];
  const toRow = (r: Escalation) => [
    r.id,
    r.customerName,
    r.code,
    r.status,
    new Date(r.createdAt).toISOString(),
    r.closedAt ? new Date(r.closedAt).toISOString() : '',
    (r.problem || '').replace(/\s+/g, ' ').trim()
  ];

  const csv = [
    '\uFEFF' + headers.join(','), // BOM for Excel
    ...escalations.map(toRow).map(cols => cols.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `escalations_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
