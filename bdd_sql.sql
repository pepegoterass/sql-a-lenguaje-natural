-- Base de datos completa ArteVida Cultural
-- Archivo único sin duplicados ni errores

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS artevida_cultural CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE artevida_cultural;

-- Tabla de Actividades
CREATE TABLE IF NOT EXISTS Actividad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    tipo ENUM('concierto', 'exposicion', 'teatro', 'conferencia') NOT NULL,
    subtipo VARCHAR(80) NULL,
    INDEX idx_actividad_tipo (tipo),
    INDEX idx_actividad_nombre (nombre)
);

-- Tabla de Artistas
CREATE TABLE IF NOT EXISTS Artista (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    biografia TEXT NULL,
    INDEX idx_artista_nombre (nombre)
);

-- Tabla de relación muchos a muchos entre Actividad y Artista
CREATE TABLE IF NOT EXISTS Actividad_Artista (
    actividad_id INT NOT NULL,
    artista_id INT NOT NULL,
    PRIMARY KEY (actividad_id, artista_id),
    FOREIGN KEY (actividad_id) REFERENCES Actividad(id) ON DELETE CASCADE,
    FOREIGN KEY (artista_id) REFERENCES Artista(id) ON DELETE CASCADE,
    INDEX idx_actividad_artista_actividad (actividad_id),
    INDEX idx_actividad_artista_artista (artista_id)
);

-- Tabla de Ubicaciones
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

-- Tabla de Eventos
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

-- Tabla de Asistentes
CREATE TABLE IF NOT EXISTS Asistente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(160) NOT NULL,
    telefono VARCHAR(40) NULL,
    email VARCHAR(160) NULL,
    INDEX idx_asistente_email (email),
    INDEX idx_asistente_nombre (nombre_completo)
);

-- Tabla de Entradas
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

-- Tabla de Valoraciones
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

-- Limpiar datos existentes (en orden por las FK)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Valoracion;
TRUNCATE TABLE Entrada;
TRUNCATE TABLE Evento;
TRUNCATE TABLE Actividad_Artista;
TRUNCATE TABLE Asistente;
TRUNCATE TABLE Ubicacion;
TRUNCATE TABLE Actividad;
TRUNCATE TABLE Artista;
SET FOREIGN_KEY_CHECKS = 1;

-- ===================================
-- INSERTAR TODOS LOS DATOS
-- ===================================

-- Insertar Artistas
INSERT INTO Artista (id, nombre, biografia) VALUES
(1, 'Manu Chao', 'Músico franco-español conocido por su mezcla de estilos musicales y letras en varios idiomas'),
(2, 'Pablo Alborán', 'Cantautor español de pop y flamenco, reconocido internacionalmente'),
(3, 'Compañía Nacional de Teatro Clásico', 'Prestigiosa compañía teatral española especializada en obras clásicas'),
(4, 'La Cueva de Salamanca', 'Grupo de teatro experimental con sede en Madrid'),
(5, 'Rosalía', 'Artista catalana que fusiona flamenco tradicional con música urbana contemporánea'),
(6, 'Dr. Elena Martínez', 'Historiadora del arte especializada en pintura barroca española'),
(7, 'Prof. Carlos Ruiz', 'Catedrático de Literatura Española del Siglo de Oro'),
(8, 'Ana Belén', 'Actriz y cantante española con más de 50 años de carrera'),
(9, 'Víctor Manuel', 'Cantautor asturiano, referente de la canción de autor española'),
(10, 'Colectivo Artístico Valencia', 'Grupo de artistas visuales contemporáneos de Valencia');

-- Insertar Actividades
INSERT INTO Actividad (id, nombre, tipo, subtipo) VALUES
(1, 'Concierto Manu Chao World Tour', 'concierto', 'World Music'),
(2, 'Pablo Alborán - Vértigo Tour', 'concierto', 'Pop Español'),
(3, 'Don Juan Tenorio', 'teatro', 'Drama Clásico'),
(4, 'La Casa de Bernarda Alba', 'teatro', 'Drama Contemporáneo'),
(5, 'Rosalía Live Experience', 'concierto', 'Flamenco Fusión'),
(6, 'Velázquez y su Época', 'exposicion', 'Arte Barroco'),
(7, 'Literatura del Siglo de Oro', 'conferencia', 'Historia Literaria'),
(8, 'Ana Belén - Antología Musical', 'concierto', 'Canción de Autor'),
(9, 'Arte Contemporáneo Español', 'exposicion', 'Arte Moderno'),
(10, 'Víctor Manuel en Concierto', 'concierto', 'Folk Español');

