import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { spawn, spawnSync } from 'child_process';

interface AskResponse {
  sql: string;
  rows: any[];
  explanation: string;
  naturalResponse: string;
  executionTime: number;
}

async function main() {
  const baseUrl = process.env.ASK_URL || 'http://localhost:3000/api/chat';
  const promptsPath = path.resolve('scripts', 'prompts_100.txt');
  const outJson = path.resolve('scripts', 'prompts_results.json');
  const outCsv = path.resolve('scripts', 'prompts_summary.csv');

  const file = fs.readFileSync(promptsPath, 'utf8');
  const lines = file.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  const results: Array<{index:number, question:string, ok:boolean, status:number, error?:string, sql?:string, rows?:number, timeMs?:number}> = [];

  // Opcional: arrancar servidor automáticamente
  const autoStart = (process.env.START_SERVER || 'true').toLowerCase() !== 'false';
  let serverProc: ReturnType<typeof spawn> | null = null;

  // Construir si no existe dist/index.js
  const distIndex = path.resolve('dist', 'index.js');
  if (autoStart && !fs.existsSync(distIndex)) {
    console.log('Compilando proyecto (dist/index.js no encontrado)...');
    const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', '-s', 'build'], { stdio: 'inherit' });
    if (r.status !== 0) {
      console.error('Fallo al compilar el proyecto. Aborto.');
      process.exit(1);
    }
  }

  if (autoStart) {
    console.log('Iniciando servidor local en segundo plano...');
    serverProc = spawn(process.execPath, [distIndex], {
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
      stdio: ['ignore', 'inherit', 'inherit']
    });
  }

  // Esperar health
  const healthUrl = baseUrl.replace(/\/chat$/, '/health');
  const startTs = Date.now();
  let healthy = false;
  for (let i = 0; i < 40; i++) { // hasta ~20s
    try {
      const res = await fetch(healthUrl, { method: 'GET' });
      if (res.ok) {
        healthy = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  if (!healthy) {
    console.warn(`No se pudo verificar health en ${healthUrl} tras ${Date.now() - startTs}ms, continúo igualmente...`);
  }

  console.log(`Ejecutando ${lines.length} prompts contra ${baseUrl}...`);

  for (let i = 0; i < lines.length; i++) {
    const question = lines[i];
    const started = Date.now();
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const time = Date.now() - started;
      if (!res.ok) {
        const text = await res.text();
        console.warn(`#${i+1} FAIL ${res.status}: ${question} -> ${text}`);
        results.push({ index: i+1, question, ok: false, status: res.status, error: text, timeMs: time });
        continue;
      }
      const data = await res.json() as AskResponse;
      console.log(`#${i+1} OK (${res.status}) ${time}ms -> ${question}`);
      results.push({ index: i+1, question, ok: true, status: res.status, sql: data.sql, rows: data.rows?.length ?? 0, timeMs: time });
    } catch (e: any) {
      const time = Date.now() - started;
      console.error(`#${i+1} ERR: ${question} -> ${e?.message || e}`);
      results.push({ index: i+1, question, ok: false, status: 0, error: e?.message || String(e), timeMs: time });
    }
  }

  // Guardar JSON detallado
  fs.writeFileSync(outJson, JSON.stringify(results, null, 2), 'utf8');

  // Guardar CSV resumen
  const header = 'index,ok,status,rows,timeMs,question';
  const csv = [header, ...results.map(r => [r.index, r.ok, r.status, r.rows ?? '', r.timeMs ?? '', '"' + (r.question.replace(/"/g, '""')) + '"'].join(','))].join('\n');
  fs.writeFileSync(outCsv, csv, 'utf8');

  const ok = results.filter(r => r.ok).length;
  console.log(`\nResumen: ${ok}/${results.length} respuestas OK.`);
  console.log(`Resultados: ${outJson}`);
  console.log(`Resumen CSV: ${outCsv}`);

  // Cerrar servidor si lo arrancamos
  if (serverProc) {
    console.log('Deteniendo servidor...');
    try {
      serverProc.kill('SIGINT');
    } catch {}
  }
}

main().catch(err => {
  console.error('Fallo inesperado:', err);
  process.exit(1);
});
