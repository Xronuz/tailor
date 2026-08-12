import { useSyncExternalStore } from 'react'

/**
 * Garment names the shop added itself ("Palto", "Chopon"). They live beside the
 * built-in types as a catalogue, so a name typed once is offered on every later
 * order. On the order itself a custom garment is stored the way it always was —
 * `garmentType: 'other'` with the name in `garmentOther` — so nothing about the
 * order model or the printed sheet changes.
 */
const STORAGE_KEY = 'tailor.garments'

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((name): name is string => typeof name === 'string' && name.trim() !== '')
  } catch {
    return []
  }
}

let current = read()
const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function commit(next: string[]) {
  current = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((fn) => fn())
}

/** Adds the name unless an equal one (ignoring case) is already listed. */
export function addCustomGarment(name: string): string {
  const clean = name.trim()
  if (!clean) return ''
  const existing = current.find((row) => row.toLowerCase() === clean.toLowerCase())
  if (existing) return existing
  commit([...current, clean])
  return clean
}

export function removeCustomGarment(name: string) {
  commit(current.filter((row) => row !== name))
}

export function useCustomGarments(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  )
}
