// Script untuk test data pause di Waneda Monthly Recap
// Jalankan script ini di console browser pada halaman Technical Support Analytics

console.log('🔍 TESTING WANEDA PAUSE DATA IN MONTHLY RECAP...');

async function testWanedaPauseData() {
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

    // Filter Waneda incidents
    const wanedaIncidents = incidents.filter(incident => {
      const ts = incident.ts || '';
      return ts.toLowerCase().includes('waneda') || 
             ts.toLowerCase().includes('lintas') || 
             ts.toLowerCase().includes('fiber');
    });

    console.log(`👥 Waneda incidents found: ${wanedaIncidents.length}`);

    if (wanedaIncidents.length === 0) {
      console.log('⚠️ No Waneda incidents found. Please upload data with Waneda vendor.');
      return;
    }

    // Check pause data for each Waneda incident
    console.log('\n📋 WANEDA INCIDENTS PAUSE DATA:');
    console.log('='.repeat(100));
    
    wanedaIncidents.forEach((incident, index) => {
      console.log(`\n${index + 1}. Case: ${incident.noCase || 'N/A'}`);
      console.log(`   Vendor: ${incident.ts || 'N/A'}`);
      console.log(`   Start: ${incident.start || 'N/A'}`);
      console.log(`   End: ${incident.end || 'N/A'}`);
      
      // Check pause data
      console.log(`   📍 Pause Data:`);
      console.log(`      startPause1: ${incident.startPause1 || '(empty)'}`);
      console.log(`      endPause1: ${incident.endPause1 || '(empty)'}`);
      console.log(`      startPause2: ${incident.startPause2 || '(empty)'}`);
      console.log(`      endPause2: ${incident.endPause2 || '(empty)'}`);
      
      // Check duration data
      console.log(`   ⏱️ Duration Data:`);
      console.log(`      durationMin: ${incident.durationMin || '(empty)'}`);
      console.log(`      durationVendorMin: ${incident.durationVendorMin || '(empty)'}`);
      console.log(`      totalDurationPauseMin: ${incident.totalDurationPauseMin || '(empty)'}`);
      console.log(`      totalDurationVendorMin: ${incident.totalDurationVendorMin || '(empty)'}`);
      
      // Calculate Waneda duration
      let wanedaDuration = 0;
      if (incident.durationVendorMin && incident.durationVendorMin > 0) {
        wanedaDuration = incident.durationVendorMin;
      }
      if (incident.totalDurationPauseMin && incident.totalDurationPauseMin > 0) {
        wanedaDuration -= incident.totalDurationPauseMin;
      }
      if (incident.totalDurationVendorMin && incident.totalDurationVendorMin > 0) {
        wanedaDuration -= incident.totalDurationVendorMin;
      }
      wanedaDuration = Math.max(0, wanedaDuration);
      
      console.log(`   🎯 Waneda Formula: ${wanedaDuration} minutes`);
      console.log(`   🎯 SLA Target: 240 minutes (04:00:00)`);
      console.log(`   🎯 Status: ${wanedaDuration <= 240 ? '✅ Target' : '❌ Non-Target'}`);
    });

    // Check if any incidents have pause data
    const incidentsWithPause = wanedaIncidents.filter(incident => 
      incident.startPause1 || incident.endPause1 || incident.startPause2 || incident.endPause2
    );

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total Waneda incidents: ${wanedaIncidents.length}`);
    console.log(`Incidents with pause data: ${incidentsWithPause.length}`);
    console.log(`Incidents without pause data: ${wanedaIncidents.length - incidentsWithPause.length}`);

    if (incidentsWithPause.length > 0) {
      console.log('\n✅ Pause data is available and should appear in Waneda Monthly Recap table!');
      console.log('💡 Navigate to Technical Support Analytics → Waneda Monthly Recap → Click "View" on any month');
    } else {
      console.log('\n⚠️ No pause data found in Waneda incidents.');
      console.log('💡 This could mean:');
      console.log('   1. The uploaded data doesn\'t contain pause information');
      console.log('   2. The pause columns were not properly mapped during upload');
      console.log('   3. The incidents don\'t have any pause periods');
    }

    // Test getDateTime function logic
    console.log('\n🔧 TESTING getDateTime FUNCTION LOGIC:');
    console.log('='.repeat(50));
    
    const testIncident = wanedaIncidents[0];
    if (testIncident) {
      console.log(`Testing with incident: ${testIncident.noCase}`);
      
      // Simulate getDateTime function
      const getDateTime = (incident, field) => {
        const fieldMap = {
          pause1: ['startPause1', 'startPause', 'pause1', 'Pause1', 'pause'],
          restart1: ['endPause1', 'endPause', 'restart1', 'Restart1', 'restart'],
          pause2: ['startPause2', 'pause2', 'Pause2'],
          restart2: ['endPause2', 'restart2', 'Restart2']
        };
        
        const candidates = fieldMap[field] || [field];
        for (const name of candidates) {
          const value = incident[name];
          if (value !== undefined && value !== null && value !== '') {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                return date.toLocaleString('id-ID', {
                  timeZone: 'Asia/Jakarta',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }
            } catch {
              // ignore parse errors
            }
          }
        }
        return '-';
      };

      console.log(`   pause1 (startPause1): ${getDateTime(testIncident, 'pause1')}`);
      console.log(`   restart1 (endPause1): ${getDateTime(testIncident, 'restart1')}`);
      console.log(`   pause2 (startPause2): ${getDateTime(testIncident, 'pause2')}`);
      console.log(`   restart2 (endPause2): ${getDateTime(testIncident, 'restart2')}`);
    }

  } catch (error) {
    console.error('❌ Error testing Waneda pause data:', error);
  }
}

// Run the test
testWanedaPauseData();