-- Insertar relaciones Actividad_Artista
INSERT INTO Actividad_Artista (actividad_id, artista_id) VALUES
(1, 1),  -- Manu Chao en su concierto
(2, 2),  -- Pablo Alborán en su tour
(3, 3),  -- Compañía Nacional en Don Juan Tenorio
(4, 4),  -- La Cueva de Salamanca en Bernarda Alba
(5, 5),  -- Rosalía en su show
(6, 6),  -- Dr. Elena Martínez en exposición Velázquez
(7, 7),  -- Prof. Carlos Ruiz en conferencia literatura
(8, 8),  -- Ana Belén en su antología
(9, 10), -- Colectivo Artístico en exposición contemporánea
(10, 9), -- Víctor Manuel en su concierto
-- Algunas actividades con múltiples artistas
(3, 8),  -- Ana Belén también participa en Don Juan Tenorio
(5, 1);  -- Manu Chao colabora con Rosalía

-- Insertar Ubicaciones
INSERT INTO Ubicacion (id, nombre, direccion, ciudad, aforo, precio_alquiler, caracteristicas) VALUES
(1, 'Teatro Real', 'Plaza de Oriente s/n', 'Madrid', 1748, 15000.00, 'Teatro de ópera histórico con acústica excepcional'),
(2, 'Palau de la Música Catalana', 'Carrer Palau de la Música 4-6', 'Barcelona', 2146, 12000.00, 'Patrimonio UNESCO, modernismo catalán'),
(3, 'Kursaal Donostia', 'Av. de Zurriola 1', 'San Sebastián', 1806, 8000.00, 'Auditorio moderno frente al mar'),
(4, 'Teatro de la Maestranza', 'Paseo de Cristóbal Colón 22', 'Sevilla', 1800, 10000.00, 'Ópera y ballet, vista al río Guadalquivir'),
(5, 'Palacio de Congresos de Valencia', 'Av. de las Cortes Valencianas 60', 'Valencia', 1500, 7500.00, 'Centro de congresos multifuncional'),
(6, 'Teatro Arriaga', 'Plaza Arriaga 1', 'Bilbao', 1400, 9000.00, 'Teatro histórico en el casco viejo'),
(7, 'Auditorio de Galicia', 'Av. del Burgo das Nacións s/n', 'Santiago de Compostela', 1200, 6000.00, 'Diseño contemporáneo en piedra gallega'),
(8, 'Centro Cultural Conde Duque', 'Calle del Conde Duque 11', 'Madrid', 800, 5000.00, 'Espacio cultural multidisciplinar'),
(9, 'Museo Guggenheim Bilbao', 'Abandoibarra Etorb. 2', 'Bilbao', 600, 20000.00, 'Museo de arte contemporáneo icónico'),
(10, 'Círculo de Bellas Artes', 'Calle de Alcalá 42', 'Madrid', 500, 4000.00, 'Institución cultural centenaria');

