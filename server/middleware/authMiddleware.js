const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
        console.error('FATAL: JWT_SECRET not configured in environment variables.');
        return res.status(500).json({ error: 'Internal Server Error: Security Configuration Missing' });
    }

    const token = req.header('Authorization')?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token.' });
    }

    try {
        const verified = jwt.verify(token, secret);
        req.user = verified;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token no válido o expirado.' });
    }
};
