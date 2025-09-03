// Generate bcrypt hash for password Kin6ArthUr
const bcrypt = require('bcrypt');

async function generateHash() {
  try {
    const password = 'Kin6ArthUr';
    const saltRounds = 12;
    
    console.log('🔐 Generating bcrypt hash for password:', password);
    console.log('🔐 Salt rounds:', saltRounds);
    
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('✅ Generated hash:', hash);
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log('✅ Hash verification:', isValid);
    
    // Test with wrong password
    const isInvalid = await bcrypt.compare('wrongpassword', hash);
    console.log('❌ Wrong password test:', isInvalid);
    
    console.log('\n📝 SQL command to update admin password:');
    console.log(`UPDATE users SET password = '${hash}', updated_at = CURRENT_TIMESTAMP WHERE username = 'admin';`);
    
  } catch (error) {
    console.error('❌ Error generating hash:', error);
  }
}

generateHash();
