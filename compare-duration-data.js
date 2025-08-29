// Script untuk membandingkan data duration manual dengan data sistem
// Jalankan: node compare-duration-data.js

import Dexie from 'dexie';

class TestDB extends Dexie {
  incidents;
  
  constructor() {
    super('InsightTicketDatabase');
    this.version(5).stores({
      incidents: 'id, startTime, status, priority, site, klasifikasiGangguan, level, ncal, noCase'
    });
  }
}

// Data manual dari tabel yang Anda berikan
const MANUAL_DATA = {
  '2025-01': {
    'Blue': { avg: 315.33, count: 18 }, // 5:15:20 = 315.33 minutes
    'Yellow': { avg: 297.27, count: 141 }, // 4:57:16 = 297.27 minutes
    'Orange': { avg: 828.47, count: 13 }, // 13:48:28 = 828.47 minutes
    'Red': { avg: 403.5, count: 6 }, // 6:43:30 = 403.5 minutes
    'Black': { avg: 0, count: 0 } // 0:00:00
  },
  '2025-02': {
    'Blue': { avg: 257.08, count: 23 }, // 4:17:05 = 257.08 minutes
    'Yellow': { avg: 381.05, count: 125 }, // 6:21:03 = 381.05 minutes
    'Orange': { avg: 345.23, count: 13 }, // 5:45:14 = 345.23 minutes
    'Red': { avg: 249, count: 2 }, // 4:09:00 = 249 minutes
    'Black': { avg: 0, count: 0 } // 0:00:00
  },
  '2025-03': {
    'Blue': { avg: 340.05, count: 19 }, // 5:40:03 = 340.05 minutes
    'Yellow': { avg: 399.45, count: 121 }, // 6:39:27 = 399.45 minutes
    'Orange': { avg: 287.43, count: 40 }, // 4:47:26 = 287.43 minutes
    'Red': { avg: 178, count: 1 }, // 2:58:00 = 178 minutes
    'Black': { avg: 37, count: 2 } // 0:37:00 = 37 minutes
  },
  '2025-04': {
    'Blue': { avg: 369, count: 29 }, // 6:09:00 = 369 minutes
    'Yellow': { avg: 376.05, count: 87 }, // 6:16:03 = 376.05 minutes
    'Orange': { avg: 463.93, count: 15 }, // 7:43:56 = 463.93 minutes
    'Red': { avg: 152.33, count: 3 }, // 2:32:20 = 152.33 minutes
    'Black': { avg: 0, count: 0 } // 0:00:00
  },
  '2025-05': {
    'Blue': { avg: 469.97, count: 29 }, // 7:49:58 = 469.97 minutes
    'Yellow': { avg: 413.17, count: 98 }, // 6:53:10 = 413.17 minutes
    'Orange': { avg: 314.48, count: 21 }, // 5:14:29 = 314.48 minutes
    'Red': { avg: 303.28, count: 7 }, // 5:03:17 = 303.28 minutes
    'Black': { avg: 0, count: 0 } // 0:00:00
  },
  '2025-06': {
    'Blue': { avg: 468.25, count: 20 }, // 7:48:15 = 468.25 minutes
    'Yellow': { avg: 342.92, count: 97 }, // 5:42:55 = 342.92 minutes
    'Orange': { avg: 299.63, count: 21 }, // 4:59:38 = 299.63 minutes
    'Red': { avg: 296.5, count: 2 }, // 4:56:30 = 296.5 minutes
    'Black': { avg: 0, count: 0 } // 0:00:00
  },
  '2025-07': {
    'Blue': { avg: 130.13, count: 22 }, // 2:10:08 = 130.13 minutes
    'Yellow': { avg: 397.2, count: 120 }, // 6:37:12 = 397.2 minutes
    'Orange': { avg: 293.82, count: 14 }, // 4:53:49 = 293.82 minutes
    'Red': { avg: 0, count: 0 }, // 0:00:00
    'Black': { avg: 46, count: 2 } // 0:46:00 = 46 minutes
  }
};

