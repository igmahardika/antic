// Script debug pause data khusus untuk halaman Technical Support Analytics
// Copy paste ke browser console di halaman Technical Support Analytics

console.log('🔍 TS ANALYTICS PAUSE DATA DEBUG...');

// Fungsi untuk mendapatkan database dari React context
async function getDatabaseFromReact() {
  console.log('🔍 Searching for database in React context...');
  
  // Method 1: Try to access through React DevTools
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('✅ React DevTools found, searching for database...');
    
    // Try to find React components that might have database access
    const reactRoot = document.querySelector('#root') || document.querySelector('[data-reactroot]');
    if (reactRoot) {
      console.log('✅ Found React root element');
      
      // Look for any global state or context
      const globalState = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.getCurrentFiber();
      if (globalState) {
        console.log('✅ Found React fiber, searching for database...');
      }
    }
  }
  
  // Method 2: Try to access through window properties that might be set by React
  const reactProps = Object.keys(window).filter(key => 
    key.includes('react') || key.includes('state') || key.includes('store')
  );
  
  console.log('React-related properties:', reactProps);
  
  // Method 3: Try to access through any global store
  if (window.store) {
    console.log('✅ Found window.store');
    return window.store;
  }
  
  // Method 4: Try to access through any global state
  if (window.state) {
    console.log('✅ Found window.state');
    return window.state;
  }
  
  throw new Error('Database not found in React context');
}

// Fungsi untuk mendapatkan database dengan fallback
async function getDatabase() {
  try {
    // Try direct access first
    if (window.db) {
      console.log('✅ Found window.db');
      return window.db;
    }
    
    if (window.InsightTicketDatabase) {
      console.log('✅ Found window.InsightTicketDatabase');
      return window.InsightTicketDatabase;
    }
    
    // Try React context
    return await getDatabaseFromReact();
    
  } catch (error) {
    console.log('❌ Could not find database:', error.message);
    
    // Fallback: Try to navigate to a page with database access
    console.log('\n💡 SUGGESTION: Navigate to Incident Analytics page to access database');
    console.log('Current URL:', window.location.href);
    console.log('Target URL:', window.location.origin + '/incident/analytics');
    
    // Ask user if they want to navigate
    const shouldNavigate = confirm('Database not found. Navigate to Incident Analytics page?');
    if (shouldNavigate) {
      window.location.href = '/incident/analytics';
    }
    
    throw error;
  }
}

// Fungsi untuk analyze pause data
async function analyzePauseData() {
  try {
    console.log('🔍 Starting pause data analysis...');
    
    const db = await getDatabase();
    console.log('✅ Database found, getting incidents...');
    
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
    });
    
    console.log('\n📊 PAUSE DATA ANALYSIS:');
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
    
    // Analyze the issue
    console.log('\n🔍 ISSUE ANALYSIS:');
    
    if (incidentsWithPause1 > 0 && incidentsWithEndPause1 === 0) {
      console.log('❌ PROBLEM: Found startPause1 data but NO endPause1 data!');
      console.log('💡 This suggests the "Restart" column (V) is not being read correctly.');
      console.log('💡 Possible causes:');
      console.log('   1. Column name mismatch in Excel');
      console.log('   2. Column V is actually empty in Excel');
      console.log('   3. Mapping function not finding the right column');
    }
    
    if (incidentsWithTotalPause > 0) {
      console.log('✅ Found totalDurationPauseMin data - this can be used as fallback');
    }
    
    // Check for Waneda incidents specifically
    const wanedaIncidents = allIncidents.filter(inc => 
      inc.ts && inc.ts.toLowerCase().includes('waneda')
    );
    
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
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error analyzing pause data:', error);
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('1. Navigate to Incident Analytics page: http://localhost:3000/incident/analytics');
    console.log('2. Wait for the page to fully load');
    console.log('3. Run the pause debug script again');
  }
}

// Jalankan analisis
analyzePauseData();
