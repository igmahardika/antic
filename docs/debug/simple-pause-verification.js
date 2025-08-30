// Script verifikasi pause data yang sederhana
// Copy paste ke browser console di halaman Incident Analytics atau Incident Data

console.log('🔍 SIMPLE PAUSE DATA VERIFICATION...');

// Fungsi untuk mendapatkan database dengan berbagai cara
async function getDatabase() {
  console.log('🔍 Searching for database...');
  
  // Method 1: Check window.db
  if (window.db) {
    console.log('✅ Found window.db');
    return window.db;
  }
  
  // Method 2: Check window.InsightTicketDatabase
  if (window.InsightTicketDatabase) {
    console.log('✅ Found window.InsightTicketDatabase');
    return window.InsightTicketDatabase;
  }
  
  // Method 3: Check for any object with incidents property
  const allKeys = Object.keys(window);
  const potentialDbKeys = allKeys.filter(key => 
    key.toLowerCase().includes('db') || 
    key.toLowerCase().includes('dexie') || 
    key.toLowerCase().includes('database')
  );
  
  console.log('Potential database keys:', potentialDbKeys);
  
  for (const key of potentialDbKeys) {
    try {
      const instance = window[key];
      if (instance && typeof instance === 'object' && instance.incidents) {
        console.log(`✅ Found database instance: ${key}`);
        return instance;
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  // Method 4: Check current page
  const currentPath = window.location.pathname;
  console.log('Current page:', currentPath);
  
  if (currentPath.includes('/incident/analytics')) {
    console.log('✅ You are on Incident Analytics page');
  } else if (currentPath.includes('/incident/data')) {
    console.log('✅ You are on Incident Data page');
  } else {
    console.log('⚠️ You are not on a page with database access');
    console.log('💡 Please navigate to:');
    console.log('   - http://localhost:3000/incident/analytics');
    console.log('   - http://localhost:3000/incident/data');
  }
  
  throw new Error('Database not found. Please make sure you are on the correct page.');
}

// Fungsi untuk verifikasi data pause
async function verifyPauseData() {
  try {
    console.log('🔍 Starting pause data verification...');
    
    const db = await getDatabase();
    console.log('✅ Database found, getting incidents...');
    
    const allIncidents = await db.incidents.toArray();
    console.log(`📊 Total incidents: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found');
      console.log('💡 Please upload incident data first');
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
      
      // Collect sample data for first 5 incidents with pause
      if (pauseData.length < 5 && (hasStartPause1 || hasStartPause2)) {
        pauseData.push({
          noCase: incident.noCase,
          startPause1: incident.startPause1,
          endPause1: incident.endPause1,
          startPause2: incident.startPause2,
          endPause2: incident.endPause2,
          totalDurationPauseMin: incident.totalDurationPauseMin
        });
      }
      
      // Collect Waneda incidents
      if (incident.ts && incident.ts.toLowerCase().includes('waneda')) {
        wanedaIncidents.push({
          noCase: incident.noCase,
          ts: incident.ts,
          startPause1: incident.startPause1,
          endPause1: incident.endPause1,
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
    
    if (pauseData.length > 0) {
      console.log('\n📋 SAMPLE PAUSE DATA:');
      pauseData.forEach((data, index) => {
        console.log(`\n${index + 1}. ${data.noCase}:`);
        console.log(`   startPause1: ${data.startPause1 || 'null'}`);
        console.log(`   endPause1: ${data.endPause1 || 'null'}`);
        console.log(`   startPause2: ${data.startPause2 || 'null'}`);
        console.log(`   endPause2: ${data.endPause2 || 'null'}`);
        console.log(`   totalDurationPauseMin: ${data.totalDurationPauseMin || 'null'}`);
      });
    } else {
      console.log('\n📋 No pause data found in sample');
    }
    
    // Waneda analysis
    if (wanedaIncidents.length > 0) {
      console.log(`\n🎯 WANEDA INCIDENTS (${wanedaIncidents.length} incidents):`);
      
      const wanedaWithPause = wanedaIncidents.filter(inc => 
        inc.startPause1 || inc.startPause2
      );
      
      console.log(`Waneda incidents with pause data: ${wanedaWithPause.length}/${wanedaIncidents.length}`);
      
      if (wanedaWithPause.length > 0) {
        console.log('\n📋 Sample Waneda pause data:');
        wanedaWithPause.slice(0, 3).forEach((inc, index) => {
          console.log(`${index + 1}. ${inc.noCase}:`);
          console.log(`   startPause1: ${inc.startPause1 || 'null'}`);
          console.log(`   endPause1: ${inc.endPause1 || 'null'}`);
          console.log(`   totalDurationPauseMin: ${inc.totalDurationPauseMin || 'null'}`);
        });
      }
    }
    
    // Check for issues
    console.log('\n🔍 DATA QUALITY CHECK:');
    
    const issues = [];
    
    if (incidentsWithPause1 > 0 && incidentsWithEndPause1 === 0) {
      issues.push('❌ CRITICAL: Found startPause1 but NO endPause1 data!');
      issues.push('   - This suggests "Restart" column (V) is not being read');
      issues.push('   - Check Excel column mapping');
    }
    
    if (incidentsWithTotalPause > 0) {
      console.log('✅ Found totalDurationPauseMin data - can be used as fallback');
    }
    
    if (issues.length > 0) {
      console.log('Issues found:');
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('✅ No critical issues found');
    }
    
    console.log('\n✅ VERIFICATION COMPLETE');
    console.log('📋 Next steps:');
    console.log('1. Check Incident Data page to see pause columns');
    console.log('2. Check Technical Support Analytics for Waneda calculations');
    console.log('3. Upload new Excel file if pause data is missing');
    
  } catch (error) {
    console.error('❌ Error verifying pause data:', error);
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('1. Make sure you are on Incident Analytics or Incident Data page');
    console.log('2. Make sure the app is fully loaded');
    console.log('3. Try refreshing the page and running the script again');
    console.log('4. Check if there are any console errors');
  }
}

// Jalankan verifikasi
verifyPauseData();
