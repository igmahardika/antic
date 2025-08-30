// Script sederhana untuk menguji akses database
// Copy paste ke browser console

console.log('🔍 TESTING DATABASE ACCESS...');

// Test 1: Check if we're in the right context
console.log('📍 Current page:', window.location.href);
console.log('📍 Page title:', document.title);

// Test 2: Check for common database instances
console.log('\n🔍 CHECKING DATABASE INSTANCES...');

const dbInstances = [
  'window.db',
  'window.InsightTicketDatabase',
  'window.Dexie',
  'window.indexedDB'
];

dbInstances.forEach(instanceName => {
  try {
    const instance = eval(instanceName);
    if (instance) {
      console.log(`✅ ${instanceName}:`, instance);
      if (instance.incidents) {
        console.log(`   - Has incidents table: ${typeof instance.incidents.toArray === 'function'}`);
      }
    } else {
      console.log(`❌ ${instanceName}: Not found`);
    }
  } catch (error) {
    console.log(`❌ ${instanceName}: Error - ${error.message}`);
  }
});

// Test 3: Check for React/React DevTools
console.log('\n🔍 CHECKING REACT CONTEXT...');
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('✅ React DevTools detected');
} else {
  console.log('❌ React DevTools not found');
}

// Test 4: Check for any global variables that might contain database
console.log('\n🔍 SEARCHING FOR DATABASE VARIABLES...');
const allKeys = Object.keys(window);
const potentialDbKeys = allKeys.filter(key => 
  key.toLowerCase().includes('db') || 
  key.toLowerCase().includes('dexie') || 
  key.toLowerCase().includes('database') ||
  key.toLowerCase().includes('store')
);

console.log('Potential database keys:', potentialDbKeys);

// Test 5: Try to find any object with incidents property
console.log('\n🔍 SEARCHING FOR INCIDENTS TABLE...');
let foundIncidents = false;

for (const key of allKeys) {
  try {
    const obj = window[key];
    if (obj && typeof obj === 'object' && obj.incidents) {
      console.log(`✅ Found object with incidents: ${key}`);
      console.log('   - incidents type:', typeof obj.incidents);
      if (typeof obj.incidents.toArray === 'function') {
        console.log('   - Has toArray method: ✅');
        foundIncidents = true;
      }
    }
  } catch (error) {
    // Ignore errors
  }
}

if (!foundIncidents) {
  console.log('❌ No incidents table found');
}

// Test 6: Check if we're in a React component context
console.log('\n🔍 CHECKING REACT COMPONENT CONTEXT...');
const reactElements = document.querySelectorAll('[data-reactroot], [data-reactid]');
console.log(`React elements found: ${reactElements.length}`);

// Test 7: Look for any data attributes that might indicate the page
try {
  const dataAttributes = document.querySelectorAll('[data-*]');
  const relevantDataAttrs = Array.from(dataAttributes).filter(el => 
    el.getAttributeNames().some(attr => 
      attr.includes('page') || attr.includes('route') || attr.includes('component')
    )
  );
  console.log(`Elements with relevant data attributes: ${relevantDataAttrs.length}`);
} catch (error) {
  console.log('Could not check data attributes:', error.message);
}

// Test 8: Check current route/page
console.log('\n🔍 CHECKING CURRENT ROUTE...');
const currentPath = window.location.pathname;
console.log('Current path:', currentPath);

if (currentPath.includes('/incident/analytics')) {
  console.log('✅ You are on Incident Analytics page - database should be available');
} else if (currentPath.includes('/incident/data')) {
  console.log('✅ You are on Incident Data page - database should be available');
} else if (currentPath.includes('/incident/ts-analytics')) {
  console.log('⚠️ You are on Technical Support Analytics page - database might not be directly accessible');
  console.log('💡 Try navigating to Incident Analytics or Incident Data page');
} else if (currentPath.includes('/incident/site-analytics')) {
  console.log('⚠️ You are on Site Analytics page - database might not be directly accessible');
  console.log('💡 Try navigating to Incident Analytics or Incident Data page');
} else {
  console.log('❓ Unknown page - database access uncertain');
}

console.log('\n🎯 SUMMARY:');
console.log('If you see "✅ Found object with incidents" above, the database is available.');
console.log('If not, try:');
console.log('1. Navigate to Incident Analytics or Incident Data page');
console.log('2. Wait for the page to fully load');
console.log('3. Run this script again');
console.log('\n💡 RECOMMENDED NEXT STEPS:');
console.log('1. Go to: http://localhost:3000/incident/analytics');
console.log('2. Wait for the page to load completely');
console.log('3. Run the pause debug script again');
