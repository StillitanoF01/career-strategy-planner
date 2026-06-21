import './components.css'

/** Live/active state marker. Use sparingly — one per view. */
export function StatusBadge({ children = 'OPEN' }: { children?: string }) {
  return <span className="status-badge">{children}</span>
}
