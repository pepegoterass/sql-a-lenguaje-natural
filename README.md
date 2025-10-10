# ArteVida SQL Agent 🤖

Un agente conversacional inteligente que permite consultar bases de datos MySQL usando lenguaje natural mediante OpenAI GPT.

## 🌟 Características Principales

- **Chat con IA**: Interfaz web intuitiva para hacer preguntas en lenguaje natural
- **OpenAI Integration**: Utiliza GPT-3.5-turbo para convertir preguntas a SQL
- **Respuestas Naturales**: La IA explica los resultados en español fácil de entender
- **Seguridad Avanzada**: Validación SQL, rate limiting, y protección contra inyección SQL
- **Dashboard Web**: Interfaz moderna con estadísticas en tiempo real
- **Base de Datos Cultural**: Esquema completo para gestión de eventos artísticos

## 🚀 Inicio Rápido

### 1. Configurar OpenAI API Key

```bash
# Editar el archivo .env
OPENAI_API_KEY=tu_api_key_de_openai_aqui
OPENAI_MODEL=gpt-3.5-turbo
```

**¿Cómo obtener una API Key de OpenAI?**
1. Ve a [OpenAI API](https://platform.openai.com/api-keys)
2. Crea una cuenta o inicia sesión
3. Genera una nueva API key
4. Copia la key al archivo `.env`

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar base de datos

```bash
# Ejecutar migraciones en MySQL Workbench
# Cargar los archivos SQL desde /migrations/
```

### 4. Iniciar servidor

```bash
npm run dev
```

### 5. Abrir dashboard

Visita: `http://localhost:3001/dashboard`

## 📋 Uso del Dashboard

### Interfaz Principal
- **Chat Area**: Escribe preguntas en lenguaje natural
- **Estadísticas**: Monitoreo de consultas en tiempo real
- **Ejemplos**: Consultas predefinidas para empezar rápidamente
- **Estado**: Indicador de conexión a base de datos

### Ejemplos de Preguntas

```
✅ "¿Cuántos eventos hay en Madrid?"
✅ "Muéstrame los 5 artistas más populares"
✅ "¿Qué eventos de teatro hay en diciembre?"
✅ "¿Cuáles son los venues con mayor capacidad?"
✅ "¿Cuánto dinero generó cada evento?"
```

### Funciones del Chat
- **Respuestas Naturales**: La IA explica los resultados en español
- **Ver Datos**: Expandir para ver tablas con los resultados
- **Ver SQL**: Inspeccionar la consulta SQL generada
- **Tiempo de Respuesta**: Monitoreo de performance

## 🛠 API Endpoints

### POST /api/ask
Procesa preguntas en lenguaje natural

**Request:**
```json
{
  "question": "¿Cuántos eventos hay por ciudad?"
}
```

**Response:**
```json
{
  "sql": "SELECT ciudad, COUNT(*) as eventos FROM vw_eventos_por_ciudad GROUP BY ciudad",
  "rows": [
    {"ciudad": "Madrid", "eventos": 5},
    {"ciudad": "Barcelona", "eventos": 3}
  ],
  "explanation": "Consulta SQL generada para: ¿Cuántos eventos hay por ciudad?",
  "naturalResponse": "He encontrado eventos distribuidos en varias ciudades. Madrid tiene la mayor cantidad con 5 eventos, seguido de Barcelona con 3 eventos...",
  "executionTime": 245
}
```

### GET /api/health
Estado del sistema

### GET /dashboard
Interfaz web del usuario

## 🗄 Esquema de Base de Datos

### Tablas Principales
- `Evento`: Eventos culturales
- `Actividad`: Tipos de actividades (teatro, concierto, etc.)
- `Artista`: Información de artistas
- `Ciudad`: Ubicaciones geográficas
- `Venue`: Locales de eventos
- `Usuario`: Usuarios registrados
- `Entrada`: Tickets/entradas vendidas

### Vistas Optimizadas
- `vw_eventos_enriquecidos`: Vista completa de eventos
- `vw_artistas_populares`: Top artistas por eventos
- `vw_eventos_por_ciudad`: Estadísticas por ciudad
- `vw_ingresos_por_evento`: Análisis financiero
- `vw_ocupacion_venues`: Utilización de venues

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=artevida_cultural
DB_USER_RO=root
DB_PASS_RO=root

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo  # o gpt-4

# Servidor
PORT=3001
NODE_ENV=development

# Seguridad
RATE_LIMIT_MAX=100          # Requests por minuto
RATE_LIMIT_WINDOW_MS=60000  # Ventana de tiempo
SQL_TIMEOUT_MS=10000        # Timeout de consultas

# Logging
LOG_LEVEL=info
```

## 🔒 Seguridad

### Características de Seguridad
- **SQL Injection Prevention**: Validación AST con node-sql-parser
- **Rate Limiting**: Protección contra abuso
- **Helmet**: Headers de seguridad HTTP
- **CORS**: Control de acceso entre dominios
- **Input Validation**: Zod schemas para validación
- **Table Whitelisting**: Solo tablas/vistas autorizadas

### Limitaciones de Consultas
- Solo comandos `SELECT`
- Límite automático de 50 resultados
- Timeout de 10 segundos por defecto
- Tablas restringidas a esquema definido

## 🚀 Producción

### Deployment Checklist
- [ ] Configurar OPENAI_API_KEY
- [ ] Ajustar CORS para dominios de producción
- [ ] Configurar SSL/HTTPS
- [ ] Monitoreo y logs centralizados
- [ ] Backup de base de datos
- [ ] Rate limiting apropiado

## 🆘 Soporte

### Problemas Comunes

**Error: Invalid API Key**
- Verifica que la OPENAI_API_KEY esté configurada correctamente
- Asegúrate de tener créditos disponibles en tu cuenta OpenAI

**Error: Database Connection Failed**
- Verifica que MySQL esté ejecutándose
- Confirma credenciales en archivo .env
- Asegúrate de que la base de datos `artevida_cultural` exista

**Dashboard no carga**
- Verifica que el servidor esté ejecutándose en el puerto correcto
- Confirma que los archivos estáticos estén en `/public`

## 📝 Licencia

MIT License - ver archivo LICENSE para detalles.

---

**¡Hecho con ❤️ para simplificar el acceso a datos!**