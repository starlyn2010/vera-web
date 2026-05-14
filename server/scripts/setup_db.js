require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Resolve DB path relative to server root (not scripts/)
const dbPath = path.join(__dirname, '../../database/clearpath.db');
const schemaPath = path.join(__dirname, '../../database/schema_sqlite.sql');

console.log('🚀 Clear Path — Inicializando base de datos...');
console.log(`📁 DB Path: ${dbPath}`);

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('✅ Directorio de base de datos creado.');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al abrir la base de datos:', err.message);
        process.exit(1);
    }

    console.log('✅ Conexión establecida con SQLite.');
    
    // Enable WAL for performance
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA synchronous = NORMAL');
    
    const schema = fs.readFileSync(schemaPath, 'utf8');

    db.exec(schema, async (err) => {
        if (err) {
            console.error('❌ Error al ejecutar el esquema:', err.message);
            db.close();
            process.exit(1);
        }

        console.log('✅ Schema aplicado correctamente.');

        // Create real hashed users
        try {
            const adminHash = await bcrypt.hash('admin123', 10);
            const starlynHash = await bcrypt.hash('starlyn123', 10);
            const testHash = await bcrypt.hash('test123', 10);

            const insertUser = (nombre, correo, hash, rol) =>
                new Promise((resolve, reject) => {
                    db.run(
                        'INSERT OR IGNORE INTO registro (nombre_usuario, correo_electronico, contraseña, rol) VALUES (?, ?, ?, ?)',
                        [nombre, correo, hash, rol],
                        function (err) {
                            if (err) reject(err);
                            else {
                                if (this.changes > 0) console.log(`✅ Usuario creado: ${nombre} (${rol})`);
                                else console.log(`ℹ️  Usuario ya existe: ${nombre}`);
                                resolve();
                            }
                        }
                    );
                });

            await insertUser('admin', 'admin@clearpath.com', adminHash, 'admin');
            await insertUser('starlyn', 'starlyn@clearpath.com', starlynHash, 'empleado');
            await insertUser('test', 'test@clearpath.com', testHash, 'cliente');

            // Insert sales data for analytics
            const insertSales = () =>
                new Promise((resolve, reject) => {
                    const months = [
                        ['2026-01-15', 12500.00],
                        ['2026-02-20', 15300.00],
                        ['2026-03-10', 9800.00],
                        ['2026-04-05', 18200.00],
                        ['2026-05-01', 21000.00],
                    ];
                    let done = 0;
                    months.forEach(([fecha, total]) => {
                        db.run(
                            "INSERT OR IGNORE INTO pedidos (id_cliente, id_empleado, fecha, total) VALUES (1, 1, ?, ?)",
                            [fecha, total],
                            () => { done++; if (done === months.length) resolve(); }
                        );
                    });
                });

            await insertSales();
            console.log('✅ Datos de ventas de ejemplo insertados.');

            console.log('\n💎 ===== SETUP COMPLETADO =====');
            console.log('📋 Credenciales de acceso:');
            console.log('   Admin:   usuario=admin      / contraseña=admin123');
            console.log('   Staff:   usuario=starlyn    / contraseña=starlyn123');
            console.log('   Test:    usuario=test       / contraseña=test123');
            console.log('====================================\n');
        } catch (e) {
            console.error('❌ Error creando usuarios:', e.message);
        } finally {
            db.close();
        }
    });
});
