import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { DrawerCard } from '../components/DrawerCard'
import { Button, LinkButton } from '../components/Button'
import { PinButton } from '../components/PinButton'
import { ApiError, fetchJobs } from '../lib/api'
import type { Job } from '../lib/types'
import { formatSalaryRange, timeAgo } from '../lib/format'
import './jobs.css'

const AU_STATES = [
  { label: 'Sydney NSW', where: 'Sydney' },
  { label: 'Melbourne VIC', where: 'Melbourne' },
  { label: 'Brisbane QLD', where: 'Brisbane' },
  { label: 'Perth WA', where: 'Perth' },
  { label: 'Adelaide SA', where: 'Adelaide' },
  { label: 'Canberra ACT', where: 'Canberra' },
  { label: 'Hobart TAS', where: 'Hobart' },
  { label: 'Darwin NT', where: 'Darwin' },
]

const ARCH_FIRMS = [
  { name: 'Hassell', note: 'Major Australian practice' },
  { name: 'Woods Bagot', note: 'Global design studio' },
  { name: 'Cox Architecture', note: 'Sydney-based, 60+ years' },
  { name: 'Architectus', note: 'Urban & civic focus' },
  { name: 'Fender Katsalidis', note: 'High-rise & mixed-use' },
  { name: 'Grimshaw', note: 'Transport & cultural' },
  { name: 'Tzannes', note: 'Award-winning Sydney firm' },
  { name: 'BVN', note: 'Research-led practice' },
  { name: 'Lahznimmo', note: 'Public architecture' },
  { name: 'SJB', note: 'Housing & urban design' },
  { name: 'ARM Architecture', note: 'Critical practice' },
  { name: 'Lyons', note: 'Research & civic buildings' },
  { name: 'Bates Smart', note: 'Workplace & hospitality' },
  { name: 'Populous', note: 'Sports & entertainment' },
  { name: 'Conrad Gargett', note: 'Queensland practice' },
  { name: 'Warren and Mahoney', note: 'Trans-Tasman studio' },
  { name: 'ThomsonAdsett', note: 'Health & education' },
  { name: 'Group GSA', note: 'Multi-disciplinary' },
  { name: 'Scott Carver', note: 'Retail & urban design' },
  { name: 'NBRS Architecture', note: 'Community & education' },
]

const PER_PAGE = 9

