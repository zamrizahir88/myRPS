import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { Alert, Field, Modal, Spinner } from '../../components/ui'
import type { Subject, SubjectCategory } from '../../lib/types'

const CATEGORIES: SubjectCategory[] = [
  'core', 'elective', 'common_core', 'university', 'cocurriculum', 'audit',
]

export default function Curriculum() {
  const { t, locale } = useI18n()
  const [intake, setIntake] = useState('2025')
  const [rows, setRows] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Subject> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('curriculum_subjects').select('*')
      .eq('intake_year', intake)
      .order('planned_semester').order('code')
    if (err) setError(err.message)
    setRows((data as Subject[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [intake])

  async function save() {
    if (!editing?.code || !editing.name_en) return
    const payload = {
      programme_code: editing.programme_code ?? 'UR6523007',
      intake_year: editing.intake_year ?? intake,
      code: editing.code,
      name_en: editing.name_en,
      name_ms: editing.name_ms || null,
      credit: editing.credit ?? 3,
      category: editing.category ?? 'core',
      planned_semester: editing.planned_semester ?? null,
      is_graded: editing.is_graded ?? true,
      counts_to_total: editing.counts_to_total ?? true,
    }
    const { error: err } = editing.id
      ? await supabase.from('curriculum_subjects').update(payload).eq('id', editing.id)
      : await supabase.from('curriculum_subjects').insert(payload)
    if (err) { setError(err.message); return }
    setEditing(null)
    await load()
  }

  async function remove(id: string) {
    if (!window.confirm(t.admin.deleteSubjectConfirm)) return
    const { error: err } = await supabase.from('curriculum_subjects').delete().eq('id', id)
    if (err) setError(err.message)
    await load()
  }

  const totals = rows.reduce<Record<string, number>>((acc, r) => {
    if (r.counts_to_total) acc[r.category] = (acc[r.category] ?? 0) + r.credit
    return acc
  }, {})

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      {error && <Alert tone="critical">{error}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        <select className="input max-w-[10rem]" value={intake} onChange={(e) => setIntake(e.target.value)}>
          <option value="2022">{t.admin.intake} 2022</option>
          <option value="2025">{t.admin.intake} 2025</option>
        </select>
        <button onClick={() => setEditing({ intake_year: intake, credit: 3, category: 'core' })} className="btn-primary ml-auto">
          {t.admin.addSubject}
        </button>
      </div>

      <Alert tone="info">
        {locale === 'ms'
          ? 'Semester yang dipaparkan adalah rekonstruksi daripada struktur kurikulum bercetak — sila semak dan betulkan jika perlu. Jumlah kredit setiap blok datang dari jadual keperluan, bukan daripada hasil tambah senarai ini.'
          : 'Planned semesters are reconstructed from the printed structure — verify and correct them where needed. Block totals come from the requirements table, not from summing this list.'}
      </Alert>

      <div className="card">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                <th className="px-2 py-2 font-medium">{t.admin.code}</th>
                <th className="px-2 py-2 font-medium">{t.admin.nameEn}</th>
                <th className="px-2 py-2 font-medium">{t.admin.credit}</th>
                <th className="px-2 py-2 font-medium">{t.admin.category}</th>
                <th className="px-2 py-2 font-medium">{t.admin.plannedSemester}</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-hairline/60 last:border-0">
                  <td className="px-2 py-2 font-medium">{r.code}</td>
                  <td className="px-2 py-2">
                    {r.name_en}
                    {!r.is_graded && <span className="ml-2 chip bg-surface-plane text-ink-secondary">Pass/Fail</span>}
                    {!r.counts_to_total && <span className="ml-2 chip bg-surface-plane text-ink-secondary">Audit</span>}
                  </td>
                  <td className="tnum px-2 py-2">{r.credit}</td>
                  <td className="px-2 py-2 text-xs">{t.academic[r.category]}</td>
                  <td className="tnum px-2 py-2">{r.planned_semester ?? '—'}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(r)} className="text-xs text-series-1 hover:underline">
                      {t.common.edit}
                    </button>
                    <button onClick={() => void remove(r.id)} className="ml-3 text-xs text-status-critical hover:underline">
                      {t.common.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-secondary">
          {CATEGORIES.filter((c) => totals[c]).map((c) => (
            <span key={c}>
              {t.academic[c]}: <span className="tnum font-medium">{totals[c]}</span>
            </span>
          ))}
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t.admin.editSubject : t.admin.addSubject}>
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.admin.code}>
                <input className="input" value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value })} />
              </Field>
              <Field label={t.admin.credit}>
                <input
                  className="input" type="number" min={0} max={20}
                  value={editing.credit ?? 3}
                  onChange={(e) => setEditing({ ...editing, credit: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label={t.admin.nameEn}>
              <input className="input" value={editing.name_en ?? ''} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} />
            </Field>
            <Field label={t.admin.nameMs}>
              <input className="input" value={editing.name_ms ?? ''} onChange={(e) => setEditing({ ...editing, name_ms: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.admin.category}>
                <select
                  className="input" value={editing.category ?? 'core'}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value as SubjectCategory })}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{t.academic[c]}</option>)}
                </select>
              </Field>
              <Field label={t.admin.plannedSemester}>
                <input
                  className="input" type="number" min={1} max={8}
                  value={editing.planned_semester ?? ''}
                  onChange={(e) => setEditing({
                    ...editing,
                    planned_semester: e.target.value === '' ? null : Number(e.target.value),
                  })}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox" checked={editing.is_graded ?? true}
                  onChange={(e) => setEditing({ ...editing, is_graded: e.target.checked })}
                />
                {t.admin.graded}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox" checked={editing.counts_to_total ?? true}
                  onChange={(e) => setEditing({ ...editing, counts_to_total: e.target.checked })}
                />
                {t.admin.countsTotal}
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="btn-ghost">{t.common.cancel}</button>
              <button onClick={() => void save()} className="btn-primary">{t.common.save}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
