// Shared scraping framework for the Competition & Scholarship checkers.
// Scraping happens ONLY here (server-side): CORS-safe, key-safe, and isolated so a
// single broken source can't take down the others. Respect each site's robots.txt
// and rate limits when you add adapters.
import taxonomyRaw from '../../src/data/skills-taxonomy.json'

type SkillEntry = { skill: string; aliases: string[] }
const TAXONOMY = taxonomyRaw as SkillEntry[]

/** One source. `fetch` returns its parsed items (or throws — caught per-source). */
export type ScrapeAdapter<T> = {
  source: string
  fetch: () => Promise<T[]>
}

/** Run every adapter, isolating failures. */
export async function runAdapters<T>(
  adapters: ScrapeAdapter<T>[],
): Promise<{ items: T[]; sources: string[] }> {
  const settled = await Promise.allSettled(adapters.map((a) => a.fetch()))
  const items: T[] = []
  const sources: string[] = []
  settled.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      items.push(...res.value)
      sources.push(adapters[i].source)
    }
  })
  return { items, sources }
}

// ---- Tiny in-memory cache (per serverless cold start) ----
type CacheEntry<T> = { at: number; value: T }
const cache = new Map<string, CacheEntry<unknown>>()

export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined
  if (hit && Date.now() - hit.at < ttlMs) return hit.value
  const value = await fn()
  cache.set(key, { at: Date.now(), value })
  return value
}

/** Derive tags from free text using the architecture skill taxonomy. */
export function deriveTags(text: string): string[] {
  const hay = (text ?? '').toLowerCase()
  const tags = new Set<string>()
  for (const { skill, aliases } of TAXONOMY) {
    if (aliases.some((a) => hay.includes(a.toLowerCase()))) tags.add(skill)
  }
  return [...tags]
}

/** Best-effort ISO date from a free-text deadline. Returns undefined if unparseable. */
export function parseDeadline(text?: string): string | undefined {
  if (!text) return undefined
  const t = Date.parse(text)
  return Number.isNaN(t) ? undefined : new Date(t).toISOString()
}
