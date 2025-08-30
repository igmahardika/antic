// Script untuk memaksa perhitungan ulang semua durasi
// Jalankan di browser console pada halaman Incident Data

console.log('🔄 MEMAKSA PERHITUNGAN ULANG SEMUA DURASI...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);

    const incidentsToUpdate = [];
    let recalculatedCount = 0;
    let problematicCount = 0;

    // Helper function untuk menghitung durasi
    const calculateDuration = (startTime, endTime) => {
      if (!startTime || !endTime) return 0;
      
      try {
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return 0;
        }
        
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        return Math.max(0, diffMinutes);
      } catch (error) {
        console.warn('Error calculating duration:', error);
        return 0;
      }
    };

    // Helper function untuk format durasi
    const formatDurationHMS = (minutes) => {
      if (!minutes || isNaN(minutes) || minutes < 0) return '00:00:00';
      const totalSeconds = Math.floor(minutes * 60);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const pad = (num) => num.toString().padStart(2, '0');
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    allIncidents.forEach((incident, index) => {
      console.log(`\n🔍 Processing incident ${index + 1}/${allIncidents.length}: ${incident.noCase}`);
      
      const updatedIncident = { ...incident };
      let needsUpdate = false;

      // 1. Recalculate Duration (Start → End)
      if (incident.startTime && incident.endTime) {
        const calculatedDuration = calculateDuration(incident.startTime, incident.endTime);
        const formattedDuration = formatDurationHMS(calculatedDuration);
        
        console.log(`  📊 Duration calculation:`, {
          startTime: incident.startTime,
          endTime: incident.endTime,
          calculatedMinutes: calculatedDuration,
          formattedDuration: formattedDuration,
          oldDurationMin: incident.durationMin
        });

        if (calculatedDuration > 0 && calculatedDuration <= 1440) {
          updatedIncident.durationMin = Math.round(calculatedDuration * 100) / 100;
          needsUpdate = true;
          recalculatedCount++;
          console.log(`  ✅ Duration updated: ${incident.durationMin} → ${updatedIncident.durationMin} minutes`);
        } else {
          console.log(`  ❌ Invalid duration calculated: ${calculatedDuration} minutes`);
          updatedIncident.durationMin = 0;
          needsUpdate = true;
          problematicCount++;
        }
      } else {
        console.log(`  ⚠️ Missing start/end time:`, {
          startTime: incident.startTime,
          endTime: incident.endTime
        });
        updatedIncident.durationMin = 0;
        needsUpdate = true;
        problematicCount++;
      }

      // 2. Recalculate Duration Vendor (Start Escalation Vendor → End)
      if (incident.startEscalationVendor && incident.endTime) {
        const calculatedVendorDuration = calculateDuration(incident.startEscalationVendor, incident.endTime);
        const formattedVendorDuration = formatDurationHMS(calculatedVendorDuration);
        
        console.log(`  📊 Vendor Duration calculation:`, {
          startEscalationVendor: incident.startEscalationVendor,
          endTime: incident.endTime,
          calculatedMinutes: calculatedVendorDuration,
          formattedDuration: formattedVendorDuration,
          oldDurationVendorMin: incident.durationVendorMin
        });

        if (calculatedVendorDuration > 0 && calculatedVendorDuration <= 1440) {
          updatedIncident.durationVendorMin = Math.round(calculatedVendorDuration * 100) / 100;
          needsUpdate = true;
          recalculatedCount++;
          console.log(`  ✅ Vendor Duration updated: ${incident.durationVendorMin} → ${updatedIncident.durationVendorMin} minutes`);
        } else {
          console.log(`  ❌ Invalid vendor duration calculated: ${calculatedVendorDuration} minutes`);
          updatedIncident.durationVendorMin = 0;
          needsUpdate = true;
          problematicCount++;
        }
      } else {
        console.log(`  ⚠️ Missing vendor escalation/end time`);
        updatedIncident.durationVendorMin = 0;
        needsUpdate = true;
        problematicCount++;
      }

      // 3. Recalculate Total Duration Pause (Pause 1 + Pause 2)
      let totalPauseMinutes = 0;
      
      if (incident.startPause1 && incident.endPause1) {
        const pause1Duration = calculateDuration(incident.startPause1, incident.endPause1);
        if (pause1Duration > 0 && pause1Duration <= 1440) {
          totalPauseMinutes += pause1Duration;
          console.log(`  ✅ Pause 1: ${formatDurationHMS(pause1Duration)}`);
        } else {
          console.log(`  ❌ Invalid Pause 1: ${pause1Duration} minutes`);
        }
      }

      if (incident.startPause2 && incident.endPause2) {
        const pause2Duration = calculateDuration(incident.startPause2, incident.endPause2);
        if (pause2Duration > 0 && pause2Duration <= 1440) {
          totalPauseMinutes += pause2Duration;
          console.log(`  ✅ Pause 2: ${formatDurationHMS(pause2Duration)}`);
        } else {
          console.log(`  ❌ Invalid Pause 2: ${pause2Duration} minutes`);
        }
      }

      updatedIncident.totalDurationPauseMin = Math.round(totalPauseMinutes * 100) / 100;
      console.log(`  📊 Total Pause Duration: ${formatDurationHMS(updatedIncident.totalDurationPauseMin)}`);
      needsUpdate = true;
      recalculatedCount++;

      // 4. Recalculate Total Duration Vendor (Duration Vendor - Total Duration Pause)
      const totalVendorDuration = Math.max(updatedIncident.durationVendorMin - updatedIncident.totalDurationPauseMin, 0);
      updatedIncident.totalDurationVendorMin = Math.round(totalVendorDuration * 100) / 100;
      console.log(`  📊 Total Vendor Duration: ${formatDurationHMS(updatedIncident.totalDurationVendorMin)}`);
      needsUpdate = true;
      recalculatedCount++;

      // 5. Recalculate Net Duration (Duration - Total Duration Pause)
      const netDuration = Math.max(updatedIncident.durationMin - updatedIncident.totalDurationPauseMin, 0);
      updatedIncident.netDurationMin = Math.round(netDuration * 100) / 100;
      console.log(`  📊 Net Duration: ${formatDurationHMS(updatedIncident.netDurationMin)}`);
      needsUpdate = true;
      recalculatedCount++;

      if (needsUpdate) {
        incidentsToUpdate.push(updatedIncident);
      }
    });

    // Update database
    if (incidentsToUpdate.length > 0) {
      console.log(`\n💾 Updating ${incidentsToUpdate.length} incidents...`);
      await db.incidents.bulkPut(incidentsToUpdate);
      console.log('✅ Database updated successfully!');
    } else {
      console.log('✅ No incidents need to be updated.');
    }

    console.log('\n📊 SUMMARY:');
    console.log(`Recalculated durations: ${recalculatedCount}`);
    console.log(`Problematic incidents: ${problematicCount}`);
    console.log(`Total updated: ${incidentsToUpdate.length}`);

    // Verify the results
    console.log('\n🔍 VERIFICATION:');
    const updatedIncidents = await db.incidents.toArray();
    
    // Check for any remaining suspicious durations
    const durationFrequency = {};
    updatedIncidents.forEach(inc => {
      if (inc.durationMin > 0) {
        const durationStr = formatDurationHMS(inc.durationMin);
        durationFrequency[durationStr] = (durationFrequency[durationStr] || 0) + 1;
      }
    });

    const suspiciousDurations = Object.entries(durationFrequency)
      .filter(([duration, count]) => count > 3)
      .sort(([,a], [,b]) => b - a);

    if (suspiciousDurations.length > 0) {
      console.log('\n⚠️ SUSPICIOUS DURATIONS (appearing > 3 times):');
      suspiciousDurations.forEach(([duration, count]) => {
        console.log(`${duration}: ${count} times`);
      });
    } else {
      console.log('\n✅ No suspicious durations found!');
    }

    // Show sample of recalculated durations
    console.log('\n📋 SAMPLE OF RECALCULATED DURATIONS:');
    const sampleIncidents = updatedIncidents.slice(0, 5);
    sampleIncidents.forEach(inc => {
      console.log(`${inc.noCase}:`, {
        duration: formatDurationHMS(inc.durationMin),
        vendorDuration: formatDurationHMS(inc.durationVendorMin),
        pauseDuration: formatDurationHMS(inc.totalDurationPauseMin),
        totalVendorDuration: formatDurationHMS(inc.totalDurationVendorMin),
        netDuration: formatDurationHMS(inc.netDurationMin)
      });
    });

  } catch (error) {
    console.error('❌ Error forcing duration recalculation:', error);
  }
});
