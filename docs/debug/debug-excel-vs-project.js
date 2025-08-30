// Script untuk membandingkan data Excel vs Project
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔍 COMPARING EXCEL vs PROJECT DATA...');

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

// Fungsi untuk menganalisis perbedaan
async function analyzeExcelVsProject() {
  try {
    console.log('🔍 Analyzing Excel vs Project data...');
    
    // Akses database
    const db = window.db || window.InsightTicketDatabase;
    if (!db) {
      console.log('❌ Database not found');
      return;
    }
    
    const allIncidents = await db.incidents.toArray();
    console.log(`📊 Total incidents in database: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found');
      return;
    }
    
    // Calculate project data
    const projectData = {};
    
    allIncidents.forEach((inc) => {
      if (!inc.startTime) return;
      const date = new Date(inc.startTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const ncal = normalizeNCAL(inc.ncal);
      const dur = calculateCustomDuration(inc);
      
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
    
    // Compare data
    console.log('\n📋 DETAILED COMPARISON RESULTS:\n');
    
    const months = Object.keys(EXCEL_DATA).sort();
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
            console.log(`    ⚠️  WARNING: Large duration difference!`);
          }
          if (countDiff > 5) {
            console.log(`    ⚠️  WARNING: Large count difference!`);
          }
        } else {
          console.log(`  ${ncal}: Excel data exists but no project data found`);
        }
      });
    });
    
    // Analyze data quality issues
    console.log('\n🔍 DATA QUALITY ANALYSIS:\n');
    
    // Check for missing data
    const missingData = [];
    months.forEach((month) => {
      Object.keys(EXCEL_DATA[month]).forEach((ncal) => {
        const excel = EXCEL_DATA[month][ncal];
        const project = projectData[month]?.[ncal];
        
        if (!project || project.count === 0) {
          missingData.push({ month, ncal, excelCount: excel.count });
        }
      });
    });
    
    if (missingData.length > 0) {
      console.log('❌ Missing data in project:');
      missingData.forEach(item => {
        console.log(`   - ${item.month} ${item.ncal}: Excel has ${item.excelCount} incidents, Project has 0`);
      });
    }
    
    // Check for data parsing issues
    console.log('\n🔍 PARSING ISSUES ANALYSIS:\n');
    
    const parsingIssues = allIncidents.filter(inc => {
      const dur = calculateCustomDuration(inc);
      return dur === 0 && (inc.startTime || inc.endTime);
    });
    
    console.log(`   - Incidents with parsing issues: ${parsingIssues.length}/${allIncidents.length}`);
    
    if (parsingIssues.length > 0) {
      console.log('   Sample parsing issues:');
      parsingIssues.slice(0, 3).forEach((inc, index) => {
        console.log(`     ${index + 1}. ${inc.noCase}:`, {
          startTime: inc.startTime,
          endTime: inc.endTime,
          durationMin: inc.durationMin,
          durationVendorMin: inc.durationVendorMin,
          totalDurationPauseMin: inc.totalDurationPauseMin
        });
      });
    }
    
    // Check for anomalies
    console.log('\n🔍 ANOMALY DETECTION:\n');
    
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
    console.error('❌ Error during analysis:', error);
  }
}

// Jalankan analisis
analyzeExcelVsProject();
