// Deterministic skill matching — NO AI. Keyword/alias matching, string
// normalisation and frequency scoring only.
import taxonomyRaw from '../data/skills-taxonomy.json'
import type { GapResult, Job, Project, SkillDemand, SkillEntry } from './types'

export const taxonomy = taxonomyRaw as SkillEntry[]

// Pre-compile one word-boundary regex per alias, once.
type CompiledSkill = { skill: string; matchers: RegExp[] }

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const COMPILED: CompiledSkill[] = taxonomy.map((entry) => ({
  skill: entry.skill,
  matchers: entry.aliases.map((a) => new RegExp(`\\b${escapeRegExp(a)}\\b`, 'i')),
}))

/** Set of taxonomy skills mentioned anywhere in `text`. */
export function skillsInText(text: string): Set<string> {
  const found = new Set<string>()
  if (!text) return found
  for (const { skill, matchers } of COMPILED) {
    if (matchers.some((re) => re.test(text))) found.add(skill)
  }
  return found
}

/** Skills the user demonstrably has: declared + taxonomy hits in body text. */
export function userSkillSet(projects: Project[]): Set<string> {
  const have = new Set<string>()
  for (const p of projects) {
    // Declared skills: match each declared string against the taxonomy.
    for (const declared of p.declaredSkills) {
      for (const s of skillsInText(declared)) have.add(s)
    }
    // Body text as a secondary source.
    for (const s of skillsInText(p.bodyText)) have.add(s)
  }
  return have
}

/** How many of the given jobs mention each taxonomy skill (title + description). */
export function skillDemand(jobs: Job[]): Map<string, number> {
  const demand = new Map<string, number>()
  for (const job of jobs) {
    const text = `${job.title} ${job.description}`
    for (const skill of skillsInText(text)) {
      demand.set(skill, (demand.get(skill) ?? 0) + 1)
    }
  }
  return demand
}

/**
 * Gap = skills demanded by jobs that the user lacks, ranked by demand.
 * Strengths = demanded skills the user already has.
 */
export function computeGaps(jobs: Job[], projects: Project[]): GapResult {
  const demand = skillDemand(jobs)
  const have = userSkillSet(projects)
  const total = jobs.length

  const gaps: SkillDemand[] = []
  const strengths: SkillDemand[] = []

  for (const [skill, count] of demand) {
    const row: SkillDemand = { skill, demand: count, total }
    if (have.has(skill)) strengths.push(row)
    else gaps.push(row)
  }

  const byDemand = (a: SkillDemand, b: SkillDemand) =>
    b.demand - a.demand || a.skill.localeCompare(b.skill)
  gaps.sort(byDemand)
  strengths.sort(byDemand)

  return { gaps, strengths, totalJobs: total }
}

/**
 * Keyword profile for ranking competitions/scholarships (Phase 5):
 * taxonomy skills the user has + notable nouns from project titles.
 */
export function projectKeywordProfile(projects: Project[]): string[] {
  const profile = new Set<string>()
  for (const s of userSkillSet(projects)) profile.add(s.toLowerCase())
  const STOP = new Set([
    'the', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'in', 'on', 'with',
    'project', 'studio', 'design', 'assignment', 'final', 'year',
  ])
  for (const p of projects) {
    for (const word of p.title.toLowerCase().split(/[^a-z0-9]+/)) {
      if (word.length >= 3 && !STOP.has(word)) profile.add(word)
    }
  }
  return [...profile]
}

/**
 * Score free text + tags against a project keyword profile (deterministic).
 * Returns the overlap count and which profile terms matched.
 */
export function relevanceAgainstProfile(
  text: string,
  tags: string[],
  profile: string[],
): { score: number; matched: string[] } {
  const hay = `${text} ${tags.join(' ')}`.toLowerCase()
  const matched = [...new Set(profile.filter((t) => t.length >= 2 && hay.includes(t)))]
  return { score: matched.length, matched }
}
