import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Job } from '../../src/lib/types'
import { ADZUNA_BASE, getCreds, normalizeCountry, normalizeJob } from '../_lib/adzuna'

// GET /api/jobs/search?country=&page=&what=
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const creds = getCreds()
  if (!creds) {
    return res
      .status(500)
      .json({ error: 'Adzuna keys not set. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your env.' })
  }

  const country = normalizeCountry(req.query.country)
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
  const what = String(req.query.what ?? 'architecture').trim() || 'architecture'

  const url =
    `${ADZUNA_BASE}/${country}/search/${page}` +
    `?app_id=${encodeURIComponent(creds.appId)}` +
    `&app_key=${encodeURIComponent(creds.appKey)}` +
    `&what=${encodeURIComponent(what)}` +
    `&results_per_page=20&content-type=application/json`

  try {
    const r = await fetch(url)
    if (!r.ok) {
      return res.status(502).json({ error: "Adzuna didn't answer. Try again shortly." })
    }
    const data = (await r.json()) as { results?: unknown[]; count?: number }
    const jobs: Job[] = (data.results ?? []).map((j) => normalizeJob(j as never))
    return res.status(200).json({ jobs, count: data.count ?? jobs.length, page })
  } catch {
    return res.status(502).json({ error: "Adzuna didn't answer. Try again shortly." })
  }
}
