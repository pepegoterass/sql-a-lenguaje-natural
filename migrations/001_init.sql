-- Initial schema and data for ArteVida Cultural
-- NOTE: Kept minimal to ensure deterministic migrations; heavy data stays in seeds/bd.sql if needed

CREATE DATABASE IF NOT EXISTS artevida_cultural CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE artevida_cultural;

-- Core tables
CREATE TABLE IF NOT EXISTS Actividad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    tipo ENUM('concierto', 'exposicion', 'teatro', 'conferencia') NOT NULL,
    subtipo VARCHAR(80) NULL,
    INDEX idx_actividad_tipo (tipo),
    INDEX idx_actividad_nombre (nombre)
);

CREATE TABLE IF NOT EXISTS Artista (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    biografia TEXT NULL,
    INDEX idx_artista_nombre (nombre)
);

CREATE TABLE IF NOT EXISTS Actividad_Artista (
    actividad_id INT NOT NULL,
    artista_id INT NOT NULL,
    PRIMARY KEY (actividad_id, artista_id),
    FOREIGN KEY (actividad_id) REFERENCES Actividad(id) ON DELETE CASCADE,
    FOREIGN KEY (artista_id) REFERENCES Artista(id) ON DELETE CASCADE,
    INDEX idx_actividad_artista_actividad (actividad_id),
    INDEX idx_actividad_artista_artista (artista_id)
);

CREATE TABLE IF NOT EXISTS Ubicacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(160) NOT NULL,
    direccion VARCHAR(160) NULL,
    ciudad VARCHAR(80) NOT NULL,
    aforo INT NULL,
    precio_alquiler DECIMAL(10,2) NULL,
    caracteristicas TEXT NULL,
    INDEX idx_ubicacion_ciudad (ciudad),
    INDEX idx_ubicacion_nombre (nombre)
);

CREATE TABLE IF NOT EXISTS Evento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(160) NOT NULL,
    actividad_id INT NOT NULL,
    ubicacion_id INT NOT NULL,
    precio_entrada DECIMAL(8,2) NULL,
    fecha_hora DATETIME NOT NULL,
    descripcion TEXT NULL,
    FOREIGN KEY (actividad_id) REFERENCES Actividad(id) ON DELETE RESTRICT,
    FOREIGN KEY (ubicacion_id) REFERENCES Ubicacion(id) ON DELETE RESTRICT,
    INDEX idx_evento_fecha (fecha_hora),
    INDEX idx_evento_actividad (actividad_id),
    INDEX idx_evento_ubicacion (ubicacion_id),
    INDEX idx_evento_nombre (nombre)
);

CREATE TABLE IF NOT EXISTS Asistente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(160) NOT NULL,
    telefono VARCHAR(40) NULL,
    email VARCHAR(160) NULL,
    INDEX idx_asistente_email (email),
    INDEX idx_asistente_nombre (nombre_completo)
);

CREATE TABLE IF NOT EXISTS Entrada (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    asistente_id INT NOT NULL,
    precio_pagado DECIMAL(8,2) NOT NULL,
    fecha_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evento_id) REFERENCES Evento(id) ON DELETE CASCADE,
    FOREIGN KEY (asistente_id) REFERENCES Asistente(id) ON DELETE CASCADE,
    INDEX idx_entrada_evento (evento_id),
    INDEX idx_entrada_asistente (asistente_id),
    INDEX idx_entrada_fecha_compra (fecha_compra)
);

CREATE TABLE IF NOT EXISTS Valoracion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    asistente_id INT NOT NULL,
    nota TINYINT NOT NULL CHECK (nota BETWEEN 0 AND 5),
    fecha_valoracion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comentario TEXT NULL,
    FOREIGN KEY (evento_id) REFERENCES Evento(id) ON DELETE CASCADE,
    FOREIGN KEY (asistente_id) REFERENCES Asistente(id) ON DELETE CASCADE,
    UNIQUE KEY uk_valoracion_evento_asistente (evento_id, asistente_id),
    INDEX idx_valoracion_evento (evento_id),
    INDEX idx_valoracion_nota (nota)
);
