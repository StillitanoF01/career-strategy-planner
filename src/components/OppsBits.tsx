import { daysUntil } from '../lib/format'
import '../pages/opps.css'

/** Rust badge if the deadline is within 14 days; quiet badge otherwise. */
export function DeadlineBadge({ deadline }: { deadline?: string }) {
  const d = daysUntil(deadline)
  if (d == null) return null
  if (d < 0) return <span className="deadline-badge deadline-badge--later">Closed</span>
  if (d <= 14) {
    return (
      <span className="deadline-badge deadline-badge--soon">
        {d === 0 ? 'Closes today' : `Closes in ${d}d`}
      </span>
    )
  }
  const when = new Date(deadline as string).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
  return <span className="deadline-badge deadline-badge--later">Due {when}</span>
}

export function TagRow({ tags }: { tags: string[] }) {
  if (!tags.length) return null
  return (
    <div className="tag-row">
      {tags.map((t) => (
        <span className="tag" key={t}>
          {t}
        </span>
      ))}
    </div>
  )
}

export function MatchedLine({ matched }: { matched: string[] }) {
  if (!matched.length) return null
  return (
    <div className="opp-card__matched">
      Matched: <b>{matched.slice(0, 5).join(', ')}</b>
    </div>
  )
}
