import type { GarmentType, Order, OrderStatus } from './types'
import { GARMENT_TYPES } from './garments'
import { ORDER_STATUSES } from './types'

export function amount(value: string): number {
  const n = Number(value.replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export interface Totals {
  orders: number
  revenue: number
  prepaid: number
  balance: number
  average: number
}

export function totals(orders: Order[]): Totals {
  const revenue = orders.reduce((sum, o) => sum + amount(o.price), 0)
  const prepaid = orders.reduce((sum, o) => sum + amount(o.prepaid), 0)
  return {
    orders: orders.length,
    revenue,
    prepaid,
    balance: revenue - prepaid,
    average: orders.length ? revenue / orders.length : 0,
  }
}

export interface SeriesPoint {
  start: Date
  count: number
}

export type RangeMode = 'week' | 'month' | 'year'

export interface RangeSeries {
  points: SeriesPoint[]
  /** Day buckets label the x axis with day numbers; month buckets with names. */
  grain: 'day' | 'month'
}

/** First day of the calendar period `anchor` falls in. */
export function periodStart(mode: RangeMode, anchor: Date): Date {
  if (mode === 'week') return startOfWeek(anchor)
  if (mode === 'month') return new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  return new Date(anchor.getFullYear(), 0, 1)
}

/** Steps a whole period back (-1) or forward (+1). */
export function shiftPeriod(mode: RangeMode, anchor: Date, delta: number): Date {
  const d = new Date(anchor)
  if (mode === 'week') d.setDate(d.getDate() + delta * 7)
  else if (mode === 'month') d.setMonth(d.getMonth() + delta)
  else d.setFullYear(d.getFullYear() + delta)
  return d
}

/** True when the anchor sits in the period we are living through. */
export function isCurrentPeriod(mode: RangeMode, anchor: Date): boolean {
  return periodStart(mode, anchor).getTime() === periodStart(mode, new Date()).getTime()
}

/**
 * Orders bucketed across one whole calendar period: every day of that week or
 * month (1…31, zero-filled), or every month of that year. Whole periods rather
 * than a rolling window, so the axis reads as a calendar the tailor recognises.
 */
export function ordersInPeriod(orders: Order[], mode: RangeMode, anchor: Date): RangeSeries {
  const from = periodStart(mode, anchor)

  if (mode === 'year') {
    const year = from.getFullYear()
    const points: SeriesPoint[] = Array.from({ length: 12 }, (_, month) => ({
      start: new Date(year, month, 1),
      count: 0,
    }))
    for (const order of orders) {
      const d = new Date(order.createdAt)
      if (d.getFullYear() === year) points[d.getMonth()].count += 1
    }
    return { points, grain: 'month' }
  }

  const days =
    mode === 'week' ? 7 : new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate()

  const index = new Map<string, SeriesPoint>()
  const points: SeriesPoint[] = []
  for (let i = 0; i < days; i++) {
    const date = new Date(from)
    date.setDate(from.getDate() + i)
    const point = { start: date, count: 0 }
    points.push(point)
    index.set(dayKey(date), point)
  }
  for (const order of orders) {
    const bucket = index.get(dayKey(new Date(order.createdAt)))
    if (bucket) bucket.count += 1
  }
  return { points, grain: 'day' }
}

/** One series of counts per garment type, aligned to the period's buckets. */
export interface GarmentSeries {
  key: GarmentType
  values: number[]
}

/**
 * The same buckets as `ordersInPeriod`, split by what was ordered — one line
 * per garment type. Types with no orders in the window are dropped, so the
 * chart never carries an empty series.
 */
export function ordersByGarment(
  orders: Order[],
  mode: RangeMode,
  anchor: Date,
): { starts: Date[]; grain: 'day' | 'month'; series: GarmentSeries[] } {
  const { points, grain } = ordersInPeriod(orders, mode, anchor)
  const starts = points.map((p) => p.start)

  const slot = new Map<string, number>()
  starts.forEach((date, i) => {
    slot.set(grain === 'month' ? `${date.getFullYear()}-${date.getMonth()}` : dayKey(date), i)
  })

  const byType = new Map<GarmentType, number[]>()
  for (const order of orders) {
    const d = new Date(order.createdAt)
    const key = grain === 'month' ? `${d.getFullYear()}-${d.getMonth()}` : dayKey(d)
    const i = slot.get(key)
    if (i === undefined) continue
    const values = byType.get(order.garmentType) ?? new Array(starts.length).fill(0)
    values[i] += 1
    byType.set(order.garmentType, values)
  }

  const series = GARMENT_TYPES.filter((key) => byType.has(key)).map((key) => ({
    key,
    values: byType.get(key) as number[],
  }))

  return { starts, grain, series }
}

/** Monday-based week start. */
function startOfWeek(d: Date): Date {
  const out = startOfDay(d)
  const shift = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - shift)
  return out
}

export interface MonthPoint {
  month: number
  count: number
  revenue: number
}

/** Orders and revenue per month of the year, summed across all years — the
 *  seasonality view: which months the shop actually sells in. */
export function seasonality(orders: Order[]): MonthPoint[] {
  const points: MonthPoint[] = Array.from({ length: 12 }, (_, month) => ({
    month,
    count: 0,
    revenue: 0,
  }))
  for (const order of orders) {
    const month = new Date(order.createdAt).getMonth()
    points[month].count += 1
    points[month].revenue += amount(order.price)
  }
  return points
}

export interface RevenuePoint {
  key: string
  year: number
  month: number
  revenue: number
  orders: number
}

/** Rolling window of the last `months` calendar months, oldest first. */
export function revenueByMonth(orders: Order[], months: number): RevenuePoint[] {
  const now = new Date()
  const points: RevenuePoint[] = []
  const index = new Map<string, RevenuePoint>()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const point: RevenuePoint = {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      year: d.getFullYear(),
      month: d.getMonth(),
      revenue: 0,
      orders: 0,
    }
    points.push(point)
    index.set(point.key, point)
  }

  for (const order of orders) {
    const d = new Date(order.createdAt)
    const point = index.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (!point) continue
    point.revenue += amount(order.price)
    point.orders += 1
  }

  return points
}

export interface Slice {
  key: GarmentType
  count: number
  share: number
}

export function garmentMix(orders: Order[]): Slice[] {
  const counts = new Map<GarmentType, number>()
  for (const order of orders) {
    counts.set(order.garmentType, (counts.get(order.garmentType) ?? 0) + 1)
  }
  return GARMENT_TYPES.map((key) => ({
    key,
    count: counts.get(key) ?? 0,
    share: orders.length ? (counts.get(key) ?? 0) / orders.length : 0,
  })).filter((slice) => slice.count > 0)
}

export interface ReferralSlice {
  key: string
  count: number
  share: number
}

/** How customers say they found the shop; unanswered orders group together. */
export function referralMix(orders: Order[]): ReferralSlice[] {
  const counts = new Map<string, number>()
  for (const order of orders) {
    const key = order.referral || 'unknown'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count, share: orders.length ? count / orders.length : 0 }))
    .sort((a, b) => b.count - a.count)
}

export function statusMix(orders: Order[]): { key: OrderStatus; count: number }[] {
  return ORDER_STATUSES.map((key) => ({
    key,
    count: orders.filter((o) => o.status === key).length,
  }))
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** Compact money for axes and tiles: 1 200 000 -> 1.2M */
export function shortMoney(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`
  if (abs >= 1_000) return `${trim(n / 1_000)}K`
  return trim(n)
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function fullMoney(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
