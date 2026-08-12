import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listOrders, normalizePhone } from '../lib/db'
import { useI18n } from '../lib/i18n'
import { CopyId } from '../components/CopyId'
import { PageHead } from '../components/PageHead'
import { SearchIcon } from '../components/icons'
import { PhoneIcon, PinIcon, ShirtIcon } from '../components/icons'
import { StatusSteps } from '../components/StatusSteps'
import { garmentName } from '../lib/garments'
import { amount, fullMoney } from '../lib/analytics'
import type { Order } from '../lib/types'

/**
 * Customer-facing lookup: order ID or phone in, payment state and status out.
 * Deliberately shows no measurements, notes or photos — this screen gets turned
 * around to face the customer.
 */
export function Status() {
  const { t, formatDate } = useI18n()
  const [params] = useSearchParams()
  const scanned = params.get('id') ?? ''
  const [query, setQuery] = useState(scanned)
  const [results, setResults] = useState<Order[] | null>(null)

  const lookup = useCallback(async (raw: string) => {
    const q = raw.trim().toLowerCase()
    if (!q) return
    const digits = normalizePhone(raw)
    const all = await listOrders()
    setResults(
      all.filter(
        (order) =>
          order.id.toLowerCase() === q ||
          order.id.toLowerCase().endsWith(q) ||
          (digits.length >= 5 && normalizePhone(order.phone) === digits),
      ),
    )
  }, [])

  // Arriving from the QR on a printed slip: look the order up straight away.
  useEffect(() => {
    if (scanned) {
      setQuery(scanned)
      lookup(scanned)
    }
  }, [scanned, lookup])

  return (
    <div className="page">
      <PageHead title={t('nav.status')} icon={<SearchIcon />} />

      <div className="lookup">
        <input
          className="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup(query)}
          placeholder={t('status.placeholder')}
        />
        <button type="button" className="btn btn-primary btn-big" onClick={() => lookup(query)}>
          {t('status.check')}
        </button>
      </div>

      {results !== null &&
        (results.length === 0 ? (
          <p className="muted">{t('history.noMatch')}</p>
        ) : (
          <div className="order-list">
            {results.map((order) => {
              const price = amount(order.price)
              const paid = amount(order.prepaid)
              return (
                <section key={order.id} className="card status-card">
                  <div className="status-card-head">
                    {/* name, order number with copy, what was ordered, then how
                        to reach the customer */}
                    <span className="order-card-title">
                      <strong className="order-card-name">
                        {order.customerName || order.phone || order.id}
                      </strong>
                      <CopyId id={order.id} />

                      <span className="meta-chip">
                        <ShirtIcon />
                        {garmentName(order, t)}
                      </span>

                      {order.phone && (
                        <a className="meta-chip" href={`tel:${order.phone.replace(/\s/g, '')}`}>
                          <PhoneIcon />
                          {order.phone}
                        </a>
                      )}

                      {order.address && (
                        <span className="meta-chip">
                          <PinIcon />
                          {order.address}
                        </span>
                      )}
                    </span>
                  </div>

                  <StatusSteps status={order.status} />
                  <dl className="status-facts">
                    <div>
                      <dt>{t('print.delivery')}</dt>
                      <dd>{order.deliveryDate ? formatDate(order.deliveryDate) : '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('form.price')}</dt>
                      <dd>
                        {order.price ? fullMoney(price) : '—'}
                        {order.price && <span className="unit">{t('common.money')}</span>}
                      </dd>
                    </div>
                    <div>
                      <dt>{t('form.prepaid')}</dt>
                      <dd>
                        {order.prepaid ? fullMoney(paid) : '—'}
                        {order.prepaid && <span className="unit">{t('common.money')}</span>}
                      </dd>
                    </div>
                    <div>
                      <dt>{t('print.balance')}</dt>
                      <dd className={price - paid > 0 ? 'status-balance' : undefined}>
                        {fullMoney(price - paid)}
                        <span className="unit">{t('common.money')}</span>
                      </dd>
                    </div>
                  </dl>
                </section>
              )
            })}
          </div>
        ))}
    </div>
  )
}
