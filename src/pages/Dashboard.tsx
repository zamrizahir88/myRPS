import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RPS_NAME, supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { useAcademic } from '../hooks/useAcademic'
import ProgressBar from '../components/ProgressBar'
import { Alert, Spinner, StatTile } from '../components/ui'
import { PILLARS } from '../lib/pillars'
interface Announcement { id: string; body: string; created_at: string }

export default function Dashboard() {
  const { t, f, locale } = useI18n()
  const { profile, isAdmin } = useAuth()
  const academic = useAcademic({
    userId: profile?.id,
    programmeCode: profile?.programme_code,
    intakeYear: profile?.intake_year,
  })

  const [pillarsDone, setPillarsDone] = useState(0)
  const [meetings, setMeetings] = useState(0)
  const [hasTest, setHasTest] = useState<boolean | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  // If this account is the configured RPS address but has no admin rights,
  // say so plainly instead of silently showing a student dashboard.
  const [shouldBeAdmin, setShouldBeAdmin] = useState(false)
  // Read after sign-in rather than baked into the bundle, so the number is
  // not on a public page.
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const [p, m, ps, ann] = await Promise.all([
        supabase.from('pillar_completions').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
        supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
        supabase.from('psychometric_attempts').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
        supabase.from('posts').select('*').eq('kind', 'announcement')
          .is('deleted_at', null).order('created_at', { ascending: false }).limit(3),
      ])
      setPillarsDone(p.count ?? 0)
      setMeetings(m.count ?? 0)
      setHasTest((ps.count ?? 0) > 0)
      setAnnouncements((ann.data as Announcement[]) ?? [])

      const { data: settings } = await supabase
        .from('app_settings').select('key, value')
        .in('key', ['bootstrap_admin_email', 'rps_whatsapp'])
      const byKey = new Map(((settings as { key: string; value: string | null }[]) ?? [])
        .map((row) => [row.key, row.value ?? '']))
      setWhatsapp((byKey.get('rps_whatsapp') ?? '').replace(/\D/g, ''))
      const configured = (byKey.get('bootstrap_admin_email') ?? '').trim().toLowerCase()
      const mine = (profile.email_official ?? '').trim().toLowerCase()
      setShouldBeAdmin(!!configured && configured === mine)
    })()
  }, [profile?.id])

  if (academic.loading || hasTest === null) return <Spinner label={t.common.loading} />

  const firstName = (profile?.full_name ?? '').split(' ')[0] || '👋'
  const whatsappText = encodeURIComponent(
    f(t.dash.whatsappMessage, {
      name: profile?.full_name ?? '',
      matric: profile?.matric_no ?? '',
    }),
  )

  // One next step, not a checklist of everything undone.
  const nextStep = !profile?.profile_completed
    ? { label: t.dash.completeProfile, to: '/profile' }
    : academic.records.length === 0
      ? { label: t.dash.addSubjects, to: '/academic' }
      : !hasTest
        ? { label: t.dash.takeTest, to: '/psychometric' }
        : meetings === 0
          ? { label: t.dash.logMeeting, to: '/pillars' }
          : pillarsDone === 0
            ? { label: t.dash.tickPillar, to: '/pillars' }
            : null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{f(t.dash.welcome, { name: firstName })}</h1>
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${whatsappText}`}
            target="_blank" rel="noreferrer"
            className="btn-primary bg-[#1baf7a] hover:bg-[#199e70]"
            title={t.dash.whatsappHint}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2 .2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.1.1.3 0 .5l-.3.4-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l1.8.9c.2.1.4.2.5.3 0 .1 0 .7-.3 1.3Z" />
            </svg>
            {t.dash.whatsapp}
          </a>
        )}
      </div>

      {shouldBeAdmin && !isAdmin && (
        <Alert tone="warning">
          <span className="font-medium">{t.nav.notAdminTitle}.</span> {t.nav.notAdminBody}
        </Alert>
      )}

      {nextStep && (
        <Alert tone="info">
          <span className="font-medium">{t.dash.nextStep}:</span>{' '}
          <Link to={nextStep.to} className="underline underline-offset-2">{nextStep.label}</Link>
        </Alert>
      )}

      <div className="card">
        <ProgressBar
          label={t.dash.creditProgress}
          caption={`${academic.progress.earned} / ${academic.progress.required}  ·  ${academic.progress.percent}%`}
          value={academic.progress.earned}
          max={academic.progress.required}
          height={14}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {academic.progress.byCategory.map((c) => (
            <ProgressBar
              key={c.category}
              label={t.academic[c.category]}
              caption={`${c.earned} / ${c.required}`}
              value={c.earned}
              max={c.required}
              height={6}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t.academic.cgpa}
          value={academic.gpa.gpa?.toFixed(2) ?? t.common.none}
          sub={t.academic.cgpaHint}
          tone={academic.gpa.gpa !== null && academic.gpa.gpa < 2 ? 'critical' : 'default'}
        />
        <StatTile
          label={t.dash.pillarsProgress}
          value={`${pillarsDone} / ${PILLARS.length}`}
          sub={pillarsDone >= 7 ? t.community.pillarsMaster : undefined}
          tone={pillarsDone >= 7 ? 'good' : 'default'}
        />
        <StatTile label={t.dash.meetings} value={meetings} />
        <StatTile
          label={t.dash.psychometric}
          value={
            hasTest ? '✓' : <Link to="/psychometric" className="text-[color:var(--brand)] text-base underline">{t.dash.takeNow}</Link>
          }
          sub={hasTest ? undefined : t.dash.notTaken}
        />
      </div>

      {announcements.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-3">{t.dash.announcements}</h2>
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="border-l-2 border-[color:var(--brand)] pl-3 text-sm">
                <p className="whitespace-pre-wrap">{a.body}</p>
                <p className="mt-1 text-xs text-[color:var(--text-3)]">
                  {RPS_NAME} · {new Date(a.created_at).toLocaleDateString(locale === 'ms' ? 'ms-MY' : 'en-MY')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
