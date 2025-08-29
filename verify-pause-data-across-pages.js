// Script untuk memverifikasi data pause di semua halaman
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔍 VERIFYING PAUSE DATA ACROSS ALL PAGES...');

// Fungsi untuk mendapatkan database
async function getDatabase() {
  if (window.db) return window.db;
  if (window.InsightTicketDatabase) return window.InsightTicketDatabase;
  
  const dexieInstances = Object.keys(window).filter(key => 
    key.includes('dexie') || key.includes('db') || key.includes('database')
  );
  
  for (const key of dexieInstances) {
    const instance = window[key];
    if (instance && instance.incidents) {
      console.log(`Found database instance: ${key}`);
      return instance;
    }
  }
  
  throw new Error('Database not found');
}

// Fungsi untuk memverifikasi data pause
async function verifyPauseData() {
  try {
    console.log('🔍 Starting pause data verification...');
    
    const db = await getDatabase();
    const allIncidents = await db.incidents.toArray();
    
    console.log(`📊 Total incidents: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found');
      return;
    }
    
    // Analyze pause data
    let incidentsWithPause1 = 0;
    let incidentsWithEndPause1 = 0;
    let incidentsWithPause2 = 0;
    let incidentsWithEndPause2 = 0;
    let incidentsWithTotalPause = 0;
    
    const pauseData = [];
    const wanedaIncidents = [];
    
    allIncidents.forEach((incident, index) => {
      const hasStartPause1 = incident.startPause1 && incident.startPause1 !== null;
      const hasEndPause1 = incident.endPause1 && incident.endPause1 !== null;
      const hasStartPause2 = incident.startPause2 && incident.startPause2 !== null;
      const hasEndPause2 = incident.endPause2 && incident.endPause2 !== null;
      const hasTotalPause = incident.totalDurationPauseMin && incident.totalDurationPauseMin > 0;
      
      if (hasStartPause1) incidentsWithPause1++;
      if (hasEndPause1) incidentsWithEndPause1++;
      if (hasStartPause2) incidentsWithPause2++;
      if (hasEndPause2) incidentsWithEndPause2++;
      if (hasTotalPause) incidentsWithTotalPause++;
      
      // Collect sample data for first 10 incidents with pause
      if (pauseData.length < 10 && (hasStartPause1 || hasStartPause2)) {
        pauseData.push({
          noCase: incident.noCase,
          startPause1: incident.startPause1,
          endPause1: incident.endPause1,
          startPause2: incident.startPause2,
          endPause2: incident.endPause2,
          totalDurationPauseMin: incident.totalDurationPauseMin,
          durationVendorMin: incident.durationVendorMin,
          totalDurationVendorMin: incident.totalDurationVendorMin
        });
      }
      
      // Collect Waneda incidents
      if (incident.ts && incident.ts.toLowerCase().includes('waneda')) {
        wanedaIncidents.push({
          noCase: incident.noCase,
          ts: incident.ts,
          startPause1: incident.startPause1,
          endPause1: incident.endPause1,
          startPause2: incident.startPause2,
          endPause2: incident.endPause2,
          totalDurationPauseMin: incident.totalDurationPauseMin,
          durationVendorMin: incident.durationVendorMin,
          totalDurationVendorMin: incident.totalDurationVendorMin,
          durationMin: incident.durationMin
        });
      }
    });
    
    console.log('\n📊 PAUSE DATA VERIFICATION:');
    console.log(`Incidents with startPause1: ${incidentsWithPause1}/${allIncidents.length} (${((incidentsWithPause1/allIncidents.length)*100).toFixed(1)}%)`);
    console.log(`Incidents with endPause1: ${incidentsWithEndPause1}/${allIncidents.length} (${((incidentsWithEndPause1/allIncidents.length)*100).toFixed(1)}%)`);
    console.log(`Incidents with startPause2: ${incidentsWithPause2}/${allIncidents.length} (${((incidentsWithPause2/allIncidents.length)*100).toFixed(1)}%)`);
    console.log(`Incidents with endPause2: ${incidentsWithEndPause2}/${allIncidents.length} (${((incidentsWithEndPause2/allIncidents.length)*100).toFixed(1)}%)`);
    console.log(`Incidents with totalDurationPauseMin: ${incidentsWithTotalPause}/${allIncidents.length} (${((incidentsWithTotalPause/allIncidents.length)*100).toFixed(1)}%)`);
    
    console.log('\n📋 SAMPLE PAUSE DATA (first 10 incidents with pause):');
    pauseData.forEach((data, index) => {
      console.log(`\n${index + 1}. ${data.noCase}:`);
      console.log(`   startPause1: ${data.startPause1 || 'null'}`);
      console.log(`   endPause1: ${data.endPause1 || 'null'}`);
      console.log(`   startPause2: ${data.startPause2 || 'null'}`);
      console.log(`   endPause2: ${data.endPause2 || 'null'}`);
      console.log(`   totalDurationPauseMin: ${data.totalDurationPauseMin || 'null'}`);
      console.log(`   durationVendorMin: ${data.durationVendorMin || 'null'}`);
      console.log(`   totalDurationVendorMin: ${data.totalDurationVendorMin || 'null'}`);
    });
    
    // Waneda analysis
    if (wanedaIncidents.length > 0) {
      console.log(`\n🎯 WANEDA INCIDENTS ANALYSIS (${wanedaIncidents.length} incidents):`);
      
      const wanedaWithPause = wanedaIncidents.filter(inc => 
        inc.startPause1 || inc.startPause2
      );
      
      console.log(`Waneda incidents with pause data: ${wanedaWithPause.length}/${wanedaIncidents.length}`);
      
      if (wanedaWithPause.length > 0) {
        console.log('\n📋 Sample Waneda pause data:');
        wanedaWithPause.slice(0, 5).forEach((inc, index) => {
          console.log(`${index + 1}. ${inc.noCase}:`);
          console.log(`   startPause1: ${inc.startPause1 || 'null'}`);
          console.log(`   endPause1: ${inc.endPause1 || 'null'}`);
          console.log(`   totalDurationPauseMin: ${inc.totalDurationPauseMin || 'null'}`);
          console.log(`   durationVendorMin: ${inc.durationVendorMin || 'null'}`);
          console.log(`   totalDurationVendorMin: ${inc.totalDurationVendorMin || 'null'}`);
          console.log(`   durationMin: ${inc.durationMin || 'null'}`);
        });
      }
    }
    
    // Verify data consistency across pages
    console.log('\n🔍 DATA CONSISTENCY VERIFICATION:');
    
    // Check if all required fields are present
    const requiredFields = ['startPause1', 'endPause1', 'startPause2', 'endPause2', 'totalDurationPauseMin'];
    const fieldAnalysis = {};
    
    requiredFields.forEach(field => {
      const incidentsWithField = allIncidents.filter(inc => inc[field] && inc[field] !== null);
      fieldAnalysis[field] = {
        count: incidentsWithField.length,
        percentage: ((incidentsWithField.length / allIncidents.length) * 100).toFixed(1)
      };
    });
    
    console.log('Field availability analysis:');
    Object.entries(fieldAnalysis).forEach(([field, data]) => {
      console.log(`   ${field}: ${data.count}/${allIncidents.length} (${data.percentage}%)`);
    });
    
    // Check for data quality issues
    console.log('\n🔍 DATA QUALITY ISSUES:');
    
    const issues = [];
    
    // Issue 1: startPause1 without endPause1
    const pause1WithoutEnd = allIncidents.filter(inc => 
      inc.startPause1 && !inc.endPause1
    );
    if (pause1WithoutEnd.length > 0) {
      issues.push(`startPause1 without endPause1: ${pause1WithoutEnd.length} incidents`);
    }
    
    // Issue 2: startPause2 without endPause2
    const pause2WithoutEnd = allIncidents.filter(inc => 
      inc.startPause2 && !inc.endPause2
    );
    if (pause2WithoutEnd.length > 0) {
      issues.push(`startPause2 without endPause2: ${pause2WithoutEnd.length} incidents`);
    }
    
    // Issue 3: totalDurationPauseMin but no individual pause times
    const totalPauseWithoutIndividual = allIncidents.filter(inc => 
      inc.totalDurationPauseMin && inc.totalDurationPauseMin > 0 && 
      !inc.startPause1 && !inc.startPause2
    );
    if (totalPauseWithoutIndividual.length > 0) {
      issues.push(`totalDurationPauseMin without individual pause times: ${totalPauseWithoutIndividual.length} incidents`);
    }
    
    if (issues.length > 0) {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ No data quality issues found');
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (incidentsWithPause1 > 0 && incidentsWithEndPause1 === 0) {
      console.log('1. ❌ CRITICAL: Found startPause1 data but NO endPause1 data!');
      console.log('   - This suggests the "Restart" column (V) is not being read correctly');
      console.log('   - Check Excel column mapping in IncidentUpload.tsx');
      console.log('   - Verify that column V contains "Restart" data');
    }
    
    if (incidentsWithTotalPause > 0) {
      console.log('2. ✅ Found totalDurationPauseMin data - this can be used as fallback');
    }
    
    if (wanedaIncidents.length > 0) {
      console.log('3. 🎯 Waneda incidents found - verify Waneda duration calculation');
      console.log('   - Formula: Duration Vendor - Total Duration Pause - Total Duration Vendor');
      console.log('   - Target SLA: 04:00:00 (240 minutes)');
    }
    
    console.log('\n✅ VERIFICATION COMPLETE');
    console.log('📋 Next steps:');
    console.log('1. Check Incident Data page to see pause columns');
    console.log('2. Check Technical Support Analytics for Waneda calculations');
    console.log('3. Check Incident Analytics for overall duration calculations');
    console.log('4. Check Site Analytics for site-specific metrics');
    
  } catch (error) {
    console.error('❌ Error verifying pause data:', error);
  }
}

// Jalankan verifikasi
verifyPauseData();
