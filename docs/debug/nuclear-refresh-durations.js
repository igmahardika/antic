// NUCLEAR OPTION: Script untuk memaksa refresh total semua durasi
// Jalankan di browser console pada halaman Incident Data

console.log('☢️ NUCLEAR REFRESH: MEMAKSA REFRESH TOTAL SEMUA DURASI...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    
    // 1. Verifikasi data di database
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);
    
    // 2. NUCLEAR OPTION: Reset SEMUA durasi ke 0 terlebih dahulu
    console.log('\n☢️ NUCLEAR STEP 1: Reset semua durasi ke 0...');
    
    const resetIncidents = allIncidents.map(incident => ({
      ...incident,
      durationMin: 0,
      durationVendorMin: 0,
      totalDurationPauseMin: 0,
      totalDurationVendorMin: 0,
      netDurationMin: 0
    }));
    
    await db.incidents.bulkPut(resetIncidents);
    console.log('✅ Semua durasi direset ke 0!');
    
    // 3. Recalculate SEMUA durasi dari awal
    console.log('\n🔄 NUCLEAR STEP 2: Recalculate semua durasi dari awal...');
    
    const incidentsToUpdate = [];
    let recalculatedCount = 0;
    
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
      
      // 1. Recalculate Duration (Start → End)
      if (incident.startTime && incident.endTime) {
        const calculatedDuration = calculateDuration(incident.startTime, incident.endTime);
        const formattedDuration = formatDurationHMS(calculatedDuration);
        
        console.log(`  📊 Duration calculation:`, {
          startTime: incident.startTime,
          endTime: incident.endTime,
          calculatedMinutes: calculatedDuration,
          formattedDuration: formattedDuration
        });
        
        if (calculatedDuration > 0 && calculatedDuration <= 1440) {
          updatedIncident.durationMin = Math.round(calculatedDuration * 100) / 100;
          recalculatedCount++;
          console.log(`  ✅ Duration: ${formattedDuration}`);
        } else {
          updatedIncident.durationMin = 0;
          console.log(`  ❌ Invalid duration: ${calculatedDuration} minutes`);
        }
      } else {
        updatedIncident.durationMin = 0;
        console.log(`  ⚠️ Missing start/end time`);
      }
      
      // 2. Recalculate Duration Vendor (Start Escalation Vendor → End)
      if (incident.startEscalationVendor && incident.endTime) {
        const calculatedVendorDuration = calculateDuration(incident.startEscalationVendor, incident.endTime);
        const formattedVendorDuration = formatDurationHMS(calculatedVendorDuration);
        
        if (calculatedVendorDuration > 0 && calculatedVendorDuration <= 1440) {
          updatedIncident.durationVendorMin = Math.round(calculatedVendorDuration * 100) / 100;
          console.log(`  ✅ Vendor Duration: ${formattedVendorDuration}`);
        } else {
          updatedIncident.durationVendorMin = 0;
          console.log(`  ❌ Invalid vendor duration: ${calculatedVendorDuration} minutes`);
        }
      } else {
        updatedIncident.durationVendorMin = 0;
        console.log(`  ⚠️ Missing vendor escalation/end time`);
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
      
      // 4. Recalculate Total Duration Vendor (Duration Vendor - Total Duration Pause)
      const totalVendorDuration = Math.max(updatedIncident.durationVendorMin - updatedIncident.totalDurationPauseMin, 0);
      updatedIncident.totalDurationVendorMin = Math.round(totalVendorDuration * 100) / 100;
      console.log(`  📊 Total Vendor Duration: ${formatDurationHMS(updatedIncident.totalDurationVendorMin)}`);
      
      // 5. Recalculate Net Duration (Duration - Total Duration Pause)
      const netDuration = Math.max(updatedIncident.durationMin - updatedIncident.totalDurationPauseMin, 0);
      updatedIncident.netDurationMin = Math.round(netDuration * 100) / 100;
      console.log(`  📊 Net Duration: ${formatDurationHMS(updatedIncident.netDurationMin)}`);
      
      incidentsToUpdate.push(updatedIncident);
    });
    
    // 4. Update database dengan data yang sudah di-recalculate
    console.log(`\n💾 Updating ${incidentsToUpdate.length} incidents...`);
    await db.incidents.bulkPut(incidentsToUpdate);
    console.log('✅ Database updated successfully!');
    
    // 5. NUCLEAR CLEAR: Clear semua cache dan storage
    console.log('\n☢️ NUCLEAR STEP 3: Clear semua cache dan storage...');
    
    // Clear localStorage
    localStorage.clear();
    console.log('✅ localStorage cleared');
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Clear IndexedDB cache (jika ada)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('✅ Browser caches cleared');
      } catch (error) {
        console.log('⚠️ Could not clear browser caches');
      }
    }
    
    // 6. Force hard reload
    console.log('\n☢️ NUCLEAR STEP 4: Force hard reload...');
    console.log('🔄 Reloading halaman dengan cache bypass...');
    
    // Force reload dengan bypass cache
    window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + '_t=' + Date.now();
    
  } catch (error) {
    console.error('❌ Error in nuclear refresh:', error);
  }
});
// Jalankan di browser console pada halaman Incident Data

