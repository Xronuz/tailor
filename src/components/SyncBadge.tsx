import { useCallback, useEffect, useState } from 'react'
import { syncNow, type SyncResult } from '../lib/db'
import { useI18n } from '../lib/i18n'

/**
 * Shows whether this tablet is in step with the shop server, and syncs on load,
 * when the network returns, and every half minute while the app is open.
 */
export function SyncBadge() {
  const { t } = useI18n()
  const [state, setState] = useState<SyncResult | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async () => {
    setBusy(true)
    try {
      const result = await syncNow()
      setState(result)
      // Pulling changes rewrites the local store; the open screen must reread it.
      if (result.pulled > 0) window.dispatchEvent(new CustomEvent('orders-changed'))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    run()
    const timer = window.setInterval(run, 30_000)
    window.addEventListener('online', run)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', run)
    }
  }, [run])

  const offline = state !== null && !state.online
  const label = offline
    ? state.pending > 0
      ? `${t('sync.offline')} · ${state.pending}`
      : t('sync.offline')
    : t('sync.online')

  return (
    <button
      type="button"
      className={`sync-badge${offline ? ' sync-badge-off' : ''}`}
      onClick={run}
      title={t('sync.retry')}
      aria-live="polite"
    >
      <span className={`sync-dot${busy ? ' sync-dot-busy' : ''}`} aria-hidden="true" />
      {label}
    </button>
  )
}
