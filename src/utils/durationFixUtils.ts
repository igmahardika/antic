// Utility functions untuk memperbaiki masalah durasi secara otomatis
import { db } from '../lib/db';

export interface DurationFixResult {
  totalProcessed: number;
  totalFixed: number;
  durationFixed: number;
  durationVendorFixed: number;
  netDurationFixed: number;
  formatFixed: number;
  errors: string[];
}

/**
 * Memperbaiki semua masalah durasi secara otomatis
 */
export async function fixAllDurationIssues(): Promise<DurationFixResult> {
  const result: DurationFixResult = {
    totalProcessed: 0,
    totalFixed: 0,
    durationFixed: 0,
    durationVendorFixed: 0,
    netDurationFixed: 0,
    formatFixed: 0,
    errors: []
  };

  try {
    console.log('🔧 Starting automatic duration fixes...');
    
    // Get all incidents
    const incidents = await db.incidents.toArray();
    result.totalProcessed = incidents.length;
    
    console.log(`📊 Processing ${incidents.length} incidents...`);

    // Process incidents in batches
    const batchSize = 100;
    for (let i = 0; i < incidents.length; i += batchSize) {
      const batch = incidents.slice(i, i + batchSize);
      
      for (const incident of batch) {
        try {
          const incidentFix = await fixSingleIncidentDuration(incident);
          
          if (incidentFix.durationFixed) result.durationFixed++;
          if (incidentFix.durationVendorFixed) result.durationVendorFixed++;
          if (incidentFix.netDurationFixed) result.netDurationFixed++;
          if (incidentFix.formatFixed) result.formatFixed++;
          
          if (incidentFix.anyFixed) result.totalFixed++;
          
        } catch (error) {
          const errorMsg = `Error fixing incident ${incident.noCase}: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Progress indicator
      if (i % 500 === 0) {
        console.log(`📊 Processed ${Math.min(i + batchSize, incidents.length)}/${incidents.length} incidents...`);
      }
    }

    console.log('✅ Duration fixes completed!');
    return result;

  } catch (error) {
    const errorMsg = `Failed to fix duration issues: ${error}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
    return result;
  }
}

/**
 * Memperbaiki masalah durasi untuk satu incident
 */
async function fixSingleIncidentDuration(incident: any): Promise<{
  durationFixed: boolean;
  durationVendorFixed: boolean;
  netDurationFixed: boolean;
  formatFixed: boolean;
  anyFixed: boolean;
}> {
  let durationFixed = false;
  let durationVendorFixed = false;
  let netDurationFixed = false;
  let formatFixed = false;
  const updates: any = {};

  // Fix 1: Recalculate duration from start/end times
  if (incident.startTime && incident.endTime) {
    try {
      const startDate = new Date(incident.startTime);
      const endDate = new Date(incident.endTime);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const calculatedDuration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
        
        // Fix duration if it's negative, invalid, or significantly different
        const currentDuration = incident.durationMin;
        const shouldFix = (
          // Negative duration
          (currentDuration && currentDuration < 0) ||
          // Invalid duration (NaN, null, undefined)
          (!currentDuration || isNaN(currentDuration)) ||
          // Significantly different (> 5 minutes difference)
          (currentDuration && Math.abs(currentDuration - calculatedDuration) > 5) ||
          // Zero duration when it should have a value
          (currentDuration === 0 && calculatedDuration > 0)
        );
        
        if (shouldFix && calculatedDuration > 0) {
          updates.durationMin = calculatedDuration;
          durationFixed = true;
          console.log(`🔧 Fixed duration for ${incident.noCase}: ${currentDuration} → ${calculatedDuration} minutes`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Error calculating duration for ${incident.noCase}:`, error);
    }
  }

  // Fix 2: Recalculate duration vendor from start escalation to end
  if (incident.startEscalationVendor && incident.endTime) {
    try {
      const startEscalation = new Date(incident.startEscalationVendor);
      const endDate = new Date(incident.endTime);
      
      if (!isNaN(startEscalation.getTime()) && !isNaN(endDate.getTime())) {
        const calculatedDurationVendor = Math.round((endDate.getTime() - startEscalation.getTime()) / (1000 * 60));
        
        // Fix duration vendor if it's negative, invalid, or significantly different
        const currentDurationVendor = incident.durationVendorMin;
        const shouldFix = (
          // Negative duration
          (currentDurationVendor && currentDurationVendor < 0) ||
          // Invalid duration (NaN, null, undefined)
          (!currentDurationVendor || isNaN(currentDurationVendor)) ||
          // Significantly different (> 5 minutes difference)
          (currentDurationVendor && Math.abs(currentDurationVendor - calculatedDurationVendor) > 5) ||
          // Zero duration when it should have a value
          (currentDurationVendor === 0 && calculatedDurationVendor > 0)
        );
        
        if (shouldFix && calculatedDurationVendor > 0) {
          updates.durationVendorMin = calculatedDurationVendor;
          durationVendorFixed = true;
          console.log(`🔧 Fixed duration vendor for ${incident.noCase}: ${currentDurationVendor} → ${calculatedDurationVendor} minutes`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Error calculating duration vendor for ${incident.noCase}:`, error);
    }
  }

  // Fix 3: Recalculate net duration
  if (updates.durationMin || updates.durationVendorMin) {
    const duration = updates.durationMin || incident.durationMin;
    const totalPause = incident.totalDurationPauseMin || 0;
    
    if (duration && duration > 0) {
      const calculatedNetDuration = Math.max(0, duration - totalPause);
      
      if (incident.netDurationMin && Math.abs(incident.netDurationMin - calculatedNetDuration) > 5) {
        updates.netDurationMin = calculatedNetDuration;
        netDurationFixed = true;
        console.log(`🔧 Fixed net duration for ${incident.noCase}: ${incident.netDurationMin} → ${calculatedNetDuration} minutes`);
      }
    }
  }

  // Fix 4: Ensure proper date format (remove DD/MM/YYYY HH.MM.SS format)
  if (incident.startTime && typeof incident.startTime === 'string') {
    let fixedStartTime = incident.startTime;
    
    // Fix DD/MM/YYYY HH.MM.SS format
    if (fixedStartTime.includes('/') && fixedStartTime.includes('.')) {
      fixedStartTime = fixedStartTime.replace(/\./g, ':');
      updates.startTime = fixedStartTime;
      formatFixed = true;
      console.log(`🔧 Fixed start time format for ${incident.noCase}: ${incident.startTime} → ${fixedStartTime}`);
    }
  }

  if (incident.endTime && typeof incident.endTime === 'string') {
    let fixedEndTime = incident.endTime;
    
    if (fixedEndTime.includes('/') && fixedEndTime.includes('.')) {
      fixedEndTime = fixedEndTime.replace(/\./g, ':');
      updates.endTime = fixedEndTime;
      formatFixed = true;
      console.log(`🔧 Fixed end time format for ${incident.noCase}: ${incident.endTime} → ${fixedEndTime}`);
    }
  }

  if (incident.startEscalationVendor && typeof incident.startEscalationVendor === 'string') {
    let fixedStartEscalation = incident.startEscalationVendor;
    
    if (fixedStartEscalation.includes('/') && fixedStartEscalation.includes('.')) {
      fixedStartEscalation = fixedStartEscalation.replace(/\./g, ':');
      updates.startEscalationVendor = fixedStartEscalation;
      formatFixed = true;
      console.log(`🔧 Fixed start escalation format for ${incident.noCase}: ${incident.startEscalationVendor} → ${fixedStartEscalation}`);
    }
  }

  // Update incident if needed
  if (Object.keys(updates).length > 0) {
    try {
      // Ensure all duration values are positive
      if (updates.durationMin !== undefined && updates.durationMin < 0) {
        updates.durationMin = Math.abs(updates.durationMin);
        console.log(`🔧 Corrected negative duration for ${incident.noCase}: ${updates.durationMin} minutes`);
      }
      
      if (updates.durationVendorMin !== undefined && updates.durationVendorMin < 0) {
        updates.durationVendorMin = Math.abs(updates.durationVendorMin);
        console.log(`🔧 Corrected negative duration vendor for ${incident.noCase}: ${updates.durationVendorMin} minutes`);
      }
      
      if (updates.netDurationMin !== undefined && updates.netDurationMin < 0) {
        updates.netDurationMin = Math.max(0, updates.netDurationMin);
        console.log(`🔧 Corrected negative net duration for ${incident.noCase}: ${updates.netDurationMin} minutes`);
      }
      
      await db.incidents.update(incident.id, updates);
    } catch (error) {
      console.error(`❌ Failed to update ${incident.noCase}:`, error);
    }
  }

  const anyFixed = durationFixed || durationVendorFixed || netDurationFixed || formatFixed;
  
  return {
    durationFixed,
    durationVendorFixed,
    netDurationFixed,
    formatFixed,
    anyFixed
  };
}

/**
 * Memperbaiki durasi untuk incident baru sebelum disimpan
 */
export function fixIncidentDurationBeforeSave(incident: any): any {
  const fixedIncident = { ...incident };

  // Fix 1: Ensure proper date format
  if (fixedIncident.startTime && typeof fixedIncident.startTime === 'string') {
    if (fixedIncident.startTime.includes('/') && fixedIncident.startTime.includes('.')) {
      fixedIncident.startTime = fixedIncident.startTime.replace(/\./g, ':');
    }
  }

  if (fixedIncident.endTime && typeof fixedIncident.endTime === 'string') {
    if (fixedIncident.endTime.includes('/') && fixedIncident.endTime.includes('.')) {
      fixedIncident.endTime = fixedIncident.endTime.replace(/\./g, ':');
    }
  }

  if (fixedIncident.startEscalationVendor && typeof fixedIncident.startEscalationVendor === 'string') {
    if (fixedIncident.startEscalationVendor.includes('/') && fixedIncident.startEscalationVendor.includes('.')) {
      fixedIncident.startEscalationVendor = fixedIncident.startEscalationVendor.replace(/\./g, ':');
    }
  }

  // Fix 2: Recalculate duration if invalid
  if (fixedIncident.startTime && fixedIncident.endTime && (!fixedIncident.durationMin || fixedIncident.durationMin === 0 || fixedIncident.durationMin < 0)) {
    try {
      const startDate = new Date(fixedIncident.startTime);
      const endDate = new Date(fixedIncident.endTime);
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        const calculatedDuration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
        if (calculatedDuration > 0) {
          fixedIncident.durationMin = calculatedDuration;
        } else {
          // If calculated duration is negative, set to 0 and log warning
          fixedIncident.durationMin = 0;
          console.log(`⚠️ Warning: Negative duration calculated for ${fixedIncident.noCase}. Start: ${fixedIncident.startTime}, End: ${fixedIncident.endTime}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Error calculating duration for ${fixedIncident.noCase}:`, error);
    }
  }

  // Fix 3: Recalculate duration vendor if invalid
  if (fixedIncident.startEscalationVendor && fixedIncident.endTime && (!fixedIncident.durationVendorMin || fixedIncident.durationVendorMin === 0 || fixedIncident.durationVendorMin < 0)) {
    try {
      const startEscalation = new Date(fixedIncident.startEscalationVendor);
      const endDate = new Date(fixedIncident.endTime);
      
      if (!isNaN(startEscalation.getTime()) && !isNaN(endDate.getTime())) {
        const calculatedDurationVendor = Math.round((endDate.getTime() - startEscalation.getTime()) / (1000 * 60));
        if (calculatedDurationVendor > 0) {
          fixedIncident.durationVendorMin = calculatedDurationVendor;
        } else {
          // If calculated duration is negative, set to 0 and log warning
          fixedIncident.durationVendorMin = 0;
          console.log(`⚠️ Warning: Negative duration vendor calculated for ${fixedIncident.noCase}. Start escalation: ${fixedIncident.startEscalationVendor}, End: ${fixedIncident.endTime}`);
        }
      }
    } catch (error) {
      console.log(`⚠️ Error calculating duration vendor for ${fixedIncident.noCase}:`, error);
    }
  }

  // Fix 4: Recalculate net duration
  if (fixedIncident.durationMin && fixedIncident.durationMin > 0) {
    const totalPause = fixedIncident.totalDurationPauseMin || 0;
    const calculatedNetDuration = Math.max(0, fixedIncident.durationMin - totalPause);
    fixedIncident.netDurationMin = calculatedNetDuration;
  }

  // Fix 5: Ensure all duration values are valid and positive
  if (fixedIncident.durationMin && fixedIncident.durationMin < 0) {
    console.log(`⚠️ Correcting negative duration for ${fixedIncident.noCase}: ${fixedIncident.durationMin} → 0`);
    fixedIncident.durationMin = 0;
  }
  
  if (fixedIncident.durationVendorMin && fixedIncident.durationVendorMin < 0) {
    console.log(`⚠️ Correcting negative duration vendor for ${fixedIncident.noCase}: ${fixedIncident.durationVendorMin} → 0`);
    fixedIncident.durationVendorMin = 0;
  }
  
  if (fixedIncident.netDurationMin && fixedIncident.netDurationMin < 0) {
    console.log(`⚠️ Correcting negative net duration for ${fixedIncident.noCase}: ${fixedIncident.netDurationMin} → 0`);
    fixedIncident.netDurationMin = 0;
  }

  return fixedIncident;
}

/**
 * Memperbaiki durasi untuk incident yang sudah ada
 */
export async function fixExistingIncidentDuration(incidentId: string): Promise<boolean> {
  try {
    const incident = await db.incidents.get(incidentId);
    if (!incident) {
      console.error(`Incident ${incidentId} not found`);
      return false;
    }

    const fixResult = await fixSingleIncidentDuration(incident);
    return fixResult.anyFixed;

  } catch (error) {
    console.error(`Error fixing incident ${incidentId}:`, error);
    return false;
  }
}
