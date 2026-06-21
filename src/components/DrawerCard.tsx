import type { ReactNode } from 'react'
import './components.css'

type DrawerCardProps = {
  /** Small uppercase drawer label (top-left). */
  label?: string
  title?: ReactNode
  children?: ReactNode
  className?: string
  onClick?: () => void
}

/** Flush record card — one project, job, talk, etc. Structure via rules, not shadow. */
export function DrawerCard({ label, title, children, className = '', onClick }: DrawerCardProps) {
  return (
    <article
      className={`drawer-card ${className}`.trim()}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {label && <span className="drawer-card__label">{label}</span>}
      {title && <h3 className="drawer-card__title">{title}</h3>}
      {children && <div className="drawer-card__body">{children}</div>}
    </article>
  )
}
