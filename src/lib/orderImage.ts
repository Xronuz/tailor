import type { Order } from './types'

/**
 * Draws the workshop copy as a single PNG, matching the printed
 * TIKUVCHI NUSXASI: the same facts, the same measurement table, the same
 * tick-off rows, and the cloth and reference photos.
 *
 * Painted onto a canvas rather than screenshotting the DOM — the sheet is laid
 * out in millimetres for paper, and rasterising that would need a headless
 * renderer. This keeps the app dependency-free and stays sharp at any scale.
 */

export interface ImageLabels {
  shop: string
  kicker: string
  order: string
  customer: string
  phone: string
  garment: string
  garmentValue: string
  delivery: string
  source: string
  sourceValue: string
  fabric: string
  notes: string
  measurements: string
  unit: string
  material: string
  reference: string
}

const W = 900
const PAD = 44
const INK = '#000000'
const MUTED = '#444444'
const LINE = '#999999'
const PAPER = '#ffffff'
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const SERIF = '"Iowan Old Style", Palatino, Georgia, serif'

const ROW = 30
const PHOTO_H = 210

export async function renderOrderImage(
  order: Order,
  labels: ImageLabels,
  measures: [string, string][],
): Promise<Blob> {
  const facts: [string, string][] = [
    [labels.customer, order.customerName || '—'],
    [labels.order, order.id],
    [labels.phone, order.phone || '—'],
    [labels.garment, labels.garmentValue],
    [labels.delivery, order.deliveryDate ? formatDate(order.deliveryDate) : '—'],
    [labels.source, labels.sourceValue],
  ]

  const material = (order.materialPhotos ?? [])[0]
  const reference = (order.photos ?? [])[0]
  const shots = await Promise.all(
    [material, reference].map(async (photo) =>
      photo ? await createImageBitmap(photo.blob).catch(() => null) : null,
    ),
  )
  const hasShots = shots.some(Boolean)

  const factRows = Math.ceil(facts.length / 2)
  const measureRows = Math.ceil(measures.length / 2) || 1
  const height =
    PAD * 2 +
    76 + // header
    factRows * 28 +
    38 + // measurements heading
    measureRows * ROW +
    24 +
    2 * 34 + // tick rows
    (hasShots ? PHOTO_H + 46 : 0)

  const scale = Math.min(2, window.devicePixelRatio || 1)
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.scale(scale, scale)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, height)
  ctx.textBaseline = 'alphabetic'

  const right = W - PAD
  let y = PAD + 16

  // --- header
  ctx.fillStyle = INK
  ctx.font = `500 26px ${SERIF}`
  ctx.fillText(labels.shop, PAD, y)
  y += 18
  ctx.fillStyle = MUTED
  ctx.font = `600 12px ${SANS}`
  ctx.fillText(labels.kicker.toUpperCase(), PAD, y)

  y += 14
  rule(ctx, y, INK, 1.4)
  y += 24

  // --- facts, two per row, label left and value right on one line
  const colW = (right - PAD) / 2
  const factTop = y
  facts.forEach(([label, value], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = PAD + col * colW
    const lineY = factTop + row * 28
    const end = x + colW - (col === 0 ? 24 : 0)

    ctx.fillStyle = MUTED
    ctx.font = `600 10px ${SANS}`
    ctx.fillText(label.toUpperCase(), x, lineY)

    ctx.fillStyle = INK
    ctx.font = `700 14px ${SANS}`
    ctx.textAlign = 'right'
    ctx.fillText(value, end, lineY)
    ctx.textAlign = 'left'

    dotted(ctx, x, end, lineY + 6)
  })
  y = factTop + factRows * 28 + 14
  rule(ctx, y, INK, 1.4)

  // --- measurements
  y += 24
  ctx.fillStyle = MUTED
  ctx.font = `600 11px ${SANS}`
  ctx.fillText(`${labels.measurements.toUpperCase()} (${labels.unit})`, PAD, y)
  y += 20

  const mTop = y
  if (measures.length === 0) {
    ctx.fillStyle = INK
    ctx.font = `500 13px ${SANS}`
    ctx.fillText('—', PAD, mTop + 16)
  } else {
    measures.forEach(([label, value], i) => {
      const col = i < measureRows ? 0 : 1
      const row = i % measureRows
      const x = PAD + col * colW
      const boxW = colW - 16
      const top = mTop + row * ROW

      ctx.strokeStyle = INK
      ctx.lineWidth = 0.8
      ctx.strokeRect(x, top, boxW, ROW)
      ctx.beginPath()
      ctx.moveTo(x + boxW * 0.62, top)
      ctx.lineTo(x + boxW * 0.62, top + ROW)
      ctx.stroke()

      ctx.fillStyle = INK
      ctx.font = `500 12px ${SANS}`
      ctx.fillText(label, x + 6, top + 20)
      ctx.font = `700 14px ${SANS}`
      ctx.fillText(`${value} ${labels.unit}`, x + boxW * 0.62 + 6, top + 20)
    })
  }
  y = mTop + measureRows * ROW + 22

  // --- tick rows: fabric and the special request
  for (const [label, value] of [
    [labels.fabric, `MATO: ${order.fabric || '—'}`],
    [labels.notes, order.notes?.trim() || '—'],
  ] as [string, string][]) {
    ctx.strokeStyle = INK
    ctx.lineWidth = 0.8
    ctx.strokeRect(PAD, y, right - PAD, 30)
    ctx.strokeRect(PAD, y, 30, 30) // the box to tick

    ctx.fillStyle = MUTED
    ctx.font = `600 10px ${SANS}`
    ctx.fillText(label.toUpperCase(), PAD + 40, y + 19)

    ctx.fillStyle = INK
    ctx.font = `700 13px ${SANS}`
    ctx.fillText(clip(ctx, value, right - PAD - 190), PAD + 170, y + 19)
    y += 34
  }

  // --- the cloth and the reference shot
  if (hasShots) {
    y += 12
    const boxW = (right - PAD - 16) / 2
    const captions = [labels.material, labels.reference]
    shots.forEach((bitmap, i) => {
      const x = PAD + i * (boxW + 16)
      ctx.fillStyle = MUTED
      ctx.font = `600 10px ${SANS}`
      ctx.fillText(captions[i].toUpperCase(), x, y)

      ctx.strokeStyle = INK
      ctx.lineWidth = 0.8
      ctx.strokeRect(x, y + 8, boxW, PHOTO_H)

      if (!bitmap) {
        ctx.fillStyle = MUTED
        ctx.font = `500 13px ${SANS}`
        ctx.fillText('—', x + 8, y + 30)
        return
      }

      // contain, so nothing is cropped out of a reference photo
      const ratio = Math.min(boxW / bitmap.width, PHOTO_H / bitmap.height)
      const dw = bitmap.width * ratio
      const dh = bitmap.height * ratio
      ctx.drawImage(bitmap, x + (boxW - dw) / 2, y + 8 + (PHOTO_H - dh) / 2, dw, dh)
    })
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
      'image/png',
    )
  })
}

function rule(ctx: CanvasRenderingContext2D, y: number, color = LINE, width = 1) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(W - PAD, y)
  ctx.stroke()
}

function dotted(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.save()
  ctx.strokeStyle = LINE
  ctx.lineWidth = 0.6
  ctx.setLineDash([1, 3])
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x2, y)
  ctx.stroke()
  ctx.restore()
}

/** Canvas will happily draw past the page edge; cut the text instead. */
function clip(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut}…`
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
