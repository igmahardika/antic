// Re-export from shared utilities for backward compatibility
export { 
  EscalationCode, 
  EscalationStatus, 
  Escalation, 
  EscalationHistory,
  type Priority 
} from '@/utils/escalation';

export interface CustomerOption { id: string; name: string; }
