import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { LinkButton } from '../components/Button'
import { PinButton } from '../components/PinButton'
import { DeadlineBadge, MatchedLine, TagRow } from '../components/OppsBits'
import { ApiError, fetchCompetitions } from '../lib/api'
import { projectKeywordProfile, relevanceAgainstProfile } from '../lib/skills'
import { daysUntil } from '../lib/format'
import { loadProjects } from '../lib/storage'
import type { Competition, Ranked } from '../lib/types'
import './opps.css'

export function Competitions() {
  const [items, setItems] = useState<Competition[]>([])
  const [configured, setConfigured] = useState(true)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const [tag, setTag] = useState(params.get('tag') ?? '')
  const [onlyMatches, setOnlyMatches] = useState(false)

  const projects = useMemo(() => loadProjects(), [])
  const profile = useMemo(() => projectKeywordProfile(projects), [projects])

  useEffect(() => {
    let live = true
    fetchCompetitions()
      .then((res) => {
        if (!live) return
        setItems(res.competitions)
        setConfigured(res.configured)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (!live) return
        setError(err instanceof ApiError ? err.message : 'Could not load competitions.')
        setStatus('error')
      })
    return () => {
      live = false
    }
  }, [])

  const ranked: Ranked<Competition>[] = useMemo(() => {
    const scored = items.map((item) => ({
      item,
      ...relevanceAgainstProfile(`${item.title} ${item.organiser ?? ''}`, item.tags, profile),
    }))
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const da = daysUntil(a.item.deadline) ?? Infinity
      const db = daysUntil(b.item.deadline) ?? Infinity
      return da - db
    })
    return scored
  }, [items, profile])

  const allTags = useMemo(
    () => [...new Set(items.flatMap((i) => i.tags))].sort(),
    [items],
  )

  const visible = ranked.filter((r) => {
    if (tag && !r.item.tags.includes(tag)) return false
    if (onlyMatches && r.score === 0) return false
    return true
  })

  return (
    <div className="container">
      <PageHead
        eyebrow="Competition Checker"
        title="Competitions worth your time"
        lead="Ranked by fit to the projects you've already built — no AI, just keyword overlap."
      />

      {status === 'loading' && <Note title="Reaching the competition boards…" />}

      {status === 'error' && (
        <Note title="Couldn't reach the competition boards" variant="error">
          {error} Showing nothing rather than guessing.
        </Note>
      )}

      {status === 'ready' && !configured && (
        <Note title="No competition boards wired in yet">
          The framework is ready, but no sources are connected. Add 2–3 listing pages to{' '}
          <code>api/competitions.ts</code> (terms / robots.txt checked first) and they'll appear
          here, ranked by fit.
        </Note>
      )}

      {status === 'ready' && configured && items.length === 0 && (
        <Note title="No competitions found">Check back later — the boards returned nothing.</Note>
      )}

      {status === 'ready' && configured && items.length > 0 && (
        <>
          {projects.length === 0 && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Note title="Load your projects to rank these by fit">
                Without your drawers we can't measure relevance. Open Skill Gap and import your
                project files.
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
                checked={onlyMatches}
                onChange={(e) => setOnlyMatches(e.target.checked)}
              />
              Only show matches to my projects
            </label>
          </div>

          <div className="opps-list">
            {visible.map(({ item, matched }) => (
              <article className="opp-card" key={item.id}>
                <div>
                  <h3 className="opp-card__title">{item.title}</h3>
                  <div className="opp-card__sub">
                    {[item.organiser, item.location].filter(Boolean).join(' · ')}
                    {item.source ? ` · via ${item.source}` : ''}
                  </div>
                  <TagRow tags={item.tags} />
                  <MatchedLine matched={matched} />
                </div>
                <div className="opp-card__right">
                  <DeadlineBadge deadline={item.deadline} />
                  <PinButton
                    item={{
                      id: item.id,
                      kind: 'competition',
                      title: item.title,
                      subtitle: item.organiser,
                      url: item.url,
                      meta: item.deadline,
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
