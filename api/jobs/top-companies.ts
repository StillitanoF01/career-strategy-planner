import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { TopCompany } from '../../src/lib/types'
import { ADZUNA_BASE, getCreds, normalizeCompany, normalizeCountry } from '../_lib/adzuna'

// GET /api/jobs/top-companies?country=
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const creds = getCreds()
  if (!creds) {
    return res
      .status(500)
      .json({ error: 'Adzuna keys not set. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your env.' })
  }

  const country = normalizeCountry(req.query.country)
  const what = String(req.query.what ?? 'architecture').trim() || 'architecture'

  const url =
    `${ADZUNA_BASE}/${country}/top_companies` +
    `?app_id=${encodeURIComponent(creds.appId)}` +
    `&app_key=${encodeURIComponent(creds.appKey)}` +
    `&what=${encodeURIComponent(what)}&content-type=application/json`

  try {
    const r = await fetch(url)
    if (!r.ok) {
      return res.status(502).json({ error: "Adzuna didn't answer. Try again shortly." })
    }
    const data = (await r.json()) as { leaderboard?: unknown[] }
    const companies: TopCompany[] = (data.leaderboard ?? []).map((c) => normalizeCompany(c as never))
    return res.status(200).json({ companies })
  } catch {
    return res.status(502).json({ error: "Adzuna didn't answer. Try again shortly." })
  }
}
