// Generate bcrypt hash for password Kin6ArthUr
import bcrypt from 'bcrypt';

async function generateHash() {
  try {
    const password = 'Kin6ArthUr';
    const saltRounds = 12;
    
    console.log('🔐 Generating bcrypt hash for password:', password);
    
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('✅ Generated hash:', hash);
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log('✅ Hash verification:', isValid);
    
    // Test with wrong password
    const isInvalid = await bcrypt.compare('wrongpassword', hash);
    console.log('❌ Wrong password test:', isInvalid);
    
  } catch (error) {
    console.error('❌ Error generating hash:', error);
  }
}

generateHash();
