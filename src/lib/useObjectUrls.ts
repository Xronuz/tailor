import { useEffect, useState } from 'react'
import type { OrderPhoto } from './types'

/** Object URLs for stored photo blobs, revoked when the set changes or unmounts. */
export function useObjectUrls(photos: OrderPhoto[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const photo of photos) next[photo.id] = URL.createObjectURL(photo.blob)
    setUrls(next)
    return () => {
      for (const url of Object.values(next)) URL.revokeObjectURL(url)
    }
  }, [photos])

  return urls
}
