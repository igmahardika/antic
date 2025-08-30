// Script untuk menganalisis masalah durasi secara spesifik
// Jalankan di browser console pada halaman Incident Data

console.log('🔍 ANALISIS MASALAH DURASI SECARA SPESIFIK...');

// Import database
import('/src/lib/db.js').then(async ({ db }) => {
  try {
    console.log('📊 Mengakses database...');
    const allIncidents = await db.incidents.toArray();
    console.log(`📋 Total incidents: ${allIncidents.length}`);

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

    // Analisis durasi yang bermasalah
    const problematicDurations = ['07:14:19', '13:34:30', '05:14:28'];
    const analysis = {
      totalIncidents: allIncidents.length,
      incidentsWithProblematicDuration: [],
      incidentsWithValidStartEnd: [],
      incidentsWithMissingStartEnd: [],
      durationFrequency: {},
      startEndTimeIssues: []
    };

    allIncidents.forEach((incident, index) => {
      // Analisis frekuensi durasi
      if (incident.durationMin && incident.durationMin > 0) {
        const durationStr = formatDurationHMS(incident.durationMin);
        analysis.durationFrequency[durationStr] = (analysis.durationFrequency[durationStr] || 0) + 1;
        
        // Cek durasi yang bermasalah
        if (problematicDurations.includes(durationStr)) {
          analysis.incidentsWithProblematicDuration.push({
            index: index + 1,
            noCase: incident.noCase,
            durationMin: incident.durationMin,
            durationFormatted: durationStr,
            startTime: incident.startTime,
            endTime: incident.endTime,
            startEscalationVendor: incident.startEscalationVendor
          });
        }
      }

      // Analisis start/end time
      if (incident.startTime && incident.endTime) {
        const calculatedDuration = calculateDuration(incident.startTime, incident.endTime);
        const calculatedDurationStr = formatDurationHMS(calculatedDuration);
        
        analysis.incidentsWithValidStartEnd.push({
          index: index + 1,
          noCase: incident.noCase,
          startTime: incident.startTime,
          endTime: incident.endTime,
          databaseDuration: incident.durationMin,
          databaseDurationFormatted: formatDurationHMS(incident.durationMin),
          calculatedDuration: calculatedDuration,
          calculatedDurationFormatted: calculatedDurationStr,
          match: Math.abs(calculatedDuration - (incident.durationMin || 0)) < 1
        });

        // Cek apakah ada mismatch
        if (Math.abs(calculatedDuration - (incident.durationMin || 0)) > 1) {
          analysis.startEndTimeIssues.push({
            index: index + 1,
            noCase: incident.noCase,
            startTime: incident.startTime,
            endTime: incident.endTime,
            databaseDuration: incident.durationMin,
            databaseDurationFormatted: formatDurationHMS(incident.durationMin),
            calculatedDuration: calculatedDuration,
            calculatedDurationFormatted: calculatedDurationStr,
            difference: Math.abs(calculatedDuration - (incident.durationMin || 0))
          });
        }
      } else {
        analysis.incidentsWithMissingStartEnd.push({
          index: index + 1,
          noCase: incident.noCase,
          startTime: incident.startTime,
          endTime: incident.endTime,
          durationMin: incident.durationMin,
          durationFormatted: formatDurationHMS(incident.durationMin)
        });
      }
    });

    // Tampilkan hasil analisis
    console.log('\n📊 HASIL ANALISIS DURASI:');
    console.log('========================');
    console.log(`Total incidents: ${analysis.totalIncidents}`);
    console.log(`Incidents with valid start/end time: ${analysis.incidentsWithValidStartEnd.length}`);
    console.log(`Incidents with missing start/end time: ${analysis.incidentsWithMissingStartEnd.length}`);
    console.log(`Incidents with problematic duration: ${analysis.incidentsWithProblematicDuration.length}`);
    console.log(`Incidents with start/end time mismatch: ${analysis.startEndTimeIssues.length}`);

    // Tampilkan frekuensi durasi yang mencurigakan
    console.log('\n📈 FREKUENSI DURASI (yang muncul > 1 kali):');
    Object.entries(analysis.durationFrequency)
      .filter(([duration, count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .forEach(([duration, count]) => {
        console.log(`${duration}: ${count} kali`);
      });

    // Tampilkan incident dengan durasi bermasalah
    if (analysis.incidentsWithProblematicDuration.length > 0) {
      console.log('\n⚠️ INCIDENTS DENGAN DURASI BERMASALAH:');
      analysis.incidentsWithProblematicDuration.forEach(item => {
        console.log(`${item.index}. ${item.noCase}:`, {
          duration: item.durationFormatted,
          durationMin: item.durationMin,
          startTime: item.startTime,
          endTime: item.endTime,
          hasStartTime: !!item.startTime,
          hasEndTime: !!item.endTime
        });
      });
    }

    // Tampilkan incident dengan start/end time mismatch
    if (analysis.startEndTimeIssues.length > 0) {
      console.log('\n❌ INCIDENTS DENGAN START/END TIME MISMATCH:');
      analysis.startEndTimeIssues.slice(0, 10).forEach(item => {
        console.log(`${item.index}. ${item.noCase}:`, {
          startTime: item.startTime,
          endTime: item.endTime,
          databaseDuration: item.databaseDurationFormatted,
          calculatedDuration: item.calculatedDurationFormatted,
          difference: `${item.difference.toFixed(2)} minutes`
        });
      });
      
      if (analysis.startEndTimeIssues.length > 10) {
        console.log(`... dan ${analysis.startEndTimeIssues.length - 10} incident lainnya`);
      }
    }

    // Tampilkan incident dengan missing start/end time
    if (analysis.incidentsWithMissingStartEnd.length > 0) {
      console.log('\n⚠️ INCIDENTS DENGAN MISSING START/END TIME:');
      analysis.incidentsWithMissingStartEnd.slice(0, 10).forEach(item => {
        console.log(`${item.index}. ${item.noCase}:`, {
          startTime: item.startTime,
          endTime: item.endTime,
          durationMin: item.durationMin,
          durationFormatted: item.durationFormatted
        });
      });
      
      if (analysis.incidentsWithMissingStartEnd.length > 10) {
        console.log(`... dan ${analysis.incidentsWithMissingStartEnd.length - 10} incident lainnya`);
      }
    }

    // Analisis spesifik untuk durasi 07:14:19
    const duration071419 = analysis.incidentsWithProblematicDuration.filter(item => item.durationFormatted === '07:14:19');
    if (duration071419.length > 0) {
      console.log('\n🔍 ANALISIS SPESIFIK UNTUK DURASI 07:14:19:');
      console.log(`Total incidents dengan durasi 07:14:19: ${duration071419.length}`);
      
      // Cek apakah semua incident ini memiliki start/end time yang sama
      const startEndTimes = duration071419.map(item => ({
        startTime: item.startTime,
        endTime: item.endTime
      }));
      
      const uniqueStartEndTimes = [...new Set(startEndTimes.map(item => `${item.startTime}|${item.endTime}`))];
      console.log(`Unique start/end time combinations: ${uniqueStartEndTimes.length}`);
      
      if (uniqueStartEndTimes.length === 1) {
        console.log('✅ Semua incident dengan durasi 07:14:19 memiliki start/end time yang sama!');
        console.log('Start/End time:', uniqueStartEndTimes[0]);
      } else {
        console.log('❌ Incident dengan durasi 07:14:19 memiliki start/end time yang berbeda!');
        uniqueStartEndTimes.slice(0, 5).forEach((timeCombo, index) => {
          console.log(`${index + 1}. ${timeCombo}`);
        });
      }
    }

    // Rekomendasi
    console.log('\n💡 REKOMENDASI:');
    if (analysis.incidentsWithProblematicDuration.length > 0) {
      console.log('1. Jalankan script force-recalculate-durations.js untuk memperbaiki durasi bermasalah');
    }
    if (analysis.startEndTimeIssues.length > 0) {
      console.log('2. Periksa data start/end time yang tidak konsisten');
    }
    if (analysis.incidentsWithMissingStartEnd.length > 0) {
      console.log('3. Periksa incident yang tidak memiliki start/end time');
    }
    console.log('4. Refresh halaman setelah menjalankan script perbaikan');

  } catch (error) {
    console.error('❌ Error analyzing duration issues:', error);
  }
});
