const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let dbPath;
if (process.versions.electron) {
    const { app } = require('electron');
    // For the server process, we might not have direct access to 'app' if it's a separate process
    // But since we are likely running concurrently or as a fork, we can pass it or use a default
    dbPath = path.join(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"), 'clearpath/database/clearpath.db');
    
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
} else {
    dbPath = path.join(__dirname, '../../database/clearpath.db');
}

const schemaPath = path.join(__dirname, '../../database/schema_sqlite.sql');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        // Performance Tuning: WAL Mode for concurrency
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        
        // Initialize Schema if empty
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error initializing schema:', err.message);
                return;
            }

            db.all('PRAGMA table_info(pedidos)', [], (tableErr, columns) => {
                if (tableErr) {
                    console.error('Error checking pedidos schema:', tableErr.message);
                    return;
                }

                const hasUserColumn = columns.some((column) => column.name === 'id_usuario');
                if (!hasUserColumn) {
                    db.run('ALTER TABLE pedidos ADD COLUMN id_usuario INTEGER', (alterErr) => {
                        if (alterErr) console.error('Error migrating pedidos.id_usuario:', alterErr.message);
                        else console.log('Database migration applied: pedidos.id_usuario.');
                    });
                }
            });

            db.all('PRAGMA table_info(inventario)', [], (tableErr, columns) => {
                if (tableErr) {
                    console.error('Error checking inventario schema:', tableErr.message);
                    return;
                }

                const hasImageColumn = columns.some((column) => column.name === 'imagen_url');
                if (!hasImageColumn) {
                    db.run('ALTER TABLE inventario ADD COLUMN imagen_url TEXT', (alterErr) => {
                        if (alterErr) console.error('Error migrating inventario.imagen_url:', alterErr.message);
                        else console.log('Database migration applied: inventario.imagen_url.');
                    });
                }
            });

            console.log('Database schema initialized successfully.');
        });
    }
});

// Helper to use Promises (to match old mysql2 interface where possible)
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve([rows]);
            });
        } else {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve([{ insertId: this.lastID, affectedRows: this.changes }]);
            });
        }
    });
};

module.exports = {
    query,
    db // raw access if needed
};