-- Insertar Eventos
INSERT INTO Evento (id, nombre, actividad_id, ubicacion_id, precio_entrada, fecha_hora, descripcion) VALUES
(1, 'Manu Chao - Próxima Estación: Esperanza', 1, 2, 45.00, '2024-03-15 21:00:00', 'Concierto único en Barcelona con su nueva banda'),
(2, 'Pablo Alborán - Vértigo en Madrid', 2, 1, 55.00, '2024-04-20 20:30:00', 'Presentación de su nuevo álbum en el Teatro Real'),
(3, 'Don Juan Tenorio - Temporada Primavera', 3, 4, 35.00, '2024-05-10 19:30:00', 'Versión clásica del drama de Zorrilla'),
(4, 'La Casa de Bernarda Alba - Experimental', 4, 8, 25.00, '2024-06-05 20:00:00', 'Adaptación contemporánea de Lorca'),
(5, 'Rosalía - Motomami World Tour', 5, 3, 65.00, '2024-07-12 22:00:00', 'Show multimedia con invitado especial'),
(6, 'Velázquez y su Época - Inauguración', 6, 10, 15.00, '2024-08-01 18:00:00', 'Conferencia inaugural de la exposición'),
(7, 'Literatura del Siglo de Oro Español', 7, 10, 12.00, '2024-09-14 17:00:00', 'Ciclo de conferencias magistrales'),
(8, 'Ana Belén - 50 Años de Música', 8, 6, 40.00, '2024-10-25 20:00:00', 'Concierto homenaje con invitados'),
(9, 'Arte Contemporáneo: Nueva Generación', 9, 9, 20.00, '2024-11-08 19:00:00', 'Exposición de artistas emergentes'),
(10, 'Víctor Manuel - Asturias en el Corazón', 10, 7, 38.00, '2024-12-15 19:30:00', 'Concierto especial navideño'),
-- Eventos adicionales para 2024
(11, 'Pablo Alborán Acústico', 2, 5, 48.00, '2024-02-28 21:00:00', 'Versión íntima y acústica en Valencia'),
(12, 'Don Juan Tenorio - Gira Nacional', 3, 6, 32.00, '2024-05-25 19:30:00', 'La obra clásica llega a Bilbao'),
(13, 'Manu Chao - Festival Verano', 1, 4, 42.00, '2024-07-20 21:30:00', 'Concierto al aire libre en Sevilla');

-- Insertar TODOS los Asistentes (originales + nuevos)
INSERT INTO Asistente (id, nombre_completo, telefono, email) VALUES
-- Asistentes originales (1-15)
(1, 'María González Pérez', '+34 666 111 222', 'maria.gonzalez@email.com'),
(2, 'Juan Carlos Rodríguez', '+34 677 333 444', 'jc.rodriguez@email.com'),
(3, 'Ana López Martín', '+34 688 555 666', 'ana.lopez@email.com'),
(4, 'Pedro Sánchez García', '+34 699 777 888', 'pedro.sanchez@email.com'),
(5, 'Carmen Ruiz Fernández', '+34 655 999 000', 'carmen.ruiz@email.com'),
(6, 'Miguel Ángel Torres', '+34 644 123 456', 'miguel.torres@email.com'),
(7, 'Isabel Moreno Vega', '+34 633 789 012', 'isabel.moreno@email.com'),
(8, 'Francisco Javier León', '+34 622 345 678', 'fj.leon@email.com'),
(9, 'Laura Díez Romero', '+34 611 901 234', 'laura.diez@email.com'),
(10, 'Roberto Castro Iglesias', '+34 600 567 890', 'roberto.castro@email.com'),
(11, 'Elena Vargas Serrano', '+34 655 432 109', 'elena.vargas@email.com'),
(12, 'David Herrera Jiménez', '+34 666 876 543', 'david.herrera@email.com'),
(13, 'Cristina Navarro Ponce', '+34 677 210 987', 'cristina.navarro@email.com'),
(14, 'Alejandro Mendoza Cruz', '+34 688 654 321', 'alejandro.mendoza@email.com'),
(15, 'Beatriz Ramos Ortega', '+34 699 098 765', 'beatriz.ramos@email.com'),
-- Asistentes VIP adicionales (16-35)
(16, 'María José Rodríguez Luna', '+34 600 111 222', 'mariajose.rodriguez@email.com'),
(17, 'Fernando López Castell', '+34 611 333 444', 'fernando.lopez@email.com'),
(18, 'Isabella García Moreno', '+34 622 555 666', 'isabella.garcia@email.com'),
(19, 'Santiago Ruiz Vega', '+34 633 777 888', 'santiago.ruiz@email.com'),
(20, 'Valentina Jiménez Torres', '+34 644 999 000', 'valentina.jimenez@email.com'),
(21, 'Maximiliano Herrera', '+34 655 111 333', 'maximiliano.herrera@email.com'),
(22, 'Esperanza Morales Blanco', '+34 666 444 555', 'esperanza.morales@email.com'),
(23, 'Rodrigo Sánchez Prieto', '+34 677 666 777', 'rodrigo.sanchez@email.com'),
(24, 'Camila Fernández Rey', '+34 688 888 999', 'camila.fernandez@email.com'),
(25, 'Sebastián Valle Montero', '+34 699 000 111', 'sebastian.valle@email.com'),
(26, 'Lucía Delgado Silva', '+34 600 222 333', 'lucia.delgado@email.com'),
(27, 'Gabriel Romero Pérez', '+34 611 444 555', 'gabriel.romero@email.com'),
(28, 'Aurora Castillo Ramos', '+34 622 666 777', 'aurora.castillo@email.com'),
(29, 'Nicolás Guerrero Ortiz', '+34 633 888 999', 'nicolas.guerrero@email.com'),
(30, 'Sofía Mendez Aguilar', '+34 644 000 222', 'sofia.mendez@email.com'),
(31, 'Matías Vásquez Cruz', '+34 655 333 444', 'matias.vasquez@email.com'),
(32, 'Celeste Moreno López', '+34 666 555 666', 'celeste.moreno@email.com'),
(33, 'Leonardo Soto Herrera', '+34 677 777 888', 'leonardo.soto@email.com'),
(34, 'Antonella Peña Vargas', '+34 688 999 000', 'antonella.pena@email.com'),
(35, 'Joaquín Flores Medina', '+34 699 111 333', 'joaquin.flores@email.com');

