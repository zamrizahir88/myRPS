import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { useAcademic } from '../../hooks/useAcademic'
import { semesterLabel } from '../../lib/academic'
import { PILLARS } from '../../lib/pillars'
import { DEFINITIONS, INTELLIGENCE_KEYS } from '../../lib/intelligences'
import RadarChart from '../../components/RadarChart'
import ProgressBar from '../../components/ProgressBar'
import { Alert, Avatar, Spinner, StatTile } from '../../components/ui'
import type {
  IntelligenceKey, Meeting, PillarCompletion, Profile, PsychometricAttempt,
} from '../../lib/types'

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useI18n()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<PsychometricAttempt[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [pillars, setPillars] = useState<PillarCompletion[]>([])
  const [plans, setPlans] = useState<{ id: string; weakness: string; action: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const academic = useAcademic({
    userId: id,
    programmeCode: profile?.programme_code,
    intakeYear: profile?.intake_year,
  })

  async function load() {
    if (!id) return
    const [p, a, m, pc, ap] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('psychometric_attempts').select('*').eq('user_id', id).order('attempt_no', { ascending: false }),
      supabase.from('meetings').select('*').eq('user_id', id).order('meeting_at', { ascending: false }),
      supabase.from('pillar_completions').select('*').eq('user_id', id),
      supabase.from('action_plans').select('id, weakness, action').eq('user_id', id),
    ])
    setProfile((p.data as Profile) ?? null)
    setAttempts((a.data as PsychometricAttempt[]) ?? [])
    setMeetings((m.data as Meeting[]) ?? [])
    setPillars((pc.data as PillarCompletion[]) ?? [])
    setPlans(ap.data ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [id])

  useEffect(() => {
    if (!profile?.avatar_path) return
    void (async () => {
      const { data } = await supabase.storage.from('avatars').createSignedUrl(profile.avatar_path!, 3600)
      setAvatarUrl(data?.signedUrl ?? null)
    })()
  }, [profile?.avatar_path])

  if (loading) return <Spinner />
  if (!profile) return <Alert tone="critical">{t.common.error}</Alert>

  const latest = attempts[0]
  const scores = latest
    ? (Object.fromEntries(INTELLIGENCE_KEYS.map((k) => [k, latest[k]])) as Record<IntelligenceKey, number>)
    : null

  async function resetTest() {
    if (!window.confirm(t.admin.resetConfirm)) return
    const { error: err } = await supabase.rpc('admin_reset_psychometric', { target: id })
    if (err) setError(err.message)
    else setNotice(t.admin.resetDone)
  }

  async function toggleVerify(meeting: Meeting) {
    const { error: err } = await supabase.rpc('admin_verify_meeting', {
      meeting_id: meeting.id, value: !meeting.verified,
    })
    if (err) { setError(err.message); return }
    await load()
  }

  async function saveRpsNote(meeting: Meeting, note: string) {
    await supabase.from('meetings').update({ rps_notes: note }).eq('id', meeting.id)
    await load()
  }

  async function togglePillarVerify(p: PillarCompletion) {
    await supabase.from('pillar_completions').update({ verified: !p.verified }).eq('id', p.id)
    await load()
  }

  const field = (label: string, value: unknown) => (
    <div className="border-b border-[color:var(--border)] py-1.5">
      <dt className="text-xs text-[color:var(--text-3)]">{label}</dt>
      <dd className="text-sm">{value ? String(value) : t.common.none}</dd>
    </div>
  )

  return (
    <div className="space-y-5">
      <Link to="/admin" className="text-xs text-[color:var(--brand)] hover:underline">← {t.admin.back}</Link>
      {error && <Alert tone="critical">{error}</Alert>}
      {notice && <Alert tone="good">{notice}</Alert>}

      <div className="card flex flex-wrap items-center gap-4">
        <Avatar name={profile.full_name} url={avatarUrl} size={64} />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{profile.full_name ?? t.common.none}</h2>
          <p className="tnum text-sm text-[color:var(--text-2)]">
            {profile.matric_no} · {profile.programme_code} · {profile.intake_year}
          </p>
          {profile.career_goal && (
            <p className="mt-1 text-sm text-[color:var(--text-2)]">
              <span className="font-medium">{t.profile.career}:</span> {profile.career_goal}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile
          label={t.admin.credits}
          value={`${academic.progress.earned}/${academic.progress.required}`}
          sub={`${academic.progress.percent}%`}
        />
        <StatTile
          label={t.admin.cgpa}
          value={academic.gpa.gpa?.toFixed(2) ?? t.common.none}
          tone={academic.gpa.gpa !== null && academic.gpa.gpa < 2 ? 'critical' : 'default'}
        />
        <StatTile label={t.admin.pillars} value={`${pillars.length}/7`} />
        <StatTile
          label={t.admin.meetings}
          value={`${meetings.filter((m) => m.verified).length}/${meetings.length}`}
        />
      </div>

      <div className="card">
        <h3 className="section-title mb-3">{t.academic.byCategory}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {academic.progress.byCategory.map((c) => (
            <ProgressBar
              key={c.category} label={t.academic[c.category]}
              caption={`${c.earned} / ${c.required}`}
              value={c.earned} max={c.required} height={6}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="section-title">{t.psychometric.title}</h3>
            <button onClick={() => void resetTest()} className="btn-ghost px-3 py-1 text-xs">
              {t.admin.resetPsychometric}
            </button>
          </div>
          {scores && latest ? (
            <div className="flex flex-col items-center">
              <RadarChart scores={scores} size={280} />
              <p className="mt-2 text-sm">
                <span className="font-medium">{t.psychometric.strength}:</span>{' '}
                {locale === 'ms' ? DEFINITIONS[latest.strength].name_ms : DEFINITIONS[latest.strength].name_en}
                {' · '}
                <span className="font-medium">{t.psychometric.weakness}:</span>{' '}
                {locale === 'ms' ? DEFINITIONS[latest.weakness].name_ms : DEFINITIONS[latest.weakness].name_en}
              </p>
              {attempts.length > 1 && (
                <p className="mt-1 text-xs text-[color:var(--text-3)]">
                  {attempts.length} {locale === 'ms' ? 'percubaan' : 'attempts'}
                </p>
              )}
              {plans.length > 0 && (
                <ul className="mt-3 w-full space-y-1 text-sm">
                  {plans.map((p) => (
                    <li key={p.id} className="rounded bg-[color:var(--surface-2)] px-2 py-1.5">
                      <span className="font-medium">{p.weakness}:</span> {p.action}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <Alert tone="info">{t.dash.notTaken}</Alert>
          )}
        </div>

        <div className="card">
          <h3 className="section-title mb-3">{t.pillars.title}</h3>
          <ul className="space-y-1.5">
            {PILLARS.map((p, i) => {
              const done = pillars.find((c) => c.pillar_code === p.code)
              return (
                <li key={p.code} className="flex items-center justify-between gap-2 text-sm">
                  <span className={done ? '' : 'text-[color:var(--text-3)]'}>
                    P{i + 1} · {locale === 'ms' ? p.name_ms : p.name_en}
                    {done?.activity_name && (
                      <span className="block text-xs text-[color:var(--text-3)]">{done.activity_name}</span>
                    )}
                  </span>
                  {done ? (
                    <button
                      onClick={() => void togglePillarVerify(done)}
                      className={`chip ${done.verified ? 'bg-[#e9f7e9] text-[#046004]' : 'bg-[color:var(--surface-2)] text-[color:var(--text-2)]'}`}
                    >
                      {done.verified ? `✓ ${t.pillars.verifiedTag}` : t.admin.verifyMeeting}
                    </button>
                  ) : (
                    <span className="text-xs text-[color:var(--text-3)]">{t.pillars.notYet}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-3">{t.pillars.meetings}</h3>
        {meetings.length === 0 ? (
          <Alert tone="warning">{t.pillars.noMeetings}</Alert>
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
                  <button
                    onClick={() => void toggleVerify(m)}
                    className={`chip ${m.verified ? 'bg-[#e9f7e9] text-[#046004]' : 'bg-[color:var(--surface-2)] text-[color:var(--text-2)]'}`}
                  >
                    {m.verified ? `✓ ${t.pillars.verifiedTag}` : t.admin.verifyMeeting}
                  </button>
                </div>
                <p className="mt-1 text-sm">{m.topic}</p>
                <p className="text-xs text-[color:var(--text-3)]">{m.location}</p>
                {m.student_notes && <p className="mt-1 text-xs text-[color:var(--text-2)]">{m.student_notes}</p>}
                <textarea
                  className="input mt-2 text-xs" rows={2}
                  placeholder={t.admin.rpsNotes}
                  defaultValue={m.rps_notes ?? ''}
                  onBlur={(e) => void saveRpsNote(m, e.target.value)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3 className="section-title mb-3">{t.academic.title}</h3>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-xs text-[color:var(--text-3)]">
                <th className="px-2 py-2 font-medium">{t.academic.subject}</th>
                <th className="px-2 py-2 font-medium">{t.admin.credit}</th>
                <th className="px-2 py-2 font-medium">{t.academic.semester}</th>
                <th className="px-2 py-2 font-medium">{t.academic.grade}</th>
                <th className="px-2 py-2 font-medium">{t.academic.status}</th>
              </tr>
            </thead>
            <tbody>
              {academic.records.map((r) => {
                const s = academic.subjectMap.get(r.subject_id)
                return (
                  <tr key={r.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-2 py-2">
                      <span className="font-medium">{s?.code}</span>{' '}
                      <span className="text-[color:var(--text-2)]">{s?.name_en}</span>
                      {r.attempt_no > 1 && <span className="ml-1 text-xs text-[color:var(--text-3)]">#{r.attempt_no}</span>}
                    </td>
                    <td className="tnum px-2 py-2">{s?.credit}</td>
                    <td className="px-2 py-2 text-xs">{semesterLabel(r.semester_taken, locale)}</td>
                    <td className="tnum px-2 py-2">{r.grade ?? t.common.none}</td>
                    <td className={`px-2 py-2 ${r.state === 'fail' ? 'font-medium text-status-critical' : ''}`}>
                      {t.academic[r.state]}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <details className="card">
        <summary className="cursor-pointer text-sm font-medium">{t.profile.title}</summary>
        <dl className="mt-3 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {field(t.profile.ic, profile.ic_no)}
          {field(t.profile.dob, profile.date_of_birth)}
          {field(t.profile.gender, profile.gender)}
          {field(t.profile.race, profile.race)}
          {field(t.profile.religion, profile.religion)}
          {field(t.profile.income, profile.parental_income)}
          {field(t.profile.emailPersonal, profile.email_personal)}
          {field(t.profile.emailOfficial, profile.email_official)}
          {field(t.profile.phoneMobile, profile.phone_mobile)}
          {field(t.profile.phoneHome, profile.phone_home)}
          {field(t.profile.addressLine, profile.address_line)}
          {field(t.profile.city, profile.city)}
          {field(t.profile.state, profile.state)}
          {field(t.profile.hostel, profile.hostel_status)}
          {field(t.profile.kinName, profile.kin_name)}
          {field(t.profile.kinRelation, profile.kin_relation)}
          {field(t.profile.kinPhone, profile.kin_phone)}
          {field(t.profile.father, profile.father_occupation)}
          {field(t.profile.mother, profile.mother_occupation)}
          {field(t.profile.dependents, profile.dependents_count)}
          {field(t.profile.parentAddress, profile.parent_address)}
          {field(t.profile.muet, profile.muet_band)}
          {field(t.profile.entryType, profile.entry_type)}
          {field(t.profile.sponsorName, profile.sponsor_name)}
        </dl>
      </details>
    </div>
  )
}
