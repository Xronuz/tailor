import { useI18n } from '../lib/i18n'
import { fieldsFor, garmentName } from '../lib/garments'
import { useObjectUrls } from '../lib/useObjectUrls'
import { useShop } from '../lib/settings'
import { QrCode } from './QrCode'
import type { Order, OrderPhoto } from '../lib/types'

/** Stable identity: `?? []` inline would hand useObjectUrls a new array on
 *  every render and spin its effect forever. */
const NO_PHOTOS: OrderPhoto[] = []

interface Row {
  label: string
  value: string
}

/**
 * One landscape A4, cut down the middle: the workshop copy on the left with
 * every measurement, the customer's slip on the right with what they paid and
 * a QR that opens the status page for this order.
 */
export function PrintSheet({ order }: { order: Order }) {
  const { t, formatDate } = useI18n()
  const [shop] = useShop()
  const urls = useObjectUrls(order.photos)
  const materialUrls = useObjectUrls(order.materialPhotos ?? NO_PHOTOS)

  const unit = t(`common.${order.unit}`)
  const rows: Row[] = [
    ...fieldsFor(order.garmentType)
      .filter((key) => !(order.removedFields ?? []).includes(key))
      .filter((key) => (order.measurements[key] ?? '').trim() !== '')
      .map((key) => ({ label: t(`m.${key}`), value: order.measurements[key].trim() })),
    ...order.customMeasurements
      .filter((m) => m.label.trim() !== '' || m.value.trim() !== '')
      .map((m) => ({ label: m.label.trim(), value: m.value.trim() })),
  ]

  const garment = garmentName(order, t)
  const balance = money(order.price) - money(order.prepaid)
  const shopName = shop.name || t('app.title')

  return (
    <article className="sheet sheet-wide">
      {/* ---------- workshop copy ---------- */}
      <section className="sheet-half">
        <header className="sheet-head">
          <div>
            <h1 className="sheet-shop">{shopName}</h1>
            <p className="sheet-kicker">{t('print.workshopCopy')}</p>
          </div>
        </header>

        <section className="sheet-facts">
          <Fact label={t('print.customer')} value={order.customerName || '—'} />
          <Fact label={t('print.order')} value={order.id} />
          <Fact label={t('print.phone')} value={order.phone || '—'} />
          <Fact label={t('print.garment')} value={garment} />
          <Fact
            label={t('print.delivery')}
            value={order.deliveryDate ? formatDate(order.deliveryDate) : '—'}
          />
          <Fact label={t('print.source')} value={t(`form.source.${order.measurementSource}`)} />
        </section>

        <section className="sheet-body">
          <div className="sheet-measures">
            <h2>
              {t('print.measurements')} <span className="sheet-unit">({unit})</span>
            </h2>
            {rows.length > 0 ? (
              <table className="measure-table">
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.label}-${i}`}>
                      <th>{row.label}</th>
                      <td>
                        {row.value} <span className="measure-unit">{unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="sheet-empty">—</p>
            )}
          </div>

          <div className="sheet-photos">
            {/* the cloth first, then whatever the customer brought to copy */}
            {(order.materialPhotos ?? NO_PHOTOS).length > 0 && (
              <>
                <h2>{t('print.material')}</h2>
                {order.materialPhotos.map((photo) => (
                  <img
                    key={photo.id}
                    src={materialUrls[photo.id]}
                    alt=""
                    className="sheet-photo"
                  />
                ))}
              </>
            )}

            <h2>{t('print.reference')}</h2>
            {order.photos.length > 0 ? (
              order.photos.map((photo) => (
                <img key={photo.id} src={urls[photo.id]} alt="" className="sheet-photo" />
              ))
            ) : (
              <p className="sheet-empty">—</p>
            )}
          </div>
        </section>

        {/* Ticked off by whoever sews it, so each request is accounted for. */}
        <table className="task-table">
          <tbody>
            <tr>
              <td className="task-tick" aria-hidden="true" />
              <th>{t('print.fabric')}</th>
              <td className="task-value">MATO: {order.fabric || '—'}</td>
            </tr>
            <tr>
              <td className="task-tick" aria-hidden="true" />
              <th>{t('print.notes')}</th>
              <td className="task-value">{order.notes || '—'}</td>
            </tr>
          </tbody>
        </table>

        <footer className="sheet-foot">
          <div className="sheet-signs">
            <span>{t('print.cut')}: ____________</span>
            <span>{t('print.sewn')}: ____________</span>
            <span>{t('print.checked')}: ____________</span>
          </div>
        </footer>
      </section>

      {/* ---------- customer copy ---------- */}
      <section className="sheet-half sheet-half-customer">
        <header className="sheet-head">
          <div>
            <h1 className="sheet-shop">{shopName}</h1>
            {shop.phone && <p className="sheet-shop-phone">{shop.phone}</p>}
            <p className="sheet-kicker">{t('print.customerCopy')}</p>
          </div>
        </header>

        <section className="sheet-facts">
          <Fact label={t('print.customer')} value={order.customerName || '—'} />
          <Fact label={t('print.order')} value={order.id} />
          <Fact label={t('print.phone')} value={order.phone || '—'} />
          <Fact label={t('print.garment')} value={garment} />
          <Fact
            label={t('print.delivery')}
            value={order.deliveryDate ? formatDate(order.deliveryDate) : '—'}
          />
          <Fact label={t('print.date')} value={formatDate(order.createdAt)} />
          <Fact label={t('form.payType')} value={t(`pay.${order.payType}`)} />
        </section>

        <table className="pay-table">
          <tbody>
            <tr>
              <th>{t('form.price')}</th>
              <td>
                {order.price || '—'} {order.price ? t('common.money') : ''}
              </td>
            </tr>
            <tr>
              <th>{t('form.prepaid')}</th>
              <td>
                {order.prepaid || '—'} {order.prepaid ? t('common.money') : ''}
              </td>
            </tr>
            <tr className="pay-total">
              <th>{t('print.balance')}</th>
              <td>
                {formatMoney(balance)} {t('common.money')}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="sheet-qr">
          <QrCode value={statusUrl(order.id)} />
          <div>
            <p className="sheet-qr-title">{t('print.scan')}</p>
            <p className="sheet-qr-note">{t('print.scanNote')}</p>
          </div>
        </div>

        <footer className="sheet-foot">
          <span>{t('print.signature')}: ______________________</span>
        </footer>
      </section>
    </article>
  )
}

/** Deep link to this order on the customer-facing status screen. */
function statusUrl(id: string): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/status?id=${encodeURIComponent(id)}`
}

/** Label and value on one line — stacked pairs wasted half the sheet. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span className="fact-label">{label}</span>
      <span className="fact-value">{value}</span>
    </div>
  )
}

function money(value: string): number {
  const n = Number(value.replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function formatMoney(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}
