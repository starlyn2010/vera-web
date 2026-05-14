const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ───────────────────────────────────────────────────────────────────
// Development: allow Vite dev server + Electron
const allowedOrigins = [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:5174',  // Vite fallback
    'http://localhost:3000',  // CRA fallback
    'app://',                 // Electron production
    null,                     // Electron dev (file://)
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Electron, mobile apps)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
    },
    credentials: true,
}));

// ─── BODY PARSING ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/projects',  require('./routes/projectRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/orders',    require('./routes/orderRoutes'));
app.use('/api/chatbot',   require('./routes/chatbotRoutes'));
app.use('/api/reports',   require('./routes/reportRoutes'));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'Clear Path API',
        timestamp: new Date().toISOString(),
        groq: !!process.env.GROQ_API_KEY
    });
});

app.get('/', (req, res) => {
    res.send('Clear Path API is running ✅');
});

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Unhandled Error:', err.message || err);
    const status = err.status || 500;
    res.status(status).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Error interno del servidor.'
            : err.message || 'Error interno del servidor.'
    });
});

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 Clear Path API corriendo en http://localhost:${PORT}`);
    console.log(`🤖 Jud (Groq): ${process.env.GROQ_API_KEY ? '✅ Activo' : '❌ Sin API Key'}`);
    console.log(`🌱 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
});