-- Insertar TODAS las Entradas (originales + nuevas)
INSERT INTO Entrada (id, evento_id, asistente_id, precio_pagado, fecha_compra) VALUES
-- Entradas originales
(1, 1, 1, 45.00, '2024-01-15 10:30:00'),
(2, 1, 2, 45.00, '2024-01-20 14:45:00'),
(3, 1, 3, 45.00, '2024-02-01 09:15:00'),
(4, 1, 7, 45.00, '2024-02-10 16:20:00'),
(5, 2, 4, 55.00, '2024-02-05 11:00:00'),
(6, 2, 5, 55.00, '2024-02-12 15:30:00'),
(7, 2, 8, 55.00, '2024-03-01 12:45:00'),
(8, 3, 6, 35.00, '2024-03-15 13:20:00'),
(9, 3, 9, 35.00, '2024-04-01 10:10:00'),
(10, 3, 10, 35.00, '2024-04-15 17:30:00'),
(11, 3, 11, 35.00, '2024-04-20 14:00:00'),
(12, 4, 12, 25.00, '2024-04-10 16:45:00'),
(13, 4, 13, 25.00, '2024-05-01 11:30:00'),
(14, 5, 14, 65.00, '2024-05-20 09:45:00'),
(15, 5, 15, 65.00, '2024-06-01 18:20:00'),
(16, 5, 1, 65.00, '2024-06-10 12:15:00'),
(17, 5, 2, 65.00, '2024-06-15 14:50:00'),
(18, 8, 3, 40.00, '2024-08-15 10:00:00'),
(19, 8, 4, 40.00, '2024-09-01 15:30:00'),
(20, 10, 5, 38.00, '2024-10-20 11:45:00'),
(21, 11, 6, 48.00, '2024-01-25 13:20:00'),
(22, 11, 7, 48.00, '2024-02-03 16:15:00'),
(23, 12, 8, 32.00, '2024-04-18 14:30:00'),
(24, 13, 9, 42.00, '2024-06-25 12:00:00'),
(25, 13, 10, 42.00, '2024-07-01 17:45:00'),

-- Entradas ADICIONALES para eventos populares
-- Evento 1: Manu Chao (muy popular) - más entradas
(26, 1, 16, 45.00, '2024-01-16 08:30:00'),
(27, 1, 17, 45.00, '2024-01-17 09:45:00'),
(28, 1, 18, 45.00, '2024-01-18 11:20:00'),
(29, 1, 19, 45.00, '2024-01-19 13:15:00'),
(30, 1, 20, 45.00, '2024-01-20 15:30:00'),
(31, 1, 21, 45.00, '2024-01-21 16:45:00'),
(32, 1, 22, 45.00, '2024-01-22 18:00:00'),
(33, 1, 23, 45.00, '2024-01-23 19:30:00'),
(34, 1, 24, 45.00, '2024-01-24 20:15:00'),
(35, 1, 25, 45.00, '2024-01-25 21:00:00'),