export function Jobs() {
  const [params] = useSearchParams()
  const initialTerm = params.get('what') ?? 'architecture'
  const initialState = AU_STATES[0]

  const [state, setState] = useState(initialState)
  const [term, setTerm] = useState(initialTerm)
  const [appliedTerm, setAppliedTerm] = useState(initialTerm)
  const [page, setPage] = useState(1)

  const [jobs, setJobs] = useState<Job[]>([])
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading')
    setError('')
    fetchJobs({ country: 'au', page, what: appliedTerm, where: state.where })
      .then((res) => {
        if (!live) return
        setJobs(res.jobs)
        setCount(res.count)
        setStatus(res.jobs.length ? 'ready' : 'empty')
      })
      .catch((err: unknown) => {
        if (!live) return
        setError(err instanceof ApiError ? err.message : "Adzuna didn't answer. Try again shortly.")
        setStatus('error')
      })
    return () => { live = false }
  }, [state, page, appliedTerm])

  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE))

  const jobCompanies = jobs.map((j) => j.company.toLowerCase())
  function isHiring(firmName: string) {
    const needle = firmName.toLowerCase()
    return jobCompanies.some((c) => c.includes(needle) || needle.includes(c))
  }
  function isArchFirmJob(company: string) {
    const c = company.toLowerCase()
    return ARCH_FIRMS.some((f) => c.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(c))
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setAppliedTerm(term.trim() || 'architecture')
  }

  return (
    <div className="jobs-wrap">

      {/* ---- Photo stage (wide screens) ---- */}
      <div className="jobs-stage" role="region" aria-label="Job Searcher">

        {/* Left page — header + pager side by side */}
        <div className="jobs-stage__layer jobs-stage__head">
          <div className="jobs-stage__head-text">
            <span className="jobs-stage__eyebrow">Job Searcher</span>
            <h1 className="jobs-stage__title">Who's<br />hiring now</h1>
            <p className="jobs-stage__lead">
              Live openings across Australia's top architecture firms.
            </p>
          </div>
          <div className="jobs-stage__pager">
            <button
              className="jobs-stage__pager-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >← Prev</button>
            <span className="jobs-stage__pager-info">
              {page} / {totalPages}
            </span>
            <button
              className="jobs-stage__pager-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >Next →</button>
          </div>
        </div>

        {/* Left page — job cards grid only */}
        <div className="jobs-stage__layer jobs-stage__cards">
          {status === 'loading' && (
            <div className="jobs-stage__grid">
              {Array.from({ length: PER_PAGE }).map((_, i) => (
                <div className="skeleton" key={i} />
              ))}
            </div>
          )}
          {status === 'error' && (
            <p className="jobs-stage__msg">{error}</p>
          )}
          {status === 'empty' && (
            <p className="jobs-stage__msg">No openings matched. Widen the search.</p>
          )}
          {status === 'ready' && (
            <div className="jobs-stage__grid">
              {jobs.slice(0, PER_PAGE).map((job) => (
                <JobCard key={job.id} job={job} country="au" highlighted={isArchFirmJob(job.company)} />
              ))}
            </div>
          )}
        </div>

        {/* Right page — search form + architecture firms */}
        <div className="jobs-stage__layer jobs-stage__sidebar">
          <form className="jobs-stage__form" onSubmit={onSearch}>
            <div className="jobs-stage__form-row">
              <label className="jobs-stage__field">
                <span className="jobs-stage__field-label">State</span>
                <select
                  className="jobs-stage__select"
                  value={state.where}
                  onChange={(e) => {
                    const s = AU_STATES.find((s) => s.where === e.target.value) ?? AU_STATES[0]
                    setState(s)
                    setPage(1)
                  }}
                >
                  {AU_STATES.map((s) => (
                    <option key={s.where} value={s.where}>{s.label}</option>
                  ))}
                </select>
              </label>
              <label className="jobs-stage__field">
                <span className="jobs-stage__field-label">Search term</span>
                <input
                  className="jobs-stage__input"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="architecture"
                />
              </label>
              <div className="jobs-stage__field">
                <span className="jobs-stage__field-label">&nbsp;</span>
                <button type="submit" className="jobs-stage__search-btn">Search →</button>
              </div>
            </div>
          </form>

          <div className="jobs-stage__firms">
            <div className="jobs-stage__firms-head">Top Architecture Firms</div>
            <div className="jobs-stage__firms-grid">
              {ARCH_FIRMS.map((f, i) => (
                <div
                  className={`jobs-stage__firm-row${isHiring(f.name) ? ' jobs-stage__firm-row--hiring' : ''}`}
                  key={f.name}
                >
                  <span className="jobs-stage__firm-rank">{i + 1}</span>
                  <div className="jobs-stage__firm-info">
                    <span className="jobs-stage__firm-name">
                      {f.name}
                      {isHiring(f.name) && <span className="firm-hiring-badge">Hiring</span>}
                    </span>
                    <span className="jobs-stage__firm-note">{f.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ---- Stacked fallback (narrow screens) ---- */}
      <div className="jobs-fallback">
        <div className="container">
          <PageHead
            eyebrow="Job Searcher"
            title="Who's hiring now"
            lead="Live openings and the top architecture firms, filterable by state and term."
          />

          <form className="jobs-controls" onSubmit={onSearch}>
            <label className="field">
              <span className="field__label">State</span>
              <select
                className="select"
                value={state.where}
                onChange={(e) => {
                  const s = AU_STATES.find((s) => s.where === e.target.value) ?? AU_STATES[0]
                  setState(s)
                  setPage(1)
                }}
              >
                {AU_STATES.map((s) => (
                  <option key={s.where} value={s.where}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ flex: 1, minWidth: 200 }}>
              <span className="field__label">Search term</span>
              <input
                className="input"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="architecture"
              />
            </label>
            <Button type="submit" arrow>Search</Button>
          </form>

          <div className="jobs-layout">
            <div>
              <div className="view-head"><h2>Openings</h2></div>

              {status === 'loading' && (
                <div className="jobs-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div className="skeleton" key={i} />
                  ))}
                </div>
              )}
              {status === 'error' && (
                <Note title="Adzuna didn't answer" variant="error">
                  {error} If you just set up the app, check your Adzuna keys are in <code>.env</code>.
                </Note>
              )}
              {status === 'empty' && (
                <Note title="No openings matched">Widen the country or term, then search again.</Note>
              )}
              {status === 'ready' && (
                <>
                  <div className="jobs-grid">
                    {jobs.map((job) => (
                      <JobCard key={job.id} job={job} country="au" highlighted={isArchFirmJob(job.company)} />
                    ))}
                  </div>
                  <div className="pager">
                    <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      ← Prev
                    </Button>
                    <span className="pager__status">
                      Page {page} of {totalPages} · {count.toLocaleString()} openings
                    </span>
                    <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                      Next →
                    </Button>
                  </div>
                </>
              )}
            </div>

            <aside>
              <div className="top-companies">
                <div className="top-companies__head">
                  <span className="top-companies__title">Top Architecture Firms</span>
                </div>
                {ARCH_FIRMS.map((f, i) => (
                  <div className={`top-companies__row${isHiring(f.name) ? ' top-companies__row--hiring' : ''}`} key={f.name}>
                    <span className="top-companies__rank">{i + 1}</span>
                    <span className="top-companies__name">
                      {f.name}
                      {isHiring(f.name) && <span className="firm-hiring-badge">Hiring</span>}
                    </span>
                    <span className="top-companies__count">{f.note}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </div>

    </div>
  )
}

function JobCard({ job, country, highlighted }: { job: Job; country: string; highlighted?: boolean }) {
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, country)
  return (
    <DrawerCard label={job.company} title={job.title} className={highlighted ? 'drawer-card--hiring' : ''}>
      <div className="job-card__meta">
        <div className="job-card__row">
          <span>{job.location}</span>
        </div>
        {salary && (
          <div className="job-card__row">
            <span className="job-card__salary">{salary}</span>
          </div>
        )}
      </div>
      <div className="job-card__foot">
        <span className="job-card__date">{timeAgo(job.created)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <PinButton
            item={{
              id: job.id,
              kind: 'job',
              title: job.title,
              subtitle: job.company,
              url: job.url,
              meta: job.location,
            }}
          />
          {job.url && (
            <LinkButton href={job.url} variant="secondary" arrow>View</LinkButton>
          )}
        </div>
      </div>
    </DrawerCard>
  )
}
