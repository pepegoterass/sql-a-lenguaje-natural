// Prefer same-origin when app is served by the backend (Express serves web/dist on port 3000)
// Falls back to VITE_API_BASE for standalone dev of the frontend
const originBase = typeof window !== 'undefined' ? `${window.location.origin}/api` : undefined
const API_BASE = (import.meta as any).env?.VITE_API_BASE || originBase || 'http://localhost:3000/api'
const USE_MOCKS = (import.meta as any).env?.VITE_USE_MOCKS === 'true'

export interface AskResponse {
  sql: string
  rows: any[]
  explanation?: string
  naturalResponse?: string
  executionTime: number
  resolvedBy?: string
}

export interface KpiData {
  eventos: number
  entradas: number
  facturacion: number
  notaMedia: number
  eventosChange?: number
  entradasChange?: number
  facturacionChange?: number
  notaMediaChange?: number
}

export interface VentasData {
  fecha: string
  ventas: number
  ingresos: number
}

export interface CiudadData {
  ciudad: string
  eventos: number
  ingresos: number
}

// Mock data for development
const mockKpis: KpiData = {
  eventos: 24,
  entradas: 1247,
  facturacion: 89760,
  notaMedia: 4.7,
  eventosChange: 12,
  entradasChange: 8.5,
  facturacionChange: 15.2,
  notaMediaChange: 2.1
}

const mockVentas: VentasData[] = [
  { fecha: '2024-01', ventas: 145, ingresos: 12500 },
  { fecha: '2024-02', ventas: 189, ingresos: 15800 },
  { fecha: '2024-03', ventas: 234, ingresos: 18900 },
  { fecha: '2024-04', ventas: 167, ingresos: 14200 },
  { fecha: '2024-05', ventas: 298, ingresos: 24300 },
  { fecha: '2024-06', ventas: 213, ingresos: 17600 }
]

const mockCiudades: CiudadData[] = [
  { ciudad: 'Madrid', eventos: 8, ingresos: 34500 },
  { ciudad: 'Barcelona', eventos: 6, ingresos: 28900 },
  { ciudad: 'Valencia', eventos: 4, ingresos: 18700 },
  { ciudad: 'Sevilla', eventos: 3, ingresos: 12400 },
  { ciudad: 'Bilbao', eventos: 3, ingresos: 11200 }
]

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  if (USE_MOCKS) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (endpoint.includes('/ask')) {
      return {
        sql: "SELECT * FROM evento LIMIT 10",
        rows: [
          { id: 1, titulo: 'Concierto Rock', fecha: '2024-09-15', precio: 45 },
          { id: 2, titulo: 'Opera Carmen', fecha: '2024-09-20', precio: 65 }
        ],
        explanation: "Esta consulta obtiene los eventos disponibles",
        naturalResponse: "He encontrado 2 eventos disponibles en la base de datos.",
        executionTime: 150,
        resolvedBy: 'mock'
      } as T
    }
    
    if (endpoint.includes('/kpis')) return mockKpis as T
    if (endpoint.includes('/ventas')) return mockVentas as T
    if (endpoint.includes('/ciudades')) return mockCiudades as T
    
    throw new Error('Mock endpoint not implemented')
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || error.details || 'API request failed')
  }

  return response.json()
}

export async function ask(question: string, conversationContext?: Array<{question: string, sql?: string, summary: string}>): Promise<AskResponse> {
  return apiRequest<AskResponse>('/ask', {
    method: 'POST',
    body: JSON.stringify({ question, conversationContext })
  })
}

export async function getKpis(params?: { from?: string; to?: string }): Promise<KpiData> {
  const searchParams = new URLSearchParams(params || {})
  return apiRequest<KpiData>(`/widgets/kpis?${searchParams}`)
}

export async function getVentas(granularity: 'day' | 'month' | 'year' = 'month'): Promise<VentasData[]> {
  return apiRequest<VentasData[]>(`/widgets/ventas?granularity=${granularity}`)
}

export async function getTopCiudades(limit: number = 5): Promise<CiudadData[]> {
  return apiRequest<CiudadData[]>(`/widgets/top-ciudades?limit=${limit}`)
}

export async function checkHealth(): Promise<{ status: string; database: string }> {
  return apiRequest<{ status: string; database: string }>('/health')
}