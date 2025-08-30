// Script untuk menganalisis data durasi di database
// Jalankan di browser console pada halaman Incident Data

console.log('🔍 ANALISIS DATA DURASI DI DATABASE...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);

    // Analisis durasi
    const durationAnalysis = {
      totalIncidents: allIncidents.length,
      withStartTime: 0,
      withEndTime: 0,
      withBothTimes: 0,
      withDurationMin: 0,
      uniqueDurations: new Set(),
      durationFrequency: {},
      suspiciousDurations: [],
      invalidDurations: []
    };

    allIncidents.forEach((incident, index) => {
      // Hitung statistik
      if (incident.startTime) durationAnalysis.withStartTime++;
      if (incident.endTime) durationAnalysis.withEndTime++;
      if (incident.startTime && incident.endTime) durationAnalysis.withBothTimes++;
      if (incident.durationMin && incident.durationMin > 0) durationAnalysis.withDurationMin++;

      // Analisis durasi yang ada
      if (incident.durationMin && incident.durationMin > 0) {
        const durationStr = formatDurationHMS(incident.durationMin);
        durationAnalysis.uniqueDurations.add(durationStr);
        
        // Hitung frekuensi
        durationAnalysis.durationFrequency[durationStr] = 
          (durationAnalysis.durationFrequency[durationStr] || 0) + 1;

        // Cek durasi yang mencurigakan (berulang atau terlalu besar)
        if (durationAnalysis.durationFrequency[durationStr] > 3) {
          durationAnalysis.suspiciousDurations.push({
            noCase: incident.noCase,
            duration: durationStr,
            durationMin: incident.durationMin,
            frequency: durationAnalysis.durationFrequency[durationStr],
            startTime: incident.startTime,
            endTime: incident.endTime
          });
        }

        // Cek durasi yang tidak masuk akal (> 24 jam)
        if (incident.durationMin > 1440) {
          durationAnalysis.invalidDurations.push({
            noCase: incident.noCase,
            duration: durationStr,
            durationMin: incident.durationMin,
            startTime: incident.startTime,
            endTime: incident.endTime
          });
        }
      }

      // Debug untuk 10 incident pertama
      if (index < 10) {
        console.log(`🔍 Incident ${index + 1}:`, {
          noCase: incident.noCase,
          startTime: incident.startTime,
          endTime: incident.endTime,
          durationMin: incident.durationMin,
          durationFormatted: incident.durationMin ? formatDurationHMS(incident.durationMin) : 'N/A'
        });
      }
    });

    // Tampilkan hasil analisis
    console.log('📊 HASIL ANALISIS DURASI:');
    console.log('========================');
    console.log(`Total incidents: ${durationAnalysis.totalIncidents}`);
    console.log(`With start time: ${durationAnalysis.withStartTime}`);
    console.log(`With end time: ${durationAnalysis.withEndTime}`);
    console.log(`With both times: ${durationAnalysis.withBothTimes}`);
    console.log(`With duration min: ${durationAnalysis.withDurationMin}`);
    console.log(`Unique durations: ${durationAnalysis.uniqueDurations.size}`);

    console.log('\n📈 FREKUENSI DURASI (yang muncul > 1 kali):');
    Object.entries(durationAnalysis.durationFrequency)
      .filter(([duration, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .forEach(([duration, count]) => {
        console.log(`${duration}: ${count} kali`);
      });

    if (durationAnalysis.suspiciousDurations.length > 0) {
      console.log('\n⚠️ DURASI MENcurigakan (berulang > 3 kali):');
      durationAnalysis.suspiciousDurations.forEach(item => {
        console.log(`${item.noCase}: ${item.duration} (${item.frequency} kali)`);
      });
    }

    if (durationAnalysis.invalidDurations.length > 0) {
      console.log('\n❌ DURASI TIDAK VALID (> 24 jam):');
      durationAnalysis.invalidDurations.forEach(item => {
        console.log(`${item.noCase}: ${item.duration} (${item.durationMin} menit)`);
      });
    }

    // Cek apakah durasi bisa dihitung ulang
    console.log('\n🧮 TEST PERHITUNGAN ULANG DURASI:');
    const testIncidents = allIncidents.filter(inc => inc.startTime && inc.endTime).slice(0, 5);
    testIncidents.forEach(incident => {
      const start = new Date(incident.startTime);
      const end = new Date(incident.endTime);
      const calculatedMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const calculatedDuration = formatDurationHMS(calculatedMinutes);
      
      console.log(`${incident.noCase}:`);
      console.log(`  Start: ${start.toISOString()}`);
      console.log(`  End: ${end.toISOString()}`);
      console.log(`  Database duration: ${incident.durationMin ? formatDurationHMS(incident.durationMin) : 'N/A'}`);
      console.log(`  Calculated duration: ${calculatedDuration}`);
      console.log(`  Match: ${Math.abs(calculatedMinutes - (incident.durationMin || 0)) < 1 ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ Error analyzing duration data:', error);
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

console.log('🔍 ANALISIS DATA DURASI DI DATABASE...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);

    // Analisis durasi
    const durationAnalysis = {
      totalIncidents: allIncidents.length,
      withStartTime: 0,
      withEndTime: 0,
      withBothTimes: 0,
      withDurationMin: 0,
      uniqueDurations: new Set(),
      durationFrequency: {},
      suspiciousDurations: [],
      invalidDurations: []
    };

    allIncidents.forEach((incident, index) => {
      // Hitung statistik
      if (incident.startTime) durationAnalysis.withStartTime++;
      if (incident.endTime) durationAnalysis.withEndTime++;
      if (incident.startTime && incident.endTime) durationAnalysis.withBothTimes++;
      if (incident.durationMin && incident.durationMin > 0) durationAnalysis.withDurationMin++;

      // Analisis durasi yang ada
      if (incident.durationMin && incident.durationMin > 0) {
        const durationStr = formatDurationHMS(incident.durationMin);
        durationAnalysis.uniqueDurations.add(durationStr);
        
        // Hitung frekuensi
        durationAnalysis.durationFrequency[durationStr] = 
          (durationAnalysis.durationFrequency[durationStr] || 0) + 1;

        // Cek durasi yang mencurigakan (berulang atau terlalu besar)
        if (durationAnalysis.durationFrequency[durationStr] > 3) {
          durationAnalysis.suspiciousDurations.push({
            noCase: incident.noCase,
            duration: durationStr,
            durationMin: incident.durationMin,
            frequency: durationAnalysis.durationFrequency[durationStr],
            startTime: incident.startTime,
            endTime: incident.endTime
          });
        }

        // Cek durasi yang tidak masuk akal (> 24 jam)
        if (incident.durationMin > 1440) {
          durationAnalysis.invalidDurations.push({
            noCase: incident.noCase,
            duration: durationStr,
            durationMin: incident.durationMin,
            startTime: incident.startTime,
            endTime: incident.endTime
          });
        }
      }

      // Debug untuk 10 incident pertama
      if (index < 10) {
        console.log(`🔍 Incident ${index + 1}:`, {
          noCase: incident.noCase,
          startTime: incident.startTime,
          endTime: incident.endTime,
          durationMin: incident.durationMin,
          durationFormatted: incident.durationMin ? formatDurationHMS(incident.durationMin) : 'N/A'
        });
      }
    });

    // Tampilkan hasil analisis
    console.log('📊 HASIL ANALISIS DURASI:');
    console.log('========================');
    console.log(`Total incidents: ${durationAnalysis.totalIncidents}`);
    console.log(`With start time: ${durationAnalysis.withStartTime}`);
    console.log(`With end time: ${durationAnalysis.withEndTime}`);
    console.log(`With both times: ${durationAnalysis.withBothTimes}`);
    console.log(`With duration min: ${durationAnalysis.withDurationMin}`);
    console.log(`Unique durations: ${durationAnalysis.uniqueDurations.size}`);

    console.log('\n📈 FREKUENSI DURASI (yang muncul > 1 kali):');
    Object.entries(durationAnalysis.durationFrequency)
      .filter(([duration, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .forEach(([duration, count]) => {
        console.log(`${duration}: ${count} kali`);
      });

    if (durationAnalysis.suspiciousDurations.length > 0) {
      console.log('\n⚠️ DURASI MENcurigakan (berulang > 3 kali):');
      durationAnalysis.suspiciousDurations.forEach(item => {
        console.log(`${item.noCase}: ${item.duration} (${item.frequency} kali)`);
      });
    }

    if (durationAnalysis.invalidDurations.length > 0) {
      console.log('\n❌ DURASI TIDAK VALID (> 24 jam):');
      durationAnalysis.invalidDurations.forEach(item => {
        console.log(`${item.noCase}: ${item.duration} (${item.durationMin} menit)`);
      });
    }

    // Cek apakah durasi bisa dihitung ulang
    console.log('\n🧮 TEST PERHITUNGAN ULANG DURASI:');
    const testIncidents = allIncidents.filter(inc => inc.startTime && inc.endTime).slice(0, 5);
    testIncidents.forEach(incident => {
      const start = new Date(incident.startTime);
      const end = new Date(incident.endTime);
      const calculatedMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const calculatedDuration = formatDurationHMS(calculatedMinutes);
      
      console.log(`${incident.noCase}:`);
      console.log(`  Start: ${start.toISOString()}`);
      console.log(`  End: ${end.toISOString()}`);
      console.log(`  Database duration: ${incident.durationMin ? formatDurationHMS(incident.durationMin) : 'N/A'}`);
      console.log(`  Calculated duration: ${calculatedDuration}`);
      console.log(`  Match: ${Math.abs(calculatedMinutes - (incident.durationMin || 0)) < 1 ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ Error analyzing duration data:', error);
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
