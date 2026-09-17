import { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { I18nProvider } from './i18n'
import { Field, Modal } from './components/ui'
import './index.css'

/**
 * The exact shape every form sheet in the app uses: state in the parent, a
 * controlled input, and an inline arrow for onClose. Typing re-renders the
 * parent, which is where the sheet used to close itself. Driven by
 * scripts/check-modal.mjs.
 */
function Harness() {
  const [editing, setEditing] = useState<{ activity: string } | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  return (
    <div className="p-6">
      <button id="open" className="btn-primary" onClick={() => setEditing({ activity: '' })}>
        Open
      </button>
      <p id="saved">{saved ?? 'nothing saved'}</p>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Pillar completed">
        {editing && (
          <div className="space-y-3">
            <Field label="Activity">
              <input
                id="activity" className="input" value={editing.activity}
                onChange={(e) => setEditing({ ...editing, activity: e.target.value })}
              />
            </Field>
            <button id="save" className="btn-primary" onClick={() => { setSaved(editing.activity); setEditing(null) }}>
              Save
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <I18nProvider><Harness /></I18nProvider>,
)
