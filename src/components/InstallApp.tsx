import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { Modal } from './ui'

const DISMISS_KEY = 'myrps.installDismissed'

/**
 * Starts the install: the browser's own prompt where there is one, otherwise
 * the steps for doing it by hand. Returns the sheet to render alongside —
 * somewhere that outlives the tap, not inside a menu that closes on it.
 */
export function useInstall() {
  const { t } = useI18n()
  const { canInstall, isIos, installed, install } = useInstallPrompt()
  const [helpOpen, setHelpOpen] = useState(false)

  const start = () => {
    if (canInstall) void install()
    else setHelpOpen(true)
  }

  const steps = isIos ? t.install.iosSteps : t.install.otherSteps
  // A portal: the menu lives in the header, whose backdrop blur would
  // otherwise become the box a "fixed" sheet is positioned in.
  const help = createPortal(
    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title={t.install.helpTitle}>
      <ol className="space-y-2.5 text-sm">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tint-info">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      <button onClick={() => setHelpOpen(false)} className="btn-primary mt-5 w-full">{t.install.done}</button>
    </Modal>,
    document.body,
  )

  return { installed, start, help }
}


/**
 * A nudge on the feed, phones only. Dismissing it is permanent — the avatar
 * menu is where the option lives from then on.
 */
export function InstallBanner() {
  const { t } = useI18n()
  const { installed, start, help } = useInstall()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // blocked storage — it will simply offer again next visit
    }
  }

  // The sheet stays mounted after "Install" is tapped, so it can still open.
  if (installed) return null
  return (
    <>
      {!dismissed && (
        <div className="card flex items-center gap-3 md:hidden">
          <img src="icon-192.png" alt="" width={44} height={44} className="shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">{t.install.bannerTitle}</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-2)' }}>{t.install.bannerBody}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={start} className="btn-primary px-3 py-1.5 text-xs">{t.install.action}</button>
              <button onClick={dismiss} className="btn-ghost px-3 py-1.5 text-xs">{t.install.later}</button>
            </div>
          </div>
        </div>
      )}
      {help}
    </>
  )
}
