import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Scholarship } from '../src/lib/types'
import { runAdapters, withCache } from './_lib/scrape'

// ---------------------------------------------------------------------------
// Scholarship source adapters — same pluggable pattern as competitions.
//
// PENDING: add 2–3 real listing pages here (terms/robots.txt checked first).
//
// Template:
//
//   import * as cheerio from 'cheerio'
//   import { deriveTags, parseDeadline } from './_lib/scrape'
//
//   const exampleFund: ScrapeAdapter<Scholarship> = {
//     source: 'example-fund',
//     fetch: async () => {
//       const res = await fetch('https://example.com/scholarships', {
//         headers: { 'User-Agent': 'career-strategy-planner/1.0' },
//       })
//       if (!res.ok) throw new Error(`example-fund ${res.status}`)
//       const $ = cheerio.load(await res.text())
//       return $('.scholarship').toArray().map((el): Scholarship => {
//         const title = $(el).find('.title').text().trim()
//         const url = new URL($(el).find('a').attr('href') ?? '', 'https://example.com').href
//         const summary = $(el).find('.summary').text().trim()
//         return {
//           id: url,
//           title,
//           provider: $(el).find('.provider').text().trim() || undefined,
//           amount: $(el).find('.amount').text().trim() || undefined,
//           deadline: parseDeadline($(el).find('.deadline').text().trim()),
//           eligibility: $(el).find('.eligibility').text().trim() || undefined,
//           tags: deriveTags(`${title} ${summary}`),
//           url,
//           source: 'example-fund',
//         }
//       })
//     },
//   }
// ---------------------------------------------------------------------------

const ADAPTERS: import('./_lib/scrape').ScrapeAdapter<Scholarship>[] = [
  // exampleFund,
]

const TTL = 30 * 60 * 1000 // 30 min

// GET /api/scholarships
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (ADAPTERS.length === 0) {
    return res.status(200).json({ scholarships: [], sources: [], configured: false })
  }
  try {
    const { items, sources } = await withCache('scholarships', TTL, () => runAdapters(ADAPTERS))
    return res.status(200).json({ scholarships: items, sources, configured: true })
  } catch {
    return res
      .status(502)
      .json({ error: "Couldn't reach the scholarship boards. Showing nothing rather than guessing." })
  }
}
