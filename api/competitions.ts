import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Competition } from '../src/lib/types'
import { runAdapters, withCache } from './_lib/scrape'

// ---------------------------------------------------------------------------
// Competition source adapters.
//
// PENDING: add 2–3 real listing pages here (terms/robots.txt checked first).
// Each adapter fetches one page and uses cheerio to extract entries. A broken
// source is isolated — the others still return.
//
// Template (copy, then fill in the URL + selectors):
//
//   import * as cheerio from 'cheerio'
//   import { deriveTags, parseDeadline } from './_lib/scrape'
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
//         const deadlineText = $(el).find('.deadline').text().trim()
//         const summary = $(el).find('.summary').text().trim()
//         return {
//           id: url,
//           title,
//           organiser: $(el).find('.organiser').text().trim() || undefined,
//           deadline: parseDeadline(deadlineText),
//           location: $(el).find('.location').text().trim() || undefined,
//           tags: deriveTags(`${title} ${summary}`),
//           url,
//           source: 'example-board',
//         }
//       })
//     },
//   }
// ---------------------------------------------------------------------------

const ADAPTERS: import('./_lib/scrape').ScrapeAdapter<Competition>[] = [
  // exampleBoard,
]

const TTL = 30 * 60 * 1000 // 30 min

// GET /api/competitions
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (ADAPTERS.length === 0) {
    return res.status(200).json({ competitions: [], sources: [], configured: false })
  }
  try {
    const { items, sources } = await withCache('competitions', TTL, () => runAdapters(ADAPTERS))
    return res.status(200).json({ competitions: items, sources, configured: true })
  } catch {
    return res
      .status(502)
      .json({ error: "Couldn't reach the competition boards. Showing nothing rather than guessing." })
  }
}
