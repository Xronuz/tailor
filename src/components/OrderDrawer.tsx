import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { deleteOrder } from '../lib/db'
import { amount, fullMoney } from '../lib/analytics'
import { garmentName } from '../lib/garments'
import { CopyId } from './CopyId'
import { StatusBadge } from './StatusBadge'
import { CheckIcon, CloseIcon, TrashIcon } from './icons'
import type { Order } from '../lib/types'

interface Props {
  order: Order
  onClose: () => void
  /** Fired after the order is gone, so the list behind can reload. */
  onDeleted?: () => void
}

/**
 * Everything the table leaves out, in a panel that slides in from the right.
 * The table keeps the six columns worth scanning; the rest lives here.
 */
export function OrderDrawer({ order, onClose, onDeleted }: Props) {
  const { t, formatDate } = useI18n()
  const panel = useRef<HTMLDivElement>(null)
  const [confirming, setConfirming] = useState(false)

  async function remove() {
    await deleteOrder(order.id)
    onDeleted?.()
    onClose()
  }

  useEffect(() => {
    panel.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const price = amount(order.price)
  const paid = amount(order.prepaid)
  const balance = price - paid
  const money = t('common.money')

  return (
    <div className="drawer-root no-print">
      <div className="drawer-scrim" onClick={onClose} />

      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={order.id}
        tabIndex={-1}
        ref={panel}
      >
        <header className="drawer-head">
          <div>
            <span className="drawer-title">
              {t('print.order')} <strong>{order.id}</strong>
            </span>
            <CopyId id={order.id} idVisible={false} />
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('order.back')}
            title={t('order.back')}
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="drawer-body">
          <div className="drawer-status">
            <StatusBadge status={order.status} />
          </div>

          <Group title={t('form.customer')}>
            <Row label={t('form.name')} value={order.customerName} />
            <Row label={t('form.phone')} value={order.phone} href={`tel:${order.phone}`} />
            <Row label={t('form.address')} value={order.address} />
          </Group>

          <Group title={t('print.garment')}>
            <Row label={t('form.garmentType')} value={garmentName(order, t)} />
            <Row label={t('form.notes')} value={order.notes} />
            <Row
              label={t('form.referral')}
              value={order.referral ? t(`ref.${order.referral}`) : ''}
            />
          </Group>

          <Group title={t('history.dates')}>
            <Row label={t('print.date')} value={formatDate(order.createdAt)} />
            <Row
              label={t('form.deliveryDate')}
              value={order.deliveryDate ? formatDate(order.deliveryDate) : ''}
            />
          </Group>

          <Group title={t('history.payments')}>
            <Row label={t('form.payType')} value={t(`pay.${order.payType}`)} />
            <Row label={t('form.price')} value={order.price ? `${fullMoney(price)} ${money}` : ''} />
            <Row
              label={t('form.prepaid')}
              value={order.prepaid ? `${fullMoney(paid)} ${money}` : ''}
            />
            <Row
              label={t('print.balance')}
              value={`${fullMoney(balance)} ${money}`}
              tone={balance > 0 ? 'due' : 'clear'}
            />
          </Group>
        </div>

        <footer className="drawer-foot">
          <Link to={`/orders/${order.id}`} className="btn btn-primary">
            {t('order.print')} / {t('order.edit')}
          </Link>

          {/* Deleting an order cannot be undone, so it takes a second tap. */}
          {confirming ? (
            <>
              <button
                type="button"
                className="icon-btn icon-confirm"
                aria-label={t('order.deleteConfirm')}
                title={t('order.deleteConfirm')}
                onClick={remove}
              >
                <CheckIcon />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('form.cancel')}
                title={t('form.cancel')}
                onClick={() => setConfirming(false)}
              >
                <CloseIcon />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="icon-btn icon-delete"
              aria-label={t('order.delete')}
              title={t('order.delete')}
              onClick={() => setConfirming(true)}
            >
              <TrashIcon />
            </button>
          )}
        </footer>
      </aside>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="drawer-group">
      <h2>{title}</h2>
      <dl className="drawer-rows">{children}</dl>
    </section>
  )
}

function Row({
  label,
  value,
  href,
  tone,
}: {
  label: string
  value: string
  href?: string
  tone?: 'due' | 'clear'
}) {
  const { t } = useI18n()
  const shown = value?.trim() ? value : t('common.none')
  return (
    <div className="drawer-row">
      <dt>{label}</dt>
      <dd className={tone === 'due' ? 'order-money-due' : tone === 'clear' ? 'order-money-clear' : undefined}>
        {href && value?.trim() ? <a href={href}>{shown}</a> : shown}
      </dd>
    </div>
  )
}
