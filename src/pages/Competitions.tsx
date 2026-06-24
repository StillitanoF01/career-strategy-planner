import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { DrawerCard } from '../components/DrawerCard'
import { LinkButton } from '../components/Button'
import { PinButton } from '../components/PinButton'
import { DeadlineBadge, MatchedLine, TagRow } from '../components/OppsBits'
import { ApiError, fetchCompetitions } from '../lib/api'
import { projectKeywordProfile, relevanceAgainstProfile } from '../lib/skills'
import { daysUntil } from '../lib/format'
import { loadProjects } from '../lib/storage'
import type { Competition, Ranked } from '../lib/types'
import './competitions.css'

const STAGE_PER_PAGE = 9

export function Competitions() {
  const [items, setItems] = useState<Competition[]>([])
  const [configured, setConfigured] = useState(true)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const [tag, setTag] = useState(params.get('tag') ?? '')
  const [stagePage, setStagePage] = useState(1)
  const cardsScrollRef = useRef<HTMLDivElement>(null)
  const [cardsOverflow, setCardsOverflow] = useState(false)

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
    return () => { live = false }
  }, [])

  // Reset stage page when filter changes
  useEffect(() => { setStagePage(1) }, [tag])

  // Show scroll hint whenever the cards inner div overflows its container
  useEffect(() => {
    const el = cardsScrollRef.current
    if (!el) return
    const check = () => setCardsOverflow(el.scrollHeight > el.clientHeight + 2)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    el.addEventListener('scroll', check)
    return () => { ro.disconnect(); el.removeEventListener('scroll', check) }
  }, [status, items.length])

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
    return true
  })

  // Stats
  const closingSoon = items.filter((i) => {
    const d = daysUntil(i.deadline)
    return d != null && d >= 0 && d <= 30
  }).length
  const matchCount = ranked.filter((r) => r.score > 0).length

  // Upcoming deadlines — soonest first, open only
  const upcomingDeadlines = useMemo(() =>
    [...items]
      .filter((i) => { const d = daysUntil(i.deadline); return d != null && d >= 0 })
      .sort((a, b) => (daysUntil(a.deadline) ?? 999) - (daysUntil(b.deadline) ?? 999))
      .slice(0, 5),
    [items],
  )

  // Tag counts for type chart
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    items.forEach((i) => i.tags.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1 }))
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [items])
  const maxTagCount = tagCounts[0]?.[1] ?? 1

  // Stage pagination
  const totalStagePages = Math.max(1, Math.ceil(visible.length / STAGE_PER_PAGE))
  const stageVisible = visible.slice((stagePage - 1) * STAGE_PER_PAGE, stagePage * STAGE_PER_PAGE)

  return (
    <div className="comps-wrap">

      {/* ---- Photo stage (wide screens) ---- */}
      <div className="comps-stage" role="region" aria-label="Competition Checker">

        {/* Left page — header + pager */}
        <div className="comps-stage__layer comps-stage__head">
          <div className="comps-stage__head-text">
            <span className="comps-stage__eyebrow">Competition Checker</span>
            <h1 className="comps-stage__title">Competitions<br />worth your time</h1>
            <p className="comps-stage__lead">
              Ranked by fit to the projects you've already built.
            </p>
          </div>
          <div className="comps-stage__pager">
            <button
              className="comps-stage__pager-btn"
              disabled={stagePage <= 1}
              onClick={() => setStagePage((p) => Math.max(1, p - 1))}
            >← Prev</button>
            <span className="comps-stage__pager-info">
              {stagePage} / {totalStagePages}
            </span>
            <button
              className="comps-stage__pager-btn"
              disabled={stagePage >= totalStagePages}
              onClick={() => setStagePage((p) => p + 1)}
            >Next →</button>
          </div>
        </div>

        {/* Left page — competition cards grid */}
        <div className="comps-stage__layer comps-stage__cards">
          <div className="comps-stage__cards-inner" ref={cardsScrollRef}>
            {status === 'loading' && (
              <div className="comps-stage__grid">
                {Array.from({ length: STAGE_PER_PAGE }).map((_, i) => (
                  <div className="skeleton" key={i} />
                ))}
              </div>
            )}
            {status === 'error' && (
              <p className="comps-stage__msg">{error}</p>
            )}
            {status === 'ready' && configured && items.length === 0 && (
              <p className="comps-stage__msg">No competitions found. Check back later.</p>
            )}
            {status === 'ready' && configured && items.length > 0 && (
              <div className="comps-stage__grid">
                {stageVisible.map(({ item, matched }) => (
                  <StageCompCard key={item.id} item={item} matched={matched} />
                ))}
                {/* Fill empty cells so grid stays 3×3 */}
                {Array.from({ length: Math.max(0, STAGE_PER_PAGE - stageVisible.length) }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ border: '1px solid rgba(44,42,36,0.1)', borderRadius: 'var(--radius-sm)' }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Scroll hint — only shown when cards overflow the visible area */}
        {cardsOverflow && (
          <button
            className="comps-stage__scroll-hint"
            aria-label="Scroll cards down"
            onClick={() => cardsScrollRef.current?.scrollTo({ top: cardsScrollRef.current.scrollHeight, behavior: 'smooth' })}
          >
            <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.75" y="0.75" width="12.5" height="12.5" rx="2.25" stroke="currentColor" strokeWidth="1"/>
              <polyline points="4,5.5 7,8.5 10,5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Right page — stats + tag filters */}
        <div className="comps-stage__layer comps-stage__sidebar">

          {/* Stats row */}
          <div className="comps-stage__stats">
            <div className="comps-stage__stat">
              <span className="comps-stage__stat-num">{status === 'ready' ? items.length : '—'}</span>
              <span className="comps-stage__stat-label">Total</span>
            </div>
            <div className={`comps-stage__stat${closingSoon > 0 ? ' comps-stage__stat--alert' : ''}`}>
              <span className="comps-stage__stat-num">{status === 'ready' ? closingSoon : '—'}</span>
              <span className="comps-stage__stat-label">Closing Soon</span>
            </div>
            <div className="comps-stage__stat">
              <span className="comps-stage__stat-num">{status === 'ready' ? matchCount : '—'}</span>
              <span className="comps-stage__stat-label">Matches</span>
            </div>
          </div>

          {/* Upcoming deadlines strip */}
          <div className="comps-stage__deadlines">
            <div className="comps-stage__panel-head">Upcoming Deadlines</div>
            {upcomingDeadlines.length === 0 ? (
              <div className="comps-stage__deadlines-empty">No open deadlines</div>
            ) : (
              upcomingDeadlines.map((item) => {
                const d = daysUntil(item.deadline)!
                const label = d === 0 ? 'Today' : d === 1 ? '1 day' : `${d}d`
                const soon = d <= 14
                return (
                  <div className="comps-stage__deadline-row" key={item.id}>
                    <span className={`comps-stage__deadline-count${soon ? ' comps-stage__deadline-count--soon' : ''}`}>{label}</span>
                    <span className="comps-stage__deadline-title">{item.title}</span>
                  </div>
                )
              })
            )}
          </div>

          {/* Type breakdown chart */}
          <div className="comps-stage__chart">
            <div className="comps-stage__panel-head">
              Competition Types
              {tag && (
                <button className="comps-stage__chart-clear" onClick={() => setTag('')}>✕ Clear</button>
              )}
            </div>
            <div className="comps-stage__chart-rows">
              {tagCounts.map(([t, count]) => (
                <button
                  key={t}
                  className={`comps-stage__chart-row${tag === t ? ' comps-stage__chart-row--active' : ''}`}
                  onClick={() => setTag(tag === t ? '' : t)}
                >
                  <span className="comps-stage__chart-label">{t}</span>
                  <div className="comps-stage__chart-bar-wrap">
                    <div
                      className="comps-stage__chart-bar"
                      style={{ width: `${(count / maxTagCount) * 100}%` }}
                    />
                  </div>
                  <span className="comps-stage__chart-count">{count}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ---- Stacked fallback (narrow screens) ---- */}
      <div className="comps-fallback">
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
              <code>api/competitions.ts</code> and they'll appear here, ranked by fit.
            </Note>
          )}

          {status === 'ready' && configured && items.length === 0 && (
            <Note title="No competitions found">Check back later — the boards returned nothing.</Note>
          )}

          {status === 'ready' && configured && items.length > 0 && (
            <>
              {/* Stats bar */}
              <div className="comps-stats-bar">
                <div className="comps-stat-box">
                  <span className="comps-stat-box__num">{items.length}</span>
                  <span className="comps-stat-box__label">Total</span>
                </div>
                <div className="comps-stat-box">
                  <span className={`comps-stat-box__num${closingSoon > 0 ? ' comps-stat-box__num--alert' : ''}`}>{closingSoon}</span>
                  <span className="comps-stat-box__label">Closing Soon</span>
                </div>
                <div className="comps-stat-box">
                  <span className="comps-stat-box__num">{matchCount}</span>
                  <span className="comps-stat-box__label">Matches</span>
                </div>
              </div>

              {projects.length === 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <Note title="Load your projects to rank these by fit">
                    Without your drawers we can't measure relevance. Open Skill Gap and import your
                    project files.
                  </Note>
                </div>
              )}

              <div className="comps-layout">
                {/* Main: competition cards */}
                <div>
                  <div className="comp-card-list">
                    {visible.map(({ item, matched }) => (
                      <div className="comp-card-fb" key={item.id}>
                        {item.organiser && (
                          <div className="comp-card-fb__organiser">{item.organiser}</div>
                        )}
                        <div className="comp-card-fb__title">{item.title}</div>
                        {item.location && (
                          <div className="comp-card-fb__meta">{item.location}</div>
                        )}
                        <TagRow tags={item.tags} />
                        <MatchedLine matched={matched} />
                        <div className="comp-card-fb__foot">
                          <DeadlineBadge deadline={item.deadline} />
                          <div className="comp-card-fb__actions">
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
                              <LinkButton href={item.url} variant="secondary" arrow>Open</LinkButton>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sidebar: tag pills + match toggle */}
                <aside className="comps-sidebar">
                  <div className="comps-sidebar__panel">
                    <div className="comps-sidebar__head">Filter by Tag</div>
                    <div className="comps-sidebar__tags">
                      <button
                        className={`comps-sidebar__pill${!tag ? ' comps-sidebar__pill--active' : ''}`}
                        onClick={() => setTag('')}
                      >
                        All
                      </button>
                      {allTags.map((t) => (
                        <button
                          key={t}
                          className={`comps-sidebar__pill${tag === t ? ' comps-sidebar__pill--active' : ''}`}
                          onClick={() => setTag(tag === t ? '' : t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  )
}

function StageCompCard({ item, matched }: { item: Competition; matched: string[] }) {
  const d = daysUntil(item.deadline)
  const deadlineLabel = d == null
    ? null
    : d < 0
    ? 'Closed'
    : d === 0
    ? 'Closes today'
    : d <= 14
    ? `Closes in ${d}d`
    : new Date(item.deadline as string).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const isSoon = d != null && d >= 0 && d <= 14

  return (
    <DrawerCard label={item.organiser ?? 'Competition'} title={item.title}>
      <div className="comp-card__meta">
        {item.location && <div className="comp-card__row">{item.location}</div>}
        {matched.length > 0 && (
          <div className="comp-card__row">↗ {matched.slice(0, 3).join(', ')}</div>
        )}
        {item.tags.length > 0 && (
          <div className="comp-card__tags">
            {item.tags.slice(0, 3).map((t) => (
              <span className="comp-card__tag" key={t}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="comp-card__foot">
        {deadlineLabel && (
          <span className={`comp-card__deadline${isSoon ? ' comp-card__deadline--soon' : ''}`}>
            {deadlineLabel}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3cqw', marginLeft: 'auto' }}>
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
            <LinkButton href={item.url} variant="secondary" arrow>Open</LinkButton>
          )}
        </div>
      </div>
    </DrawerCard>
  )
}
