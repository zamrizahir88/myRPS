import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { useAcademic } from '../hooks/useAcademic'
import { sessionOptions, termLabel } from '../lib/academic'
import ProgressBar from '../components/ProgressBar'
import { Alert, Field, Modal, Spinner, StatTile } from '../components/ui'
import type { RecordState, StudentRecord, StudentTerm, Subject } from '../lib/types'

const STATES: RecordState[] = ['active', 'pass', 'fail', 'exempted', 'planned']

const STATE_STYLE: Record<RecordState, string> = {
  pass: 'tint-good',
  fail: 'tint-bad',
  active: 'tint-warn',
  exempted: 'tint-info',
  planned: 'tint-muted',
}

type TermDraft = { study_year: number; semester: number; session: string }

export default function Academic() {
  const { t, locale } = useI18n()
  const { profile } = useAuth()
  const a = useAcademic({
    userId: profile?.id,
    programmeCode: profile?.programme_code,
    intakeYear: profile?.intake_year,
  })

  const [termDraft, setTermDraft] = useState<TermDraft | null>(null)
  const [recordDraft, setRecordDraft] = useState<Partial<StudentRecord> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const byTerm = useMemo(() => {
    const map = new Map<string, StudentRecord[]>()
    for (const r of a.records) {
      const key = r.term_id ?? 'untermed'
      map.set(key, [...(map.get(key) ?? []), r])
    }
    return map
  }, [a.records])

  const gpaByTerm = useMemo(
    () => new Map(a.termGpas.map((g) => [g.term.id, g.gpa])),
    [a.termGpas],
  )

  if (a.loading) return <Spinner label={t.common.loading} />
  if (!profile?.intake_year) return <Alert tone="warning">{t.profile.incomplete}</Alert>

  async function saveTerm() {
    if (!termDraft) return
    setBusy(true)
    const { error: err } = await supabase.from('student_terms').insert({
      user_id: profile!.id, ...termDraft,
    })
    setBusy(false)
    if (err) {
      setError(/duplicate|unique/i.test(err.message) ? t.academic.termExists : err.message)
      return
    }
    setTermDraft(null)
    await a.reload()
  }

  async function removeTerm(term: StudentTerm) {
    if (!window.confirm(t.academic.deleteTermConfirm)) return
    await supabase.from('student_terms').delete().eq('id', term.id)
    await a.reload()
  }

  async function saveRecord(rec: Partial<StudentRecord>) {
    setBusy(true)
    setError(null)
    const payload = {
      user_id: profile!.id,
      subject_id: rec.subject_id!,
      term_id: rec.term_id!,
      state: rec.state ?? 'active',
      grade: rec.grade || null,
    }
    const { error: err } = rec.id
      ? await supabase.from('student_records').update(payload).eq('id', rec.id)
      : await supabase.from('student_records').insert(payload)
    setBusy(false)
    if (err) {
      setError(/duplicate|unique/i.test(err.message) ? t.academic.alreadyInTerm : err.message)
      return
    }
    setRecordDraft(null)
    await a.reload()
  }

  async function removeRecord(id: string) {
    await supabase.from('student_records').delete().eq('id', id)
    await a.reload()
  }

  const nextTermDefault = (): TermDraft => {
    const latest = a.terms[0]
    if (!latest) return { study_year: 1, semester: 1, session: sessionOptions()[0] }
    if (latest.semester === 1) return { ...latest, semester: 2 }
    const [from, to] = latest.session.split('/').map(Number)
    return {
      study_year: Math.min(latest.study_year + 1, 8),
      semester: 1,
      session: `${from + 1}/${to + 1}`,
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h-page">{t.academic.title}</h1>
        <button onClick={() => setTermDraft(nextTermDefault())} className="btn-primary">
          + {t.academic.newTerm}
        </button>
      </div>

      {error && <Alert tone="critical">{error}</Alert>}

      <div className="card">
        <ProgressBar
          label={t.academic.creditsEarned}
          caption={`${a.progress.earned} / ${a.progress.required} · ${a.progress.percent}%`}
          value={a.progress.earned} max={a.progress.required} height={14}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {a.progress.byCategory.map((c) => (
            <ProgressBar
              key={c.category} label={t.academic[c.category]}
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
          label={t.academic.currentTerm}
          value={a.terms[0] ? `Y${a.terms[0].study_year} · S${a.terms[0].semester}` : t.common.none}
          sub={a.terms[0]?.session}
        />
      </div>

      {a.termGpas.length > 1 && (
        <div className="card">
          <h2 className="section-title mb-3">{t.academic.semesterTrend}</h2>
          <div className="space-y-2.5">
            {a.termGpas.map((g) => (
              <ProgressBar
                key={g.term.id}
                label={termLabel(g.term, locale)}
                caption={g.gpa!.toFixed(2)}
                value={g.gpa!} max={4} height={6}
                color={g.gpa! < 2 ? 'var(--status-critical)' : 'var(--brand)'}
              />
            ))}
          </div>
        </div>
      )}

      {a.terms.length === 0 && (
        <div className="card text-center">
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>{t.academic.noTerms}</p>
          <button onClick={() => setTermDraft(nextTermDefault())} className="btn-primary mt-3">
            + {t.academic.newTerm}
          </button>
        </div>
      )}

      {a.terms.map((term) => {
        const records = byTerm.get(term.id) ?? []
        const gpa = gpaByTerm.get(term.id)
        return (
          <section key={term.id} className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-extrabold tracking-tight">
                  {termLabel(term, locale)}
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {records.length} {t.academic.subjectsCount}
                  {gpa != null && <> · {t.academic.termGpa} <span className="tnum font-semibold">{gpa.toFixed(2)}</span></>}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRecordDraft({ term_id: term.id, state: 'active' })}
                  className="btn-ghost px-3 py-1.5 text-xs"
                >
                  + {t.academic.addSubject}
                </button>
                <button
                  onClick={() => void removeTerm(term)}
                  className="px-2 py-1.5 text-xs"
                  style={{ color: 'var(--status-critical)' }}
                >
                  {t.common.delete}
                </button>
              </div>
            </div>

            {records.length === 0 ? (
              <p className="py-3 text-sm" style={{ color: 'var(--text-3)' }}>{t.academic.noSubjectsInTerm}</p>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {records.map((r) => {
                  const s = a.subjectMap.get(r.subject_id)
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                      <span className="tnum font-semibold">{s?.code}</span>
                      <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--text-2)' }}>
                        {locale === 'ms' ? s?.name_ms ?? s?.name_en : s?.name_en}
                      </span>
                      <span className="tnum text-xs" style={{ color: 'var(--text-3)' }}>
                        {s?.credit} {t.academic.creditsShort}
                      </span>
                      {r.grade && <span className="chip bg-[color:var(--surface-2)] tnum">{r.grade}</span>}
                      <span className={`chip ${STATE_STYLE[r.state]}`}>{t.academic[r.state]}</span>
                      <button
                        onClick={() => setRecordDraft(r)}
                        className="text-xs font-semibold"
                        style={{ color: 'var(--brand)' }}
                      >
                        {t.common.edit}
                      </button>
                      <button
                        onClick={() => void removeRecord(r.id)}
                        className="text-xs"
                        style={{ color: 'var(--status-critical)' }}
                      >
                        {t.academic.deleteRecord}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}

      {/* ---- new term ---- */}
      <Modal open={!!termDraft} onClose={() => setTermDraft(null)} title={t.academic.newTerm}>
        {termDraft && (
          <div className="space-y-3">
            <Field label={t.academic.session} hint={t.academic.sessionHint}>
              <select
                className="input" value={termDraft.session}
                onChange={(e) => setTermDraft({ ...termDraft, session: e.target.value })}
              >
                {sessionOptions().map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.academic.studyYear}>
                <select
                  className="input" value={termDraft.study_year}
                  onChange={(e) => setTermDraft({ ...termDraft, study_year: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => (
                    <option key={y} value={y}>{locale === 'ms' ? `Tahun ${y}` : `Year ${y}`}</option>
                  ))}
                </select>
              </Field>
              <Field
                label={t.academic.semesterNo}
                hint={termDraft.semester === 3 ? t.academic.tambahanHint : undefined}
              >
                <select
                  className="input" value={termDraft.semester}
                  onChange={(e) => setTermDraft({ ...termDraft, semester: Number(e.target.value) })}
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                  {/* sits after Semester 2 in the same session — the long break */}
                  <option value={3}>{locale === 'ms' ? 'Semester Tambahan' : 'Special Semester'}</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setTermDraft(null)} className="btn-ghost">{t.common.cancel}</button>
              <button onClick={() => void saveTerm()} disabled={busy} className="btn-primary">
                {t.common.save}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---- add / edit a subject in a term ---- */}
      <Modal
        open={!!recordDraft}
        onClose={() => setRecordDraft(null)}
        title={recordDraft?.id ? t.common.edit : t.academic.addSubject}
      >
        {recordDraft && (
          <div className="space-y-3">
            <Field label={t.academic.subject} hint={t.academic.anySubjectHint}>
              <select
                className="input"
                value={recordDraft.subject_id ?? ''}
                onChange={(e) => setRecordDraft({ ...recordDraft, subject_id: e.target.value })}
              >
                <option value="">{t.common.notSet}</option>
                {a.subjects.map((s: Subject) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {locale === 'ms' ? s.name_ms ?? s.name_en : s.name_en} ({s.credit})
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.academic.status}>
                <select
                  className="input" value={recordDraft.state ?? 'active'}
                  onChange={(e) => setRecordDraft({ ...recordDraft, state: e.target.value as RecordState })}
                >
                  {STATES.map((s) => <option key={s} value={s}>{t.academic[s]}</option>)}
                </select>
              </Field>
              <Field label={t.academic.grade} hint={t.academic.gradeHint}>
                <select
                  className="input" value={recordDraft.grade ?? ''}
                  onChange={(e) => setRecordDraft({ ...recordDraft, grade: e.target.value || null })}
                  disabled={
                    recordDraft.subject_id
                      ? a.subjectMap.get(recordDraft.subject_id)?.is_graded === false
                      : false
                  }
                >
                  <option value="">{t.common.none}</option>
                  {a.grades.map((g) => (
                    <option key={g.grade} value={g.grade}>{g.grade} ({g.points.toFixed(2)})</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setRecordDraft(null)} className="btn-ghost">{t.common.cancel}</button>
              <button
                onClick={() => void saveRecord(recordDraft)}
                disabled={!recordDraft.subject_id || busy}
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
