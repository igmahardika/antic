// Script untuk menambahkan logging yang lebih detail saat upload
// Copy paste ke browser console sebelum upload file Excel

console.log('🔍 ENHANCING UPLOAD LOGGING FOR PAUSE COLUMNS...');

// Override the getValue function to add detailed logging
const originalGetValue = window.getValue || (() => {});

window.getValue = function(columnName) {
  const value = originalGetValue(columnName);
  
  // Log all column access for pause-related columns
  if (columnName.toLowerCase().includes('pause') || 
      columnName.toLowerCase().includes('restart') ||
      columnName === 'Pause' || 
      columnName === 'Restart' ||
      columnName === 'Pause2' || 
      columnName === 'Restart2') {
    console.log(`🔍 Column "${columnName}": "${value}" (${typeof value})`);
  }
  
  return value;
};

// Override the parseRowToIncident function to add more logging
const originalParseRowToIncident = window.parseRowToIncident || (() => {});

window.parseRowToIncident = function(row, headers, rowNum, sheetName, uploadLog) {
  console.log(`\n🔍 PARSING ROW ${rowNum}:`);
  console.log('Headers:', headers);
  console.log('Row data:', row);
  
  // Log all headers that might be pause-related
  const pauseRelatedHeaders = headers.filter(header => 
    header && (
      header.toLowerCase().includes('pause') || 
      header.toLowerCase().includes('restart') ||
      header.toLowerCase().includes('delay') ||
      header.toLowerCase().includes('wait')
    )
  );
  
  if (pauseRelatedHeaders.length > 0) {
    console.log('🔍 Found pause-related headers:', pauseRelatedHeaders);
    pauseRelatedHeaders.forEach(header => {
      const index = headers.indexOf(header);
      const value = row[index];
      console.log(`   ${header}: "${value}" (${typeof value})`);
    });
  } else {
    console.log('❌ No pause-related headers found!');
  }
  
  // Call original function
  return originalParseRowToIncident(row, headers, rowNum, sheetName, uploadLog);
};

console.log('✅ Enhanced logging enabled!');
console.log('📋 Now upload your Excel file and check the console for detailed pause column information.');
