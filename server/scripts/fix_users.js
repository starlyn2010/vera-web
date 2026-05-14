const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/clearpath.db');
const db = new sqlite3.Database(dbPath);

async function fixUsers() {
    // Delete corrupted users with fake hashes
    await new Promise((res, rej) => db.run(
        "DELETE FROM registro WHERE nombre_usuario IN ('admin', 'starlyn')",
        function(err) { if (err) rej(err); else { console.log(`Deleted ${this.changes} corrupted users.`); res(); } }
    ));

    // Recreate with real bcrypt hashes
    const users = [
        ['admin', 'admin@clearpath.com', await bcrypt.hash('admin123', 10), 'admin'],
        ['starlyn', 'starlyn@clearpath.com', await bcrypt.hash('starlyn123', 10), 'empleado'],
    ];

    for (const [nombre, correo, hash, rol] of users) {
        await new Promise((res, rej) => db.run(
            'INSERT INTO registro (nombre_usuario, correo_electronico, contraseña, rol) VALUES (?, ?, ?, ?)',
            [nombre, correo, hash, rol],
            function(err) {
                if (err) rej(err);
                else { console.log(`✅ Created: ${nombre} (${rol})`); res(); }
            }
        ));
    }

    console.log('\n✅ Users fixed! Login credentials:');
    console.log('   admin    / admin123');
    console.log('   starlyn  / starlyn123');
    console.log('   test     / test123');
    db.close();
}

fixUsers().catch(e => { console.error(e); db.close(); });
