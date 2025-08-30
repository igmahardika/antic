// Script untuk verifikasi bahwa semua halaman analytics bisa mengakses database
// Copy paste ke browser console

console.log('🔍 VERIFYING ANALYTICS PAGES DATABASE ACCESS...');

// Fungsi untuk mendapatkan database instance
async function getDatabase() {
  try {
    // Try to access via dynamic import (this worked in the previous test)
    const dbModule = await import('/src/lib/db.ts');
    if (dbModule && dbModule.db) {
      console.log('✅ Found database via import');
      return dbModule.db;
    }
  } catch (error) {
    console.log('❌ Could not import database module:', error);
  }
  
  return null;
}

// Test database access for current page
async function testCurrentPageDatabase() {
  const currentPage = window.location.pathname;
  console.log(`\n📍 Current page: ${currentPage}`);
  
  try {
    const db = await getDatabase();
    
    if (!db) {
      console.log('❌ No database available');
      return false;
    }
    
    // Test basic database functionality
    console.log('📊 Testing database functionality...');
    
    const count = await db.incidents.count();
    console.log(`📋 Total incidents: ${count}`);
    
    if (count === 0) {
      console.log('⚠️ No incidents found in database');
      console.log('💡 Please upload incident data first');
      return true; // Database works, just no data
    }
    
    // Get sample incidents for testing
    const sampleIncidents = await db.incidents.limit(5).toArray();
    console.log(`📋 Sample incidents: ${sampleIncidents.length}`);
    
    // Test page-specific functionality
    if (currentPage.includes('/incident/analytics')) {
      return await testIncidentAnalytics(db, sampleIncidents);
    } else if (currentPage.includes('/incident/ts-analytics')) {
      return await testTSAnalytics(db, sampleIncidents);
    } else if (currentPage.includes('/incident/site-analytics')) {
      return await testSiteAnalytics(db, sampleIncidents);
    } else if (currentPage.includes('/incident/data')) {
      return await testIncidentData(db, sampleIncidents);
    } else {
      return await testGeneralPage(db, sampleIncidents);
    }
    
  } catch (error) {
    console.error('❌ Error testing current page database:', error);
    return false;
  }
}

// Test Incident Analytics page
async function testIncidentAnalytics(db, incidents) {
  console.log('📊 Testing Incident Analytics functionality...');
  
  try {
    // Test duration calculations
    const withDuration = incidents.filter(inc => inc.durationMin && inc.durationMin > 0);
    console.log(`⏱️  Incidents with duration: ${withDuration.length}/${incidents.length}`);
    
    // Test NCAL data
    const ncalCounts = {};
    incidents.forEach(inc => {
      const ncal = inc.ncal || 'Unknown';
      ncalCounts[ncal] = (ncalCounts[ncal] || 0) + 1;
    });
    console.log('🎨 NCAL distribution:', ncalCounts);
    
    // Test priority data
    const priorityCounts = {};
    incidents.forEach(inc => {
      const priority = inc.priority || 'Unknown';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });
    console.log('⚡ Priority distribution:', priorityCounts);
    
    // Show sample data
    withDuration.slice(0, 3).forEach((inc, index) => {
      console.log(`  Sample ${index + 1}: ${inc.noCase}`, {
        ncal: inc.ncal,
        priority: inc.priority,
        durationMin: inc.durationMin,
        site: inc.site
      });
    });
    
    console.log('✅ Incident Analytics database access: SUCCESS');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing Incident Analytics:', error);
    return false;
  }
}

// Test TS Analytics page
async function testTSAnalytics(db, incidents) {
  console.log('🔧 Testing Technical Support Analytics functionality...');
  
  try {
    // Test vendor data
    const vendorCounts = {};
    incidents.forEach(inc => {
      const vendor = inc.ts || 'Unknown';
      vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    });
    console.log('👥 Vendor distribution:', vendorCounts);
    
    // Test Waneda-specific data
    const wanedaIncidents = incidents.filter(inc => 
      inc.ts && inc.ts.toLowerCase().includes('waneda')
    );
    console.log(`🔧 Waneda incidents: ${wanedaIncidents.length}`);
    
    // Test duration fields for Waneda formula
    const wanedaWithDuration = wanedaIncidents.filter(inc => 
      inc.durationVendorMin || inc.totalDurationPauseMin || inc.totalDurationVendorMin
    );
    console.log(`⏱️  Waneda with duration fields: ${wanedaWithDuration.length}`);
    
    // Show sample Waneda data
    wanedaWithDuration.slice(0, 3).forEach((inc, index) => {
      console.log(`  Waneda ${index + 1}: ${inc.noCase}`, {
        durationVendorMin: inc.durationVendorMin,
        totalDurationPauseMin: inc.totalDurationPauseMin,
        totalDurationVendorMin: inc.totalDurationVendorMin
      });
    });
    
    // Test pause data
    const withPause = incidents.filter(inc => 
      inc.startPause1 || inc.endPause1 || inc.startPause2 || inc.endPause2
    );
    console.log(`⏸️  Incidents with pause data: ${withPause.length}/${incidents.length}`);
    
    console.log('✅ TS Analytics database access: SUCCESS');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing TS Analytics:', error);
    return false;
  }
}

