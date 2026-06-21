import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as cheerio from 'cheerio'
import type { Scholarship } from '../src/lib/types'

// Self-contained (Vercel runs each function in isolation). Server-side scraping only.

type ScrapeAdapter<T> = { source: string; fetch: () => Promise<T[]> }

const UA = 'Mozilla/5.0 (compatible; career-strategy-planner/1.0; +workbench)'

const TAG_KEYWORDS: [string, string[]][] = [
  ['Indigenous / First Nations', ['indigenous', 'first nations', 'aboriginal', 'torres strait']],
  ['Postgraduate', ['postgraduate', 'master', 'phd', 'research', 'doctoral']],
  ['Undergraduate', ['undergraduate', 'bachelor']],
  ['International', ['international', 'overseas', 'global', 'study abroad']],
  ['Equity / Access', ['equity', 'disadvantage', 'low income', 'access', 'hardship', 'relocation']],
  ['Women', ['women', 'female']],
  ['Design / Architecture', ['architect', 'design', 'built environment', 'construction']],
  ['Health', ['health', 'nursing', 'medicine', 'pathology']],
  ['Leadership', ['leadership', 'leader', 'excellence', 'merit']],
  ['Industry', ['industry', 'internship', 'graduate program', 'cadetship']],
]

function deriveTags(text: string): string[] {
  const t = text.toLowerCase()
  return TAG_KEYWORDS.filter(([, kws]) => kws.some((k) => t.includes(k))).map(([tag]) => tag)
}

function clean(text: string): string {
  return text.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

// --- Adapter: UTS external scholarships (static content page of curated links) ---
const utsExternal: ScrapeAdapter<Scholarship> = {
  source: 'uts',
  fetch: async () => {
    const res = await fetch(
      'https://www.uts.edu.au/for-students/admissions-entry/scholarships/external-scholarships',
      { headers: { 'User-Agent': UA } },
    )
    if (!res.ok) throw new Error(`uts ${res.status}`)
    const $ = cheerio.load(await res.text())
    const seen = new Set<string>()
    const out: Scholarship[] = []
    // Scope to the article body so we skip nav/footer chrome.
    $('article.node--type-article a[href]').each((_, el) => {
      const href = $(el).attr('href') ?? ''
      const title = clean($(el).text())
      if (!/^https?:\/\//.test(href) || href.includes('uts.edu.au')) return
      if (title.length < 6 || title.length > 130) return
      if (!/scholarship|award|grant|bursary|prize|fellowship|program/i.test(`${title} ${href}`)) return
      if (seen.has(href)) return
      seen.add(href)
      let provider = ''
      try {
        provider = new URL(href).hostname.replace(/^www\./, '')
      } catch {
        /* ignore */
      }
      out.push({
        id: href,
        title,
        provider,
        tags: deriveTags(title),
        url: href,
        source: 'uts',
      })
    })
    return out
  },
}

const ADAPTERS: ScrapeAdapter<Scholarship>[] = [utsExternal]

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

let cache: { at: number; payload: unknown } | null = null
const TTL = 30 * 60 * 1000

// GET /api/scholarships
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (cache && Date.now() - cache.at < TTL) {
    return res.status(200).json(cache.payload)
  }
  try {
    const { items, sources } = await runAdapters(ADAPTERS)
    const payload = { scholarships: items, sources, configured: true }
    cache = { at: Date.now(), payload }
    return res.status(200).json(payload)
  } catch {
    return res
      .status(502)
      .json({ error: "Couldn't reach the scholarship boards. Showing nothing rather than guessing." })
  }
}
