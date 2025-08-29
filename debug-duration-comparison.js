// Script untuk browser console - bandingkan data duration manual vs sistem
// Jalankan di browser console pada halaman Incident Analytics

console.log('🔍 DEBUG: Starting comprehensive data comparison...');

// Data manual dari spreadsheet (sesuai screenshot)
const manualData = {
  // Durasi Rata Rata Penanganan Gangguan 2025 (On Net)
  duration: {
    '2025-01': { Blue: 315.33, Yellow: 297.27, Orange: 828.47, Red: 403.5, Black: 0 }, // 5:15:20, 4:57:16, 13:48:28, 6:43:30, 0:00:00
    '2025-02': { Blue: 257.08, Yellow: 381.05, Orange: 345.23, Red: 249, Black: 0 }, // 4:17:05, 6:21:03, 5:45:14, 4:09:00, 0:00:00
    '2025-03': { Blue: 340.05, Yellow: 399.45, Orange: 287.43, Red: 178, Black: 37 }, // 5:40:03, 6:39:27, 4:47:26, 2:58:00, 0:37:00
    '2025-04': { Blue: 369, Yellow: 376.07, Orange: 463.93, Red: 152.33, Black: 0 }, // 6:09:00, 6:16:03, 7:43:56, 2:32:20, 0:00:00
    '2025-05': { Blue: 469.97, Yellow: 413.15, Orange: 314.48, Red: 303.28, Black: 0 }, // 7:49:58, 6:53:10, 5:14:29, 5:03:17, 0:00:00
    '2025-06': { Blue: 468.25, Yellow: 342.92, Orange: 299.63, Red: 296.5, Black: 0 }, // 7:48:15, 5:42:55, 4:59:38, 4:56:30, 0:00:00
    '2025-07': { Blue: 130.13, Yellow: 397.2, Orange: 293.82, Red: 0, Black: 46 }, // 2:10:08, 6:37:12, 4:53:49, 0:00:00, 0:46:00
  },
  // Jumlah Gangguan 2025 (On Net)
  count: {
    '2025-01': { Blue: 18, Yellow: 141, Orange: 13, Red: 6, Black: 0 },
    '2025-02': { Blue: 23, Yellow: 125, Orange: 13, Red: 2, Black: 0 },
    '2025-03': { Blue: 19, Yellow: 121, Orange: 40, Red: 1, Black: 2 },
    '2025-04': { Blue: 29, Yellow: 87, Orange: 15, Red: 3, Black: 0 },
    '2025-05': { Blue: 29, Yellow: 98, Orange: 21, Red: 7, Black: 0 },
    '2025-06': { Blue: 20, Yellow: 97, Orange: 21, Red: 2, Black: 0 },
    '2025-07': { Blue: 22, Yellow: 120, Orange: 14, Red: 0, Black: 2 },
  }
};

