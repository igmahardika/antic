// Debug IndexedDB structure - jalankan di browser console
// Script untuk mencari nama database dan object store yang benar

console.log('🔍 Debugging IndexedDB Structure...');

// Function untuk list semua databases
async function listDatabases() {
  if ('databases' in indexedDB) {
    const databases = await indexedDB.databases();
    console.log('📊 Available Databases:', databases);
    return databases;
  } else {
    console.log('⚠️ indexedDB.databases() not supported, trying common names...');
    return null;
  }
}

// Function untuk explore database structure
function exploreDatabase(dbName, version = 1) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      console.log(`✅ Opened database: ${dbName}`);
      console.log(`📋 Object Store Names:`, Array.from(db.objectStoreNames));
      
      // Try to get data from each object store
      Array.from(db.objectStoreNames).forEach(storeName => {
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const objectStore = transaction.objectStore(storeName);
          const countRequest = objectStore.count();
          
          countRequest.onsuccess = function() {
            console.log(`📊 ${storeName}: ${countRequest.result} records`);
            
            // Get sample data
            const sampleRequest = objectStore.getAll();
            sampleRequest.onsuccess = function() {
              const data = sampleRequest.result;
              if (data && data.length > 0) {
                console.log(`🎫 Sample from ${storeName}:`, data.slice(0, 2));
              }
            };
          };
        } catch (error) {
          console.error(`❌ Error accessing ${storeName}:`, error);
        }
      });
      
      db.close();
      resolve(db.objectStoreNames);
    };
    
    request.onerror = function(event) {
      console.error(`❌ Failed to open ${dbName}:`, event.target.error);
      reject(event.target.error);
    };
    
    request.onupgradeneeded = function(event) {
      console.log(`🔄 Database ${dbName} needs upgrade or doesn't exist`);
    };
  });
}

// Main debug function
async function debugIndexedDB() {
  console.log('🚀 Starting IndexedDB debug...');
  
  // List all databases
  const databases = await listDatabases();
  
  // Common database names to try
  const commonNames = ['TicketDB', 'MyDatabase', 'AppDB', 'tickets', 'analytics'];
  
  if (databases) {
    // Try databases found by indexedDB.databases()
    for (const dbInfo of databases) {
      try {
        await exploreDatabase(dbInfo.name, dbInfo.version);
      } catch (error) {
        console.log(`⚠️ Couldn't explore ${dbInfo.name}`);
      }
    }
  } else {
    // Try common names
    for (const dbName of commonNames) {
      try {
        await exploreDatabase(dbName);
      } catch (error) {
        console.log(`⚠️ ${dbName} not found or accessible`);
      }
    }
  }
  
  console.log('✅ IndexedDB debug completed!');
}

// Run the debug
debugIndexedDB();

console.log('📝 Instructions:');
console.log('1. Wait for the debug to complete');
console.log('2. Look for the correct database name and object store names');
console.log('3. Use the correct names in the ticket analysis script');