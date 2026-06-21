import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Competition } from '../src/lib/types'

// Self-contained (see note in api/jobs/search.ts): Vercel runs each function in
// isolation, so shared local modules must NOT be imported at runtime. The small
// scraper framework lives inline here.

/** One source. `fetch` returns its parsed items (or throws — caught per-source). */
type ScrapeAdapter<T> = {
  source: string
  fetch: () => Promise<T[]>
}

/** Run every adapter, isolating failures so one broken source can't sink the rest. */
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

// ---------------------------------------------------------------------------
// Competition source adapters.
//
// PENDING: add 2–3 real listing pages here (terms/robots.txt checked first).
// `cheerio` is installed — import it INSIDE this file and write an adapter:
//
//   import * as cheerio from 'cheerio'
//
//   const exampleBoard: ScrapeAdapter<Competition> = {
//     source: 'example-board',
//     fetch: async () => {
//       const res = await fetch('https://example.com/competitions', {
//         headers: { 'User-Agent': 'career-strategy-planner/1.0' },
//       })
//       if (!res.ok) throw new Error(`example-board ${res.status}`)
//       const $ = cheerio.load(await res.text())
//       return $('.listing-card').toArray().map((el): Competition => {
//         const title = $(el).find('.title').text().trim()
//         const url = new URL($(el).find('a').attr('href') ?? '', 'https://example.com').href
//         return {
//           id: url,
//           title,
//           organiser: $(el).find('.organiser').text().trim() || undefined,
//           deadline: undefined, // parse to ISO if present
//           location: $(el).find('.location').text().trim() || undefined,
//           tags: [], // derive from title/summary keywords
//           url,
//           source: 'example-board',
//         }
//       })
//     },
//   }
// ---------------------------------------------------------------------------

const ADAPTERS: ScrapeAdapter<Competition>[] = [
  // exampleBoard,
]

// GET /api/competitions
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (ADAPTERS.length === 0) {
    return res.status(200).json({ competitions: [], sources: [], configured: false })
  }
  try {
    const { items, sources } = await runAdapters(ADAPTERS)
    return res.status(200).json({ competitions: items, sources, configured: true })
  } catch {
    return res
      .status(502)
      .json({ error: "Couldn't reach the competition boards. Showing nothing rather than guessing." })
  }
}
