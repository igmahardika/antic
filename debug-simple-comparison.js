// Script sederhana untuk debug - copy paste ke browser console
// Jalankan di halaman Incident Analytics

console.log('🔍 SIMPLE DEBUG: Checking data discrepancies...');

// Data manual dari screenshot (Jan 2025)
const manualJan2025 = {
  Blue: { duration: 315.33, count: 18 }, // 5:15:20
  Yellow: { duration: 297.27, count: 141 }, // 4:57:16  
  Orange: { duration: 828.47, count: 13 }, // 13:48:28
  Red: { duration: 403.5, count: 6 }, // 6:43:30
  Black: { duration: 0, count: 0 }
};

async function quickDebug() {
  try {
    // 1. Check total incidents
    const allIncidents = await window.db.incidents.toArray();
    console.log('📊 Total incidents:', allIncidents.length);
    
    // 2. Check incidents in Jan 2025
    const jan2025Incidents = allIncidents.filter(inc => {
      if (!inc.startTime) return false;
      const date = new Date(inc.startTime);
      return date.getFullYear() === 2025 && date.getMonth() === 0; // January = 0
    });
    
    console.log('📊 Jan 2025 incidents:', jan2025Incidents.length);
    
    // 3. Check NCAL distribution
    const ncalCount = {};
    const ncalDuration = {};
    
    jan2025Incidents.forEach(inc => {
      const ncal = (inc.ncal || '').toString().trim().toLowerCase();
      ncalCount[ncal] = (ncalCount[ncal] || 0) + 1;
      
      if (inc.durationMin && inc.durationMin > 0) {
        if (!ncalDuration[ncal]) ncalDuration[ncal] = { total: 0, count: 0 };
        ncalDuration[ncal].total += inc.durationMin;
        ncalDuration[ncal].count += 1;
      }
    });
    
    console.log('📊 NCAL Count (raw):', ncalCount);
    console.log('📊 NCAL Duration (raw):', ncalDuration);
    
    // 4. Normalize and compare
    const normalizeNCAL = (ncal) => {
      if (!ncal) return 'Unknown';
      const value = ncal.toString().trim().toLowerCase();
      switch (value) {
        case 'blue':
        case 'biru':
          return 'Blue';
        case 'yellow':
        case 'kuning':
          return 'Yellow';
        case 'orange':
        case 'jingga':
          return 'Orange';
        case 'red':
        case 'merah':
          return 'Red';
        case 'black':
        case 'hitam':
          return 'Black';
        default:
          return ncal.trim();
      }
    };
    
    const normalizedCount = {};
    const normalizedDuration = {};
    
    jan2025Incidents.forEach(inc => {
      const ncal = normalizeNCAL(inc.ncal);
      normalizedCount[ncal] = (normalizedCount[ncal] || 0) + 1;
      
      if (inc.durationMin && inc.durationMin > 0) {
        if (!normalizedDuration[ncal]) normalizedDuration[ncal] = { total: 0, count: 0 };
        normalizedDuration[ncal].total += inc.durationMin;
        normalizedDuration[ncal].count += 1;
      }
    });
    
    // Calculate averages
    Object.keys(normalizedDuration).forEach(ncal => {
      if (normalizedDuration[ncal].count > 0) {
        normalizedDuration[ncal].avg = normalizedDuration[ncal].total / normalizedDuration[ncal].count;
      }
    });
    
    console.log('📊 Normalized Count:', normalizedCount);
    console.log('📊 Normalized Duration:', normalizedDuration);
    
    // 5. Compare with manual data
    console.log('\n🔍 COMPARISON:');
    console.log('='.repeat(60));
    
    ['Blue', 'Yellow', 'Orange', 'Red', 'Black'].forEach(ncal => {
      const manual = manualJan2025[ncal];
      const system = {
        count: normalizedCount[ncal] || 0,
        duration: normalizedDuration[ncal]?.avg || 0
      };
      
      const countDiff = Math.abs(manual.count - system.count);
      const durationDiff = Math.abs(manual.duration - system.duration);
      
      console.log(`${ncal}:`);
      console.log(`  Count: Manual=${manual.count} | System=${system.count} | Diff=${countDiff}`);
      console.log(`  Duration: Manual=${manual.duration.toFixed(2)}min | System=${system.duration.toFixed(2)}min | Diff=${durationDiff.toFixed(2)}min`);
      
      if (countDiff > 0 || durationDiff > 1) {
        console.log(`  ⚠️  DISCREPANCY!`);
      }
    });
    
    // 6. Show sample incidents for debugging
    console.log('\n🔍 SAMPLE INCIDENTS (Jan 2025):');
    console.log('='.repeat(60));
    
    const samples = jan2025Incidents.slice(0, 5);
    samples.forEach((inc, index) => {
      console.log(`\nSample ${index + 1}:`);
      console.log(`  ID: ${inc.id}`);
      console.log(`  Start Time: ${inc.startTime}`);
      console.log(`  NCAL (raw): "${inc.ncal}"`);
      console.log(`  NCAL (normalized): "${normalizeNCAL(inc.ncal)}"`);
      console.log(`  Duration: ${inc.durationMin} minutes`);
      console.log(`  Status: ${inc.status}`);
      
      // Check all fields
      const allFields = Object.keys(inc);
      console.log(`  All fields: ${allFields.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run debug
quickDebug();
