import type { ReactNode } from 'react'

interface SectionPanelProps {
  title?: string
  subtitle?: string
  extra?: ReactNode
  children: ReactNode
  className?: string
}

export function SectionPanel({ title, subtitle, extra, children, className = '' }: SectionPanelProps) {
  return (
    <section className={`section-panel ${className}`}>
      {(title || extra) && (
        <div className="section-panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {extra}
        </div>
      )}
      {children}
    </section>
  )
}
