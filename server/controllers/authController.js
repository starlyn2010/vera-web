const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const readPassword = (body) => (
    body.password ||
    body.contrasena ||
    body.contraseña ||
    body['contraseÃ±a']
);

exports.register = async (req, res) => {
    try {
        const { nombre_usuario, correo_electronico } = req.body;
        const password = readPassword(req.body);

        if (!nombre_usuario || !correo_electronico || !password) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        const [existing] = await db.query(
            'SELECT * FROM registro WHERE nombre_usuario = ? OR correo_electronico = ?',
            [nombre_usuario, correo_electronico]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'El nombre de usuario o correo ya están en uso.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            'INSERT INTO registro (nombre_usuario, correo_electronico, contraseña) VALUES (?, ?, ?)',
            [nombre_usuario, correo_electronico, hashedPassword]
        );

        res.status(201).json({ message: 'Usuario registrado con éxito.' });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Error interno del servidor al registrar.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { nombre_usuario } = req.body;
        const password = readPassword(req.body);

        if (!nombre_usuario || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
        }

        const [rows] = await db.query('SELECT * FROM registro WHERE nombre_usuario = ?', [nombre_usuario]);
        const user = rows[0];
        const passwordHash = user?.contraseña || user?.['contraseÃ±a'];
        const isValid = user && await bcrypt.compare(password, passwordHash);

        if (!isValid) {
            return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu usuario y contraseña.' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'JWT_SECRET no está configurado.' });
        }

        const token = jwt.sign(
            { id: user.id_usuario, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id_usuario,
                nombre: user.nombre_usuario,
                email: user.correo_electronico,
                rol: user.rol
            }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Error interno del servidor al autenticar.' });
    }
};

exports.updatePlan = async (req, res) => {
    res.status(410).json({ error: 'La página de suscripción fue retirada. El acceso se controla por rol.' });
};

exports.updateProfile = async (req, res) => {
    try {
        const { nombre, email } = req.body;
        await db.query(
            'UPDATE registro SET nombre_usuario = ?, correo_electronico = ? WHERE id_usuario = ?',
            [nombre, email, req.user.id]
        );
        res.json({ message: 'Perfil actualizado.', user: { nombre, email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
