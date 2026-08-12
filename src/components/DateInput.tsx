import { useEffect, useState } from 'react'

interface Props {
  /** ISO `yyyy-mm-dd`, or '' when unset — the shape stored on the order. */
  value: string
  onChange: (iso: string) => void
}

/**
 * Day-first date field. A native `<input type="date">` renders in the browser's
 * own locale (mm/dd/yyyy on a US-configured tablet) and that display order
 * cannot be overridden, so the text field is typed by hand as dd/mm/yyyy while
 * the value kept on the order stays ISO.
 */
export function DateInput({ value, onChange }: Props) {
  const [text, setText] = useState(() => isoToDisplay(value))

  // Keep in step when the form loads an order or clears the field.
  useEffect(() => {
    setText((prev) => (displayToIso(prev) === value ? prev : isoToDisplay(value)))
  }, [value])

  function handle(raw: string) {
    const masked = mask(raw)
    setText(masked)
    const iso = displayToIso(masked)
    if (iso !== value) onChange(iso)
  }

  return (
    <input
      value={text}
      onChange={(e) => handle(e.target.value)}
      onBlur={() => setText(isoToDisplay(value))}
      inputMode="numeric"
      placeholder="dd/mm/yyyy"
      maxLength={10}
      autoComplete="off"
    />
  )
}

/** Digits only, with slashes dropped in as the day and month fill up. */
function mask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(
    (part) => part !== '',
  )
  return parts.join('/')
}

function isoToDisplay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

/** '' until the date is both complete and real — 31/02 never becomes a value. */
function displayToIso(display: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display)
  if (!match) return ''
  const [, dd, mm, yyyy] = match
  const day = Number(dd)
  const month = Number(mm)
  const year = Number(yyyy)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return ''
  }
  return `${yyyy}-${mm}-${dd}`
}
