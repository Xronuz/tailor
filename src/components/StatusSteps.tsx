import { useI18n } from '../lib/i18n'
import { ORDER_STATUSES, type OrderStatus } from '../lib/types'
import sewingGif from '../assets/tikuvchi.gif'
import acceptedImage from '../assets/qabul.png'

/** Artwork shown inside a stage's circle. */
const STAGE_ART: Partial<Record<OrderStatus, string>> = {
  in_progress: sewingGif,
}

/** Shown whatever the order's stage — the badge already carries its own tick. */
const ALWAYS_ART: Partial<Record<OrderStatus, string>> = {
  accepted: acceptedImage,
}

interface Props {
  status: OrderStatus
  /** When set, the steps become buttons that move the order along. */
  onChange?: (status: OrderStatus) => void
}

/**
 * The order's journey through the workshop, as a rail: done steps filled in
 * charcoal, the current one ringed in gold, the rest still beige. Read-only on
 * the customer-facing lookup, interactive on the order page.
 */
export function StatusSteps({ status, onChange }: Props) {
  const { t } = useI18n()
  const current = ORDER_STATUSES.indexOf(status)

  return (
    <ol className="steps" aria-label={t('form.status')}>
      {ORDER_STATUSES.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'todo'
        const label = t(`status.${step}`)
        // Some stages keep their artwork at every step of the journey; the
        // rest show theirs only while the order is sitting in them.
        const art = ALWAYS_ART[step] ?? (state === 'now' ? STAGE_ART[step] : undefined)

        const dot = (
          <>
            <span className={`step-dot${art ? ' step-dot-art' : ''}`} aria-hidden="true">
              {art ? (
                <img src={art} alt="" className="step-gif" />
              ) : state === 'done' ? (
                '✓'
              ) : (
                i + 1
              )}
            </span>
            <span className="step-label">{label}</span>
          </>
        )

        return (
          <li key={step} className={`step step-${state}`}>
            {onChange ? (
              <button
                type="button"
                className="step-btn"
                aria-current={state === 'now' ? 'step' : undefined}
                onClick={() => onChange(step)}
              >
                {dot}
              </button>
            ) : (
              <span className="step-btn" aria-current={state === 'now' ? 'step' : undefined}>
                {dot}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
