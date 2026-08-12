import { useI18n } from '../lib/i18n'
import type { Order } from '../lib/types'

/** Stage pill. Always carries its own label — never colour alone. */
export function StatusBadge({ status }: { status: Order['status'] }) {
  const { t } = useI18n()
  return <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>
}
