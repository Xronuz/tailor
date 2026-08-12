import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { deleteOrder, getOrder, saveOrder } from '../lib/db'
import { useI18n } from '../lib/i18n'
import { PrintSheet } from '../components/PrintSheet'
import { StatusSteps } from '../components/StatusSteps'
import { PageHead } from '../components/PageHead'
import { DownloadIcon, PencilIcon, PrinterIcon } from '../components/icons'
import { renderOrderImage } from '../lib/orderImage'
import { fieldsFor, garmentName } from '../lib/garments'
import { useShop } from '../lib/settings'
import { type Order, type OrderStatus } from '../lib/types'

export function OrderView() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [order, setOrder] = useState<Order | null | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [shop] = useShop()
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    getOrder(id).then((found) => setOrder(found ?? null))
  }, [id])

  const print = useCallback(async () => {
    await waitForImages(sheetRef.current)
    window.print()
  }, [])

  // `?print=1` comes from "Save & print" — print once, then drop the flag so a
  // reload or back-navigation does not reopen the print dialog.
  useEffect(() => {
    if (!order || params.get('print') !== '1') return
    setParams({}, { replace: true })
    const timer = window.setTimeout(print, 150)
    return () => window.clearTimeout(timer)
  }, [order, params, setParams, print])

  async function changeStatus(status: OrderStatus) {
    if (!order) return
    setOrder(await saveOrder({ ...order, status }))
  }

  /** Workshop copy as a PNG, for sending to whoever sews it. */
  async function downloadImage() {
    if (!order) return

    // Measurements are translated here; the drawing code holds no dictionary.
    const measures: [string, string][] = [
      ...fieldsFor(order.garmentType)
        .filter((key) => !(order.removedFields ?? []).includes(key))
        .filter((key) => (order.measurements[key] ?? '').trim() !== '')
        .map((key) => [t(`m.${key}`), order.measurements[key].trim()] as [string, string]),
      ...order.customMeasurements
        .filter((m) => m.label.trim() !== '' && m.value.trim() !== '')
        .map((m) => [m.label.trim(), m.value.trim()] as [string, string]),
    ]

    const blob = await renderOrderImage(
      order,
      {
        shop: shop.name || t('app.title'),
        kicker: t('print.workshopCopy'),
        order: t('print.order'),
        customer: t('print.customer'),
        phone: t('print.phone'),
        garment: t('print.garment'),
        garmentValue: garmentName(order, t),
        delivery: t('print.delivery'),
        source: t('print.source'),
        sourceValue: t(`form.source.${order.measurementSource}`),
        fabric: t('print.fabric'),
        measurements: t('print.measurements'),
        unit: t(`common.${order.unit}`),
        notes: t('print.notes'),
        material: t('print.material'),
        reference: t('print.reference'),
      },
      measures,
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${order.id}.png`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function remove() {
    if (!order) return
    await deleteOrder(order.id)
    navigate('/orders', { replace: true })
  }

  if (order === undefined)
    return (
      <div className="page">
        <div className="state">
          <span className="spinner" />
        </div>
      </div>
    )
  if (order === null)
    return (
      <div className="page">
        <div className="state">
          <p className="state-title">{t('order.notFound')}</p>
          <Link to="/orders" className="btn btn-secondary">
            {t('order.back')}
          </Link>
        </div>
      </div>
    )

  return (
    <div className="page page-order">
      <PageHead
        title={order.customerName || order.id}
        icon={<PrinterIcon />}
        sub={order.id}
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={print}>
              <PrinterIcon /> {t('order.print')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={downloadImage}>
              <DownloadIcon /> {t('order.image')}
            </button>
            <Link to={`/orders/${order.id}/edit`} className="btn btn-secondary">
              <PencilIcon /> {t('order.edit')}
            </Link>
          </>
        }
      />

      <div className="order-toolbar no-print">
        {confirmDelete ? (
          <>
            <button type="button" className="btn btn-danger btn-big" onClick={remove}>
              {t('order.deleteConfirm')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-big"
              onClick={() => setConfirmDelete(false)}
            >
              {t('form.cancel')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-big"
            onClick={() => setConfirmDelete(true)}
          >
            {t('order.delete')}
          </button>
        )}
      </div>

      <section className="card no-print">
        <h2>{t('form.status')}</h2>
        <StatusSteps status={order.status} onChange={changeStatus} />
      </section>

      <p className="muted small no-print">{t('order.preview')}</p>

      <div ref={sheetRef} className="sheet-wrap">
        <PrintSheet order={order} />
      </div>
    </div>
  )
}

/** Photos must be decoded before print(), or the sheet prints with blank boxes. */
async function waitForImages(root: HTMLElement | null): Promise<void> {
  if (!root) return
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          }),
    ),
  )
}
