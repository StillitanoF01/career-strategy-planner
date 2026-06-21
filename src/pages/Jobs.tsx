import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { DrawerCard } from '../components/DrawerCard'
import { Button, LinkButton } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import { PinButton } from '../components/PinButton'
import { ApiError, fetchJobs, fetchTopCompanies } from '../lib/api'
import { COUNTRIES } from '../lib/countries'
import { useProfile } from '../lib/store'
import type { Job, TopCompany } from '../lib/types'
import { formatSalaryRange, timeAgo } from '../lib/format'
import './jobs.css'

const PER_PAGE = 20

export function Jobs() {
  const profile = useProfile()
  const [params] = useSearchParams()
  // Cross-module wiring: /jobs?what=Revit&country=gb pre-fills the search.
  const initialTerm = params.get('what') ?? 'architecture'
  const initialCountry = params.get('country') ?? profile?.country ?? 'au'

  const [country, setCountry] = useState(initialCountry)
  const [term, setTerm] = useState(initialTerm)
  const [appliedTerm, setAppliedTerm] = useState(initialTerm)
  const [page, setPage] = useState(1)

  const [jobs, setJobs] = useState<Job[]>([])
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [error, setError] = useState('')

  const [companies, setCompanies] = useState<TopCompany[]>([])

  // Fetch jobs whenever country / page / applied term changes.
  useEffect(() => {
    let live = true
    // Show the loading skeleton immediately on (re)fetch — intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading')
    setError('')
    fetchJobs({ country, page, what: appliedTerm })
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
  }, [country, page, appliedTerm])

  // Fetch top companies when country changes.
  useEffect(() => {
    let live = true
    fetchTopCompanies({ country })
      .then((res) => live && setCompanies(res.companies.slice(0, 10)))
      .catch(() => live && setCompanies([]))
    return () => {
      live = false
    }
  }, [country])

  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE))

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
          <span className="field__label">Country</span>
          <select
            className="select"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value)
              setPage(1)
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
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
            {status === 'ready' && <StatusBadge>Open</StatusBadge>}
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
                  <JobCard key={job.id} job={job} country={country} />
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
              <span className="top-companies__title">Top companies</span>
            </div>
            {companies.length === 0 ? (
              <div className="top-companies__row" style={{ gridTemplateColumns: '1fr' }}>
                <span className="top-companies__count">No leaderboard yet.</span>
              </div>
            ) : (
              companies.map((c, i) => (
                <div className="top-companies__row" key={c.name + i}>
                  <span className="top-companies__rank">{i + 1}</span>
                  <span className="top-companies__name">{c.name}</span>
                  <span className="top-companies__count">{c.vacancies} open</span>
                </div>
              ))
            )}
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
