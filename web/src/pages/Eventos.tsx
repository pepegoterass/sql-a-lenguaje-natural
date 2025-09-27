
import { DataTable } from '@/components/DataTable'

export function Eventos() {
  const eventosData = [
    { id: 1, titulo: 'Concierto Rock Madrid', fecha: '2024-09-15', ciudad: 'Madrid', precio: 45, capacidad: 200, vendidas: 180 },
    { id: 2, titulo: 'Opera Carmen Barcelona', fecha: '2024-09-20', ciudad: 'Barcelona', precio: 65, capacidad: 150, vendidas: 140 },
    { id: 3, titulo: 'Teatro Clásico Valencia', fecha: '2024-09-25', ciudad: 'Valencia', precio: 30, capacidad: 120, vendidas: 95 },
    { id: 4, titulo: 'Danza Contemporánea Sevilla', fecha: '2024-10-01', ciudad: 'Sevilla', precio: 40, capacidad: 100, vendidas: 88 },
    { id: 5, titulo: 'Jazz Night Bilbao', fecha: '2024-10-05', ciudad: 'Bilbao', precio: 35, capacidad: 80, vendidas: 75 }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-muted-foreground">Gestión de eventos culturales</p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-muted rounded-lg hover:bg-accent transition-colors">
            Filtrar
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Nuevo Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">24</div>
          <div className="text-sm text-muted-foreground">Eventos Activos</div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">578</div>
          <div className="text-sm text-muted-foreground">Entradas Vendidas</div>
        </div>
        <div className="bg-card rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">87%</div>
          <div className="text-sm text-muted-foreground">Ocupación Media</div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Lista de Eventos</h2>
          <div className="text-sm text-muted-foreground">
            {eventosData.length} eventos
          </div>
        </div>
        
        <DataTable data={eventosData} />
      </div>
    </div>
  )
}