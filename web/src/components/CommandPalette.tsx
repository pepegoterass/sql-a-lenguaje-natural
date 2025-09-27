
import { Search } from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]">
      <div className="bg-background rounded-lg shadow-lg border border-border w-full max-w-lg mx-4">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar comandos..."
            className="flex-1 bg-transparent outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onOpenChange(false)
              }
            }}
          />
        </div>
        
        <div className="p-2">
          <div className="text-xs text-muted-foreground px-3 py-2">Navegación</div>
          {['Overview', 'Eventos', 'Chat', 'SQL'].map((item) => (
            <button
              key={item}
              className="w-full text-left px-3 py-2 rounded hover:bg-accent"
              onClick={() => onOpenChange(false)}
            >
              Ir a {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}