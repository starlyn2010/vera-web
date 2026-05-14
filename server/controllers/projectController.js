const db = require('../config/db');

exports.getAllProjects = async (req, res) => {
    try {
        const [projects] = await db.query('SELECT * FROM proyectos');
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createProject = async (req, res) => {
    try {
        const { nombre, departamento, estado, fecha_inicio } = req.body;
        
        if (!nombre || !departamento) {
            return res.status(400).json({ error: 'El nombre y el departamento son obligatorios' });
        }

        const [result] = await db.query(
            'INSERT INTO proyectos (nombre, departamento, estado, fecha_inicio) VALUES (?, ?, ?, ?)',
            [nombre, departamento, estado || 'Pendiente', fecha_inicio || new Date().toISOString().split('T')[0]]
        );
        res.status(201).json({ id: result.insertId, message: 'Proyecto iniciado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error interno al crear proyecto' });
    }
};

exports.updateProjectStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        await db.query('UPDATE proyectos SET estado = ? WHERE id_proyecto = ?', [estado, id]);
        res.json({ message: 'Project status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
