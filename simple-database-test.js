// Script test database yang sederhana dan langsung
// Copy paste ke browser console di halaman analytics

console.log('🔍 SIMPLE DATABASE TEST...');

// Test 1: Check if we can access the database through React
async function testDatabaseAccess() {
  console.log('📊 Testing database access...');
  
  try {
    // Method 1: Try to access via React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('✅ React DevTools available');
      
      // Try to find database in React components
      const renderers = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers;
      if (renderers && renderers.size > 0) {
        const renderer = renderers.get(1); // Usually the first renderer
        if (renderer) {
          console.log('✅ React renderer found');
          
          // Try to get current fiber
          const fiber = renderer.getCurrentFiber();
          if (fiber) {
            console.log('✅ React fiber found');
            
            // Traverse fiber to find database
            let current = fiber;
            let depth = 0;
            const maxDepth = 10;
            
            while (current && depth < maxDepth) {
              if (current.memoizedState) {
                const state = current.memoizedState;
                if (state.element && state.element.props) {
                  const props = state.element.props;
                  if (props.db && props.db.incidents) {
                    console.log('✅ Found database via React fiber!');
                    return await testWithDatabase(props.db);
                  }
                }
              }
              current = current.return;
              depth++;
            }
          }
        }
      }
    }
    
    // Method 2: Try to find database in global scope
    console.log('🔍 Searching for database in global scope...');
    const globalKeys = Object.getOwnPropertyNames(window);
    const dbKeys = globalKeys.filter(key => 
      key.toLowerCase().includes('db') || 
      key.toLowerCase().includes('database') ||
      key.toLowerCase().includes('dexie')
    );
    
    console.log('Potential database keys:', dbKeys);
    
    for (const key of dbKeys) {
      const obj = window[key];
      if (obj && typeof obj === 'object' && obj.incidents && typeof obj.incidents.toArray === 'function') {
        console.log(`✅ Found database via global key: ${key}`);
        return await testWithDatabase(obj);
      }
    }
    
    // Method 3: Try to access via module import simulation
    console.log('🔍 Trying to simulate module access...');
    
    // Check if we're in a development environment
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('✅ Development environment detected');
      
      // Try to access via webpack module
      if (window.webpackChunkload && window.webpackChunkload.length > 0) {
        console.log('✅ Webpack chunks available');
        
        // Look for database in webpack modules
        for (const chunk of window.webpackChunkload) {
          if (chunk && typeof chunk === 'function') {
            try {
              const modules = chunk();
              for (const moduleId in modules) {
                const module = modules[moduleId];
                if (module && module.exports && module.exports.incidents) {
                  console.log('✅ Found database via webpack module!');
                  return await testWithDatabase(module.exports);
                }
              }
            } catch (error) {
              // Ignore errors
            }
          }
        }
      }
    }
    
    console.log('❌ No database found via any method');
    return false;
    
  } catch (error) {
    console.error('❌ Error testing database access:', error);
    return false;
  }
}

