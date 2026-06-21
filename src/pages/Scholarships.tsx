import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { LinkButton } from '../components/Button'
import { PinButton } from '../components/PinButton'
import { DeadlineBadge, MatchedLine, TagRow } from '../components/OppsBits'
import { ApiError, fetchScholarships } from '../lib/api'
import { projectKeywordProfile, relevanceAgainstProfile } from '../lib/skills'
import { daysUntil } from '../lib/format'
import { loadProfile, loadProjects } from '../lib/storage'
import type { Ranked, Scholarship } from '../lib/types'
import './opps.css'

export function Scholarships() {
  const [items, setItems] = useState<Scholarship[]>([])
  const [configured, setConfigured] = useState(true)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const [tag, setTag] = useState(params.get('tag') ?? '')
  const [onlyMatches, setOnlyMatches] = useState(false)
  const [closingSoon, setClosingSoon] = useState(false)

  const projects = useMemo(() => loadProjects(), [])
  const profile = useMemo(() => {
    // Augment the project profile with profile interests + study level for eligibility hints.
    const base = projectKeywordProfile(projects)
    const p = loadProfile()
    const extra = [...(p?.interests ?? []), p?.studyLevel ?? '', p?.country ?? '']
      .join(' ')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3)
    return [...new Set([...base, ...extra])]
  }, [projects])

  useEffect(() => {
    let live = true
    fetchScholarships()
      .then((res) => {
        if (!live) return
        setItems(res.scholarships)
        setConfigured(res.configured)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (!live) return
        setError(err instanceof ApiError ? err.message : 'Could not load scholarships.')
        setStatus('error')
      })
    return () => {
      live = false
    }
  }, [])

  const ranked: Ranked<Scholarship>[] = useMemo(() => {
    const scored = items.map((item) => ({
      item,
      ...relevanceAgainstProfile(
        `${item.title} ${item.provider ?? ''} ${item.eligibility ?? ''}`,
        item.tags,
        profile,
      ),
    }))
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const da = daysUntil(a.item.deadline) ?? Infinity
      const db = daysUntil(b.item.deadline) ?? Infinity
      return da - db
    })
    return scored
  }, [items, profile])

  const allTags = useMemo(() => [...new Set(items.flatMap((i) => i.tags))].sort(), [items])

  const visible = ranked.filter((r) => {
    if (tag && !r.item.tags.includes(tag)) return false
    if (onlyMatches && r.score === 0) return false
    if (closingSoon) {
      const d = daysUntil(r.item.deadline)
      if (d == null || d < 0 || d > 30) return false
    }
    return true
  })

  return (
    <div className="container">
      <PageHead
        eyebrow="Scholarship Checker"
        title="Scholarships worth chasing"
        lead="Ranked by fit to your projects and profile — deterministic keyword overlap, no AI."
      />

      {status === 'loading' && <Note title="Reaching the scholarship boards…" />}

      {status === 'error' && (
        <Note title="Couldn't reach the scholarship boards" variant="error">
          {error} Showing nothing rather than guessing.
        </Note>
      )}

      {status === 'ready' && !configured && (
        <Note title="No scholarship boards wired in yet">
          The framework is ready, but no sources are connected. Add 2–3 listing pages to{' '}
          <code>api/scholarships.ts</code> (terms / robots.txt checked first) and they'll appear
          here, ranked by fit.
        </Note>
      )}

      {status === 'ready' && configured && items.length === 0 && (
        <Note title="No scholarships found">Check back later — the boards returned nothing.</Note>
      )}

      {status === 'ready' && configured && items.length > 0 && (
        <>
          {projects.length === 0 && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Note title="Load your projects to rank these by fit">
                Open Skill Gap and import your project files to measure relevance.
              </Note>
            </div>
          )}

          <div className="opps-filters">
            <label className="field">
              <span className="field__label">Tag</span>
              <select className="select" value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={closingSoon}
                onChange={(e) => setClosingSoon(e.target.checked)}
              />
              Closing soon
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={onlyMatches}
                onChange={(e) => setOnlyMatches(e.target.checked)}
              />
              Matches my profile
            </label>
          </div>

          <div className="opps-list">
            {visible.map(({ item, matched }) => (
              <article className="opp-card" key={item.id}>
                <div>
                  <h3 className="opp-card__title">{item.title}</h3>
                  <div className="opp-card__sub">
                    {[item.provider, item.amount].filter(Boolean).join(' · ')}
                    {item.source ? ` · via ${item.source}` : ''}
                  </div>
                  {item.eligibility && <div className="opp-card__sub">{item.eligibility}</div>}
                  <TagRow tags={item.tags} />
                  <MatchedLine matched={matched} />
                </div>
                <div className="opp-card__right">
                  <DeadlineBadge deadline={item.deadline} />
                  <PinButton
                    item={{
                      id: item.id,
                      kind: 'scholarship',
                      title: item.title,
                      subtitle: item.provider,
                      url: item.url,
                      meta: item.amount,
                    }}
                  />
                  {item.url && (
                    <LinkButton href={item.url} variant="secondary" arrow>
                      Open
                    </LinkButton>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
