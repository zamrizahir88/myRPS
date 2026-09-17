import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type Tone = 'good' | 'critical' | 'info'
interface Toast { id: number; tone: Tone; message: string }

const ToastContext = createContext<{ show: (message: string, tone?: Tone) => void } | null>(null)

/** Confirmations that do not shove the page around the way an inline alert does. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, tone: Tone = 'good') => {
    const id = Date.now() + Math.random()
    setToasts((list) => [...list, { id, tone, message }])
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 4000)
  }, [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-fade-up pointer-events-auto max-w-sm rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lift ${
              toast.tone === 'critical' ? 'tint-bad' : toast.tone === 'info' ? 'tint-info' : 'tint-good'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
