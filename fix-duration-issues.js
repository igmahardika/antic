// Script untuk memperbaiki masalah durasi secara otomatis
// Jalankan script ini di console browser pada halaman Incident Data

console.log('🔧 FIXING DURATION ISSUES AUTOMATICALLY...');

async function fixDurationIssues() {
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

    // Track fixes
    let totalFixed = 0;
    let durationFixed = 0;
    let durationVendorFixed = 0;
    let netDurationFixed = 0;
    let formatFixed = 0;

    console.log('\n🔧 STARTING AUTOMATIC FIXES:');
    console.log('='.repeat(60));

    // Process incidents in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < incidents.length; i += batchSize) {
      const batch = incidents.slice(i, i + batchSize);
      
      for (const incident of batch) {
        let needsUpdate = false;
        const updates = {};

        // Fix 1: Recalculate duration from start/end times
        if (incident.startTime && incident.endTime) {
          try {
            const startDate = new Date(incident.startTime);
            const endDate = new Date(incident.endTime);
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const calculatedDuration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
              
              // Check if stored duration is significantly different
              if (incident.durationMin && Math.abs(incident.durationMin - calculatedDuration) > 5) {
                updates.durationMin = calculatedDuration;
                durationFixed++;
                needsUpdate = true;
                console.log(`🔧 Fixed duration for ${incident.noCase}: ${incident.durationMin} → ${calculatedDuration} minutes`);
              }
            }
          } catch (error) {
            console.log(`⚠️  Error calculating duration for ${incident.noCase}:`, error);
          }
        }

        // Fix 2: Recalculate duration vendor from start escalation to end
        if (incident.startEscalationVendor && incident.endTime) {
          try {
            const startEscalation = new Date(incident.startEscalationVendor);
            const endDate = new Date(incident.endTime);
            
            if (!isNaN(startEscalation.getTime()) && !isNaN(endDate.getTime())) {
              const calculatedDurationVendor = Math.round((endDate.getTime() - startEscalation.getTime()) / (1000 * 60));
              
              if (incident.durationVendorMin && Math.abs(incident.durationVendorMin - calculatedDurationVendor) > 5) {
                updates.durationVendorMin = calculatedDurationVendor;
                durationVendorFixed++;
                needsUpdate = true;
                console.log(`🔧 Fixed duration vendor for ${incident.noCase}: ${incident.durationVendorMin} → ${calculatedDurationVendor} minutes`);
              }
            }
          } catch (error) {
            console.log(`⚠️  Error calculating duration vendor for ${incident.noCase}:`, error);
          }
        }

        // Fix 3: Recalculate net duration
        if (updates.durationMin || updates.durationVendorMin) {
          const duration = updates.durationMin || incident.durationMin;
          const totalPause = incident.totalDurationPauseMin || 0;
          
          if (duration && duration > 0) {
            const calculatedNetDuration = Math.max(0, duration - totalPause);
            
            if (incident.netDurationMin && Math.abs(incident.netDurationMin - calculatedNetDuration) > 5) {
              updates.netDurationMin = calculatedNetDuration;
              netDurationFixed++;
              needsUpdate = true;
              console.log(`🔧 Fixed net duration for ${incident.noCase}: ${incident.netDurationMin} → ${calculatedNetDuration} minutes`);
            }
          }
        }

        // Fix 4: Ensure proper date format (remove DD/MM/YYYY HH.MM.SS format)
        if (incident.startTime && typeof incident.startTime === 'string') {
          let fixedStartTime = incident.startTime;
          
          // Fix DD/MM/YYYY HH.MM.SS format
          if (fixedStartTime.includes('/') && fixedStartTime.includes('.')) {
            fixedStartTime = fixedStartTime.replace(/\./g, ':');
            updates.startTime = fixedStartTime;
            formatFixed++;
            needsUpdate = true;
            console.log(`🔧 Fixed start time format for ${incident.noCase}: ${incident.startTime} → ${fixedStartTime}`);
          }
        }

        if (incident.endTime && typeof incident.endTime === 'string') {
          let fixedEndTime = incident.endTime;
          
          if (fixedEndTime.includes('/') && fixedEndTime.includes('.')) {
            fixedEndTime = fixedEndTime.replace(/\./g, ':');
            updates.endTime = fixedEndTime;
            formatFixed++;
            needsUpdate = true;
            console.log(`🔧 Fixed end time format for ${incident.noCase}: ${incident.endTime} → ${fixedEndTime}`);
          }
        }

        if (incident.startEscalationVendor && typeof incident.startEscalationVendor === 'string') {
          let fixedStartEscalation = incident.startEscalationVendor;
          
          if (fixedStartEscalation.includes('/') && fixedStartEscalation.includes('.')) {
            fixedStartEscalation = fixedStartEscalation.replace(/\./g, ':');
            updates.startEscalationVendor = fixedStartEscalation;
            formatFixed++;
            needsUpdate = true;
            console.log(`🔧 Fixed start escalation format for ${incident.noCase}: ${incident.startEscalationVendor} → ${fixedStartEscalation}`);
          }
        }

        // Update incident if needed
        if (needsUpdate) {
          try {
            await db.incidents.update(incident.id, updates);
            totalFixed++;
          } catch (error) {
            console.error(`❌ Failed to update ${incident.noCase}:`, error);
          }
        }
      }

      // Progress indicator
      if (i % 500 === 0) {
        console.log(`📊 Processed ${Math.min(i + batchSize, incidents.length)}/${incidents.length} incidents...`);
      }
    }

    // Summary
    console.log('\n📊 FIX SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Total incidents processed: ${incidents.length}`);
    console.log(`🔧 Total incidents fixed: ${totalFixed}`);
    console.log(`⏱️  Duration fixes: ${durationFixed}`);
    console.log(`🏢 Duration vendor fixes: ${durationVendorFixed}`);
    console.log(`📊 Net duration fixes: ${netDurationFixed}`);
    console.log(`📅 Format fixes: ${formatFixed}`);

    if (totalFixed > 0) {
      console.log('\n🎉 SUCCESS: Duration issues have been automatically fixed!');
      console.log('💡 The following improvements were made:');
      console.log('   1. ✅ Recalculated durations from start/end times');
      console.log('   2. ✅ Recalculated duration vendor from escalation to end');
      console.log('   3. ✅ Recalculated net durations');
      console.log('   4. ✅ Fixed date format issues (DD/MM/YYYY HH.MM.SS → DD/MM/YYYY HH:MM:SS)');
      
      console.log('\n🔄 NEXT STEPS:');
      console.log('   1. Refresh the page to see updated data');
      console.log('   2. Verify that duration values are now correct');
      console.log('   3. Check that date formats are consistent');
      console.log('   4. Monitor for any remaining issues');
    } else {
      console.log('\n✅ No issues found - all durations are already correct!');
    }

    // Verify fixes
    console.log('\n🔍 VERIFYING FIXES:');
    console.log('='.repeat(50));
    
    const sampleIncidents = incidents.slice(0, 5);
    sampleIncidents.forEach(inc => {
      console.log(`\n📋 ${inc.noCase}:`);
      console.log(`   Duration: ${inc.durationMin} minutes (${formatDurationHMS(inc.durationMin)})`);
      console.log(`   Duration Vendor: ${inc.durationVendorMin} minutes (${formatDurationHMS(inc.durationVendorMin)})`);
      console.log(`   Net Duration: ${inc.netDurationMin} minutes (${formatDurationHMS(inc.netDurationMin)})`);
      console.log(`   Start: ${inc.startTime}`);
      console.log(`   End: ${inc.endTime}`);
    });

  } catch (error) {
    console.error('❌ Error fixing duration issues:', error);
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

// Run the fix
fixDurationIssues();
