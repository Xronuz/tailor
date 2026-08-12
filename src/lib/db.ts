import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { normalizeStatus, type Order } from './types'
import { fetchOrders, pushDelete, pushOrder, reserveId } from './sync'

/**
 * Local store and the shared server, kept in step.
 *
 * Every read answers from IndexedDB so the tablet stays usable with the Wi-Fi
 * down; every write lands locally first and is then pushed. A push that fails
 * is queued and retried on the next sync, and the server keeps whichever copy
 * has the newer `updatedAt`.
 */

interface TailorDB extends DBSchema {
  orders: {
    key: string
    value: Order
    indexes: { createdAt: number; phone: string }
  }
  counters: {
    key: string
    value: number
  }
  /** Ids whose latest local change has not reached the server yet. */
  pending: {
    key: string
    value: { id: string; op: 'put' | 'delete'; at: number }
  }
}

let dbPromise: Promise<IDBPDatabase<TailorDB>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<TailorDB>('tailor', 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const orders = database.createObjectStore('orders', { keyPath: 'id' })
          orders.createIndex('createdAt', 'createdAt')
          orders.createIndex('phone', 'phone')
          database.createObjectStore('counters')
        }
        if (oldVersion < 2) {
          database.createObjectStore('pending', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

function dayKey(d: Date): string {
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

/**
 * Offline fallback id. The server hands out `ORD-260812-03`; with no server we
 * add a short random suffix so a number minted on one tablet can never collide
 * with one minted on another while both are offline.
 */
async function localOrderId(now: Date): Promise<string> {
  const key = dayKey(now)
  const database = await db()
  const tx = database.transaction('counters', 'readwrite')
  const seq = ((await tx.store.get(key)) ?? 0) + 1
  await tx.store.put(seq, key)
  await tx.done
  const tag = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `ORD-${key}-${String(seq).padStart(2, '0')}${tag}`
}

/** Orders saved under an older shape are mapped as they are read. */
function migrate(order: Order): Order {
  const status = normalizeStatus(order.status)
  const materialPhotos = order.materialPhotos ?? []
  const removedFields = order.removedFields ?? []
  if (status === order.status && order.materialPhotos && order.removedFields) return order
  return { ...order, status, materialPhotos, removedFields }
}

async function markPending(id: string, op: 'put' | 'delete') {
  await (await db()).put('pending', { id, op, at: Date.now() })
}

async function clearPending(id: string) {
  await (await db()).delete('pending', id)
}

/* ---------- reads ---------- */

export async function listOrders(): Promise<Order[]> {
  const database = await db()
  const all = await database.getAllFromIndex('orders', 'createdAt')
  return all.reverse().map(migrate)
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const found = await (await db()).get('orders', id)
  return found ? migrate(found) : undefined
}

export async function countOrders(): Promise<number> {
  return (await db()).count('orders')
}

/* ---------- writes ---------- */

export async function createOrder(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Order> {
  const now = Date.now()
  let id: string
  try {
    id = await reserveId()
  } catch {
    id = await localOrderId(new Date(now))
  }

  const order: Order = { ...data, id, createdAt: now, updatedAt: now }
  await (await db()).put('orders', order)
  await send(order)
  return order
}

export async function saveOrder(order: Order): Promise<Order> {
  const updated = { ...order, updatedAt: Date.now() }
  await (await db()).put('orders', updated)
  await send(updated)
  return updated
}

export async function deleteOrder(id: string): Promise<void> {
  await (await db()).delete('orders', id)
  try {
    await pushDelete(id)
    await clearPending(id)
  } catch {
    await markPending(id, 'delete')
  }
}

async function send(order: Order) {
  try {
    await pushOrder(order)
    await clearPending(order.id)
  } catch {
    await markPending(order.id, 'put')
  }
}

/* ---------- sync ---------- */

export interface SyncResult {
  online: boolean
  pulled: number
  pushed: number
  pending: number
}

/**
 * Pushes whatever is queued, then pulls the shared set. Local rows only give
 * way to the server's copy when the server's is newer, so an edit made offline
 * survives until it has been sent.
 */
export async function syncNow(): Promise<SyncResult> {
  const database = await db()
  let pushed = 0

  try {
    const queue = await database.getAll('pending')
    for (const item of queue) {
      if (item.op === 'delete') {
        await pushDelete(item.id)
      } else {
        const local = await database.get('orders', item.id)
        if (local) await pushOrder(local)
      }
      await clearPending(item.id)
      pushed += 1
    }

    const { live, deleted } = await fetchOrders()
    let pulled = 0

    for (const remote of live) {
      const local = await database.get('orders', remote.id)
      if (!local || (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
        await database.put('orders', remote)
        pulled += 1
      }
    }

    for (const id of deleted) {
      const local = await database.get('orders', id)
      if (local) {
        await database.delete('orders', id)
        pulled += 1
      }
    }

    return { online: true, pulled, pushed, pending: 0 }
  } catch {
    return { online: false, pulled: 0, pushed, pending: await database.count('pending') }
  }
}

/* ---------- lookups ---------- */

/** Most recent order for a phone number — used to autofill repeat customers. */
export async function lastOrderByPhone(phone: string): Promise<Order | undefined> {
  const digits = normalizePhone(phone)
  if (digits.length < 5) return undefined
  const all = await listOrders()
  return all.find((o) => normalizePhone(o.phone) === digits)
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
