import { amount } from './analytics'
import { garmentName } from './garments'
import { normalizeStatus } from './types'
import type { Order } from './types'
import type { Cell, Sheet } from './xlsx'

/**
 * The analytics screen answers questions at a glance; the accountant wants the
 * same period as a file. Two sheets go out: the figures on the screen, then
 * every order behind them, one per row, so the totals can be checked by hand.
 */

export interface Period {
  from: Date
  /** Exclusive: the first moment after the period. */
  to: Date
  label: string
  /** Goes into the file name, e.g. 2026 or 2026-08. */
  slug: string
  /** A year is long enough to be worth breaking down by month. */
  byMonth: boolean
}

export interface ReportText {
  t: (key: string) => string
  monthName: (month: number) => string
  formatDate: (ts: number | string) => string
}

export function yearPeriod(anchor: Date): Period {
  const year = anchor.getFullYear()
  return {
    from: new Date(year, 0, 1),
    to: new Date(year + 1, 0, 1),
    label: String(year),
    slug: String(year),
    byMonth: true,
  }
}

export function monthPeriod(anchor: Date, monthName: (month: number) => string): Period {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  return {
    from: new Date(year, month, 1),
    to: new Date(year, month + 1, 1),
    label: `${monthName(month)} ${year}`,
    slug: `${year}-${String(month + 1).padStart(2, '0')}`,
    byMonth: false,
  }
}

export function ordersIn(orders: Order[], period: Period): Order[] {
  const from = period.from.getTime()
  const to = period.to.getTime()
  return orders
    .filter((order) => order.createdAt >= from && order.createdAt < to)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function reportFilename(period: Period): string {
  return `hisobot-${period.slug}.xlsx`
}

export function buildReport(orders: Order[], period: Period, text: ReportText): Sheet[] {
  const rows = ordersIn(orders, period)
  return [summarySheet(rows, period, text), ordersSheet(rows, text)]
}

/* ---------- the figures ---------- */

function summarySheet(orders: Order[], period: Period, { t, monthName }: ReportText): Sheet {
  const revenue = orders.reduce((sum, order) => sum + amount(order.price), 0)
  const paid = orders.reduce((sum, order) => sum + amount(order.prepaid), 0)
  const rows: (Cell | string | number)[][] = [
    [{ value: t('nav.analytics'), style: 'title' }, '', { value: period.label, style: 'title' }],
    [],
    [t('analytics.orders'), '', { value: orders.length, style: 'count' }],
    [t('analytics.revenue'), '', { value: revenue, style: 'money' }],
    [t('analytics.unpaid'), '', { value: revenue - paid, style: 'money' }],
    [
      t('analytics.average'),
      '',
      { value: orders.length ? Math.round(revenue / orders.length) : 0, style: 'money' },
    ],
  ]

  section(rows, t('analytics.mix'), t, [
    ...tally(orders, (order) => garmentName(order, t)),
  ])

  section(rows, t('analytics.workload'), t, [
    ...tally(orders, (order) => t(`status.${normalizeStatus(order.status)}`)),
  ])

  section(rows, t('analytics.referral'), t, [
    ...tally(orders, (order) => (order.referral ? t(`ref.${order.referral}`) : t('common.none'))),
  ])

  if (period.byMonth) {
    rows.push([])
    rows.push([
      { value: t('analytics.revenueMonth'), style: 'bold' },
      { value: t('analytics.orders'), style: 'bold' },
      { value: t('analytics.revenue'), style: 'bold' },
    ])
    for (let month = 0; month < 12; month++) {
      const inMonth = orders.filter((order) => new Date(order.createdAt).getMonth() === month)
      rows.push([
        monthName(month),
        { value: inMonth.length, style: 'count' },
        {
          value: inMonth.reduce((sum, order) => sum + amount(order.price), 0),
          style: 'money',
        },
      ])
    }
  }

  return { name: t('export.summary'), widths: [30, 14, 16], rows }
}

/** A heading, then one row per distinct value with its count and its share. */
function section(
  rows: (Cell | string | number)[][],
  title: string,
  t: (key: string) => string,
  counted: { label: string; count: number; share: number }[],
) {
  rows.push([])
  rows.push([
    { value: title, style: 'bold' },
    { value: t('export.count'), style: 'bold' },
    { value: t('export.share'), style: 'bold' },
  ])
  if (counted.length === 0) {
    rows.push([t('history.empty')])
    return
  }
  for (const row of counted) {
    rows.push([
      row.label,
      { value: row.count, style: 'count' },
      { value: `${Math.round(row.share * 100)}%`, style: 'count' },
    ])
  }
}

function tally(orders: Order[], key: (order: Order) => string) {
  const counts = new Map<string, number>()
  for (const order of orders) counts.set(key(order), (counts.get(key(order)) ?? 0) + 1)
  const total = orders.length || 1
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count, share: count / total }))
}

/* ---------- the orders behind them ---------- */

function ordersSheet(orders: Order[], { t, formatDate }: ReportText): Sheet {
  const rows: (Cell | string | number)[][] = orders.map((order) => {
    const price = amount(order.price)
    const prepaid = amount(order.prepaid)
    return [
      order.id,
      formatDate(order.createdAt),
      order.customerName,
      order.phone,
      garmentName(order, t),
      t(`status.${normalizeStatus(order.status)}`),
      { value: price, style: 'money' as const },
      { value: prepaid, style: 'money' as const },
      { value: price - prepaid, style: 'money' as const },
      order.deliveryDate ? formatDate(order.deliveryDate) : '',
      order.payType ? t(`pay.${order.payType}`) : '',
      order.referral ? t(`ref.${order.referral}`) : '',
    ]
  })

  if (orders.length > 0) {
    const sum = (pick: (order: Order) => number) => orders.reduce((all, o) => all + pick(o), 0)
    const price = sum((order) => amount(order.price))
    const prepaid = sum((order) => amount(order.prepaid))
    rows.push([])
    rows.push([
      { value: t('export.total'), style: 'bold' },
      '',
      '',
      '',
      '',
      { value: orders.length, style: 'count' },
      { value: price, style: 'money' },
      { value: prepaid, style: 'money' },
      { value: price - prepaid, style: 'money' },
    ])
  }

  return {
    name: t('analytics.orders'),
    columns: [
      { header: t('print.order'), width: 16 },
      { header: t('print.date'), width: 13 },
      { header: t('form.name'), width: 24 },
      { header: t('form.phone'), width: 16 },
      { header: t('print.garment'), width: 16 },
      { header: t('form.status'), width: 18 },
      { header: t('form.price'), width: 14 },
      { header: t('form.prepaid'), width: 14 },
      { header: t('print.balance'), width: 14 },
      { header: t('print.delivery'), width: 13 },
      { header: t('form.payType'), width: 12 },
      { header: t('form.referral'), width: 20 },
    ],
    rows,
  }
}
