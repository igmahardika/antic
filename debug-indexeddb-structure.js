// Script untuk memeriksa struktur IndexedDB dari browser console
// Jalankan script ini di browser console pada halaman http://localhost:3000

console.log('🔍 Checking IndexedDB structure...');

// Fungsi untuk memeriksa database
async function checkDatabase() {
  try {
    // Buka database
    const request = indexedDB.open('InsightTicketDatabase', 5);
    
    request.onerror = () => {
      console.error('❌ Error opening database:', request.error);
    };
    
    request.onsuccess = () => {
      const db = request.result;
      console.log('✅ Database opened successfully');
      console.log('📊 Database name:', db.name);
      console.log('🔢 Database version:', db.version);
      console.log('📋 Object stores:', Array.from(db.objectStoreNames));
      
      // Periksa setiap object store
      Array.from(db.objectStoreNames).forEach(storeName => {
        console.log(`\n--- Checking ${storeName} ---`);
        
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
          console.log(`📈 Total records in ${storeName}: ${countRequest.result}`);
          
          if (countRequest.result > 0) {
            // Ambil sample data
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              const data = getAllRequest.result;
              console.log(`📋 Sample data from ${storeName}:`, data.slice(0, 3));
              
              if (storeName === 'incidents') {
                console.log('\n🎯 NCAL Distribution:');
                const ncalCounts = {};
                data.forEach(inc => {
                  const ncal = inc.ncal || 'Unknown';
                  ncalCounts[ncal] = (ncalCounts[ncal] || 0) + 1;
                });
                Object.entries(ncalCounts).forEach(([ncal, count]) => {
                  console.log(`${ncal}: ${count}`);
                });
                
                console.log('\n📈 Status Distribution:');
                const statusCounts = {};
                data.forEach(inc => {
                  const status = inc.status || 'Unknown';
                  statusCounts[status] = (statusCounts[status] || 0) + 1;
                });
                Object.entries(statusCounts).forEach(([status, count]) => {
                  console.log(`${status}: ${count}`);
                });
              }
            };
          }
        };
      });
    };
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

// Jalankan pemeriksaan
checkDatabase();

console.log('💡 Copy and paste this script into browser console to check database structure');