console.log('☢️ NUCLEAR REFRESH: MEMAKSA REFRESH TOTAL SEMUA DURASI...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    
    // 1. Verifikasi data di database
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);
    
    // 2. NUCLEAR OPTION: Reset SEMUA durasi ke 0 terlebih dahulu
    console.log('\n☢️ NUCLEAR STEP 1: Reset semua durasi ke 0...');
    
    const resetIncidents = allIncidents.map(incident => ({
      ...incident,
      durationMin: 0,
      durationVendorMin: 0,
      totalDurationPauseMin: 0,
      totalDurationVendorMin: 0,
      netDurationMin: 0
    }));
    
    await db.incidents.bulkPut(resetIncidents);
    console.log('✅ Semua durasi direset ke 0!');
    
    // 3. Recalculate SEMUA durasi dari awal
    console.log('\n🔄 NUCLEAR STEP 2: Recalculate semua durasi dari awal...');
    
    const incidentsToUpdate = [];
    let recalculatedCount = 0;
    
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
      
      // 1. Recalculate Duration (Start → End)
      if (incident.startTime && incident.endTime) {
        const calculatedDuration = calculateDuration(incident.startTime, incident.endTime);
        const formattedDuration = formatDurationHMS(calculatedDuration);
        
        console.log(`  📊 Duration calculation:`, {
          startTime: incident.startTime,
          endTime: incident.endTime,
          calculatedMinutes: calculatedDuration,
          formattedDuration: formattedDuration
        });
        
        if (calculatedDuration > 0 && calculatedDuration <= 1440) {
          updatedIncident.durationMin = Math.round(calculatedDuration * 100) / 100;
          recalculatedCount++;
          console.log(`  ✅ Duration: ${formattedDuration}`);
        } else {
          updatedIncident.durationMin = 0;
          console.log(`  ❌ Invalid duration: ${calculatedDuration} minutes`);
        }
      } else {
        updatedIncident.durationMin = 0;
        console.log(`  ⚠️ Missing start/end time`);
      }
      
      // 2. Recalculate Duration Vendor (Start Escalation Vendor → End)
      if (incident.startEscalationVendor && incident.endTime) {
        const calculatedVendorDuration = calculateDuration(incident.startEscalationVendor, incident.endTime);
        const formattedVendorDuration = formatDurationHMS(calculatedVendorDuration);
        
        if (calculatedVendorDuration > 0 && calculatedVendorDuration <= 1440) {
          updatedIncident.durationVendorMin = Math.round(calculatedVendorDuration * 100) / 100;
          console.log(`  ✅ Vendor Duration: ${formattedVendorDuration}`);
        } else {
          updatedIncident.durationVendorMin = 0;
          console.log(`  ❌ Invalid vendor duration: ${calculatedVendorDuration} minutes`);
        }
      } else {
        updatedIncident.durationVendorMin = 0;
        console.log(`  ⚠️ Missing vendor escalation/end time`);
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
      
      // 4. Recalculate Total Duration Vendor (Duration Vendor - Total Duration Pause)
      const totalVendorDuration = Math.max(updatedIncident.durationVendorMin - updatedIncident.totalDurationPauseMin, 0);
      updatedIncident.totalDurationVendorMin = Math.round(totalVendorDuration * 100) / 100;
      console.log(`  📊 Total Vendor Duration: ${formatDurationHMS(updatedIncident.totalDurationVendorMin)}`);
      
      // 5. Recalculate Net Duration (Duration - Total Duration Pause)
      const netDuration = Math.max(updatedIncident.durationMin - updatedIncident.totalDurationPauseMin, 0);
      updatedIncident.netDurationMin = Math.round(netDuration * 100) / 100;
      console.log(`  📊 Net Duration: ${formatDurationHMS(updatedIncident.netDurationMin)}`);
      
      incidentsToUpdate.push(updatedIncident);
    });
    
    // 4. Update database dengan data yang sudah di-recalculate
    console.log(`\n💾 Updating ${incidentsToUpdate.length} incidents...`);
    await db.incidents.bulkPut(incidentsToUpdate);
    console.log('✅ Database updated successfully!');
    
    // 5. NUCLEAR CLEAR: Clear semua cache dan storage
    console.log('\n☢️ NUCLEAR STEP 3: Clear semua cache dan storage...');
    
    // Clear localStorage
    localStorage.clear();
    console.log('✅ localStorage cleared');
    
    // Clear sessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
    
    // Clear IndexedDB cache (jika ada)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('✅ Browser caches cleared');
      } catch (error) {
        console.log('⚠️ Could not clear browser caches');
      }
    }
    
    // 6. Force hard reload
    console.log('\n☢️ NUCLEAR STEP 4: Force hard reload...');
    console.log('🔄 Reloading halaman dengan cache bypass...');
    
    // Force reload dengan bypass cache
    window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + '_t=' + Date.now();
    
  } catch (error) {
    console.error('❌ Error in nuclear refresh:', error);
  }
});
