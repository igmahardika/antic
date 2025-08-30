// Script untuk test dan debug masalah durasi
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔍 TESTING DURATION CALCULATION...');

// Test data manual untuk membandingkan
const TEST_DATA = {
  '2025-01': {
    'Blue': { expected: 315.33, count: 18 },
    'Yellow': { expected: 297.27, count: 141 },
    'Orange': { expected: 828.47, count: 13 },
    'Red': { expected: 403.5, count: 6 }
  }
};

// Fungsi untuk format durasi
const formatDurationHMS = (minutes) => {
  if (!minutes || minutes <= 0) return '0:00:00';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Fungsi untuk normalize NCAL
const normalizeNCAL = (ncal) => {
  if (!ncal) return 'Unknown';
  const value = ncal.toString().trim().toLowerCase();
  switch (value) {
    case 'blue': return 'Blue';
    case 'yellow': return 'Yellow';
    case 'orange': return 'Orange';
    case 'red': return 'Red';
    case 'black': return 'Black';
    default: return ncal.trim();
  }
};

// Test fungsi calculateCustomDuration dari halaman
async function testDurationCalculation() {
  try {
    console.log('🔍 Testing duration calculation...');
    
    // Akses database
    const db = window.db || window.InsightTicketDatabase;
    if (!db) {
      console.log('❌ Database not found');
      return;
    }
    
    const allIncidents = await db.incidents.toArray();
    console.log(`📊 Total incidents: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found');
      return;
    }
    
    // Test sample incidents
    console.log('\n🔍 Testing sample incidents:');
    const samples = allIncidents.slice(0, 3);
    
    samples.forEach((incident, index) => {
      console.log(`\n📋 Sample ${index + 1}: ${incident.noCase || incident.id}`);
      console.log('Data fields:', {
        startTime: incident.startTime,
        endTime: incident.endTime,
        durationMin: incident.durationMin,
        durationVendorMin: incident.durationVendorMin,
        totalDurationPauseMin: incident.totalDurationPauseMin,
        totalDurationVendorMin: incident.totalDurationVendorMin,
        startPause1: incident.startPause1,
        endPause1: incident.endPause1,
        startPause2: incident.startPause2,
        endPause2: incident.endPause2
      });
      
      // Test calculation
      const calculated = calculateCustomDuration(incident);
      console.log(`✅ Calculated duration: ${calculated}min (${formatDurationHMS(calculated)})`);
    });
    
    // Test monthly aggregation
    console.log('\n📊 Testing monthly aggregation:');
    
    const monthlyData = {};
    
    allIncidents.forEach((inc) => {
      if (!inc.startTime) return;
      const date = new Date(inc.startTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const ncal = normalizeNCAL(inc.ncal);
      const dur = calculateCustomDuration(inc);
      
      if (!monthlyData[key]) monthlyData[key] = {};
      if (!monthlyData[key][ncal]) monthlyData[key][ncal] = { total: 0, count: 0, avg: 0 };
      
      if (dur > 0) {
        monthlyData[key][ncal].total += dur;
        monthlyData[key][ncal].count += 1;
      }
    });
    
    // Calculate averages
    Object.keys(monthlyData).forEach((month) => {
      Object.keys(monthlyData[month]).forEach((ncal) => {
        const obj = monthlyData[month][ncal];
        obj.avg = obj.count > 0 ? obj.total / obj.count : 0;
      });
    });
    
    // Compare with expected data
    console.log('\n📋 COMPARISON RESULTS:');
    
    Object.keys(monthlyData).sort().forEach((month) => {
      console.log(`\n📅 ${month}:`);
      
      Object.keys(monthlyData[month]).forEach((ncal) => {
        const actual = monthlyData[month][ncal];
        const expected = TEST_DATA[month]?.[ncal];
        
        console.log(`  ${ncal}:`);
        console.log(`    Actual: ${actual.avg.toFixed(2)}min (${formatDurationHMS(actual.avg)}) - ${actual.count} incidents`);
        
        if (expected) {
          const diff = Math.abs(actual.avg - expected.expected);
          const diffPercent = (diff / expected.expected) * 100;
          console.log(`    Expected: ${expected.expected}min (${formatDurationHMS(expected.expected)}) - ${expected.count} incidents`);
          console.log(`    Difference: ${diff.toFixed(2)}min (${diffPercent.toFixed(1)}%)`);
          
          if (diffPercent > 10) {
            console.log(`    ⚠️  WARNING: Large difference detected!`);
          }
        }
      });
    });
    
    // Analyze data quality
    console.log('\n🔍 DATA QUALITY ANALYSIS:');
    
    const withDuration = allIncidents.filter(inc => inc.durationMin > 0);
    const withVendorDuration = allIncidents.filter(inc => inc.durationVendorMin > 0);
    const withPauseDuration = allIncidents.filter(inc => inc.totalDurationPauseMin > 0);
    const withStartEnd = allIncidents.filter(inc => inc.startTime && inc.endTime);
    
    console.log(`   - Incidents with durationMin: ${withDuration.length}/${allIncidents.length} (${((withDuration.length/allIncidents.length)*100).toFixed(1)}%)`);
    console.log(`   - Incidents with durationVendorMin: ${withVendorDuration.length}/${allIncidents.length} (${((withVendorDuration.length/allIncidents.length)*100).toFixed(1)}%)`);
    console.log(`   - Incidents with totalDurationPauseMin: ${withPauseDuration.length}/${allIncidents.length} (${((withPauseDuration.length/allIncidents.length)*100).toFixed(1)}%)`);
    console.log(`   - Incidents with startTime & endTime: ${withStartEnd.length}/${allIncidents.length} (${((withStartEnd.length/allIncidents.length)*100).toFixed(1)}%)`);
    
    // Check for anomalies
    console.log('\n🔍 ANOMALY DETECTION:');
    
    const anomalies = allIncidents.filter(inc => {
      const dur = calculateCustomDuration(inc);
      return dur > 1440; // More than 24 hours
    });
    
    console.log(`   - Incidents with duration > 24h: ${anomalies.length}`);
    
    if (anomalies.length > 0) {
      console.log('   Sample anomalies:');
      anomalies.slice(0, 3).forEach((inc, index) => {
        const dur = calculateCustomDuration(inc);
        console.log(`     ${index + 1}. ${inc.noCase}: ${dur.toFixed(2)}min (${formatDurationHMS(dur)})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Jalankan test
testDurationCalculation();
