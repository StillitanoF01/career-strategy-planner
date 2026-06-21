import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconX } from '@tabler/icons-react'
import { PageHead } from '../components/PageHead'
import { Note } from '../components/Note'
import { Button } from '../components/Button'
import { ApiError, fetchJobs } from '../lib/api'
import {
  pickDirectoryProjects,
  readFilesToProjects,
  supportsDirectoryPicker,
} from '../lib/projects'
import { computeGaps } from '../lib/skills'
import { loadProfile, loadProjects, saveProjects } from '../lib/storage'
import type { Job, Project, SkillDemand } from '../lib/types'
import './skillgap.css'

export function SkillGap() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>(() => loadProjects())
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobStatus, setJobStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [jobError, setJobError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // Fetch a page of live jobs to learn what the shop wants.
  useEffect(() => {
    let live = true
    const country = loadProfile()?.country ?? 'au'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJobStatus('loading')
    fetchJobs({ country, what: 'architecture' })
      .then((res) => {
        if (!live) return
        setJobs(res.jobs)
        setJobStatus('ready')
      })
      .catch((err: unknown) => {
        if (!live) return
        setJobError(err instanceof ApiError ? err.message : 'Could not load jobs.')
        setJobStatus('error')
      })
    return () => {
      live = false
    }
  }, [])

  function mergeProjects(incoming: Project[]) {
    if (!incoming.length) return
    setProjects((prev) => {
      const byName = new Map(prev.map((p) => [p.fileName, p]))
      for (const p of incoming) byName.set(p.fileName, p)
      const next = [...byName.values()]
      saveProjects(next)
      return next
    })
  }

  async function onFiles(files: FileList | File[]) {
    mergeProjects(await readFilesToProjects(files))
  }

  async function onPickFolder() {
    try {
      mergeProjects(await pickDirectoryProjects())
    } catch {
      /* user cancelled */
    }
  }

  function removeProject(fileName: string) {
    setProjects((prev) => {
      const next = prev.filter((p) => p.fileName !== fileName)
      saveProjects(next)
      return next
    })
  }

  const result = useMemo(() => computeGaps(jobs, projects), [jobs, projects])
  const skillCount = useMemo(() => {
    const s = new Set<string>()
    result.strengths.forEach((r) => s.add(r.skill))
    return s.size
  }, [result])

  return (
    <div className="container">
      <PageHead
        eyebrow="Skill Gap Checker"
        title="Tools you have, tools to acquire"
        lead="Load your finished-project files. We compare them against what the live jobs want — no AI, all local."
      />

      <div className="import-panel">
        <div
          className={`dropzone${dragOver ? ' is-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
          }}
        >
          <div>Drop your finished-project .md files here, or pick the folder.</div>
          <div className="dropzone__actions">
            {supportsDirectoryPicker() && (
              <Button variant="secondary" onClick={onPickFolder}>
                Pick folder
              </Button>
            )}
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              Choose files
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".md,text/markdown"
            multiple
            hidden
            onChange={(e) => e.target.files && onFiles(e.target.files)}
          />
        </div>

        {projects.length > 0 && (
          <div className="drawer-labels">
            {projects.map((p) => (
              <span className="drawer-chip" key={p.fileName} title={p.title}>
                {p.title}
                <IconX
                  size={13}
                  stroke={2}
                  style={{ cursor: 'pointer' }}
                  onClick={() => removeProject(p.fileName)}
                  aria-label={`Remove ${p.title}`}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <Note title="No drawers loaded">
          Drop your finished-project files above, or pick the folder. We read the title, any
          Skills/Tools lines, and the body text — nothing leaves your machine.
        </Note>
      ) : jobStatus === 'loading' ? (
        <Note title="Reading what the shop wants…">Pulling live jobs to measure demand.</Note>
      ) : jobStatus === 'error' ? (
        <Note title="Couldn't load jobs" variant="error">
          {jobError} We can't measure demand without them — check your Adzuna keys and reload.
        </Note>
      ) : (
        <>
          <p className="bench-strapline">
            Your drawers: {projects.length} project{projects.length === 1 ? '' : 's'}, {skillCount}{' '}
            skill{skillCount === 1 ? '' : 's'} · measured against {result.totalJobs} live jobs
          </p>
          <div className="gap-columns">
            <GapColumn
              title="Tools you have"
              countLabel={`${result.strengths.length} matched`}
              rows={result.strengths}
              variant="muted"
              emptyText="None of your tools showed up in these openings yet."
            />
            <GapColumn
              title="Tools to acquire"
              countLabel={`${result.gaps.length} gaps`}
              rows={result.gaps}
              variant="rust"
              emptyText="Nothing missing for these openings. Widen the search."
              onPick={(skill) => navigate(`/jobs?what=${encodeURIComponent(skill)}`)}
            />
          </div>
        </>
      )}
    </div>
  )
}

function GapColumn({
  title,
  countLabel,
  rows,
  variant,
  emptyText,
  onPick,
}: {
  title: string
  countLabel: string
  rows: SkillDemand[]
  variant: 'muted' | 'rust'
  emptyText: string
  onPick?: (skill: string) => void
}) {
  return (
    <section>
      <div className="gap-col__head">
        <span className="gap-col__title">{title}</span>
        <span className="gap-col__count">{countLabel}</span>
      </div>
      {rows.length === 0 ? (
        <p className="skill-row__tally">{emptyText}</p>
      ) : (
        rows.map((row) => {
          const pct = row.total ? Math.round((row.demand / row.total) * 100) : 0
          return (
            <div
              className="skill-row"
              key={row.skill}
              onClick={onPick ? () => onPick(row.skill) : undefined}
              title={onPick ? `Show jobs wanting ${row.skill}` : undefined}
            >
              <div className="skill-row__top">
                <span className="skill-row__name">{row.skill}</span>
                <span className="skill-row__tally">
                  Wanted by {row.demand} of {row.total} jobs
                </span>
              </div>
              <div className="skill-bar">
                <div
                  className={`skill-bar__fill${variant === 'muted' ? ' skill-bar__fill--muted' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })
      )}
    </section>
  )
}
