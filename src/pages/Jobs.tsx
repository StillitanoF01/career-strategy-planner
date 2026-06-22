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
]

const PER_PAGE = 20

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

  // Fetch jobs whenever state / page / applied term changes.
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
    return () => {
      live = false
    }
  }, [state, page, appliedTerm])

  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE))

  // Build a set of lowercase company names from loaded jobs for hiring detection.
  const hiringNames = new Set(jobs.map((j) => j.company.toLowerCase()))
  function isHiring(firmName: string) {
    const needle = firmName.toLowerCase()
    for (const name of hiringNames) {
      if (name.includes(needle) || needle.includes(name)) return true
    }
    return false
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    setAppliedTerm(term.trim() || 'architecture')
  }

  return (
    <div className="container">
      <PageHead
        eyebrow="Job Searcher"
        title="Who's hiring now"
        lead="Live openings and the top architecture firms, filterable by country and term."
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
              <option key={s.where} value={s.where}>
                {s.label}
              </option>
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
        <Button type="submit" arrow>
          Search
        </Button>
      </form>

      <div className="jobs-layout">
        <div>
          <div className="view-head">
            <h2>Openings</h2>
          </div>

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
                  <JobCard key={job.id} job={job} country="au" />
                ))}
              </div>
              <div className="pager">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </Button>
                <span className="pager__status">
                  Page {page} of {totalPages} · {count.toLocaleString()} openings
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
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
              <div className="top-companies__row" key={f.name}>
                <span className="top-companies__rank">{i + 1}</span>
                <span className="top-companies__name">
                  {f.name}
                  {isHiring(f.name) && (
                    <span className="firm-hiring-badge">Hiring</span>
                  )}
                </span>
                <span className="top-companies__count">{f.note}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function JobCard({ job, country }: { job: Job; country: string }) {
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, country)
  return (
    <DrawerCard label={job.company} title={job.title}>
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
            <LinkButton href={job.url} variant="secondary" arrow>
              View
            </LinkButton>
          )}
        </div>
      </div>
    </DrawerCard>
  )
}
