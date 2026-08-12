import qrcode from 'qrcode-generator'

interface Props {
  value: string
  /** Rendered size in millimetres — this only ever appears on paper. */
  size?: number
}

/**
 * QR drawn as SVG rectangles from a locally computed matrix. The encoder is
 * bundled, so a sheet still prints with a working code when the shop is
 * offline.
 */
export function QrCode({ value, size = 30 }: Props) {
  // Type 0 lets the encoder pick the smallest version that fits; medium error
  // correction survives a fold or a smudge on a paper slip.
  const qr = qrcode(0, 'M')
  qr.addData(value)
  qr.make()

  const count = qr.getModuleCount()
  const quiet = 2
  const span = count + quiet * 2

  const cells: string[] = []
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) cells.push(`M${col + quiet},${row + quiet}h1v1h-1z`)
    }
  }

  return (
    <svg
      className="qr"
      viewBox={`0 0 ${span} ${span}`}
      width={`${size}mm`}
      height={`${size}mm`}
      role="img"
      aria-label={value}
      shapeRendering="crispEdges"
    >
      <rect width={span} height={span} fill="#fff" />
      <path d={cells.join('')} fill="#000" />
    </svg>
  )
}
