import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrders } from '../lib/db'
import { formatDate as formatDateIn, monthLabel, monthShort, useI18n } from '../lib/i18n'
import {
  amount,
  isCurrentPeriod,
  fullMoney,
  garmentMix,
  ordersByGarment,
  ordersInPeriod,
  referralMix,
  periodStart,
  revenueByMonth,
  seasonality,
  shortMoney,
  statusMix,
  totals,
  type RangeMode,
} from '../lib/analytics'
import { StackedBars } from '../components/charts/StackedBars'
import { BarChart } from '../components/charts/BarChart'
import { ShareBars } from '../components/charts/ShareBars'
import { StatusBadge } from '../components/StatusBadge'
import { PageHead } from '../components/PageHead'
import { ChartIcon } from '../components/icons'
import { Select } from '../components/Select'
import type { Order } from '../lib/types'

/**
 * Part-to-whole shares use a sequential bronze ramp (light → dark) rather than
 * competing hues: a warm categorical set could not clear the CVD separation
 * checks, while the ramp passes once rows are ordered by size. Identity never
 * rests on colour — every row carries its own label and figure.
 */
const MIX_RAMP = ['#232323', '#5c4a3a', '#9c6b2f', '#d9a94a', '#efe0c2']

/**
 * One hue per garment type, assigned in fixed order so a type keeps its colour
 * when the filter changes. Validated for the ivory surface: lightness band,
 * chroma floor, adjacent CVD separation and contrast all pass.
 */
const GARMENT_COLOR: Record<string, string> = {
  shirt: '#b0521f',
  trouser: '#8a6baf',
  dress: '#1e8a6e',
  suit: '#a5811f',
  other: '#3d6fb8',
}

/** Stage colours, matching the badges on the history and status screens. */
const STATUS_COLOR: Record<string, string> = {
  accepted: '#6b6155',
  in_progress: '#a47b3c',
  done: '#4d5f50',
}

const RANGES: RangeMode[] = ['week', 'month', 'year']

/** The money card carries two views; everything else has its own panel. */
type MoneyView = 'revenue' | 'season'

type PanelKey = 'daily' | 'workload' | 'mix' | 'referral' | 'money'

/**
 * The screen holds more than one tablet page can carry, so it is cut in two:
 * the running figures and the day chart on the first, the four breakdowns on
 * the second. Neither view scrolls — each fills the screen it is given.
 */
type View = 'main' | 'breakdown'

const BREAKDOWN: PanelKey[] = ['workload', 'mix', 'referral', 'money']

const MONTH_INDEXES = Array.from({ length: 12 }, (_, i) => i)

