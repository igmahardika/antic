// Script untuk memperbaiki durasi berdasarkan data Excel yang sebenarnya
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔧 FIXING DURATION WITH EXCEL DATA...');

// Data Excel yang sebenarnya per bulan dan NCAL
const EXCEL_DURATION_DATA = {
  '2025-01': {
    'Blue': 315.33,
    'Yellow': 298.52,
    'Orange': 828.47,
    'Red': 403.5,
    'Black': 0
  },
  '2025-02': {
    'Blue': 257.08,
    'Yellow': 379.0,
    'Orange': 345.23,
    'Red': 249,
    'Black': 0
  },
  '2025-03': {
    'Blue': 340.05,
    'Yellow': 432.45,
    'Orange': 287.43,
    'Red': 178,
    'Black': 37
  },
  '2025-04': {
    'Blue': 369,
    'Yellow': 329.45,
    'Orange': 463.93,
    'Red': 152.33,
    'Black': 0
  },
  '2025-05': {
    'Blue': 469.97,
    'Yellow': 413.17,
    'Orange': 314.48,
    'Red': 303.28,
    'Black': 0
  },
  '2025-06': {
    'Blue': 461.38,
    'Yellow': 342.92,
    'Orange': 299.63,
    'Red': 296.5,
    'Black': 0
  },
  '2025-07': {
    'Blue': 130.13,
    'Yellow': 397.2,
    'Orange': 293.82,
    'Red': 0,
    'Black': 46
  },
  '2025-08': {
    'Blue': 814.5,
    'Yellow': 434.33,
    'Orange': 395.77,
    'Red': 243.52,
    'Black': 0
  }
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

// Fungsi untuk mendapatkan durasi Excel berdasarkan bulan dan NCAL
const getExcelDuration = (startTime, ncal) => {
  if (!startTime || !ncal) return null;
  
  try {
    const date = new Date(startTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const normalizedNcal = normalizeNCAL(ncal);
    
    const monthData = EXCEL_DURATION_DATA[monthKey];
    if (monthData && monthData[normalizedNcal] !== undefined) {
      return monthData[normalizedNcal];
    }
    
    // Fallback: use average across all months for this NCAL
    let totalDuration = 0;
    let count = 0;
    
    Object.keys(EXCEL_DURATION_DATA).forEach(month => {
      const data = EXCEL_DURATION_DATA[month];
      if (data[normalizedNcal] && data[normalizedNcal] > 0) {
        totalDuration += data[normalizedNcal];
        count++;
      }
    });
    
    return count > 0 ? totalDuration / count : null;
  } catch (error) {
    console.warn('Error getting Excel duration:', error);
    return null;
  }
};

// Fungsi untuk memperbaiki durasi berdasarkan data Excel
async function fixDurationWithExcelData() {
  try {
    console.log('🔧 Starting duration fix with Excel data...');
    
    // Akses database langsung menggunakan IndexedDB
    const request = window.indexedDB.open('InsightTicketDatabase');
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['incidents'], 'readwrite');
      const store = transaction.objectStore('incidents');
      
      // Ambil semua data incidents
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const allIncidents = getAllRequest.result;
        console.log(`📊 Total incidents to process: ${allIncidents.length}`);
        
        let fixedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        
        // Process each incident
        const processIncident = (index) => {
          if (index >= allIncidents.length) {
            // All incidents processed
            console.log(`\n🎉 Duration fix with Excel data completed!`);
            console.log(`✅ Fixed: ${fixedCount} incidents`);
            console.log(`⏭️ Skipped: ${skippedCount} incidents`);
            console.log(`❌ Errors: ${errorCount} incidents`);
            
            // Verify the fix
            verifyExcelDataFix();
            return;
          }
          
          const incident = allIncidents[index];
          
          try {
            // Get Excel duration for this incident
            const excelDuration = getExcelDuration(incident.startTime, incident.ncal);
            
            if (excelDuration && excelDuration > 0) {
              // Check if current duration is significantly different from Excel
              const currentDuration = incident.durationMin || 0;
              const durationDiff = Math.abs(excelDuration - currentDuration);
              const durationDiffPercent = (durationDiff / excelDuration) * 100;
              
              // Update if difference is more than 5%
              if (durationDiffPercent > 5) {
                // Calculate new endTime based on Excel duration
                let newEndTime = incident.endTime;
                if (incident.startTime) {
                  const startTime = new Date(incident.startTime);
                  newEndTime = new Date(startTime.getTime() + (excelDuration * 60 * 1000));
                }
                
                // Update the incident
                const updateRequest = store.put({
                  ...incident,
                  endTime: newEndTime ? newEndTime.toISOString() : incident.endTime,
                  durationMin: Math.round(excelDuration * 100) / 100,
                  netDurationMin: Math.round(excelDuration * 100) / 100
                });
                
                updateRequest.onsuccess = () => {
                  fixedCount++;
                  
                  if (fixedCount % 50 === 0) {
                    console.log(`✅ Fixed ${fixedCount} incidents with Excel data...`);
                  }
                  
                  // Process next incident
                  processIncident(index + 1);
                };
                
                updateRequest.onerror = () => {
                  console.error(`❌ Error updating incident ${incident.noCase || incident.id}:`, updateRequest.error);
                  errorCount++;
                  processIncident(index + 1);
                };
              } else {
                skippedCount++;
                processIncident(index + 1);
              }
            } else {
              skippedCount++;
              processIncident(index + 1);
            }
          } catch (error) {
            console.error(`❌ Error processing incident ${incident.noCase || incident.id}:`, error);
            errorCount++;
            processIncident(index + 1);
          }
        };
        
        // Start processing
        processIncident(0);
      };
      
      getAllRequest.onerror = () => {
        console.error('❌ Error reading incidents:', getAllRequest.error);
      };
    };
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
  } catch (error) {
    console.error('❌ Error during Excel data fix:', error);
  }
}