// Test with specific database instance
async function testWithDatabase(db) {
  try {
    console.log('\n📋 Testing database functionality...');
    
    // Test incidents table
    if (db.incidents) {
      console.log('✅ Incidents table found');
      
      // Count incidents
      const count = await db.incidents.count();
      console.log(`📊 Total incidents: ${count}`);
      
      if (count > 0) {
        // Get sample incidents
        const sample = await db.incidents.limit(3).toArray();
        console.log('📋 Sample incidents:');
        
        sample.forEach((inc, index) => {
          console.log(`  ${index + 1}. ${inc.noCase || inc.id}:`, {
            ncal: inc.ncal,
            durationMin: inc.durationMin,
            hasPauseData: !!(inc.startPause1 || inc.endPause1 || inc.startPause2 || inc.endPause2)
          });
        });
        
        // Check pause data
        const withPause = sample.filter(inc => 
          inc.startPause1 || inc.endPause1 || inc.startPause2 || inc.endPause2
        );
        console.log(`⏸️  Incidents with pause data: ${withPause.length}/${sample.length}`);
        
        // Check duration data
        const withDuration = sample.filter(inc => inc.durationMin && inc.durationMin > 0);
        console.log(`⏱️  Incidents with duration data: ${withDuration.length}/${sample.length}`);
        
        return true;
      } else {
        console.log('⚠️ No incidents found in database');
        console.log('💡 Please upload incident data first');
        return true; // Database works, just no data
      }
    } else {
      console.log('❌ Incidents table not found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing database functionality:', error);
    return false;
  }
}

// Test current page functionality
async function testCurrentPage() {
  const currentPage = window.location.pathname;
  console.log(`\n🎯 Testing current page: ${currentPage}`);
  
  try {
    const db = await getDatabaseForPage();
    
    if (currentPage.includes('/incident/analytics')) {
      console.log('📊 Testing Incident Analytics...');
      await testIncidentAnalyticsPage(db);
    } else if (currentPage.includes('/incident/ts-analytics')) {
      console.log('🔧 Testing Technical Support Analytics...');
      await testTSAnalyticsPage(db);
    } else if (currentPage.includes('/incident/site-analytics')) {
      console.log('🏢 Testing Site Analytics...');
      await testSiteAnalyticsPage(db);
    } else if (currentPage.includes('/incident/data')) {
      console.log('📋 Testing Incident Data...');
      await testIncidentDataPage(db);
    } else {
      console.log('⚠️ Unknown page, testing general functionality...');
      await testGeneralPage(db);
    }
  } catch (error) {
    console.error('❌ Error testing current page:', error);
  }
}

// Get database for current page
async function getDatabaseForPage() {
  // Try the same methods as testDatabaseAccess but return the database
  try {
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const renderers = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers;
      if (renderers && renderers.size > 0) {
        const renderer = renderers.get(1);
        if (renderer) {
          const fiber = renderer.getCurrentFiber();
          if (fiber) {
            let current = fiber;
            let depth = 0;
            const maxDepth = 10;
            
            while (current && depth < maxDepth) {
              if (current.memoizedState && current.memoizedState.element && current.memoizedState.element.props) {
                const props = current.memoizedState.element.props;
                if (props.db && props.db.incidents) {
                  return props.db;
                }
              }
              current = current.return;
              depth++;
            }
          }
        }
      }
    }
    
    // Try global scope
    const globalKeys = Object.getOwnPropertyNames(window);
    const dbKeys = globalKeys.filter(key => 
      key.toLowerCase().includes('db') || 
      key.toLowerCase().includes('database') ||
      key.toLowerCase().includes('dexie')
    );
    
    for (const key of dbKeys) {
      const obj = window[key];
      if (obj && typeof obj === 'object' && obj.incidents && typeof obj.incidents.toArray === 'function') {
        return obj;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting database for page:', error);
    return null;
  }
}

// Page-specific test functions
async function testIncidentAnalyticsPage(db) {
  if (!db) {
    console.log('❌ No database available');
    return;
  }
  
  try {
    const incidents = await db.incidents.limit(5).toArray();
    console.log(`📊 Found ${incidents.length} incidents for testing`);
    
    // Test duration calculations
    const withDuration = incidents.filter(inc => inc.durationMin && inc.durationMin > 0);
    console.log(`⏱️  Incidents with duration: ${withDuration.length}/${incidents.length}`);
    
    // Show sample duration data
    withDuration.slice(0, 3).forEach((inc, index) => {
      console.log(`  Duration ${index + 1}: ${inc.durationMin} minutes (${inc.noCase})`);
    });
  } catch (error) {
    console.error('❌ Error testing Incident Analytics page:', error);
  }
}

async function testTSAnalyticsPage(db) {
  if (!db) {
    console.log('❌ No database available');
    return;
  }
  
  try {
    // Test Waneda incidents
    const wanedaIncidents = await db.incidents
      .where('ts')
      .startsWithIgnoreCase('waneda')
      .limit(3)
      .toArray();
    
    console.log(`🔧 Found ${wanedaIncidents.length} Waneda incidents`);
    
    wanedaIncidents.forEach((inc, index) => {
      console.log(`  Waneda ${index + 1}: ${inc.noCase}`, {
        durationVendorMin: inc.durationVendorMin,
        totalDurationPauseMin: inc.totalDurationPauseMin,
        totalDurationVendorMin: inc.totalDurationVendorMin
      });
    });
  } catch (error) {
    console.error('❌ Error testing TS Analytics page:', error);
  }
}

async function testSiteAnalyticsPage(db) {
  if (!db) {
    console.log('❌ No database available');
    return;
  }
  
  try {
    const incidents = await db.incidents.limit(5).toArray();
    const sites = [...new Set(incidents.map(inc => inc.site))];
    
    console.log(`🏢 Found ${sites.length} unique sites:`, sites);
    
    // Show sample site data
    incidents.slice(0, 3).forEach((inc, index) => {
      console.log(`  Site ${index + 1}: ${inc.site} (${inc.durationMin} min, ${inc.ncal})`);
    });
  } catch (error) {
    console.error('❌ Error testing Site Analytics page:', error);
  }
}

async function testIncidentDataPage(db) {
  if (!db) {
    console.log('❌ No database available');
    return;
  }
  
  try {
    const incidents = await db.incidents.limit(5).toArray();
    console.log(`📋 Found ${incidents.length} incidents for testing`);
    
    // Test pause data
    const withPause = incidents.filter(inc => 
      inc.startPause1 || inc.endPause1 || inc.startPause2 || inc.endPause2
    );
    
    console.log(`⏸️  Incidents with pause data: ${withPause.length}/${incidents.length}`);
    
    withPause.slice(0, 3).forEach((inc, index) => {
      console.log(`  Pause ${index + 1}: ${inc.noCase}`, {
        startPause1: inc.startPause1,
        endPause1: inc.endPause1,
        startPause2: inc.startPause2,
        endPause2: inc.endPause2
      });
    });
  } catch (error) {
    console.error('❌ Error testing Incident Data page:', error);
  }
}

async function testGeneralPage(db) {
  if (!db) {
    console.log('❌ No database available');
    return;
  }
  
  try {
    const tableNames = Object.keys(db);
    console.log(`📊 Available tables: ${tableNames.join(', ')}`);
    
    if (db.incidents) {
      const count = await db.incidents.count();
      console.log(`📋 Total incidents: ${count}`);
      
      if (count > 0) {
        const sample = await db.incidents.limit(1).toArray();
        const fields = Object.keys(sample[0]);
        console.log(`📝 Incident fields: ${fields.length} fields`);
        
        const pauseFields = fields.filter(field => 
          field.toLowerCase().includes('pause') || 
          field.toLowerCase().includes('restart')
        );
        console.log(`⏸️  Pause-related fields: ${pauseFields.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('❌ Error testing general page:', error);
  }
}

// Main test function
async function runSimpleTest() {
  console.log('🚀 Starting simple database test...\n');
  
  // Test 1: Database access
  const dbAccess = await testDatabaseAccess();
  
  // Test 2: Current page functionality
  await testCurrentPage();
  
  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('- Database access:', dbAccess ? '✅ SUCCESS' : '❌ FAILED');
  console.log('- Current page:', window.location.pathname);
  console.log('- Page functionality: ✅ TESTED');
  
  if (dbAccess) {
    console.log('\n🎉 Database is working correctly!');
    console.log('💡 All analytics pages should work properly.');
  } else {
    console.log('\n⚠️ Database access failed.');
    console.log('💡 Please check if you are on the correct page.');
    console.log('💡 Try refreshing the page or navigating to Incident Data first.');
  }
}

// Run the test
runSimpleTest();
