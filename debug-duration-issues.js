// Script untuk debug masalah durasi yang berulang
// Jalankan script ini di console browser pada halaman Incident Data

console.log('🔍 DEBUGGING DURATION ISSUES...');

async function debugDurationIssues() {
  try {
    // Get database
    let db;
    try {
      db = await import('/src/lib/db.ts');
      db = db.db;
      console.log('✅ Found database via import');
    } catch (error) {
      console.error('❌ Failed to import database:', error);
      return;
    }

    // Get all incidents
    const incidents = await db.incidents.toArray();
    console.log(`📊 Total incidents: ${incidents.length}`);

    // Analyze duration patterns
    console.log('\n🔍 ANALYZING DURATION PATTERNS:');
    console.log('='.repeat(80));

    // Check for repeated duration values
    const durationCounts = {};
    const suspiciousDurations = [];
    
    incidents.forEach(incident => {
      const duration = incident.durationMin;
      const durationVendor = incident.durationVendorMin;
      const netDuration = incident.netDurationMin;
      
      if (duration) {
        const key = `duration_${duration}`;
        durationCounts[key] = (durationCounts[key] || 0) + 1;
        
        // Check for suspicious patterns
        if (durationCounts[key] > 3) {
          suspiciousDurations.push({
            type: 'durationMin',
            value: duration,
            count: durationCounts[key],
            incidents: incidents.filter(inc => inc.durationMin === duration).slice(0, 5)
          });
        }
      }
      
      if (durationVendor) {
        const key = `durationVendor_${durationVendor}`;
        durationCounts[key] = (durationCounts[key] || 0) + 1;
        
        if (durationCounts[key] > 3) {
          suspiciousDurations.push({
            type: 'durationVendorMin',
            value: durationVendor,
            count: durationCounts[key],
            incidents: incidents.filter(inc => inc.durationVendorMin === durationVendor).slice(0, 5)
          });
        }
      }
      
      if (netDuration) {
        const key = `netDuration_${netDuration}`;
        durationCounts[key] = (durationCounts[key] || 0) + 1;
        
        if (durationCounts[key] > 3) {
          suspiciousDurations.push({
            type: 'netDurationMin',
            value: netDuration,
            count: durationCounts[key],
            incidents: incidents.filter(inc => inc.netDurationMin === netDuration).slice(0, 5)
          });
        }
      }
    });

    // Display suspicious patterns
    if (suspiciousDurations.length > 0) {
      console.log('🚨 SUSPICIOUS DURATION PATTERNS FOUND:');
      suspiciousDurations.forEach(pattern => {
        console.log(`\n${pattern.type}: ${pattern.value} minutes (${formatDurationHMS(pattern.value)})`);
        console.log(`   Count: ${pattern.count} incidents`);
        console.log(`   Sample incidents:`);
        pattern.incidents.forEach(inc => {
          console.log(`     - ${inc.noCase}: ${inc.site} (${inc.startTime})`);
        });
      });
    } else {
      console.log('✅ No suspicious duration patterns found');
    }

    // Check for specific problematic values
    console.log('\n🎯 CHECKING SPECIFIC PROBLEMATIC VALUES:');
    console.log('='.repeat(50));
    
    const problematicValues = [
      { minutes: 434, display: '07:14:19' },  // 7 hours 14 minutes 19 seconds
      { minutes: 395, display: '06:35:46' },  // 6 hours 35 minutes 46 seconds
      { minutes: 814, display: '13:34:30' }   // 13 hours 34 minutes 30 seconds
    ];
    
    problematicValues.forEach(problem => {
      const incidentsWithValue = incidents.filter(inc => 
        inc.durationMin === problem.minutes || 
        inc.durationVendorMin === problem.minutes || 
        inc.netDurationMin === problem.minutes
      );
      
      if (incidentsWithValue.length > 0) {
        console.log(`\n🚨 Found ${incidentsWithValue.length} incidents with ${problem.display} (${problem.minutes} minutes):`);
        incidentsWithValue.slice(0, 5).forEach(inc => {
          console.log(`   - ${inc.noCase}: ${inc.site}`);
          console.log(`     Duration: ${inc.durationMin} (${formatDurationHMS(inc.durationMin)})`);
          console.log(`     Duration Vendor: ${inc.durationVendorMin} (${formatDurationHMS(inc.durationVendorMin)})`);
          console.log(`     Net Duration: ${inc.netDurationMin} (${formatDurationHMS(inc.netDurationMin)})`);
          console.log(`     Start: ${inc.startTime}`);
          console.log(`     End: ${inc.endTime}`);
        });
      }
    });

    // Check for data consistency issues
    console.log('\n🔍 CHECKING DATA CONSISTENCY:');
    console.log('='.repeat(50));
    
    let consistencyIssues = 0;
    incidents.slice(0, 20).forEach(inc => {
      const duration = inc.durationMin;
      const start = inc.startTime;
      const end = inc.endTime;
      
      if (duration && start && end) {
        try {
          const startDate = new Date(start);
          const endDate = new Date(end);
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const calculatedDuration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
            const difference = Math.abs(duration - calculatedDuration);
            
            if (difference > 5) { // More than 5 minutes difference
              console.log(`⚠️  Duration mismatch for ${inc.noCase}:`);
              console.log(`   Stored: ${duration} minutes (${formatDurationHMS(duration)})`);
              console.log(`   Calculated: ${calculatedDuration} minutes (${formatDurationHMS(calculatedDuration)})`);
              console.log(`   Difference: ${difference} minutes`);
              console.log(`   Start: ${start}`);
              console.log(`   End: ${end}`);
              consistencyIssues++;
            }
          }
        } catch (error) {
          console.log(`❌ Error calculating duration for ${inc.noCase}:`, error);
        }
      }
    });

    if (consistencyIssues === 0) {
      console.log('✅ No duration consistency issues found');
    }

    // Summary and recommendations
    console.log('\n📊 SUMMARY & RECOMMENDATIONS:');
    console.log('='.repeat(50));
    
    if (suspiciousDurations.length > 0) {
      console.log('🚨 ISSUES FOUND:');
      console.log('1. Multiple incidents with identical duration values');
      console.log('2. This suggests data duplication or calculation errors');
      console.log('3. Need to recalculate durations from start/end times');
    }
    
    if (consistencyIssues > 0) {
      console.log('⚠️  CONSISTENCY ISSUES:');
      console.log('1. Stored duration values don\'t match calculated durations');
      console.log('2. Need to recalculate and update duration fields');
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Recalculate all durations from start/end times');
    console.log('2. Check for data duplication during upload');
    console.log('3. Validate duration calculations in upload process');
    console.log('4. Ensure proper date parsing and timezone handling');

  } catch (error) {
    console.error('❌ Error debugging duration issues:', error);
  }
}

// Helper function to format duration as HH:MM:SS
function formatDurationHMS(minutes) {
  if (!minutes || isNaN(minutes)) return '00:00:00';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Run the debug
debugDurationIssues();
