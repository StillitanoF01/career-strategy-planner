import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as cheerio from 'cheerio'
import type { Competition } from '../src/lib/types'

// Self-contained (Vercel runs each function in isolation). Scraping happens ONLY
// here, server-side. Sources are isolated: one broken site can't sink the others.

type ScrapeAdapter<T> = { source: string; fetch: () => Promise<T[]> }

const UA = 'Mozilla/5.0 (compatible; career-strategy-planner/1.0; +workbench)'

// Tag derivation from architecture keywords (drives filtering + relevance display).
const TAG_KEYWORDS: [string, string[]][] = [
  ['Sustainability', ['sustainab', 'passive', 'esd', 'carbon', 'climate', 'net zero', 'green']],
  ['Housing', ['housing', 'residential', 'affordable', 'dwelling', 'apartment']],
  ['Urban Design', ['urban', 'public space', 'masterplan', 'placemaking', 'city', 'streetscape']],
  ['Adaptive Reuse', ['adaptive reuse', 'heritage', 'renovation', 'retrofit', 'restoration']],
  ['Timber / Material', ['timber', 'mass timber', 'clt', 'brick', 'concrete', 'material']],
  ['Landscape', ['landscape', 'garden', 'park']],
  ['Interior', ['interior', 'furniture', 'fitout']],
  ['Computational', ['parametric', 'computational', 'fabrication', 'digital', 'algorithm']],
  ['Community / Social', ['community', 'social', 'public', 'civic']],
  ['Pavilion / Installation', ['pavilion', 'installation', 'folly', 'temporary']],
  ['Students', ['student', 'graduate', 'university', 'young']],
  ['Memorial / Cultural', ['memorial', 'museum', 'cultural', 'monument', 'gallery']],
]

function deriveTags(text: string): string[] {
  const t = text.toLowerCase()
  return TAG_KEYWORDS.filter(([, kws]) => kws.some((k) => t.includes(k))).map(([tag]) => tag)
}

function parseDeadline(text?: string): string | undefined {
  if (!text) return undefined
  const cleaned = text.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim()
  const t = Date.parse(cleaned)
  return Number.isNaN(t) ? undefined : new Date(t).toISOString()
}

// --- Adapter 1: competitions.archi (WordPress listing) ---
const competitionsArchi: ScrapeAdapter<Competition> = {
  source: 'competitions.archi',
  fetch: async () => {
    const res = await fetch('https://competitions.archi/cat/all-competitions/', {
      headers: { 'User-Agent': UA },
    })
    if (!res.ok) throw new Error(`competitions.archi ${res.status}`)
    const $ = cheerio.load(await res.text())
    return $('.competition-item')
      .toArray()
      .map((el): Competition | null => {
        const $el = $(el)
        const url = $el.find('a').first().attr('href') ?? ''
        const title = $el.find('h2.title').text().trim()
        if (!title || !url) return null
        const submission = $el.find('.submission').text().replace(/submission:?/i, '').trim()
        return {
          id: url,
          title,
          deadline: parseDeadline(submission),
          tags: deriveTags(title),
          url,
          source: 'competitions.archi',
        }
      })
      .filter((x): x is Competition => x !== null)
  },
}

// --- Adapter 2: ArchDaily competitions search ---
const archDaily: ScrapeAdapter<Competition> = {
  source: 'archdaily',
  fetch: async () => {
    const res = await fetch('https://www.archdaily.com/search/competitions', {
      headers: { 'User-Agent': UA },
    })
    if (!res.ok) throw new Error(`archdaily ${res.status}`)
    const $ = cheerio.load(await res.text())
    return $('.afd-search-list__item')
      .toArray()
      .map((el): Competition | null => {
        const $el = $(el)
        const href = $el.find('a.afd-search-list__link').attr('href') ?? ''
        const title = $el.find('.afd-search-list__title').text().trim()
        if (!title || !href) return null
        const url = new URL(href, 'https://www.archdaily.com').href
        return { id: url, title, tags: deriveTags(title), url, source: 'archdaily' }
      })
      .filter((x): x is Competition => x !== null)
  },
}

const ADAPTERS: ScrapeAdapter<Competition>[] = [competitionsArchi, archDaily]

async function runAdapters<T>(adapters: ScrapeAdapter<T>[]): Promise<{ items: T[]; sources: string[] }> {
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

// Per-cold-start cache so repeated views don't re-hit the sources.
let cache: { at: number; payload: unknown } | null = null
const TTL = 30 * 60 * 1000

// GET /api/competitions
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (cache && Date.now() - cache.at < TTL) {
    return res.status(200).json(cache.payload)
  }
  try {
    const { items, sources } = await runAdapters(ADAPTERS)
    // De-dupe by url, keep deterministic order.
    const seen = new Set<string>()
    const competitions = items.filter((c) => (seen.has(c.url) ? false : seen.add(c.url)))
    const payload = { competitions, sources, configured: true }
    cache = { at: Date.now(), payload }
    return res.status(200).json(payload)
  } catch {
    return res
      .status(502)
      .json({ error: "Couldn't reach the competition boards. Showing nothing rather than guessing." })
  }
}
