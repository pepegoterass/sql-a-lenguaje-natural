import { useEffect, useState } from 'react'
import { Calendar, Users, DollarSign, Star } from 'lucide-react'
import { KpiCard } from '@/components/KpiCard'
import { getKpis, getVentas, getTopCiudades, type KpiData, type VentasData, type CiudadData } from '@/lib/api'

export function Overview() {
  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [ventas, setVentas] = useState<VentasData[]>([])
  const [ciudades, setCiudades] = useState<CiudadData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [kpiData, ventasData, ciudadesData] = await Promise.all([
          getKpis(),
          getVentas('month'),
          getTopCiudades(5)
        ])
        setKpis(kpiData)
        setVentas(ventasData)
        setCiudades(ciudadesData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-muted rounded mb-4"></div>
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Overview</h1>
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          <p>Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        <div className="text-sm text-muted-foreground">
          Última actualización: {new Date().toLocaleString('es-ES')}
        </div>
      </div>

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Eventos"
            value={kpis.eventos}
            change={kpis.eventosChange}
            icon={<Calendar className="h-5 w-5" />}
          />
          <KpiCard
            title="Entradas"
            value={kpis.entradas}
            change={kpis.entradasChange}
            icon={<Users className="h-5 w-5" />}
          />
          <KpiCard
            title="Facturación"
            value={kpis.facturacion}
            change={kpis.facturacionChange}
            format="currency"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KpiCard
            title="Nota Media"
            value={kpis.notaMedia}
            change={kpis.notaMediaChange}
            icon={<Star className="h-5 w-5" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Ventas por Mes</h2>
          <div className="space-y-3">
            {ventas.slice(0, 6).map((venta) => (
              <div key={venta.fecha} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                <div>
                  <div className="font-medium">{new Date(venta.fecha + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}</div>
                  <div className="text-sm text-muted-foreground">{venta.ventas} entradas</div>
                </div>
                <div className="font-semibold">{venta.ingresos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Top Ciudades</h2>
          <div className="space-y-3">
            {ciudades.map((item) => (
              <div key={item.ciudad} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                <div>
                  <div className="font-medium">{item.ciudad}</div>
                  <div className="text-sm text-muted-foreground">{item.eventos} eventos</div>
                </div>
                <div className="font-semibold">{item.ingresos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}