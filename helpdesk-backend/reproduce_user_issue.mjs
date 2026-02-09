
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Adjust port if needed
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

async function testUserCreation() {
    console.log('1. Logging in as admin...');
    const loginRes = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ADMIN_CREDENTIALS)
    });

    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful. Token obtained.');

    console.log('2. Creating new user "test_user_script"...');
    const newUser = {
        username: 'test_user_script_' + Date.now(),
        password: 'Password123!',
        role: 'user'
    };

    const createRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
    });

    if (!createRes.ok) {
        console.error('User creation failed:', await createRes.text());
        return;
    }

    const createData = await createRes.json();
    console.log('User creation response:', createData);

    console.log('3. Verifying user in list...');
    const listRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const listData = await listRes.json();
    const found = listData.users.find(u => u.username === newUser.username);

    if (found) {
        console.log('SUCCESS: User found in list!', found);
    } else {
        console.error('FAILURE: User NOT found in list despite success response.');
    }
}

testUserCreation().catch(console.error);
