// Test reCAPTCHA Configuration
import fs from 'fs';
import path from 'path';

console.log('🔍 Testing reCAPTCHA Configuration...\n');

// Check frontend build
const frontendPath = '/home/nexa-hms/htdocs/hms.nexa.net.id';
const indexPath = path.join(frontendPath, 'index.html');

if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');
  
  console.log('✅ Frontend build exists');
  
  // Check for reCAPTCHA references
  if (content.includes('6LdKl5srAAAA')) {
    console.log('✅ reCAPTCHA site key found in build');
  } else {
    console.log('❌ reCAPTCHA site key NOT found in build');
  }
  
  if (content.includes('recaptcha') || content.includes('ReCAPTCHA')) {
    console.log('✅ reCAPTCHA component references found');
  } else {
    console.log('❌ reCAPTCHA component references NOT found');
  }
} else {
  console.log('❌ Frontend build not found');
}

// Check backend environment
const backendEnvPath = '/home/nexa-api-hms/htdocs/api.hms.nexa.net.id/.env';

if (fs.existsSync(backendEnvPath)) {
  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  
  console.log('✅ Backend environment file exists');
  
  if (envContent.includes('6LdKl5srAAAAAHo29TmwM-RvU7BChBs0M4hLJYwm')) {
    console.log('✅ reCAPTCHA secret key configured in backend');
  } else {
    console.log('❌ reCAPTCHA secret key NOT found in backend');
  }
} else {
  console.log('❌ Backend environment file not found');
}

console.log('\n🎯 reCAPTCHA Test Summary:');
console.log('Site Key: 6LdKl5srAAAAADEfB7jR18ACypr-lNbKI6cscDY0');
console.log('Secret Key: 6LdKl5srAAAAAHo29TmwM-RvU7BChBs0M4hLJYwm');
console.log('Status: Should be active on login page');
