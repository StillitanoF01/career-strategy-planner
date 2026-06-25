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
import { computeGaps, skillsInText } from '../lib/skills'
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [mdHelpOpen, setMdHelpOpen] = useState(false)
  const mdHelpRef = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!mdHelpOpen) return
    function handleClick(e: MouseEvent) {
      if (mdHelpRef.current && !mdHelpRef.current.contains(e.target as Node)) {
        setMdHelpOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mdHelpOpen])

  useEffect(() => {
    let live = true
    const country = loadProfile()?.country ?? 'au'
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
    return () => { live = false }
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
    try { mergeProjects(await pickDirectoryProjects()) } catch { /* cancelled */ }
  }

  async function onPrePopulate() {
    const files = [
      'Garden-Commons-2026.md',
      'Library-2024.md',
      'Pebbles-to-Pathways-2025.md',
      'Points-Lines-Planes-2023.md',
      'The-Driftline-Residence-2024.md',
      'The-Undone-House-2023.md',
      'The-Watershed-2025.md',
    ]
    const fetched = await Promise.all(
      files.map(async (name) => {
        const res = await fetch(`/sample-projects/${name}`)
        const text = await res.text()
        return new File([text], name, { type: 'text/markdown' })
      }),
    )
    mergeProjects(await readFilesToProjects(fetched))
  }

  function removeProject(fileName: string) {
    setProjects((prev) => {
      const next = prev.filter((p) => p.fileName !== fileName)
      saveProjects(next)
      return next
    })
  }

  function toggleCard(fileName: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(fileName)) next.delete(fileName)
      else next.add(fileName)
      return next
    })
  }

  const result = useMemo(() => computeGaps(jobs, projects), [jobs, projects])

  // Set of skills the user has that jobs also demand
  const demandedSkillSet = useMemo(
    () => new Set(result.strengths.map((s) => s.skill)),
    [result.strengths],
  )

  // How many demanded skills each project contains (for card badging)
  const projectDemandCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of projects) {
      const found = skillsInText(`${p.bodyText} ${p.declaredSkills.join(' ')}`)
      let n = 0
      for (const s of found) if (demandedSkillSet.has(s)) n++
      counts.set(p.fileName, n)
    }
    return counts
  }, [projects, demandedSkillSet])

  const skillStrengths  = result.strengths.filter((d) => d.category === 'skill')
  const skillGaps       = result.gaps.filter((d) => d.category === 'skill')
  const typologyStrengths = result.strengths.filter((d) => d.category === 'typology')
  const typologyGaps    = result.gaps.filter((d) => d.category === 'typology')

  const strapline = projects.length > 0 && jobStatus === 'ready'
    ? `${projects.length} project${projects.length !== 1 ? 's' : ''} · measured against ${result.totalJobs} live jobs`
    : 'Upload your finished-project files to see skill gaps and to match competitions and scholarships.'

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); setDragOver(false)
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
    },
  }

  return (
    <div className="skills-wrap">

      {/* ── Photo stage (wide screens) ── */}
      <div className="skills-stage" role="region" aria-label="Skill Gap Checker">

        {/* Left page — header */}
        <div className="skills-stage__layer skills-stage__head">
          <span className="skills-stage__eyebrow">Skill Gap Checker</span>
          <h1 className="skills-stage__title">Tools you have,<br />tools to acquire</h1>
          <p className="skills-stage__lead">
            {projects.length > 0 && jobStatus === 'ready' ? strapline : (
              <>
                Upload your finished-project files to see skill gaps<br />
                and to match competitions and scholarships.
              </>
            )}
          </p>
        </div>

        {/* Left page — gap columns */}
        <div className="skills-stage__layer skills-stage__gaps">
          <div className="skills-stage__gap-grid">
            <GapColumn
              title="Skills you have"
              skills={projects.length > 0 && jobStatus === 'ready' ? skillStrengths : []}
              typologies={projects.length > 0 && jobStatus === 'ready' ? typologyStrengths : []}
              variant="have"
              jobs={jobs}
              expandedSkill={expandedSkill}
              onExpand={(skill) => setExpandedSkill(expandedSkill === skill ? null : skill)}
              onNavigate={(skill) => navigate(`/jobs?what=${encodeURIComponent(`architect ${skill}`)}`)}
            />
            <GapColumn
              title="Skills to acquire"
              skills={projects.length > 0 && jobStatus === 'ready' ? skillGaps : []}
              typologies={projects.length > 0 && jobStatus === 'ready' ? typologyGaps : []}
              variant="acquire"
              jobs={jobs}
              expandedSkill={expandedSkill}
              onExpand={(skill) => setExpandedSkill(expandedSkill === skill ? null : skill)}
              onNavigate={(skill) => navigate(`/jobs?what=${encodeURIComponent(`architect ${skill}`)}`)}
            />
          </div>
        </div>

        {/* Right page — upload + cards */}
        <div className="skills-stage__layer skills-stage__sidebar">

          {/* Upload panel */}
          <div className="skills-stage__upload">
            <div className="skills-stage__panel-head">
              Projects{projects.length > 0 ? ` (${projects.length})` : ''}
              <div className="skills-stage__md-help" ref={mdHelpRef}>
                <button
                  type="button"
                  className={`skills-stage__md-help-btn${mdHelpOpen ? ' is-active' : ''}`}
                  aria-label="What is a project .md file?"
                  onClick={() => setMdHelpOpen((o) => !o)}
                >?</button>
                {mdHelpOpen && (
                  <div className="skills-stage__md-help-popup" role="tooltip">
                    <p className="skills-stage__md-help-title">What is a project .md file?</p>
                    <p>Each file is a Markdown document describing one of your finished projects, its typology, skills used, grade, and a written brief. The Skill Gap Checker reads these files to measure your portfolio against live job listings.</p>
                    <p>Files are generated using a custom Claude skill. This web app is an extension of that skill. Install it in Claude to produce your own .md files, then upload them here.</p>
                    <a className="skills-stage__md-help-link" href="#" onClick={(e) => e.preventDefault()}>
                      Download the Claude skill
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div
              className={`skills-stage__dropzone${dragOver ? ' is-over' : ''}`}
              {...dropHandlers}
            >
              <span className="skills-stage__drop-label">Drop .md files or</span>
              <div className="skills-stage__drop-actions">
                {supportsDirectoryPicker() && (
                  <button
                    type="button"
                    className="skills-stage__drop-btn"
                    onClick={onPickFolder}
                  >
                    Pick folder
                  </button>
                )}
                <button
                  type="button"
                  className="skills-stage__drop-btn"
                  onClick={() => fileInput.current?.click()}
                >
                  Choose files
                </button>
                <button
                  type="button"
                  className="skills-stage__drop-btn skills-stage__drop-btn--prepopulate"
                  onClick={onPrePopulate}
                >
                  Pre-populate
                </button>
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
          </div>

          {/* Project cards */}
          {projects.length > 0 && (
            <>
              <div className="skills-stage__cards">
                <div className="skills-stage__panel-head">
                  {projects.length} project{projects.length !== 1 ? 's' : ''} loaded
                </div>
                <div className="skills-stage__card-list">
                  {[...projects].sort((a, b) => (b.year ?? '').localeCompare(a.year ?? '')).map((p) => (
                    <ProjectCard
                      key={p.fileName}
                      project={p}
                      isExpanded={expanded.has(p.fileName)}
                      demandedSkillCount={projectDemandCount.get(p.fileName) ?? 0}
                      onToggle={() => toggleCard(p.fileName)}
                      onRemove={() => removeProject(p.fileName)}
                    />
                  ))}
                </div>
              </div>
              <p className="skills-stage__badge-hint">
                <span className="skills-stage__card-badge skills-stage__card-badge--centered">Core Project</span>
                <span>
                  A PROJECT EARNS THIS BADGE WHEN IT COVERS 3 OR MORE SKILLS<br />
                  DEMANDED BY LIVE JOB LISTINGS AND HAS A GRADE OF 60 OR ABOVE.
                </span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Fallback (mobile / narrow) ── */}
      <div className="skills-fallback container">
        <PageHead
          eyebrow="Skill Gap Checker"
          title="Tools you have, tools to acquire"
          lead={strapline}
        />

        <Note title="Upload your projects">
          Drop your finished-project .md files below to see your skill gaps — and to unlock matched competitions and scholarships.
        </Note>

        <div className={`dropzone${dragOver ? ' is-over' : ''}`} {...dropHandlers}>
          <div>Drop your finished-project .md files here, or pick the folder.</div>
          <div className="dropzone__actions">
            {supportsDirectoryPicker() && (
              <Button variant="secondary" onClick={onPickFolder}>Pick folder</Button>
            )}
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              Choose files
            </Button>
            <Button variant="primary" onClick={onPrePopulate}>
              Pre-populate
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

        {projects.length === 0 ? null : jobStatus === 'loading' ? (
          <Note title="Reading what the market wants…">Pulling live jobs to measure demand.</Note>
        ) : jobStatus === 'error' ? (
          <Note title="Couldn't load jobs" variant="error">
            {jobError} We can't measure demand without them — check your Adzuna keys and reload.
          </Note>
        ) : (
          <>
            <div className="gap-columns">
              <FallbackGapColumn
                title="Skills you have"
                rows={skillStrengths}
                variant="muted"
                emptyText="None of your skills matched these openings yet."
              />
              <FallbackGapColumn
                title="Skills to acquire"
                rows={skillGaps}
                variant="rust"
                emptyText="Nothing missing for these openings. Widen the search."
              />
            </div>
            <div className="gap-columns" style={{ marginTop: 'var(--space-5)' }}>
              <FallbackGapColumn
                title="Typologies you have"
                rows={typologyStrengths}
                variant="muted"
                emptyText="None of your typologies matched these openings yet."
              />
              <FallbackGapColumn
                title="Typologies to acquire"
                rows={typologyGaps}
                variant="rust"
                emptyText="Nothing missing for these openings."
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Stage sub-components ─────────────────────────────────────────────────────

function SkillRows({
  rows, variant, jobs, expandedSkill, onExpand, onNavigate,
}: {
  rows: SkillDemand[]
  variant: 'have' | 'acquire'
  jobs: Job[]
  expandedSkill: string | null
  onExpand: (skill: string) => void
  onNavigate: (skill: string) => void
}) {
  if (rows.length === 0) return null
  return (
    <>
      {rows.map((row) => {
        const pct = row.total ? Math.round((row.demand / row.total) * 100) : 0
        const isOpen = expandedSkill === row.skill
        const matchingJobs = isOpen
          ? jobs.filter((j) => skillsInText(`${j.title} ${j.description}`).has(row.skill))
          : []
        return (
          <div className={`skills-stage__gap-row${isOpen ? ' is-open' : ''}`} key={row.skill}>
            <div
              className="skills-stage__gap-row-trigger"
              onClick={() => onExpand(row.skill)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onExpand(row.skill)}
            >
              <div className="skills-stage__gap-row-top">
                <span className="skills-stage__gap-name">{row.skill}</span>
                <span className="skills-stage__gap-tally">wanted by {row.demand} of {row.total} jobs</span>
              </div>
              <div className="skills-stage__bar">
                <div
                  className={`skills-stage__bar-fill${variant === 'have' ? ' skills-stage__bar-fill--have' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {isOpen && (
              <div className="skills-stage__job-preview">
                {matchingJobs.length === 0 ? (
                  <p className="skills-stage__job-empty">No matching jobs in current results.</p>
                ) : (
                  <div className="skills-stage__job-list">
                    {matchingJobs.map((job) => (
                      <div key={job.id} className="skills-stage__job-card">
                        <div className="skills-stage__job-title">{job.title}</div>
                        <div className="skills-stage__job-meta">{job.company} · {job.location}</div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className="skills-stage__job-more"
                  onClick={() => onNavigate(row.skill)}
                >
                  View all {row.demand} jobs wanting {row.skill} →
                </button>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function GapColumn({
  title, skills, typologies, variant, jobs, expandedSkill, onExpand, onNavigate,
}: {
  title: string
  skills: SkillDemand[]
  typologies: SkillDemand[]
  variant: 'have' | 'acquire'
  jobs: Job[]
  expandedSkill: string | null
  onExpand: (skill: string) => void
  onNavigate: (skill: string) => void
}) {
  const total = skills.length + typologies.length
  const countLabel = total === 0 ? null : variant === 'have'
    ? `${total} matched`
    : `${total} gaps`

  const sharedProps = { variant, jobs, expandedSkill, onExpand, onNavigate }

  return (
    <div className="skills-stage__gap-panel">
      <div className="skills-stage__panel-head">
        <span>{title}</span>
        {countLabel && <span className="skills-stage__panel-count">{countLabel}</span>}
      </div>
      <div className="skills-stage__gap-rows">
        {skills.length > 0 && (
          <>
            <div className="skills-stage__gap-subhead">Skills</div>
            <SkillRows rows={skills} {...sharedProps} />
          </>
        )}
        {typologies.length > 0 && (
          <>
            <div className={`skills-stage__gap-subhead${skills.length > 0 ? ' skills-stage__gap-subhead--spaced' : ''}`}>Typologies</div>
            <SkillRows rows={typologies} {...sharedProps} />
          </>
        )}
      </div>
    </div>
  )
}

function stripYearSuffix(title: string): string {
  return title
    .replace(/\s*[—–]\s*\d{4}\s*$/, '')
    .replace(/\s*\(\d{4}\)\s*$/, '')
    .trim()
}

function ProjectCard({
  project,
  isExpanded,
  demandedSkillCount,
  onToggle,
  onRemove,
}: {
  project: Project
  isExpanded: boolean
  demandedSkillCount: number
  onToggle: () => void
  onRemove: () => void
}) {
  const displayTitle = stripYearSuffix(project.title)
  const meta = [project.unit, project.typology].filter(Boolean).join(' · ')
  const gradeStr = project.grade ? `Grade ${project.grade}` : ''
  const fullMeta = [project.year, meta, gradeStr].filter(Boolean).join(' · ')
  const grade = project.grade ? parseFloat(String(project.grade)) : null
  const isStrong = demandedSkillCount >= 3 && (grade === null || grade >= 60)

  return (
    <div className={`skills-stage__card${isStrong ? ' is-strong' : ''}`}>
      <div className="skills-stage__card-header">
        <span className="skills-stage__card-title-wrap">
          <span className="skills-stage__card-title">{displayTitle}</span>
          {isStrong && <span className="skills-stage__card-badge">Core Project</span>}
        </span>
        <button
          type="button"
          className="skills-stage__card-remove"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          aria-label={`Remove ${project.title}`}
        >
          <IconX size={10} stroke={2.5} />
        </button>
      </div>
      <div className="skills-stage__card-footer">
        {fullMeta && (
          <div className="skills-stage__card-meta">{fullMeta}</div>
        )}
        <button
          type="button"
          className="skills-stage__card-toggle"
          onClick={onToggle}
        >
          {isExpanded ? 'see less' : 'see more'}
        </button>
      </div>
      {isExpanded && (
        <div className="skills-stage__card-detail">
          {project.semester && (
            <div className="skills-stage__card-field">
              <span className="skills-stage__card-key">Semester</span> {project.semester}
            </div>
          )}
          {project.tutor && (
            <div className="skills-stage__card-field">
              <span className="skills-stage__card-key">Tutor</span> {project.tutor}
            </div>
          )}
          {project.brief && (
            <div className="skills-stage__card-field">
              <span className="skills-stage__card-key">Brief</span> {project.brief}
            </div>
          )}
          {project.topSkills.length > 0 && (
            <div className="skills-stage__card-field">
              <span className="skills-stage__card-key">Top skills</span>{' '}
              {project.topSkills.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Fallback sub-component ───────────────────────────────────────────────────

function FallbackGapColumn({
  title,
  rows,
  variant,
  emptyText,
}: {
  title: string
  rows: SkillDemand[]
  variant: 'muted' | 'rust'
  emptyText: string
}) {
  return (
    <section>
      <div className="gap-col__head">
        <span className="gap-col__title">{title}</span>
        <span className="gap-col__count">{rows.length} matched</span>
      </div>
      {rows.length === 0 ? (
        <p className="skill-row__tally">{emptyText}</p>
      ) : (
        rows.map((row) => {
          const pct = row.total ? Math.round((row.demand / row.total) * 100) : 0
          return (
            <div className="skill-row" key={row.skill}>
              <span className="skill-row__name">{row.skill}</span>
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
