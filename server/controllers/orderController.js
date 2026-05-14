const db = require('../config/db');

exports.createOrder = async (req, res) => {
    let transactionStarted = false;

    try {
        const { id_cliente, id_empleado, productos, items, total, tarjeta, numero_telefono } = req.body;
        const orderItems = Array.isArray(productos) ? productos : items;
        const userId = req.user?.id || null;

        if (!Array.isArray(orderItems) || orderItems.length === 0) {
            return res.status(400).json({ error: 'El pedido debe incluir al menos un producto.' });
        }

        const normalizedItems = [];
        let calculatedTotal = 0;

        for (const item of orderItems) {
            const productId = Number(item.id_producto);
            const quantity = Number(item.cantidad);

            if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
                return res.status(400).json({ error: 'Cada producto debe tener un id y una cantidad válida.' });
            }

            const [productsFound] = await db.query(
                'SELECT id_producto, precio, stock FROM inventario WHERE id_producto = ?',
                [productId]
            );
            const product = productsFound[0];

            if (!product) {
                return res.status(404).json({ error: `Producto ${productId} no encontrado.` });
            }

            if (product.stock < quantity) {
                return res.status(400).json({ error: `Stock insuficiente para el producto ${productId}. Disponible: ${product.stock}.` });
            }

            const subtotal = Number((product.precio * quantity).toFixed(2));
            calculatedTotal += subtotal;
            normalizedItems.push({ id_producto: productId, cantidad: quantity, subtotal });
        }

        const finalTotal = Number((calculatedTotal || Number(total) || 0).toFixed(2));

        // 1. Crear Pedido (SQLite uses date('now'))
        await db.query('BEGIN TRANSACTION');
        transactionStarted = true;

        const [orderResult] = await db.query(
            "INSERT INTO pedidos (id_cliente, id_empleado, id_usuario, fecha, total) VALUES (?, ?, ?, date('now'), ?)",
            [id_cliente || userId, id_empleado || 1, userId, finalTotal]
        );
        const orderId = orderResult.insertId;

        // 2. Insertar Detalle y Actualizar Stock
        for (const item of normalizedItems) {
            await db.query(
                'INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, subtotal) VALUES (?, ?, ?, ?)',
                [orderId, item.id_producto, item.cantidad, item.subtotal]
            );
            await db.query(
                'UPDATE inventario SET stock = stock - ? WHERE id_producto = ?',
                [item.cantidad, item.id_producto]
            );
        }

        // 3. Registrar Pago
        await db.query(
            'INSERT INTO pago (id_pedido, tarjeta, numero_telefono, recibo) VALUES (?, ?, ?, ?)',
            [orderId, tarjeta || 'N/A', numero_telefono || 'N/A', `REC-${orderId}`]
        );

        await db.query('COMMIT');
        transactionStarted = false;

        res.status(201).json({ id_pedido: orderId, message: 'Order processed successfully' });
    } catch (err) {
        if (transactionStarted) {
            try {
                await db.query('ROLLBACK');
            } catch (rollbackErr) {
                console.error('Rollback Error:', rollbackErr);
            }
        }
        console.error('Order Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getOrderHistory = async (req, res) => {
    try {
        const isAdmin = req.user?.rol === 'admin';
        const params = isAdmin ? [] : [req.user.id];
        const whereClause = isAdmin ? '' : 'WHERE p.id_usuario = ?';

        const [orders] = await db.query(`
            SELECT 
                p.*, 
                COALESCE(
                    NULLIF(TRIM(COALESCE(c.nombre, '') || ' ' || COALESCE(c.apellido, '')), ''),
                    r.nombre_usuario,
                    'Consumidor Final'
                ) as cliente,
                e.nombre as empleado 
            FROM pedidos p 
            LEFT JOIN clientes c ON p.id_cliente = c.id_cliente 
            LEFT JOIN empleados e ON p.id_empleado = e.id_empleado
            LEFT JOIN registro r ON p.id_usuario = r.id_usuario
            ${whereClause}
            ORDER BY p.fecha DESC
        `, params);
        res.json(orders);
    } catch (err) {
        console.error('Fetch Orders Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getOrderDetails = async (req, res) => {
    try {
        const isAdmin = req.user?.rol === 'admin';
        const params = isAdmin ? [req.params.id] : [req.params.id, req.user.id];
        const userClause = isAdmin ? '' : 'AND p.id_usuario = ?';

        const [orders] = await db.query(`
            SELECT
                p.*,
                COALESCE(
                    NULLIF(TRIM(COALESCE(c.nombre, '') || ' ' || COALESCE(c.apellido, '')), ''),
                    r.nombre_usuario,
                    'Consumidor Final'
                ) as cliente,
                e.nombre as empleado,
                pago.recibo
            FROM pedidos p
            LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
            LEFT JOIN empleados e ON p.id_empleado = e.id_empleado
            LEFT JOIN registro r ON p.id_usuario = r.id_usuario
            LEFT JOIN pago ON p.id_pedido = pago.id_pedido
            WHERE p.id_pedido = ? ${userClause}
        `, params);

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado.' });
        }

        const [items] = await db.query(`
            SELECT
                d.id_detalle,
                d.id_producto,
                COALESCE(i.producto, 'Producto no disponible') as producto,
                COALESCE(i.categoria, 'General') as categoria,
                COALESCE(i.precio, d.subtotal / NULLIF(d.cantidad, 0), d.subtotal) as precio,
                d.cantidad,
                d.subtotal
            FROM detalle_pedido d
            LEFT JOIN inventario i ON d.id_producto = i.id_producto
            WHERE d.id_pedido = ?
            ORDER BY d.id_detalle ASC
        `, [req.params.id]);

        const normalizedItems = items.length > 0
            ? items
            : [{
                id_detalle: null,
                id_producto: null,
                producto: 'Pedido consolidado',
                categoria: 'General',
                precio: orders[0].total || 0,
                cantidad: 1,
                subtotal: orders[0].total || 0
            }];

        res.json({ ...orders[0], items: normalizedItems });
    } catch (err) {
        console.error('Fetch Order Details Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.cancelOrder = async (req, res) => {
    let transactionStarted = false;
    try {
        const orderId = req.params.id;
        
        // Ensure order exists and belongs to the user if not admin
        const isAdmin = req.user?.rol === 'admin';
        const params = isAdmin ? [orderId] : [orderId, req.user.id];
        const whereClause = isAdmin ? 'WHERE id_pedido = ?' : 'WHERE id_pedido = ? AND id_usuario = ?';
        
        const [orders] = await db.query(`SELECT * FROM pedidos ${whereClause}`, params);
        
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado o no tienes permisos para cancelarlo.' });
        }

        await db.query('BEGIN TRANSACTION');
        transactionStarted = true;

        // Restore inventory
        const [items] = await db.query('SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = ?', [orderId]);
        for (const item of items) {
            if (item.id_producto) {
                await db.query('UPDATE inventario SET stock = stock + ? WHERE id_producto = ?', [item.cantidad, item.id_producto]);
            }
        }

        // Delete records
        await db.query('DELETE FROM pago WHERE id_pedido = ?', [orderId]);
        await db.query('DELETE FROM detalle_pedido WHERE id_pedido = ?', [orderId]);
        await db.query('DELETE FROM pedidos WHERE id_pedido = ?', [orderId]);

        await db.query('COMMIT');
        transactionStarted = false;

        res.json({ message: 'Pedido cancelado y stock restaurado correctamente.' });
    } catch (err) {
        if (transactionStarted) {
            try { await db.query('ROLLBACK'); } catch (rollbackErr) { console.error('Rollback Error:', rollbackErr); }
        }
        console.error('Cancel Order Error:', err);
        res.status(500).json({ error: err.message });
    }
};
