# ArteVida SQL Agent

Asistente de chat-to-SQL para la base de datos "artevida_cultural" con backend Node/Express + TypeScript y frontend React/Vite. Convierte lenguaje natural a consultas MySQL seguras, ejecuta la SQL y devuelve una respuesta natural en español.

## 🚀 Quick start (Windows / PowerShell)

1) Arranca la base de datos en Docker (expone MySQL en 13306):

```powershell
npm run docker:up
```

2) Ejecuta migraciones (crea tablas, vistas y usuario read-only):

```powershell
npm run migrate
```

3) Seed de datos (cross‑platform, sin cliente mysql):

```powershell
$env:DB_HOST="localhost"; $env:DB_PORT="13306"; $env:DB_NAME="artevida_cultural"; $env:DB_ROOT_PASSWORD="rootpass123"; npm run -s seed
```

4) Arranca la API (dev):

```powershell
npm run dev
```

5) Health check (navegador o PowerShell):

```powershell
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; for ($i=0; $i -lt 10; $i++) { try { $r = Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -TimeoutSec 2; if ($r.status) { Write-Output $r.status; exit 0 } } catch {} Start-Sleep -Milliseconds 500 }; exit 1"
```

6) Probar una pregunta:

```powershell
$body='{"question":"qué artistas tocan en madrid"}'; Invoke-RestMethod -Uri 'http://localhost:3000/ask' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 10 | ConvertTo-Json -Depth 6
```

Tip: Si el puerto 3000 está ocupado:

```powershell
$env:PORT="3001"; npm run dev
```

## Índice
- Introducción
- Arquitectura y flujo
- Esquema de BD (resumen)
- Capacidades conversacionales y salvavidas del backend
- API y contratos
- Puesta en marcha (local y Docker)
- Variables de entorno
- Árbol del proyecto
- Desarrollo (build, lint, test)
- Solución de problemas

## Introducción
ArteVida SQL Agent permite hacer preguntas como "conciertos de Rosalía", "precio del evento Velázquez y su Época" o "ventas por ciudad", generando SQL sobre MySQL 8 y mostrando una explicación legible.

## Arquitectura y flujo
- Web (React/Vite): interfaz de chat, muestra SQL y tabla de datos, y envía `conversationContext` (pares pregunta→SQL resultado) para mantener coherencia en seguimientos.
- Backend (Express TS):
  - Generación de SQL con OpenAI (gpt-4o-mini por defecto) o fallbacks locales.
  - Guard SQL: SELECT-only, whitelist de tablas/vistas, LIMIT auto, tolera alias.
  - Ejecuta la consulta en MySQL (mysql2) y genera respuesta natural con OpenAI (o fallback).
  - Atajos deterministas para casos comunes (ver más abajo).
- MySQL: esquema cultural con tablas Evento, Actividad, Artista, etc., y vistas enriquecidas.

## Esquema de BD (resumen)
Tablas:
- Actividad(id, nombre, tipo ENUM('concierto','exposicion','teatro','conferencia'), subtipo)
- Artista(id, nombre, biografia)
- Actividad_Artista(actividad_id, artista_id)
- Ubicacion(id, nombre, direccion, ciudad, aforo, precio_alquiler, caracteristicas)
- Evento(id, nombre, actividad_id, ubicacion_id, precio_entrada, fecha_hora, descripcion)
- Asistente(id, nombre_completo, telefono, email)
- Entrada(id, evento_id, asistente_id, precio_pagado, fecha_compra)
- Valoracion(id, evento_id, asistente_id, nota, comentario, fecha_valoracion)

Vistas clave:
- vw_eventos_enriquecidos(evento_id, evento_nombre, fecha_hora, precio_entrada, evento_descripcion, actividad_*, ubicacion_*, entradas_vendidas, facturacion, nota_media, total_valoraciones)
- vw_ventas_evento(evento_id, evento_nombre, ciudad, fecha_hora, entradas_vendidas, facturacion)
- vw_artistas_por_actividad(...)
- vw_estadisticas_ciudad(...)

## Capacidades conversacionales y salvavidas del backend
- Small talk: saluda de forma neutra y evita ejecutar SQL si no hay palabras de datos. "gracias" solo intercepta si es agradecimiento puro.
- Reutilización de contexto: si dices "precios de esos conciertos" después de "eventos de Rosalía", se copian los WHERE previos.
- Extractor de SQL: si el modelo devuelve texto+SQL en el campo `sql`, se recorta la SELECT antes de validar.
- Fallback heurístico: si no hay SELECT, se construye una SQL segura usando tokens (ciudad, tipo) y exclusiones de artista ("aparte de/excepto/menos/sin/que no").
- Atajos deterministas:
  - Precio del evento: resuelve "evento X" en `Evento.nombre` y devuelve `precio_entrada`.
  - Descripción del evento: reutiliza la última SQL para seleccionar `descripcion`/`evento_descripcion`.
  - Atributos del evento: precio/fecha/lugar/ciudad desde el contexto anterior sin regenerar toda la consulta.
  - Eventos de un artista: genera JOIN obligatorio Evento→Actividad→Actividad_Artista→Artista, con filtros por tipo (concierto) y ciudad opcional.

