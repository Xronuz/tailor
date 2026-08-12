import { useState } from 'react'
import { useI18n } from '../lib/i18n'

interface Props {
  id: string
  /** Off where the number is already printed beside the button, as in a table. */
  idVisible?: boolean
}

/** Order number with a button that copies it — used in the history table and on
 *  the customer-facing lookup. */
export function CopyId({ id, idVisible = true }: Props) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function copy(e: React.MouseEvent) {
    // The row around this may be a link — copying must not navigate.
    e.preventDefault()
    e.stopPropagation()
    await copyText(id)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      {idVisible && <span className="order-id">{id}</span>}
      <button
        type="button"
        className="order-copy"
        aria-label={t('history.copyId')}
        title={copied ? t('history.copied') : t('history.copyId')}
        onClick={copy}
      >
        {copied ? '✓' : <CopyIcon />}
      </button>
    </>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6.5A3.5 3.5 0 0 0 3 6.5v6A2.5 2.5 0 0 0 5.5 15" />
    </svg>
  )
}

/**
 * `navigator.clipboard` only exists on secure origins, and the shop tablet
 * reaches this app over plain http on the LAN — fall back to a throwaway
 * textarea there.
 */
async function copyText(value: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return
    }
  } catch {
    /* fall through to the legacy path */
  }
  const field = document.createElement('textarea')
  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(field)
  }
}
