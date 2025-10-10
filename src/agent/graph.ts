import { z } from 'zod';
import pino from 'pino';
import { generateSQLWithOpenAI, generateNaturalResponse } from '../openai.js';
import { validateAndSanitizeSql } from '../sqlGuard.js';
import { executeQuery } from '../db.js';
import { buildHeuristicSql, isDescriptionIntent, buildDescriptionSqlFromPrevious, detectAttributeIntent, buildAttributeSqlFromPrevious, resolveArtistByName, buildArtistEventsSql, resolveEventByName, extractEventPhrase } from './heuristics.js';

// Optional: LangGraph/LC imports are lazy-required to keep runtime working even if deps not installed yet
let createGraph: any;
let Node: any;
let END: any;

try {
  // Dynamically import to avoid hard crash if deps missing
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ({ createGraph, Node, END } = await import('@langchain/langgraph'));
} catch {
  // No-op, we implement a tiny fallback runner below
}

const logger = pino({
  name: 'langgraph-agent',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true, singleLine: true, translateTime: 'HH:MM:ss' }
  }
});

// ---- State schema ----
export const AgentStateSchema = z.object({
  question: z.string(),
  conversationContext: z.array(z.object({
    question: z.string(),
    sql: z.string().optional(),
    summary: z.string()
  })).optional(),
  sqlDraft: z.string().optional(),
  sqlFinal: z.string().optional(),
  validationError: z.string().optional(),
  rows: z.array(z.record(z.any())).optional(),
  explanation: z.string().optional(),
  naturalResponse: z.string().optional(),
  attempts: z.number().default(0),
});
export type AgentState = z.infer<typeof AgentStateSchema>;

// ---- Utility helpers ----
function isConversational(question: string): boolean {
  const q = question.toLowerCase().trim();
  return /^(hola|buenas|hello|hi|qué tal|que tal|como estas|cómo estás)$/.test(q) &&
    !/(evento|artista|venta|conciert|teatr|exposic|valorac|dato|precio|ciudad|fecha|lugar)/.test(q);
}

// ---- Nodes (pure functions over state) ----
async function detectIntentNode(state: AgentState): Promise<AgentState> {
  if (isConversational(state.question)) {
    return {
      ...state,
      naturalResponse: '¡Hola! Soy tu asistente de ArteVida. Dime qué quieres consultar (por ejemplo: precios de Rosalía, eventos en Madrid 2024, top artistas)'
    };
  }
  return state;
}

async function heuristicsNode(state: AgentState): Promise<AgentState> {
  const q = state.question;
  // 1) Conversational follow-ups: description/attributes using previous SQL
  if (state.conversationContext && state.conversationContext.length > 0) {
    const lastCtx = state.conversationContext[state.conversationContext.length - 1];
    if (lastCtx?.sql) {
      if (isDescriptionIntent(q)) {
        const descSql = buildDescriptionSqlFromPrevious(lastCtx.sql);
        if (descSql) return { ...state, sqlDraft: descSql };
      }
      const attr = detectAttributeIntent(q);
      if (attr) {
        const attrSql = buildAttributeSqlFromPrevious(lastCtx.sql, attr);
        if (attrSql) return { ...state, sqlDraft: attrSql };
      }
    }
  }
  // 2) Direct price by event name
  const wantsPrice = /\b(precio|price)\b/i.test(q);
  if (wantsPrice) {
    const eventCandidate = extractEventPhrase(q) ?? '';
    const resolved = await resolveEventByName(eventCandidate || q);
    if (resolved) {
      const directSql = `SELECT e.nombre AS evento, e.precio_entrada\nFROM Evento e\nWHERE e.id = ${resolved.evento_id}\nLIMIT 1`;
      return { ...state, sqlDraft: directSql, explanation: `Precio del evento resuelto por nombre: "${resolved.evento_nombre}"` };
    }
  }
  // 3) Artist events
  const wantsArtistEvents = /(eventos?|conciertos?|act[úu]a|tiene\s+m[aá]s\s+eventos?)/i.test(q);
  if (wantsArtistEvents) {
    const artistResolved = await resolveArtistByName(q);
    if (artistResolved) {
      const directSql = buildArtistEventsSql(artistResolved.artista_nombre, q);
      return { ...state, sqlDraft: directSql, explanation: `Eventos del artista resueltos por nombre: "${artistResolved.artista_nombre}"` };
    }
  }
  // 4) Heuristic general SQL when LLM may fail
  const heuristic = buildHeuristicSql(q);
  if (heuristic) return { ...state, sqlDraft: heuristic };
  return state;
}

