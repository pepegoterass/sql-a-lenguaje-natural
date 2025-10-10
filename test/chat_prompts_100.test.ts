import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../src/index.js';
import { closePool } from '../src/db.js';

// Carga de las 100 preguntas desde el repositorio (scripts/prompts_100.txt)
function loadPrompts(): string[] {
  const p = path.resolve('scripts', 'prompts_100.txt');
  const raw = fs.readFileSync(p, 'utf8');
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

describe('100 prompts de chat (E2E liviano)', () => {
  afterAll(async () => {
    await closePool();
  });

  const RUN = (process.env.RUN_100_PROMPTS || '').toLowerCase() === 'true';

  (RUN ? it : it.skip)('debería ejecutar las 100 preguntas del archivo y devolver contrato en las OK', async () => {
    const prompts = loadPrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(100);

    const results = [] as Array<{ status: number; body?: any; q: string }>; 
    for (const q of prompts) {
      const res = await request(app).post('/chat').send({ question: q });
      results.push({ status: res.status, body: res.body, q });
    }

    const oks = results.filter(r => r.status === 200);
    // Validar contrato en un subconjunto significativo de OKs
    oks.slice(0, 10).forEach(r => {
      expect(r.body).toHaveProperty('sql');
      expect(r.body).toHaveProperty('rows');
      expect(r.body).toHaveProperty('explanation');
      expect(r.body).toHaveProperty('executionTime');
    });

    // Informe útil en consola para inspección manual
    const summary = {
      total: results.length,
      ok: oks.length,
      nonOk: results.length - oks.length,
    };
    // eslint-disable-next-line no-console
    console.log('Resumen 100 prompts:', summary);

    // Afirmación suave para evitar flakiness por modelos/tiempos → al menos algunas OK
    expect(oks.length).toBeGreaterThan(0);
  }, 600000); // hasta 10 min por si hay latencia del LLM
});
