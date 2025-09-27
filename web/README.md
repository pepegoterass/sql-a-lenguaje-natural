# ArteVida Dashboard - Frontend React + TypeScript

Dashboard moderno para el ArteVida SQL Agent (chat-to-SQL) con React, TypeScript, Vite, TailwindCSS y componentes shadcn/ui.

## 🚀 Cómo ejecutar

### Prerrequisitos
- Node.js 18+ instalado
- Backend ArteVida SQL Agent ejecutándose en `http://localhost:3001`

### Pasos de instalación

1. **Ir al directorio web:**
   ```bash
   cd C:\Users\Usuario\Desktop\master\web
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Crear archivo de entorno (.env):**
   ```bash
   # Copy the example file
   copy .env.example .env
   
   # Edita .env con tu configuración:
   # VITE_API_BASE=http://localhost:3001/api
   # VITE_USE_MOCKS=false
   ```

4. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

5. **Abrir en el navegador:**
   ```
   http://localhost:5173
   ```

## 🏗️ Build de producción

```bash
npm run build
npm run preview
```

## 🎯 Funcionalidades

### ✅ **Implementadas**
- **Modern UI/UX** - Clean, responsive design with dark mode
- **Chat Interface** - Natural language SQL queries with real-time results
- **SQL Editor** - Direct SQL editing with syntax highlighting
- **Data Tables** - Sortable, paginated tables with search
- **KPI Dashboard** - Overview with key metrics and charts
- **Command Palette** - Quick navigation with Cmd/Ctrl+K
- **Theme Toggle** - Light/dark mode support
- **Responsive Design** - Works on desktop, tablet, and mobile

### 🔧 **Arquitectura**
- **React 18** with TypeScript and strict mode
- **Vite** for fast development and building
- **TailwindCSS** for utility-first styling
- **shadcn/ui** components (Radix-based)
- **Framer Motion** for smooth animations
- **Recharts** for data visualization
- **TanStack Table** for advanced data grids

### 📁 **Estructura del proyecto**
```
/web
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Route components
│   ├── lib/             # Utilities and API client
│   └── styles/          # Global styles and themes
├── public/              # Static assets
└── package.json         # Dependencies and scripts
```

### 🎨 **Sistema de diseño**
- **Spacing**: 4px base unit (gap-6, p-6)
- **Typography**: Tailwind typography scale
- **Colors**: CSS custom properties for theming
- **Radius**: rounded-2xl for cards, rounded-lg for inputs
- **Shadows**: Subtle elevation with hover states

### 🔌 **Integración con API**
El dashboard se conecta al backend ArteVida SQL Agent:
- `POST /api/ask` - Consultas en lenguaje natural
- `GET /api/health` - Health check
- Modo mock disponible para desarrollo offline

### ⌨️ **Atajos de teclado**
- `Cmd/Ctrl + K` - Open command palette
- `Tab` - Navigate between elements
- `Enter` - Submit chat messages
- `Escape` - Close modals and dropdowns

### 🌙 **Modo oscuro**
- Automatic system preference detection
- Manual toggle in top bar
- Persistent preference storage
- Proper contrast ratios for accessibility

## 🛠️ **Notas de desarrollo**
Los errores de TypeScript que aparecen antes de `npm install` son esperables. Tras instalar dependencias, el proyecto compila correctamente.

### **Variables de entorno**
```env
VITE_API_BASE=http://localhost:3001/api  # Your backend URL
VITE_USE_MOCKS=false                     # Enable mock data for offline dev
```

### **Scripts disponibles**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### **Navegadores soportados**
- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## 🎉 **Listo para usar**
Obtendrás un dashboard moderno con:
1. **Chat en lenguaje natural** para consultar la base de datos
2. **Editor SQL** con resaltado de sintaxis
3. **Tablas interactivas** con ordenación y paginación
4. **KPI overview** con gráficos y métricas
5. **Command palette** para navegación rápida
6. **Diseño responsive** en todos los dispositivos

Se conecta automáticamente al backend ArteVida SQL Agent para ofrecer una experiencia simple y potente.

## 🧰 Troubleshooting rápido
- Verifica que `VITE_API_BASE` apunte al backend correcto (por defecto `http://localhost:3001/api`).
- Si ves “Error procesando la consulta”, confirma que la base de datos esté accesible y que el backend tenga `OPENAI_API_KEY` (o usa los fallbacks ya integrados).
- Activa `VITE_USE_MOCKS=true` para explorar la UI sin backend.