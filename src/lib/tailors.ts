import { useSyncExternalStore } from 'react'

export interface Tailor {
  id: string
  name: string
  phone: string
}

const STORAGE_KEY = 'tailor.tailors'

function read(): Tailor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((row): row is Tailor => typeof row?.id === 'string')
      .map((row) => ({ id: row.id, name: row.name ?? '', phone: row.phone ?? '' }))
  } catch {
    /* corrupt entry — start from an empty roster */
    return []
  }
}

let current = read()
const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function commit(next: Tailor[]) {
  current = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((fn) => fn())
}

function newId(): string {
  return crypto.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function addTailor(tailor: Omit<Tailor, 'id'>): Tailor {
  const created = { ...tailor, id: newId() }
  commit([...current, created])
  return created
}

export function saveTailor(tailor: Tailor) {
  commit(current.map((row) => (row.id === tailor.id ? tailor : row)))
}

export function removeTailor(id: string) {
  commit(current.filter((row) => row.id !== id))
}

export function useTailors(): Tailor[] {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  )
}
