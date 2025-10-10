import mysql from 'mysql2/promise';
import pino from 'pino';
import { config } from 'dotenv';

config();

const log = pino({ name: 'db-verify' });

async function withConn() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '13306', 10);
  const database = process.env.DB_NAME || 'artevida_cultural';
  const password = process.env.DB_ROOT_PASSWORD || 'rootpass123';
  const user = process.env.DB_USER || 'root';
  const conn = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true });
  return conn;
}

async function expectFail(conn: mysql.Connection, sql: string, params: any[] = [], label: string) {
  try {
    await conn.execute(sql, params);
    return { label, ok: false, msg: 'Expected failure, but succeeded' };
  } catch (e: any) {
    return { label, ok: true, msg: `Failed as expected (${e.code || e.errno || 'ERR'})` };
  }
}

async function expectPass<T = any[]>(conn: mysql.Connection, sql: string, params: any[] = [], label: string) {
  try {
    const [rows] = await conn.execute(sql, params);
    return { label, ok: true, rows } as { label: string; ok: true; rows: any };
  } catch (e: any) {
    return { label, ok: false, msg: e.message || e.code } as { label: string; ok: false; msg: string };
  }
}

async function main() {
  const results: Array<{ label: string; ok: boolean; msg?: string }> = [];
  let conn: mysql.Connection | null = null;
  try {
    conn = await withConn();

    // 1) Sanity: tables have data
    {
      const r = await expectPass(conn, 'SELECT COUNT(*) AS c FROM Actividad', [], 'Actividad has rows');
      results.push({ label: r.label, ok: r.ok, msg: r.ok ? `count=${(r.rows as any)[0].c}` : (r as any).msg });
    }

    // 2) CHECK: cache_acordado >= 0
    results.push(
      await expectFail(
        conn,
        'INSERT INTO Actividad_Artista (actividad_id, artista_id, cache_acordado) VALUES (1, 10, -1.00)',
        [],
        'Actividad_Artista CHECK cache_acordado >= 0'
      )
    );

    // 3) CHECK + NOT NULL: Ubicacion.aforo > 0
    results.push(
      await expectFail(
        conn,
        "INSERT INTO Ubicacion (nombre, ciudad, aforo, precio_alquiler) VALUES ('Test Aforo', 'X', 0, 10.0)",
        [],
        'Ubicacion CHECK aforo > 0'
      )
    );

    // 4) UNIQUE(email) Asistente
    results.push(
      await expectFail(
        conn,
        "INSERT INTO Asistente (nombre_completo, email) VALUES ('Dup', 'maria.gonzalez@email.com')",
        [],
        'Asistente UNIQUE email'
      )
    );

    // 5) Entrada constraints
    // 5a) UNIQUE(evento_id, asistente_id)
    results.push(
      await expectFail(
        conn,
        'INSERT INTO Entrada (evento_id, asistente_id, precio_pagado, fecha_compra) VALUES (1, 1, 10.00, NOW())',
        [],
        'Entrada UNIQUE (evento_id, asistente_id)'
      )
    );

    // 5b) CHECK precio_pagado >= 0
    results.push(
      await expectFail(
        conn,
        'INSERT INTO Entrada (evento_id, asistente_id, precio_pagado, fecha_compra) VALUES (4, 35, -1.00, NOW())',
        [],
        'Entrada CHECK precio_pagado >= 0'
      )
    );

    // 6) Trigger tests: default price and aforo enforcement
    // Create minimal data for a 1-seat event
    const [insUb]: any = await conn.execute(
      "INSERT INTO Ubicacion (nombre, ciudad, aforo, precio_alquiler) VALUES ('__VERIFY_VENUE__', 'VerifyCity', 1, 1.23)"
    );
    const ubId = insUb.insertId;
    const [insAct]: any = await conn.execute(
      "INSERT INTO Actividad (nombre, tipo, subtipo) VALUES ('__VERIFY_ACT__', 'teatro', 'verify')"
    );
    const actId = insAct.insertId;
    const [insEvt]: any = await conn.execute(
      "INSERT INTO Evento (nombre, actividad_id, ubicacion_id, precio_entrada, fecha_hora, descripcion) VALUES ('__VERIFY_EVT__', ?, ?, 11.00, NOW(), 'verify')",
      [actId, ubId]
    );
    const evtId = insEvt.insertId;
    const [insA1]: any = await conn.execute(
      "INSERT INTO Asistente (nombre_completo, email) VALUES ('__VERIFY_USER1__', '__verify_user1__@example.com')"
    );
    const a1 = insA1.insertId;
    const [insA2]: any = await conn.execute(
      "INSERT INTO Asistente (nombre_completo, email) VALUES ('__VERIFY_USER2__', '__verify_user2__@example.com')"
    );
    const a2 = insA2.insertId;

    // 6a) Insert entrada with NULL precio -> trigger sets to 11.00
    const [insEn1]: any = await conn.execute(
      'INSERT INTO Entrada (evento_id, asistente_id, precio_pagado, fecha_compra) VALUES (?, ?, NULL, NOW())',
      [evtId, a1]
    );
    const [rowPrecio]: any = await conn.execute(
      'SELECT precio_pagado FROM Entrada WHERE id = ?',
      [insEn1.insertId]
    );
    const precio = (rowPrecio[0] && rowPrecio[0][0] ? rowPrecio[0][0].precio_pagado : rowPrecio[0].precio_pagado) as any;
    const precioStr = typeof precio === 'string' ? precio : String(precio);
    results.push({ label: 'Trigger default precio_pagado', ok: precioStr.startsWith('11'), msg: `precio_pagado=${precioStr}` });

    // 6b) Aforo enforcement: second ticket should fail
    results.push(
      await expectFail(
        conn,
        'INSERT INTO Entrada (evento_id, asistente_id, precio_pagado, fecha_compra) VALUES (?, ?, 11.00, NOW())',
        [evtId, a2],
        'Trigger aforo enforcement'
      )
    );

    // 7) Valoracion composite FK + unique
    // 7a) Valoracion without Entrada should fail
    results.push(
      await expectFail(
        conn,
        'INSERT INTO Valoracion (evento_id, asistente_id, nota, comentario) VALUES (?, ?, 4, "x")',
        [evtId, a2],
        'Valoracion FK -> Entrada(evento_id, asistente_id)'
      )
    );

    // 7b) Duplicate valoracion should fail
    results.push(
      await expectFail(
        conn,
        'INSERT INTO Valoracion (evento_id, asistente_id, nota, comentario) VALUES (1, 1, 5, "dup")',
        [],
        'Valoracion UNIQUE (evento_id, asistente_id)'
      )
    );

    // 8) Views exist and return rows
    {
      const r1 = await expectPass(conn, 'SELECT 1 FROM vw_coste_actividad LIMIT 1', [], 'vw_coste_actividad works');
      results.push({ label: r1.label, ok: r1.ok, msg: r1.ok ? 'ok' : (r1 as any).msg });
      const r2 = await expectPass(conn, 'SELECT 1 FROM vw_eventos_enriquecidos LIMIT 1', [], 'vw_eventos_enriquecidos works');
      results.push({ label: r2.label, ok: r2.ok, msg: r2.ok ? 'ok' : (r2 as any).msg });
    }

    // Summarize
    const pass = results.filter(r => r.ok).length;
    const fail = results.length - pass;
    log.info({ total: results.length, pass, fail, results }, 'DB verification summary');
    if (fail > 0) process.exitCode = 1;
  } catch (e: any) {
    log.error({ err: e.message || e }, 'Verification crashed');
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
