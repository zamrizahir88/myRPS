import { useEffect, useState } from 'react'

/**
 * Pull down at the top of the page to reload. Phone users expect it; without
 * it the only way to refresh a feed is to leave and come back.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const THRESHOLD = 70
    let startY = 0
    let active = false

    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return
      startY = e.touches[0].clientY
      active = true
    }
    const onMove = (e: TouchEvent) => {
      if (!active || refreshing) return
      const delta = e.touches[0].clientY - startY
      if (delta <= 0) { setPull(0); return }
      // resist, so it does not track the finger one-to-one
      setPull(Math.min(delta * 0.4, THRESHOLD + 20))
    }
    const onEnd = async () => {
      if (!active) return
      active = false
      if (pull >= THRESHOLD && !refreshing) {
        setRefreshing(true)
        try { await onRefresh() } finally { setRefreshing(false) }
      }
      setPull(0)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [pull, refreshing, onRefresh])

  return { pull, refreshing }
}
