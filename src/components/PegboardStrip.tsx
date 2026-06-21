import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import './components.css'

export type PegItem = {
  to: string
  /** Accessible name for the cell (icons carry no visible label). */
  label: string
  Icon: ComponentType<{ size?: number; stroke?: number }>
  /** Optional live count badge (jobs found, gaps, talks…). */
  count?: number
}

/** The signature moment — a flush row of tool silhouettes on a pegboard. */
export function PegboardStrip({ items }: { items: PegItem[] }) {
  return (
    <nav className="pegboard" aria-label="Modules">
      {items.map(({ to, label, Icon, count }) => (
        <Link key={to} to={to} className="pegboard__cell" aria-label={label} title={label}>
          {typeof count === 'number' && <span className="pegboard__count">{count}</span>}
          <Icon size={24} stroke={1.5} />
        </Link>
      ))}
    </nav>
  )
}
