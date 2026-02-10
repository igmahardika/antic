
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Adjust port if needed
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

async function listUsers() {
    console.log('Logging in as admin...');
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

    console.log('Fetching users...');
    const listRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!listRes.ok) {
        console.error('Failed to fetch users:', await listRes.text());
        return;
    }

    const listData = await listRes.json();
    console.log('\n--- Current Users ---');
    console.table(listData.users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        is_active: u.is_active
    })));
}

listUsers().catch(console.error);
