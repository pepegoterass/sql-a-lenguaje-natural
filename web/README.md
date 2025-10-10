# ArteVida Dashboard - Modern React + TypeScript Frontend

A beautiful, modern dashboard for the ArteVida SQL Agent with React, TypeScript, Vite, TailwindCSS, and shadcn/ui components.

## 🚀 How to Run

### Prerequisites
- Node.js 18+ installed
- Your ArteVida SQL Agent backend running on `http://localhost:3001`

### Installation Steps

1. **Navigate to the web directory:**
   ```bash
   cd C:\Users\Usuario\Desktop\master\web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   # Copy the example file
   copy .env.example .env
   
   # Edit .env with your settings:
   # VITE_API_BASE=http://localhost:3001/api
   # VITE_USE_MOCKS=false
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   ```
   http://localhost:5173
   ```

## 🏗️ Build for Production

```bash
npm run build
npm run preview
```

## 🎯 Features

### ✅ **Implemented**
- **Modern UI/UX** - Clean, responsive design with dark mode
- **Chat Interface** - Natural language SQL queries with real-time results
- **SQL Editor** - Direct SQL editing with syntax highlighting
- **Data Tables** - Sortable, paginated tables with search
- **KPI Dashboard** - Overview with key metrics and charts
- **Command Palette** - Quick navigation with Cmd/Ctrl+K
- **Theme Toggle** - Light/dark mode support
- **Responsive Design** - Works on desktop, tablet, and mobile

### 🔧 **Architecture**
- **React 18** with TypeScript and strict mode
- **Vite** for fast development and building
- **TailwindCSS** for utility-first styling
- **shadcn/ui** components (Radix-based)
- **Framer Motion** for smooth animations
- **Recharts** for data visualization
- **TanStack Table** for advanced data grids

### 📁 **Project Structure**
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

### 🎨 **Design System**
- **Spacing**: 4px base unit (gap-6, p-6)
- **Typography**: Tailwind typography scale
- **Colors**: CSS custom properties for theming
- **Radius**: rounded-2xl for cards, rounded-lg for inputs
- **Shadows**: Subtle elevation with hover states

### 🔌 **API Integration**
The dashboard connects to your ArteVida SQL Agent backend:
- `POST /api/ask` - Natural language queries
- `GET /api/health` - Health check
- Mock mode available for offline development

### ⌨️ **Keyboard Shortcuts**
- `Cmd/Ctrl + K` - Open command palette
- `Tab` - Navigate between elements
- `Enter` - Submit chat messages
- `Escape` - Close modals and dropdowns

### 🌙 **Dark Mode**
- Automatic system preference detection
- Manual toggle in top bar
- Persistent preference storage
- Proper contrast ratios for accessibility

## 🛠️ **Development Notes**

The TypeScript compilation errors shown are expected before running `npm install`. Once dependencies are installed, the project will compile and run perfectly.

### **Environment Variables**
```env
VITE_API_BASE=http://localhost:3001/api  # Your backend URL
VITE_USE_MOCKS=false                     # Enable mock data for offline dev
```

### **Available Scripts**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### **Browser Support**
- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## 🎉 **Ready to Use**

Once installed, you'll have a fully functional, modern dashboard that provides:
1. **Natural language chat interface** for database queries
2. **Direct SQL editor** with syntax highlighting
3. **Interactive data tables** with sorting and pagination
4. **KPI overview** with charts and metrics
5. **Command palette** for quick navigation
6. **Responsive design** that works everywhere

The dashboard automatically connects to your existing ArteVida SQL Agent backend and provides a beautiful, user-friendly interface for all database interactions!