-- Evento 2: Pablo Alborán (también muy popular)
(36, 2, 26, 55.00, '2024-02-06 10:00:00'),
(37, 2, 27, 55.00, '2024-02-07 11:30:00'),
(38, 2, 28, 55.00, '2024-02-08 13:15:00'),
(39, 2, 29, 55.00, '2024-02-09 14:45:00'),
(40, 2, 30, 55.00, '2024-02-10 16:20:00'),
(41, 2, 31, 55.00, '2024-02-11 17:50:00'),
(42, 2, 32, 55.00, '2024-02-12 19:10:00'),
(43, 2, 33, 55.00, '2024-02-13 20:30:00'),
(44, 2, 34, 55.00, '2024-02-14 21:45:00'),
(45, 2, 35, 55.00, '2024-02-15 22:15:00'),

-- Evento 5: Rosalía (evento estrella) - sold out
(46, 5, 26, 65.00, '2024-05-21 07:00:00'),
(47, 5, 27, 65.00, '2024-05-22 08:15:00'),
(48, 5, 28, 65.00, '2024-05-23 09:30:00'),
(49, 5, 29, 65.00, '2024-05-24 10:45:00'),
(50, 5, 30, 65.00, '2024-05-25 12:00:00'),
(51, 5, 31, 65.00, '2024-05-26 13:30:00'),
(52, 5, 32, 65.00, '2024-05-27 15:00:00'),
(53, 5, 33, 65.00, '2024-05-28 16:15:00'),
(54, 5, 34, 65.00, '2024-05-29 17:30:00'),
(55, 5, 35, 65.00, '2024-05-30 18:45:00'),
(56, 5, 16, 65.00, '2024-05-31 19:15:00'),
(57, 5, 17, 65.00, '2024-06-01 20:00:00'),
(58, 5, 18, 65.00, '2024-06-02 20:30:00'),
(59, 5, 19, 65.00, '2024-06-03 21:00:00'),
(60, 5, 20, 65.00, '2024-06-04 21:30:00'),

-- Teatro también popular
(61, 3, 21, 35.00, '2024-03-16 14:30:00'),
(62, 3, 22, 35.00, '2024-03-17 15:45:00'),
(63, 3, 23, 35.00, '2024-03-18 16:20:00'),
(64, 3, 24, 35.00, '2024-03-19 17:00:00'),
(65, 3, 25, 35.00, '2024-03-20 18:15:00'),
(66, 3, 26, 35.00, '2024-03-21 19:30:00'),
(67, 3, 27, 35.00, '2024-03-22 20:00:00'),

-- Evento 8: Ana Belén (leyenda)
(68, 8, 28, 40.00, '2024-08-16 11:00:00'),
(69, 8, 29, 40.00, '2024-08-17 12:15:00'),
(70, 8, 30, 40.00, '2024-08-18 13:30:00'),
(71, 8, 31, 40.00, '2024-08-19 14:45:00'),
(72, 8, 32, 40.00, '2024-08-20 16:00:00'),
(73, 8, 33, 40.00, '2024-08-21 17:15:00'),
(74, 8, 34, 40.00, '2024-08-22 18:30:00'),
(75, 8, 35, 40.00, '2024-08-23 19:45:00'),

-- Más ventas para otros eventos
(76, 10, 16, 38.00, '2024-10-21 10:30:00'),
(77, 10, 17, 38.00, '2024-10-22 11:45:00'),
(78, 10, 18, 38.00, '2024-10-23 13:00:00'),
(79, 11, 19, 48.00, '2024-01-26 14:15:00'),
(80, 11, 20, 48.00, '2024-01-27 15:30:00'),
(81, 11, 21, 48.00, '2024-01-28 16:45:00'),
(82, 12, 22, 32.00, '2024-04-19 12:00:00'),
(83, 12, 23, 32.00, '2024-04-20 13:15:00'),
(84, 13, 24, 42.00, '2024-06-26 18:30:00'),
(85, 13, 25, 42.00, '2024-06-27 19:45:00');

