# Arquitectura de la aplicación

Este documento resume el funcionamiento del sistema, el flujo de datos y cómo se conectan las distintas partes del backend y la interfaz web.

## Visión general (componentes)

```mermaid
graph TD
  subgraph Client
    Web["React SPA (web/)"]
  end
  subgraph Server
    Express["Express App (src/index.ts)"]
    AskRoute["ask.route.ts (POST /ask, /api/ask, /chat)"]
    WidgetsRoute["widgets.route.ts (GET /api/widgets/*)"]
    OpenAI["openai.ts (LLM + fallbacks)"]
    Guard["sqlGuard.ts (SELECT-only + whitelist + LIMIT)"]
    DBLayer["db.ts (mysql2/promise pool)"]
  end
  subgraph Data
    MySQL["MySQL 8"]
    Seeds["seeds/bd.sql"]
    Mig1["migrations/001_init.sql"]
    Mig2["migrations/002_views.sql"]
  end

  Web -->|HTTP| Express
  Express -->|mounts| AskRoute
  Express -->|mounts| WidgetsRoute
  AskRoute -->|genera SQL| OpenAI
  AskRoute -->|valida| Guard
  AskRoute -->|ejecuta| DBLayer
  WidgetsRoute --> DBLayer
  DBLayer --> MySQL
  Seeds -->|seed.ts| MySQL
  Mig1 -->|migrate.ts| MySQL
  Mig2 -->|migrate.ts| MySQL
  OpenAI -->|opcional| OpenAIAPI["OpenAI API"]

  style OpenAIAPI fill:#FFF6BF,stroke:#F1C40F
```

- web/: frontend React (SPA) que consume la API.
- src/index.ts: arranque y configuración del servidor (seguridad, CORS, rate-limit, logs, SPA estática).
- src/ask.route.ts: NL→SQL (preguntas a SQL válido, ejecución y respuesta natural).
- src/widgets.route.ts: endpoints para gráficos/KPIs del dashboard.
- src/openai.ts: integración con OpenAI (cuando hay API key), inyección dinámica de esquema, fallbacks deterministas y respuesta natural.
- src/sqlGuard.ts: guardarraíles de SQL (solo SELECT, whitelist de tablas/vistas, CTE/HAVING, auto-LIMIT).
- src/db.ts: pool de MySQL y ejecución segura de consultas.
- seeds/ y migrations/: scripts para crear/actualizar estructura y datos.

## Secuencia: una consulta /ask

```mermaid
sequenceDiagram
  participant U as Usuario (Web)
  participant API as Express /api/ask
  participant ASK as ask.route.ts
  participant OAI as openai.ts
  participant GUARD as sqlGuard.ts
  participant DB as db.ts
  participant SQL as MySQL

  U->>API: POST /api/ask { question, conversationContext? }
  API->>ASK: handleAskOrChat()
  ASK->>ASK: Validación de payload y bloqueo de SQL directo
  ASK->>ASK: Heurísticas (precio/desc/atributos/eventos por artista)
  alt Heurística resuelve
    ASK->>GUARD: validateAndSanitizeSql()
    GUARD-->>ASK: SQL segura
    ASK->>DB: executeQuery(sql)
    DB->>SQL: ejecutar
    SQL-->>DB: filas
    DB-->>ASK: rows
  else Ir al LLM
    ASK->>OAI: generateSQLWithOpenAI()
    OAI-->>ASK: SQL (o fallback determinista)
    ASK->>GUARD: validateAndSanitizeSql()
    GUARD-->>ASK: SQL segura
    ASK->>DB: executeQuery(sql)
    DB->>SQL: ejecutar
    SQL-->>DB: filas
    DB-->>ASK: rows
    opt Fallback ocupación
      ASK->>ASK: relajar filtro NOW() si 0 filas
      ASK->>DB: reintentar
    end
  end
  ASK->>OAI: generateNaturalResponse(rows)
  OAI-->>ASK: texto natural
  ASK-->>API: { sql, rows, explanation, naturalResponse }
  API-->>U: 200 OK (JSON)
```

