import { useState, useEffect } from 'react'
import { KpiCard } from '../components/KpiCard'
import { DataTable } from '../components/DataTable'
import { Star, MessageCircle, TrendingUp, Users } from 'lucide-react'

interface Valoracion {
  id: number
  nota: number
  comentario: string
  evento_nombre: string
  fecha_hora: string
  asistente_nombre: string
  ciudad: string
  evento_tipo: string
  subtipo: string
}

interface EstadisticasValoraciones {
  total: number
  notaMedia: number
  positivas: number
  negativas: number
}

interface ValoracionesResponse {
  valoraciones: Valoracion[]
  estadisticas: EstadisticasValoraciones
}

export function Valoraciones() {
  const [data, setData] = useState<ValoracionesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchValoraciones()
  }, [])

  const fetchValoraciones = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:3001/api/widgets/valoraciones')
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Error fetching valoraciones:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }





  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Valoraciones</h1>
            <p className="text-muted-foreground mt-1">
              Opiniones y calificaciones de nuestros asistentes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>

        <div className="h-96 bg-muted animate-pulse rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Valoraciones</h1>
            <p className="text-muted-foreground mt-1">
              Opiniones y calificaciones de nuestros asistentes
            </p>
          </div>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-destructive flex-shrink-0" />
            <div>
              <h3 className="font-medium text-destructive">Error al cargar valoraciones</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <button 
                onClick={fetchValoraciones}
                className="text-sm text-destructive hover:underline mt-2"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { valoraciones, estadisticas } = data
  const satisfaccionPorcentaje = estadisticas.total > 0 
    ? Math.round((estadisticas.positivas / estadisticas.total) * 100) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Valoraciones</h1>
          <p className="text-muted-foreground mt-1">
            Opiniones y calificaciones de nuestros asistentes
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Valoraciones"
          value={estadisticas.total}
          icon={<MessageCircle className="h-5 w-5" />}
        />
        <KpiCard
          title="Nota Media"
          value={estadisticas.notaMedia}
          change={estadisticas.notaMedia >= 4 ? 5 : estadisticas.notaMedia >= 3 ? 0 : -5}
          icon={<Star className="h-5 w-5" />}
        />
        <KpiCard
          title="Valoraciones Positivas"
          value={estadisticas.positivas}
          change={satisfaccionPorcentaje >= 80 ? 10 : satisfaccionPorcentaje >= 60 ? 0 : -10}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Índice Satisfacción"
          value={satisfaccionPorcentaje}
          change={satisfaccionPorcentaje >= 70 ? 15 : satisfaccionPorcentaje >= 50 ? 0 : -15}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      {/* Tabla de Valoraciones */}
      <div className="bg-card rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Últimas Valoraciones</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {valoraciones.length} valoraciones mostradas
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <DataTable
            data={valoraciones.map(v => ({
              Evento: v.evento_nombre,
              Asistente: v.asistente_nombre,
              'Nota': `${v.nota}/5`,
              Ciudad: v.ciudad,
              Tipo: v.subtipo || v.evento_tipo,
              Comentario: v.comentario.substring(0, 50) + (v.comentario.length > 50 ? '...' : ''),
              Fecha: new Date(v.fecha_hora).toLocaleDateString('es-ES')
            }))}
          />
        </div>
      </div>
    </div>
  )
}