-- Insertar TODAS las Valoraciones (SIN DUPLICADOS)
INSERT INTO Valoracion (id, evento_id, asistente_id, nota, comentario) VALUES
-- Valoraciones originales del seed
(1, 1, 1, 5, 'Increíble concierto, Manu Chao sigue siendo genial'),
(2, 1, 2, 4, 'Muy buena música, aunque el sonido podría mejorar'),
(3, 1, 3, 5, 'Una experiencia única, repetiría sin dudarlo'),
(4, 2, 4, 4, 'Pablo Alborán como siempre, emotivo y profesional'),
(5, 2, 5, 5, 'Su mejor concierto hasta la fecha'),
(6, 3, 6, 3, 'Buena interpretación pero la acústica no ayudó'),
(7, 3, 9, 4, 'Excelente puesta en escena del clásico'),
(8, 3, 10, 4, 'Teatro de primer nivel, muy recomendable'),
(9, 4, 12, 4, 'Interesante adaptación contemporánea de Lorca'),
(10, 4, 13, 3, 'Experimental pero efectiva'),
(11, 5, 14, 5, 'Rosalía es simplemente espectacular'),
(12, 5, 15, 5, 'Show visual impresionante'),
-- NOTA: Removido (5, 1, 4) porque causaba conflicto con (5, 14, 5)
(13, 8, 3, 5, 'Ana Belén, una leyenda en vivo'),
(14, 11, 6, 4, 'Versión acústica muy emotiva'),
(15, 11, 7, 5, 'Pablo Alborán en su mejor versión'),
(16, 12, 8, 2, 'No me convenció esta versión del clásico'),
(17, 13, 9, 3, 'Buen ambiente pero esperaba más del artista'),
(18, 13, 10, 4, 'Festival bien organizado, buena experiencia'),

-- Nuevas valoraciones ÉPICAS (evitando duplicados)
-- Evento 1: Manu Chao - valoraciones épicas
(19, 1, 16, 5, '🔥 ESPECTACULAR! Manu Chao sigue siendo el rey de la world music!'),
(20, 1, 17, 5, 'Una experiencia mágica. La energía del público era increíble 🎵'),
(21, 1, 18, 4, 'Muy bueno, aunque esperaba que tocara más canciones clásicas'),
(22, 1, 19, 5, '¡Qué noche más épica! Cantamos todos juntos durante 3 horas'),
(23, 1, 20, 5, 'Perfecto. Sound system brutal y Manu en su mejor forma'),
(24, 1, 21, 4, 'Genial como siempre, solo que el venue estaba un poco abarrotado'),
(25, 1, 22, 5, 'BRUTAL 🤘 La mezcla de idiomas y culturas fue sublime'),

-- Evento 2: Pablo Alborán - valoraciones emotivas
(26, 2, 26, 5, 'Me emocioné hasta las lágrimas. Pablo es pura sensibilidad ❤️'),
(27, 2, 27, 5, 'Su voz en vivo es aún más impresionante que en estudio'),
(28, 2, 28, 4, 'Concierto íntimo y precioso, aunque un poco corto'),
(29, 2, 29, 5, 'Cada canción fue un viaje emocional. Artista de otro nivel'),
(30, 2, 30, 4, 'Muy buena producción y gran conexión con el público'),
(31, 2, 31, 5, 'Pablo Alborán = garantía de calidad. No decepciona nunca'),

-- Evento 5: Rosalía - valoraciones de otro planeta (evitando conflicto)
(32, 5, 26, 5, '🚀 ROSALÍA ES DE OTRO PLANETA! Show visual alucinante!'),
(33, 5, 27, 5, 'La REINA del flamenco urbano. Cada movimiento es arte puro'),
(34, 5, 28, 5, 'MOTOMAMI tour fue lo más épico que he visto en mi vida'),
(35, 5, 29, 4, 'Increíble artista, aunque los precios están por las nubes'),
(36, 5, 30, 5, 'Coreografías de infarto + voz prodigiosa = PERFECCIÓN ✨'),
(37, 5, 31, 5, 'Rosalía redefinió lo que es un concierto. Puro arte contemporáneo'),
(38, 5, 32, 5, 'La fusión musical más brutal que existe. ROSALÍA FOREVER! 💃'),
-- NOTA: Cambiado (5, 1) por (5, 2) para evitar duplicado
(39, 5, 2, 4, 'Espectáculo visual impresionante, pero muy mainstream para mi gusto'),

