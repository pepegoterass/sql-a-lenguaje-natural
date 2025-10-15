# Backend (src/) — Guía rápida

Este directorio contiene todo el backend en Node.js + TypeScript que convierte lenguaje natural en SQL seguro sobre MySQL y entrega respuestas listas para UI.

## Vista general del flujo

1) Cliente envía POST /ask con { question }
2) Validación y filtros anti‑SQL en `ask.route.ts`
3) Generación de SQL: heurísticas rápidas + LLM (`openai.ts`) con inyección dinámica de esquema (opcional)
4) Guardia SQL (`sqlGuard.ts`): sólo SELECT, objetos en whitelist, preserva CTE/HAVING, añade LIMIT si falta
5) Ejecución en MySQL (`db.ts`) con pool y logging
6) Redacción de respuesta natural (`openai.ts`)
7) Respuesta JSON (`ask.route.ts`), con sql, rows, explanation, naturalResponse

Notas de UX importantes:
- Small‑talk ("hola", "¿qué tal?", "gracias") no genera SQL: responde de forma conversacional.
- Ocupación/aforo: si preguntas ocupación sin decir "próximos", y la SQL con NOW() no trae filas, se relaja el filtro temporal y se reintenta.

## Archivos clave

- `index.ts` — Bootstrap del servidor Express
  - Carga .env, seguridad (helmet/cors/rate‑limit), logging HTTP (pino‑http), JSON body parser.
  - Sirve el dashboard React (web/dist) fuera de test y expone rutas de API (`/api/*`) más alias `/ask`.
  - Health checks: `/api/health` y `/health`.
  - Manejo de errores global y cierre graceful.

- `ask.route.ts` — Endpoint principal de NL→SQL
  - POST `/ask` y `/chat` usando el mismo handler.
  - Pasos rápidos previos al LLM:
    - Detección de SQL directo en la pregunta (bloquea DROP/ALTER/...).
    - Resolución directa de: precio de un evento por nombre aproximado; detalle/atributos (precio/fecha/lugar/ciudad) reutilizando el WHERE de la SQL previa; eventos de un artista.
    - Small‑talk: respuestas conversacionales cuando no hay intención de datos.
  - Generación de SQL con `generateSQLWithOpenAI()` y fallback heurístico si no aparece SELECT.
  - Validación con `validateAndSanitizeSql()` y ejecución con `executeQuery()`.
  - Fallback de ocupación: si se pide ocupación sin "próximos" y la SQL usó NOW() sin resultados, reescribe la SQL para quitar el filtro temporal.
  - Redacción de respuesta natural con `generateNaturalResponse()`.
  - Helpers incluidos: extracción de SQL de texto mixto, heurística básica sobre `vw_eventos_enriquecidos`, extracción de nombre de evento, resolución de artista y construcción de SQL de eventos/atributos.

- `openai.ts` — Integración con OpenAI y lógica determinista
  - Inicializa cliente OpenAI sólo si hay `OPENAI_API_KEY` válida y no es test.
  - `SYSTEM_PROMPT` con guía de estilo SQL, 13 intenciones canónicas, ejemplos y reglas de contexto conversacional (reutilizar WHERE previo cuando el usuario dice "esos", "precios", etc.).
  - Inyección dinámica de esquema (INFORMATION_SCHEMA) controlada por `OPENAI_INCLUDE_SCHEMA` (ON por defecto, OFF en test).
  - Fallbacks deterministas cuando no hay OpenAI: detecta intents canónicos y devuelve SQL segura.
  - Generador de respuestas naturales con guía de estilo y sanitización (sin despedidas ni referencias externas).

- `sqlGuard.ts` — Guardia y saneador de SQL
  - Acepta únicamente SELECT sobre tablas/vistas whitelisted.
  - Soporta CTE (WITH ...), subconsultas y HAVING complejos mediante validación por AST y fallback textual seguro.
  - Preserva alias, no re‑escribe la consulta y añade `LIMIT 200` si falta (excepto queries que ya lo llevan o CTEs aceptados).
  - Limpia comentarios y bloquea múltiples statements.

