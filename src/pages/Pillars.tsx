import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { PILLARS } from '../lib/pillars'
import ProgressBar from '../components/ProgressBar'
import { Alert, Field, Modal } from '../components/ui'
import { SkeletonList } from '../components/Skeleton'
import EmptyState, { EmptyIcons } from '../components/EmptyState'
import { useToast } from '../components/Toast'
import type { Meeting, PillarCompletion } from '../lib/types'

export default function Pillars() {
  const { t, f, locale } = useI18n()
  const { profile } = useAuth()

  const [completions, setCompletions] = useState<PillarCompletion[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingPillar, setEditingPillar] = useState<{ code: string; activity: string; date: string } | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<Partial<Meeting> | null>(null)
  const { show } = useToast()

  async function load() {
    if (!profile?.id) return
    const [p, m] = await Promise.all([
      supabase.from('pillar_completions').select('*').eq('user_id', profile.id),
      supabase.from('meetings').select('*').eq('user_id', profile.id).order('meeting_at', { ascending: false }),
    ])
    setCompletions((p.data as PillarCompletion[]) ?? [])
    setMeetings((m.data as Meeting[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [profile?.id])

  if (loading) return <SkeletonList count={2} lines={4} />

  const doneMap = new Map(completions.map((c) => [c.pillar_code, c]))

  async function togglePillar(code: string) {
    const existing = doneMap.get(code)
    if (existing) {
      if (existing.verified) return
      await supabase.from('pillar_completions').delete().eq('id', existing.id)
      await load()
    } else {
      setEditingPillar({ code, activity: '', date: new Date().toISOString().slice(0, 10) })
    }
  }

  async function savePillar() {
    if (!editingPillar) return
    const { error: err } = await supabase.from('pillar_completions').insert({
      user_id: profile!.id,
      pillar_code: editingPillar.code,
      activity_name: editingPillar.activity || null,
      completed_on: editingPillar.date || null,
    })
    if (err) { setError(err.message); return }
    setEditingPillar(null)
    show(t.pillars.pillarSaved)
    await load()
  }

  async function saveMeeting() {
    if (!editingMeeting?.meeting_at || !editingMeeting.location || !editingMeeting.topic) return
    const payload = {
      user_id: profile!.id,
      meeting_at: new Date(editingMeeting.meeting_at).toISOString(),
      location: editingMeeting.location,
      topic: editingMeeting.topic,
      student_notes: editingMeeting.student_notes ?? null,
      created_by: profile!.id,
    }
    const { error: err } = editingMeeting.id
      ? await supabase.from('meetings').update(payload).eq('id', editingMeeting.id)
      : await supabase.from('meetings').insert(payload)
    if (err) { setError(err.message); return }
    setEditingMeeting(null)
    show(t.common.saved)
    await load()
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">{t.pillars.title}</h1>
      {error && <Alert tone="critical">{error}</Alert>}

      <div className="card">
        <ProgressBar
          label={t.pillars.title}
          caption={f(t.pillars.progress, { done: completions.length })}
          value={completions.length} max={PILLARS.length} height={10}
          color={completions.length >= 7 ? 'var(--status-good)' : 'var(--series-1)'}
        />
        <p className="mb-4 mt-2 text-xs text-[color:var(--text-3)]">{t.pillars.subtitle}</p>

        <ul className="grid gap-2 sm:grid-cols-2">
          {PILLARS.map((p, i) => {
            const done = doneMap.get(p.code)
            return (
              <li key={p.code}>
                <button
                  onClick={() => void togglePillar(p.code)}
                  disabled={done?.verified}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                    done ? 'border-status-good/40 tint-good' : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:bg-[color:var(--surface-2)]'
                  } disabled:cursor-not-allowed`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                      done ? 'border-status-good bg-status-good text-white' : 'border-baseline'
                    }`}
                    aria-hidden
                  >
                    {done ? '✓' : ''}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      P{i + 1} · {locale === 'ms' ? p.name_ms : p.name_en}
                    </span>
                    {done?.activity_name && (
                      <span className="block text-xs text-[color:var(--text-2)]">{done.activity_name}</span>
                    )}
                    {done && (
                      <span className={`chip mt-1 ${done.verified ? 'tint-good' : 'bg-[color:var(--surface-2)] text-[color:var(--text-2)]'}`}>
                        {done.verified ? `✓ ${t.pillars.verified}` : t.pillars.pendingVerify}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="card">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">{t.pillars.meetings}</h2>
          <button
            onClick={() => setEditingMeeting({ meeting_at: new Date().toISOString().slice(0, 16) })}
            className="btn-primary"
          >
            {t.pillars.addMeeting}
          </button>
        </div>
        <p className="mb-4 text-xs text-[color:var(--text-3)]">{t.pillars.meetingsHint}</p>

        {meetings.length === 0 ? (
          <EmptyState
            icon={EmptyIcons.people}
            title={t.pillars.noMeetingsTitle}
            body={t.pillars.noMeetings}
            actionLabel={t.pillars.addMeeting}
            onAction={() => setEditingMeeting({ meeting_at: new Date().toISOString().slice(0, 16) })}
          />
        ) : (
          <ul className="space-y-3">
            {meetings.map((m) => (
              <li key={m.id} className="rounded-lg border border-[color:var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {new Date(m.meeting_at).toLocaleString(locale === 'ms' ? 'ms-MY' : 'en-MY', {
                      dateStyle: 'medium', timeStyle: 'short',
                    })}
                  </span>
                  <span className={`chip ${m.verified ? 'tint-good' : 'bg-[color:var(--surface-2)] text-[color:var(--text-2)]'}`}>
                    {m.verified ? `✓ ${t.pillars.verifiedTag}` : t.pillars.unverifiedTag}
                  </span>
                </div>
                <p className="mt-1 text-sm">{m.topic}</p>
                <p className="text-xs text-[color:var(--text-3)]">{m.location}</p>
                {m.student_notes && <p className="mt-1 text-xs text-[color:var(--text-2)]">{m.student_notes}</p>}
                {m.rps_notes && (
                  <p className="mt-2 rounded bg-[color:var(--surface-2)] px-2 py-1.5 text-xs">
                    <span className="font-medium">RPS:</span> {m.rps_notes}
                  </p>
                )}
                {!m.verified && (
                  <button
                    onClick={() => setEditingMeeting({ ...m, meeting_at: m.meeting_at.slice(0, 16) })}
                    className="mt-2 text-xs text-[color:var(--brand)] hover:underline"
                  >
                    {t.common.edit}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!editingPillar} onClose={() => setEditingPillar(null)} title={t.pillars.completed}>
        {editingPillar && (
          <div className="space-y-3">
            <Field label={t.pillars.activity}>
              <input
                className="input" value={editingPillar.activity}
                onChange={(e) => setEditingPillar({ ...editingPillar, activity: e.target.value })}
              />
            </Field>
            <Field label={t.pillars.date}>
              <input
                className="input" type="date" value={editingPillar.date}
                onChange={(e) => setEditingPillar({ ...editingPillar, date: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingPillar(null)} className="btn-ghost">{t.common.cancel}</button>
              <button onClick={() => void savePillar()} className="btn-primary">{t.common.save}</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editingMeeting} onClose={() => setEditingMeeting(null)} title={t.pillars.addMeeting}>
        {editingMeeting && (
          <div className="space-y-3">
            <Field label={t.pillars.meetingDate}>
              <input
                className="input" type="datetime-local"
                value={editingMeeting.meeting_at ?? ''}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, meeting_at: e.target.value })}
              />
            </Field>
            <Field label={t.pillars.location}>
              <input
                className="input" value={editingMeeting.location ?? ''}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, location: e.target.value })}
              />
            </Field>
            <Field label={t.pillars.topic}>
              <textarea
                className="input" rows={3} value={editingMeeting.topic ?? ''}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, topic: e.target.value })}
              />
            </Field>
            <Field label={t.pillars.notes}>
              <textarea
                className="input" rows={2} value={editingMeeting.student_notes ?? ''}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, student_notes: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingMeeting(null)} className="btn-ghost">{t.common.cancel}</button>
              <button onClick={() => void saveMeeting()} className="btn-primary">{t.common.save}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
