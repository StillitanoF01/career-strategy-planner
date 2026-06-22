// Tiny reactive stores over localStorage, so pins and profile stay in sync across
// the header, Bench and module pages without a global provider.
import { useSyncExternalStore } from 'react'
import type { PinnedItem } from './storage'
import { isPinned, loadPins, loadProfile, saveProfile, togglePin as persistToggle } from './storage'
import type { Profile } from './types'

type Listener = () => void

function createStore<T>(initial: T) {
  let value = initial
  const listeners = new Set<Listener>()
  return {
    get: () => value,
    set: (next: T) => {
      value = next
      listeners.forEach((l) => l())
    },
    subscribe: (l: Listener) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

// ---- Pins ----
const pinsStore = createStore<PinnedItem[]>(loadPins())

export function usePins(): PinnedItem[] {
  return useSyncExternalStore(pinsStore.subscribe, pinsStore.get, () => [])
}

/** Returns true if the pin was added/removed, false if blocked (max reached). */
export function togglePin(item: PinnedItem): boolean {
  const before = pinsStore.get()
  const after = persistToggle(item)
  pinsStore.set(after)
  const wasAdding = !before.some((p) => p.kind === item.kind && p.id === item.id)
  return !(wasAdding && after.length === before.length)
}

export function pinned(item: { kind: PinnedItem['kind']; id: string }): boolean {
  return isPinned(pinsStore.get(), item.kind, item.id)
}

// ---- Profile ----
const profileStore = createStore<Profile | null>(loadProfile())

export function useProfile(): Profile | null {
  return useSyncExternalStore(profileStore.subscribe, profileStore.get, () => null)
}

export function setProfile(profile: Profile): void {
  saveProfile(profile)
  profileStore.set(profile)
}
