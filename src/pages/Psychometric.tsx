import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import {
  DEFINITIONS, INTELLIGENCE_KEYS, MAX_SCORE_PER_INTELLIGENCE,
  scoreResponses, strengthAndWeakness,
} from '../lib/intelligences'
import RadarChart from '../components/RadarChart'
import ProgressBar from '../components/ProgressBar'
import { Alert, Spinner } from '../components/ui'
import type { IntelligenceKey, PsychometricAttempt, PsychometricItem } from '../lib/types'

export default function Psychometric() {
  const { t, f, locale } = useI18n()
  const { profile } = useAuth()

  const [items, setItems] = useState<PsychometricItem[]>([])
  const [latest, setLatest] = useState<PsychometricAttempt | null>(null)
  const [canTake, setCanTake] = useState(false)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [responses, setResponses] = useState<Record<number, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [plans, setPlans] = useState<{ id: string; weakness: string; action: string }[]>([])
  const [newAction, setNewAction] = useState('')

  useEffect(() => {
    if (!profile?.id) return
    void (async () => {
      const [it, att, can, ap] = await Promise.all([
        supabase.from('psychometric_items').select('*').eq('is_active', true).order('question_no'),
        supabase.from('psychometric_attempts').select('*').eq('user_id', profile.id)
          .order('attempt_no', { ascending: false }).limit(1).maybeSingle(),
        supabase.rpc('can_take_psychometric'),
        supabase.from('action_plans').select('id, weakness, action').eq('user_id', profile.id),
      ])
      setItems((it.data as PsychometricItem[]) ?? [])
      setLatest((att.data as PsychometricAttempt) ?? null)
      setCanTake(can.data === true)
      setPlans(ap.data ?? [])
      setLoading(false)
    })()
  }, [profile?.id])

  const answered = Object.keys(responses).length

  const scores = useMemo(() => {
    if (!latest) return null
    return Object.fromEntries(
      INTELLIGENCE_KEYS.map((k) => [k, latest[k]]),
    ) as Record<IntelligenceKey, number>
  }, [latest])

  if (loading) return <Spinner label={t.common.loading} />

  async function submit() {
    if (answered < items.length) { setError(t.psychometric.incomplete); return }
    setBusy(true)
    setError(null)

    const totals = scoreResponses(responses, items)
    const { strength, weakness } = strengthAndWeakness(totals)
    const nextAttempt = (latest?.attempt_no ?? 0) + 1

    const { data, error: err } = await supabase
      .from('psychometric_attempts')
      .insert({
        user_id: profile!.id,
        attempt_no: nextAttempt,
        responses,
        ...totals,
        strength,
        weakness,
      })
      .select()
      .single()

    setBusy(false)
    if (err) { setError(err.message); return }
    setLatest(data as PsychometricAttempt)
    setCanTake(false)
    setStarted(false)
  }

  async function addPlan() {
    if (!newAction.trim() || !latest) return
    const { data } = await supabase
      .from('action_plans')
      .insert({
        user_id: profile!.id,
        weakness: locale === 'ms'
          ? DEFINITIONS[latest.weakness].name_ms
          : DEFINITIONS[latest.weakness].name_en,
        action: newAction.trim(),
      })
      .select('id, weakness, action')
      .single()
    if (data) { setPlans((p) => [...p, data]); setNewAction('') }
  }

  // ---- taking the test ----
  if (started) {
    return (
      <div className="space-y-4">
        <div className="sticky top-[104px] z-30 -mx-4 border-b border-hairline bg-surface-plane/95 px-4 py-3 backdrop-blur">
          <ProgressBar
            label={t.psychometric.title}
            caption={f(t.psychometric.progress, { done: answered, total: items.length })}
            value={answered} max={items.length} height={6}
          />
        </div>
        {error && <Alert tone="critical">{error}</Alert>}

        <ol className="space-y-3">
          {items.map((item) => (
            <li key={item.question_no} className="card">
              <p className="mb-3 text-sm">
                <span className="tnum mr-2 text-ink-muted">{item.question_no}.</span>
                {locale === 'ms' ? item.text_ms ?? item.text_en : item.text_en}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setResponses((r) => ({ ...r, [item.question_no]: v }))}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      responses[item.question_no] === v
                        ? 'border-series-1 bg-series-1 text-white'
                        : 'border-hairline bg-white text-ink-secondary hover:bg-surface-plane'
                    }`}
                  >
                    <span className="block text-sm">{v}</span>
                    <span className="mt-0.5 block leading-tight opacity-80">
                      {t.psychometric[`scale${v}` as 'scale1']}
                    </span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <div className="sticky bottom-0 -mx-4 border-t border-hairline bg-white px-4 py-3">
          <button onClick={() => void submit()} disabled={busy || answered < items.length} className="btn-primary w-full">
            {busy ? t.common.loading : t.psychometric.submit}
          </button>
        </div>
      </div>
    )
  }

  // ---- result ----
  if (latest && scores) {
    const strength = DEFINITIONS[latest.strength]
    const weakness = DEFINITIONS[latest.weakness]
    const ranked = [...INTELLIGENCE_KEYS].sort((x, y) => scores[y] - scores[x])

    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold">{t.psychometric.yourProfile}</h1>
        {canTake && <Alert tone="good">{t.psychometric.retake}</Alert>}

        {/* Persona card */}
        <div
          className="animate-card-rise overflow-hidden rounded-xl border border-hairline bg-white"
          style={{ borderTop: `4px solid ${strength.accent}` }}
        >
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
            <PersonaMark intelligence={latest.strength} score={scores[latest.strength]} />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: strength.accent }}>
                {t.psychometric.strength}
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                {locale === 'ms' ? strength.title_ms : strength.title_en}
              </h2>
              <p className="text-sm text-ink-secondary">
                {locale === 'ms' ? strength.name_ms : strength.name_en} ·{' '}
                <span className="tnum">{scores[latest.strength]}/{MAX_SCORE_PER_INTELLIGENCE}</span>
              </p>
              <p className="mt-3 text-sm text-ink-secondary">
                <span className="font-medium text-ink">{t.psychometric.study}:</span>{' '}
                {locale === 'ms' ? strength.study_ms : strength.study_en}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card flex flex-col items-center">
            <h2 className="section-title mb-2 self-start">{t.psychometric.yourProfile}</h2>
            <RadarChart scores={scores} />
          </div>

          <div className="card">
            <h2 className="section-title mb-3">{t.psychometric.title}</h2>
            <div className="space-y-2.5">
              {ranked.map((key) => {
                const def = DEFINITIONS[key]
                const isTop = key === latest.strength
                const isBottom = key === latest.weakness
                return (
                  <ProgressBar
                    key={key}
                    label={locale === 'ms' ? def.name_ms : def.name_en}
                    caption={`${scores[key]}/${MAX_SCORE_PER_INTELLIGENCE}${
                      isTop ? ` · ${t.psychometric.strength}` : isBottom ? ` · ${t.psychometric.weakness}` : ''
                    }`}
                    value={scores[key]}
                    max={MAX_SCORE_PER_INTELLIGENCE}
                    height={8}
                    color={isTop ? 'var(--status-good)' : isBottom ? 'var(--status-warning)' : 'var(--series-1)'}
                  />
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <DefinitionCard intelligence={latest.strength} kind="strength" />
          <DefinitionCard intelligence={latest.weakness} kind="weakness" />
        </div>

        {/* Lampiran 3 */}
        <div className="card">
          <h2 className="section-title">{t.psychometric.actionPlan}</h2>
          <p className="mb-3 mt-1 text-xs text-ink-muted">{t.psychometric.actionHint}</p>
          {plans.length > 0 && (
            <ul className="mb-3 space-y-2">
              {plans.map((p) => (
                <li key={p.id} className="rounded-lg bg-surface-plane px-3 py-2 text-sm">
                  <span className="font-medium">{p.weakness}:</span> {p.action}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input" value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              placeholder={
                locale === 'ms'
                  ? `${t.psychometric.actionLabel} — ${weakness.name_ms}`
                  : `${t.psychometric.actionLabel} — ${weakness.name_en}`
              }
            />
            <button onClick={() => void addPlan()} className="btn-primary shrink-0">
              {t.psychometric.addAction}
            </button>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-ink-muted">
          {t.psychometric.attribution} · {t.psychometric.takenOn}{' '}
          {new Date(latest.taken_at).toLocaleDateString(locale === 'ms' ? 'ms-MY' : 'en-MY')}
        </p>
      </div>
    )
  }

  // ---- intro ----
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">{t.psychometric.title}</h1>
      <div className="card space-y-3">
        <p className="text-sm text-ink-secondary">{t.psychometric.intro}</p>
        <Alert tone="warning">{t.psychometric.oneAttempt}</Alert>
        {items.length === 0 ? (
          <Alert tone="critical">
            {locale === 'ms'
              ? 'Bank soalan belum dimuatkan. Sila hubungi RPS anda.'
              : 'The question bank has not been loaded yet. Please tell your RPS.'}
          </Alert>
        ) : canTake ? (
          <button onClick={() => setStarted(true)} className="btn-primary w-full">
            {t.psychometric.start}
          </button>
        ) : (
          <Alert tone="info">{t.psychometric.locked}</Alert>
        )}
      </div>
      <p className="text-xs leading-relaxed text-ink-muted">{t.psychometric.attribution}</p>
    </div>
  )
}

function DefinitionCard({ intelligence, kind }: { intelligence: IntelligenceKey; kind: 'strength' | 'weakness' }) {
  const { t, locale } = useI18n()
  const def = DEFINITIONS[intelligence]
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="chip"
          style={{
            background: kind === 'strength' ? '#e9f7e9' : '#fdf4e0',
            color: kind === 'strength' ? '#046004' : '#7a5600',
          }}
        >
          {kind === 'strength' ? '▲' : '▼'} {kind === 'strength' ? t.psychometric.strength : t.psychometric.weakness}
        </span>
        <h3 className="font-semibold">{locale === 'ms' ? def.name_ms : def.name_en}</h3>
      </div>
      <ul className="space-y-1.5 text-sm text-ink-secondary">
        {(locale === 'ms' ? def.traits_ms : def.traits_en).map((tr) => (
          <li key={tr} className="flex gap-2">
            <span style={{ color: def.accent }}>•</span>
            <span>{tr}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1 text-xs text-ink-muted">
        <div><dt className="inline font-medium">{t.psychometric.figures}: </dt><dd className="inline">{def.figures}</dd></div>
        <div>
          <dt className="inline font-medium">{t.psychometric.careers}: </dt>
          <dd className="inline">{locale === 'ms' ? def.careers_ms : def.careers_en}</dd>
        </div>
      </dl>
    </div>
  )
}

/** The "logo" — a ring that draws itself to the score, with the persona glyph. */
function PersonaMark({ intelligence, score }: { intelligence: IntelligenceKey; score: number }) {
  const def = DEFINITIONS[intelligence]
  const r = 40
  const circumference = 2 * Math.PI * r
  const filled = (score / MAX_SCORE_PER_INTELLIGENCE) * circumference

  return (
    <svg width="104" height="104" viewBox="0 0 104 104" className="shrink-0" aria-hidden>
      <circle cx="52" cy="52" r={r} fill="none" stroke="var(--gridline)" strokeWidth="6" />
      <circle
        cx="52" cy="52" r={r} fill="none"
        stroke={def.accent} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform="rotate(-90 52 52)"
        className="animate-ring-draw"
        style={{ ['--ring-length' as string]: `${circumference}` }}
      />
      <text
        x="52" y="52" textAnchor="middle" dominantBaseline="central"
        fontSize="30" fontWeight="700" fill={def.accent}
      >
        {GLYPHS[intelligence]}
      </text>
    </svg>
  )
}

const GLYPHS: Record<IntelligenceKey, string> = {
  linguistic: '✎',
  logical: '∑',
  musical: '♪',
  kinesthetic: '⚡',
  spatial: '◈',
  interpersonal: '❋',
  intrapersonal: '☯',
}
