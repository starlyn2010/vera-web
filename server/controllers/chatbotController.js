const Groq = require('groq-sdk');
const db = require('../config/db');

// Initialize Groq client once at module load
let groq = null;
if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_')) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('✅ Jud: Conexión con Groq inicializada correctamente.');
} else {
    console.warn('⚠️  Jud: GROQ_API_KEY no encontrada o inválida. Modo offline activado.');
}

exports.handleChat = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
        }

        // Fetch inventory context from DB to make Jud contextually smart
        let context = 'No hay datos de inventario disponibles actualmente.';
        try {
            const [products] = await db.query('SELECT producto, stock, impacto_ambiental FROM inventario LIMIT 20');
            if (products.length > 0) {
                context = products
                    .map(p => `- ${p.producto}: ${p.stock} unidades (${p.impacto_ambiental}kg CO2/ud)`)
                    .join('\n');
            }
        } catch (dbErr) {
            console.warn('⚠️  No se pudo obtener contexto del inventario:', dbErr.message);
        }

        const systemPrompt = `Eres Jud, la asistente inteligente de Clear Path — una plataforma de sostenibilidad ambiental de BioHands.
Tu función es ayudar a los usuarios con gestión de inventario, análisis de impacto ambiental, proyectos eco y métricas operacionales.

Inventario actual del sistema:
${context}

Instrucciones de comportamiento:
- Responde siempre en español, de forma profesional y con un toque tecnológico-natural.
- Sé conciso pero completo. Usa listas o números cuando la respuesta lo amerite.
- Si no sabes algo con certeza, dilo claramente en lugar de inventar datos.
- Si te preguntan algo fuera del dominio de Clear Path, puedes responder brevemente pero redirige al tema ambiental/operacional.`;

        // Sanitize history: only accept valid roles, exclude system messages from client
        const validRoles = new Set(['user', 'assistant']);
        const sanitizedHistory = Array.isArray(history)
            ? history
                .filter(m => m && validRoles.has(m.role) && typeof m.content === 'string')
                .slice(-20) // Keep last 20 messages to avoid token overflow
            : [];

        const messages = [
            { role: 'system', content: systemPrompt },
            ...sanitizedHistory,
            { role: 'user', content: message.trim() }
        ];

        // Fallback if Groq is not configured
        if (!groq) {
            return res.json({
                reply: 'Hola, soy Jud. Mi módulo de IA está en modo de mantenimiento actualmente. El equipo BioHands está trabajando para restaurarlo. ¿Puedo ayudarte con información básica del inventario o proyectos?'
            });
        }

        const completion = await groq.chat.completions.create({
            messages,
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            temperature: 0.6,
            max_tokens: 1024,
        });

        const reply = completion.choices[0]?.message?.content;
        if (!reply) throw new Error('Groq returned empty response');

        // Save consultation to DB asynchronously (non-blocking, don't fail request if this fails)
        const userId = req.user?.id || null;
        db.query(
            'INSERT INTO consultas_chatbot (id_usuario, pregunta, respuesta) VALUES (?, ?, ?)',
            [userId, message.trim(), reply]
        ).catch(dbErr => console.warn('⚠️  No se pudo guardar consulta en DB:', dbErr.message));

        res.json({ reply });
    } catch (err) {
        console.error('❌ Groq Error:', err.message || err);
        
        // Provide meaningful error to client without exposing internals
        const isGroqError = err.status || err.error;
        if (isGroqError) {
            res.status(502).json({ error: 'El servicio de IA está temporalmente no disponible. Intenta de nuevo en unos segundos.' });
        } else {
            res.status(500).json({ error: 'Error procesando tu mensaje. Por favor, intenta de nuevo.' });
        }
    }
};
