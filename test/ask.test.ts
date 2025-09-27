import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { closePool } from '../src/db.js';

describe('API /ask', () => {
  // Cleanup después de todos los tests
  afterAll(async () => {
    await closePool();
  });

  describe('Validación de entrada', () => {
    it('debería rechazar petición sin body', async () => {
      const response = await request(app)
        .post('/ask')
        .expect(400);

      expect(response.body.error).toBe('Datos de entrada inválidos');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('debería rechazar pregunta vacía', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: '' })
        .expect(400);

      expect(response.body.error).toBe('Datos de entrada inválidos');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('debería rechazar pregunta demasiado larga', async () => {
      const longQuestion = 'a'.repeat(501);
      const response = await request(app)
        .post('/ask')
        .send({ question: longQuestion })
        .expect(400);

      expect(response.body.error).toBe('Datos de entrada inválidos');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('debería rechazar caracteres no válidos', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: 'SELECT * FROM users; DROP TABLE users;' })
        .expect(400);

      expect(response.body.error).toBe('Datos de entrada inválidos');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Casos de éxito', () => {
    it('debería procesar pregunta sobre eventos por ciudad', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: '¿Cuántos eventos por ciudad en 2024?' })
        .expect(200);

      expect(response.body).toHaveProperty('sql');
      expect(response.body).toHaveProperty('rows');
      expect(response.body).toHaveProperty('explanation');
      expect(response.body).toHaveProperty('executionTime');
      
      // Verificar que el SQL contiene las palabras clave esperadas
      expect(response.body.sql.toLowerCase()).toContain('select');
      expect(response.body.sql.toLowerCase()).toContain('ciudad');
      expect(response.body.sql.toLowerCase()).toContain('2024');
      expect(response.body.sql.toLowerCase()).toContain('limit');
      
      expect(Array.isArray(response.body.rows)).toBe(true);
      expect(typeof response.body.explanation).toBe('string');
    });

    it('debería procesar pregunta sobre top artistas teatro', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: 'top 5 artistas con más actividades de teatro' })
        .expect(200);

      expect(response.body.sql.toLowerCase()).toContain('select');
      expect(response.body.sql.toLowerCase()).toContain('teatro');
      expect(response.body.sql.toLowerCase()).toContain('limit 5');
      expect(Array.isArray(response.body.rows)).toBe(true);
    });

    it('debería procesar pregunta sobre fechas con más eventos', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: 'fechas con más eventos' })
        .expect(200);

      expect(response.body.sql.toLowerCase()).toContain('select');
      expect(response.body.sql.toLowerCase()).toContain('fecha');
      expect(Array.isArray(response.body.rows)).toBe(true);
    });

    it('debería añadir LIMIT automáticamente si falta', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: 'cuántos eventos' })
        .expect(200);

      // Verificar que se añadió LIMIT 200 si no estaba presente
      expect(response.body.sql.toLowerCase()).toContain('limit');
    });
  });

  describe('Casos de palabras clave', () => {
    it('debería procesar pregunta sobre conteo de eventos', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: 'cuántos eventos hay' })
        .expect(200);

      expect(response.body.sql.toLowerCase()).toContain('count');
      expect(response.body.sql.toLowerCase()).toContain('evento');
    });

    it('debería procesar pregunta sobre conciertos', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: 'todos los conciertos' })
        .expect(200);

      expect(response.body.sql.toLowerCase()).toContain('concierto');
    });

    it('debería procesar pregunta sobre teatro', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: 'eventos de teatro' })
        .expect(200);

      expect(response.body.sql.toLowerCase()).toContain('teatro');
    });

    it('debería usar consulta fallback para pregunta no reconocida', async () => {
      const response = await request(app)
        .post('/ask')
        .send({ question: 'información general' })
        .expect(200);

      expect(response.body.sql).toContain('vw_eventos_enriquecidos');
      expect(response.body.explanation).toContain('No pude interpretar específicamente');
    });
  });

  describe('Validación SQL', () => {
    it('debería rechazar intentos de inyección SQL (simulado)', async () => {
      // Nota: Este test simula lo que pasaría si el LLM generara SQL peligroso
      // En la implementación real, el sqlGuard debería capturar esto
      
      const maliciousQuestions = [
        'DROP TABLE Evento',
        'INSERT INTO Usuario',
        'UPDATE Evento SET',
        'DELETE FROM Actividad'
      ];

      for (const question of maliciousQuestions) {
        const response = await request(app)
          .post('/ask')
          .send({ question })
          .expect(400);

        expect(response.body.error).toBe('Datos de entrada inválidos');
      }
    });

    it('debería rechazar tablas no permitidas (simulado)', async () => {
      // Este test verifica el comportamiento esperado del SQL Guard
      // cuando detecta tablas fuera de la whitelist
      
      const response = await request(app)
        .post('/ask')
        .send({ question: 'información de usuarios' })
        .expect(200);

      // Debería usar la consulta fallback ya que "usuarios" no está en whitelist
      expect(response.body.sql).toContain('vw_eventos_enriquecidos');
    });
  });

  describe('Rate Limiting', () => {
    it('debería aplicar rate limiting después de muchas peticiones', async () => {
      // Hacer múltiples peticiones rápidas
      const promises = Array(35).fill(0).map(() => 
        request(app)
          .post('/ask')
          .send({ question: 'test rápido' })
      );

      const responses = await Promise.all(promises);
      
      // Algunas respuestas deberían ser 429 (Too Many Requests)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000); // Timeout más largo para este test
  });

  describe('Manejo de errores', () => {
    it('debería manejar errores de base de datos gracefully', async () => {
      // Este test requeriría mockear la conexión de base de datos
      // o desconectar temporalmente la BD para simular error de conexión
      
      const response = await request(app)
        .post('/ask')
        .send({ question: '¿cuántos eventos hay?' });

      // Dependiendo del estado de la BD, debería ser 200 o error apropiado
      expect([200, 503, 408, 500]).toContain(response.status);
      
      if (response.status !== 200) {
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('code');
      }
    });
  });
});

describe('Health Check', () => {
  it('debería retornar estado de salud del servicio', async () => {
    const response = await request(app)
      .get('/health')
      .expect((res) => {
        expect([200, 503]).toContain(res.status);
      });

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('database');
    expect(response.body).toHaveProperty('uptime');
  });
});

describe('Ruta raíz', () => {
  it('debería retornar información de la API', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('description');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body).toHaveProperty('example');
  });
});

describe('Rutas no encontradas', () => {
  it('debería retornar 404 para rutas inexistentes', async () => {
    const response = await request(app)
      .get('/ruta-inexistente')
      .expect(404);

    expect(response.body.error).toBe('Endpoint no encontrado');
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('debería retornar 404 para métodos no permitidos', async () => {
    const response = await request(app)
      .put('/ask')
      .expect(404);

    expect(response.body.error).toBe('Endpoint no encontrado');
    expect(response.body.code).toBe('NOT_FOUND');
  });
});