import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'

interface SqlBlockProps {
  sql: string
  collapsed?: boolean
}

export function SqlBlock({ sql, collapsed = false }: SqlBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-sm font-medium hover:text-foreground"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          SQL Query
        </button>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-accent rounded"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="p-4">
          <pre className="sql-block">
            <code>{sql}</code>
          </pre>
        </div>
      )}
    </div>
  )
}