// Helper function to normalize NCAL
const normalizeNCAL = (ncal) => {
  if (!ncal) return 'Unknown';
  const normalized = ncal.trim().toLowerCase();
  switch (normalized) {
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

// Helper function to format duration
const formatDurationHMS = (minutes) => {
  if (!minutes || minutes <= 0) return '0:00:00';
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

async function compareDurationData() {
  const db = new TestDB();
  
  try {
    console.log('🔍 Comparing Manual vs System Duration Data...\n');
    
    const allIncidents = await db.incidents.toArray();
    console.log(`📊 Total incidents in database: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found in database');
      return;
    }
    
    // Calculate system data
    const systemData = {};
    
    allIncidents.forEach((inc) => {
      if (!inc.startTime) return;
      const date = new Date(inc.startTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const ncal = normalizeNCAL(inc.ncal);
      const dur = inc.durationMin || 0;
      
      if (!systemData[key]) systemData[key] = {};
      if (!systemData[key][ncal]) systemData[key][ncal] = { total: 0, count: 0, avg: 0 };
      
      if (dur > 0) {
        systemData[key][ncal].total += dur;
        systemData[key][ncal].count += 1;
      }
    });
    
    // Calculate averages
    Object.keys(systemData).forEach((month) => {
      Object.keys(systemData[month]).forEach((ncal) => {
        const obj = systemData[month][ncal];
        obj.avg = obj.count > 0 ? obj.total / obj.count : 0;
      });
    });
    
    // Compare data
    console.log('📋 COMPARISON RESULTS:\n');
    
    const months = Object.keys(MANUAL_DATA).sort();
    months.forEach((month) => {
      console.log(`\n📅 ${month}:`);
      console.log('─'.repeat(80));
      
      const manualMonth = MANUAL_DATA[month];
      const systemMonth = systemData[month] || {};
      
      ['Blue', 'Yellow', 'Orange', 'Red', 'Black'].forEach((ncal) => {
        const manual = manualMonth[ncal] || { avg: 0, count: 0 };
        const system = systemMonth[ncal] || { avg: 0, count: 0 };
        
        const avgDiff = Math.abs(manual.avg - system.avg);
        const countDiff = Math.abs(manual.count - system.count);
        const avgDiffPercent = manual.avg > 0 ? (avgDiff / manual.avg) * 100 : 0;
        
        console.log(`${ncal.padEnd(8)} | Manual: ${formatDurationHMS(manual.avg).padEnd(10)} (${manual.count.toString().padStart(3)} items) | System: ${formatDurationHMS(system.avg).padEnd(10)} (${system.count.toString().padStart(3)} items) | Diff: ${formatDurationHMS(avgDiff).padEnd(10)} (${avgDiffPercent.toFixed(1)}%)`);
        
        if (avgDiff > 1 || countDiff > 0) {
          console.log(`  ⚠️  DISCREPANCY DETECTED!`);
        }
      });
    });
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('─'.repeat(80));
    
    let totalDiscrepancies = 0;
    let totalComparisons = 0;
    
    months.forEach((month) => {
      const manualMonth = MANUAL_DATA[month];
      const systemMonth = systemData[month] || {};
      
      ['Blue', 'Yellow', 'Orange', 'Red', 'Black'].forEach((ncal) => {
        const manual = manualMonth[ncal] || { avg: 0, count: 0 };
        const system = systemMonth[ncal] || { avg: 0, count: 0 };
        
        totalComparisons++;
        const avgDiff = Math.abs(manual.avg - system.avg);
        const countDiff = Math.abs(manual.count - system.count);
        
        if (avgDiff > 1 || countDiff > 0) {
          totalDiscrepancies++;
        }
      });
    });
    
    console.log(`Total comparisons: ${totalComparisons}`);
    console.log(`Discrepancies found: ${totalDiscrepancies}`);
    console.log(`Accuracy: ${((totalComparisons - totalDiscrepancies) / totalComparisons * 100).toFixed(1)}%`);
    
    if (totalDiscrepancies > 0) {
      console.log('\n🔍 POSSIBLE ISSUES:');
      console.log('1. Data filtering: System might be filtering out some incidents');
      console.log('2. Date parsing: Start time might not be parsed correctly');
      console.log('3. NCAL normalization: NCAL values might not match');
      console.log('4. Duration parsing: Duration values might not be parsed correctly');
      console.log('5. Data completeness: Some incidents might be missing required fields');
    }
    
  } catch (error) {
    console.error('❌ Error comparing duration data:', error);
  } finally {
    await db.close();
  }
}

compareDurationData();
