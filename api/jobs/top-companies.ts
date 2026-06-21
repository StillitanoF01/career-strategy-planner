import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { TopCompany } from '../../src/lib/types'

// Self-contained (see note in search.ts): no runtime imports from api/_lib or src.

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs'
const COUNTRIES = new Set([
  'gb', 'us', 'au', 'at', 'br', 'ca', 'de', 'es', 'fr', 'in',
  'it', 'mx', 'nl', 'nz', 'pl', 'sg', 'za',
])

function normalizeCountry(input: unknown): string {
  const c = String(input ?? 'au').toLowerCase()
  return COUNTRIES.has(c) ? c : 'au'
}

type RawCompany = {
  canonical_name?: string
  count?: number
  average_salary?: number
}

function normalizeCompany(raw: RawCompany): TopCompany {
  return {
    name: raw.canonical_name?.trim() || 'Unlisted firm',
    vacancies: typeof raw.count === 'number' ? raw.count : 0,
    averageSalary: typeof raw.average_salary === 'number' ? Math.round(raw.average_salary) : undefined,
  }
}

// GET /api/jobs/top-companies?country=
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    return res
      .status(500)
      .json({ error: 'Adzuna keys not set. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your env.' })
  }

  const country = normalizeCountry(req.query.country)
  const what = String(req.query.what ?? 'architecture').trim() || 'architecture'

  const url =
    `${ADZUNA_BASE}/${country}/top_companies` +
    `?app_id=${encodeURIComponent(appId)}` +
    `&app_key=${encodeURIComponent(appKey)}` +
    `&what=${encodeURIComponent(what)}&content-type=application/json`

  try {
    const r = await fetch(url)
    if (!r.ok) {
      return res.status(502).json({ error: "Adzuna didn't answer. Try again shortly." })
    }
    const data = (await r.json()) as { leaderboard?: unknown[] }
    const companies: TopCompany[] = (data.leaderboard ?? []).map((c) => normalizeCompany(c as RawCompany))
    return res.status(200).json({ companies })
  } catch {
    return res.status(502).json({ error: "Adzuna didn't answer. Try again shortly." })
  }
}
