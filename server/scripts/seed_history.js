require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/clearpath.db');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });

const all = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

const pad2 = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const monthStartsBack = (monthsBack) => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
};

async function ensureSeedCustomers() {
    const existing = await all('SELECT COUNT(*) as c FROM clientes');
    if ((existing[0]?.c || 0) > 0) return;

    const customers = [
        ['Consumidor', 'Final', '8090000001', '**** 1234'],
        ['BioHands', 'Clinic', '8090000002', '**** 2233'],
        ['Eco', 'Market', '8090000003', '**** 4455'],
        ['Verde', 'Supply', '8090000004', '**** 7788'],
        ['Clear', 'Partner', '8090000005', '**** 9900'],
    ];

    for (const row of customers) {
        await run('INSERT INTO clientes (nombre, apellido, telefono, tarjeta) VALUES (?, ?, ?, ?)', row);
    }
}

async function ensureSeedEmployees() {
    const existing = await all('SELECT COUNT(*) as c FROM empleados');
    if ((existing[0]?.c || 0) > 0) return;

    const employees = [
        ['Operador', 'Ventas'],
        ['Analista', 'Sostenibilidad'],
    ];

    for (const row of employees) {
        await run('INSERT INTO empleados (nombre, cargo) VALUES (?, ?)', row);
    }
}

async function seedMonthlySalesAndMetrics() {
    // Seed 12 months back including current month.
    const start = monthStartsBack(11);
    const types = ['Reduccion CO2', 'Energia Renovable', 'Residuos Reciclados', 'Agua Reutilizada'];

    for (let i = 0; i < 12; i++) {
        const date = new Date(start.getFullYear(), start.getMonth() + i, 15);
        const fecha = fmtDate(date);

        // Sales: 2-4 orders per month, increasing trend.
        const base = 9000 + i * 650;
        const orderCount = 2 + (i % 3);

        for (let j = 0; j < orderCount; j++) {
            const total = Number((base + j * 420 + (i % 2) * 175).toFixed(2));
            const idCliente = 1 + ((i + j) % 5);
            const idEmpleado = 1 + (j % 2);
            await run(
                'INSERT INTO pedidos (id_cliente, id_empleado, id_usuario, fecha, total) VALUES (?, ?, NULL, ?, ?)',
                [idCliente, idEmpleado, fecha, total]
            );
        }

        // Environmental metrics: 1 datapoint per type per month.
        for (let t = 0; t < types.length; t++) {
            const value = Math.max(10, Math.min(95, 45 + i * 2 + t * 3 - (i % 4) * 2));
            const code = `AUTO-${date.getFullYear()}${pad2(date.getMonth() + 1)}-${pad2(t + 1)}`;
            await run(
                'INSERT INTO metricas_ambientales (tipo_metrica, valor_porcentual, codigo_control, fecha) VALUES (?, ?, ?, ?)',
                [types[t], value, code, fecha]
            );
        }
    }
}

async function main() {
    console.log('🌱 Seeding histórico (12 meses) en:', dbPath);
    try {
        await ensureSeedCustomers();
        await ensureSeedEmployees();
        await seedMonthlySalesAndMetrics();
        console.log('✅ Seed completado.');
    } catch (err) {
        console.error('❌ Seed error:', err.message || err);
        process.exitCode = 1;
    } finally {
        db.close();
    }
}

main();

