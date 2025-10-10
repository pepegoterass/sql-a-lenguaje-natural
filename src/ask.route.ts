import { Router } from 'express';
import { AskRequestSchema, type AskResponse, type ErrorResponse } from './schema.js';
import pino from 'pino';
import { runLangGraph, type AgentState } from './agent/graph.js';

const router = Router();
const logger = pino({ 
  name: 'ask-route',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,name',
      messageFormat: '🔍 {msg}',
      levelFirst: true,
      singleLine: true
    }
  }
});

// POST /ask - Orquestado por LangGraph
router.post('/ask', async (req, res) => {
  const startTime = Date.now();
  try {
    const validationResult = AskRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorResponse: ErrorResponse = {
        error: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors.map(e => e.message).join(', ')
      };
      logger.warn({ errors: validationResult.error.errors }, 'Validación de entrada fallida');
      return res.status(400).json(errorResponse);
    }

    const { question, conversationContext } = validationResult.data;
    const initialState: AgentState = { question, conversationContext, attempts: 0 };
    const result = await runLangGraph(initialState);

    const response: AskResponse = {
      sql: result.sqlFinal || result.sqlDraft || '',
      rows: result.rows || [],
      explanation: result.explanation || 'Consulta generada por agente',
      naturalResponse: result.naturalResponse,
      executionTime: Date.now() - startTime
    };

    logger.info({ question, via: 'langgraph', rowCount: response.rows.length, ip: req.ip }, 'Consulta completada via LangGraph');
    return res.json(response);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    logger.error({ question: req.body?.question, error: errorMessage, executionTime, ip: req.ip }, 'Error procesando consulta');

    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        statusCode = 408;
        errorCode = 'QUERY_TIMEOUT';
      } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        statusCode = 503;
        errorCode = 'DATABASE_UNAVAILABLE';
      } else if (error.message.includes('syntax error') || error.message.includes('SQL')) {
        statusCode = 400;
        errorCode = 'SQL_ERROR';
      }
    }

    const errorResponse: ErrorResponse = {
      error: 'Error procesando la consulta',
      code: errorCode,
      details: errorMessage
    };
    return res.status(statusCode).json(errorResponse);
  }
});

export default router;