// Script sederhana untuk mengecek database
// Copy paste ke browser console di halaman Incident Analytics

console.log('🔍 SIMPLE DATABASE CHECK...');

// Cek apakah kita berada di halaman yang benar
console.log('📍 Current URL:', window.location.href);

// Cek apakah ada React component yang menggunakan database
console.log('🔍 Checking for React components...');

// Cek apakah ada Dexie di window
if (window.Dexie) {
  console.log('✅ Dexie found in window');
} else {
  console.log('❌ Dexie not found in window');
}

// Cek apakah ada database di window
if (window.db) {
  console.log('✅ Database found via window.db');
  console.log('📋 Database name:', window.db.name);
  console.log('📋 Database version:', window.db.version);
  
  // Cek apakah ada table incidents
  if (window.db.incidents) {
    console.log('✅ Incidents table found');
    
    // Coba hitung jumlah incidents
    window.db.incidents.count().then(count => {
      console.log(`📊 Total incidents: ${count}`);
      
      if (count > 0) {
        // Ambil sample data
        window.db.incidents.toArray().then(incidents => {
          console.log('📋 Sample incidents:', incidents.slice(0, 3));
          
          // Analisis sample data
          console.log('\n🔍 Sample data analysis:');
          incidents.slice(0, 3).forEach((inc, index) => {
            console.log(`\n📋 Incident ${index + 1}:`);
            console.log('  - ID:', inc.id);
            console.log('  - No Case:', inc.noCase);
            console.log('  - Start Time:', inc.startTime);
            console.log('  - End Time:', inc.endTime);
            console.log('  - Duration Min:', inc.durationMin);
            console.log('  - Duration Vendor Min:', inc.durationVendorMin);
            console.log('  - Total Duration Pause Min:', inc.totalDurationPauseMin);
            console.log('  - NCAL:', inc.ncal);
            console.log('  - Status:', inc.status);
          });
        });
      }
    });
  } else {
    console.log('❌ Incidents table not found');
  }
} else {
  console.log('❌ Database not found via window.db');
}

// Cek IndexedDB secara langsung
console.log('\n🔍 Checking IndexedDB directly...');

// List semua database yang ada
if (window.indexedDB && window.indexedDB.databases) {
  window.indexedDB.databases().then(databases => {
    console.log('📋 Available databases:', databases);
    
    // Cari database InsightTicketDatabase
    const insightDB = databases.find(db => db.name === 'InsightTicketDatabase');
    if (insightDB) {
      console.log('✅ InsightTicketDatabase found:', insightDB);
      
      // Coba buka database
      const request = window.indexedDB.open('InsightTicketDatabase');
      
      request.onerror = () => {
        console.log('❌ Failed to open InsightTicketDatabase');
      };
      
      request.onsuccess = () => {
        const db = request.result;
        console.log('✅ Successfully opened InsightTicketDatabase');
        console.log('📋 Database name:', db.name);
        console.log('📋 Database version:', db.version);
        
        // List object stores
        const objectStores = Array.from(db.objectStoreNames);
        console.log('📋 Object stores:', objectStores);
        
        if (objectStores.includes('incidents')) {
          console.log('✅ Incidents table found!');
          
          // Coba baca data
          const transaction = db.transaction(['incidents'], 'readonly');
          const store = transaction.objectStore('incidents');
          const countRequest = store.count();
          
          countRequest.onsuccess = () => {
            console.log(`📊 Total incidents: ${countRequest.result}`);
            
            if (countRequest.result > 0) {
              // Ambil sample data
              const getAllRequest = store.getAll();
              getAllRequest.onsuccess = () => {
                const incidents = getAllRequest.result;
                console.log('📋 Sample incidents:', incidents.slice(0, 3));
                
                // Analisis data
                console.log('\n🔍 Data analysis:');
                console.log('📊 Incidents with durationMin > 0:', incidents.filter(inc => inc.durationMin > 0).length);
                console.log('📊 Incidents with durationVendorMin > 0:', incidents.filter(inc => inc.durationVendorMin > 0).length);
                console.log('📊 Incidents with startTime:', incidents.filter(inc => inc.startTime).length);
                console.log('📊 Incidents with endTime:', incidents.filter(inc => inc.endTime).length);
                
                // Sample data fields
                if (incidents.length > 0) {
                  const sample = incidents[0];
                  console.log('\n📋 Sample incident fields:', Object.keys(sample));
                  console.log('📋 Sample incident data:', {
                    id: sample.id,
                    noCase: sample.noCase,
                    startTime: sample.startTime,
                    endTime: sample.endTime,
                    durationMin: sample.durationMin,
                    durationVendorMin: sample.durationVendorMin,
                    totalDurationPauseMin: sample.totalDurationPauseMin,
                    ncal: sample.ncal,
                    status: sample.status
                  });
                }
              };
            }
          };
        } else {
          console.log('❌ Incidents table not found');
        }
      };
    } else {
      console.log('❌ InsightTicketDatabase not found in available databases');
    }
  });
} else {
  console.log('❌ IndexedDB.databases() not available');
}

// Cek apakah ada React DevTools
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('✅ React DevTools detected');
} else {
  console.log('❌ React DevTools not detected');
}

console.log('\n🔍 Check completed!');
