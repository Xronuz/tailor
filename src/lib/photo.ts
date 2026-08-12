const MAX_EDGE = 1400
const QUALITY = 0.82

/**
 * Downscale a camera/gallery file to a print-sized JPEG before storing it.
 * Tablet cameras produce 4–8 MB files; the printed sheet never needs that.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Format the browser cannot decode (some HEIC, corrupt file) — store as-is
    // so the order is never lost; the sheet just may not render it.
    return file
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  )
  return blob ?? file
}

export function photoId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}