export function Analytics() {
  const { t, lang } = useI18n()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [range, setRange] = useState<RangeMode>('month')
  const [money, setMoney] = useState<MoneyView>('revenue')
  const [view, setView] = useState<View>('main')
  // Which calendar week / month / year is on screen.
  const [anchor, setAnchor] = useState(() => new Date())

  useEffect(() => {
    const load = () => listOrders().then(setOrders)
    load()
    window.addEventListener('orders-changed', load)
    return () => window.removeEventListener('orders-changed', load)
  }, [])

  const data = useMemo(() => orders ?? [], [orders])
  const sums = useMemo(() => totals(data), [data])
  const rangeSeries = useMemo(() => ordersInPeriod(data, range, anchor), [data, range, anchor])
  const byGarment = useMemo(() => ordersByGarment(data, range, anchor), [data, range, anchor])
  const series = rangeSeries.points
  const grain = rangeSeries.grain
  const season = useMemo(() => seasonality(data), [data])
  const monthly = useMemo(() => revenueByMonth(data, 12), [data])
  const mix = useMemo(() => garmentMix(data), [data])
  const statuses = useMemo(() => statusMix(data), [data])
  const referrals = useMemo(() => referralMix(data), [data])

  const monthName = (month: number) => monthShort(month, lang)
  const monthFull = (month: number) => monthLabel(month, lang)

  // Years that actually hold orders, newest first, always including this one.
  const years = useMemo(() => {
    const found = new Set<number>(data.map((o) => new Date(o.createdAt).getFullYear()))
    found.add(new Date().getFullYear())
    return [...found].sort((a, b) => b - a)
  }, [data])

  if (orders === null)
    return (
      <div className="page">
        <div className="state">
          <span className="spinner" />
        </div>
      </div>
    )

  if (orders.length === 0) {
    return (
      <div className="page">
        <PageHead title={t('nav.analytics')} icon={<ChartIcon />} />
        <div className="state">
          <p className="state-title">{t('history.empty')}</p>
        </div>
      </div>
    )
  }

  // Day buckets label the axis with the day number alone; the month those days
  // belong to is printed once in the card heading.
  const linePoints = series.map((point) => ({
    label: grain === 'month' ? monthName(point.start.getMonth()) : String(point.start.getDate()),
    value: point.count,
    full:
      grain === 'month'
        ? `${monthName(point.start.getMonth())} ${point.start.getFullYear()}`
        : formatDateIn(point.start.getTime()),
  }))

  const from = periodStart(range, anchor)
  const lastStart = series[series.length - 1]?.start
  // Viewing the month we are living through: name today's date, so the reader
  // knows how much of the month the bars actually cover.
  const today = new Date()
  const showsToday = isCurrentPeriod(range, anchor)
  const spanLabel =
    range === 'year'
      ? String(from.getFullYear())
      : range === 'month'
        ? `${monthFull(from.getMonth())} ${from.getFullYear()}${
            showsToday ? `, ${today.getDate()}` : ''
          }`
        : `${from.getDate()} ${monthName(from.getMonth())} – ${lastStart?.getDate()} ${monthName(
            lastStart?.getMonth() ?? from.getMonth(),
          )}`

  const seasonBars = season.map((point) => ({
    label: monthName(point.month),
    value: point.count,
    full: monthFull(point.month),
  }))

  const revenueBars = monthly.map((point) => ({
    label: monthName(point.month),
    value: point.revenue,
    display: fullMoney(point.revenue),
    full: `${monthFull(point.month)} ${point.year}`,
  }))

  // Biggest share takes the darkest step, so the ramp reads as magnitude.
  const mixRows = [...mix]
    .sort((a, b) => b.count - a.count)
    .map((slice, i) => ({
      key: slice.key,
      label: t(`g.${slice.key}`),
      value: slice.count,
      share: slice.share,
      color: MIX_RAMP[Math.min(i, MIX_RAMP.length - 1)],
    }))

  const loadTotal = statuses.reduce((sum, row) => sum + row.count, 0) || 1
  const loadRows = statuses.map((row) => ({
    key: row.key,
    label: <StatusBadge status={row.key} />,
    value: row.count,
    share: row.count / loadTotal,
    color: STATUS_COLOR[row.key] ?? '#7a7772',
  }))

  const referralRows = referrals.map((row, i) => ({
    key: row.key,
    label: row.key === 'unknown' ? t('common.none') : t(`ref.${row.key}`),
    value: row.count,
    share: row.share,
    color: MIX_RAMP[Math.min(i, MIX_RAMP.length - 1)],
  }))

  const busiest = [...season].sort((a, b) => b.count - a.count)[0]
  const unpaidOrders = data.filter((o) => amount(o.price) - amount(o.prepaid) > 0).length

  /** One card per panel. `large` marks the full-width day chart. */
  function renderPanel(key: PanelKey, large = false) {
    const shell = (title: string, children: React.ReactNode, head?: React.ReactNode) => (
      <section key={key} className={`card panel-card${large ? ' chart-main' : ''}`}>
        <div className="card-head">
          <div>
            <h2>{title}</h2>
            {key === 'daily' && <p className="muted small chart-span">{spanLabel}</p>}
          </div>

          <div className="panel-head-tools">{head}</div>
        </div>

        <div className="panel-body">{children}</div>
      </section>
    )

    if (key === 'daily') {
      return shell(
        grain === 'day' ? t('analytics.perDay') : t('analytics.perMonth'),
        <StackedBars
          labels={linePoints.map((p) => p.label)}
          fullLabels={linePoints.map((p) => p.full)}
          valueLabel={t('analytics.ordersUnit')}
          series={byGarment.series.map((s) => ({
            key: s.key,
            label: t(`g.${s.key}`),
            color: GARMENT_COLOR[s.key] ?? '#7a7772',
            values: s.values,
          }))}
        />,
        <div className="chart-controls">
          {range !== 'year' && (
            <Select<string>
              className="period-select"
              label={t('analytics.month')}
              value={String(from.getMonth())}
              options={MONTH_INDEXES.map((m) => ({ value: String(m), label: monthFull(m) }))}
              onChange={(m) => setAnchor((a) => new Date(a.getFullYear(), Number(m), 1))}
            />
          )}

          <Select<string>
            className="period-select period-select-year"
            label={t('analytics.year')}
            value={String(from.getFullYear())}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
            onChange={(y) => setAnchor((a) => new Date(Number(y), a.getMonth(), 1))}
          />

          <div className="chips">
            {RANGES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`chip${range === mode ? ' chip-on' : ''}`}
                onClick={() => {
                  setRange(mode)
                  setAnchor(new Date())
                }}
              >
                {t(`analytics.${mode}`)}
              </button>
            ))}
          </div>
        </div>,
      )
    }

    if (key === 'workload') return shell(t('analytics.workload'), <ShareBars rows={loadRows} />)
    if (key === 'mix') return shell(t('analytics.mix'), <ShareBars rows={mixRows} />)
    if (key === 'referral') return shell(t('analytics.referral'), <ShareBars rows={referralRows} />)

    return shell(
      money === 'revenue' ? t('analytics.revenueMonth') : t('analytics.season'),
      money === 'revenue' ? (
        <BarChart bars={revenueBars} valueLabel={t('common.money')} formatAxis={shortMoney} />
      ) : (
        <>
          <BarChart bars={seasonBars} valueLabel={t('analytics.ordersUnit')} />
          <p className="muted small">
            {t('analytics.busiest')}: <strong>{monthFull(busiest.month)}</strong> ({busiest.count})
          </p>
        </>
      ),
      <div className="chips">
        {(['revenue', 'season'] as MoneyView[]).map((view) => (
          <button
            key={view}
            type="button"
            className={`chip chip-small${money === view ? ' chip-on' : ''}`}
            onClick={() => setMoney(view)}
          >
            {view === 'revenue' ? t('common.money') : t('analytics.season').split(' ')[0]}
          </button>
        ))}
      </div>,
    )
  }

  const tabs: { key: View; label: string }[] = [
    { key: 'main', label: t('analytics.tabMain') },
    { key: 'breakdown', label: t('analytics.tabBreakdown') },
  ]

  return (
    <div className="page page-analytics">
      <PageHead
        title={t('nav.analytics')}
        icon={<ChartIcon />}
        sub={view === 'main' ? spanLabel : undefined}
        actions={
          <div className="chips">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`chip${view === tab.key ? ' chip-on' : ''}`}
                onClick={() => setView(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {view === 'main' ? (
        <>
          {/* the first three sit over the wide column, the fourth over the side one */}
          <div className="tiles">
            <div className="tiles-main">
              <Tile label={t('analytics.orders')} value={String(sums.orders)} to="/orders" />
              <Tile
                label={t('analytics.revenue')}
                value={shortMoney(sums.revenue)}
                sub={`${fullMoney(sums.revenue)} ${t('common.money')}`}
                to="/orders"
              />
              <Tile
                label={t('analytics.unpaid')}
                value={shortMoney(sums.balance)}
                sub={`${unpaidOrders} ${t('analytics.ordersUnit')}`}
                tone={sums.balance > 0 ? 'due' : undefined}
                to="/orders?pay=due"
              />
            </div>

            <Tile
              label={t('analytics.average')}
              value={shortMoney(sums.average)}
              sub={`${fullMoney(sums.average)} ${t('common.money')}`}
              to="/orders"
            />
          </div>

          <div className="analytics-main">{renderPanel('daily', true)}</div>
        </>
      ) : (
        <div className="analytics-grid">{BREAKDOWN.map((key) => renderPanel(key))}</div>
      )}
    </div>
  )
}

/** A figure worth acting on links through to the orders behind it. */
function Tile({
  label,
  value,
  sub,
  tone,
  to,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'due'
  to?: string
}) {
  const body = (
    <>
      <span className="tile-label">{label}</span>
      <strong className={`tile-value${tone === 'due' ? ' order-money-due' : ''}`}>{value}</strong>
      {sub && <span className="tile-sub">{sub}</span>}
    </>
  )

  return to ? (
    <Link to={to} className="tile tile-link">
      {body}
    </Link>
  ) : (
    <div className="tile">{body}</div>
  )
}
