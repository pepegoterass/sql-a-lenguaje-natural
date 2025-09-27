import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { CommandPalette } from './components/CommandPalette'
import { ThemeProvider } from './components/ThemeProvider'
import { Overview } from './pages/Overview'
import { Chat } from './pages/Chat'
import { SQL } from './pages/SQL'

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ThemeProvider defaultTheme="light" storageKey="artevida-theme">
      <Router>
        <div className="min-h-screen bg-background">
          <Topbar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
          
          <div className="flex">
            <Sidebar collapsed={sidebarCollapsed} />
            
            <main className={`flex-1 transition-all duration-300 ${
              sidebarCollapsed ? 'ml-16' : 'ml-64'
            }`}>
              <div className="p-6 max-w-7xl mx-auto">
                <Routes>
                  <Route path="/" element={<Navigate to="/chat" replace />} />
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/sql" element={<SQL />} />
                </Routes>
              </div>
            </main>
          </div>

          <CommandPalette 
            open={commandOpen} 
            onOpenChange={setCommandOpen}
          />
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App