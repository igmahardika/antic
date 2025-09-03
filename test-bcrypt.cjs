// Test bcrypt password verification
const bcrypt = require('bcrypt');

async function testBcrypt() {
  try {
    const password = 'admin123';
    const hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    
    console.log('🔐 Testing bcrypt verification...');
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    const isValid = await bcrypt.compare(password, hash);
    console.log('✅ Verification result:', isValid);
    
    // Test with wrong password
    const isInvalid = await bcrypt.compare('wrongpassword', hash);
    console.log('❌ Wrong password test:', isInvalid);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBcrypt();
