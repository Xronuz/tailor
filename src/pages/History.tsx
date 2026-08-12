import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listOrders, normalizePhone } from '../lib/db'
import { useI18n } from '../lib/i18n'
import { StatusBadge } from '../components/StatusBadge'
import { OrderDrawer } from '../components/OrderDrawer'
import { CopyId } from '../components/CopyId'
import { Select } from '../components/Select'
import { PageHead } from '../components/PageHead'
import { ListIcon, PlusIcon } from '../components/icons'
import { garmentName } from '../lib/garments'
import { amount, fullMoney } from '../lib/analytics'
import { ORDER_STATUSES, type Order, type OrderStatus } from '../lib/types'

type PayFilter = 'all' | 'due' | 'paid'

const PAGE = 50

export function History() {
  const { t, formatDate } = useI18n()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  // `?pay=due` arrives from the unpaid-balance tile on the analytics page.
  const [params, setParams] = useSearchParams()
  const pay = (params.get('pay') as PayFilter | null) ?? 'all'
  // Years of orders would otherwise render one enormous scroll on the tablet.
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<Order | null>(null)

  useEffect(() => {
    const load = () => listOrders().then(setOrders)
    load()
    // A sync that pulled someone else's edits rewrites the local store.
    window.addEventListener('orders-changed', load)
    return () => window.removeEventListener('orders-changed', load)
  }, [])

  const results = useMemo(() => {
    if (!orders) return []
    const q = query.trim().toLowerCase()
    const digits = normalizePhone(query)
    return orders.filter((order) => {
      if (status !== 'all' && order.status !== status) return false
      if (pay !== 'all') {
        const owed = amount(order.price) - amount(order.prepaid)
        if (pay === 'due' && owed <= 0) return false
        if (pay === 'paid' && owed > 0) return false
      }
      if (!q) return true
      if (order.customerName.toLowerCase().includes(q)) return true
      if (order.id.toLowerCase().includes(q)) return true
      if (digits.length >= 3 && normalizePhone(order.phone).includes(digits)) return true
      return false
    })
  }, [orders, query, status, pay])

  return (
    <div className="page">
      <PageHead
        title={t('history.title')}
        icon={<ListIcon />}
        sub={orders ? `${results.length} ${t('analytics.ordersUnit')}` : undefined}
        actions={
          <Link to="/new" className="btn btn-primary">
            <PlusIcon /> {t('home.newOrder')}
          </Link>
        }
      />

      {/* search and every filter share one row */}
      <div className="filter-bar">
        <input
          className="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setLimit(PAGE)
          }}
          placeholder={t('history.search')}
          type="search"
        />

        <div className="filter-selects">
          <Select<PayFilter>
            className="filter-select"
            label={t('history.payFilter')}
            value={pay}
            options={[
              { value: 'all', label: t('history.all') },
              { value: 'due', label: t('history.payDue') },
              { value: 'paid', label: t('history.payPaid') },
            ]}
            onChange={(next) => {
              setLimit(PAGE)
              setParams(next === 'all' ? {} : { pay: next }, { replace: true })
            }}
          />

          <Select<OrderStatus | 'all'>
            className="filter-select"
            label={t('history.statusFilter')}
            value={status}
            options={[
              { value: 'all', label: t('history.all') },
              ...ORDER_STATUSES.map((s) => ({
                value: s,
                label: t(`status.${s}`),
              })),
            ]}
            onChange={(next) => {
              setStatus(next)
              setLimit(PAGE)
            }}
          />

          <Link to="/analytics" className="chip chip-link">
            {t('nav.analytics')}
          </Link>
        </div>
      </div>

      {orders === null ? (
        <div className="state">
          <span className="spinner" />
        </div>
      ) : orders.length === 0 ? (
        <div className="state">
          <p className="state-title">{t('history.empty')}</p>
          <Link to="/new" className="btn btn-secondary">
            {t('home.newOrder')}
          </Link>
        </div>
      ) : results.length === 0 ? (
        <div className="state">
          <p className="state-title">{t('history.noMatch')}</p>
        </div>
      ) : (
        <>
          {/* Only what is worth scanning; the rest opens in the drawer. */}
          <section className="card card-table">
            <div className="table-wrap">
              <table className="data-table history-table">
                <thead>
                  <tr>
                    <th>{t('print.order')}</th>
                    <th>{t('form.customer')}</th>
                    <th>{t('print.garment')}</th>
                    <th>{t('form.deliveryDate')}</th>
                    <th>{t('history.payments')}</th>
                    <th>{t('form.status')}</th>
                    <th aria-label={t('history.details')} />
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, limit).map((order) => {
                    const price = amount(order.price)
                    const balance = price - amount(order.prepaid)
                    const late = isOverdue(order)
                    return (
                      <tr
                        key={order.id}
                        className="row-clickable"
                        onClick={() => setOpen(order)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setOpen(order)
                          }
                        }}
                      >
                        <td className="cell-id">
                          <span>{order.id}</span>
                          <CopyId id={order.id} idVisible={false} />
                        </td>
                        <td className="cell-name">{order.customerName || '—'}</td>
                        <td>{garmentName(order, t)}</td>
                        <td>
                          {order.deliveryDate ? formatDate(order.deliveryDate) : '—'}
                          {late && <span className="tag-late">{t('history.overdue')}</span>}
                        </td>
                        <td className="cell-money">
                          {order.price ? fullMoney(price) : '—'}
                          {balance > 0 && (
                            <span className="cell-due">
                              {fullMoney(balance)} {t('print.balance').toLowerCase()}
                            </span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="cell-go" aria-hidden="true">
                          →
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {results.length > limit && (
            <button
              type="button"
              className="btn btn-secondary btn-big"
              onClick={() => setLimit((n) => n + PAGE)}
            >
              {t('history.more')} ({results.length - limit})
            </button>
          )}
        </>
      )}

      {open && (
        <OrderDrawer
          order={open}
          onClose={() => setOpen(null)}
          onDeleted={() => listOrders().then(setOrders)}
        />
      )}
    </div>
  )
}

/** Past its delivery date and still not finished. */
function isOverdue(order: Order): boolean {
  if (!order.deliveryDate || order.status === 'done') return false
  const due = new Date(`${order.deliveryDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}
