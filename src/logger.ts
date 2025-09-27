import pino from 'pino';

export const logger = pino({
  name: 'artevida-openai',
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname'
    }
  } : undefined
});