// Script untuk memperbaiki data durasi di database
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔧 FIXING DURATION DATA...');

// Fungsi untuk parse tanggal dengan format DD/MM/YY HH:MM:SS
const parseDateSafe = (dt) => {
  if (!dt) return null;
  if (dt instanceof Date) return dt;
  
  try {
    // Handle DD/MM/YY HH:MM:SS format
    if (typeof dt === 'string' && dt.includes('/')) {
      const parts = dt.split(' ');
      if (parts.length === 2) {
        const datePart = parts[0]; // DD/MM/YY
        const timePart = parts[1]; // HH:MM:SS
        
        const [day, month, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        
        // Convert 2-digit year to 4-digit
        const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
        
        return new Date(fullYear, parseInt(month) - 1, parseInt(day), 
                       parseInt(hour), parseInt(minute), parseInt(second));
      }
    }
    
    // Handle ISO format or other formats
    const parsed = new Date(dt);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    console.warn('Failed to parse date:', dt, error);
    return null;
  }
};

// Fungsi untuk menghitung durasi dari format HH:MM:SS
const toMinutes = (duration) => {
  if (!duration) return 0;
  
  if (typeof duration === 'number') return duration;
  
  const str = String(duration).trim();
  if (!str || str === '-') return 0;
  
  // Handle HH:MM:SS format
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 60 + minutes + seconds / 60;
    } else if (parts.length === 2) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      return hours * 60 + minutes;
    }
  }
  
  // Handle decimal hours
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return num * 60;
  }
  
  return 0;
};

// Fungsi untuk menghitung durasi yang akurat
const calculateAccurateDuration = (incident) => {
  // Priority 1: Use existing calculated duration if available and valid
  if (incident.durationMin && incident.durationMin > 0) {
    return incident.durationMin;
  }
  
  // Priority 2: Use vendor duration if available
  if (incident.durationVendorMin && incident.durationVendorMin > 0) {
    return incident.durationVendorMin;
  }
  
  // Priority 3: Use total duration vendor if available
  if (incident.totalDurationVendorMin && incident.totalDurationVendorMin > 0) {
    return incident.totalDurationVendorMin;
  }
  
  // Priority 4: Calculate from time fields
  let calculatedDuration = 0;
  
  // Try to calculate from Start and End times
  if (incident.startTime && incident.endTime) {
    const startTime = parseDateSafe(incident.startTime);
    const endTime = parseDateSafe(incident.endTime);
    
    if (startTime && endTime && endTime > startTime) {
      calculatedDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    }
  }
  
  // If no start/end calculation, try vendor escalation
  if (calculatedDuration === 0 && incident.startEscalationVendor && incident.endTime) {
    const vendorStart = parseDateSafe(incident.startEscalationVendor);
    const endTime = parseDateSafe(incident.endTime);
    
    if (vendorStart && endTime && endTime > vendorStart) {
      calculatedDuration = (endTime.getTime() - vendorStart.getTime()) / (1000 * 60);
    }
  }
  
  // Calculate pause time to subtract
  let pauseTime = 0;
  
  // Use existing pause duration if available
  if (incident.totalDurationPauseMin && incident.totalDurationPauseMin > 0) {
    pauseTime = incident.totalDurationPauseMin;
  } else {
    // Calculate pause time from pause fields
    if (incident.startPause1 && incident.endPause1) {
      const pause1Start = parseDateSafe(incident.startPause1);
      const pause1End = parseDateSafe(incident.endPause1);
      
      if (pause1Start && pause1End && pause1End > pause1Start) {
        pauseTime += (pause1End.getTime() - pause1Start.getTime()) / (1000 * 60);
      }
    }
    
    if (incident.startPause2 && incident.endPause2) {
      const pause2Start = parseDateSafe(incident.startPause2);
      const pause2End = parseDateSafe(incident.endPause2);
      
      if (pause2Start && pause2End && pause2End > pause2Start) {
        pauseTime += (pause2End.getTime() - pause2Start.getTime()) / (1000 * 60);
      }
    }
  }
  
  // Final duration calculation
  return Math.max(0, calculatedDuration - pauseTime);
};

// Fungsi untuk memperbaiki data durasi
async function fixDurationData() {
  try {
    console.log('🔧 Starting duration data fix...');
    
    // Akses database
    const db = window.db || window.InsightTicketDatabase;
    if (!db) {
      console.log('❌ Database not found');
      return;
    }
    
    const allIncidents = await db.incidents.toArray();
    console.log(`📊 Total incidents to process: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found');
      return;
    }
    
    let fixedCount = 0;
    let errorCount = 0;
    
    // Process each incident
    for (let i = 0; i < allIncidents.length; i++) {
      const incident = allIncidents[i];
      
      try {
        // Calculate accurate duration
        const accurateDuration = calculateAccurateDuration(incident);
        
        // Check if duration needs to be updated
        const currentDuration = incident.durationMin || 0;
        const needsUpdate = Math.abs(accurateDuration - currentDuration) > 0.01;
        
        if (needsUpdate && accurateDuration > 0) {
          // Update the incident with accurate duration
          await db.incidents.update(incident.id, {
            durationMin: Math.round(accurateDuration * 100) / 100, // Round to 2 decimal places
            netDurationMin: Math.round(accurateDuration * 100) / 100
          });
          
          fixedCount++;
          
          if (fixedCount % 10 === 0) {
            console.log(`✅ Fixed ${fixedCount} incidents...`);
          }
        }
      } catch (error) {
        console.error(`❌ Error fixing incident ${incident.noCase || incident.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Duration fix completed!`);
    console.log(`✅ Fixed: ${fixedCount} incidents`);
    console.log(`❌ Errors: ${errorCount} incidents`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    
    const updatedIncidents = await db.incidents.toArray();
    const withDuration = updatedIncidents.filter(inc => inc.durationMin > 0);
    
    console.log(`📊 Incidents with duration after fix: ${withDuration.length}/${updatedIncidents.length}`);
    
    if (withDuration.length > 0) {
      const avgDuration = withDuration.reduce((sum, inc) => sum + inc.durationMin, 0) / withDuration.length;
      console.log(`📊 Average duration after fix: ${avgDuration.toFixed(2)} minutes`);
    }
    
  } catch (error) {
    console.error('❌ Error during duration fix:', error);
  }
}

// Jalankan perbaikan
fixDurationData();
