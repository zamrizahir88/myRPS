import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Turns storage paths into short-lived signed URLs, in one round trip.
 *
 * The avatars bucket is private, so an <img src> cannot point at it directly —
 * every photo needs a signed link, and minting them one at a time would be a
 * request per face in the feed.
 */
export function useAvatarUrls(paths: (string | null | undefined)[]) {
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const key = [...new Set(paths.filter(Boolean) as string[])].sort().join('|')

  useEffect(() => {
    const wanted = key ? key.split('|') : []
    if (wanted.length === 0) {
      setUrls(new Map())
      return
    }
    let active = true
    void (async () => {
      const { data } = await supabase.storage.from('avatars').createSignedUrls(wanted, 3600)
      if (!active || !data) return
      const pairs: [string, string][] = []
      for (const d of data) {
        if (d.error || !d.signedUrl || !d.path) continue
        pairs.push([d.path, d.signedUrl])
      }
      setUrls(new Map(pairs))
    })()
    return () => { active = false }
  }, [key])

  return urls
}
