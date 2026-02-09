import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

console.log("🚀 Starting API Verification...");

// 1. Setup Database Connection & User
const pool = mysql.createPool({
    host: 'localhost',
    user: 'hmrnexa',
    password: '7ynkgnqiiF6phLSRNHli',
    database: 'helpdesk'
});

try {
    // const hash = await bcrypt.hash('verify123', 10);
    // await pool.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password)', 
    //    ['verifier', hash, 'super admin']);
    console.log("✅ User Setup (skipped)");
} catch (e) {
    console.error("❌ DB Setup Failed:", e);
} finally {
    // await pool.end(); // Keep pool open strictly? No, can close.
    // Pool creates connections.
    await pool.end();
}

// 2. Login
console.log("🔑 Logging in to https://api.hms.nexa.net.id/login ...");
let token = '';
try {
    const loginRes = await fetch('https://api.hms.nexa.net.id/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: 'verifier', password: 'verify123'})
    });
    
    if (loginRes.status !== 200) {
        throw new Error('Login HTTP ' + loginRes.status + ': ' + await loginRes.text());
    }

    const loginData = await loginRes.json();
    token = loginData.token;
    console.log("✅ Login Success!");
} catch (e) {
    console.error("❌ Login Failed:", e.message);
    process.exit(1);
}

// 3. Upload Sync Test
console.log("📤 Testing Sync Upload (POST /api/tickets/bulk)...");
try {
    // Matches ITicket interface
    const nowISO = new Date().toISOString();
    const nowMySQL = nowISO.slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS

    const ticket = {
        id: 'TEST-SYNC-'+Date.now(),
        customerId: 'VERIFY-001', 
        name: 'Verification Ticket',
        category: 'Test',
        description: 'Auto-verified by system script',
        cause: 'Testing',
        handling: 'Testing',
        openTime: nowMySQL, // FIXED DATE FORMAT
        duration: { rawHours: 1, formatted: '1h' },
        handlingDuration: { rawHours: 0, formatted: '0h' },
        handlingDuration1: { rawHours: 0, formatted: '0h' },
        handlingDuration2: { rawHours: 0, formatted: '0h' },
        handlingDuration3: { rawHours: 0, formatted: '0h' },
        handlingDuration4: { rawHours: 0, formatted: '0h' },
        handlingDuration5: { rawHours: 0, formatted: '0h' },
        status: 'Open',
        uploadTimestamp: Date.now()
    };

    const upRes = await fetch('https://api.hms.nexa.net.id/api/tickets/bulk', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', 
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ tickets: [ticket] }) 
    });

    const text = await upRes.text();
    console.log('Response Status:', upRes.status);
    console.log('Response Body:', text.substring(0, 200));

    if (upRes.status === 200) {
        const json = JSON.parse(text);
        if (json.success) {
            console.log("✅ SYNC UPLOAD SUCCESSFULL!");
        } else {
            console.error("❌ Sync API returned false success");
        }
    } else {
        console.error("❌ Sync Request Failed");
    }

} catch (e) {
    console.error("❌ Sync Test Failed:", e);
}
