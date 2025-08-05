#!/usr/bin/env node

/**
 * Setup Default User Script for AN-TIC Analytics Dashboard
 * 
 * This script creates the default admin user in IndexedDB
 * Run this in browser console if login fails
 */

console.log('🔐 AN-TIC Analytics Dashboard - Default User Setup');
console.log('================================================');

// Browser Console Script
const browserScript = `
// AN-TIC Default User Setup Script
console.log('🚀 Setting up default admin user...');

async function setupDefaultUser() {
  try {
    // Import database module
    const dbModule = await import('./src/lib/db.js');
    const { db } = dbModule;
    
    // Hash password function (same as in Login.tsx)
    async function hashPassword(password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    
    // Check if admin user already exists
    const existingAdmin = await db.users.where('username').equals('admin').first();
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      console.log('Username: admin');
      console.log('Password: k0s0ng-w43');
      return;
    }
    
    // Create default admin user
    const hashedPassword = await hashPassword('k0s0ng-w43');
    await db.users.add({
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    });
    
    console.log('✅ Default admin user created successfully!');
    console.log('');
    console.log('📋 Login Credentials:');
    console.log('Username: admin');
    console.log('Password: k0s0ng-w43');
    console.log('');
    console.log('🔄 Please refresh the page and try logging in');
    
  } catch (error) {
    console.error('❌ Error setting up default user:', error);
    console.log('');
    console.log('🔧 Alternative method:');
    console.log('1. Try refreshing the page');
    console.log('2. Clear browser cache and try again');
    console.log('3. Reset IndexedDB with: indexedDB.deleteDatabase("InsightTicketDatabase")');
  }
}

// Run setup
setupDefaultUser();
`;

console.log('');
console.log('📋 Instructions:');
console.log('1. Open your browser and go to: http://localhost:5173');
console.log('2. Open Browser DevTools (F12)');
console.log('3. Go to Console tab');
console.log('4. Copy and paste the following script:');
console.log('');
console.log('=' .repeat(60));
console.log(browserScript);
console.log('=' .repeat(60));
console.log('');
console.log('5. Press Enter to run the script');
console.log('6. Refresh the page and login with:');
console.log('   Username: admin');
console.log('   Password: k0s0ng-w43');
console.log('');
console.log('🎉 You should now be able to access the dashboard!');

// Additional utility functions
const utilityFunctions = `
// Additional utility functions for user management

// Function to list all users
async function listUsers() {
  const { db } = await import('./src/lib/db.js');
  const users = await db.users.toArray();
  console.log('👥 All users in database:', users);
  return users;
}

// Function to create new user
async function createUser(username, password, role = 'user') {
  const { db } = await import('./src/lib/db.js');
  
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  try {
    const hashedPassword = await hashPassword(password);
    await db.users.add({
      username: username,
      password: hashedPassword,
      role: role
    });
    console.log(\`✅ User \${username} created with role \${role}\`);
  } catch (error) {
    console.error('❌ Error creating user:', error);
  }
}

// Function to delete user
async function deleteUser(username) {
  const { db } = await import('./src/lib/db.js');
  try {
    await db.users.where('username').equals(username).delete();
    console.log(\`✅ User \${username} deleted\`);
  } catch (error) {
    console.error('❌ Error deleting user:', error);
  }
}

// Function to reset database
async function resetDatabase() {
  if (confirm('Are you sure you want to reset the entire database? This will delete all users and data.')) {
    indexedDB.deleteDatabase('InsightTicketDatabase');
    console.log('✅ Database reset. Please refresh the page.');
    location.reload();
  }
}

// Examples:
// listUsers();
// createUser('user1', 'password123', 'user');
// deleteUser('user1');
// resetDatabase();
`;

console.log('');
console.log('🛠️  Additional Utility Functions:');
console.log('Copy these functions to browser console for user management:');
console.log('');
console.log(utilityFunctions);