#!/usr/bin/env node

/**
 * Test Delete Functionality Script
 * Tests if deleted users can still login
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const DB_CONFIG = {
  host: 'localhost',
  user: 'hmrnexa',
  password: '7ynkgnqiiF6phLSRNHli',
  database: 'helpdesk'
};

async function testDeleteFunctionality() {
  console.log('🧪 Testing Delete User Functionality');
  console.log('=====================================');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // Step 1: Create a test user
    console.log('\n1. Creating test user...');
    const testUsername = `testuser_${Date.now()}`;
    const testPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    const [insertResult] = await connection.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [testUsername, hashedPassword, 'user']
    );
    
    const testUserId = insertResult.insertId;
    console.log(`✅ Test user created: ${testUsername} (ID: ${testUserId})`);

    // Step 2: Verify user can login (simulate bcrypt compare)
    console.log('\n2. Verifying user credentials...');
    const [userRows] = await connection.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [testUsername]
    );
    
    if (userRows.length > 0) {
      const user = userRows[0];
      const passwordMatch = await bcrypt.compare(testPassword, user.password);
      console.log(`✅ User exists and password matches: ${passwordMatch}`);
    } else {
      console.log('❌ User not found in database');
      return;
    }

    // Step 3: Delete the user
    console.log('\n3. Deleting test user...');
    const [deleteResult] = await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [testUserId]
    );
    
    console.log(`✅ Delete query executed. Affected rows: ${deleteResult.affectedRows}`);

    // Step 4: Verify user is deleted
    console.log('\n4. Verifying user deletion...');
    const [checkRows] = await connection.execute(
      'SELECT * FROM users WHERE id = ?',
      [testUserId]
    );
    
    if (checkRows.length === 0) {
      console.log('✅ User successfully deleted from database');
    } else {
      console.log('❌ User still exists in database!');
      console.log('User data:', checkRows[0]);
    }

    // Step 5: Try to "login" deleted user (simulate login check)
    console.log('\n5. Testing login with deleted user...');
    const [loginCheckRows] = await connection.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [testUsername]
    );
    
    if (loginCheckRows.length === 0) {
      console.log('✅ Deleted user cannot login - login query returns no results');
    } else {
      console.log('❌ SECURITY ISSUE: Deleted user still found in login query!');
      console.log('User data:', loginCheckRows[0]);
    }

    // Step 6: Test with all users list
    console.log('\n6. Checking users list...');
    const [allUsers] = await connection.execute(
      'SELECT id, username, role, is_active FROM users ORDER BY id'
    );
    
    const deletedUserInList = allUsers.find(u => u.id === testUserId);
    if (!deletedUserInList) {
      console.log('✅ Deleted user not found in users list');
    } else {
      console.log('❌ SECURITY ISSUE: Deleted user still in users list!');
      console.log('User data:', deletedUserInList);
    }

    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`Test User: ${testUsername}`);
    console.log(`User ID: ${testUserId}`);
    console.log(`Delete Affected Rows: ${deleteResult.affectedRows}`);
    console.log(`User Exists After Delete: ${checkRows.length > 0 ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);
    console.log(`Can Login After Delete: ${loginCheckRows.length > 0 ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);
    console.log(`In Users List After Delete: ${deletedUserInList ? 'YES (❌ FAIL)' : 'NO (✅ PASS)'}`);

    if (deleteResult.affectedRows > 0 && checkRows.length === 0 && loginCheckRows.length === 0) {
      console.log('\n🎉 DELETE FUNCTIONALITY TEST: ✅ PASSED');
      console.log('   - User successfully deleted from database');
      console.log('   - Deleted user cannot login');
      console.log('   - Deleted user not in users list');
    } else {
      console.log('\n🚨 DELETE FUNCTIONALITY TEST: ❌ FAILED');
      console.log('   - There are issues with the delete functionality');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    await connection.end();
  }
}

// Run the test
testDeleteFunctionality().catch(console.error);