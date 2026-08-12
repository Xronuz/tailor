import { useState } from 'react'

export interface StackSeries {
  key: string
  label: string
  color: string
  /** One value per x label. */
  values: number[]
}

interface Props {
  labels: string[]
  fullLabels: string[]
  series: StackSeries[]
  valueLabel: string
}

const W = 760
const H = 280
const PAD = { top: 22, right: 16, bottom: 34, left: 46 }
const GAP = 2 // surface gap between stacked segments

/**
 * Orders per day, split by garment type and stacked.
 *
 * Lines were the wrong form here: on a day when three types each take one
 * order, three lines sit at exactly the same height and hide one another.
 * Stacked bars give every type its own band and make the day's total readable
 * at the same time.
 */
export function StackedBars({ labels, fullLabels, series, valueLabel }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0))
  const max = Math.max(1, ...totals)

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const slot = innerW / Math.max(1, labels.length)
  const barW = Math.max(3, Math.min(28, slot - 4))
  const cx = (i: number) => PAD.left + slot * i + slot / 2
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH

  const gridValues = niceTicks(max)
  // Every day gets its number — 31 two-digit labels fit across the field once
  // the axis type is small enough. Only a longer span would need thinning.
  const tickEvery = labels.length > 40 ? 2 : 1

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.floor((px - PAD.left) / slot)
    setHover(i >= 0 && i < labels.length ? i : null)
  }

  const active = hover !== null ? hover : null

  return (
    <div className="chart chart-stack">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={valueLabel}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {gridValues.map((v) => (
          <g key={v}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="axis" x={PAD.left - 10} y={y(v) + 4} textAnchor="end">
              {v}
            </text>
          </g>
        ))}

        {labels.map((_, i) => {
          let running = 0
          return (
            <g key={`col-${i}`} opacity={active === null || active === i ? 1 : 0.45}>
              {series.map((s) => {
                const value = s.values[i] ?? 0
                if (value <= 0) return null
                const top = y(running + value)
                const bottom = y(running)
                running += value
                const height = Math.max(1, bottom - top - GAP)
                return (
                  <rect
                    key={`${s.key}-${i}`}
                    x={cx(i) - barW / 2}
                    y={top}
                    width={barW}
                    height={height}
                    rx={Math.min(3, barW / 2)}
                    fill={s.color}
                  />
                )
              })}
            </g>
          )
        })}

        {/* invisible full-height hit areas, so thin columns are still easy to hit */}
        {labels.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={PAD.left + slot * i}
            y={PAD.top}
            width={slot}
            height={innerH}
            fill="transparent"
          />
        ))}

        {labels.map((label, i) =>
          i % tickEvery === 0 ? (
            <text key={`x-${i}`} className="axis" x={cx(i)} y={H - 12} textAnchor="middle">
              {label}
            </text>
          ) : null,
        )}
      </svg>

      {active !== null && totals[active] > 0 && (
        <div
          className={`chart-card${cx(active) > W * 0.6 ? ' chart-card-left' : ''}`}
          style={{ left: `${(cx(active) / W) * 100}%`, top: '6%' }}
          role="status"
        >
          <span className="chart-card-label">{fullLabels[active]}</span>
          {series
            .filter((s) => (s.values[active] ?? 0) > 0)
            .map((s) => (
              <span key={`t-${s.key}`} className="chart-card-row">
                <span className="legend-swatch" style={{ background: s.color }} />
                {s.label}
                <strong>{s.values[active]}</strong>
              </span>
            ))}
          <span className="chart-card-total">
            {totals[active]} {valueLabel}
          </span>
        </div>
      )}

      <ul className="legend">
        {series.map((s) => (
          <li key={`l-${s.key}`}>
            <span className="legend-swatch" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Whole-number gridlines only — half an order does not exist. */
function niceTicks(max: number): number[] {
  const step = Math.max(1, Math.ceil(max / 4))
  const out: number[] = []
  for (let v = 0; v <= max; v += step) out.push(v)
  if (out[out.length - 1] !== max) out.push(max)
  return out
}
