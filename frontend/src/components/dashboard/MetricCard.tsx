import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: number
  unit: string
  change: number
  tone: 'blue' | 'orange' | 'red' | 'green'
  icon: ReactNode
  onClick: () => void
}

export function MetricCard({ label, value, unit, change, tone, icon, onClick }: MetricCardProps) {
  const positive = change >= 0
  return (
    <button className="metric-card" onClick={onClick}>
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <span className="metric-content">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{value.toLocaleString()} <small>{unit}</small></span>
        <span className={`metric-change ${positive && tone !== 'green' ? 'up' : 'down'}`}>
          较昨日 {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(change)}%
        </span>
      </span>
      <span className="metric-arrow">›</span>
    </button>
  )
}
