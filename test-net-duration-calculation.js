// Script untuk test dan validasi perhitungan Net Duration
// Jalankan script ini di console browser pada halaman Incident Data

console.log('🔍 TESTING NET DURATION CALCULATION...');

async function testNetDurationCalculation() {
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

    // Filter incidents with net duration data
    const incidentsWithNetDuration = incidents.filter(incident => 
      incident.netDurationMin !== undefined && incident.netDurationMin !== null
    );

    console.log(`📋 Incidents with net duration: ${incidentsWithNetDuration.length}`);

    if (incidentsWithNetDuration.length === 0) {
      console.log('⚠️ No incidents with net duration data found.');
      return;
    }

    // Test calculation accuracy
    console.log('\n🔧 TESTING NET DURATION CALCULATION ACCURACY:');
    console.log('='.repeat(80));
    
    let validCalculations = 0;
    let invalidCalculations = 0;
    let warnings = 0;

    incidentsWithNetDuration.forEach((incident, index) => {
      const caseNo = incident.noCase || 'N/A';
      const duration = incident.durationMin || 0;
      const totalPause = incident.totalDurationPauseMin || 0;
      const netDuration = incident.netDurationMin || 0;
      
      // Expected calculation
      const expectedNetDuration = Math.max(duration - totalPause, 0);
      
      // Check if calculation is correct
      const isCalculationCorrect = Math.abs(netDuration - expectedNetDuration) < 0.01; // Allow small floating point differences
      
      // Check for data consistency
      const isDataConsistent = totalPause <= duration;
      
      console.log(`\n${index + 1}. Case: ${caseNo}`);
      console.log(`   Duration: ${duration} minutes`);
      console.log(`   Total Duration Pause: ${totalPause} minutes`);
      console.log(`   Net Duration (stored): ${netDuration} minutes`);
      console.log(`   Net Duration (expected): ${expectedNetDuration} minutes`);
      
      if (isCalculationCorrect) {
        console.log(`   ✅ Calculation: CORRECT`);
        validCalculations++;
      } else {
        console.log(`   ❌ Calculation: INCORRECT (difference: ${Math.abs(netDuration - expectedNetDuration)} minutes)`);
        invalidCalculations++;
      }
      
      if (isDataConsistent) {
        console.log(`   ✅ Data Consistency: VALID (pause ≤ duration)`);
      } else {
        console.log(`   ⚠️ Data Consistency: WARNING (pause > duration)`);
        warnings++;
      }
      
      // Additional validation
      if (duration === 0 && totalPause > 0) {
        console.log(`   ⚠️ Warning: Duration is 0 but pause exists`);
      }
      
      if (netDuration < 0) {
        console.log(`   ❌ Error: Negative net duration detected`);
      }
    });

    // Summary
    console.log('\n📊 VALIDATION SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total incidents tested: ${incidentsWithNetDuration.length}`);
    console.log(`Valid calculations: ${validCalculations}`);
    console.log(`Invalid calculations: ${invalidCalculations}`);
    console.log(`Data consistency warnings: ${warnings}`);
    
    if (invalidCalculations === 0) {
      console.log('\n🎉 All net duration calculations are correct!');
    } else {
      console.log(`\n⚠️ ${invalidCalculations} incidents have incorrect net duration calculations.`);
      console.log('💡 This may indicate data inconsistency or calculation errors during upload.');
    }
    
    if (warnings > 0) {
      console.log(`\n⚠️ ${warnings} incidents have data consistency issues.`);
      console.log('💡 Total Duration Pause exceeds Duration, which may indicate data entry errors.');
    }

    // Test edge cases
    console.log('\n🧪 TESTING EDGE CASES:');
    console.log('='.repeat(50));
    
    const edgeCases = incidentsWithNetDuration.filter(incident => {
      const duration = incident.durationMin || 0;
      const totalPause = incident.totalDurationPauseMin || 0;
      const netDuration = incident.netDurationMin || 0;
      
      return (
        duration === 0 || 
        totalPause === 0 || 
        netDuration === 0 ||
        totalPause >= duration ||
        Math.abs(netDuration - Math.max(duration - totalPause, 0)) > 0.01
      );
    });
    
    if (edgeCases.length > 0) {
      console.log(`Found ${edgeCases.length} edge cases to investigate:`);
      edgeCases.slice(0, 5).forEach((incident, index) => {
        console.log(`\nEdge Case ${index + 1}: ${incident.noCase}`);
        console.log(`   Duration: ${incident.durationMin || 0}`);
        console.log(`   Total Pause: ${incident.totalDurationPauseMin || 0}`);
        console.log(`   Net Duration: ${incident.netDurationMin || 0}`);
        console.log(`   Expected: ${Math.max((incident.durationMin || 0) - (incident.totalDurationPauseMin || 0), 0)}`);
      });
      
      if (edgeCases.length > 5) {
        console.log(`\n... and ${edgeCases.length - 5} more edge cases.`);
      }
    } else {
      console.log('✅ No edge cases found. All calculations are within expected ranges.');
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('='.repeat(50));
    
    if (invalidCalculations > 0) {
      console.log('1. Review data upload process for calculation errors');
      console.log('2. Check if Duration and Total Duration Pause columns are correctly mapped');
      console.log('3. Verify that time format parsing is working correctly');
    }
    
    if (warnings > 0) {
      console.log('4. Investigate incidents where pause duration exceeds total duration');
      console.log('5. This may indicate data entry errors in Excel file');
    }
    
    if (invalidCalculations === 0 && warnings === 0) {
      console.log('1. All calculations are correct! ✅');
      console.log('2. Data consistency is maintained ✅');
      console.log('3. Net Duration column is reliable for analysis ✅');
    }

  } catch (error) {
    console.error('❌ Error testing net duration calculation:', error);
  }
}

// Run the test
testNetDurationCalculation();
