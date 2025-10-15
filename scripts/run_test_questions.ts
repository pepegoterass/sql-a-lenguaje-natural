import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { spawn, spawnSync } from 'child_process';

const TEST_QUESTIONS: string[] = [
  '¿Cuántos eventos por ciudad en 2024?',
  'top 5 artistas con más actividades de teatro',
  'fechas con más eventos',
  'cuántos eventos',
  'cuántos eventos hay',
  'todos los conciertos',
  'eventos de teatro',
  'información general',
  'test rápido' // se usa en rate limiting, aquí solo para comprobar respuesta simple
];

interface AskResponse { sql: string; rows: any[]; explanation: string; executionTime: number; }

async function waitForHealth(baseApi: string): Promise<void> {
  const healthUrl = baseApi + '/health';
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
}

async function main() {
  const baseUrl = process.env.ASK_URL || 'http://localhost:3000/api/chat';
  const outJson = path.resolve('scripts', 'test_questions_results.json');
  const outCsv = path.resolve('scripts', 'test_questions_summary.csv');

  // auto build+start
  const distIndex = path.resolve('dist', 'index.js');
  if (!fs.existsSync(distIndex)) {
    console.log('Compilando proyecto...');
    const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', '-s', 'build'], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(1);
  }
  console.log('Iniciando servidor...');
  const serverProc = spawn(process.execPath, [distIndex], { stdio: ['ignore','inherit','inherit'], env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' } });

  await waitForHealth(baseUrl.replace(/\/chat$/, ''));

  const results: Array<{question:string, ok:boolean, status:number, sql?:string, rows?:number, error?:string}> = [];
  for (const question of TEST_QUESTIONS) {
    try {
      const res = await fetch(baseUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question })});
      if (!res.ok) {
        const text = await res.text();
        console.warn(`FAIL ${res.status}: ${question} -> ${text}`);
        results.push({ question, ok:false, status: res.status, error: text });
        continue;
      }
      const data = await res.json() as AskResponse;
      console.log(`OK ${res.status}: ${question}`);
      results.push({ question, ok:true, status: res.status, sql: data.sql, rows: data.rows?.length ?? 0 });
    } catch (e: any) {
      results.push({ question, ok:false, status: 0, error: e?.message || String(e) });
    }
  }

  fs.writeFileSync(outJson, JSON.stringify(results, null, 2), 'utf8');
  const header = 'ok,status,rows,question';
  const csv = [header, ...results.map(r => [r.ok, r.status, r.rows ?? '', '"' + r.question.replace(/"/g,'""') + '"'].join(','))].join('\n');
  fs.writeFileSync(outCsv, csv, 'utf8');

  console.log(`Resumen: ${results.filter(r=>r.ok).length}/${results.length} OK`);
  console.log(`Resultados: ${outJson}`);
  console.log(`Resumen CSV: ${outCsv}`);

  try { serverProc.kill('SIGINT'); } catch {}
}

main().catch(err => { console.error(err); process.exit(1); });
