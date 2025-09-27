import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import askRouter from './ask.route.js';
import widgetsRouter from './widgets.route.js';
import { checkConnection } from './db.js';

// Configurar paths y cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Cargar variables de entorno explícitamente
config({ path: envPath });

console.log('🔑 OpenAI API Key loaded:', process.env.OPENAI_API_KEY ? `✅ YES (${process.env.OPENAI_API_KEY.substring(0, 8)}...)` : '❌ NO');

// Configurar logger con formato mejorado
const logger = pino({
  name: 'artevida-sql-agent',
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss dd/mm/yyyy',
      ignore: 'pid,hostname,name',
      messageFormat: '🎭 {msg}',
      levelFirst: true,
      singleLine: true
    }
  }
});

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// Middlewares de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Permitir scripts inline para el dashboard
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"], // Para llamadas AJAX al API
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Configurar dominios permitidos en producción
    : true, // Permitir todos los orígenes en desarrollo
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minuto por defecto
  max: parseInt(process.env.RATE_LIMIT_MAX || '30'), // 30 requests por ventana
  message: {
    error: 'Demasiadas peticiones desde esta IP',
    code: 'RATE_LIMIT_EXCEEDED',
    details: 'Por favor, espere antes de realizar más consultas'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(rateLimiter);

// Logger HTTP con formato mejorado
app.use(pinoHttp({ 
  logger,
  customLogLevel: function (_, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn';
    } else if (res.statusCode >= 500 || err) {
      return 'error';
    }
    return 'info';
  },
  customSuccessMessage: function (req, res) {
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;
    const icon = method === 'GET' ? '📥' : method === 'POST' ? '📤' : '🔄';
    const statusIcon = status < 300 ? '✅' : status < 400 ? '🔄' : '❌';
    return `${icon} ${method} ${url} ${statusIcon} ${status}`;
  },
  customErrorMessage: function (req, res, err) {
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;
    return `💥 ${method} ${url} ❌ ${status} - ${err.message}`;
  }
}));

// Parsear JSON
app.use(express.json({ limit: '10mb' }));

// Servir archivos estáticos para el dashboard moderno (React build)
const webBuildPath = join(__dirname, '..', 'web', 'dist');
app.use('/', express.static(webBuildPath));

// Fallback para SPA - servir index.html para rutas no API
app.get('*', (req, res) => {
  // Solo redirigir si no es una ruta de API
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(webBuildPath, 'index.html'));
  }
});

// Middleware para logs de API más claros
app.use('/api', (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    
    // Emoji según el código de estado
    let statusIcon = '✅';
    if (status >= 400 && status < 500) statusIcon = '⚠️';
    if (status >= 500) statusIcon = '❌';
    
    // Color según el código de estado
    const statusMsg = `${statusIcon} ${method} ${url} → ${status} (${duration}ms)`;
    
    if (status >= 400) {
      logger.warn(statusMsg);
    } else {
      logger.info(statusMsg);
    }
  });
  
  next();
});

// Rutas de API
app.use('/api', askRouter);
app.use('/api/widgets', widgetsRouter);

// Ruta de health check
app.get('/api/health', async (_, res) => {
  try {
    const dbConnected = await checkConnection();
    
    const healthStatus = {
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime()
    };

    const statusCode = dbConnected ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    logger.error({ error }, 'Error en health check');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Ruta de health check alternativa (mantener compatibilidad)
app.get('/health', async (_, res) => {
  try {
    const dbConnected = await checkConnection();
    
    const healthStatus = {
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime()
    };

    const statusCode = dbConnected ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    logger.error({ error }, 'Error en health check');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Ruta raíz - redirigir al dashboard
app.get('/', (_, res) => {
  res.redirect('/dashboard');
});

// Ruta de información de la API
app.get('/info', (_, res) => {
  res.json({
    name: 'ArteVida SQL Agent',
    version: '1.0.0',
    description: 'Agente conversacional que convierte lenguaje natural a consultas SQL MySQL',
    endpoints: {
      ask: 'POST /api/ask - Realizar consulta en lenguaje natural',
      health: 'GET /api/health - Estado del servicio',
      dashboard: 'GET /dashboard - Interfaz web del usuario'
    },
    example: {
      method: 'POST',
      url: '/api/ask',
      body: {
        question: '¿Cuántos eventos por ciudad en 2024?'
      }
    }
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    code: 'NOT_FOUND',
    details: `La ruta ${req.method} ${req.originalUrl} no existe`
  });
});

// Middleware global de manejo de errores
app.use((err: any, req: any, res: any, _: any) => {
  logger.error({ 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  }, 'Error no manejado');

  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    code: 'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error inesperado'
  });
});

// Función para iniciar el servidor
async function startServer(): Promise<void> {
  try {
    // Verificar conexión a la base de datos al inicio
    const dbConnected = await checkConnection();
    if (!dbConnected) {
      logger.warn('No se pudo conectar a la base de datos. El servidor iniciará pero las consultas fallarán.');
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      const env = process.env.NODE_ENV || 'development';
      const dbStatus = dbConnected ? '✅ connected' : '❌ disconnected';
      
      console.log('\n🎭 ================================');
      console.log('🎭    ArteVida SQL Agent');
      console.log('🎭 ================================');
      console.log(`🚀 Servidor iniciado en puerto: ${PORT}`);
      console.log(`🌍 Entorno: ${env}`);
      console.log(`💾 Base de datos: ${dbStatus}`);
      console.log(`📡 API disponible en: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log('🎭 ================================\n');
      
      logger.info({ 
        port: PORT, 
        env,
        database: dbConnected ? 'connected' : 'disconnected'
      }, '🚀 Servidor ArteVida SQL Agent iniciado');
    });

    // Manejo graceful de shutdown
    const gracefulShutdown = (signal: string) => {
      console.log('\n🛑 ================================');
      console.log('🛑   Cerrando ArteVida Agent');
      console.log('🛑 ================================');
      logger.info({ signal }, '🛑 Iniciando shutdown graceful');
      
      server.close(() => {
        console.log('✅ Servidor HTTP cerrado correctamente');
        logger.info('✅ Servidor HTTP cerrado');
        process.exit(0);
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.log('⚠️ Forzando cierre del servidor...');
        logger.error('⚠️ Forzando cierre del servidor');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error({ error }, 'Error iniciando el servidor');
    process.exit(1);
  }
}

// Iniciar servidor si este archivo es ejecutado directamente
if (import.meta.url.endsWith('/index.js') || import.meta.url.endsWith('\\index.js') || import.meta.url.endsWith('/index.ts') || import.meta.url.endsWith('\\index.ts')) {
  startServer();
}

export default app;