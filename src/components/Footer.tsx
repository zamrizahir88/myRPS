import { useI18n } from '../i18n'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="mt-10 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 text-center">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
          {t.app.disclaimer}
        </p>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-2)' }}>
          © Copyright reserved. Developed by <span className="font-semibold">Zamm Studio</span>
          <br />
          Ts. Dr. Mohd Zamri Bin Zahir Ahmad
        </p>
      </div>
    </footer>
  )
}
