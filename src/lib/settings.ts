import { useSyncExternalStore } from 'react'

export interface ShopSettings {
  name: string
  phone: string
}

const STORAGE_KEY = 'tailor.shop'

function read(): ShopSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { name: '', phone: '', ...JSON.parse(raw) }
  } catch {
    /* corrupt entry — fall through to defaults */
  }
  return { name: '', phone: '' }
}

let current = read()
const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function setShop(next: ShopSettings) {
  current = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((fn) => fn())
}

export function useShop(): [ShopSettings, (next: ShopSettings) => void] {
  const shop = useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  )
  return [shop, setShop]
}
