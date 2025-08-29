// Test script untuk verifikasi perhitungan durasi
// Jalankan di browser console

console.log('🧪 Testing Duration Calculation...');

// Sample data dengan format yang benar
const testIncident = {
  id: 'TEST-001',
  noCase: 'CASE-001',
  start: '15/01/25 10:00:00',
  end: '15/01/25 12:30:00',
  startEscalationVendor: '15/01/25 10:30:00',
  startPause: '15/01/25 11:00:00',
  endPause: '15/01/25 11:15:00',
  startPause2: '15/01/25 11:45:00',
  endPause2: '15/01/25 12:00:00'
};

console.log('📋 Test Incident Data:', testIncident);

// Parse date function (copy from the component)
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

// Test duration calculation
const calculateCustomDuration = (incident) => {
  let totalDuration = 0;
  
  console.log(`🔧 Calculating duration for incident ${incident.id || incident.noCase || 'unknown'}`);
  console.log(`🔍 Incident data:`, {
    start: incident.start,
    end: incident.end,
    startEscalationVendor: incident.startEscalationVendor,
    startPause: incident.startPause,
    endPause: incident.endPause,
    startPause2: incident.startPause2,
    endPause2: incident.endPause2,
    startTime: incident.startTime,
    endTime: incident.endTime,
    startPause1: incident.startPause1,
    endPause1: incident.endPause1
  });
  
  // Calculate total duration from Start to End
  const startField = incident.start || incident.startTime;
  const endField = incident.end || incident.endTime;
  
  if (startField && endField) {
    const startTime = parseDateSafe(startField);
    const endTime = parseDateSafe(endField);
    
    console.log(`🔍 Parsed times:`, {
      startField,
      endField,
      startTime: startTime?.toISOString(),
      endTime: endTime?.toISOString(),
      startTimeValid: !!startTime,
      endTimeValid: !!endTime
    });
    
    if (startTime && endTime && endTime > startTime) {
      totalDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      console.log(`📅 Total Duration (Start to End): ${totalDuration.toFixed(2)}min`);
    } else {
      console.log(`⚠️ Invalid Start/End times: Start=${startField}, End=${endField}`);
    }
  }
  
  // Calculate vendor duration
  let vendorDuration = 0;
  if (incident.startEscalationVendor && endField) {
    const vendorStartTime = parseDateSafe(incident.startEscalationVendor);
    const endTime = parseDateSafe(endField);
    
    if (vendorStartTime && endTime && endTime > vendorStartTime) {
      vendorDuration = (endTime.getTime() - vendorStartTime.getTime()) / (1000 * 60);
      console.log(`👨‍💼 Vendor Duration (Escalation to End): ${vendorDuration.toFixed(2)}min`);
    }
  }
  
  // Calculate pause durations
  let totalPauseDuration = 0;
  
  // Pause 1
  const pause1StartField = incident.startPause || incident.startPause1;
  const pause1EndField = incident.endPause || incident.endPause1;
  
  if (pause1StartField && pause1EndField) {
    const pause1Start = parseDateSafe(pause1StartField);
    const pause1End = parseDateSafe(pause1EndField);
    
    if (pause1Start && pause1End && pause1End > pause1Start) {
      const pause1Duration = (pause1End.getTime() - pause1Start.getTime()) / (1000 * 60);
      totalPauseDuration += pause1Duration;
      console.log(`⏸️ Pause 1 Duration: ${pause1Duration.toFixed(2)}min`);
    }
  }
  
  // Pause 2
  const pause2StartField = incident.startPause2;
  const pause2EndField = incident.endPause2;
  
  if (pause2StartField && pause2EndField) {
    const pause2Start = parseDateSafe(pause2StartField);
    const pause2End = parseDateSafe(pause2EndField);
    
    if (pause2Start && pause2End && pause2End > pause2Start) {
      const pause2Duration = (pause2End.getTime() - pause2Start.getTime()) / (1000 * 60);
      totalPauseDuration += pause2Duration;
      console.log(`⏸️ Pause 2 Duration: ${pause2Duration.toFixed(2)}min`);
    }
  }
  
  // Calculate final duration
  let finalDuration = 0;
  
  if (vendorDuration > 0) {
    finalDuration = Math.max(0, vendorDuration - totalPauseDuration);
    console.log(`📊 Final Duration (Vendor - Pause): ${vendorDuration} - ${totalPauseDuration} = ${finalDuration.toFixed(2)}min`);
  } else {
    finalDuration = Math.max(0, totalDuration - totalPauseDuration);
    console.log(`📊 Final Duration (Total - Pause): ${totalDuration} - ${totalPauseDuration} = ${finalDuration.toFixed(2)}min`);
  }
  
  console.log(`✅ Final calculated duration: ${finalDuration.toFixed(2)}min`);
  return finalDuration;
};

// Run test
console.log('\n🧪 Running test calculation...');
const result = calculateCustomDuration(testIncident);
console.log('\n📊 Test Result:', result, 'minutes');

// Expected calculation:
// Total Duration: 12:30:00 - 10:00:00 = 2.5 hours = 150 minutes
// Vendor Duration: 12:30:00 - 10:30:00 = 2 hours = 120 minutes
// Pause 1: 11:15:00 - 11:00:00 = 15 minutes
// Pause 2: 12:00:00 - 11:45:00 = 15 minutes
// Total Pause: 30 minutes
// Final Duration (Vendor - Pause): 120 - 30 = 90 minutes

console.log('\n📋 Expected Result: 90 minutes');
console.log('✅ Test passed:', Math.abs(result - 90) < 0.1);
