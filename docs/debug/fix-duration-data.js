// Script untuk memperbaiki data durasi yang bermasalah
// Jalankan di browser console pada halaman Incident Data

console.log('🔧 MEMPERBAIKI DATA DURASI YANG BERMASALAH...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);

    const incidentsToUpdate = [];
    let fixedCount = 0;
    let invalidCount = 0;

    allIncidents.forEach((incident) => {
      let needsUpdate = false;
      const updatedIncident = { ...incident };

      // Cek dan perbaiki durasi yang tidak masuk akal
      if (incident.durationMin && incident.durationMin > 1440) {
        console.log(`⚠️ Invalid duration found for ${incident.noCase}: ${incident.durationMin} minutes`);
        updatedIncident.durationMin = 0;
        needsUpdate = true;
        invalidCount++;
      }

      // Cek dan perbaiki durasi vendor yang tidak masuk akal
      if (incident.durationVendorMin && incident.durationVendorMin > 1440) {
        console.log(`⚠️ Invalid vendor duration found for ${incident.noCase}: ${incident.durationVendorMin} minutes`);
        updatedIncident.durationVendorMin = 0;
        needsUpdate = true;
        invalidCount++;
      }

      // Recalculate duration jika ada start dan end time
      if (incident.startTime && incident.endTime) {
        try {
          const start = new Date(incident.startTime);
          const end = new Date(incident.endTime);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const calculatedMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            
            // Validasi durasi yang masuk akal
            if (calculatedMinutes > 0 && calculatedMinutes <= 1440) {
              if (Math.abs(calculatedMinutes - (incident.durationMin || 0)) > 1) {
                console.log(`🔄 Recalculating duration for ${incident.noCase}:`);
                console.log(`  Old: ${incident.durationMin || 0} minutes`);
                console.log(`  New: ${calculatedMinutes} minutes`);
                updatedIncident.durationMin = Math.round(calculatedMinutes * 100) / 100;
                needsUpdate = true;
                fixedCount++;
              }
            } else {
              console.log(`❌ Invalid calculated duration for ${incident.noCase}: ${calculatedMinutes} minutes`);
              updatedIncident.durationMin = 0;
              needsUpdate = true;
              invalidCount++;
            }
          }
        } catch (error) {
          console.error(`Error calculating duration for ${incident.noCase}:`, error);
        }
      }

      // Recalculate vendor duration jika ada start escalation vendor dan end time
      if (incident.startEscalationVendor && incident.endTime) {
        try {
          const start = new Date(incident.startEscalationVendor);
          const end = new Date(incident.endTime);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const calculatedMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            
            // Validasi durasi yang masuk akal
            if (calculatedMinutes > 0 && calculatedMinutes <= 1440) {
              if (Math.abs(calculatedMinutes - (incident.durationVendorMin || 0)) > 1) {
                console.log(`🔄 Recalculating vendor duration for ${incident.noCase}:`);
                console.log(`  Old: ${incident.durationVendorMin || 0} minutes`);
                console.log(`  New: ${calculatedMinutes} minutes`);
                updatedIncident.durationVendorMin = Math.round(calculatedMinutes * 100) / 100;
                needsUpdate = true;
                fixedCount++;
              }
            } else {
              console.log(`❌ Invalid calculated vendor duration for ${incident.noCase}: ${calculatedMinutes} minutes`);
              updatedIncident.durationVendorMin = 0;
              needsUpdate = true;
              invalidCount++;
            }
          }
        } catch (error) {
          console.error(`Error calculating vendor duration for ${incident.noCase}:`, error);
        }
      }

      // Reset durasi jika tidak ada end time
      if (!incident.endTime && incident.durationMin && incident.durationMin > 0) {
        console.log(`🔄 Resetting duration for ${incident.noCase} (no end time): ${incident.durationMin} → 0`);
        updatedIncident.durationMin = 0;
        needsUpdate = true;
        fixedCount++;
      }

      if (!incident.endTime && incident.durationVendorMin && incident.durationVendorMin > 0) {
        console.log(`🔄 Resetting vendor duration for ${incident.noCase} (no end time): ${incident.durationVendorMin} → 0`);
        updatedIncident.durationVendorMin = 0;
        needsUpdate = true;
        fixedCount++;
      }

      if (needsUpdate) {
        incidentsToUpdate.push(updatedIncident);
      }
    });

    // Update database jika ada perubahan
    if (incidentsToUpdate.length > 0) {
      console.log(`\n💾 Updating ${incidentsToUpdate.length} incidents...`);
      await db.incidents.bulkPut(incidentsToUpdate);
      console.log('✅ Database updated successfully!');
    } else {
      console.log('✅ No incidents need to be updated.');
    }

    console.log('\n📊 SUMMARY:');
    console.log(`Fixed durations: ${fixedCount}`);
    console.log(`Invalid durations reset: ${invalidCount}`);
    console.log(`Total updated: ${incidentsToUpdate.length}`);

    // Verify the fix
    console.log('\n🔍 VERIFICATION:');
    const updatedIncidents = await db.incidents.toArray();
    const validDurations = updatedIncidents.filter(inc => 
      inc.durationMin && inc.durationMin > 0 && inc.durationMin <= 1440
    ).length;
    const validVendorDurations = updatedIncidents.filter(inc => 
      inc.durationVendorMin && inc.durationVendorMin > 0 && inc.durationVendorMin <= 1440
    ).length;

    console.log(`Valid durations: ${validDurations}/${updatedIncidents.length}`);
    console.log(`Valid vendor durations: ${validVendorDurations}/${updatedIncidents.length}`);

  } catch (error) {
    console.error('❌ Error fixing duration data:', error);
  }
});