Puntos clave:
- Small-talk se responde sin SQL.
- Heurísticas aceleran respuestas frecuentes (precio de evento, descripción, atributos, eventos por artista) antes del LLM.
- Guardia SQL aplica siempre antes de tocar la BD.
- Fallback de ocupación: si la consulta de “ocupación” sin “próximos” devuelve 0 por usar NOW(), se relaja el filtro temporal y se reintenta.

## Secuencia: widgets (ej. ventas)

```mermaid
sequenceDiagram
  participant Web
  participant API as /api/widgets/ventas
  participant W as widgets.route.ts
  participant DB as db.ts
  participant SQL as MySQL

  Web->>API: GET ?type=eventos&limit=10
  API->>W: handler
  W->>DB: executeQuery(query)
  DB->>SQL: ejecutar
  SQL-->>DB: filas
  DB-->>W: rows
  W-->>API: JSON
  API-->>Web: 200 OK
```

- Otros endpoints similares: `/api/widgets/kpis`, `/api/widgets/valoraciones`, `/api/widgets/top-ciudades`.

## Flujo de datos: seeds y migraciones

```mermaid
flowchart LR
  SeedsFile[seeds/bd.sql]
  SeedTS[src/seed.ts]
  Mig1[migrations/001_init.sql]
  Mig2[migrations/002_views.sql]
  MigrateTS[src/migrate.ts]
  MySQL[(MySQL 8)]

  SeedTS -->|lee y ejecuta| SeedsFile
  SeedsFile --> MySQL
  MigrateTS --> Mig1
  MigrateTS --> Mig2
  Mig1 --> MySQL
  Mig2 --> MySQL
```

- `src/seed.ts`: ejecuta `seeds/bd.sql` (estructura + datos) con usuario root.
- `src/migrate.ts`: ejecuta migraciones ordenadas y crea usuario read-only con permisos SELECT.
- Runtime: la app usa credenciales read-only (configurables por .env).

## Capas y responsabilidades (resumen)

- Presentación: `web/` (React + Vite) consume la API y visualiza tablas, KPIs y gráficos.
- API/Controladores: `src/index.ts`, `src/ask.route.ts`, `src/widgets.route.ts`.
- LLM y respuestas: `src/openai.ts` (prompts, fallbacks, natural responses, esquema dinámico).
- Seguridad SQL: `src/sqlGuard.ts` (SELECT-only, whitelist, CTE/HAVING, auto-LIMIT, limpieza de comentarios).
- Datos/Acceso: `src/db.ts` (pool, ejecución con logs), `seeds/`, `migrations/`.

## Modos de operación y banderas

- Test (`NODE_ENV=test` o `VITEST=true`):
  - No se inicializa OpenAI; se usan fallbacks deterministas.
  - `index.ts` no sirve la SPA.
  - `ask.route.ts` devuelve filas simuladas para ciertos patrones.
  - Rate-limit reducido y aplicado solo a POST /ask.
- Desarrollo/Producción:
  - OpenAI opcional (si `OPENAI_API_KEY` válida).
  - Inyección dinámica de esquema activada por defecto (`OPENAI_INCLUDE_SCHEMA`, desactivable con false/0/off).
  - Seguridad: helmet, CORS, rate-limit, guardia SQL.

## Extensibilidad

- Nuevos intents NL→SQL: añadir ejemplos al `SYSTEM_PROMPT` y/o lógica en `generateFallbackSQL()` (openai.ts).
- Nuevas vistas/consultas: crear vista en SQL (migrations), incluir en whitelist (`sqlGuard.ts`) y en esquema dinámico (`openai.ts`).
- Nuevos endpoints de dashboard: añadir en `widgets.route.ts` con consultas agregadas y ordenadas.

---
Sugerencia: enlaza este documento desde el README principal para facilitar el descubrimiento por parte de otros desarrolladores.