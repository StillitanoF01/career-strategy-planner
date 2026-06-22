import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  IconBriefcase,
  IconTool,
  IconMapPin,
  IconTrophy,
  IconCertificate,
  IconX,
} from '@tabler/icons-react'
import { togglePin, usePins, useProfile } from '../lib/store'
import { loadProjects } from '../lib/storage'
import { userSkillSet } from '../lib/skills'
import { MAX_PINS } from '../lib/storage'
import type { PinnedItem } from '../lib/storage'
import type { ComponentType } from 'react'
import './page.css'
import './bench.css'

type Tool = {
  to: string
  title: string
  desc: string
  Icon: ComponentType<{ size?: number; stroke?: number; className?: string }>
  /** Render the icon in the rust accent (vs muted ink). */
  accent?: boolean
}

const TOOLS: Tool[] = [
  { to: '/jobs', title: 'Job Searcher', desc: 'Find live jobs that match your projects and skills', Icon: IconBriefcase, accent: true },
  { to: '/skill-gap', title: 'Skill Gap Checker', desc: 'Compare your skills to what live jobs want', Icon: IconTool },
  { to: '/talks', title: 'Local Talks Checker', desc: 'See upcoming talks, events and workshops', Icon: IconMapPin },
  { to: '/competitions', title: 'Competition Checker', desc: 'Browse competitions to challenge your work', Icon: IconTrophy, accent: true },
  { to: '/scholarships', title: 'Scholarship Checker', desc: 'Find scholarships that match your goals', Icon: IconCertificate },
]

/** Break a tool title so its last word ("Searcher"/"Checker") sits on its own line. */
function titleLines(title: string) {
  const i = title.lastIndexOf(' ')
  return i === -1 ? <>{title}</> : (
    <>
      {title.slice(0, i)}
      <br />
      {title.slice(i + 1)}
    </>
  )
}

/** A single pinned item — clickable title + unpin control. */
function PinItem({ p }: { p: PinnedItem }) {
  return (
    <div className="stage__pin">
      <div className="stage__pin-kind">{p.kind}</div>
      <div className="stage__pin-title">
        {p.url ? (
          <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
        ) : (
          p.title
        )}
      </div>
      {p.subtitle && <div className="stage__pin-sub">{p.subtitle}</div>}
      <button
        type="button"
        className="stage__pin-remove"
        onClick={() => togglePin(p)}
        aria-label={`Unpin ${p.title}`}
      >
        <IconX stroke={2} />
      </button>
    </div>
  )
}

export function Bench() {
  const pins = usePins()
  const profile = useProfile()
  const projects = useMemo(() => loadProjects(), [])
  const skillCount = useMemo(() => userSkillSet(projects).size, [projects])

  const stats = [
    `${projects.length} project${projects.length === 1 ? '' : 's'}, ${skillCount} skill${skillCount === 1 ? '' : 's'} on the bench`,
    `${pins.length} pinned`,
  ].join(' · ')

  const plateName = profile?.name ? `${profile.name}'s Workbench` : 'Your Workbench'

  return (
    <div className="stage-wrap">
      {/* ---- Option B: photographic stage (wide screens) ---- */}
      <div className="stage" role="region" aria-label="Workbench">
        <div className="stage__layer stage__plate">{plateName}</div>

        <div className="stage__layer stage__head">
          <h1 className="stage__title">Every tool, hung where you can find it</h1>
          <p className="stage__lead">
            Label what you've built, see what the shop wants, and pick your next move.
          </p>
        </div>

        <div className="stage__layer stage__cards">
          {TOOLS.map(({ to, title, desc, Icon, accent }) => (
            <Link key={to} to={to} className="stage-card">
              <span className="stage-card__hook" aria-hidden="true" />
              <Icon stroke={1.5} className={`stage-card__icon${accent ? ' stage-card__icon--accent' : ''}`} />
              <h3 className="stage-card__title">{titleLines(title)}</h3>
              <p className="stage-card__desc">{desc}</p>
              <span className="stage-card__arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>

        {/* Drawer panel — My Bench: all pins flow left to right. */}
        <div className="stage__tray stage__tray--bench">
          <div className="stage__tray-h">
            My bench — {pins.length} pinned
            {pins.length >= MAX_PINS && (
              <span className="stage__tray-max"> · Max pins reached</span>
            )}
          </div>
          {pins.length === 0 ? (
            <p className="stage__pin-empty">
              Nothing pinned yet. Pin any job, talk, competition or scholarship to keep it here.
            </p>
          ) : (
            <div className="stage__pins">
              {pins.map((p) => <PinItem key={`${p.kind}:${p.id}`} p={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* ---- Stacked fallback (narrow screens) ---- */}
      <div className="stage-fallback bench">
        <div className="container bench__inner">
          <div className="bench__plate">{plateName}</div>

          <h1 className="bench__title">Every tool, hung where you can find it</h1>
          <p className="bench__lead">
            Label what you've built, see what the shop wants, and pick your next move.
          </p>
          <p className="bench__stats">{stats}</p>

          <div className="bench__cards">
            {TOOLS.map(({ to, title, desc, Icon, accent }) => (
              <Link key={to} to={to} className="toolcard">
                <span className="toolcard__hook" aria-hidden="true" />
                <Icon size={44} stroke={1.5} className={`toolcard__icon${accent ? ' toolcard__icon--accent' : ''}`} />
                <h3 className="toolcard__title">{titleLines(title)}</h3>
                <p className="toolcard__desc">{desc}</p>
                <span className="toolcard__arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="container">
          <p className="bench-strapline">
            My bench — {pins.length} pinned
            {pins.length >= MAX_PINS && (
              <span className="stage__tray-max"> · Max pins reached</span>
            )}
          </p>
          {pins.length === 0 ? (
            <p className="skill-row__tally" style={{ color: 'var(--ink-muted)' }}>
              Nothing pinned yet. Pin any job, talk, competition or scholarship to keep it here.
            </p>
          ) : (
            <div className="mybench-grid">
              {pins.map((p) => (
                <article className="mybench-card" key={`${p.kind}:${p.id}`}>
                  <div className="mybench-card__kind">{p.kind}</div>
                  <div className="mybench-card__title">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
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
          )}
        </div>
      </div>
    </div>
  )
}
