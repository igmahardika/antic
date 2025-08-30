// Script untuk debug masalah durasi - jalankan di browser console
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔍 DEBUG: Analyzing Duration Calculation Issues...');

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

// Fungsi untuk menghitung durasi dari format HH:MM:SS
const toMinutes = (duration) => {
  if (!duration) return 0;
  
  if (typeof duration === 'number') return duration;
  
  const str = String(duration).trim();
  if (!str || str === '-') return 0;
  
  // Handle HH:MM:SS format
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 60 + minutes + seconds / 60;
    } else if (parts.length === 2) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      return hours * 60 + minutes;
    }
  }
  
  // Handle decimal hours
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return num * 60;
  }
  
  return 0;
};

// Fungsi untuk format durasi ke HH:MM:SS
const formatDurationHMS = (minutes) => {
  if (!minutes || minutes <= 0) return '0:00:00';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Fungsi untuk menghitung durasi custom
const calculateCustomDuration = (incident) => {
  console.log(`\n🔧 Calculating duration for incident ${incident.id || incident.noCase || 'unknown'}`);
  
  // Log semua field yang tersedia
  console.log('📋 Available fields:', Object.keys(incident));
  
  // Log field waktu yang penting
  const timeFields = {
    'startTime': incident.startTime,
    'endTime': incident.endTime,
    'startEscalationVendor': incident.startEscalationVendor,
    'startPause1': incident.startPause1,
    'endPause1': incident.endPause1,
    'startPause2': incident.startPause2,
    'endPause2': incident.endPause2,
    'durationMin': incident.durationMin,
    'durationVendorMin': incident.durationVendorMin,
    'totalDurationPauseMin': incident.totalDurationPauseMin,
    'totalDurationVendorMin': incident.totalDurationVendorMin
  };
  
  console.log('⏰ Time fields:', timeFields);
  
  let totalDuration = 0;
  
  // 1. Coba hitung dari Start dan End
  if (incident.startTime && incident.endTime) {
    const startTime = parseDateSafe(incident.startTime);
    const endTime = parseDateSafe(incident.endTime);
    
    console.log('📅 Parsed Start/End:', {
      startTime: startTime?.toISOString(),
      endTime: endTime?.toISOString(),
      startValid: !!startTime,
      endValid: !!endTime
    });
    
    if (startTime && endTime && endTime > startTime) {
      totalDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      console.log(`✅ Calculated duration from Start/End: ${totalDuration.toFixed(2)}min (${formatDurationHMS(totalDuration)})`);
    } else {
      console.log('❌ Invalid Start/End times for calculation');
    }
  } else {
    console.log('❌ Missing Start or End time');
  }
  
  // 2. Cek durasi yang sudah ada di database
  console.log('📊 Existing duration fields:');
  console.log(`   - durationMin: ${incident.durationMin}min (${formatDurationHMS(incident.durationMin || 0)})`);
  console.log(`   - durationVendorMin: ${incident.durationVendorMin}min (${formatDurationHMS(incident.durationVendorMin || 0)})`);
  console.log(`   - totalDurationPauseMin: ${incident.totalDurationPauseMin}min (${formatDurationHMS(incident.totalDurationPauseMin || 0)})`);
  console.log(`   - totalDurationVendorMin: ${incident.totalDurationVendorMin}min (${formatDurationHMS(incident.totalDurationVendorMin || 0)})`);
  
  // 3. Hitung vendor duration
  let vendorDuration = 0;
  if (incident.startEscalationVendor && incident.endTime) {
    const vendorStart = parseDateSafe(incident.startEscalationVendor);
    const endTime = parseDateSafe(incident.endTime);
    
    if (vendorStart && endTime && endTime > vendorStart) {
      vendorDuration = (endTime.getTime() - vendorStart.getTime()) / (1000 * 60);
      console.log(`👨‍💼 Vendor duration: ${vendorDuration.toFixed(2)}min (${formatDurationHMS(vendorDuration)})`);
    }
  }
  
  // 4. Hitung pause duration
  let pauseDuration = 0;
  
  // Pause 1
  if (incident.startPause1 && incident.endPause1) {
    const pause1Start = parseDateSafe(incident.startPause1);
    const pause1End = parseDateSafe(incident.endPause1);
    
    if (pause1Start && pause1End && pause1End > pause1Start) {
      const pause1Duration = (pause1End.getTime() - pause1Start.getTime()) / (1000 * 60);
      pauseDuration += pause1Duration;
      console.log(`⏸️ Pause 1: ${pause1Duration.toFixed(2)}min`);
    }
  }
  
  // Pause 2
  if (incident.startPause2 && incident.endPause2) {
    const pause2Start = parseDateSafe(incident.startPause2);
    const pause2End = parseDateSafe(incident.endPause2);
    
    if (pause2Start && pause2End && pause2End > pause2Start) {
      const pause2Duration = (pause2End.getTime() - pause2Start.getTime()) / (1000 * 60);
      pauseDuration += pause2Duration;
      console.log(`⏸️ Pause 2: ${pause2Duration.toFixed(2)}min`);
    }
  }
  
  console.log(`⏸️ Total pause duration: ${pauseDuration.toFixed(2)}min`);
  
  // 5. Hitung final duration
  let finalDuration = 0;
  
  if (vendorDuration > 0) {
    finalDuration = Math.max(0, vendorDuration - pauseDuration);
    console.log(`📊 Final duration (vendor - pause): ${finalDuration.toFixed(2)}min (${formatDurationHMS(finalDuration)})`);
  } else {
    finalDuration = Math.max(0, totalDuration - pauseDuration);
    console.log(`📊 Final duration (total - pause): ${finalDuration.toFixed(2)}min (${formatDurationHMS(finalDuration)})`);
  }
  
  return finalDuration;
};

// Fungsi utama untuk analisis
async function analyzeDurationIssues() {
  try {
    console.log('🔍 Starting duration analysis...');
    
    // Akses database dari halaman saat ini
    const db = window.db || window.InsightTicketDatabase;
    if (!db) {
      console.log('❌ Database not found. Make sure you are on the Incident Analytics page.');
      return;
    }
    
    const allIncidents = await db.incidents.toArray();
    console.log(`📊 Total incidents in database: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found in database');
      return;
    }
    
    // Analisis sample incidents
    console.log('\n🔍 Analyzing sample incidents...');
    const sampleIncidents = allIncidents.slice(0, 5);
    
    sampleIncidents.forEach((incident, index) => {
      console.log(`\n📋 Incident ${index + 1}: ${incident.noCase || incident.id}`);
      calculateCustomDuration(incident);
    });
    
    // Analisis statistik durasi
    console.log('\n📊 Duration Statistics:');
    
    const durations = allIncidents
      .map(inc => inc.durationMin || 0)
      .filter(d => d > 0);
    
    const vendorDurations = allIncidents
      .map(inc => inc.durationVendorMin || 0)
      .filter(d => d > 0);
    
    const pauseDurations = allIncidents
      .map(inc => inc.totalDurationPauseMin || 0)
      .filter(d => d > 0);
    
    console.log(`   - Incidents with duration: ${durations.length}/${allIncidents.length}`);
    console.log(`   - Incidents with vendor duration: ${vendorDurations.length}/${allIncidents.length}`);
    console.log(`   - Incidents with pause duration: ${pauseDurations.length}/${allIncidents.length}`);
    
    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`   - Average duration: ${avgDuration.toFixed(2)}min (${formatDurationHMS(avgDuration)})`);
    }
    
    if (vendorDurations.length > 0) {
      const avgVendorDuration = vendorDurations.reduce((a, b) => a + b, 0) / vendorDurations.length;
      console.log(`   - Average vendor duration: ${avgVendorDuration.toFixed(2)}min (${formatDurationHMS(avgVendorDuration)})`);
    }
    
    // Cek format data
    console.log('\n🔍 Data Format Analysis:');
    
    const sampleWithDuration = allIncidents.find(inc => inc.durationMin > 0);
    if (sampleWithDuration) {
      console.log('Sample incident with duration:', {
        noCase: sampleWithDuration.noCase,
        startTime: sampleWithDuration.startTime,
        endTime: sampleWithDuration.endTime,
        durationMin: sampleWithDuration.durationMin,
        durationVendorMin: sampleWithDuration.durationVendorMin,
        totalDurationPauseMin: sampleWithDuration.totalDurationPauseMin
      });
    }
    
    // Cek masalah parsing
    console.log('\n🔍 Parsing Issues:');
    
    const parsingIssues = allIncidents.filter(inc => {
      const hasStartTime = !!inc.startTime;
      const hasEndTime = !!inc.endTime;
      const hasDuration = !!inc.durationMin;
      const startParsed = parseDateSafe(inc.startTime);
      const endParsed = parseDateSafe(inc.endTime);
      
      return !hasStartTime || !hasEndTime || !hasDuration || !startParsed || !endParsed;
    });
    
    console.log(`   - Incidents with parsing issues: ${parsingIssues.length}/${allIncidents.length}`);
    
    if (parsingIssues.length > 0) {
      console.log('Sample parsing issues:');
      parsingIssues.slice(0, 3).forEach((inc, index) => {
        console.log(`   ${index + 1}. ${inc.noCase}:`, {
          startTime: inc.startTime,
          endTime: inc.endTime,
          startParsed: parseDateSafe(inc.startTime),
          endParsed: parseDateSafe(inc.endTime),
          durationMin: inc.durationMin
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

// Jalankan analisis
analyzeDurationIssues();
