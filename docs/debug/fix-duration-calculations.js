// Script untuk memperbaiki perhitungan durasi - berdasarkan analisis data
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔧 FIXING DURATION CALCULATIONS...');

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

// Fungsi untuk memperbaiki perhitungan durasi
async function fixDurationCalculations() {
  try {
    console.log('🔧 Starting duration calculation fixes...');
    
    // Akses database langsung menggunakan IndexedDB
    const request = window.indexedDB.open('InsightTicketDatabase');
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['incidents'], 'readwrite');
      const store = transaction.objectStore('incidents');
      
      // Ambil semua data incidents
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const allIncidents = getAllRequest.result;
        console.log(`📊 Total incidents to process: ${allIncidents.length}`);
        
        let fixedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        
        // Process each incident
        const processIncident = (index) => {
          if (index >= allIncidents.length) {
            // All incidents processed
            console.log(`\n🎉 Duration fix completed!`);
            console.log(`✅ Fixed: ${fixedCount} incidents`);
            console.log(`⏭️ Skipped: ${skippedCount} incidents`);
            console.log(`❌ Errors: ${errorCount} incidents`);
            
            // Verify the fix
            verifyFix();
            return;
          }
          
          const incident = allIncidents[index];
          
          try {
            // Calculate accurate duration
            const accurateDuration = calculateAccurateDuration(incident);
            
            // Check if duration needs to be updated
            const currentDuration = incident.durationMin || 0;
            const needsUpdate = Math.abs(accurateDuration - currentDuration) > 0.01;
            
            if (needsUpdate && accurateDuration > 0) {
              // Update the incident with accurate duration
              const updateRequest = store.put({
                ...incident,
                durationMin: Math.round(accurateDuration * 100) / 100, // Round to 2 decimal places
                netDurationMin: Math.round(accurateDuration * 100) / 100
              });
              
              updateRequest.onsuccess = () => {
                fixedCount++;
                
                if (fixedCount % 50 === 0) {
                  console.log(`✅ Fixed ${fixedCount} incidents...`);
                }
                
                // Process next incident
                processIncident(index + 1);
              };
              
              updateRequest.onerror = () => {
                console.error(`❌ Error updating incident ${incident.noCase || incident.id}:`, updateRequest.error);
                errorCount++;
                processIncident(index + 1);
              };
            } else {
              skippedCount++;
              processIncident(index + 1);
            }
          } catch (error) {
            console.error(`❌ Error processing incident ${incident.noCase || incident.id}:`, error);
            errorCount++;
            processIncident(index + 1);
          }
        };
        
        // Start processing
        processIncident(0);
      };
      
      getAllRequest.onerror = () => {
        console.error('❌ Error reading incidents:', getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error during duration fix:', error);
  }
}

// Fungsi untuk verifikasi perbaikan
function verifyFix() {
  console.log('\n🔍 Verifying fix...');
  
  const request = window.indexedDB.open('InsightTicketDatabase');
  
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(['incidents'], 'readonly');
    const store = transaction.objectStore('incidents');
    
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const updatedIncidents = getAllRequest.result;
      const withDuration = updatedIncidents.filter(inc => inc.durationMin > 0);
      
      console.log(`📊 Incidents with duration after fix: ${withDuration.length}/${updatedIncidents.length}`);
      
      if (withDuration.length > 0) {
        const avgDuration = withDuration.reduce((sum, inc) => sum + inc.durationMin, 0) / withDuration.length;
        console.log(`📊 Average duration after fix: ${avgDuration.toFixed(2)} minutes`);
        
        // Check for anomalies
        const anomalies = updatedIncidents.filter(inc => inc.durationMin > 1440);
        console.log(`📊 Incidents with duration > 24h after fix: ${anomalies.length}`);
        
        if (anomalies.length > 0) {
          console.log('📋 Sample anomalies after fix:');
          anomalies.slice(0, 3).forEach((inc, index) => {
            console.log(`  ${index + 1}. ${inc.noCase}: ${inc.durationMin}min`);
          });
        }
      }
      
      console.log('\n✅ Verification completed!');
      console.log('🔄 Please refresh the page to see updated analytics.');
    };
  };
}

// Jalankan perbaikan
fixDurationCalculations();
