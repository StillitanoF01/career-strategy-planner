// Shared Adzuna helpers. Underscore-prefixed dir → not treated as a route.
import type { Job, TopCompany } from '../../src/lib/types'

export const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs'

// Adzuna-supported country codes. Anything else falls back to `au`.
const COUNTRIES = new Set([
  'gb', 'us', 'au', 'at', 'br', 'ca', 'de', 'es', 'fr', 'in',
  'it', 'mx', 'nl', 'nz', 'pl', 'sg', 'za',
])

export function normalizeCountry(input: unknown): string {
  const c = String(input ?? 'au').toLowerCase()
  return COUNTRIES.has(c) ? c : 'au'
}

export function getCreds(): { appId: string; appKey: string } | null {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) return null
  return { appId, appKey }
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

export function normalizeJob(raw: RawJob): Job {
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

type RawCompany = {
  canonical_name?: string
  count?: number
  average_salary?: number
}

export function normalizeCompany(raw: RawCompany): TopCompany {
  return {
    name: raw.canonical_name?.trim() || 'Unlisted firm',
    vacancies: typeof raw.count === 'number' ? raw.count : 0,
    averageSalary: typeof raw.average_salary === 'number' ? Math.round(raw.average_salary) : undefined,
  }
}
