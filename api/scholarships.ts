import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Scholarship } from '../src/lib/types'

// Self-contained (see note in api/jobs/search.ts): no runtime imports from api/_lib.

type ScrapeAdapter<T> = {
  source: string
  fetch: () => Promise<T[]>
}

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
// Scholarship source adapters — same pattern as competitions.
//
// PENDING: add 2–3 real listing pages here (terms/robots.txt checked first).
// Import `cheerio` inside this file and push adapters into ADAPTERS. See
// api/competitions.ts for a worked example.
// ---------------------------------------------------------------------------

const ADAPTERS: ScrapeAdapter<Scholarship>[] = [
  // exampleFund,
]

// GET /api/scholarships
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (ADAPTERS.length === 0) {
    return res.status(200).json({ scholarships: [], sources: [], configured: false })
  }
  try {
    const { items, sources } = await runAdapters(ADAPTERS)
    return res.status(200).json({ scholarships: items, sources, configured: true })
  } catch {
    return res
      .status(502)
      .json({ error: "Couldn't reach the scholarship boards. Showing nothing rather than guessing." })
  }
}
