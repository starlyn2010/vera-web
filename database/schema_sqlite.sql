-- Clear Path Database Schema (SQLite Version)
-- Fused: Sales System + Environmental Management

-- ─── MÓDULO DE USUARIOS Y AUTENTICACIÓN ───
CREATE TABLE IF NOT EXISTS registro (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_usuario TEXT UNIQUE NOT NULL,
    correo_electronico TEXT UNIQUE NOT NULL,
    contraseña TEXT NOT NULL, -- Hasheada con bcrypt
    rol TEXT DEFAULT 'cliente' CHECK(rol IN ('admin', 'empleado', 'cliente')),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── MÓDULO DE VENTAS (PROMPT JUD) ───
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    apellido TEXT,
    telefono TEXT,
    tarjeta TEXT
);

CREATE TABLE IF NOT EXISTS empleados (
    id_empleado INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    cargo TEXT
);

CREATE TABLE IF NOT EXISTS inventario (
    id_producto INTEGER PRIMARY KEY AUTOINCREMENT,
    producto TEXT NOT NULL,
    categoria TEXT,
    imagen_url TEXT,
    precio REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    impacto_ambiental REAL DEFAULT 0.00 
);

CREATE TABLE IF NOT EXISTS pedidos (
    id_pedido INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER,
    id_empleado INTEGER,
    id_usuario INTEGER,
    fecha TEXT,
    total REAL,
    metodo_envio TEXT,
    precio_envio REAL DEFAULT 0,
    direccion_envio TEXT,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado),
    FOREIGN KEY (id_usuario) REFERENCES registro(id_usuario)
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
    id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pedido INTEGER,
    id_producto INTEGER,
    cantidad INTEGER,
    subtotal REAL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido),
    FOREIGN KEY (id_producto) REFERENCES inventario(id_producto)
);

CREATE TABLE IF NOT EXISTS pago (
    id_pago INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pedido INTEGER,
    tarjeta TEXT,
    numero_telefono TEXT,
    recibo TEXT,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido)
);

-- ─── MÓDULO AMBIENTAL Y GESTIÓN (HUELLA VERDE) ───
CREATE TABLE IF NOT EXISTS metricas_ambientales (
    id_metrica INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_metrica TEXT,
    valor_porcentual INTEGER CHECK (valor_porcentual BETWEEN 0 AND 100),
    codigo_control TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proyectos (
    id_proyecto INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    departamento TEXT,
    estado TEXT CHECK(estado IN ('Pendiente', 'En Progreso', 'Completado')),
    fecha_inicio TEXT
);

CREATE TABLE IF NOT EXISTS reportes (
    id_reporte INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT CHECK(tipo IN ('Analitica', 'Ventas', 'Ambiental')),
    periodo TEXT,
    fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    archivo_path TEXT
);

-- ─── MÓDULO CHATBOT (JUD) ───
CREATE TABLE IF NOT EXISTS chatbot_faq (
    id_faq INTEGER PRIMARY KEY AUTOINCREMENT,
    pregunta TEXT,
    respuesta TEXT,
    categoria TEXT
);

CREATE TABLE IF NOT EXISTS consultas_chatbot (
    id_consulta INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER,
    pregunta TEXT,
    respuesta TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES registro(id_usuario)
);

-- ─── DATOS DE PRUEBA ───
-- NOTA: Los usuarios admin/empleado se crean con hash real mediante: npm run setup
-- Este script NO inserta usuarios con hashes falsos para evitar corrupción de datos.

-- El catalogo base se carga con: npm run seed:catalog

INSERT OR IGNORE INTO proyectos (nombre, departamento, estado, fecha_inicio) VALUES
('Reducción Huella Carbono Q2', 'Medio Ambiente', 'En Progreso', '2026-04-01'),
('Optimización Cadena de Frío', 'Logística', 'Pendiente', '2026-05-01'),
('Certificación ISO 14001', 'Calidad', 'En Progreso', '2026-03-15');

INSERT OR IGNORE INTO metricas_ambientales (tipo_metrica, valor_porcentual, codigo_control) VALUES
('Reduccion CO2', 72, 'CO2-2026-001'),
('Energia Renovable', 58, 'ENE-2026-001'),
('Residuos Reciclados', 85, 'RES-2026-001'),
('Agua Reutilizada', 63, 'AGU-2026-001');