// Fungsi untuk mengakses data sistem
async function getSystemData() {
  try {
    // Akses database
    const allIncidents = await window.db.incidents.toArray();
    console.log('📊 Total incidents in database:', allIncidents.length);
    
    // Filter untuk tahun 2025
    const incidents2025 = allIncidents.filter(inc => {
      if (!inc.startTime) return false;
      const date = new Date(inc.startTime);
      return date.getFullYear() === 2025;
    });
    
    console.log('📊 Incidents in 2025:', incidents2025.length);
    
    // Normalize NCAL function
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
    
    // Group by month and NCAL
    const systemData = {
      duration: {},
      count: {}
    };
    
    incidents2025.forEach(inc => {
      if (!inc.startTime) return;
      
      const date = new Date(inc.startTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const ncal = normalizeNCAL(inc.ncal);
      const duration = inc.durationMin || 0;
      
      // Initialize if not exists
      if (!systemData.duration[monthKey]) systemData.duration[monthKey] = {};
      if (!systemData.count[monthKey]) systemData.count[monthKey] = {};
      if (!systemData.duration[monthKey][ncal]) {
        systemData.duration[monthKey][ncal] = { total: 0, count: 0, avg: 0 };
      }
      if (!systemData.count[monthKey][ncal]) {
        systemData.count[monthKey][ncal] = 0;
      }
      
      // Count incidents
      systemData.count[monthKey][ncal]++;
      
      // Sum durations
      if (duration > 0) {
        systemData.duration[monthKey][ncal].total += duration;
        systemData.duration[monthKey][ncal].count++;
      }
    });
    
    // Calculate averages
    Object.keys(systemData.duration).forEach(month => {
      Object.keys(systemData.duration[month]).forEach(ncal => {
        const obj = systemData.duration[month][ncal];
        if (obj.count > 0) {
          obj.avg = obj.total / obj.count;
        }
      });
    });
    
    return systemData;
    
  } catch (error) {
    console.error('❌ Error accessing database:', error);
    return null;
  }
}

// Fungsi untuk membandingkan data
function compareData(manual, system) {
  console.log('\n🔍 COMPARISON RESULTS:');
  console.log('='.repeat(80));
  
  const months = Object.keys(manual.duration).sort();
  
  months.forEach(month => {
    console.log(`\n📅 MONTH: ${month}`);
    console.log('-'.repeat(50));
    
    ['Blue', 'Yellow', 'Orange', 'Red', 'Black'].forEach(ncal => {
      const manualDuration = manual.duration[month]?.[ncal] || 0;
      const manualCount = manual.count[month]?.[ncal] || 0;
      const systemDuration = system.duration[month]?.[ncal]?.avg || 0;
      const systemCount = system.count[month]?.[ncal] || 0;
      
      const durationDiff = Math.abs(manualDuration - systemDuration);
      const countDiff = Math.abs(manualCount - systemCount);
      
      console.log(`${ncal}:`);
      console.log(`  Duration: Manual=${manualDuration.toFixed(2)}min (${formatTime(manualDuration)}) | System=${systemDuration.toFixed(2)}min (${formatTime(systemDuration)}) | Diff=${durationDiff.toFixed(2)}min`);
      console.log(`  Count: Manual=${manualCount} | System=${systemCount} | Diff=${countDiff}`);
      
      if (durationDiff > 1 || countDiff > 0) {
        console.log(`  ⚠️  DISCREPANCY DETECTED!`);
      }
    });
  });
}

// Helper function untuk format waktu
function formatTime(minutes) {
  if (!minutes || minutes <= 0) return '0:00:00';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Fungsi untuk menganalisis data mentah
function analyzeRawData(incidents) {
  console.log('\n🔍 RAW DATA ANALYSIS:');
  console.log('='.repeat(80));
  
  // Sample incidents untuk analisis
  const sampleIncidents = incidents.slice(0, 10);
  
  sampleIncidents.forEach((inc, index) => {
    console.log(`\nIncident ${index + 1}:`);
    console.log(`  ID: ${inc.id}`);
    console.log(`  Start Time: ${inc.startTime}`);
    console.log(`  NCAL: "${inc.ncal}" (normalized: "${normalizeNCAL(inc.ncal)}")`);
    console.log(`  Duration: ${inc.durationMin} minutes`);
    console.log(`  Status: ${inc.status}`);
    
    // Check for duration-related fields
    const durationFields = Object.keys(inc).filter(key => 
      key.toLowerCase().includes('duration') || 
      key.toLowerCase().includes('time') ||
      key.toLowerCase().includes('min')
    );
    
    if (durationFields.length > 0) {
      console.log(`  Duration-related fields:`, durationFields.map(field => `${field}=${inc[field]}`));
    }
  });
  
  // Check NCAL distribution
  const ncalDistribution = {};
  incidents.forEach(inc => {
    const ncal = normalizeNCAL(inc.ncal);
    ncalDistribution[ncal] = (ncalDistribution[ncal] || 0) + 1;
  });
  
  console.log('\nNCAL Distribution:', ncalDistribution);
  
  // Check duration statistics
  const durations = incidents.map(inc => inc.durationMin).filter(d => d && d > 0);
  console.log('\nDuration Statistics:');
  console.log(`  Total incidents with duration: ${durations.length}`);
  console.log(`  Average duration: ${durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) : 0} minutes`);
  console.log(`  Min duration: ${durations.length > 0 ? Math.min(...durations) : 0} minutes`);
  console.log(`  Max duration: ${durations.length > 0 ? Math.max(...durations) : 0} minutes`);
}

// Main execution
async function main() {
  console.log('🚀 Starting comprehensive data analysis...');
  
  const systemData = await getSystemData();
  if (!systemData) {
    console.error('❌ Failed to get system data');
    return;
  }
  
  console.log('📊 System data structure:', systemData);
  
  // Get raw incidents for analysis
  const allIncidents = await window.db.incidents.toArray();
  analyzeRawData(allIncidents);
  
  // Compare data
  compareData(manualData, systemData);
  
  console.log('\n✅ Analysis complete!');
}

// Jalankan analisis
main().catch(console.error);
