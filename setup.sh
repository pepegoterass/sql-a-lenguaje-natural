#!/bin/bash

# Script de setup para ArteVida SQL Agent
echo "🚀 Configurando ArteVida SQL Agent..."

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no encontrado. Instala Node.js 18+ antes de continuar."
    exit 1
fi

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no encontrado. Instala Docker antes de continuar."
    exit 1
fi

echo "✅ Prerequisites verificados"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias"
    exit 1
fi

# Copiar archivo de entorno
if [ ! -f .env ]; then
    echo "📝 Copiando archivo de configuración..."
    cp .env.example .env
    echo "✅ Archivo .env creado. Revisa la configuración si es necesario."
else
    echo "ℹ️  Archivo .env ya existe, omitiendo..."
fi

# Iniciar base de datos
echo "🐳 Iniciando MySQL con Docker..."
docker compose up -d db

# Esperar a que MySQL esté listo
echo "⏳ Esperando a que MySQL esté listo..."
sleep 30

# Verificar conexión MySQL
echo "🔍 Verificando conexión a MySQL..."
docker compose exec db mysql -u root -prootpass123 -e "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ MySQL está funcionando"
else
    echo "❌ Error conectando a MySQL. Verifica la configuración."
    exit 1
fi

# Ejecutar migraciones
echo "🗄️  Ejecutando migraciones..."
npm run migrate

if [ $? -eq 0 ]; then
    echo "✅ Migraciones ejecutadas"
else
    echo "❌ Error ejecutando migraciones"
    exit 1
fi

# Cargar datos de prueba
echo "📊 Cargando datos de prueba..."
mysql -h localhost -P 3306 -u readonly_user -preadonly_pass123 artevida_cultural < seeds/seed.sql

if [ $? -eq 0 ]; then
    echo "✅ Datos de prueba cargados"
else
    echo "❌ Error cargando datos de prueba"
fi

echo ""
echo "🎉 ¡Setup completado!"
echo ""
echo "Para iniciar el servidor:"
echo "  npm run dev    # Desarrollo con hot reload"
echo "  npm start      # Producción"
echo ""
echo "Para ejecutar tests:"
echo "  npm test       # Tests una vez"
echo "  npm run test:watch  # Tests en modo watch"
echo ""
echo "API disponible en: http://localhost:3000"
echo "Health check: http://localhost:3000/health"
echo ""
echo "Ejemplo de uso:"
echo '  curl -X POST http://localhost:3000/ask \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '\''{"question": "¿Cuántos eventos por ciudad en 2024?"}'\'''
echo ""