- `db.ts` — Acceso a MySQL con pool
  - Configuración por .env (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER_RO`, `DB_PASS_RO`).
  - `executeQuery(sql)` ejecuta con logging y devuelve siempre array de filas.
  - `checkConnection()` para health checks; `closePool()` para tests/shutdown.

- `schema.ts` — Validación de payloads con Zod
  - `AskRequestSchema` valida `{ question, conversationContext? }` y limita caracteres peligrosos.
  - `AskResponseSchema` y `ErrorResponseSchema` tipan las respuestas JSON.

- `widgets.route.ts` — Endpoints para el dashboard
  - `/widgets/kpis`: números rápidos (eventos, entradas, facturación, nota media).
  - `/widgets/ventas`: timeline o top por evento (query SQL optimizada y agrupada).
  - `/widgets/valoraciones`: listado con estadísticas agregadas.
  - `/widgets/top-ciudades`: ranking por eventos/ingresos.

- `migrate.ts` — Runner de migraciones SQL
  - Ejecuta `migrations/001_init.sql` y `migrations/002_views.sql` con usuario root.
  - Crea/actualiza usuario read‑only con permisos SELECT y hace `FLUSH PRIVILEGES`.

- `llm.ts` — Prompt template alternativo y heurísticas simples
  - Catálogo whitelisted para prompts, few‑shots de ejemplo y generador básico por palabras clave.
  - Útil como referencia/experimentos fuera del flujo principal.

- `logger.ts` — Configuración de pino centralizada para módulos sueltos.

## Comportamiento especial en pruebas

- Cuando `NODE_ENV=test` o `VITEST=true`:
  - No se inicializa OpenAI; `openai.ts` usa fallbacks deterministas.
  - `index.ts` no sirve la SPA para no interferir con peticiones de test.
  - `ask.route.ts` puede devolver filas simuladas en algunos patrones para acelerar y estabilizar tests.
  - Rate‑limit se reduce y sólo aplica a POST /ask.

## Variables de entorno principales

- `OPENAI_API_KEY` / `OPENAI_MODEL` — Habilitan LLM real.
- `OPENAI_INCLUDE_SCHEMA` — "true" por defecto; "false"/"0"/"off" desactiva el esquema dinámico.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER_RO`, `DB_PASS_RO`, `DB_ROOT_PASSWORD` — Conexión MySQL.
- `PORT`, `NODE_ENV`, `LOG_LEVEL`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` — Servidor.

## Extender a nuevas intenciones

1) Añade un ejemplo en el `SYSTEM_PROMPT` o detecta la intención en `generateFallbackSQL()` para SQL determinista.
2) Si afecta a objetos nuevos, agrégalos a la whitelist en `sqlGuard.ts` y (opcional) a la inyección dinámica de esquema en `openai.ts`.
3) Crea un test en `test/` que cubra la intención con una pregunta de ejemplo.

## Convenciones SQL y vistas

- Prefiere vistas analíticas ya definidas: `vw_eventos_enriquecidos`, `vw_ventas_evento`, `vw_artistas_por_actividad`, `vw_estadisticas_ciudad`, `vw_coste_actividad`, `vw_eventos_proximos`.
- Joins canónicos para artistas: Evento → Actividad → Actividad_Artista → Artista.
- Para "evento con más ceros", usa `WHERE v.nota = 0`.
- Para "ocupación (próximos)", filtra con `e.fecha_hora > NOW()`. El backend puede relajar el filtro si no hay resultados y no se pidió explícitamente "próximos".

---
Sugerencia: Si cambias el esquema o las vistas, revisa también el guard (`sqlGuard.ts`), el prompt (`openai.ts`) y los tests.
