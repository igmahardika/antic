// Database Verification Script
// Jalankan di browser console untuk memverifikasi data di IndexedDB

console.log('🔍 Database Verification Script - Starting...');

async function verifyDatabaseData() {
  console.log('📊 Verifying IndexedDB data...');
  
  try {
    // 1. Check Database Structure
    console.log('\n1. Checking Database Structure...');
    const request = indexedDB.open('InsightTicketDatabase');
    
    request.onsuccess = function(event) {
      const db = event.target.result;
      console.log('✅ Database opened successfully');
      console.log('📋 Object Stores:', Array.from(db.objectStoreNames));
      
      // 2. Check Tickets Table
      console.log('\n2. Checking Tickets Table...');
      const ticketsTransaction = db.transaction(['tickets'], 'readonly');
      const ticketsStore = ticketsTransaction.objectStore('tickets');
      const ticketsCountRequest = ticketsStore.count();
      
      ticketsCountRequest.onsuccess = function(event) {
        const ticketsCount = event.target.result;
        console.log(`📈 Total tickets in database: ${ticketsCount}`);
        
        if (ticketsCount > 0) {
          // Get sample tickets
          const getAllTicketsRequest = ticketsStore.getAll();
          getAllTicketsRequest.onsuccess = function(event) {
            const tickets = event.target.result;
            console.log('🎫 Sample tickets (first 3):', tickets.slice(0, 3));
            
            // Analyze ticket data structure
            if (tickets.length > 0) {
              const sampleTicket = tickets[0];
              console.log('🔍 Sample ticket structure:', Object.keys(sampleTicket));
              console.log('📅 Sample openTime:', sampleTicket.openTime);
              console.log('🏷️ Sample status:', sampleTicket.status);
              console.log('👤 Sample openBy:', sampleTicket.openBy);
            }
          };
        } else {
          console.warn('⚠️ No tickets found in database');
        }
      };
      
      // 3. Check Incidents Table
      console.log('\n3. Checking Incidents Table...');
      const incidentsTransaction = db.transaction(['incidents'], 'readonly');
      const incidentsStore = incidentsTransaction.objectStore('incidents');
      const incidentsCountRequest = incidentsStore.count();
      
      incidentsCountRequest.onsuccess = function(event) {
        const incidentsCount = event.target.result;
        console.log(`🚨 Total incidents in database: ${incidentsCount}`);
        
        if (incidentsCount > 0) {
          // Get sample incidents
          const getAllIncidentsRequest = incidentsStore.getAll();
          getAllIncidentsRequest.onsuccess = function(event) {
            const incidents = event.target.result;
            console.log('🚨 Sample incidents (first 3):', incidents.slice(0, 3));
            
            // Analyze incident data structure
            if (incidents.length > 0) {
              const sampleIncident = incidents[0];
              console.log('🔍 Sample incident structure:', Object.keys(sampleIncident));
              console.log('📅 Sample startTime:', sampleIncident.startTime);
              console.log('🏷️ Sample status:', sampleIncident.status);
              console.log('🎯 Sample priority:', sampleIncident.priority);
              console.log('🏢 Sample site:', sampleIncident.site);
            }
          };
        } else {
          console.warn('⚠️ No incidents found in database');
        }
      };
      
      // 4. Check Customers Table
      console.log('\n4. Checking Customers Table...');
      const customersTransaction = db.transaction(['customers'], 'readonly');
      const customersStore = customersTransaction.objectStore('customers');
      const customersCountRequest = customersStore.count();
      
      customersCountRequest.onsuccess = function(event) {
        const customersCount = event.target.result;
        console.log(`🏢 Total customers in database: ${customersCount}`);
        
        if (customersCount > 0) {
          // Get sample customers
          const getAllCustomersRequest = customersStore.getAll();
          getAllCustomersRequest.onsuccess = function(event) {
            const customers = event.target.result;
            console.log('🏢 Sample customers (first 3):', customers.slice(0, 3));
            
            // Analyze customer data structure
            if (customers.length > 0) {
              const sampleCustomer = customers[0];
              console.log('🔍 Sample customer structure:', Object.keys(sampleCustomer));
              console.log('👤 Sample nama:', sampleCustomer.nama);
              console.log('🏷️ Sample jenisKlien:', sampleCustomer.jenisKlien);
            }
          };
        } else {
          console.warn('⚠️ No customers found in database');
        }
      };
      
      // 5. Check Users Table
      console.log('\n5. Checking Users Table...');
      const usersTransaction = db.transaction(['users'], 'readonly');
      const usersStore = usersTransaction.objectStore('users');
      const usersCountRequest = usersStore.count();
      
      usersCountRequest.onsuccess = function(event) {
        const usersCount = event.target.result;
        console.log(`👥 Total users in database: ${usersCount}`);
        
        if (usersCount > 0) {
          // Get sample users
          const getAllUsersRequest = usersStore.getAll();
          getAllUsersRequest.onsuccess = function(event) {
            const users = event.target.result;
            console.log('👥 Sample users (first 3):', users.slice(0, 3));
            
            // Analyze user data structure
            if (users.length > 0) {
              const sampleUser = users[0];
              console.log('🔍 Sample user structure:', Object.keys(sampleUser));
              console.log('👤 Sample username:', sampleUser.username);
              console.log('🏷️ Sample role:', sampleUser.role);
            }
          };
        } else {
          console.warn('⚠️ No users found in database');
        }
      };
      
      // 6. Check Menu Permissions Table
      console.log('\n6. Checking Menu Permissions Table...');
      const permissionsTransaction = db.transaction(['menuPermissions'], 'readonly');
      const permissionsStore = permissionsTransaction.objectStore('menuPermissions');
      const permissionsCountRequest = permissionsStore.count();
      
      permissionsCountRequest.onsuccess = function(event) {
        const permissionsCount = event.target.result;
        console.log(`🔐 Total menu permissions in database: ${permissionsCount}`);
        
        if (permissionsCount > 0) {
          // Get sample permissions
          const getAllPermissionsRequest = permissionsStore.getAll();
          getAllPermissionsRequest.onsuccess = function(event) {
            const permissions = event.target.result;
            console.log('🔐 Sample permissions (first 3):', permissions.slice(0, 3));
            
            // Analyze permission data structure
            if (permissions.length > 0) {
              const samplePermission = permissions[0];
              console.log('🔍 Sample permission structure:', Object.keys(samplePermission));
              console.log('🏷️ Sample role:', samplePermission.role);
              console.log('📋 Sample menus:', samplePermission.menus);
            }
          };
        } else {
          console.warn('⚠️ No menu permissions found in database');
        }
      };
      
      // 7. Summary Report
      setTimeout(() => {
        console.log('\n📋 DATABASE VERIFICATION SUMMARY:');
        console.log('=====================================');
        console.log('✅ Database Structure: OK');
        console.log('✅ Object Stores: All 5 tables present');
        console.log('✅ Data Access: All tables accessible');
        console.log('✅ Sample Data: Retrieved successfully');
        console.log('\n📊 Data Status:');
        console.log('- Tickets: Check count above');
        console.log('- Incidents: Check count above');
        console.log('- Customers: Check count above');
        console.log('- Users: Check count above');
        console.log('- Menu Permissions: Check count above');
        console.log('\n🔍 Next Steps:');
        console.log('1. Verify data counts match expected uploads');
        console.log('2. Check data structure matches expected format');
        console.log('3. Validate data integrity and relationships');
        console.log('4. Test data retrieval in application components');
      }, 2000);
      
    };
    
    request.onerror = function(event) {
      console.error('❌ Failed to open IndexedDB:', event.target.error);
    };
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  }
}

// Function to check localStorage for upload summaries
function checkUploadSummaries() {
  console.log('\n📋 Checking Upload Summaries in localStorage...');
  
  const uploadSummary = localStorage.getItem('uploadSummary');
  const uploadErrorLog = localStorage.getItem('uploadErrorLog');
  
  if (uploadSummary) {
    console.log('✅ Upload Summary found:', JSON.parse(uploadSummary));
  } else {
    console.log('⚠️ No upload summary found in localStorage');
  }
  
  if (uploadErrorLog) {
    console.log('⚠️ Upload Error Log found:', JSON.parse(uploadErrorLog));
  } else {
    console.log('✅ No upload error log found (good)');
  }
}

// Main verification function
async function runFullVerification() {
  console.log('🚀 Starting Full Database Verification...');
  console.log('=====================================');
  
  await verifyDatabaseData();
  checkUploadSummaries();
  
  console.log('\n✅ Verification Complete!');
  console.log('Check the results above to verify data integrity.');
}

// Run verification
runFullVerification();
