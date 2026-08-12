import { useState } from 'react'

export interface Bar {
  label: string
  value: number
  /** Shown in the tooltip; falls back to the raw value. */
  display?: string
  full?: string
}

interface Props {
  bars: Bar[]
  valueLabel: string
  formatAxis?: (n: number) => string
}

const W = 720
const H = 240
const PAD = { top: 16, right: 12, bottom: 30, left: 46 }
const GAP = 2 // surface gap between adjacent bars

export function BarChart({ bars, valueLabel, formatAxis = String }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const max = Math.max(1, ...bars.map((b) => b.value))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const slot = innerW / Math.max(1, bars.length)
  const barW = Math.max(4, slot - GAP * 2)
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH
  const gridValues = axisTicks(max)

  const active = hover !== null ? bars[hover] : null

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={valueLabel}>
        {gridValues.map((v) => (
          <g key={v}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="axis" x={PAD.left - 8} y={y(v) + 4} textAnchor="end">
              {formatAxis(v)}
            </text>
          </g>
        ))}

        <line
          className="baseline"
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + innerH}
          y2={PAD.top + innerH}
        />

        {bars.map((bar, i) => {
          const height = Math.max(bar.value > 0 ? 3 : 0, PAD.top + innerH - y(bar.value))
          return (
            <g
              key={bar.label + i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <rect
                className="bar-hit"
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={innerH}
              />
              <rect
                className={`bar${hover === i ? ' bar-on' : ''}`}
                x={PAD.left + i * slot + GAP}
                y={PAD.top + innerH - height}
                width={barW}
                height={height}
                rx={4}
              />
              <text className="axis" x={PAD.left + i * slot + slot / 2} y={H - 10} textAnchor="middle">
                {bar.label}
              </text>
            </g>
          )
        })}
      </svg>

      {active && (
        <div
          className="chart-tip"
          style={{
            left: `${((PAD.left + (hover ?? 0) * slot + slot / 2) / W) * 100}%`,
          }}
          role="status"
        >
          <strong>{active.full ?? active.label}</strong>
          <span>
            {active.display ?? active.value} {valueLabel}
          </span>
        </div>
      )}
    </div>
  )
}

function axisTicks(max: number): number[] {
  const raw = max / 4
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1)))
  const step = Math.max(1, Math.ceil(raw / mag) * mag)
  const out: number[] = []
  for (let v = 0; v <= max; v += step) out.push(v)
  const last = out[out.length - 1]
  // Only crown the axis with the true max when it is far enough from the tick
  // below it — otherwise the two labels collide.
  if (last < max && max - last > step * 0.35) out.push(max)
  return out
}
