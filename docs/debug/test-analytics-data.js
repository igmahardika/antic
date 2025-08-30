// Script test untuk memverifikasi data analytics
// Jalankan: node test-analytics-data.js

import Dexie from 'dexie';

class TestDB extends Dexie {
  incidents;
  
  constructor() {
    super('InsightTicketDatabase');
    this.version(5).stores({
      incidents: 'id, startTime, status, priority, site, klasifikasiGangguan, level, ncal, noCase'
    });
  }
}

async function testAnalyticsData() {
  const db = new TestDB();
  
  try {
    console.log('🔍 Testing Analytics Data Access...\n');
    
    const count = await db.incidents.count();
    console.log(`📊 Total incidents in database: ${count}`);
    
    if (count === 0) {
      console.log('❌ No incidents found in database');
      console.log('💡 Please upload incident data first via Incident Data page');
      return;
    }
    
    const sampleIncidents = await db.incidents.limit(10).toArray();
    console.log('\n📋 Sample incidents data:');
    sampleIncidents.forEach((incident, index) => {
      console.log(`\n--- Incident ${index + 1} ---`);
      console.log('ID:', incident.id);
      console.log('No Case:', incident.noCase);
      console.log('Site:', incident.site);
      console.log('NCAL:', incident.ncal);
      console.log('Status:', incident.status);
      console.log('Priority:', incident.priority);
      console.log('Level:', incident.level);
      console.log('Start Time:', incident.startTime);
      console.log('Duration (min):', incident.durationMin);
      console.log('Duration Vendor (min):', incident.durationVendorMin);
      console.log('Total Duration Pause (min):', incident.totalDurationPauseMin);
      console.log('Total Duration Vendor (min):', incident.totalDurationVendorMin);
      console.log('TS:', incident.ts);
      console.log('Klasifikasi:', incident.klasifikasiGangguan);
    });
    
    // Test NCAL distribution
    console.log('\n🎯 NCAL Distribution Analysis:');
    const ncalCounts = {};
    const allIncidents = await db.incidents.toArray();
    allIncidents.forEach(inc => {
      const ncal = inc.ncal || 'Unknown';
      ncalCounts[ncal] = (ncalCounts[ncal] || 0) + 1;
    });
    
    Object.entries(ncalCounts).forEach(([ncal, count]) => {
      console.log(`${ncal}: ${count} incidents`);
    });
    
    // Test Site distribution
    console.log('\n📍 Site Distribution Analysis:');
    const siteCounts = {};
    allIncidents.forEach(inc => {
      const site = inc.site || 'Unknown Site';
      siteCounts[site] = (siteCounts[site] || 0) + 1;
    });
    
    const topSites = Object.entries(siteCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    topSites.forEach(([site, count]) => {
      console.log(`${site}: ${count} incidents`);
    });
    
    // Test Status distribution
    console.log('\n📈 Status Distribution Analysis:');
    const statusCounts = {};
    allIncidents.forEach(inc => {
      const status = inc.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count} incidents`);
    });
    
    // Test TS distribution
    console.log('\n🔧 TS Distribution Analysis:');
    const tsCounts = {};
    allIncidents.forEach(inc => {
      const ts = inc.ts || 'Unknown';
      tsCounts[ts] = (tsCounts[ts] || 0) + 1;
    });
    
    Object.entries(tsCounts).forEach(([ts, count]) => {
      console.log(`${ts}: ${count} incidents`);
    });
    
    // Test Duration data
    console.log('\n⏱️ Duration Data Analysis:');
    const incidentsWithDuration = allIncidents.filter(inc => inc.durationMin && inc.durationMin > 0);
    const incidentsWithVendorDuration = allIncidents.filter(inc => inc.durationVendorMin && inc.durationVendorMin > 0);
    const incidentsWithPauseDuration = allIncidents.filter(inc => inc.totalDurationPauseMin && inc.totalDurationPauseMin > 0);
    const incidentsWithVendorTotalDuration = allIncidents.filter(inc => inc.totalDurationVendorMin && inc.totalDurationVendorMin > 0);
    
    console.log(`Incidents with Duration: ${incidentsWithDuration.length}/${allIncidents.length}`);
    console.log(`Incidents with Vendor Duration: ${incidentsWithVendorDuration.length}/${allIncidents.length}`);
    console.log(`Incidents with Pause Duration: ${incidentsWithPauseDuration.length}/${allIncidents.length}`);
    console.log(`Incidents with Vendor Total Duration: ${incidentsWithVendorTotalDuration.length}/${allIncidents.length}`);
    
    if (incidentsWithDuration.length > 0) {
      const avgDuration = incidentsWithDuration.reduce((sum, inc) => sum + inc.durationMin, 0) / incidentsWithDuration.length;
      console.log(`Average Duration: ${Math.round(avgDuration)} minutes`);
    }
    
    // Test Date filtering
    console.log('\n📅 Date Filtering Analysis:');
    const incidentsWithStartTime = allIncidents.filter(inc => inc.startTime);
    console.log(`Incidents with Start Time: ${incidentsWithStartTime.length}/${allIncidents.length}`);
    
    if (incidentsWithStartTime.length > 0) {
      const dates = incidentsWithStartTime.map(inc => new Date(inc.startTime));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      console.log(`Date Range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
      
      // Test period filtering
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      const threeMonthIncidents = incidentsWithStartTime.filter(inc => new Date(inc.startTime) >= threeMonthsAgo);
      const sixMonthIncidents = incidentsWithStartTime.filter(inc => new Date(inc.startTime) >= sixMonthsAgo);
      const oneYearIncidents = incidentsWithStartTime.filter(inc => new Date(inc.startTime) >= oneYearAgo);
      
      console.log(`Last 3 months: ${threeMonthIncidents.length} incidents`);
      console.log(`Last 6 months: ${sixMonthIncidents.length} incidents`);
      console.log(`Last 1 year: ${oneYearIncidents.length} incidents`);
    }
    
    // Analytics readiness check
    console.log('\n✅ Analytics Readiness Check:');
    const checks = [
      { name: 'Total Incidents', value: count, required: 1, status: count >= 1 },
      { name: 'NCAL Data', value: Object.keys(ncalCounts).length, required: 1, status: Object.keys(ncalCounts).length >= 1 },
      { name: 'Site Data', value: Object.keys(siteCounts).length, required: 1, status: Object.keys(siteCounts).length >= 1 },
      { name: 'Status Data', value: Object.keys(statusCounts).length, required: 1, status: Object.keys(statusCounts).length >= 1 },
      { name: 'Duration Data', value: incidentsWithDuration.length, required: 1, status: incidentsWithDuration.length >= 1 },
      { name: 'Date Data', value: incidentsWithStartTime.length, required: 1, status: incidentsWithStartTime.length >= 1 }
    ];
    
    checks.forEach(check => {
      const status = check.status ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${check.value}/${check.required}`);
    });
    
    const allChecksPassed = checks.every(check => check.status);
    console.log(`\n${allChecksPassed ? '🎉 All checks passed! Analytics pages should work correctly.' : '⚠️ Some checks failed. Please review the data.'}`);
    
  } catch (error) {
    console.error('❌ Error testing analytics data:', error);
  } finally {
    await db.close();
  }
}

testAnalyticsData();
