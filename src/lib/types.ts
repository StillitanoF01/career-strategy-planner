// Shared client/server data shapes. Server functions import these as type-only
// (erased at build), so there is no runtime coupling between /api and /src.

export type Job = {
  id: string
  title: string
  company: string
  location: string // human-readable, e.g. "Sydney, NSW"
  salaryMin?: number
  salaryMax?: number
  created: string // ISO date
  url: string // apply/details link
  description: string // plain-text snippet
}

export type TopCompany = {
  name: string
  vacancies: number
  averageSalary?: number
}

export type JobsResponse = {
  jobs: Job[]
  count: number
  page: number
}

export type TopCompaniesResponse = {
  companies: TopCompany[]
}

// ---- Projects & skills ----

export type Project = {
  fileName: string
  title: string
  year: string
  semester: string
  unit: string
  tutor: string
  typology: string
  grade: string
  brief: string
  topSkills: string[]
  declaredSkills: string[]
  bodyText: string
}

export type SkillEntry = {
  skill: string
  aliases: string[]
  category: 'skill' | 'typology'
}

/** A skill the jobs demand, with how many of the fetched jobs ask for it. */
export type SkillDemand = {
  skill: string
  demand: number
  total: number
  category: 'skill' | 'typology'
}

export type GapResult = {
  gaps: SkillDemand[]
  strengths: SkillDemand[]
  totalJobs: number
}

// ---- Events / Talks ----

export type EventCategory = 'walk' | 'academic' | 'cpd' | 'tour'

export type EventItem = {
  id: string
  name: string
  start: string // ISO datetime
  venue: string
  lat: number
  lng: number
  url: string
  source: 'ticketmaster' | 'eventbrite'
  // Optional richer fields for the static (curated) events file:
  organizer?: string
  category?: EventCategory
  free?: boolean
  badge?: string // e.g. "Going fast", "Just added"
}

export type EventsResponse = {
  events: EventItem[]
  source: string
}

export type GeoPoint = { lat: number; lng: number; label: string }

// ---- Competitions & Scholarships ----

export type Competition = {
  id: string
  title: string
  organiser?: string
  deadline?: string // ISO if parseable
  location?: string
  tags: string[]
  url: string
  source: string
}

export type Scholarship = {
  id: string
  title: string
  provider?: string
  amount?: string
  deadline?: string
  eligibility?: string
  tags: string[]
  url: string
  source: string
}

export type CompetitionsResponse = {
  competitions: Competition[]
  sources: string[]
  configured: boolean
}

export type ScholarshipsResponse = {
  scholarships: Scholarship[]
  sources: string[]
  configured: boolean
}

/** An item ranked against the user's project profile. */
export type Ranked<T> = {
  item: T
  score: number
  matched: string[] // which profile terms matched
}

// ---- Profile ----

export type Profile = {
  name?: string
  city: string
  country: string // Adzuna code
  studyLevel: string
  interests: string[]
  units: 'metric' | 'imperial'
}
