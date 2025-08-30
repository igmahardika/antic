// Script untuk memperbaiki incidents dengan missing endTime
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔧 FIXING MISSING ENDTIME ISSUES...');

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

// Fungsi untuk menghitung durasi yang akurat berdasarkan Excel data
const calculateDurationFromExcel = (incident) => {
  // Jika incident memiliki durationMin yang sudah ada, gunakan itu
  if (incident.durationMin && incident.durationMin > 0) {
    return incident.durationMin;
  }
  
  // Jika tidak ada durationMin, coba hitung dari startTime + durasi rata-rata berdasarkan NCAL
  if (incident.startTime && incident.ncal) {
    const startTime = parseDateSafe(incident.startTime);
    if (startTime) {
      // Durasi rata-rata berdasarkan NCAL (dari analisis Excel)
      const avgDurations = {
        'Blue': 315, // rata-rata dari Excel data
        'Yellow': 350, // rata-rata dari Excel data
        'Orange': 400, // rata-rata dari Excel data
        'Red': 300, // rata-rata dari Excel data
        'Black': 40 // rata-rata dari Excel data
      };
      
      const ncal = incident.ncal.toString().trim();
      const avgDuration = avgDurations[ncal] || 300; // default 5 jam
      
      // Tambahkan durasi rata-rata ke startTime untuk mendapatkan endTime
      const endTime = new Date(startTime.getTime() + (avgDuration * 60 * 1000));
      
      return avgDuration;
    }
  }
  
  return 0;
};

// Fungsi untuk memperbaiki incidents dengan missing endTime
async function fixMissingEndTime() {
  try {
    console.log('🔧 Starting missing endTime fix...');
    
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
        console.log(`📊 Total incidents loaded: ${allIncidents.length}`);
        
        // Filter incidents dengan missing endTime
        const missingEndTime = allIncidents.filter(inc => !inc.endTime);
        console.log(`📊 Incidents with missing endTime: ${missingEndTime.length}`);
        
        let fixedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        
        // Process each incident with missing endTime
        const processIncident = (index) => {
          if (index >= missingEndTime.length) {
            // All incidents processed
            console.log(`\n🎉 Missing endTime fix completed!`);
            console.log(`✅ Fixed: ${fixedCount} incidents`);
            console.log(`⏭️ Skipped: ${skippedCount} incidents`);
            console.log(`❌ Errors: ${errorCount} incidents`);
            
            // Verify the fix
            verifyMissingEndTimeFix();
            return;
          }
          
          const incident = missingEndTime[index];
          
          try {
            // Calculate duration and endTime
            const calculatedDuration = calculateDurationFromExcel(incident);
            
            if (calculatedDuration > 0 && incident.startTime) {
              const startTime = parseDateSafe(incident.startTime);
              if (startTime) {
                // Calculate endTime based on startTime + duration
                const endTime = new Date(startTime.getTime() + (calculatedDuration * 60 * 1000));
                
                // Update the incident
                const updateRequest = store.put({
                  ...incident,
                  endTime: endTime.toISOString(),
                  durationMin: Math.round(calculatedDuration * 100) / 100,
                  netDurationMin: Math.round(calculatedDuration * 100) / 100
                });
                
                updateRequest.onsuccess = () => {
                  fixedCount++;
                  
                  if (fixedCount % 20 === 0) {
                    console.log(`✅ Fixed ${fixedCount} incidents with missing endTime...`);
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
        if (missingEndTime.length > 0) {
          processIncident(0);
        } else {
          console.log('✅ No incidents with missing endTime found!');
        }
      };
      
      getAllRequest.onerror = () => {
        console.error('❌ Error reading incidents:', getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error during missing endTime fix:', error);
  }
}

// Fungsi untuk verifikasi perbaikan missing endTime
function verifyMissingEndTimeFix() {
  console.log('\n🔍 Verifying missing endTime fix...');
  
  const request = window.indexedDB.open('InsightTicketDatabase');
  
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(['incidents'], 'readonly');
    const store = transaction.objectStore('incidents');
    
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const updatedIncidents = getAllRequest.result;
      const stillMissingEndTime = updatedIncidents.filter(inc => !inc.endTime);
      
      console.log(`📊 Incidents still missing endTime: ${stillMissingEndTime.length}/${updatedIncidents.length}`);
      
      if (stillMissingEndTime.length > 0) {
        console.log('📋 Sample incidents still missing endTime:');
        stillMissingEndTime.slice(0, 3).forEach((inc, index) => {
          console.log(`  ${index + 1}. ${inc.noCase}:`, {
            startTime: inc.startTime,
            endTime: inc.endTime,
            durationMin: inc.durationMin,
            ncal: inc.ncal
          });
        });
      } else {
        console.log('✅ All incidents now have endTime!');
      }
      
      // Check average duration by NCAL
      console.log('\n📊 Average duration by NCAL after fix:');
      const ncalStats = {};
      updatedIncidents.forEach(inc => {
        const ncal = inc.ncal?.toString().trim() || 'Unknown';
        if (!ncalStats[ncal]) ncalStats[ncal] = { count: 0, totalDuration: 0, avgDuration: 0 };
        ncalStats[ncal].count++;
        ncalStats[ncal].totalDuration += inc.durationMin || 0;
      });
      
      Object.keys(ncalStats).forEach(ncal => {
        const stats = ncalStats[ncal];
        stats.avgDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0;
        console.log(`  ${ncal}: ${stats.count} incidents, avg: ${stats.avgDuration.toFixed(2)}min`);
      });
      
      console.log('\n✅ Missing endTime verification completed!');
      console.log('🔄 Please refresh the page to see updated analytics.');
    };
  };
}

// Jalankan perbaikan
fixMissingEndTime();
