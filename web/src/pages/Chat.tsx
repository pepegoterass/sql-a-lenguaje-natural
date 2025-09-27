import React, { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { ask, type AskResponse } from '@/lib/api'
import { DataTable } from '@/components/DataTable'
import { SqlBlock } from '@/components/SqlBlock'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  data?: AskResponse
  timestamp: Date
}

interface ConversationContext {
  question: string
  sql?: string
  summary: string
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: '¿Qué quieres consultar sobre los datos? Prueba: "eventos por ciudad 2024" o "top 5 artistas".',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // Obtener contexto de conversación (últimos 3 turnos completos: pregunta del usuario + respuesta con SQL)
  const getConversationContext = (): ConversationContext[] => {
    const context: ConversationContext[] = []
    // Recorremos los mensajes del final hacia atrás buscando pares (assistant con data) y su user previo
    for (let i = messages.length - 1; i >= 0 && context.length < 3; i--) {
      const m = messages[i]
      if (m.type === 'assistant' && m.data) {
        // Buscar la pregunta del usuario inmediatamente anterior a esta respuesta
        let j = i - 1
        while (j >= 0 && messages[j].type !== 'user') j--
        const userMsg = j >= 0 ? messages[j] : undefined

        const rowCount = m.data.rows?.length || 0
        const naturalResponse = m.data.naturalResponse || ''

        let summary = ''
        if (rowCount === 0) summary = 'No se encontraron resultados'
        else if (rowCount === 1) summary = `1 resultado: ${naturalResponse.substring(0, 80)}`
        else summary = `${rowCount} resultados: ${naturalResponse.substring(0, 60)}`

        context.push({
          question: userMsg?.content || 'Consulta previa',
          sql: m.data.sql || '',
          summary
        })
        // Continuar buscando más pares hacia atrás
        i = j
      }
    }
    // El backend acepta el contexto en orden cronológico: invertimos
    return context.reverse()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Obtener contexto de conversación antes de hacer la nueva pregunta
      const context = getConversationContext()
      
      const response = await ask(input.trim(), context.length > 0 ? context : undefined)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.naturalResponse || response.explanation || 'Consulta ejecutada correctamente.',
        data: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'No se pudo procesar la consulta'}`,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Chat SQL</h1>
        <p className="text-muted-foreground">Consulta eventos, artistas y ventas en lenguaje natural</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-6 bg-muted/20 rounded-lg p-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${
            message.type === 'user' ? 'justify-end' : 'justify-start'
          }`}>
            <div className={`max-w-[80%] rounded-lg p-4 ${
              message.type === 'user' 
                ? 'bg-primary text-primary-foreground ml-auto' 
                : 'bg-background border'
            }`}>
              <div className="space-y-3">
                <div className="prose prose-sm max-w-none">
                  <p className="text-base leading-relaxed">{message.content}</p>
                </div>
                
                {message.data && (
                  <div className="space-y-3 mt-4">
                    <div className="border-t pt-3">
                      <details className="group">
                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                          <span className="text-xs">Ver SQL y tabla</span>
                          <span className="text-xs opacity-60">({message.data.rows?.length || 0} filas)</span>
                        </summary>
                        <div className="mt-3 space-y-3">
                          <SqlBlock sql={message.data.sql} collapsed />
                          
                          {message.data.rows && message.data.rows.length > 0 && (
                            <div className="max-h-64 overflow-auto">
                              <DataTable data={message.data.rows} />
                            </div>
                          )}
                        </div>
                      </details>
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        {message.data.executionTime < 1000 
                          ? `${message.data.executionTime} ms`
                          : `${(message.data.executionTime / 1000).toFixed(1)} s`
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString('es-ES')}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-background border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Procesando consulta...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre los datos..."
          className="flex-1 px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>

      <div className="mt-4 text-center">
        <div className="text-xs text-muted-foreground mb-2">Prueba preguntas como:</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            'Eventos por ciudad 2024',
            'Top 5 artistas más populares',
            'Valoraciones de Manu Chao',
            'Ventas por mes 2024'
          ].map((example) => (
            <button
              key={example}
              onClick={() => setInput(example)}
              className="px-3 py-1 text-xs bg-muted rounded-full hover:bg-accent transition-colors"
              disabled={loading}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}