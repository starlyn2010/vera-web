-- Clear Path Database Schema
-- Fused: Sales System + Environmental Management

CREATE DATABASE IF NOT EXISTS sistema_ventas;
USE sistema_ventas;

-- ─── MÓDULO DE USUARIOS Y AUTENTICACIÓN ───
CREATE TABLE IF NOT EXISTS registro (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
    correo_electronico VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL, -- Hasheada con bcrypt
    rol ENUM('admin', 'empleado', 'cliente') DEFAULT 'cliente',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─── MÓDULO DE VENTAS (PROMPT JUD) ───
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50),
    apellido VARCHAR(50),
    telefono VARCHAR(15),
    tarjeta VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS empleados (
    id_empleado INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50),
    cargo VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS inventario (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    producto VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    precio DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    impacto_ambiental DECIMAL(5,2) DEFAULT 0.00 -- Reutilizado de productos antiguos
);

CREATE TABLE IF NOT EXISTS pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    id_empleado INT,
    id_usuario INT,
    fecha DATE,
    total DECIMAL(10,2),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado),
    FOREIGN KEY (id_usuario) REFERENCES registro(id_usuario)
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT,
    id_producto INT,
    cantidad INT,
    subtotal DECIMAL(10,2),
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido),
    FOREIGN KEY (id_producto) REFERENCES inventario(id_producto)
);

CREATE TABLE IF NOT EXISTS pago (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT,
    tarjeta VARCHAR(20),
    numero_telefono VARCHAR(15),
    recibo VARCHAR(50),
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido)
);

-- ─── MÓDULO AMBIENTAL Y GESTIÓN (HUELLA VERDE) ───
CREATE TABLE IF NOT EXISTS metricas_ambientales (
    id_metrica INT AUTO_INCREMENT PRIMARY KEY,
    tipo_metrica VARCHAR(50),
    valor_porcentual INT CHECK (valor_porcentual BETWEEN 0 AND 100),
    codigo_control VARCHAR(20),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proyectos (
    id_proyecto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    departamento VARCHAR(50),
    estado ENUM('Pendiente', 'En Progreso', 'Completado'),
    fecha_inicio DATE
);

CREATE TABLE IF NOT EXISTS reportes (
    id_reporte INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('Analitica', 'Ventas', 'Ambiental'),
    periodo VARCHAR(50),
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archivo_path VARCHAR(255)
);

-- ─── MÓDULO CHATBOT (JUD) ───
CREATE TABLE IF NOT EXISTS chatbot_faq (
    id_faq INT AUTO_INCREMENT PRIMARY KEY,
    pregunta TEXT,
    respuesta TEXT,
    categoria VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS consultas_chatbot (
    id_consulta INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    pregunta TEXT,
    respuesta TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES registro(id_usuario)
);

-- ─── DATOS DE PRUEBA ───
INSERT INTO registro (nombre_usuario, correo_electronico, contraseña, rol) VALUES 
('admin', 'admin@clearpath.com', '$2b$10$YourHashedPasswordHere', 'admin'),
('starlyn', 'starlyn@clearpath.com', '$2b$10$YourHashedPasswordHere', 'empleado');

INSERT INTO inventario (producto, categoria, precio, stock, impacto_ambiental) VALUES 
('BioHands Guantes PHA', 'Medico', 25.00, 100, 0.05),
('BioHands Guantes Latex Natural', 'Medico', 15.00, 200, 0.10);
