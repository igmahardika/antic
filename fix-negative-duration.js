// Script khusus untuk memperbaiki negative duration
// Jalankan script ini di console browser pada halaman Incident Data

console.log('🔧 FIXING NEGATIVE DURATION ISSUES...');

async function fixNegativeDuration() {
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

    // Find incidents with negative duration
    const negativeDurationIncidents = incidents.filter(incident => 
      (incident.durationMin && incident.durationMin < 0) ||
      (incident.durationVendorMin && incident.durationVendorMin < 0) ||
      (incident.netDurationMin && incident.netDurationMin < 0)
    );

    console.log(`🚨 Found ${negativeDurationIncidents.length} incidents with negative duration values`);

    if (negativeDurationIncidents.length === 0) {
      console.log('✅ No negative duration issues found!');
      return;
    }

    // Display problematic incidents
    console.log('\n🚨 INCIDENTS WITH NEGATIVE DURATION:');
    console.log('='.repeat(80));
    
    negativeDurationIncidents.forEach((incident, index) => {
      console.log(`\n${index + 1}. ${incident.noCase}:`);
      console.log(`   Site: ${incident.site}`);
      console.log(`   Duration: ${incident.durationMin} minutes`);
      console.log(`   Duration Vendor: ${incident.durationVendorMin} minutes`);
      console.log(`   Net Duration: ${incident.netDurationMin} minutes`);
      console.log(`   Start: ${incident.startTime}`);
      console.log(`   End: ${incident.endTime}`);
      console.log(`   Start Escalation: ${incident.startEscalationVendor}`);
    });

    // Fix negative duration issues
    console.log('\n🔧 STARTING FIXES...');
    console.log('='.repeat(50));
    
    let fixedCount = 0;
    let errors = [];

    for (const incident of negativeDurationIncidents) {
      try {
        const updates = {};
        let needsUpdate = false;

        // Fix negative duration
        if (incident.durationMin && incident.durationMin < 0) {
          if (incident.startTime && incident.endTime) {
            try {
              const startDate = new Date(incident.startTime);
              const endDate = new Date(incident.endTime);
              
              if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                const calculatedDuration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
                if (calculatedDuration > 0) {
                  updates.durationMin = calculatedDuration;
                  needsUpdate = true;
                  console.log(`🔧 Fixed duration for ${incident.noCase}: ${incident.durationMin} → ${calculatedDuration} minutes`);
                } else {
                  updates.durationMin = 0;
                  needsUpdate = true;
                  console.log(`🔧 Set duration to 0 for ${incident.noCase} (calculated: ${calculatedDuration})`);
                }
              } else {
                updates.durationMin = 0;
                needsUpdate = true;
                console.log(`🔧 Set duration to 0 for ${incident.noCase} (invalid dates)`);
              }
            } catch (error) {
              updates.durationMin = 0;
              needsUpdate = true;
              console.log(`🔧 Set duration to 0 for ${incident.noCase} (error: ${error})`);
            }
          } else {
            updates.durationMin = 0;
            needsUpdate = true;
            console.log(`🔧 Set duration to 0 for ${incident.noCase} (missing start/end times)`);
          }
        }

        // Fix negative duration vendor
        if (incident.durationVendorMin && incident.durationVendorMin < 0) {
          if (incident.startEscalationVendor && incident.endTime) {
            try {
              const startEscalation = new Date(incident.startEscalationVendor);
              const endDate = new Date(incident.endTime);
              
              if (!isNaN(startEscalation.getTime()) && !isNaN(endDate.getTime())) {
                const calculatedDurationVendor = Math.round((endDate.getTime() - startEscalation.getTime()) / (1000 * 60));
                if (calculatedDurationVendor > 0) {
                  updates.durationVendorMin = calculatedDurationVendor;
                  needsUpdate = true;
                  console.log(`🔧 Fixed duration vendor for ${incident.noCase}: ${incident.durationVendorMin} → ${calculatedDurationVendor} minutes`);
                } else {
                  updates.durationVendorMin = 0;
                  needsUpdate = true;
                  console.log(`🔧 Set duration vendor to 0 for ${incident.noCase} (calculated: ${calculatedDurationVendor})`);
                }
              } else {
                updates.durationVendorMin = 0;
                needsUpdate = true;
                console.log(`🔧 Set duration vendor to 0 for ${incident.noCase} (invalid dates)`);
              }
            } catch (error) {
              updates.durationVendorMin = 0;
              needsUpdate = true;
              console.log(`🔧 Set duration vendor to 0 for ${incident.noCase} (error: ${error})`);
            }
          } else {
            updates.durationVendorMin = 0;
            needsUpdate = true;
            console.log(`🔧 Set duration vendor to 0 for ${incident.noCase} (missing escalation/end times)`);
          }
        }

        // Fix negative net duration
        if (incident.netDurationMin && incident.netDurationMin < 0) {
          const duration = updates.durationMin || incident.durationMin;
          const totalPause = incident.totalDurationPauseMin || 0;
          
          if (duration && duration > 0) {
            const calculatedNetDuration = Math.max(0, duration - totalPause);
            updates.netDurationMin = calculatedNetDuration;
            needsUpdate = true;
            console.log(`🔧 Fixed net duration for ${incident.noCase}: ${incident.netDurationMin} → ${calculatedNetDuration} minutes`);
          } else {
            updates.netDurationMin = 0;
            needsUpdate = true;
            console.log(`🔧 Set net duration to 0 for ${incident.noCase} (no valid duration)`);
          }
        }

        // Update incident if needed
        if (needsUpdate) {
          await db.incidents.update(incident.id, updates);
          fixedCount++;
        }

      } catch (error) {
        const errorMsg = `Failed to fix ${incident.noCase}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Summary
    console.log('\n📊 FIX SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Total incidents processed: ${negativeDurationIncidents.length}`);
    console.log(`🔧 Total incidents fixed: ${fixedCount}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      errors.forEach(error => console.log(`   • ${error}`));
    }

    if (fixedCount > 0) {
      console.log('\n🎉 SUCCESS: Negative duration issues have been fixed!');
      console.log('💡 Refresh the page to see updated data');
    } else {
      console.log('\n⚠️ No fixes were applied');
    }

  } catch (error) {
    console.error('❌ Error fixing negative duration:', error);
  }
}

// Run the fix
fixNegativeDuration();
