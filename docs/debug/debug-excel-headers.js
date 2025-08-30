// Script untuk debug header Excel dan kolom pause
// Copy paste ke browser console di halaman Incident Data

console.log('🔍 DEBUGGING EXCEL HEADERS AND PAUSE COLUMNS...');

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

// Fungsi untuk debug Excel headers
async function debugExcelHeaders() {
  try {
    console.log('🔍 Starting Excel headers debug...');
    
    const db = await getDatabase();
    const allIncidents = await db.incidents.toArray();
    
    console.log(`📊 Total incidents: ${allIncidents.length}`);
    
    if (allIncidents.length === 0) {
      console.log('❌ No incidents found');
      return;
    }
    
    // Get sample incident to analyze structure
    const sampleIncident = allIncidents[0];
    console.log('\n📋 SAMPLE INCIDENT STRUCTURE:');
    console.log('Sample incident:', sampleIncident);
    
    // Analyze all field names
    const allFields = Object.keys(sampleIncident);
    console.log('\n📋 ALL FIELD NAMES:');
    allFields.forEach((field, index) => {
      console.log(`${index + 1}. ${field}: ${sampleIncident[field]}`);
    });
    
    // Look for pause-related fields
    const pauseRelatedFields = allFields.filter(field => 
      field.toLowerCase().includes('pause') || 
      field.toLowerCase().includes('restart') ||
      field.toLowerCase().includes('delay') ||
      field.toLowerCase().includes('wait')
    );
    
    console.log('\n🔍 PAUSE-RELATED FIELDS:');
    if (pauseRelatedFields.length > 0) {
      pauseRelatedFields.forEach(field => {
        console.log(`- ${field}: ${sampleIncident[field]}`);
      });
    } else {
      console.log('❌ No pause-related fields found!');
    }
    
    // Check specific pause fields
    const specificPauseFields = [
      'startPause1', 'endPause1', 'startPause2', 'endPause2',
      'totalDurationPauseMin', 'totalDurationVendorMin'
    ];
    
    console.log('\n🔍 SPECIFIC PAUSE FIELDS:');
    specificPauseFields.forEach(field => {
      const value = sampleIncident[field];
      console.log(`- ${field}: ${value} (${typeof value})`);
    });
    
    // Analyze pause data across all incidents
    console.log('\n📊 PAUSE DATA ANALYSIS:');
    
    let incidentsWithStartPause1 = 0;
    let incidentsWithEndPause1 = 0;
    let incidentsWithStartPause2 = 0;
    let incidentsWithEndPause2 = 0;
    let incidentsWithTotalPause = 0;
    let incidentsWithTotalVendor = 0;
    
    allIncidents.forEach(incident => {
      if (incident.startPause1 && incident.startPause1 !== null) incidentsWithStartPause1++;
      if (incident.endPause1 && incident.endPause1 !== null) incidentsWithEndPause1++;
      if (incident.startPause2 && incident.startPause2 !== null) incidentsWithStartPause2++;
      if (incident.endPause2 && incident.endPause2 !== null) incidentsWithEndPause2++;
      if (incident.totalDurationPauseMin && incident.totalDurationPauseMin > 0) incidentsWithTotalPause++;
      if (incident.totalDurationVendorMin && incident.totalDurationVendorMin > 0) incidentsWithTotalVendor++;
    });
    
    console.log(`Incidents with startPause1: ${incidentsWithStartPause1}/${allIncidents.length}`);
    console.log(`Incidents with endPause1: ${incidentsWithEndPause1}/${allIncidents.length}`);
    console.log(`Incidents with startPause2: ${incidentsWithStartPause2}/${allIncidents.length}`);
    console.log(`Incidents with endPause2: ${incidentsWithEndPause2}/${allIncidents.length}`);
    console.log(`Incidents with totalDurationPauseMin: ${incidentsWithTotalPause}/${allIncidents.length}`);
    console.log(`Incidents with totalDurationVendorMin: ${incidentsWithTotalVendor}/${allIncidents.length}`);
    
    // Look for any fields that might contain pause data
    console.log('\n🔍 SEARCHING FOR ALTERNATIVE PAUSE FIELDS:');
    
    const alternativePauseFields = allFields.filter(field => {
      const value = sampleIncident[field];
      if (typeof value === 'string' && value.includes(':')) {
        // Check if it looks like a time format
        return /^\d{1,2}:\d{2}:\d{2}$/.test(value) || 
               /^\d{1,2}:\d{2}$/.test(value) ||
               /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value);
      }
      return false;
    });
    
    if (alternativePauseFields.length > 0) {
      console.log('Potential time-related fields:');
      alternativePauseFields.forEach(field => {
        console.log(`- ${field}: ${sampleIncident[field]}`);
      });
    } else {
      console.log('No time-related fields found');
    }
    
    // Check for any fields with non-null values that might be pause data
    console.log('\n🔍 FIELDS WITH NON-NULL VALUES:');
    const nonNullFields = allFields.filter(field => {
      const value = sampleIncident[field];
      return value !== null && value !== undefined && value !== '' && value !== '-';
    });
    
    nonNullFields.forEach(field => {
      console.log(`- ${field}: ${sampleIncident[field]} (${typeof sampleIncident[field]})`);
    });
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (incidentsWithStartPause1 === 0) {
      console.log('❌ CRITICAL: No startPause1 data found!');
      console.log('   - This suggests the "Pause" column (U) is not being mapped correctly');
      console.log('   - Possible causes:');
      console.log('     1. Column name in Excel is different from "Pause"');
      console.log('     2. Column U is actually empty in Excel');
      console.log('     3. Column mapping function is not finding the right column');
      console.log('   - Next steps:');
      console.log('     1. Check the actual column name in Excel file');
      console.log('     2. Verify that column U contains pause data');
      console.log('     3. Update column mapping if needed');
    }
    
    if (incidentsWithTotalPause > 0) {
      console.log('✅ Found totalDurationPauseMin data - this can be used as fallback');
    }
    
    console.log('\n✅ DEBUG COMPLETE');
    console.log('📋 Next steps:');
    console.log('1. Check the actual Excel file column names');
    console.log('2. Verify that columns U, V, W, X contain pause data');
    console.log('3. Update column mapping if column names are different');
    
  } catch (error) {
    console.error('❌ Error debugging Excel headers:', error);
  }
}

// Jalankan debug
debugExcelHeaders();
