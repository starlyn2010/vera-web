const db = require('../config/db');

exports.getAllProducts = async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM inventario ORDER BY producto ASC');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const [product] = await db.query('SELECT * FROM inventario WHERE id_producto = ?', [req.params.id]);
        if (product.length === 0) return res.status(404).json({ message: 'Product not found' });
        res.json(product[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { producto, categoria, precio, stock, impacto_ambiental, imagen_url } = req.body;

        if (req.user?.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo un administrador puede crear productos.' });
        }
        
        // Server-side validation
        if (!producto || !categoria || precio === undefined || stock === undefined) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        if (isNaN(precio) || isNaN(stock) || isNaN(impacto_ambiental)) {
            return res.status(400).json({ error: 'Precio, stock e impacto deben ser valores numéricos' });
        }

        const [result] = await db.query(
            'INSERT INTO inventario (producto, categoria, imagen_url, precio, stock, impacto_ambiental) VALUES (?, ?, ?, ?, ?, ?)',
            [producto, categoria, imagen_url || null, precio, stock, impacto_ambiental]
        );
        res.status(201).json({ id: result.insertId, message: 'Producto registrado con éxito' });
    } catch (err) {
        res.status(500).json({ error: 'Error interno al registrar producto' });
    }
};
