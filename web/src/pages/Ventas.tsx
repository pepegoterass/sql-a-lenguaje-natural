import { useState, useEffect } from 'react'
import { KpiCard } from '../components/KpiCard'
import { DataTable } from '../components/DataTable'
import { Euro, TrendingUp, Users, Calendar } from 'lucide-react'
import { getKpis } from '../lib/api'

interface VentaEvento {
  id: number
  evento_nombre: string
  fecha_hora: string
  precio_entrada: number
  ciudad: string
  ubicacion_nombre: string
  aforo: number
  entradas_vendidas: number
  ingresos_totales: number
  porcentaje_ocupacion: number
  evento_tipo: string
}

interface KPIsData {
  eventos: number
  entradas: number
  facturacion: number
  eventosChange?: number
  entradasChange?: number
  facturacionChange?: number
}

export function Ventas() {
  const [ventas, setVentas] = useState<VentaEvento[]>([])
  const [kpis, setKpis] = useState<KPIsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Obtener ventas por evento y KPIs en paralelo
      const [ventasResponse, kpisData] = await Promise.all([
        fetch('/api/widgets/ventas?type=eventos&limit=15'),
        getKpis()
      ])
      
      if (!ventasResponse.ok) {
        throw new Error('Error al obtener datos de ventas')
      }
      
      const ventasData = await ventasResponse.json()
      
      setVentas(ventasData)
  setKpis(kpisData)
      setError(null)
    } catch (err) {
      console.error('Error fetching ventas:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getEventTypeColor = (tipo: string) => {
    const colors: Record<string, string> = {
      concierto: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      teatro: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      exposicion: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      conferencia: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
    return colors[tipo] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 font-semibold'
    if (percentage >= 75) return 'text-orange-600 font-medium'
    if (percentage >= 50) return 'text-yellow-600'
    return 'text-gray-500'
  }

  // Preparar datos para la tabla con formato adecuado
  const tableData = ventas.map(venta => ({
    Evento: venta.evento_nombre,
    Ciudad: venta.ciudad,
    Fecha: new Date(venta.fecha_hora).toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }),
    'Precio €': `€${venta.precio_entrada}`,
    'Vendidas': venta.entradas_vendidas,
    'Aforo': venta.aforo,
    'Ocupación %': `${venta.porcentaje_ocupacion}%`,
    'Ingresos €': `€${venta.ingresos_totales}`,
    Tipo: venta.evento_tipo
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ventas</h1>
            <p className="text-muted-foreground mt-1">
              Análisis de ventas y ocupación por evento
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
            <h1 className="text-3xl font-bold">Ventas</h1>
            <p className="text-muted-foreground mt-1">
              Análisis de ventas y ocupación por evento
            </p>
          </div>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-destructive flex-shrink-0" />
            <div>
              <h3 className="font-medium text-destructive">Error al cargar datos de ventas</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <button 
                onClick={fetchData}
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

  if (!kpis) return null

  const ocupacionMedia = ventas.length > 0 
    ? Math.round(ventas.reduce((acc, v) => acc + v.porcentaje_ocupacion, 0) / ventas.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ventas</h1>
          <p className="text-muted-foreground mt-1">
            Análisis de ventas y ocupación por evento
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Eventos"
          value={kpis.eventos}
          change={kpis.eventosChange}
          icon={<Calendar className="h-5 w-5" />}
        />
        <KpiCard
          title="Entradas Vendidas"
          value={kpis.entradas}
          change={kpis.entradasChange}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          title="Facturación Total"
          value={kpis.facturacion}
          change={kpis.facturacionChange}
          format="currency"
          icon={<Euro className="h-5 w-5" />}
        />
        <KpiCard
          title="Ocupación Media"
          value={ocupacionMedia}
          change={ocupacionMedia >= 75 ? 10 : ocupacionMedia >= 50 ? 0 : -5}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Estadísticas Rápidas */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Resumen de Rendimiento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {ventas.filter(v => v.porcentaje_ocupacion >= 90).length}
            </div>
            <div className="text-sm text-muted-foreground">Eventos Sold Out (≥90%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {ventas.filter(v => v.porcentaje_ocupacion >= 50 && v.porcentaje_ocupacion < 90).length}
            </div>
            <div className="text-sm text-muted-foreground">Eventos Exitosos (50-89%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {ventas.filter(v => v.porcentaje_ocupacion < 50).length}
            </div>
            <div className="text-sm text-muted-foreground">Eventos Bajo Rendimiento (&lt;50%)</div>
          </div>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-card rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Análisis por Evento</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {ventas.length} eventos ordenados por ingresos
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <DataTable data={tableData} />
        </div>
      </div>

      {/* Top Eventos */}
      <div className="bg-card rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Top 5 Eventos por Ingresos</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {ventas.slice(0, 5).map((venta, index) => (
              <div key={venta.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                  <div>
                    <div className="font-medium">{venta.evento_nombre}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${getEventTypeColor(venta.evento_tipo)}`}>
                        {venta.evento_tipo}
                      </span>
                      <span className="text-sm text-muted-foreground">{venta.ciudad}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">€{venta.ingresos_totales}</div>
                  <div className={`text-sm ${getOccupancyColor(venta.porcentaje_ocupacion)}`}>
                    {venta.porcentaje_ocupacion}% ocupación
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}