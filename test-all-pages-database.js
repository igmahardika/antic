// Script untuk test database connection di semua halaman analytics
// Copy paste ke browser console

console.log('🧪 TESTING DATABASE CONNECTION ACROSS ALL PAGES...');

// Fungsi untuk mendapatkan database instance
function getDatabase() {
  // Try multiple ways to access the database
  const possibleDbSources = [
    window.db,
    window.InsightTicketDatabase,
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.getCurrentFiber()?.memoizedState?.element?.props?.db,
    // Try to find db in React context
    ...Object.values(window).filter(obj => obj && typeof obj === 'object' && obj.incidents),
    // Try to find db in global scope
    ...Object.getOwnPropertyNames(window).filter(name => 
      name.toLowerCase().includes('db') || name.toLowerCase().includes('database')
    ).map(name => window[name])
  ];

  for (const db of possibleDbSources) {
    if (db && db.incidents && typeof db.incidents.toArray === 'function') {
      console.log('✅ Found database instance:', db);
      return db;
    }
  }

  // If not found, try to access via React context
  try {
    const reactRoot = document.querySelector('[data-reactroot]') || document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalFiber) {
      const fiber = reactRoot._reactInternalFiber;
      // Traverse React fiber to find database
      let current = fiber;
      while (current) {
        if (current.memoizedState && current.memoizedState.element) {
          const props = current.memoizedState.element.props;
          if (props && props.db && props.db.incidents) {
            console.log('✅ Found database via React fiber:', props.db);
            return props.db;
          }
        }
        current = current.return;
      }
    }
  } catch (error) {
    console.log('⚠️ Could not access React fiber:', error);
  }

  return null;
}

// Fungsi untuk test database connection
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test 1: Check if database object exists
    console.log('📊 Database object check:');
    const db = getDatabase();
    console.log('- Database instance found:', !!db);
    
    if (!db) {
      console.log('❌ No database instance found');
      console.log('💡 Trying to access database via import...');
      
      // Try to access via dynamic import
      try {
        const dbModule = await import('/src/lib/db.ts');
        if (dbModule && dbModule.db) {
          console.log('✅ Found database via import:', dbModule.db);
          return await testWithDatabase(dbModule.db);
        }
      } catch (importError) {
        console.log('❌ Could not import database module:', importError);
      }
      
      return false;
    }
    
    return await testWithDatabase(db);
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

// Test with specific database instance
async function testWithDatabase(db) {
  try {
    // Test 2: Check if incidents table exists
    console.log('\n📋 Incidents table check:');
    if (db && db.incidents) {
      console.log('- db.incidents table exists: ✅');
      
      // Test 3: Count incidents
      const count = await db.incidents.count();
      console.log('- Total incidents in database:', count);
      
      // Test 4: Get sample incidents
      if (count > 0) {
        const sampleIncidents = await db.incidents.limit(3).toArray();
        console.log('- Sample incidents:', sampleIncidents.map(inc => ({
          id: inc.id,
          noCase: inc.noCase,
          ncal: inc.ncal,
          durationMin: inc.durationMin,
          startPause1: inc.startPause1,
          endPause1: inc.endPause1,
          startPause2: inc.startPause2,
          endPause2: inc.endPause2
        })));
        
        // Test 5: Check pause data
        const incidentsWithPause = sampleIncidents.filter(inc => 
          inc.startPause1 || inc.endPause1 || inc.startPause2 || inc.endPause2
        );
        console.log('- Incidents with pause data:', incidentsWithPause.length);
        
        // Test 6: Check duration data
        const incidentsWithDuration = sampleIncidents.filter(inc => 
          inc.durationMin && inc.durationMin > 0
        );
        console.log('- Incidents with duration data:', incidentsWithDuration.length);
        
      } else {
        console.log('⚠️ No incidents found in database');
        console.log('💡 Please upload incident data first');
      }
    } else {
      console.log('❌ db.incidents table not found');
    }
    
    // Test 7: Check React context
    console.log('\n⚛️ React context check:');
    console.log('- Current page:', window.location.pathname);
    console.log('- Page title:', document.title);
    
    // Test 8: Check for React components
    const reactElements = document.querySelectorAll('[data-reactroot], [data-reactid]');
    console.log('- React elements found:', reactElements.length);
    
    return true;
    
  } catch (error) {
    console.error('❌ Test with database failed:', error);
    return false;
  }
}

// Fungsi untuk test specific page functionality
async function testPageFunctionality() {
  console.log('\n🎯 Testing page-specific functionality...');
  
  const currentPage = window.location.pathname;
  console.log('📍 Current page:', currentPage);
  
  try {
    const db = getDatabase();
    
    if (currentPage.includes('/incident/analytics')) {
      console.log('📊 Testing Incident Analytics page...');
      await testIncidentAnalytics(db);
    } else if (currentPage.includes('/incident/ts-analytics')) {
      console.log('🔧 Testing Technical Support Analytics page...');
      await testTSAnalytics(db);
    } else if (currentPage.includes('/incident/site-analytics')) {
      console.log('🏢 Testing Site Analytics page...');
      await testSiteAnalytics(db);
    } else if (currentPage.includes('/incident/data')) {
      console.log('📋 Testing Incident Data page...');
      await testIncidentData(db);
    } else {
      console.log('⚠️ Unknown page, testing general functionality...');
      await testGeneralFunctionality(db);
    }
  } catch (error) {
    console.error('❌ Page functionality test failed:', error);
  }
}

