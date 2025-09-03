// Test login with new admin credentials
import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('🧪 Testing login with new admin credentials...');
    
    const response = await fetch('https://api.hms.nexa.net.id/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'Kin6ArthUr'
      })
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log(`📄 Response Body:`, data);
    
    if (response.ok) {
      console.log('✅ Login successful!');
    } else {
      console.log('❌ Login failed!');
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  }
}

testLogin();
