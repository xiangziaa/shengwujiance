import type { ReactNode } from 'react'

interface PageHeadingProps {
  title: string
  description: string
  eyebrow?: string
  actions?: ReactNode
}

export function PageHeading({ title, description, eyebrow, actions }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        <div className="page-heading-line">
          <h1>{title}</h1>
          <span>{description}</span>
        </div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
