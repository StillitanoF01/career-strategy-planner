import { useMemo } from 'react'
import {
  IconBriefcase,
  IconTool,
  IconMapPin,
  IconTrophy,
  IconCertificate,
  IconX,
} from '@tabler/icons-react'
import { EyebrowTag } from '../components/EyebrowTag'
import { LinkButton } from '../components/Button'
import { PegboardStrip, type PegItem } from '../components/PegboardStrip'
import { togglePin, usePins, useProfile } from '../lib/store'
import { loadProjects } from '../lib/storage'
import { userSkillSet } from '../lib/skills'
import type { PinKind } from '../lib/storage'
import './page.css'

export function Bench() {
  const pins = usePins()
  const profile = useProfile()
  const projects = useMemo(() => loadProjects(), [])
  const skillCount = useMemo(() => userSkillSet(projects).size, [projects])

  const countByKind = (kind: PinKind) => pins.filter((p) => p.kind === kind).length

  const modules: PegItem[] = [
    { to: '/jobs', label: 'Jobs — who is hiring now', Icon: IconBriefcase, count: countByKind('job') || undefined },
    { to: '/skill-gap', label: 'Skill Gap — tools to acquire', Icon: IconTool, count: projects.length || undefined },
    { to: '/talks', label: 'Talks — events near you', Icon: IconMapPin, count: countByKind('talk') || undefined },
    { to: '/competitions', label: 'Competitions — matched to your projects', Icon: IconTrophy, count: countByKind('competition') || undefined },
    { to: '/scholarships', label: 'Scholarships — matched to your projects', Icon: IconCertificate, count: countByKind('scholarship') || undefined },
  ]

  // Deterministic one-line "next move" from local data only.
  const nextMove = useMemo(() => {
    const parts: string[] = []
    if (projects.length) parts.push(`${projects.length} project${projects.length === 1 ? '' : 's'}, ${skillCount} skill${skillCount === 1 ? '' : 's'} on the bench`)
    else parts.push('Load your finished projects to personalise the bench')
    if (pins.length) parts.push(`${pins.length} pinned`)
    if (!profile?.city) parts.push('Set your city for the map')
    return parts.join(' · ')
  }, [projects.length, skillCount, pins.length, profile?.city])

  return (
    <div className="container">
      <section className="bench-hero">
        <div className="bench-hero__eyebrow">
          <EyebrowTag>{profile?.name ? `Back at it, ${profile.name}` : 'Career Workbench'}</EyebrowTag>
        </div>
        <h1 className="bench-hero__title">Every tool, hung where you can find it</h1>
        <p className="bench-hero__lead">
          Label what you've built, see what the shop wants, and pick your next move. Live jobs,
          your skill gaps, local talks, competitions and scholarships — all matched against the
          projects you've already finished.
        </p>
        <p className="bench-strapline" style={{ margin: 0 }}>
          {nextMove}
        </p>
        <div className="bench-hero__cta">
          <LinkButton to="/skill-gap" arrow>
            Open the bench
          </LinkButton>
          <LinkButton to="/jobs" variant="secondary" arrow>
            See who's hiring
          </LinkButton>
        </div>
      </section>

      <p className="bench-strapline">The pegboard — five tools, one bench</p>
      <PegboardStrip items={modules} />

      <MyBench />
    </div>
  )
}

function MyBench() {
  const pins = usePins()
  if (pins.length === 0) {
    return (
      <>
        <p className="bench-strapline">My bench</p>
        <p className="skill-row__tally" style={{ color: 'var(--ink-muted)' }}>
          Nothing pinned yet. Pin any job, talk, competition or scholarship to keep it here.
        </p>
      </>
    )
  }
  return (
    <>
      <p className="bench-strapline">My bench — {pins.length} pinned</p>
      <div className="mybench-grid">
        {pins.map((p) => (
          <article className="mybench-card" key={`${p.kind}:${p.id}`}>
            <div className="mybench-card__kind">{p.kind}</div>
            <div className="mybench-card__title">
              {p.url ? (
                <a href={p.url} target="_blank" rel="noreferrer">
                  {p.title}
                </a>
              ) : (
                p.title
              )}
            </div>
            {p.subtitle && <div className="mybench-card__sub">{p.subtitle}</div>}
            <button
              type="button"
              className="mybench-card__remove"
              onClick={() => togglePin(p)}
              aria-label={`Unpin ${p.title}`}
            >
              <IconX size={14} stroke={2} />
            </button>
          </article>
        ))}
      </div>
    </>
  )
}
