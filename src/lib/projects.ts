// Parse the user's completed-project markdown files. Runs entirely in-browser.
import type { Project } from './types'

const SKILL_LINE = /^\s*[-*]?\s*(?:\*\*|__)?\s*(skills?|tools?|software)\s*(?:\*\*|__)?\s*:\s*(.+)$/i
const H1 = /^\s*#\s+(.+?)\s*#*\s*$/m
const HEADING = /^\s*#{1,6}\s+(.+?)\s*#*\s*$/
const SKILLS_HEADING = /^\s*#{1,6}\s+skills?\b/i

/** Split a "Revit, Rhino; AutoCAD" or bulleted list into trimmed tokens. */
function splitSkillList(raw: string): string[] {
  return raw
    .replace(/[*_`]/g, '')
    .split(/[,;•\n]|\s\/\s/)
    .map((s) => s.replace(/^[-*\s]+/, '').trim())
    .filter(Boolean)
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

  // 2) A "## Skills" section — collect the list, stopping at the next heading
  //    or the blank line that ends the list (don't swallow following prose).
  for (let i = 0; i < lines.length; i++) {
    if (SKILLS_HEADING.test(lines[i])) {
      let started = false
      for (let j = i + 1; j < lines.length; j++) {
        if (HEADING.test(lines[j])) break
        const item = lines[j].trim()
        if (!item) {
          if (started) break // blank line after the list → section done
          continue // skip blank lines before the list starts
        }
        started = true
        splitSkillList(item).forEach((s) => declared.add(s))
      }
    }
  }

  return {
    fileName,
    title,
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