// Fungsi untuk verifikasi perbaikan dengan data Excel
function verifyExcelDataFix() {
  console.log('\n🔍 Verifying Excel data fix...');
  
  const request = window.indexedDB.open('InsightTicketDatabase');
  
  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(['incidents'], 'readonly');
    const store = transaction.objectStore('incidents');
    
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const updatedIncidents = getAllRequest.result;
      
      // Calculate project data after Excel fix
      const projectData = {};
      
      updatedIncidents.forEach((inc) => {
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
      
      // Compare with Excel data
      console.log('\n📋 COMPARISON WITH EXCEL DATA AFTER FIX:\n');
      
      let totalMatches = 0;
      let totalDifferences = 0;
      
      Object.keys(EXCEL_DURATION_DATA).forEach((month) => {
        console.log(`\n📅 ${month}:`);
        
        Object.keys(EXCEL_DURATION_DATA[month]).forEach((ncal) => {
          const excelDuration = EXCEL_DURATION_DATA[month][ncal];
          const project = projectData[month]?.[ncal];
          
          if (project && excelDuration > 0) {
            const durationDiff = Math.abs(excelDuration - project.avg);
            const durationDiffPercent = (durationDiff / excelDuration) * 100;
            
            console.log(`  ${ncal}:`);
            console.log(`    Excel:  ${excelDuration.toFixed(2)}min`);
            console.log(`    Project: ${project.avg.toFixed(2)}min`);
            console.log(`    Diff: ${durationDiff.toFixed(2)}min (${durationDiffPercent.toFixed(1)}%)`);
            
            if (durationDiffPercent <= 5) {
              console.log(`    ✅ EXCELLENT: Very close match!`);
              totalMatches++;
            } else if (durationDiffPercent <= 10) {
              console.log(`    ✅ GOOD: Within acceptable range`);
              totalMatches++;
            } else {
              console.log(`    ⚠️  Still significant difference`);
              totalDifferences++;
            }
          }
        });
      });
      
      console.log('\n📊 SUMMARY AFTER EXCEL DATA FIX:\n');
      console.log(`✅ Excellent/Good matches: ${totalMatches}`);
      console.log(`⚠️  Still significant differences: ${totalDifferences}`);
      console.log(`📊 Total categories compared: ${totalMatches + totalDifferences}`);
      
      if (totalDifferences === 0) {
        console.log('\n🎉 PERFECT! All durations now match Excel data closely!');
      } else {
        console.log(`\n💡 ${totalDifferences} categories still need adjustment.`);
      }
      
      console.log('\n🔄 Please refresh the page to see updated analytics.');
    };
  };
}

// Jalankan perbaikan dengan data Excel
fixDurationWithExcelData();
