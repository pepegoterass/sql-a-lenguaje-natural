import { spawnSync } from 'child_process';
import mysql from 'mysql2/promise';

function sh(cmd: string, args: string[], env?: NodeJS.ProcessEnv) {
  const isWin = process.platform === 'win32';
  const bin = isWin && cmd === 'npm' ? 'npm.cmd' : cmd;
  const res = spawnSync(bin, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with code ${res.status}`);
  }
}

async function waitForMySQL(host: string, port: number, user: string, password: string) {
  const start = Date.now();
  for (let i = 0; i < 60; i++) {
    try {
      const conn = await mysql.createConnection({ host, port, user, password });
      await conn.ping();
      await conn.end();
      return;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`MySQL not ready at ${host}:${port} after ${Date.now() - start}ms`);
}

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '13306', 10);
  const rootPass = process.env.DB_ROOT_PASSWORD || 'rootpass123';

  // 1) Docker up only DB
  sh('docker', ['compose', 'up', '-d', 'db']);

  // 2) Wait until MySQL is ready
  await waitForMySQL(host, port, 'root', rootPass);

  // 3) Run migrations (creates schema, views, RO user)
  sh(process.execPath, ['-e', "import('tsx').then(()=>import('./src/migrate.ts'))"], process.env);

  // 4) Run seed (data + views)
  sh(process.execPath, ['-e', "import('tsx').then(()=>import('./src/seed.ts'))"], process.env);

  // 5) Build backend (optional but useful)
  try {
    sh('npm', ['run', '-s', 'build']);
  } catch (e) {
    console.warn('Warning: build step failed, but migrations and seed completed. You can run `npm run build` manually later.');
  }

  console.log('\nSetup completed successfully. You can now run: npm start');
}

main().catch(err => { console.error(err); process.exit(1); });
