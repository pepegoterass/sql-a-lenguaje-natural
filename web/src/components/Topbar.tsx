
import { Menu, Search, Bell, HelpCircle } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <div className="bg-background border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">ArteVida Dashboard</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 bg-muted rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <HelpCircle className="h-5 w-5" />
        </button>
        
        <ThemeToggle />
      </div>
    </div>
  )
}