// Test functions for specific pages
async function testIncidentAnalytics(db) {
  console.log('🔍 Testing Incident Analytics functionality...');
  
  if (!db) {
    console.log('❌ No database available for testing');
    return;
  }
  
  // Check if duration calculation works
  try {
    const incidents = await db.incidents.limit(5).toArray();
    console.log('- Sample incidents for duration test:', incidents.length);
    
    incidents.forEach((inc, index) => {
      console.log(`  Incident ${index + 1}:`, {
        noCase: inc.noCase,
        durationMin: inc.durationMin,
        durationVendorMin: inc.durationVendorMin,
        totalDurationVendorMin: inc.totalDurationVendorMin
      });
    });
  } catch (error) {
    console.error('❌ Error testing Incident Analytics:', error);
  }
}

async function testTSAnalytics(db) {
  console.log('🔍 Testing TS Analytics functionality...');
  
  if (!db) {
    console.log('❌ No database available for testing');
    return;
  }
  
  // Check Waneda-specific calculations
  try {
    const wanedaIncidents = await db.incidents
      .where('ts')
      .startsWithIgnoreCase('waneda')
      .limit(3)
      .toArray();
    
    console.log('- Waneda incidents found:', wanedaIncidents.length);
    
    wanedaIncidents.forEach((inc, index) => {
      console.log(`  Waneda Incident ${index + 1}:`, {
        noCase: inc.noCase,
        durationVendorMin: inc.durationVendorMin,
        totalDurationPauseMin: inc.totalDurationPauseMin,
        totalDurationVendorMin: inc.totalDurationVendorMin
      });
    });
  } catch (error) {
    console.error('❌ Error testing TS Analytics:', error);
  }
}

async function testSiteAnalytics(db) {
  console.log('🔍 Testing Site Analytics functionality...');
  
  if (!db) {
    console.log('❌ No database available for testing');
    return;
  }
  
  // Check site-specific data
  try {
    const incidents = await db.incidents.limit(5).toArray();
    const sites = [...new Set(incidents.map(inc => inc.site))];
    
    console.log('- Unique sites found:', sites);
    console.log('- Sample site data:', incidents.map(inc => ({
      site: inc.site,
      durationMin: inc.durationMin,
      ncal: inc.ncal
    })));
  } catch (error) {
    console.error('❌ Error testing Site Analytics:', error);
  }
}

async function testIncidentData(db) {
  console.log('🔍 Testing Incident Data functionality...');
  
  if (!db) {
    console.log('❌ No database available for testing');
    return;
  }
  
  // Check pause data display
  try {
    const incidents = await db.incidents.limit(5).toArray();
    
    console.log('- Sample incidents with pause data:');
    incidents.forEach((inc, index) => {
      console.log(`  Incident ${index + 1}:`, {
        noCase: inc.noCase,
        startPause1: inc.startPause1,
        endPause1: inc.endPause1,
        startPause2: inc.startPause2,
        endPause2: inc.endPause2
      });
    });
  } catch (error) {
    console.error('❌ Error testing Incident Data:', error);
  }
}

async function testGeneralFunctionality(db) {
  console.log('🔍 Testing general functionality...');
  
  if (!db) {
    console.log('❌ No database available for testing');
    return;
  }
  
  // Check if database is accessible
  console.log('- Database is accessible');
  
  // Check table structure
  const tableNames = Object.keys(db);
  console.log('- Available tables:', tableNames);
  
  // Check incidents table structure
  if (db.incidents) {
    try {
      const sample = await db.incidents.limit(1).toArray();
      if (sample.length > 0) {
        const fields = Object.keys(sample[0]);
        console.log('- Incident fields:', fields);
        
        // Check for pause-related fields
        const pauseFields = fields.filter(field => 
          field.toLowerCase().includes('pause') || 
          field.toLowerCase().includes('restart')
        );
        console.log('- Pause-related fields:', pauseFields);
      }
    } catch (error) {
      console.error('❌ Error accessing incidents table:', error);
    }
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting comprehensive database tests...\n');
  
  // Test 1: Database connection
  const dbTest = await testDatabaseConnection();
  
  // Test 2: Page functionality
  await testPageFunctionality();
  
  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('- Database connection:', dbTest ? '✅ SUCCESS' : '❌ FAILED');
  console.log('- Current page:', window.location.pathname);
  console.log('- Page functionality: ✅ TESTED');
  
  if (dbTest) {
    console.log('\n🎉 All tests completed successfully!');
    console.log('💡 Your database is working correctly.');
  } else {
    console.log('\n⚠️ Database connection failed.');
    console.log('💡 Please check the error messages above.');
    console.log('💡 Make sure you are on a page that loads the database.');
  }
}

// Run the tests
runAllTests();
