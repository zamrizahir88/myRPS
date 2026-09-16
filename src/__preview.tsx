import ReactDOM from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { Alert, Avatar, Field, Modal, StatTile } from './components/ui'
import ProgressBar from './components/ProgressBar'
import RadarChart from './components/RadarChart'
import { Logo, Wordmark } from './components/Brand'
import Footer from './components/Footer'
import './index.css'

/**
 * Every surface, tint, chip, button and state in one page, so the contrast
 * audit can walk all of them in both themes.
 */
const TINTS = ['tint-good', 'tint-warn', 'tint-bad', 'tint-info', 'tint-muted']
const scores = {
  linguistic: 31, logical: 26, musical: 14, kinesthetic: 22,
  spatial: 35, interpersonal: 19, intrapersonal: 28,
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MemoryRouter>
    <I18nProvider>
      <div className="mx-auto max-w-6xl space-y-5 p-4">
        <div className="flex items-center gap-3">
          <Logo /><Wordmark />
          <span className="chip bg-navy-700 text-white">RPS</span>
          <Avatar name="Mohd Zamri" size={36} />
        </div>

        <h1 className="h-page">Kitchen sink</h1>

        <div className="card space-y-2">
          <p className="text-sm">Body text on a card.</p>
          <p className="text-sm text-[color:var(--text-2)]">Secondary text.</p>
          <p className="text-xs text-[color:var(--text-3)]">Muted text.</p>
          <p className="section-title">Section title</p>
          <span className="label">Field label</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {TINTS.map((c) => <span key={c} className={`chip ${c}`}>{c}</span>)}
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary">Primary</button>
          <button className="btn-accent">Accent</button>
          <button className="btn-ghost">Ghost</button>
          <button className="btn-danger">Danger</button>
          <button className="btn-primary" disabled>Disabled</button>
        </div>

        <div className="space-y-2">
          <Alert tone="info">Info alert</Alert>
          <Alert tone="good">Good alert</Alert>
          <Alert tone="warning">Warning alert</Alert>
          <Alert tone="critical">Critical alert</Alert>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <StatTile label="CGPA" value="1.87" sub="AMIS is official" tone="critical" />
          <StatTile label="Pillars" value="5 / 7" tone="good" />
          <StatTile label="Meetings" value="3" tone="warning" />
          <StatTile label="Credits" value="94" sub="of 140" />
        </div>

        <div className="card space-y-3">
          <Field label="Email" hint="Use your student address"><input className="input" defaultValue="s221371666@studentmail.unimap.edu.my" /></Field>
          <Field label="Semester" required>
            <select className="input"><option>Semester 1</option></select>
          </Field>
          <textarea className="input" rows={2} defaultValue="Career goal text" />
        </div>

        <div className="card">
          <ProgressBar label="Credits" caption="94 / 140 · 67%" value={94} max={140} height={14} />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <ProgressBar label="Core" caption="72 / 106" value={72} max={106} height={6} />
            <ProgressBar label="Failing" caption="1.50" value={1.5} max={4} height={6} color="var(--status-critical)" />
          </div>
        </div>

        {/* the pillar tiles: the exact combination that broke */}
        <ul className="grid gap-2 sm:grid-cols-2">
          {[true, false].map((done, i) => (
            <li key={i}>
              <div className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left ${
                done ? 'border-status-good/40 tint-good' : 'border-[color:var(--border)] bg-[color:var(--surface)]'
              }`}>
                <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs ${
                  done ? 'border-[color:var(--check-bg)] bg-[color:var(--check-bg)] text-white' : 'border-[color:var(--border)]'
                }`}>{done ? '✓' : ''}</span>
                <span>
                  <span className="block text-sm font-medium">P{i + 1} · Kepimpinan &amp; Jati Diri</span>
                  <span className="block text-xs text-[color:var(--text-2)]">Program Jiwa Murni</span>
                  <span className={`chip mt-1 ${done ? 'tint-good' : 'tint-muted'}`}>
                    {done ? '✓ Disahkan RPS' : 'Menunggu pengesahan'}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="card flex justify-center"><RadarChart scores={scores} /></div>

        <Modal open onClose={() => {}} title="A modal">
          <p className="text-sm">Modal body text.</p>
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-ghost">Cancel</button>
            <button className="btn-primary">Save</button>
          </div>
        </Modal>
      </div>
      <Footer />
    </I18nProvider>
  </MemoryRouter>,
)
