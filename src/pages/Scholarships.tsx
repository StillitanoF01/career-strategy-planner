import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { DrawerCard } from '../components/DrawerCard'
import { LinkButton } from '../components/Button'
import { PinButton } from '../components/PinButton'
import { DeadlineBadge, MatchedLine, TagRow } from '../components/OppsBits'
import { ApiError, fetchScholarships } from '../lib/api'
import { projectKeywordProfile, relevanceAgainstProfile } from '../lib/skills'
import { daysUntil } from '../lib/format'
import { loadProfile, loadProjects } from '../lib/storage'
import type { Ranked, Scholarship } from '../lib/types'
import './scholarships.css'

const STAGE_PER_PAGE = 9

export function Scholarships() {
  const [items, setItems] = useState<Scholarship[]>([])
  const [configured, setConfigured] = useState(true)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const [tag, setTag] = useState(params.get('tag') ?? '')
  const [onlyMatches, setOnlyMatches] = useState(false)
  const [closingSoonFilter, setClosingSoonFilter] = useState(false)
  const [stagePage, setStagePage] = useState(1)
  const cardsScrollRef = useRef<HTMLDivElement>(null)
  const [cardsOverflow, setCardsOverflow] = useState(false)

  const projects = useMemo(() => loadProjects(), [])
  const profile = useMemo(() => {
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
    return () => { live = false }
  }, [])

  // Reset stage page when filters change
  useEffect(() => { setStagePage(1) }, [tag, onlyMatches, closingSoonFilter])

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
    if (closingSoonFilter) {
      const d = daysUntil(r.item.deadline)
      if (d == null || d < 0 || d > 30) return false
    }
    return true
  })

  // Stats
  const closingSoonCount = items.filter((i) => {
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

  // Stage pagination
  const totalStagePages = Math.max(1, Math.ceil(visible.length / STAGE_PER_PAGE))
  const stageVisible = visible.slice((stagePage - 1) * STAGE_PER_PAGE, stagePage * STAGE_PER_PAGE)

  return (
    <div className="schols-wrap">

      {/* ---- Photo stage (wide screens) ---- */}
      <div className="schols-stage" role="region" aria-label="Scholarship Checker">

        {/* Left page — header + pager */}
        <div className="schols-stage__layer schols-stage__head">
          <div className="schols-stage__head-text">
            <span className="schols-stage__eyebrow">Scholarship Checker</span>
            <h1 className="schols-stage__title">Scholarships<br />worth chasing</h1>
            <p className="schols-stage__lead">
              Ranked by fit to your projects and profile.
            </p>
          </div>
          <div className="schols-stage__pager">
            <button
              className="schols-stage__pager-btn"
              disabled={stagePage <= 1}
              onClick={() => setStagePage((p) => Math.max(1, p - 1))}
            >← Prev</button>
            <span className="schols-stage__pager-info">
              {stagePage} / {totalStagePages}
            </span>
            <button
              className="schols-stage__pager-btn"
              disabled={stagePage >= totalStagePages}
              onClick={() => setStagePage((p) => p + 1)}
            >Next →</button>
          </div>
        </div>

        {/* Left page — scholarship cards grid */}
        <div className="schols-stage__layer schols-stage__cards">
        <div className="schols-stage__cards-inner" ref={cardsScrollRef}>
          {status === 'loading' && (
            <div className="schols-stage__grid">
              {Array.from({ length: STAGE_PER_PAGE }).map((_, i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          )}
          {status === 'error' && (
            <p className="schols-stage__msg">{error}</p>
          )}
          {status === 'ready' && configured && items.length === 0 && (
            <p className="schols-stage__msg">No scholarships found. Check back later.</p>
          )}
          {status === 'ready' && configured && items.length > 0 && (
            <div className="schols-stage__grid">
              {stageVisible.map(({ item, matched }) => (
                <StageScholarshipCard key={item.id} item={item} matched={matched} />
              ))}
              {Array.from({ length: Math.max(0, STAGE_PER_PAGE - stageVisible.length) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Scroll hint — only shown when cards overflow the visible area */}
        {cardsOverflow && <button
          className="schols-stage__scroll-hint"
          aria-label="Scroll cards down"
          onClick={() => cardsScrollRef.current?.scrollTo({ top: cardsScrollRef.current.scrollHeight, behavior: 'smooth' })}
        >
          <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.75" y="0.75" width="12.5" height="12.5" rx="2.25" stroke="currentColor" strokeWidth="1"/>
            <polyline points="4,5.5 7,8.5 10,5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>}

        {/* Right page — stats + deadlines + tag pills + toggles */}
        <div className="schols-stage__layer schols-stage__sidebar">

          {/* Stats row */}
          <div className="schols-stage__stats">
            <div className="schols-stage__stat">
              <span className="schols-stage__stat-num">{status === 'ready' ? items.length : '—'}</span>
              <span className="schols-stage__stat-label">Total</span>
            </div>
            <div className={`schols-stage__stat${closingSoonCount > 0 ? ' schols-stage__stat--alert' : ''}`}>
              <span className="schols-stage__stat-num">{status === 'ready' ? closingSoonCount : '—'}</span>
              <span className="schols-stage__stat-label">Closing Soon</span>
            </div>
            <div className="schols-stage__stat">
              <span className="schols-stage__stat-num">{status === 'ready' ? matchCount : '—'}</span>
              <span className="schols-stage__stat-label">Matches</span>
            </div>
          </div>

          {/* Upcoming deadlines strip */}
          <div className="schols-stage__deadlines">
            <div className="schols-stage__panel-head">Upcoming Deadlines</div>
            {upcomingDeadlines.length === 0 ? (
              <div className="schols-stage__deadlines-empty">No open deadlines</div>
            ) : (
              upcomingDeadlines.map((item) => {
                const d = daysUntil(item.deadline)!
                const label = d === 0 ? 'Today' : d === 1 ? '1 day' : `${d}d`
                const soon = d <= 14
                return (
                  <div className="schols-stage__deadline-row" key={item.id}>
                    <span className={`schols-stage__deadline-count${soon ? ' schols-stage__deadline-count--soon' : ''}`}>{label}</span>
                    <span className="schols-stage__deadline-title">{item.title}</span>
                  </div>
                )
              })
            )}
          </div>

          {/* Tag filter pills + toggles */}
          <div className="schols-stage__filters">
            <div className="schols-stage__panel-head">
              Filter
              {tag && (
                <button className="schols-stage__filter-clear" onClick={() => setTag('')}>✕ Clear</button>
              )}
            </div>
            <div className="schols-stage__tags">
              <button
                className={`schols-stage__tag-pill${!tag ? ' schols-stage__tag-pill--active' : ''}`}
                onClick={() => setTag('')}
              >
                All tags
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  className={`schols-stage__tag-pill${tag === t ? ' schols-stage__tag-pill--active' : ''}`}
                  onClick={() => setTag(tag === t ? '' : t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="schols-stage__toggles">
              <button
                className={`schols-stage__tag-pill${closingSoonFilter ? ' schols-stage__tag-pill--active' : ''}`}
                onClick={() => setClosingSoonFilter((v) => !v)}
              >
                Closing soon
              </button>
              <button
                className={`schols-stage__tag-pill${onlyMatches ? ' schols-stage__tag-pill--active' : ''}`}
                onClick={() => setOnlyMatches((v) => !v)}
              >
                Matches my profile
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ---- Stacked fallback (narrow screens) ---- */}
      <div className="schols-fallback">
        <div className="container">
          <PageHead
            eyebrow="Scholarship Checker"
            title="Scholarships worth chasing"
            lead="Ranked by fit to your projects and profile."
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
              {/* Stats bar */}
              <div className="schols-stats-bar">
                <div className="schols-stat-box">
                  <span className="schols-stat-box__num">{items.length}</span>
                  <span className="schols-stat-box__label">Total</span>
                </div>
                <div className="schols-stat-box">
                  <span className={`schols-stat-box__num${closingSoonCount > 0 ? ' schols-stat-box__num--alert' : ''}`}>{closingSoonCount}</span>
                  <span className="schols-stat-box__label">Closing Soon</span>
                </div>
                <div className="schols-stat-box">
                  <span className="schols-stat-box__num">{matchCount}</span>
                  <span className="schols-stat-box__label">Matches</span>
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

              <div className="schols-layout">
                {/* Main: scholarship cards */}
                <div>
                  <div className="schol-card-list">
                    {visible.map(({ item, matched }) => (
                      <div className="schol-card-fb" key={item.id}>
                        {item.provider && (
                          <div className="schol-card-fb__provider">{item.provider}</div>
                        )}
                        <div className="schol-card-fb__title">{item.title}</div>
                        {item.amount && (
                          <div className="schol-card-fb__meta">{item.amount}</div>
                        )}
                        {item.eligibility && (
                          <div className="schol-card-fb__meta">{item.eligibility}</div>
                        )}
                        <TagRow tags={item.tags} />
                        <MatchedLine matched={matched} />
                        <div className="schol-card-fb__foot">
                          <DeadlineBadge deadline={item.deadline} />
                          <div className="schol-card-fb__actions">
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
                              <LinkButton href={item.url} variant="secondary" arrow>Open</LinkButton>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sidebar: tag pills + toggles */}
                <aside className="schols-sidebar">
                  <div className="schols-sidebar__panel">
                    <div className="schols-sidebar__head">Filter by Tag</div>
                    <div className="schols-sidebar__tags">
                      <button
                        className={`schols-sidebar__pill${!tag ? ' schols-sidebar__pill--active' : ''}`}
                        onClick={() => setTag('')}
                      >
                        All
                      </button>
                      {allTags.map((t) => (
                        <button
                          key={t}
                          className={`schols-sidebar__pill${tag === t ? ' schols-sidebar__pill--active' : ''}`}
                          onClick={() => setTag(tag === t ? '' : t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="schols-sidebar__toggles">
                      <label className="schols-sidebar__toggle">
                        <input
                          type="checkbox"
                          checked={closingSoonFilter}
                          onChange={(e) => setClosingSoonFilter(e.target.checked)}
                        />
                        Closing soon
                      </label>
                      <label className="schols-sidebar__toggle">
                        <input
                          type="checkbox"
                          checked={onlyMatches}
                          onChange={(e) => setOnlyMatches(e.target.checked)}
                        />
                        Matches my profile
                      </label>
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

function StageScholarshipCard({ item, matched }: { item: Scholarship; matched: string[] }) {
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
    <DrawerCard label={item.provider ?? 'Scholarship'} title={item.title}>
      <div className="schol-card__meta">
        {item.amount && <div className="schol-card__row">{item.amount}</div>}
        {matched.length > 0 && (
          <div className="schol-card__row">↗ {matched.slice(0, 3).join(', ')}</div>
        )}
        {item.tags.length > 0 && (
          <div className="schol-card__tags">
            {item.tags.slice(0, 3).map((t) => (
              <span className="schol-card__tag" key={t}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="schol-card__foot">
        {deadlineLabel && (
          <span className={`schol-card__deadline${isSoon ? ' schol-card__deadline--soon' : ''}`}>
            {deadlineLabel}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3cqw', marginLeft: 'auto' }}>
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
            <LinkButton href={item.url} variant="secondary" arrow>Open</LinkButton>
          )}
        </div>
      </div>
    </DrawerCard>
  )
}