// Test Site Analytics page
async function testSiteAnalytics(db, incidents) {
  console.log('🏢 Testing Site Analytics functionality...');
  
  try {
    // Test site data
    const sites = [...new Set(incidents.map(inc => inc.site))];
    console.log(`🏢 Unique sites: ${sites.length}`, sites);
    
    // Test site-specific duration
    const siteDuration = {};
    incidents.forEach(inc => {
      if (inc.site && inc.durationMin) {
        if (!siteDuration[inc.site]) {
          siteDuration[inc.site] = { total: 0, count: 0 };
        }
        siteDuration[inc.site].total += inc.durationMin;
        siteDuration[inc.site].count += 1;
      }
    });
    
    console.log('⏱️  Site duration averages:');
    Object.entries(siteDuration).forEach(([site, data]) => {
      const avg = data.count > 0 ? (data.total / data.count).toFixed(2) : 0;
      console.log(`  ${site}: ${avg} minutes (${data.count} incidents)`);
    });
    
    // Test NCAL by site
    const ncalBySite = {};
    incidents.forEach(inc => {
      if (inc.site && inc.ncal) {
        if (!ncalBySite[inc.site]) {
          ncalBySite[inc.site] = {};
        }
        ncalBySite[inc.site][inc.ncal] = (ncalBySite[inc.site][inc.ncal] || 0) + 1;
      }
    });
    
    console.log('🎨 NCAL by site:');
    Object.entries(ncalBySite).forEach(([site, ncalData]) => {
      console.log(`  ${site}:`, ncalData);
    });
    
    console.log('✅ Site Analytics database access: SUCCESS');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing Site Analytics:', error);
    return false;
  }
}

// Test Incident Data page
async function testIncidentData(db, incidents) {
  console.log('📋 Testing Incident Data functionality...');
  
  try {
    // Test all incident fields
    const fields = Object.keys(incidents[0] || {});
    console.log(`📝 Incident fields: ${fields.length}`, fields);
    
    // Test pause-related fields
    const pauseFields = fields.filter(field => 
      field.toLowerCase().includes('pause') || 
      field.toLowerCase().includes('restart')
    );
    console.log(`⏸️  Pause-related fields: ${pauseFields.length}`, pauseFields);
    
    // Test pause data
    const withPause = incidents.filter(inc => 
      inc.startPause1 || inc.endPause1 || inc.startPause2 || inc.endPause2
    );
    console.log(`⏸️  Incidents with pause data: ${withPause.length}/${incidents.length}`);
    
    // Show sample pause data
    withPause.slice(0, 3).forEach((inc, index) => {
      console.log(`  Pause ${index + 1}: ${inc.noCase}`, {
        startPause1: inc.startPause1,
        endPause1: inc.endPause1,
        startPause2: inc.startPause2,
        endPause2: inc.endPause2
      });
    });
    
    // Test duration data
    const withDuration = incidents.filter(inc => inc.durationMin && inc.durationMin > 0);
    console.log(`⏱️  Incidents with duration: ${withDuration.length}/${incidents.length}`);
    
    // Test status data
    const statusCounts = {};
    incidents.forEach(inc => {
      const status = inc.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    console.log('📊 Status distribution:', statusCounts);
    
    console.log('✅ Incident Data database access: SUCCESS');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing Incident Data:', error);
    return false;
  }
}

// Test general page
async function testGeneralPage(db, incidents) {
  console.log('🔍 Testing general page functionality...');
  
  try {
    // Test basic incident data
    console.log(`📋 Total incidents: ${incidents.length}`);
    
    // Test common fields
    const commonFields = ['noCase', 'site', 'ncal', 'priority', 'status', 'durationMin'];
    const availableFields = commonFields.filter(field => incidents.some(inc => inc[field]));
    console.log(`📝 Available common fields: ${availableFields.length}/${commonFields.length}`, availableFields);
    
    // Show sample data
    incidents.slice(0, 3).forEach((inc, index) => {
      console.log(`  Sample ${index + 1}: ${inc.noCase}`, {
        site: inc.site,
        ncal: inc.ncal,
        priority: inc.priority,
        status: inc.status,
        durationMin: inc.durationMin
      });
    });
    
    console.log('✅ General page database access: SUCCESS');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing general page:', error);
    return false;
  }
}

// Main verification function
async function verifyAnalyticsPages() {
  console.log('🚀 Starting analytics pages verification...\n');
  
  try {
    // Test current page
    const success = await testCurrentPageDatabase();
    
    // Summary
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('- Current page:', window.location.pathname);
    console.log('- Database access:', success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (success) {
      console.log('\n🎉 Analytics page verification successful!');
      console.log('💡 This page can access the database correctly.');
      console.log('💡 All analytics calculations should work properly.');
      
      // Additional recommendations
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('1. Navigate to other analytics pages to verify they work too');
      console.log('2. Check if pause data is populated (if not, upload new data)');
      console.log('3. Verify duration calculations are accurate');
      console.log('4. Test Waneda formula in TS Analytics');
      
    } else {
      console.log('\n⚠️ Analytics page verification failed.');
      console.log('💡 Please check the error messages above.');
      console.log('💡 Try refreshing the page or navigating to Incident Data first.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run verification
verifyAnalyticsPages();
