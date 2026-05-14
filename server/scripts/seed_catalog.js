const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '../../database/clearpath.db');

const catalog = [
    {
        producto: 'BioHands Guantes PHA Pro',
        categoria: 'Proteccion',
        imagen_url: '/products/product-guantes-pha.png',
        precio: 25,
        stock: 120,
        impacto_ambiental: 0.05
    },
    {
        producto: 'Mascarilla BioKN95 Compostable',
        categoria: 'Proteccion',
        imagen_url: '/products/product-mascarilla-bio.png',
        precio: 8.5,
        stock: 320,
        impacto_ambiental: 0.03
    },
    {
        producto: 'Bata Quirurgica Reutilizable Eco',
        categoria: 'Proteccion',
        imagen_url: '/products/product-bata-eco.png',
        precio: 42,
        stock: 60,
        impacto_ambiental: 0.12
    },
    {
        producto: 'Gel Desinfectante Botanico 1L',
        categoria: 'Limpieza',
        imagen_url: '/products/product-gel-botanico.png',
        precio: 12.75,
        stock: 140,
        impacto_ambiental: 0.04
    },
    {
        producto: 'Kit Limpieza Verde Hospitalaria',
        categoria: 'Limpieza',
        imagen_url: '/products/product-kit-limpieza.png',
        precio: 68,
        stock: 35,
        impacto_ambiental: 0.18
    },
    {
        producto: 'Compostador Industrial Eco',
        categoria: 'Gestion Residuos',
        imagen_url: '/products/product-compostador.png',
        precio: 320,
        stock: 18,
        impacto_ambiental: 1.2
    },
    {
        producto: 'Panel Solar BioTech 300W',
        categoria: 'Energia',
        imagen_url: '/products/product-panel-solar.png',
        precio: 450,
        stock: 24,
        impacto_ambiental: 0.8
    },
    {
        producto: 'Sensor Calidad Aire ClearPath',
        categoria: 'Analitica',
        imagen_url: '/products/product-sensor-aire.png',
        precio: 95,
        stock: 45,
        impacto_ambiental: 0.22
    },
    {
        producto: 'Contenedor Reciclaje Inteligente',
        categoria: 'Gestion Residuos',
        imagen_url: '/products/product-contenedor.png',
        precio: 180,
        stock: 28,
        impacto_ambiental: 0.45
    },
    {
        producto: 'Arroz Organico Huella Baja 25kg',
        categoria: 'Alimentos',
        imagen_url: '/products/product-arroz-organico.png',
        precio: 38,
        stock: 75,
        impacto_ambiental: 0.08
    },
    {
        producto: 'Cafe Agroforestal 5kg',
        categoria: 'Alimentos',
        imagen_url: '/products/product-cafe-agro.png',
        precio: 56,
        stock: 48,
        impacto_ambiental: 0.07
    },
    {
        producto: 'Empaque Biodegradable BioWrap',
        categoria: 'Empaques',
        imagen_url: '/products/product-biowrap.png',
        precio: 18,
        stock: 210,
        impacto_ambiental: 0.02
    }
];

const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const ensureImageColumn = async () => {
    try {
        await run('ALTER TABLE inventario ADD COLUMN imagen_url TEXT');
        console.log('Migracion aplicada: inventario.imagen_url');
    } catch (err) {
        if (!String(err.message).includes('duplicate column name')) {
            throw err;
        }
    }
};

const seedCatalog = async () => {
    await ensureImageColumn();

    const existing = await all('SELECT id_producto FROM inventario ORDER BY id_producto ASC');
    const catalogIds = [];

    for (const [index, item] of catalog.entries()) {
        const currentId = existing[index]?.id_producto;
        if (currentId) {
            await run(
                `UPDATE inventario
                 SET producto = ?, categoria = ?, imagen_url = ?, precio = ?, stock = ?, impacto_ambiental = ?
                 WHERE id_producto = ?`,
                [item.producto, item.categoria, item.imagen_url, item.precio, item.stock, item.impacto_ambiental, currentId]
            );
            catalogIds.push(currentId);
        } else {
            const result = await run(
                `INSERT INTO inventario (producto, categoria, imagen_url, precio, stock, impacto_ambiental)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [item.producto, item.categoria, item.imagen_url, item.precio, item.stock, item.impacto_ambiental]
            );
            catalogIds.push(result.lastID);
        }
    }

    const referenced = await all('SELECT DISTINCT id_producto FROM detalle_pedido WHERE id_producto IS NOT NULL');
    const keepIds = [...new Set([...catalogIds, ...referenced.map((row) => row.id_producto)])];

    if (keepIds.length > 0) {
        await run(
            `DELETE FROM inventario WHERE id_producto NOT IN (${keepIds.map(() => '?').join(',')})`,
            keepIds
        );
    }

    const [{ total }] = await all('SELECT COUNT(*) AS total FROM inventario');
    console.log(`Catalogo actualizado: ${catalog.length} productos base, ${total} productos visibles.`);
};

seedCatalog()
    .catch((err) => {
        console.error('Error sembrando catalogo:', err.message);
        process.exitCode = 1;
    })
    .finally(() => {
        db.close();
    });
