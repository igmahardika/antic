// Debug script untuk troubleshooting upload Excel issue
// Jalankan di browser console setelah mencoba upload file Excel

console.log('🔍 HMS Upload Debug Script - Starting...');

// 1. Check IndexedDB structure
async function checkIndexedDB() {
  console.log('📊 Checking IndexedDB...');
  
  try {
    const request = indexedDB.open('InsightTicketDatabase');
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      console.log('✅ Database opened successfully');
      console.log('📋 Object Stores:', Array.from(db.objectStoreNames));
      
      // Check tickets table
      const transaction = db.transaction(['tickets'], 'readonly');
      const objectStore = transaction.objectStore('tickets');
      const countRequest = objectStore.count();
      
      countRequest.onsuccess = function(event) {
        const count = event.target.result;
        console.log(`📈 Total tickets in database: ${count}`);
        
        if (count > 0) {
          // Get sample data
          const getAllRequest = objectStore.getAll();
          getAllRequest.onsuccess = function(event) {
            const tickets = event.target.result;
            console.log('🎫 Sample tickets (first 5):', tickets.slice(0, 5));
            
            // Analyze data structure
            if (tickets.length > 0) {
              const sampleTicket = tickets[0];
              console.log('🔍 Sample ticket structure:', Object.keys(sampleTicket));
              console.log('📅 Sample openTime:', sampleTicket.openTime);
              console.log('🏷️ Sample status:', sampleTicket.status);
            }
          };
        } else {
          console.warn('⚠️ No tickets found in database - upload might have failed');
        }
      };
    };
    
    request.onerror = function(event) {
      console.error('❌ Failed to open IndexedDB:', event.target.error);
    };
    
  } catch (error) {
    console.error('❌ IndexedDB check failed:', error);
  }
}

// 2. Check localStorage for upload summary
function checkUploadSummary() {
  console.log('📋 Checking upload summary...');
  
  try {
    const summary = localStorage.getItem('uploadSummary');
    const errorLog = localStorage.getItem('uploadErrorLog');
    
    if (summary) {
      const parsedSummary = JSON.parse(summary);
      console.log('📊 Upload Summary:', parsedSummary);
    } else {
      console.warn('⚠️ No upload summary found');
    }
    
    if (errorLog) {
      const parsedErrors = JSON.parse(errorLog);
      console.log('❌ Error Log (first 10):', parsedErrors.slice(0, 10));
      
      // Analyze error patterns
      const errorTypes = {};
      parsedErrors.forEach(err => {
        const type = err.reason.split(':')[0] || err.reason;
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });
      console.log('📈 Error Types Distribution:', errorTypes);
    } else {
      console.log('✅ No error log found - good sign!');
    }
    
  } catch (error) {
    console.error('❌ Failed to parse localStorage data:', error);
  }
}

// 3. Test date parsing function
function testDateParsing() {
  console.log('📅 Testing date parsing...');
  
  // Sample date formats to test
  const testDates = [
    '01/01/2024 10:30:00',
    '1/1/2024 10:30:00',
    '2024-01-01 10:30:00',
    '01/01/2024',
    44927, // Excel numeric date
    '2024-01-01T10:30:00.000Z'
  ];
  
  testDates.forEach(date => {
    console.log(`Testing: ${date} (${typeof date})`);
    // This would call the parseExcelDate function if available
    // You can manually test these formats
  });
}

// 4. Check React context state
function checkReactState() {
  console.log('⚛️ Checking React context state...');
  
  // This will show current React component state in React DevTools
  console.log('💡 Open React DevTools and check:');
  console.log('   - TicketAnalyticsProvider state');
  console.log('   - AnalyticsProvider state');
  console.log('   - GridView component props');
}

// 5. Network check
function checkNetwork() {
  console.log('🌐 Checking network requests...');
  console.log('💡 Open Network tab in DevTools and look for:');
  console.log('   - Failed API requests');
  console.log('   - CORS errors');
  console.log('   - 404/500 errors');
}

// Run all checks
async function runAllChecks() {
  console.log('🚀 Running all diagnostic checks...');
  console.log('=====================================');
  
  await checkIndexedDB();
  checkUploadSummary();
  testDateParsing();
  checkReactState();
  checkNetwork();
  
  console.log('=====================================');
  console.log('✅ Diagnostic complete!');
  console.log('💡 Check the logs above for issues');
}

// Auto-run checks
setTimeout(() => {
  runAllChecks();
}, 1000);

// Export functions for manual use
window.debugHMS = {
  checkIndexedDB,
  checkUploadSummary,
  testDateParsing,
  checkReactState,
  checkNetwork,
  runAllChecks
};

console.log('🔧 Debug functions available at window.debugHMS');
console.log('📝 Usage: window.debugHMS.runAllChecks()');