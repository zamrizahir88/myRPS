import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { Avatar } from './ui'

/**
 * Everything that is not a destination: who you are, which role you are
 * viewing as, language, theme, and the way out.
 *
 * Sign out lived in a button hidden below the `sm` breakpoint, so on a phone
 * there was no way to sign out at all.
 */
export default function AvatarMenu() {
  const { t } = useI18n()
  const { theme, toggle: toggleTheme } = useTheme()
  const { profile, isAdmin, previewAsStudent, setPreviewAsStudent, signOut, avatarUrl } = useAuth()
  const { toggle: toggleLang } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-[color:var(--surface-2)]'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full p-0.5 transition hover:opacity-80"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.nav.account}
      >
        <Avatar name={profile?.full_name ?? null} url={avatarUrl} size={36} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
             style={{ color: 'var(--text-3)' }} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border shadow-lift"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="border-b px-3 py-3" style={{ borderColor: 'var(--border)' }}>
            <p className="truncate text-sm font-bold">{profile?.full_name ?? '—'}</p>
            <p className="truncate text-xs" style={{ color: 'var(--text-3)' }}>
              {isAdmin ? t.nav.roleRpsFull : profile?.matric_no ?? profile?.email_official}
            </p>
          </div>

          <div className="p-1.5">
            {isAdmin && (
              <button
                role="menuitem"
                className={item}
                onClick={() => {
                  setPreviewAsStudent(!previewAsStudent)
                  setOpen(false)
                  navigate('/')
                }}
              >
                <IconEye />
                {previewAsStudent ? t.nav.exitPreview : t.nav.previewAsStudent}
              </button>
            )}

            <button
              role="menuitem"
              className={item}
              onClick={() => { navigate('/profile'); setOpen(false) }}
            >
              <IconUser />
              {t.nav.profile}
            </button>

            <button role="menuitem" className={item} onClick={toggleLang}>
              <IconGlobe />
              {t.nav.language === 'BM' ? 'Tukar ke Bahasa Melayu' : 'Switch to English'}
            </button>

            <button role="menuitem" className={item} onClick={toggleTheme}>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
              {theme === 'dark' ? t.nav.themeLight : t.nav.themeDark}
            </button>
          </div>

          <div className="border-t p-1.5" style={{ borderColor: 'var(--border)' }}>
            <button
              role="menuitem"
              className={item}
              style={{ color: 'var(--danger-text)' }}
              onClick={() => void signOut()}
            >
              <IconExit />
              {t.nav.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
const IconEye = () => <svg {...s}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
const IconUser = () => <svg {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
const IconGlobe = () => <svg {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></svg>
const IconSun = () => <svg {...s}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
const IconMoon = () => <svg {...s}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
const IconExit = () => <svg {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