## API y contratos
POST /api/ask
- Request: { question: string, conversationContext?: { question, sql?, summary }[] }
- Response: { sql: string, rows: any[], explanation: string, naturalResponse: string, executionTime: number }

Validaciones SQL
- SELECT-only
- Whitelist de tablas/vistas: Actividad, Artista, Actividad_Artista, Ubicacion, Evento, Asistente, Entrada, Valoracion, vw_eventos_enriquecidos, vw_ventas_evento, vw_artistas_por_actividad, vw_estadisticas_ciudad
- LIMIT 200 si falta

## Puesta en marcha
Backend (local)
- Node ≥ 18
- Configura `.env` (opcional). Puedes copiar `.env.example` (usa `DB_PORT=13306` por defecto).
- `npm install` y `npm run dev`
- Si el puerto 3000 está ocupado, usa `PORT=3001`.

Frontend
- `cd web && npm install && npm run dev`
- Visita http://localhost:5173

Docker (solo base de datos)
- `docker compose up -d db`
- El servicio `db` expone `13306:3306` para evitar conflictos con MySQL local.

Script opcional de setup end‑to‑end

- Orquestador para automatizar Docker + migraciones + seed + build:

```powershell
npm run setup
```

Si prefieres hacerlo manual en desarrollo, usa el Quick start de arriba.

## Variables de entorno
- DB_HOST, DB_PORT, DB_NAME, DB_USER_RO, DB_PASS_RO
- DB_ROOT_PASSWORD (para migraciones/seed con root)
- OPENAI_API_KEY, OPENAI_MODEL (por defecto gpt-4o-mini)
- PORT (p.ej., 3001), NODE_ENV
- RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, SQL_TIMEOUT_MS, LOG_LEVEL

`.env.example` incluye valores listos para Docker (DB_PORT=13306). Copia a `.env` y ajusta lo necesario.

## Árbol del proyecto
```
.
├─ src/
│  ├─ index.ts               # Bootstrap Express, middlewares, rutas
│  ├─ ask.route.ts           # /api/ask: NL → SQL, atajos y validación
│  ├─ widgets.route.ts       # Widgets/KPIs agregados
│  ├─ openai.ts              # Lógica con OpenAI (SQL y respuesta natural)
│  ├─ sqlGuard.ts            # Validador: SELECT-only, whitelist, LIMIT
│  ├─ db.ts                  # Pool mysql2 y executeQuery
│  ├─ llm.ts                 # Catálogo/esquema y few-shots auxiliares
│  ├─ schema.ts              # Zod schemas de request/response
│  ├─ logger.ts              # Config pino/pino-http
│  └─ migrate.ts             # Utilidades de migración
├─ seeds/
│  └─ bd.sql                 # Esquema y datos de ArteVida Cultural
├─ web/
│  ├─ src/
│  │  ├─ pages/Chat.tsx      # Chat principal (contexto de conversación)
│  │  ├─ pages/SQL.tsx       # Consola SQL
│  │  ├─ components/         # DataTable, SqlBlock, etc.
│  │  └─ lib/api.ts          # Cliente /api/ask
│  └─ ...
├─ docker-compose.yml
├─ Dockerfile
├─ package.json              # Backend scripts y deps
├─ web/package.json          # Frontend scripts y deps
└─ README.md                 # Este documento
```

## Desarrollo
- Build backend: `npm run build`
- Lint backend: `npm run lint`
- Tests: `npm test`
- Frontend: `cd web && npm run build`

### Scripts útiles

- `docker:up` / `docker:down`: arranca/para MySQL 8 en Docker
- `migrate`: ejecuta `migrations/*.sql` y crea usuario read-only (`readonly_user`)
- `seed`: ejecuta `seeds/bd.sql` usando Node (no requiere cliente mysql de sistema)
- `run:prompts`: lanza las 100 preguntas de `scripts/prompts_100.txt` contra `/api/chat`
- `run:test-questions`: smoke de preguntas frecuentes arrancando el server temporalmente
- `setup`: orquestador opcional (Docker + migraciones + seed + build)

## Solución de problemas
- El chat contesta social pero no consulta: revisa small talk (saludos/“gracias” sin datos). Añade palabra clave (evento, precio, ciudad, artista).
- Error “Consulta SQL inválida: error de sintaxis”: el extractor ya intenta recortar la SELECT; si el modelo no devuelve SELECT, entra fallback heurístico.
- “Unknown column …”: verifica que el modelo use la ruta correcta de JOIN de artista y/o usa las vistas. El validador y los atajos ya mitigan esto.

Problemas comunes (Windows / PowerShell)

- Health-check en una línea: usa el comando de la sección Quick start (corrige el bucle `for`).
- Seed fallando por no encontrar `mysql`: ahora `npm run seed` es Node‑based y no requiere cliente mysql.
- Base de datos no disponible: asegúrate de tener Docker Desktop abierto y `docker compose up -d db` ejecutado; el puerto es `13306`.

Reseteo completo (docker + datos)

```powershell
docker compose down -v
npm run docker:up
npm run migrate
$env:DB_HOST="localhost"; $env:DB_PORT="13306"; $env:DB_NAME="artevida_cultural"; $env:DB_ROOT_PASSWORD="rootpass123"; npm run -s seed
```

---
Hecho para que hablar con tu BD sea tan simple como chatear.