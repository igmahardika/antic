import type { EscalationHistory } from '@/types/escalation';

/**
 * Extract the original problem description from the first history row (initial_list)
 * This ensures we always show the original problem description that was reported
 * when the escalation was first created, not any subsequent updates.
 */
export const getOriginalProblemFromHistory = (
  history: EscalationHistory[], 
  fallbackDescription?: string
): string => {
  if (!history || history.length === 0) {
    return fallbackDescription || 'No problem description provided';
  }
  
  // Find the initial_list entry which contains the original problem
  const initialEntry = history.find(item => item.field === 'initial_list');
  if (initialEntry) {
    try {
      const initialData = JSON.parse(initialEntry.newValue);
      return initialData.problem || fallbackDescription || 'No problem description provided';
    } catch (error) {
      console.error('Error parsing initial history data:', error);
    }
  }
  
  // Fallback to provided description if no initial_list found
  return fallbackDescription || 'No problem description provided';
};

/**
 * Extract the original action from the first history row (initial_list)
 * This gets the original action/penanganan that was first reported
 */
export const getOriginalActionFromHistory = (
  history: EscalationHistory[], 
  fallbackAction?: string
): string => {
  if (!history || history.length === 0) {
    return fallbackAction || 'No action provided';
  }
  
  // Find the initial_list entry which contains the original action
  const initialEntry = history.find(item => item.field === 'initial_list');
  if (initialEntry) {
    try {
      const initialData = JSON.parse(initialEntry.newValue);
      return initialData.action || fallbackAction || 'No action provided';
    } catch (error) {
      console.error('Error parsing initial history data:', error);
    }
  }
  
  // Fallback to provided action if no initial_list found
  return fallbackAction || 'No action provided';
};
