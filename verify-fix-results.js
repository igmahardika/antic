// Script untuk memverifikasi hasil perbaikan dan membandingkan dengan Excel
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔍 VERIFYING FIX RESULTS...');

// Data Excel yang Anda berikan (dari gambar)
const EXCEL_DATA = {
  '2025-01': {
    'Blue': { duration: 315.33, count: 18 }, // 5:15:20
    'Yellow': { duration: 298.52, count: 140 }, // 4:58:31
    'Orange': { duration: 828.47, count: 13 }, // 13:48:28
    'Red': { duration: 403.5, count: 6 }, // 6:43:30
    'Black': { duration: 0, count: 0 }
  },
  '2025-02': {
    'Blue': { duration: 257.08, count: 23 }, // 4:17:05
    'Yellow': { duration: 379.0, count: 126 }, // 6:19:00
    'Orange': { duration: 345.23, count: 13 }, // 5:45:14
    'Red': { duration: 249, count: 2 }, // 4:09:00
    'Black': { duration: 0, count: 0 }
  },
  '2025-03': {
    'Blue': { duration: 340.05, count: 19 }, // 5:40:03
    'Yellow': { duration: 432.45, count: 122 }, // 7:12:06
    'Orange': { duration: 287.43, count: 40 }, // 4:47:26
    'Red': { duration: 178, count: 1 }, // 2:58:00
    'Black': { duration: 37, count: 2 } // 0:37:00
  },
  '2025-04': {
    'Blue': { duration: 369, count: 29 }, // 6:09:00
    'Yellow': { duration: 329.45, count: 86 }, // 5:29:27
    'Orange': { duration: 463.93, count: 15 }, // 7:43:56
    'Red': { duration: 152.33, count: 3 }, // 2:32:20
    'Black': { duration: 0, count: 0 }
  },
  '2025-05': {
    'Blue': { duration: 469.97, count: 29 }, // 7:49:58
    'Yellow': { duration: 413.17, count: 98 }, // 6:53:10
    'Orange': { duration: 314.48, count: 21 }, // 5:14:29
    'Red': { duration: 303.28, count: 7 }, // 5:03:17
    'Black': { duration: 0, count: 0 }
  },
  '2025-06': {
    'Blue': { duration: 461.38, count: 21 }, // 7:41:23
    'Yellow': { duration: 342.92, count: 97 }, // 5:42:55
    'Orange': { duration: 299.63, count: 21 }, // 4:59:38
    'Red': { duration: 296.5, count: 2 }, // 4:56:30
    'Black': { duration: 0, count: 0 }
  },
  '2025-07': {
    'Blue': { duration: 130.13, count: 22 }, // 2:10:08
    'Yellow': { duration: 397.2, count: 120 }, // 6:37:12
    'Orange': { duration: 293.82, count: 14 }, // 4:53:49
    'Red': { duration: 0, count: 0 }, // 0:00:00
    'Black': { duration: 46, count: 2 } // 0:46:00
  },
  '2025-08': {
    'Blue': { duration: 814.5, count: 14 }, // 13:34:30
    'Yellow': { duration: 434.33, count: 93 }, // 7:14:20
    'Orange': { duration: 395.77, count: 42 }, // 6:35:46
    'Red': { duration: 243.52, count: 2 }, // 4:03:31
    'Black': { duration: 0, count: 0 }
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

// Fungsi untuk memverifikasi hasil perbaikan
async function verifyFixResults() {
  try {
    console.log('🔍 Starting verification of fix results...');
    
    // Akses database langsung
    const request = window.indexedDB.open('InsightTicketDatabase');
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['incidents'], 'readonly');
      const store = transaction.objectStore('incidents');
      
      // Ambil semua data incidents
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const allIncidents = getAllRequest.result;
        console.log(`📊 Total incidents loaded: ${allIncidents.length}`);
        
        // Verify all incidents have endTime
        const missingEndTime = allIncidents.filter(inc => !inc.endTime);
        console.log(`📊 Incidents still missing endTime: ${missingEndTime.length}`);
        
        if (missingEndTime.length > 0) {
          console.log('❌ Some incidents still missing endTime!');
          return;
        }
        
        // Calculate project data after fix
        const projectData = {};
        
        allIncidents.forEach((inc) => {
          if (!inc.startTime) return;
          const date = new Date(inc.startTime);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const ncal = normalizeNCAL(inc.ncal);
          const dur = inc.durationMin || 0;
          
          if (!projectData[key]) projectData[key] = {};
          if (!projectData[key][ncal]) projectData[key][ncal] = { total: 0, count: 0, avg: 0 };
          
          if (dur > 0) {
            projectData[key][ncal].total += dur;
            projectData[key][ncal].count += 1;
          }
        });
        
        // Calculate averages
        Object.keys(projectData).forEach((month) => {
          Object.keys(projectData[month]).forEach((ncal) => {
            const obj = projectData[month][ncal];
            obj.avg = obj.count > 0 ? obj.total / obj.count : 0;
          });
        });
        
        // Compare data after fix
        console.log('\n📋 COMPARISON RESULTS AFTER FIX:\n');
        
        const months = Object.keys(EXCEL_DATA).sort();
        let totalImprovements = 0;
        let totalWarnings = 0;
        
        months.forEach((month) => {
          console.log(`\n📅 ${month}:`);
          
          Object.keys(EXCEL_DATA[month]).forEach((ncal) => {
            const excel = EXCEL_DATA[month][ncal];
            const project = projectData[month]?.[ncal];
            
            if (project) {
              const durationDiff = Math.abs(excel.duration - project.avg);
              const durationDiffPercent = (durationDiff / excel.duration) * 100;
              const countDiff = Math.abs(excel.count - project.count);
              
              console.log(`  ${ncal}:`);
              console.log(`    Excel:  ${excel.duration.toFixed(2)}min (${formatDurationHMS(excel.duration)}) - ${excel.count} incidents`);
              console.log(`    Project: ${project.avg.toFixed(2)}min (${formatDurationHMS(project.avg)}) - ${project.count} incidents`);
              console.log(`    Duration Diff: ${durationDiff.toFixed(2)}min (${durationDiffPercent.toFixed(1)}%)`);
              console.log(`    Count Diff: ${countDiff} incidents`);
              
              if (durationDiffPercent > 10) {
                console.log(`    ⚠️  WARNING: Still large duration difference!`);
                totalWarnings++;
              } else {
                console.log(`    ✅ GOOD: Duration difference within acceptable range`);
                totalImprovements++;
              }
            } else {
              console.log(`  ${ncal}: Excel data exists but no project data found`);
            }
          });
        });
        
        // Overall statistics
        console.log('\n📊 OVERALL STATISTICS AFTER FIX:\n');
        
        // Check average duration by NCAL
        const ncalStats = {};
        allIncidents.forEach(inc => {
          const ncal = normalizeNCAL(inc.ncal);
          if (!ncalStats[ncal]) ncalStats[ncal] = { count: 0, totalDuration: 0, avgDuration: 0 };
          ncalStats[ncal].count++;
          ncalStats[ncal].totalDuration += inc.durationMin || 0;
        });
        
        Object.keys(ncalStats).forEach(ncal => {
          const stats = ncalStats[ncal];
          stats.avgDuration = stats.count > 0 ? stats.totalDuration / stats.count : 0;
          console.log(`  ${ncal}: ${stats.count} incidents, avg: ${stats.avgDuration.toFixed(2)}min (${formatDurationHMS(stats.avgDuration)})`);
        });
        
        // Check for anomalies
        const anomalies = allIncidents.filter(inc => inc.durationMin > 1440);
        console.log(`\n📊 Incidents with duration > 24h: ${anomalies.length}`);
        
        if (anomalies.length > 0) {
          console.log('📋 Sample anomalies:');
          anomalies.slice(0, 3).forEach((inc, index) => {
            console.log(`  ${index + 1}. ${inc.noCase}: ${inc.durationMin}min (${formatDurationHMS(inc.durationMin)})`);
          });
        }
        
        // Summary
        console.log('\n📊 SUMMARY AFTER FIX:\n');
        console.log(`✅ All incidents now have endTime: ${missingEndTime.length === 0}`);
        console.log(`✅ Acceptable duration differences: ${totalImprovements}`);
        console.log(`⚠️  Still large differences: ${totalWarnings}`);
        console.log(`📊 Total incidents analyzed: ${allIncidents.length}`);
        
        if (totalWarnings === 0) {
          console.log('\n🎉 EXCELLENT! All duration differences are now within acceptable range!');
        } else {
          console.log(`\n⚠️  ${totalWarnings} categories still have large differences.`);
          console.log('💡 Consider adjusting duration calculation logic further.');
        }
        
        console.log('\n🔄 Please refresh the page to see updated analytics.');
        
      };
      
      getAllRequest.onerror = () => {
        console.error('❌ Error reading incidents:', getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Jalankan verifikasi
verifyFixResults();
