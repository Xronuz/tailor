interface Props {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
}

const PREFIX = '+998'
/** Operator code, then 3-2-2. Nine digits after the country code, no more. */
const GROUPS = [2, 3, 2, 2]
const MAX_DIGITS = GROUPS.reduce((sum, n) => sum + n, 0)

/**
 * Uzbek number field. The country code is fixed and the rest is grouped as it
 * is typed, so every stored number has the same shape — which is what makes
 * searching by phone and matching repeat customers reliable.
 */
export function PhoneInput({ value, onChange, onBlur }: Props) {
  function handle(raw: string) {
    onChange(format(raw))
  }

  return (
    <input
      value={value}
      onChange={(e) => handle(e.target.value)}
      onFocus={() => {
        if (!value.trim()) onChange(`${PREFIX} `)
      }}
      onBlur={() => {
        // Nothing but the prefix left behind counts as empty.
        if (digitsOf(value).length === 0) onChange('')
        onBlur?.()
      }}
      inputMode="tel"
      autoComplete="tel"
      placeholder={`${PREFIX} 90 123 45 67`}
      maxLength={PREFIX.length + 1 + GROUPS.length - 1 + MAX_DIGITS + 2}
    />
  )
}

/** Local digits only — country code and separators stripped. */
function digitsOf(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('998')) digits = digits.slice(3)
  return digits.slice(0, MAX_DIGITS)
}

function format(raw: string): string {
  const digits = digitsOf(raw)
  if (digits.length === 0) return raw.trim() === '' ? '' : `${PREFIX} `

  const parts: string[] = []
  let at = 0
  for (const size of GROUPS) {
    if (at >= digits.length) break
    parts.push(digits.slice(at, at + size))
    at += size
  }
  return `${PREFIX} ${parts.join(' ')}`
}
