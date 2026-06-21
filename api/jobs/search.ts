import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Job } from '../../src/lib/types'

// Self-contained: no imports from api/_lib or src at runtime (type-only imports are
// erased at build). Vercel runs each function in isolation, so shared local modules
// must NOT be imported at runtime.

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs'
const COUNTRIES = new Set([
  'gb', 'us', 'au', 'at', 'br', 'ca', 'de', 'es', 'fr', 'in',
  'it', 'mx', 'nl', 'nz', 'pl', 'sg', 'za',
])

function normalizeCountry(input: unknown): string {
  const c = String(input ?? 'au').toLowerCase()
  return COUNTRIES.has(c) ? c : 'au'
}

function stripTags(html: string): string {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type RawJob = {
  id?: string | number
  title?: string
  company?: { display_name?: string }
  location?: { display_name?: string }
  salary_min?: number
  salary_max?: number
  created?: string
  redirect_url?: string
  description?: string
}

function normalizeJob(raw: RawJob): Job {
  return {
    id: String(raw.id ?? raw.redirect_url ?? Math.random().toString(36).slice(2)),
    title: stripTags(raw.title ?? 'Untitled role'),
    company: raw.company?.display_name?.trim() || 'Unlisted firm',
    location: raw.location?.display_name?.trim() || 'Location not given',
    salaryMin: typeof raw.salary_min === 'number' ? Math.round(raw.salary_min) : undefined,
    salaryMax: typeof raw.salary_max === 'number' ? Math.round(raw.salary_max) : undefined,
    created: raw.created ?? '',
    url: raw.redirect_url ?? '',
    description: stripTags(raw.description ?? ''),
  }
}

// GET /api/jobs/search?country=&page=&what=
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    return res
      .status(500)
      .json({ error: 'Adzuna keys not set. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to your env.' })
  }

  const country = normalizeCountry(req.query.country)
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
  const what = String(req.query.what ?? 'architecture').trim() || 'architecture'

  const url =
    `${ADZUNA_BASE}/${country}/search/${page}` +
    `?app_id=${encodeURIComponent(appId)}` +
    `&app_key=${encodeURIComponent(appKey)}` +
    `&what=${encodeURIComponent(what)}` +
    `&results_per_page=20&content-type=application/json`

  try {
    const r = await fetch(url)
    if (!r.ok) {
      return res.status(502).json({ error: "Adzuna didn't answer. Try again shortly." })
    }
    const data = (await r.json()) as { results?: unknown[]; count?: number }
    const jobs: Job[] = (data.results ?? []).map((j) => normalizeJob(j as RawJob))
    return res.status(200).json({ jobs, count: data.count ?? jobs.length, page })
  } catch {
    return res.status(502).json({ error: "Adzuna didn't answer. Try again shortly." })
  }
}
