const db = require('../config/db');

exports.getReports = async (req, res) => {
    try {
        const [reports] = await db.query('SELECT * FROM reportes ORDER BY fecha_generacion DESC');
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.generateReport = async (req, res) => {
    try {
        const { tipo, periodo } = req.body;

        if (req.user?.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo un administrador puede crear reportes.' });
        }

        if (!tipo || !periodo) {
            return res.status(400).json({ error: 'Tipo y periodo son obligatorios.' });
        }
        
        // Simulation of file path generation
        const filename = `reporte_${tipo.toLowerCase()}_${Date.now()}.pdf`;
        const archivo_path = `/downloads/reports/${filename}`;
        
        const result = await db.query(
            'INSERT INTO reportes (tipo, periodo, archivo_path) VALUES (?, ?, ?)',
            [tipo, periodo, archivo_path]
        );
        
        res.status(201).json({ 
            message: 'Reporte generado con éxito',
            reportId: result[0].insertId,
            path: archivo_path
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
