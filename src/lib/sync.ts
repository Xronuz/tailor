import type { Order, OrderPhoto } from './types'

/**
 * Talks to the shared order server. Photos are Blobs in the browser and JSON
 * on the wire, so they cross as base64 — the sheets and thumbnails have to keep
 * working on whichever tablet opens the order.
 */

/** Same origin in production; the dev server proxies /api through Vite. */
const BASE = '/api'

export interface WireOrder extends Omit<Order, 'photos' | 'materialPhotos'> {
  photos: WirePhoto[]
  materialPhotos: WirePhoto[]
  deleted?: boolean
}

interface WirePhoto {
  id: string
  type: string
  data: string
}

async function toWirePhoto(photo: OrderPhoto): Promise<WirePhoto> {
  const buffer = await photo.blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return { id: photo.id, type: photo.blob.type || 'image/jpeg', data: btoa(binary) }
}

function fromWirePhoto(photo: WirePhoto): OrderPhoto {
  const binary = atob(photo.data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return { id: photo.id, blob: new Blob([bytes], { type: photo.type }) }
}

export async function encodeOrder(order: Order): Promise<WireOrder> {
  return {
    ...order,
    photos: await Promise.all((order.photos ?? []).map(toWirePhoto)),
    materialPhotos: await Promise.all((order.materialPhotos ?? []).map(toWirePhoto)),
  }
}

export function decodeOrder(wire: WireOrder): Order {
  return {
    ...wire,
    photos: (wire.photos ?? []).map(fromWirePhoto),
    materialPhotos: (wire.materialPhotos ?? []).map(fromWirePhoto),
  } as Order
}

/** Short timeout: a tablet off the shop network must fall back fast, not hang. */
async function request(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    return await fetch(`${BASE}${path}`, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function serverReachable(): Promise<boolean> {
  try {
    const res = await request('/health')
    return res.ok
  } catch {
    return false
  }
}

export async function fetchOrders(): Promise<{ live: Order[]; deleted: string[] }> {
  const res = await request('/orders')
  if (!res.ok) throw new Error(`orders ${res.status}`)
  const data = (await res.json()) as { orders: WireOrder[] }
  const live: Order[] = []
  const deleted: string[] = []
  for (const wire of data.orders) {
    if (wire.deleted) deleted.push(wire.id)
    else live.push(decodeOrder(wire))
  }
  return { live, deleted }
}

export async function pushOrder(order: Order): Promise<void> {
  const res = await request(`/orders/${encodeURIComponent(order.id)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(await encodeOrder(order)),
  })
  if (!res.ok) throw new Error(`push ${res.status}`)
}

export async function pushDelete(id: string): Promise<void> {
  const res = await request(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`delete ${res.status}`)
}

/** Server-minted order number, so two tablets never mint the same one. */
export async function reserveId(): Promise<string> {
  const res = await request('/orders/next-id', { method: 'POST' })
  if (!res.ok) throw new Error(`next-id ${res.status}`)
  const data = (await res.json()) as { id: string }
  return data.id
}
