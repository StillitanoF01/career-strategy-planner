// Typed wrappers around the same-origin /api/* functions.
// The browser NEVER calls Adzuna/Ticketmaster/etc. directly — only these endpoints.
import type {
  CompetitionsResponse,
  EventsResponse,
  GeoPoint,
  JobsResponse,
  ScholarshipsResponse,
  TopCompaniesResponse,
} from './types'

export class ApiError extends Error {}

async function getJson<T>(url: string): Promise<T> {
  let r: Response
  try {
    r = await fetch(url)
  } catch {
    throw new ApiError('Network down. Check your connection and try again.')
  }
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) {
    throw new ApiError((data.error as string) || `Request failed (${r.status}).`)
  }
  return data as T
}

export function fetchJobs(params: {
  country?: string
  page?: number
  what?: string
  where?: string
}): Promise<JobsResponse> {
  const q = new URLSearchParams()
  if (params.country) q.set('country', params.country)
  if (params.page) q.set('page', String(params.page))
  if (params.what) q.set('what', params.what)
  if (params.where) q.set('where', params.where)
  return getJson<JobsResponse>(`/api/jobs/search?${q.toString()}`)
}

export function fetchTopCompanies(params: { country?: string }): Promise<TopCompaniesResponse> {
  const q = new URLSearchParams()
  if (params.country) q.set('country', params.country)
  return getJson<TopCompaniesResponse>(`/api/jobs/top-companies?${q.toString()}`)
}

export function fetchEvents(params: {
  lat: number
  lng: number
  radius?: number
  q?: string
}): Promise<EventsResponse> {
  const qs = new URLSearchParams()
  qs.set('lat', String(params.lat))
  qs.set('lng', String(params.lng))
  if (params.radius) qs.set('radius', String(params.radius))
  if (params.q) qs.set('q', params.q)
  return getJson<EventsResponse>(`/api/events?${qs.toString()}`)
}

export function geocode(place: string): Promise<GeoPoint> {
  return getJson<GeoPoint>(`/api/geocode?q=${encodeURIComponent(place)}`)
}

export function fetchCompetitions(): Promise<CompetitionsResponse> {
  return getJson<CompetitionsResponse>('/api/competitions')
}

export function fetchScholarships(): Promise<ScholarshipsResponse> {
  return getJson<ScholarshipsResponse>('/api/scholarships')
}
