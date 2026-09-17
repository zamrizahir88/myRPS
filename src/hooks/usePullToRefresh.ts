import { useEffect, useRef, useState } from 'react'

/**
 * Pull down at the top of the page to reload. Phone users expect it; without
 * it the only way to refresh a feed is to leave and come back.
 */
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // The gesture outlives any single render: the distance pulled is state, and
  // state changes re-render. Holding the gesture in refs means the listeners
  // are attached once and keep their place mid-swipe — when they lived in the
  // effect body, the first millimetre of movement tore the effect down and the
  // rebuilt listeners no longer knew a finger was down, so the indicator stuck
  // open and the pull never completed. Same for onRefresh, which callers pass
  // as an inline arrow.
  const refreshRef = useRef(onRefresh)
  useEffect(() => { refreshRef.current = onRefresh })

  const startY = useRef(0)
  const active = useRef(false)
  const pulled = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    const THRESHOLD = 70

    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || busy.current) return
      startY.current = e.touches[0].clientY
      active.current = true
    }
    const onMove = (e: TouchEvent) => {
      if (!active.current || busy.current) return
      const delta = e.touches[0].clientY - startY.current
      // resist, so it does not track the finger one-to-one
      pulled.current = delta <= 0 ? 0 : Math.min(delta * 0.4, THRESHOLD + 20)
      setPull(pulled.current)
    }
    const onEnd = async () => {
      if (!active.current) return
      active.current = false
      const reached = pulled.current >= THRESHOLD
      pulled.current = 0
      if (reached && !busy.current) {
        busy.current = true
        setRefreshing(true)
        try { await refreshRef.current() } finally {
          busy.current = false
          setRefreshing(false)
        }
      }
      setPull(0)
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  return { pull, refreshing }
}
