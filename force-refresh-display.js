// Script untuk memaksa refresh display dan memastikan perhitungan real-time berjalan
// Jalankan di browser console pada halaman Incident Data

console.log('🔄 MEMAKSA REFRESH DISPLAY DURASI...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    
    // 1. Verifikasi data di database
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);
    
    // 2. Cek durasi yang bermasalah
    const problematicDurations = ['07:14:19', '13:34:30', '05:14:28'];
    const problematicCount = allIncidents.filter(inc => 
      inc.durationMin && problematicDurations.includes(formatDurationHMS(inc.durationMin))
    ).length;
    
    console.log(`⚠️ Incidents dengan durasi bermasalah di database: ${problematicCount}`);
    
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
    
    // 3. Force clear dan recalculate semua durasi
    console.log('\n🔄 MEMAKSA RECALCULATE SEMUA DURASI...');
    
    const incidentsToUpdate = [];
    let updatedCount = 0;
    
    allIncidents.forEach((incident, index) => {
      const updatedIncident = { ...incident };
      let needsUpdate = false;
      
      // Helper function untuk menghitung durasi
      const calculateDuration = (startTime, endTime) => {
        if (!startTime || !endTime) return 0;
        try {
          const start = new Date(startTime);
          const end = new Date(endTime);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
          const diffMs = end.getTime() - start.getTime();
          const diffMinutes = diffMs / (1000 * 60);
          return Math.max(0, diffMinutes);
        } catch (error) {
          return 0;
        }
      };
      
      // Recalculate Duration (Start → End)
      if (incident.startTime && incident.endTime) {
        const calculatedDuration = calculateDuration(incident.startTime, incident.endTime);
        if (calculatedDuration > 0 && calculatedDuration <= 1440) {
          updatedIncident.durationMin = Math.round(calculatedDuration * 100) / 100;
          needsUpdate = true;
          updatedCount++;
        } else {
          updatedIncident.durationMin = 0;
          needsUpdate = true;
        }
      } else {
        updatedIncident.durationMin = 0;
        needsUpdate = true;
      }
      
      // Recalculate Duration Vendor (Start Escalation Vendor → End)
      if (incident.startEscalationVendor && incident.endTime) {
        const calculatedVendorDuration = calculateDuration(incident.startEscalationVendor, incident.endTime);
        if (calculatedVendorDuration > 0 && calculatedVendorDuration <= 1440) {
          updatedIncident.durationVendorMin = Math.round(calculatedVendorDuration * 100) / 100;
          needsUpdate = true;
        } else {
          updatedIncident.durationVendorMin = 0;
          needsUpdate = true;
        }
      } else {
        updatedIncident.durationVendorMin = 0;
        needsUpdate = true;
      }
      
      // Recalculate Total Duration Pause (Pause 1 + Pause 2)
      let totalPauseMinutes = 0;
      if (incident.startPause1 && incident.endPause1) {
        const pause1Duration = calculateDuration(incident.startPause1, incident.endPause1);
        if (pause1Duration > 0 && pause1Duration <= 1440) {
          totalPauseMinutes += pause1Duration;
        }
      }
      if (incident.startPause2 && incident.endPause2) {
        const pause2Duration = calculateDuration(incident.startPause2, incident.endPause2);
        if (pause2Duration > 0 && pause2Duration <= 1440) {
          totalPauseMinutes += pause2Duration;
        }
      }
      updatedIncident.totalDurationPauseMin = Math.round(totalPauseMinutes * 100) / 100;
      needsUpdate = true;
      
      // Recalculate Total Duration Vendor (Duration Vendor - Total Duration Pause)
      const totalVendorDuration = Math.max(updatedIncident.durationVendorMin - updatedIncident.totalDurationPauseMin, 0);
      updatedIncident.totalDurationVendorMin = Math.round(totalVendorDuration * 100) / 100;
      needsUpdate = true;
      
      // Recalculate Net Duration (Duration - Total Duration Pause)
      const netDuration = Math.max(updatedIncident.durationMin - updatedIncident.totalDurationPauseMin, 0);
      updatedIncident.netDurationMin = Math.round(netDuration * 100) / 100;
      needsUpdate = true;
      
      if (needsUpdate) {
        incidentsToUpdate.push(updatedIncident);
      }
    });
    
    // 4. Update database
    if (incidentsToUpdate.length > 0) {
      console.log(`💾 Updating ${incidentsToUpdate.length} incidents...`);
      await db.incidents.bulkPut(incidentsToUpdate);
      console.log('✅ Database updated successfully!');
    }
    
    // 5. Force clear browser cache dan reload
    console.log('\n🔄 MEMAKSA CLEAR CACHE DAN RELOAD...');
    
    // Clear localStorage dan sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Force reload halaman
    console.log('🔄 Reloading halaman...');
    window.location.reload(true);
    
  } catch (error) {
    console.error('❌ Error forcing refresh:', error);
  }
});
