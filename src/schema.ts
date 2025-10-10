import { z } from 'zod';

// Schema para la petición
export const AskRequestSchema = z.object({
  question: z.string()
    .min(1, 'La pregunta no puede estar vacía')
    .max(500, 'La pregunta es demasiado larga (máximo 500 caracteres)')
    .regex(/^[^<>\\{}[\]]+$/, 'La pregunta contiene caracteres no válidos'),
  conversationContext: z.array(z.object({
    question: z.string(),
    sql: z.string().optional(),
    summary: z.string()
  })).max(4, 'Máximo 4 mensajes de contexto').optional()
});

// Schema para la respuesta
export const AskResponseSchema = z.object({
  sql: z.string(),
  rows: z.array(z.record(z.any())),
  explanation: z.string(),
  naturalResponse: z.string().optional(),
  executionTime: z.number().optional()
});

// Schema para errores
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.string().optional()
});

// Tipos TypeScript derivados
export type AskRequest = z.infer<typeof AskRequestSchema>;
export type AskResponse = z.infer<typeof AskResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;