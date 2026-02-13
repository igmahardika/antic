import mysql from 'mysql2/promise';

const dbConfig = {
    host: 'localhost',
    user: 'hmrnexa',
    password: '7ynkgnqiiF6phLSRNHli',
    database: 'helpdesk',
};

async function run() {
    console.log('Connecting to DB...', dbConfig.host, dbConfig.user);
    let conn;
    try {
        conn = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        const rolesToUpdate = ['super admin', 'admin']; // Add Workload Analytics for these roles
        const newPermission = "Workload Analytics";

        for (const role of rolesToUpdate) {
            const [rows] = await conn.query('SELECT menus FROM menu_permissions WHERE role = ?', [role]);

            if (rows.length === 0) {
                console.log(`No permission record found for role: ${role}`);
                continue;
            }

            let currentMenus = [];
            try {
                // menus column is JSON string
                const menuStr = rows[0].menus;
                if (typeof menuStr === 'string') {
                    currentMenus = JSON.parse(menuStr);
                } else if (Array.isArray(menuStr)) {
                    currentMenus = menuStr;
                }
            } catch (e) {
                console.error(`Error parsing menus for ${role}:`, e);
                continue;
            }

            if (!currentMenus.includes(newPermission)) {
                console.log(`Adding '${newPermission}' to role: ${role}`);
                currentMenus.push(newPermission);

                await conn.query('UPDATE menu_permissions SET menus = ? WHERE role = ?', [JSON.stringify(currentMenus), role]);
                console.log(`Updated permissions for ${role}.`);
            } else {
                console.log(`Role ${role} already has '${newPermission}'.`);
            }
        }

        await conn.end();
        console.log('Permission update complete.');
        process.exit(0);
    } catch (err) {
        console.error('Fatal Error:', err);
        if (conn) await conn.end();
        process.exit(1);
    }
}

run();
