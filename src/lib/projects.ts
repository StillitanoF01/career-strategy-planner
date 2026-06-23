// Parse the user's completed-project markdown files. Runs entirely in-browser.
import type { Project } from './types'

const H1 = /^\s*#\s+(.+?)\s*#*\s*$/m
const HEADING = /^\s*#{1,6}\s+(.+?)\s*#*\s*$/
const SKILLS_HEADING = /^\s*#{1,6}\s+skills?\b/i
const SKILL_LINE = /^\s*[-*]?\s*(?:\*\*|__)?\s*(skills?|tools?|software)\s*(?:\*\*|__)?\s*:\s*(.+)$/i

/** Split a "Revit, Rhino; AutoCAD" or bulleted list into trimmed tokens. */
function splitSkillList(raw: string): string[] {
  return raw
    .replace(/[*_`]/g, '')
    .split(/[,;•\n]|\s\/\s/)
    .map((s) => s.replace(/^[-*\s]+/, '').trim())
    .filter(Boolean)
}

/**
 * Extract the value after a colon from any line matching one of the given key
 * patterns. Handles both Format A (ALL-CAPS KEY: value) and Format B
 * (- lowercase key: value) and inline bold (**Key:** value).
 */
function extractField(lines: string[], ...keys: string[]): string {
  for (const line of lines) {
    const clean = line.replace(/\*\*/g, '').replace(/^\s*[-*]\s*/, '').trim()
    for (const key of keys) {
      const re = new RegExp(`^${key}\\s*:\\s*(.+)$`, 'i')
      const m = clean.match(re)
      if (m) return m[1].trim()
    }
  }
  return ''
}

/**
 * Find the first "## Skills" or "## Skills used" section, parse numeric
 * ratings (- Skill: N), and return the top-3 skill names by rating.
 */
function parseTopSkills(lines: string[]): string[] {
  const SKILLS_H = /^\s*#{1,6}\s+skills?\s*(used|rated|\(|$)/i
  const RATING = /^\s*[-*]?\s*(.+?)\s*:\s*(\d+)\s*$/
  const HEADING_RE = /^\s*#{1,6}\s+/

  for (let i = 0; i < lines.length; i++) {
    if (!SKILLS_H.test(lines[i])) continue
    const ratings: Array<{ name: string; rating: number }> = []
    for (let j = i + 1; j < lines.length; j++) {
      if (HEADING_RE.test(lines[j])) break
      const m = lines[j].match(RATING)
      if (m) {
        const r = parseInt(m[2], 10)
        if (r >= 1 && r <= 10) ratings.push({ name: m[1].trim(), rating: r })
      }
    }
    return ratings
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
      .slice(0, 3)
      .map((r) => r.name)
  }
  return []
}

export function parseProject(fileName: string, content: string): Project {
  const lines = content.split(/\r?\n/)

  // Title = first H1, else the filename without extension.
  const h1 = content.match(H1)
  const title = h1?.[1]?.trim() || fileName.replace(/\.md$/i, '')

  const declared = new Set<string>()

  // 1) Inline "Skills:/Tools:/Software:" lines.
  for (const line of lines) {
    const m = line.match(SKILL_LINE)
    if (m) splitSkillList(m[2]).forEach((s) => declared.add(s))
  }

  // 2) A "## Skills" section — collect the list, stopping at the next heading.
  for (let i = 0; i < lines.length; i++) {
    if (SKILLS_HEADING.test(lines[i])) {
      let started = false
      for (let j = i + 1; j < lines.length; j++) {
        if (HEADING.test(lines[j])) break
        const item = lines[j].trim()
        if (!item) {
          if (started) break
          continue
        }
        started = true
        splitSkillList(item).forEach((s) => declared.add(s))
      }
    }
  }

  return {
    fileName,
    title,
    year: extractField(lines, 'YEAR', 'Year'),
    semester: extractField(lines, 'SEMESTER', 'Semester'),
    unit: extractField(lines,
      'STUDIO / UNIT', 'Studio / unit name', 'Studio / unit',
      'Subject / unit', 'STUDIO/UNIT'),
    tutor: extractField(lines,
      'STUDIO LEADER', 'Studio leader / tutor', 'Studio leader',
      'Tutor'),
    typology: extractField(lines, 'TYPOLOGY', 'Typology'),
    grade: extractField(lines, 'Grade / mark', 'Grade'),
    brief: extractField(lines, 'Brief summary', 'Brief'),
    topSkills: parseTopSkills(lines),
    declaredSkills: [...declared],
    bodyText: content.toLowerCase(),
  }
}

/** Read a list of File objects, parsing only `.md` files. */
export async function readFilesToProjects(files: File[] | FileList): Promise<Project[]> {
  const list = Array.from(files).filter((f) => /\.md$/i.test(f.name))
  const projects = await Promise.all(
    list.map(async (f) => parseProject(f.name, await f.text())),
  )
  return projects
}

/** True if the browser supports the File System Access folder picker. */
export function supportsDirectoryPicker(): boolean {
  return typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
}

type DirHandle = {
  values: () => AsyncIterable<{ kind: string; name: string; getFile: () => Promise<File> }>
}

/** Pick a folder and read all `.md` files inside (one level). */
export async function pickDirectoryProjects(): Promise<Project[]> {
  const picker = (window as unknown as { showDirectoryPicker: () => Promise<DirHandle> }).showDirectoryPicker
  const dir = await picker()
  const files: File[] = []
  for await (const entry of dir.values()) {
    if (entry.kind === 'file' && /\.md$/i.test(entry.name)) {
      files.push(await entry.getFile())
    }
  }
  return readFilesToProjects(files)
}
