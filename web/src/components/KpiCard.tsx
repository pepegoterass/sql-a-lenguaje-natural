import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: number
  change?: number
  format?: 'number' | 'currency'
  icon?: React.ReactNode
}

export function KpiCard({ title, value, change, format = 'number', icon }: KpiCardProps) {
  const formattedValue = format === 'currency' ? formatCurrency(value) : formatNumber(value)
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      
      <div className="space-y-2">
        <div className="text-2xl font-bold">{formattedValue}</div>
        
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
          }`}>
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}