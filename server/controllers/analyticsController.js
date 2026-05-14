const db = require('../config/db');

exports.getEnvironmentalSummary = async (req, res) => {
    try {
        const [metrics] = await db.query('SELECT tipo_metrica, AVG(valor_porcentual) as promedio FROM metricas_ambientales GROUP BY tipo_metrica');
        const [projectsCount] = await db.query('SELECT COUNT(*) as total FROM proyectos');
        const [activeProjects] = await db.query('SELECT COUNT(*) as total FROM proyectos WHERE estado = "En Progreso"');
        
        // Monthly impact for chart
        const [monthly] = await db.query(`
            SELECT strftime('%m', fecha) as mes, AVG(valor_porcentual) as valor 
            FROM metricas_ambientales 
            WHERE fecha >= date('now', '-1 year')
            GROUP BY mes 
            ORDER BY mes ASC
        `);

        res.json({
            averages: metrics,
            totalProjects: projectsCount[0].total,
            activeProjects: activeProjects[0].total,
            monthlyImpact: monthly
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getSalesStats = async (req, res) => {
    try {
        const [sales] = await db.query('SELECT SUM(total) as ingresos_totales, COUNT(*) as pedidos_totales FROM pedidos');
        
        const [monthlySales] = await db.query(`
            SELECT strftime('%m', fecha) as mes, SUM(total) as total 
            FROM pedidos 
            WHERE fecha >= date('now', '-1 year')
            GROUP BY mes 
            ORDER BY mes ASC
        `);

        res.json({
            ...sales[0],
            monthlySales
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

