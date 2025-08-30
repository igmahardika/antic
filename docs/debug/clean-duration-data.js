// Script untuk membersihkan data durasi lama di database
// Jalankan di browser console pada halaman Incident Data

console.log('🧹 MEMBERSIHKAN DATA DURASI LAMA DI DATABASE...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);

    const incidentsToUpdate = [];
    let cleanedCount = 0;
    let recalculatedCount = 0;

    allIncidents.forEach((incident) => {
      let needsUpdate = false;
      const updatedIncident = { ...incident };

      // Reset semua durasi ke 0 untuk memaksa perhitungan ulang
      if (incident.durationMin !== 0) {
        console.log(`🔄 Resetting duration for ${incident.noCase}: ${incident.durationMin} → 0`);
        updatedIncident.durationMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      if (incident.durationVendorMin !== 0) {
        console.log(`🔄 Resetting vendor duration for ${incident.noCase}: ${incident.durationVendorMin} → 0`);
        updatedIncident.durationVendorMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      if (incident.totalDurationPauseMin !== 0) {
        console.log(`🔄 Resetting pause duration for ${incident.noCase}: ${incident.totalDurationPauseMin} → 0`);
        updatedIncident.totalDurationPauseMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      if (incident.totalDurationVendorMin !== 0) {
        console.log(`🔄 Resetting total vendor duration for ${incident.noCase}: ${incident.totalDurationVendorMin} → 0`);
        updatedIncident.totalDurationVendorMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      if (incident.netDurationMin !== 0) {
        console.log(`🔄 Resetting net duration for ${incident.noCase}: ${incident.netDurationMin} → 0`);
        updatedIncident.netDurationMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      // Recalculate durations based on actual start/end times
      if (incident.startTime && incident.endTime) {
        try {
          const start = new Date(incident.startTime);
          const end = new Date(incident.endTime);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            
            if (diffMinutes >= 0 && diffMinutes <= 1440) {
              updatedIncident.durationMin = Math.round(diffMinutes * 100) / 100;
              console.log(`✅ Recalculated duration for ${incident.noCase}: ${updatedIncident.durationMin} minutes`);
              recalculatedCount++;
            }
          }
        } catch (error) {
          console.error(`Error calculating duration for ${incident.noCase}:`, error);
        }
      }

      // Recalculate vendor duration
      if (incident.startEscalationVendor && incident.endTime) {
        try {
          const start = new Date(incident.startEscalationVendor);
          const end = new Date(incident.endTime);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            
            if (diffMinutes >= 0 && diffMinutes <= 1440) {
              updatedIncident.durationVendorMin = Math.round(diffMinutes * 100) / 100;
              console.log(`✅ Recalculated vendor duration for ${incident.noCase}: ${updatedIncident.durationVendorMin} minutes`);
              recalculatedCount++;
            }
          }
        } catch (error) {
          console.error(`Error calculating vendor duration for ${incident.noCase}:`, error);
        }
      }

      // Recalculate pause duration
      let totalPauseMinutes = 0;
      
      if (incident.startPause1 && incident.endPause1) {
        try {
          const start = new Date(incident.startPause1);
          const end = new Date(incident.endPause1);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            
            if (diffMinutes >= 0 && diffMinutes <= 1440) {
              totalPauseMinutes += diffMinutes;
            }
          }
        } catch (error) {
          console.error(`Error calculating pause 1 for ${incident.noCase}:`, error);
        }
      }

      if (incident.startPause2 && incident.endPause2) {
        try {
          const start = new Date(incident.startPause2);
          const end = new Date(incident.endPause2);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            
            if (diffMinutes >= 0 && diffMinutes <= 1440) {
              totalPauseMinutes += diffMinutes;
            }
          }
        } catch (error) {
          console.error(`Error calculating pause 2 for ${incident.noCase}:`, error);
        }
      }

      if (totalPauseMinutes > 0) {
        updatedIncident.totalDurationPauseMin = Math.round(totalPauseMinutes * 100) / 100;
        console.log(`✅ Recalculated pause duration for ${incident.noCase}: ${updatedIncident.totalDurationPauseMin} minutes`);
        recalculatedCount++;
      }

      // Recalculate total vendor duration
      if (updatedIncident.durationVendorMin > 0) {
        const totalVendorDuration = Math.max(updatedIncident.durationVendorMin - updatedIncident.totalDurationPauseMin, 0);
        updatedIncident.totalDurationVendorMin = Math.round(totalVendorDuration * 100) / 100;
        console.log(`✅ Recalculated total vendor duration for ${incident.noCase}: ${updatedIncident.totalDurationVendorMin} minutes`);
        recalculatedCount++;
      }

      // Recalculate net duration
      if (updatedIncident.durationMin > 0) {
        const netDuration = Math.max(updatedIncident.durationMin - updatedIncident.totalDurationPauseMin, 0);
        updatedIncident.netDurationMin = Math.round(netDuration * 100) / 100;
        console.log(`✅ Recalculated net duration for ${incident.noCase}: ${updatedIncident.netDurationMin} minutes`);
        recalculatedCount++;
      }

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
    console.log(`Cleaned durations: ${cleanedCount}`);
    console.log(`Recalculated durations: ${recalculatedCount}`);
    console.log(`Total updated: ${incidentsToUpdate.length}`);

    // Verify the cleanup
    console.log('\n🔍 VERIFICATION:');
    const updatedIncidents = await db.incidents.toArray();
    const incidentsWithValidDuration = updatedIncidents.filter(inc => 
      inc.durationMin > 0 && inc.durationMin <= 1440
    ).length;
    const incidentsWithValidVendorDuration = updatedIncidents.filter(inc => 
      inc.durationVendorMin > 0 && inc.durationVendorMin <= 1440
    ).length;

    console.log(`Incidents with valid duration: ${incidentsWithValidDuration}/${updatedIncidents.length}`);
    console.log(`Incidents with valid vendor duration: ${incidentsWithValidVendorDuration}/${updatedIncidents.length}`);

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

  } catch (error) {
    console.error('❌ Error cleaning duration data:', error);
  }
});

// Helper function untuk format durasi
function formatDurationHMS(minutes) {
  if (!minutes || isNaN(minutes) || minutes < 0) return '00:00:00';
  const totalSeconds = Math.floor(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
// Jalankan di browser console pada halaman Incident Data

console.log('🧹 MEMBERSIHKAN DATA DURASI LAMA DI DATABASE...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);

    const incidentsToUpdate = [];
    let cleanedCount = 0;
    let recalculatedCount = 0;

    allIncidents.forEach((incident) => {
      let needsUpdate = false;
      const updatedIncident = { ...incident };

      // Reset semua durasi ke 0 untuk memaksa perhitungan ulang
      if (incident.durationMin !== 0) {
        console.log(`🔄 Resetting duration for ${incident.noCase}: ${incident.durationMin} → 0`);
        updatedIncident.durationMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      if (incident.durationVendorMin !== 0) {
        console.log(`🔄 Resetting vendor duration for ${incident.noCase}: ${incident.durationVendorMin} → 0`);
        updatedIncident.durationVendorMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      if (incident.totalDurationPauseMin !== 0) {
        console.log(`🔄 Resetting pause duration for ${incident.noCase}: ${incident.totalDurationPauseMin} → 0`);
        updatedIncident.totalDurationPauseMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      if (incident.totalDurationVendorMin !== 0) {
        console.log(`🔄 Resetting total vendor duration for ${incident.noCase}: ${incident.totalDurationVendorMin} → 0`);
        updatedIncident.totalDurationVendorMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      if (incident.netDurationMin !== 0) {
        console.log(`🔄 Resetting net duration for ${incident.noCase}: ${incident.netDurationMin} → 0`);
        updatedIncident.netDurationMin = 0;
        needsUpdate = true;
        cleanedCount++;
      }

      // Recalculate durations based on actual start/end times
      if (incident.startTime && incident.endTime) {
        try {
          const start = new Date(incident.startTime);
          const end = new Date(incident.endTime);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            
            if (diffMinutes >= 0 && diffMinutes <= 1440) {
              updatedIncident.durationMin = Math.round(diffMinutes * 100) / 100;
              console.log(`✅ Recalculated duration for ${incident.noCase}: ${updatedIncident.durationMin} minutes`);
              recalculatedCount++;
            }
          }
        } catch (error) {
          console.error(`Error calculating duration for ${incident.noCase}:`, error);
        }
      }

      // Recalculate vendor duration
      if (incident.startEscalationVendor && incident.endTime) {
        try {
          const start = new Date(incident.startEscalationVendor);
          const end = new Date(incident.endTime);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            
            if (diffMinutes >= 0 && diffMinutes <= 1440) {
              updatedIncident.durationVendorMin = Math.round(diffMinutes * 100) / 100;
              console.log(`✅ Recalculated vendor duration for ${incident.noCase}: ${updatedIncident.durationVendorMin} minutes`);
              recalculatedCount++;
            }
          }
        } catch (error) {
          console.error(`Error calculating vendor duration for ${incident.noCase}:`, error);
        }
      }

      // Recalculate pause duration
      let totalPauseMinutes = 0;
      
      if (incident.startPause1 && incident.endPause1) {
        try {
          const start = new Date(incident.startPause1);
          const end = new Date(incident.endPause1);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            
            if (diffMinutes >= 0 && diffMinutes <= 1440) {
              totalPauseMinutes += diffMinutes;
            }
          }
        } catch (error) {
          console.error(`Error calculating pause 1 for ${incident.noCase}:`, error);
        }
      }

      if (incident.startPause2 && incident.endPause2) {
        try {
          const start = new Date(incident.startPause2);
          const end = new Date(incident.endPause2);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            
            if (diffMinutes >= 0 && diffMinutes <= 1440) {
              totalPauseMinutes += diffMinutes;
            }
          }
        } catch (error) {
          console.error(`Error calculating pause 2 for ${incident.noCase}:`, error);
        }
      }

      if (totalPauseMinutes > 0) {
        updatedIncident.totalDurationPauseMin = Math.round(totalPauseMinutes * 100) / 100;
        console.log(`✅ Recalculated pause duration for ${incident.noCase}: ${updatedIncident.totalDurationPauseMin} minutes`);
        recalculatedCount++;
      }

      // Recalculate total vendor duration
      if (updatedIncident.durationVendorMin > 0) {
        const totalVendorDuration = Math.max(updatedIncident.durationVendorMin - updatedIncident.totalDurationPauseMin, 0);
        updatedIncident.totalDurationVendorMin = Math.round(totalVendorDuration * 100) / 100;
        console.log(`✅ Recalculated total vendor duration for ${incident.noCase}: ${updatedIncident.totalDurationVendorMin} minutes`);
        recalculatedCount++;
      }

      // Recalculate net duration
      if (updatedIncident.durationMin > 0) {
        const netDuration = Math.max(updatedIncident.durationMin - updatedIncident.totalDurationPauseMin, 0);
        updatedIncident.netDurationMin = Math.round(netDuration * 100) / 100;
        console.log(`✅ Recalculated net duration for ${incident.noCase}: ${updatedIncident.netDurationMin} minutes`);
        recalculatedCount++;
      }

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
    console.log(`Cleaned durations: ${cleanedCount}`);
    console.log(`Recalculated durations: ${recalculatedCount}`);
    console.log(`Total updated: ${incidentsToUpdate.length}`);

    // Verify the cleanup
    console.log('\n🔍 VERIFICATION:');
    const updatedIncidents = await db.incidents.toArray();
    const incidentsWithValidDuration = updatedIncidents.filter(inc => 
      inc.durationMin > 0 && inc.durationMin <= 1440
    ).length;
    const incidentsWithValidVendorDuration = updatedIncidents.filter(inc => 
      inc.durationVendorMin > 0 && inc.durationVendorMin <= 1440
    ).length;

    console.log(`Incidents with valid duration: ${incidentsWithValidDuration}/${updatedIncidents.length}`);
    console.log(`Incidents with valid vendor duration: ${incidentsWithValidVendorDuration}/${updatedIncidents.length}`);

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

  } catch (error) {
    console.error('❌ Error cleaning duration data:', error);
  }
});

// Helper function untuk format durasi
function formatDurationHMS(minutes) {
  if (!minutes || isNaN(minutes) || minutes < 0) return '00:00:00';
  const totalSeconds = Math.floor(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (num) => num.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
