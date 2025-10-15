import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { closePool } from '../src/db.js';

describe('NL→SQL canonical queries', () => {
  afterAll(async () => {
    await closePool();
  });

  it('1) coste de cachés por actividad', async () => {
    const res = await request(app).post('/ask').send({ question: 'gasto de cachés por actividad' });
    expect(res.status).toBe(200);
    expect(res.body.sql).toContain('vw_coste_actividad');
  });

  it('2) eventos enriquecidos', async () => {
    const res = await request(app).post('/ask').send({ question: 'muéstrame eventos con ventas y valoraciones' });
    expect(res.status).toBe(200);
    expect(res.body.sql).toContain('vw_eventos_enriquecidos');
  });

  it('3) estadísticas por ciudad', async () => {
    const res = await request(app).post('/ask').send({ question: 'estadísticas por ciudad' });
    expect(res.status).toBe(200);
    expect(res.body.sql).toContain('vw_estadisticas_ciudad');
  });

  it('4) eventos próximos', async () => {
    const res = await request(app).post('/ask').send({ question: 'próximos eventos' });
    expect(res.status).toBe(200);
    expect(res.body.sql.toLowerCase()).toContain('vw_eventos_proximos');
  });

  it('5) ciudad con más eventos', async () => {
    const res = await request(app).post('/ask').send({ question: 'ciudad con más eventos' });
    expect(res.status).toBe(200);
    expect(res.body.sql.toLowerCase()).toContain('group by u.ciudad');
    expect(res.body.sql.toLowerCase()).toContain('limit 1');
  });

  it('6) ciudades con solo teatro', async () => {
    const res = await request(app).post('/ask').send({ question: 'ciudades con solo teatro' });
    expect(res.status).toBe(200);
    expect(res.body.sql).toContain("HAVING SUM(a.tipo <> 'teatro') = 0");
  });

  it('7) evento con más ceros', async () => {
    const res = await request(app).post('/ask').send({ question: 'evento con más ceros en valoraciones' });
    expect(res.status).toBe(200);
    expect(res.body.sql.toLowerCase()).toContain('where v.nota = 0');
    expect(res.body.sql.toLowerCase()).toContain('limit 1');
  });

  it('8) evento con mayor facturación', async () => {
    const res = await request(app).post('/ask').send({ question: 'evento con mayor facturación' });
    expect(res.status).toBe(200);
    expect(res.body.sql.toLowerCase()).toContain('sum(en.precio_pagado)');
    expect(res.body.sql.toLowerCase()).toContain('limit 1');
  });

  it('9) top facturación top 5', async () => {
    const res = await request(app).post('/ask').send({ question: 'top 5 eventos por facturación' });
    expect(res.status).toBe(200);
    expect(res.body.sql.toLowerCase()).toContain('limit 5');
  });

  it('10) media de valoraciones por evento', async () => {
    const res = await request(app).post('/ask').send({ question: 'media de valoraciones por evento' });
    expect(res.status).toBe(200);
    expect(res.body.sql.toLowerCase()).toContain('avg(v.nota)');
  });

  it('11) margen estimado por evento', async () => {
    const res = await request(app).post('/ask').send({ question: 'margen estimado por evento' });
    expect(res.status).toBe(200);
    expect(res.body.sql).toContain('vw_coste_actividad');
    expect(res.body.sql.toLowerCase()).toContain('margen_estimado');
  });

  it('12) porcentaje de ocupación próximos', async () => {
    const res = await request(app).post('/ask').send({ question: 'porcentaje de ocupación de los próximos eventos' });
    expect(res.status).toBe(200);
    expect(res.body.sql.toLowerCase()).toContain('where e.fecha_hora > now()');
  });

  it('13) artistas top por ingresos prorrateados', async () => {
    const res = await request(app).post('/ask').send({ question: 'artistas top por ingresos prorrateados' });
    expect(res.status).toBe(200);
    expect(res.body.sql.toLowerCase()).toContain('with ingresos_evento');
    expect(res.body.sql.toLowerCase()).toContain('artistas_por_actividad');
  });
});
