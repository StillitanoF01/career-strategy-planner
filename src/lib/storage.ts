// localStorage persistence — profile, parsed projects, and the pinned "MY BENCH".
import type { Profile, Project } from './types'

const KEYS = {
  projects: 'wb.projects',
  profile: 'wb.profile',
  pins: 'wb.pins',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / private mode — fail silently, app still works in-memory */
  }
}

// ---- Projects ----
export function loadProjects(): Project[] {
  return read<Project[]>(KEYS.projects, [])
}
export function saveProjects(projects: Project[]): void {
  write(KEYS.projects, projects)
}
export function clearProjects(): void {
  try {
    localStorage.removeItem(KEYS.projects)
  } catch {
    /* ignore */
  }
}

// ---- Profile ----
export function loadProfile(): Profile | null {
  return read<Profile | null>(KEYS.profile, null)
}
export function saveProfile(profile: Profile): void {
  write(KEYS.profile, profile)
}

// ---- Pins (MY BENCH) ----
export type PinKind = 'job' | 'talk' | 'competition' | 'scholarship'

export type PinnedItem = {
  id: string
  kind: PinKind
  title: string
  subtitle?: string
  url?: string
  meta?: string
}

export function loadPins(): PinnedItem[] {
  return read<PinnedItem[]>(KEYS.pins, [])
}

function pinKey(kind: PinKind, id: string) {
  return `${kind}:${id}`
}

/** Most items that can live on My Bench at once. */
export const MAX_PINS = 6

export function isPinned(pins: PinnedItem[], kind: PinKind, id: string): boolean {
  return pins.some((p) => pinKey(p.kind, p.id) === pinKey(kind, id))
}

/**
 * Toggle a pin and persist. Returns the new pin list.
 * Adding is capped at MAX_PINS — once full, new pins are ignored (the list is
 * returned unchanged). Unpinning always works.
 */
export function togglePin(item: PinnedItem): PinnedItem[] {
  const pins = loadPins()
  const key = pinKey(item.kind, item.id)
  const exists = pins.some((p) => pinKey(p.kind, p.id) === key)
  if (!exists && pins.length >= MAX_PINS) return pins
  const next = exists
    ? pins.filter((p) => pinKey(p.kind, p.id) !== key)
    : [...pins, item]
  write(KEYS.pins, next)
  return next
}