-- Teatro: Don Juan Tenorio - valoraciones cultas
(40, 3, 21, 4, 'Excelente adaptación contemporánea del clásico de Zorrilla'),
(41, 3, 22, 5, 'Teatro de primer nivel. Los actores brillaron en cada escena'),
(42, 3, 23, 3, 'Buena puesta en escena pero algunas partes se hicieron largas'),
(43, 3, 24, 5, 'Emocionante desde el primer acto. El teatro sigue vivo! 🎭'),
(44, 3, 25, 4, 'Versión moderna muy acertada. Gran trabajo de dirección'),

-- Ana Belén - valoraciones de respeto y admiración
(45, 8, 28, 5, 'UNA LEYENDA VIVIENTE. 50 años de carrera y sigue brillando ⭐'),
(46, 8, 29, 5, 'Qué privilegio escuchar a Ana Belén en vivo. Pura historia musical'),
(47, 8, 30, 4, 'Voz impecable a sus años. Una masterclass de interpretación'),
(48, 8, 31, 5, 'Cada canción un clásico. Ana Belén = patrimonio cultural español'),
-- NOTA: Ya existe (8, 3) como ID 13, agregando otro asistente
(49, 8, 4, 5, 'Emocionante y nostálgica. Los clásicos nunca pasan de moda'),

-- Valoraciones variadas para otros eventos
(50, 10, 16, 3, 'Evento correcto pero nada especial. Faltó más energía'),
(51, 10, 17, 4, 'Buen ambiente y organización. Repetiría la experiencia'),
(52, 11, 19, 5, 'Pablo en versión acústica es simplemente mágico 🎸'),
(53, 11, 20, 4, 'Intimista y emotivo. Perfecto para desconectar del mundo'),
(54, 12, 22, 2, 'No me convenció esta versión experimental del clásico 😕'),
(55, 13, 24, 4, 'Festival bien curado con artistas emergentes interesantes'),
(56, 13, 25, 3, 'Buena organización pero algunos artistas no estuvieron a la altura');

-- ===================================
-- CREAR VISTAS
-- ===================================

-- Vista de eventos enriquecidos con toda la información relacionada
CREATE OR REPLACE VIEW vw_eventos_enriquecidos AS
SELECT 
    e.id as evento_id,
    e.nombre as evento_nombre,
    e.fecha_hora,
    e.precio_entrada,
    e.descripcion as evento_descripcion,
    
    -- Información de la actividad
    a.id as actividad_id,
    a.nombre as actividad_nombre,
    a.tipo,
    a.subtipo,
    
    -- Información de la ubicación
    u.id as ubicacion_id,
    u.nombre as ubicacion_nombre,
    u.direccion,
    u.ciudad,
    u.aforo,
    u.precio_alquiler,
    u.caracteristicas,
    
    -- Estadísticas de ventas
    COALESCE(ventas.entradas_vendidas, 0) as entradas_vendidas,
    COALESCE(ventas.facturacion, 0) as facturacion,
    
    -- Estadísticas de valoración
    COALESCE(valoraciones.nota_media, 0) as nota_media,
    COALESCE(valoraciones.total_valoraciones, 0) as total_valoraciones

FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
LEFT JOIN (
    SELECT 
        evento_id,
        COUNT(*) as entradas_vendidas,
        SUM(precio_pagado) as facturacion
    FROM Entrada
    GROUP BY evento_id
) ventas ON e.id = ventas.evento_id
LEFT JOIN (
    SELECT 
        evento_id,
        AVG(nota) as nota_media,
        COUNT(*) as total_valoraciones
    FROM Valoracion
    GROUP BY evento_id
) valoraciones ON e.id = valoraciones.evento_id;

