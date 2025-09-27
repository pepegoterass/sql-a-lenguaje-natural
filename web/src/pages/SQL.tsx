import { useState } from 'react'
import { Play, Download, Copy, Check } from 'lucide-react'
import { SqlBlock } from '@/components/SqlBlock'
import { DataTable } from '@/components/DataTable'

export function SQL() {
  const [query, setQuery] = useState(`-- Ejemplo de consulta
SELECT 
  e.nombre,
  e.fecha_hora,
  u.ciudad,
  COUNT(en.id) as entradas_vendidas
FROM Evento e
LEFT JOIN Ubicacion u ON e.ubicacion_id = u.id
LEFT JOIN Entrada en ON e.id = en.evento_id
GROUP BY e.id, e.nombre, e.fecha_hora, u.ciudad
ORDER BY entradas_vendidas DESC
LIMIT 10;`)
  
  const [results, setResults] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleExecute = async () => {
    setLoading(true)
    setError(null)
    
    // Simular ejecución
    setTimeout(() => {
      const mockResults = [
        { nombre: 'Manu Chao - Próxima Estación: Esperanza', fecha_hora: '2024-03-15 21:00:00', ciudad: 'Barcelona', entradas_vendidas: 15 },
        { nombre: 'Pablo Alborán - Vértigo en Madrid', fecha_hora: '2024-04-20 20:30:00', ciudad: 'Madrid', entradas_vendidas: 14 },
        { nombre: 'Rosalía - Motomami World Tour', fecha_hora: '2024-07-12 22:00:00', ciudad: 'San Sebastián', entradas_vendidas: 20 }
      ]
      
      setResults(mockResults)
      setLoading(false)
    }, 1000)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(query)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([query], { type: 'text/sql' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'query.sql'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SQL Editor</h1>
          <p className="text-muted-foreground">Ejecuta consultas SQL directamente</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-accent transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4" />
            Descargar
          </button>
          
          <button
            onClick={handleExecute}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Play className="h-4 w-4" />
            {loading ? 'Ejecutando...' : 'Ejecutar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-card rounded-lg">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-medium">Editor SQL</h2>
            </div>
            <div className="p-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-80 font-mono text-sm bg-muted/30 border border-input rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Escribe tu consulta SQL aquí..."
              />
            </div>
          </div>

          <div className="bg-card rounded-lg p-4">
            <h3 className="font-medium mb-3">Esquema de Base de Datos</h3>
            <div className="space-y-2 text-sm">
              {[
                'Actividad (id, nombre, tipo, subtipo)',
                'Artista (id, nombre, biografia)',
                'Evento (id, nombre, actividad_id, ubicacion_id, precio_entrada, fecha_hora)',
                'Ubicacion (id, nombre, ciudad, aforo, direccion)',
                'Entrada (id, evento_id, asistente_id, precio_pagado, fecha_compra)',
                'Asistente (id, nombre_completo, telefono, email)',
                'Valoracion (id, evento_id, asistente_id, nota, comentario)',
                'vw_eventos_enriquecidos (vista completa eventos)',
                'vw_ventas_evento (vista ventas por evento)'
              ].map((table) => (
                <div key={table} className="bg-muted/30 px-3 py-2 rounded font-mono text-xs">
                  {table}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-lg">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <h2 className="font-medium">Resultados</h2>
              {results && (
                <span className="text-sm text-muted-foreground">
                  {results.length} filas
                </span>
              )}
            </div>
            
            <div className="p-4">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                  <p className="font-medium">Error:</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              {results && !loading && (
                <DataTable data={results} />
              )}
              
              {!results && !loading && !error && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Ejecuta una consulta para ver los resultados</p>
                </div>
              )}
            </div>
          </div>

          <SqlBlock sql={query} />
        </div>
      </div>
    </div>
  )
}