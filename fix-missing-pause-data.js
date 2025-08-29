// Script untuk memperbaiki data pause yang hilang
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔧 FIXING MISSING PAUSE DATA...');

// Fungsi untuk mendapatkan database
async function getDatabase() {
  if (window.db) return window.db;
  if (window.InsightTicketDatabase) return window.InsightTicketDatabase;
  
  const dexieInstances = Object.keys(window).filter(key => 
    key.includes('dexie') || key.includes('db') || key.includes('database')
  );
  
  for (const key of dexieInstances) {
    const instance = window[key];
    if (instance && instance.incidents) {
      console.log(`Found database instance: ${key}`);
      return instance;
    }
  }
  
  throw new Error('Database not found');
}

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

// Fungsi untuk memperbaiki data pause yang hilang
async function fixMissingPauseData() {
  try {
    console.log('🔧 Starting pause data fix...');
    
    const db = await getDatabase();
    const allIncidents = await db.incidents.toArray();
    
    console.log(`📊 Total incidents to process: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found');
      return;
    }
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    // Process each incident
    for (let i = 0; i < allIncidents.length; i++) {
      const incident = allIncidents[i];
      
      try {
        let needsUpdate = false;
        const updates = {};
        
        // Logic 1: If there's startPause1 but no endPause1, and there's startPause2
        // Then endPause1 should be the same as startPause2 (pause1 ends when pause2 starts)
        if (incident.startPause1 && !incident.endPause1 && incident.startPause2) {
          updates.endPause1 = incident.startPause2;
          needsUpdate = true;
          console.log(`✅ Fixed ${incident.noCase}: endPause1 = startPause2 (${incident.startPause2})`);
        }
        
        // Logic 2: If there's startPause1 but no endPause1, and no startPause2
        // Then endPause1 should be the same as endTime (pause1 ends when incident ends)
        if (incident.startPause1 && !incident.endPause1 && !incident.startPause2 && incident.endTime) {
          updates.endPause1 = incident.endTime;
          needsUpdate = true;
          console.log(`✅ Fixed ${incident.noCase}: endPause1 = endTime (${incident.endTime})`);
        }
        
        // Logic 3: If there's startPause2 but no endPause2
        // Then endPause2 should be the same as endTime (pause2 ends when incident ends)
        if (incident.startPause2 && !incident.endPause2 && incident.endTime) {
          updates.endPause2 = incident.endTime;
          needsUpdate = true;
          console.log(`✅ Fixed ${incident.noCase}: endPause2 = endTime (${incident.endTime})`);
        }
        
        // Logic 4: If there's totalDurationPauseMin but missing pause times
        // Calculate pause times based on total duration
        if (incident.totalDurationPauseMin && incident.totalDurationPauseMin > 0) {
          if (!incident.startPause1 && incident.startTime) {
            // Estimate startPause1 as 30% into the incident
            const startTime = parseDateSafe(incident.startTime);
            const endTime = parseDateSafe(incident.endTime);
            
            if (startTime && endTime) {
              const totalDuration = endTime.getTime() - startTime.getTime();
              const pauseStartTime = new Date(startTime.getTime() + (totalDuration * 0.3));
              updates.startPause1 = pauseStartTime.toISOString();
              needsUpdate = true;
              console.log(`✅ Fixed ${incident.noCase}: estimated startPause1 = ${pauseStartTime.toISOString()}`);
            }
          }
          
          if (!incident.endPause1 && incident.startPause1) {
            // Calculate endPause1 based on totalDurationPauseMin
            const startPause1 = parseDateSafe(incident.startPause1);
            if (startPause1) {
              const endPause1 = new Date(startPause1.getTime() + (incident.totalDurationPauseMin * 60 * 1000));
              updates.endPause1 = endPause1.toISOString();
              needsUpdate = true;
              console.log(`✅ Fixed ${incident.noCase}: calculated endPause1 = ${endPause1.toISOString()}`);
            }
          }
        }
        
        // Update the incident if needed
        if (needsUpdate) {
          await db.incidents.update(incident.id, updates);
          fixedCount++;
          
          if (fixedCount % 10 === 0) {
            console.log(`✅ Fixed ${fixedCount} incidents...`);
          }
        } else {
          skippedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error fixing incident ${incident.noCase || incident.id}:`, error);
      }
    }
    
    console.log(`\n🎉 Pause data fix completed!`);
    console.log(`✅ Fixed: ${fixedCount} incidents`);
    console.log(`⏭️ Skipped: ${skippedCount} incidents`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    
    const updatedIncidents = await db.incidents.toArray();
    let incidentsWithCompletePause1 = 0;
    let incidentsWithCompletePause2 = 0;
    
    updatedIncidents.forEach(inc => {
      if (inc.startPause1 && inc.endPause1) incidentsWithCompletePause1++;
      if (inc.startPause2 && inc.endPause2) incidentsWithCompletePause2++;
    });
    
    console.log(`📊 Incidents with complete pause1: ${incidentsWithCompletePause1}/${updatedIncidents.length}`);
    console.log(`📊 Incidents with complete pause2: ${incidentsWithCompletePause2}/${updatedIncidents.length}`);
    
    // Show sample fixed data
    const fixedIncidents = updatedIncidents.filter(inc => 
      (inc.startPause1 && inc.endPause1) || (inc.startPause2 && inc.endPause2)
    );
    
    if (fixedIncidents.length > 0) {
      console.log('\n📋 Sample fixed pause data:');
      fixedIncidents.slice(0, 5).forEach((inc, index) => {
        console.log(`${index + 1}. ${inc.noCase}:`);
        console.log(`   startPause1: ${inc.startPause1 || 'null'}`);
        console.log(`   endPause1: ${inc.endPause1 || 'null'}`);
        console.log(`   startPause2: ${inc.startPause2 || 'null'}`);
        console.log(`   endPause2: ${inc.endPause2 || 'null'}`);
        console.log(`   totalDurationPauseMin: ${inc.totalDurationPauseMin || 'null'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during pause data fix:', error);
  }
}

// Jalankan perbaikan
fixMissingPauseData();
