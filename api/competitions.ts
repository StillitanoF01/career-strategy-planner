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

// --- Adapter 3: Bustler (architecture competitions aggregator) ---
const bustler: ScrapeAdapter<Competition> = {
  source: 'bustler',
  fetch: async () => {
    const res = await fetch('https://bustler.net/competitions', {
      headers: { 'User-Agent': UA },
    })
    if (!res.ok) throw new Error(`bustler ${res.status}`)
    const $ = cheerio.load(await res.text())
    return $('.comp-list-item, .competition-listing__item, article.post')
      .toArray()
      .map((el): Competition | null => {
        const $el = $(el)
        const a = $el.find('a').first()
        const href = a.attr('href') ?? ''
        const title = ($el.find('h2, h3, .title').first().text() || a.text()).trim()
        if (!title || !href) return null
        const url = href.startsWith('http') ? href : new URL(href, 'https://bustler.net').href
        const deadline = $el.find('.deadline, .date, time').first().text().trim() || undefined
        return {
          id: url,
          title,
          deadline: parseDeadline(deadline),
          tags: deriveTags(title),
          url,
          source: 'bustler',
        }
      })
      .filter((x): x is Competition => x !== null)
  },
}

// --- Adapter 4: e-architect competitions ---
const eArchitect: ScrapeAdapter<Competition> = {
  source: 'e-architect',
  fetch: async () => {
    const res = await fetch('https://www.e-architect.com/competitions', {
      headers: { 'User-Agent': UA },
    })
    if (!res.ok) throw new Error(`e-architect ${res.status}`)
    const $ = cheerio.load(await res.text())
    return $('article, .post, .entry')
      .toArray()
      .map((el): Competition | null => {
        const $el = $(el)
        const a = $el.find('h2 a, h3 a, .entry-title a').first()
        const href = a.attr('href') ?? ''
        const title = a.text().trim()
        if (!title || !href) return null
        const url = href.startsWith('http') ? href : new URL(href, 'https://www.e-architect.com').href
        const deadline = $el.find('.deadline, time, .date').first().text().trim() || undefined
        return {
          id: url,
          title,
          deadline: parseDeadline(deadline),
          tags: deriveTags(title),
          url,
          source: 'e-architect',
        }
      })
      .filter((x): x is Competition => x !== null)
  },
}

// --- Adapter 5: Dezeen competitions ---
const dezeen: ScrapeAdapter<Competition> = {
  source: 'dezeen',
  fetch: async () => {
    const res = await fetch('https://www.dezeen.com/tag/competitions/', {
      headers: { 'User-Agent': UA },
    })
    if (!res.ok) throw new Error(`dezeen ${res.status}`)
    const $ = cheerio.load(await res.text())
    return $('article')
      .toArray()
      .slice(0, 20)
      .map((el): Competition | null => {
        const $el = $(el)
        const a = $el.find('h2 a, h3 a, .article-title a').first()
        const href = a.attr('href') ?? ''
        const title = a.text().trim()
        if (!title || !href) return null
        const url = href.startsWith('http') ? href : new URL(href, 'https://www.dezeen.com').href
        return {
          id: url,
          title,
          tags: deriveTags(title),
          url,
          source: 'dezeen',
        }
      })
      .filter((x): x is Competition => x !== null)
  },
}

// --- Adapter 6: Architizer competitions ---
const architizer: ScrapeAdapter<Competition> = {
  source: 'architizer',
  fetch: async () => {
    const res = await fetch('https://architizer.com/competitions/', {
      headers: { 'User-Agent': UA },
    })
    if (!res.ok) throw new Error(`architizer ${res.status}`)
    const $ = cheerio.load(await res.text())
    return $('.competition-card, .award-card, article')
      .toArray()
      .slice(0, 20)
      .map((el): Competition | null => {
        const $el = $(el)
        const a = $el.find('a').first()
        const href = a.attr('href') ?? ''
        const title = ($el.find('h2, h3, .title, .name').first().text() || a.attr('title') || '').trim()
        if (!title || !href) return null
        const url = href.startsWith('http') ? href : new URL(href, 'https://architizer.com').href
        const deadline = $el.find('.deadline, time, .date').first().text().trim() || undefined
        return {
          id: url,
          title,
          deadline: parseDeadline(deadline),
          tags: deriveTags(title),
          url,
          source: 'architizer',
        }
      })
      .filter((x): x is Competition => x !== null)
  },
}

const ADAPTERS: ScrapeAdapter<Competition>[] = [competitionsArchi, archDaily, bustler, eArchitect, dezeen, architizer]

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