-- Vista de ventas por evento (versión simplificada)
CREATE OR REPLACE VIEW vw_ventas_evento AS
SELECT 
    e.id as evento_id,
    e.nombre as evento_nombre,
    u.ciudad,
    e.fecha_hora,
    COALESCE(COUNT(en.id), 0) as entradas_vendidas,
    COALESCE(SUM(en.precio_pagado), 0) as facturacion
FROM Evento e
JOIN Ubicacion u ON e.ubicacion_id = u.id
LEFT JOIN Entrada en ON e.id = en.evento_id
GROUP BY e.id, e.nombre, u.ciudad, e.fecha_hora;

-- Vista de artistas por actividad
CREATE OR REPLACE VIEW vw_artistas_por_actividad AS
SELECT 
    a.id as actividad_id,
    a.nombre as actividad_nombre,
    a.tipo,
    a.subtipo,
    COUNT(aa.artista_id) as artistas_count,
    GROUP_CONCAT(ar.nombre ORDER BY ar.nombre SEPARATOR ', ') as artistas_nombres
FROM Actividad a
LEFT JOIN Actividad_Artista aa ON a.id = aa.actividad_id
LEFT JOIN Artista ar ON aa.artista_id = ar.id
GROUP BY a.id, a.nombre, a.tipo, a.subtipo;

-- Vista de estadísticas generales por ciudad
CREATE OR REPLACE VIEW vw_estadisticas_ciudad AS
SELECT 
    u.ciudad,
    COUNT(DISTINCT e.id) as total_eventos,
    COUNT(DISTINCT u.id) as total_ubicaciones,
    COALESCE(SUM(ventas.entradas_vendidas), 0) as total_entradas_vendidas,
    COALESCE(SUM(ventas.facturacion), 0) as facturacion_total,
    COALESCE(AVG(valoraciones.nota_media), 0) as nota_media_ciudad
FROM Ubicacion u
LEFT JOIN Evento e ON u.id = e.ubicacion_id
LEFT JOIN (
    SELECT evento_id, COUNT(*) as entradas_vendidas, SUM(precio_pagado) as facturacion
    FROM Entrada 
    GROUP BY evento_id
) ventas ON e.id = ventas.evento_id
LEFT JOIN (
    SELECT evento_id, AVG(nota) as nota_media
    FROM Valoracion 
    GROUP BY evento_id
) valoraciones ON e.id = valoraciones.evento_id
GROUP BY u.ciudad;

-- Vista de eventos próximos (eventos futuros)
CREATE OR REPLACE VIEW vw_eventos_proximos AS
SELECT 
    e.id as evento_id,
    e.nombre as evento_nombre,
    e.fecha_hora,
    e.precio_entrada,
    a.nombre as actividad_nombre,
    a.tipo,
    u.nombre as ubicacion_nombre,
    u.ciudad,
    u.aforo,
    COALESCE(ventas.entradas_vendidas, 0) as entradas_vendidas,
    CASE 
        WHEN u.aforo > 0 THEN ROUND((COALESCE(ventas.entradas_vendidas, 0) / u.aforo) * 100, 2)
        ELSE 0
    END as porcentaje_ocupacion
FROM Evento e
JOIN Actividad a ON e.actividad_id = a.id
JOIN Ubicacion u ON e.ubicacion_id = u.id
LEFT JOIN (
    SELECT evento_id, COUNT(*) as entradas_vendidas
    FROM Entrada 
    GROUP BY evento_id
) ventas ON e.id = ventas.evento_id
WHERE e.fecha_hora > NOW()
ORDER BY e.fecha_hora ASC;

-- ===================================
-- ESTADÍSTICAS FINALES
-- ===================================
SELECT 'Base de datos ArteVida Cultural creada exitosamente!' as mensaje;
SELECT COUNT(*) as total_artistas FROM Artista;
SELECT COUNT(*) as total_asistentes FROM Asistente;
SELECT COUNT(*) as total_eventos FROM Evento;
SELECT COUNT(*) as total_entradas FROM Entrada;
SELECT COUNT(*) as total_valoraciones FROM Valoracion;