async function generateSqlNode(state: AgentState): Promise<AgentState> {
  // Si ya hay SQL heurística previa, no sobreescribirla
  if (state.naturalResponse || state.sqlDraft) return state; // conversational o heurístico
  const { sql, explanation } = await generateSQLWithOpenAI(state.question, state.conversationContext);
  return { ...state, sqlDraft: sql, explanation };
}

async function validateSqlNode(state: AgentState): Promise<AgentState> {
  if (!state.sqlDraft || state.naturalResponse) return state;
  const { isValid, sanitizedSql, error } = validateAndSanitizeSql(state.sqlDraft);
  if (!isValid || !sanitizedSql) {
    return { ...state, validationError: error || 'SQL no válida' };
  }
  return { ...state, sqlFinal: sanitizedSql, validationError: undefined };
}

async function repairSqlNode(state: AgentState): Promise<AgentState> {
  // Basic repair loop: ask LLM to fix based on validationError; max 2 attempts
  if (!state.validationError || (state.attempts ?? 0) >= 2) return state;
  const q = `${state.question} | Corrige según el validador: ${state.validationError}. Reglas: SOLO SELECT, solo tablas/vistas permitidas, añade LIMIT si falta.`;
  const { sql } = await generateSQLWithOpenAI(q, state.conversationContext);
  return { ...state, sqlDraft: sql, attempts: (state.attempts ?? 0) + 1 };
}

async function executeSqlNode(state: AgentState): Promise<AgentState> {
  if (!state.sqlFinal || state.naturalResponse) return state;
  try {
    const rows = await executeQuery(state.sqlFinal);
    return { ...state, rows };
  } catch (error: any) {
    // Simple mitigation: if execution fails, try to add LIMIT 50 (if not present) or fallback to view
    let sql = state.sqlFinal;
    if (!/\blimit\b/i.test(sql)) {
      sql = `${sql.trim()} LIMIT 50`;
      try {
        const rows = await executeQuery(sql);
        return { ...state, rows, sqlFinal: sql };
      } catch {
        // ignore and fallback below
      }
    }
    // Fallback minimal natural response when execute fails
    return { ...state, rows: [], naturalResponse: `No se pudo ejecutar la consulta. Detalle: ${error?.message || 'desconocido'}` };
  }
}

async function summarizeNode(state: AgentState): Promise<AgentState> {
  if (state.naturalResponse) return state;
  const natural = await generateNaturalResponse(state.question, state.rows || []);
  return { ...state, naturalResponse: natural };
}

// ---- Runner ----
export async function runLangGraph(initial: AgentState): Promise<AgentState> {
  // If LangGraph is available, wire a small graph; else, run sequentially.
  if (createGraph && Node && END) {
    const detect = new Node(detectIntentNode);
    const heur = new Node(heuristicsNode);
    const gen = new Node(generateSqlNode);
    const validate = new Node(validateSqlNode);
    const repair = new Node(repairSqlNode);
    const exec = new Node(executeSqlNode);
    const sum = new Node(summarizeNode);

    const graph = createGraph({
      nodes: { detect, heur, gen, validate, repair, exec, sum },
      edges: [
        ['detect', 'heur'],
        // If conversational, validate/gen nodes will no-op
        ['heur', 'gen'],
        ['gen', 'validate'],
        // Conditional: if validation error and attempts < 2 → repair → validate
        ['validate', (s: AgentState) => (s.validationError && (s.attempts ?? 0) < 2) ? 'repair' : 'exec'],
        ['repair', 'validate'],
        ['exec', 'sum'],
        ['sum', END],
      ],
    });

    const result = await graph.invoke(initial);
    return result as AgentState;
  }

  // Fallback sequential pipeline (no external deps needed)
  try {
    let s = await detectIntentNode(initial);
    s = await heuristicsNode(s);
    s = await generateSqlNode(s);
    s = await validateSqlNode(s);
    let guard = 0;
    while (s.validationError && guard < 2) {
      s = await repairSqlNode(s);
      s = await validateSqlNode(s);
      guard++;
    }
    s = await executeSqlNode(s);
    s = await summarizeNode(s);
    return s;
  } catch (error) {
    logger.error({ error }, 'LangGraph fallback pipeline failed');
    throw error;
  }
}
