import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { useAcademic } from '../hooks/useAcademic'
import { projectedGpa, semesterLabel, semesterOptions } from '../lib/academic'
import ProgressBar from '../components/ProgressBar'
import { Alert, Field, Modal, Spinner, StatTile } from '../components/ui'
import type { RecordState, StudentRecord, Subject } from '../lib/types'

const STATES: RecordState[] = ['pass', 'fail', 'active', 'exempted', 'planned']

const STATE_STYLE: Record<RecordState, string> = {
  pass: 'bg-[#e9f7e9] text-[#046004]',
  fail: 'bg-[#fdecec] text-[#8f2727]',
  active: 'bg-[#fdf4e0] text-[#7a5600]',
  exempted: 'bg-[#eef4fd] text-[#184f95]',
  planned: 'bg-[color:var(--surface-2)] text-[color:var(--text-2)]',
}

export default function Academic() {
  const { t, locale } = useI18n()
  const { profile } = useAuth()
  const a = useAcademic({
    userId: profile?.id,
    programmeCode: profile?.programme_code,
    intakeYear: profile?.intake_year,
  })

  const [editing, setEditing] = useState<Partial<StudentRecord> | null>(null)
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const recordsBySubject = useMemo(() => {
    const map = new Map<string, StudentRecord[]>()
    for (const r of a.records) {
      const list = map.get(r.subject_id) ?? []
      list.push(r)
      map.set(r.subject_id, list)
    }
    for (const list of map.values()) list.sort((x, y) => x.attempt_no - y.attempt_no)
    return map
  }, [a.records])

  const activeSubjects = useMemo(
    () => a.records.filter((r) => r.state === 'active').map((r) => a.subjectMap.get(r.subject_id)).filter(Boolean) as Subject[],
    [a.records, a.subjectMap],
  )

  const projection = useMemo(
    () => projectedGpa(
      activeSubjects
        .filter((s) => targets[s.id])
        .map((s) => ({ subject_id: s.id, target_grade: targets[s.id] })),
      a.subjectMap,
      a.gradeMap,
    ),
    [activeSubjects, targets, a.subjectMap, a.gradeMap],
  )

  if (a.loading) return <Spinner label={t.common.loading} />
  if (!profile?.intake_year) {
    return <Alert tone="warning">{t.profile.incomplete}</Alert>
  }

  async function saveRecord(rec: Partial<StudentRecord>) {
    setError(null)
    const payload = {
      user_id: profile!.id,
      subject_id: rec.subject_id!,
      attempt_no: rec.attempt_no ?? 1,
      state: rec.state ?? 'planned',
      grade: rec.grade || null,
      semester_taken: rec.semester_taken || null,
    }
    const { error: err } = rec.id
      ? await supabase.from('student_records').update(payload).eq('id', rec.id)
      : await supabase.from('student_records').insert(payload)
    if (err) { setError(err.message); return }
    setEditing(null)
    await a.reload()
  }

  async function removeRecord(id: string) {
    await supabase.from('student_records').delete().eq('id', id)
    await a.reload()
  }

  const bySemester = new Map<number, Subject[]>()
  for (const s of a.subjects) {
    const key = s.planned_semester ?? 0
    bySemester.set(key, [...(bySemester.get(key) ?? []), s])
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">{t.academic.title}</h1>
      {error && <Alert tone="critical">{error}</Alert>}

      <div className="card">
        <ProgressBar
          label={t.academic.creditsEarned}
          caption={`${a.progress.earned} / ${a.progress.required} · ${a.progress.percent}%`}
          value={a.progress.earned}
          max={a.progress.required}
          height={14}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {a.progress.byCategory.map((c) => (
            <ProgressBar
              key={c.category}
              label={t.academic[c.category]}
              caption={`${c.earned} / ${c.required}`}
              value={c.earned} max={c.required} height={6}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label={t.academic.cgpa}
          value={a.gpa.gpa?.toFixed(2) ?? t.common.none}
          sub={t.academic.cgpaHint}
          tone={a.gpa.gpa !== null && a.gpa.gpa < 2 ? 'critical' : 'default'}
        />
        <StatTile label={t.academic.creditsEarned} value={a.progress.earned} sub={`${t.common.of} ${a.progress.required}`} />
        <StatTile
          label={t.academic.projected}
          value={projection.gpa?.toFixed(2) ?? t.common.none}
          sub={t.academic.targetTitle}
        />
      </div>

      {a.semesterGpas.length > 1 && (
        <div className="card">
          <h2 className="section-title mb-3">{t.academic.semesterTrend}</h2>
          <div className="space-y-2">
            {a.semesterGpas.map((s) => (
              <ProgressBar
                key={s.semester}
                label={semesterLabel(s.semester, locale)}
                caption={s.gpa!.toFixed(2)}
                value={s.gpa!} max={4} height={6}
                color={s.gpa! < 2 ? 'var(--status-critical)' : 'var(--series-1)'}
              />
            ))}
          </div>
        </div>
      )}

      {activeSubjects.length > 0 && (
        <div className="card">
          <h2 className="section-title">{t.academic.targetTitle}</h2>
          <p className="mb-3 mt-1 text-xs text-[color:var(--text-3)]">{t.academic.targetHint}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSubjects.map((s) => (
              <Field key={s.id} label={`${s.code} · ${locale === 'ms' ? s.name_ms ?? s.name_en : s.name_en}`}>
                <select
                  className="input"
                  value={targets[s.id] ?? ''}
                  onChange={(e) => setTargets((prev) => ({ ...prev, [s.id]: e.target.value }))}
                >
                  <option value="">{t.common.notSet}</option>
                  {a.grades.map((g) => (
                    <option key={g.grade} value={g.grade}>{g.grade} ({g.points.toFixed(2)})</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="section-title">{t.academic.subject}</h2>
        <button onClick={() => setEditing({ attempt_no: 1, state: 'pass' })} className="btn-primary">
          {t.academic.addSubject}
        </button>
      </div>

      {a.records.length === 0 && <Alert tone="info">{t.academic.noRecords}</Alert>}

      <div className="space-y-4">
        {[...bySemester.entries()].sort((x, y) => x[0] - y[0]).map(([sem, subs]) => {
          const taken = subs.filter((s) => recordsBySubject.has(s.id))
          if (taken.length === 0) return null
          return (
            <div key={sem} className="card">
              <h3 className="mb-3 text-sm font-semibold text-[color:var(--text-2)]">
                {locale === 'ms' ? `Semester ${sem}` : `Semester ${sem}`}
              </h3>
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--border)] text-left text-xs text-[color:var(--text-3)]">
                      <th className="px-2 py-2 font-medium">{t.academic.subject}</th>
                      <th className="px-2 py-2 font-medium">{t.admin.credit}</th>
                      <th className="px-2 py-2 font-medium">{t.academic.semester}</th>
                      <th className="px-2 py-2 font-medium">{t.academic.grade}</th>
                      <th className="px-2 py-2 font-medium">{t.academic.status}</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {taken.flatMap((s) =>
                      (recordsBySubject.get(s.id) ?? []).map((r) => (
                        <tr key={r.id} className="border-b border-[color:var(--border)] last:border-0">
                          <td className="px-2 py-2">
                            <span className="font-medium">{s.code}</span>
                            <span className="ml-2 text-[color:var(--text-2)]">
                              {locale === 'ms' ? s.name_ms ?? s.name_en : s.name_en}
                            </span>
                            {r.attempt_no > 1 && (
                              <span className="ml-2 text-xs text-[color:var(--text-3)]">
                                ({t.academic.repeat} {r.attempt_no})
                              </span>
                            )}
                          </td>
                          <td className="tnum px-2 py-2">{s.credit}</td>
                          <td className="px-2 py-2 text-xs">{semesterLabel(r.semester_taken, locale)}</td>
                          <td className="tnum px-2 py-2">{r.grade ?? t.common.none}</td>
                          <td className="px-2 py-2">
                            <span className={`chip ${STATE_STYLE[r.state]}`}>{t.academic[r.state]}</span>
                          </td>
                          <td className="px-2 py-2 text-right whitespace-nowrap">
                            <button onClick={() => setEditing(r)} className="text-xs text-[color:var(--brand)] hover:underline">
                              {t.common.edit}
                            </button>
                            <button
                              onClick={() => void removeRecord(r.id)}
                              className="ml-3 text-xs text-status-critical hover:underline"
                            >
                              {t.academic.deleteRecord}
                            </button>
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={t.academic.addSubject}>
        {editing && (
          <div className="space-y-3">
            <Field label={t.academic.subject}>
              <select
                className="input"
                value={editing.subject_id ?? ''}
                onChange={(e) => setEditing({ ...editing, subject_id: e.target.value })}
              >
                <option value="">{t.common.notSet}</option>
                {a.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {locale === 'ms' ? s.name_ms ?? s.name_en : s.name_en} ({s.credit})
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={t.academic.status}>
                <select
                  className="input"
                  value={editing.state ?? 'pass'}
                  onChange={(e) => setEditing({ ...editing, state: e.target.value as RecordState })}
                >
                  {STATES.map((s) => <option key={s} value={s}>{t.academic[s]}</option>)}
                </select>
              </Field>
              <Field label={t.academic.attempt}>
                <input
                  className="input" type="number" min={1} max={6}
                  value={editing.attempt_no ?? 1}
                  onChange={(e) => setEditing({ ...editing, attempt_no: Number(e.target.value) })}
                />
              </Field>
              <Field label={t.academic.grade}>
                <select
                  className="input"
                  value={editing.grade ?? ''}
                  onChange={(e) => setEditing({ ...editing, grade: e.target.value || null })}
                  disabled={editing.subject_id ? a.subjectMap.get(editing.subject_id)?.is_graded === false : false}
                >
                  <option value="">{t.common.none}</option>
                  {a.grades.map((g) => (
                    <option key={g.grade} value={g.grade}>{g.grade} ({g.points.toFixed(2)})</option>
                  ))}
                </select>
              </Field>
              <Field label={t.academic.semester}>
                <select
                  className="input"
                  value={editing.semester_taken ?? ''}
                  onChange={(e) => setEditing({ ...editing, semester_taken: e.target.value || null })}
                >
                  <option value="">{t.common.notSet}</option>
                  {semesterOptions().map((s) => (
                    <option key={s} value={s}>{semesterLabel(s, locale)}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="btn-ghost">{t.common.cancel}</button>
              <button
                onClick={() => void saveRecord(editing)}
                disabled={!editing.subject_id}
                className="btn-primary"
              >
                {t.common.save}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
