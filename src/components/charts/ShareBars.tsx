export interface ShareRow {
  key: string
  /** Rendered ahead of the bar — text or a status badge. */
  label: React.ReactNode
  value: number
  share: number
  color: string
  /** Right-hand figure; falls back to the raw count. */
  display?: string
}

/**
 * Part-to-whole as a row of bars rather than a pie: the label, the length and
 * the number all sit on one line, so nothing depends on reading an angle.
 */
export function ShareBars({ rows, unit }: { rows: ShareRow[]; unit?: string }) {
  return (
    <ul className="share-bars">
      {rows.map((row) => (
        <li key={row.key} className="share-row">
          <span className="share-label">{row.label}</span>
          <span className="share-track">
            <span
              className="share-fill"
              style={{ width: `${Math.max(row.share * 100, 1.5)}%`, background: row.color }}
            />
          </span>
          <span className="share-value">
            {row.display ?? row.value}
            {unit ? <span className="unit">{unit}</span> : null}
            <span className="share-pct">{Math.round(row.share * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
