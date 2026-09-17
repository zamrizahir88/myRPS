import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { downscaleToJpeg } from '../lib/image'
import { Alert, Avatar, Field, Modal, Spinner } from '../components/ui'
import StaffProfile from './StaffProfile'
import { useToast } from '../components/Toast'
import type { Profile } from '../lib/types'

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak',
  'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
  'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya',
]
const INCOME_BANDS = [
  'Bawah RM1000', 'RM1001-RM2000', 'RM2001-RM4000', 'RM4001-RM6000',
  'RM6001-RM10000', 'Melebihi RM10000',
]
// Marked required because the RPS cannot do the job without them.
const REQUIRED_FIELDS: (keyof Profile)[] = ['full_name', 'matric_no', 'phone_mobile', 'intake_year']

export default function ProfilePage() {
  const { t, locale } = useI18n()
  const { profile, refreshProfile, isAdmin } = useAuth()
  const { show } = useToast()
  const [form, setForm] = useState<Partial<Profile>>({})
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  // Read the available curriculum versions rather than hardcoding them: a
  // hardcoded pair goes stale the moment a new intake is seeded.
  const [intakes, setIntakes] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('curriculum_requirements')
        .select('intake_year')
        .eq('programme_code', 'UR6523007')
      const years = [...new Set(((data as { intake_year: string }[]) ?? []).map((r) => r.intake_year))]
      setIntakes(years.sort().reverse())
    })()
  }, [])

  useEffect(() => { if (profile) setForm(profile) }, [profile])

  useEffect(() => {
    if (!profile?.avatar_path) { setAvatarUrl(null); return }
    void (async () => {
      const { data } = await supabase.storage
        .from('avatars')
        .createSignedUrl(profile.avatar_path!, 3600)
      setAvatarUrl(data?.signedUrl ?? null)
    })()
  }, [profile?.avatar_path])

  if (!profile) return <Spinner />
  // The RPS is not a student; they get their own, much shorter form.
  if (isAdmin) return <StaffProfile />

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function onUpload(file: File) {
    setError(null)
    setBusy(true)
    try {
      const blob = await downscaleToJpeg(file)
      // The first path segment must be the user id — the storage policies
      // check exactly that.
      const path = `${profile!.id}/avatar.jpg`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      await supabase.from('profiles').update({ avatar_path: path }).eq('id', profile!.id)
      await refreshProfile()
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error)
    } finally {
      setBusy(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const complete = REQUIRED_FIELDS.every((k) => {
      const v = form[k]
      return v !== null && v !== undefined && String(v).trim() !== ''
    })

    const { id, approval_state, consent_at, consent_version, created_at, avatar_path, ...editable } =
      form as Profile
    void id; void approval_state; void consent_at; void consent_version; void created_at; void avatar_path

    const { error: err } = await supabase
      .from('profiles')
      .update({ ...editable, profile_completed: complete })
      .eq('id', profile!.id)

    setBusy(false)
    if (err) setError(err.message)
    else { setSaved(true); show(t.profile.saved); await refreshProfile() }
  }

  async function onDelete() {
    if (deleteText !== 'DELETE') return
    setBusy(true)
    const { error: err } = await supabase.rpc('delete_my_account')
    if (err) { setError(err.message); setBusy(false); return }
    await supabase.auth.signOut()
    window.location.reload()
  }

  const text = (key: keyof Profile, label: string, opts: { type?: string; required?: boolean } = {}) => (
    <Field label={label} required={opts.required}>
      <input
        className="input"
        type={opts.type ?? 'text'}
        value={(form[key] as string) ?? ''}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </Field>
  )

  const select = (key: keyof Profile, label: string, options: string[]) => (
    <Field label={label}>
      <select
        className="input"
        value={(form[key] as string) ?? ''}
        onChange={(e) => set(key, e.target.value as never)}
      >
        <option value="">{t.common.notSet}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  )

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t.profile.title}</h1>
        <button className="btn-primary" disabled={busy}>{t.profile.save}</button>
      </div>

      {error && <Alert tone="critical">{error}</Alert>}
      {saved && <Alert tone="good">{t.profile.saved}</Alert>}
      {!profile.profile_completed && <Alert tone="warning">{t.profile.incomplete}</Alert>}

      <section className="card">
        <h2 className="section-title mb-4">{t.profile.photo}</h2>
        <div className="flex items-center gap-4">
          <Avatar name={form.full_name ?? null} url={avatarUrl} size={72} />
          <div>
            <label className="btn-ghost cursor-pointer">
              {t.profile.uploadPhoto}
              <input
                type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f) }}
              />
            </label>
            <p className="mt-1 text-xs text-[color:var(--text-3)]">{t.profile.photoHint}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title mb-4">{t.profile.personal}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text('full_name', t.profile.fullName, { required: true })}
          {text('matric_no', t.profile.matric, { required: true })}
          {text('ic_no', t.profile.ic)}
          {text('date_of_birth', t.profile.dob, { type: 'date' })}
          {select('birth_state', t.profile.birthState, MALAYSIAN_STATES)}
          {select('gender', t.profile.gender, ['Lelaki', 'Perempuan'])}
          {text('disability', t.profile.disability)}
          {text('race', t.profile.race)}
          {text('religion', t.profile.religion)}
          {text('nationality', t.profile.nationality)}
          {select('marital_status', t.profile.marital, ['Bujang', 'Berkahwin'])}
          {select('parental_income', t.profile.income, INCOME_BANDS)}
        </div>
        <p className="mt-3 text-xs text-[color:var(--text-3)]">{t.consent.sensitive}</p>
      </section>

      <section className="card">
        <h2 className="section-title mb-4">{t.profile.contact}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text('email_personal', t.profile.emailPersonal, { type: 'email' })}
          {text('email_official', t.profile.emailOfficial, { type: 'email' })}
          {text('phone_home', t.profile.phoneHome, { type: 'tel' })}
          {text('phone_mobile', t.profile.phoneMobile, { type: 'tel', required: true })}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title mb-4">{t.profile.address}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label={t.profile.addressLine}>
              <textarea
                className="input" rows={2}
                value={form.address_line ?? ''}
                onChange={(e) => set('address_line', e.target.value)}
              />
            </Field>
          </div>
          {text('postcode', t.profile.postcode)}
          {text('city', t.profile.city)}
          {select('state', t.profile.state, MALAYSIAN_STATES)}
          {select('hostel_status', t.profile.hostel, ['On Campus', 'Off Campus'])}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title mb-4">{t.profile.kin}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text('kin_name', t.profile.kinName)}
          {text('kin_relation', t.profile.kinRelation)}
          {text('kin_phone', t.profile.kinPhone, { type: 'tel' })}
          {text('father_occupation', t.profile.father)}
          {text('mother_occupation', t.profile.mother)}
          <Field label={t.profile.dependents}>
            <input
              className="input" type="number" min={0}
              value={form.dependents_count ?? ''}
              onChange={(e) => set('dependents_count', e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label={t.profile.parentAddress}>
              <textarea
                className="input" rows={2}
                value={form.parent_address ?? ''}
                onChange={(e) => set('parent_address', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title mb-4">{t.profile.academic}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text('programme_code', t.profile.programme)}
          <Field
            label={t.profile.intakeYear}
            required
            hint={locale === 'ms'
              ? 'Struktur kurikulum yang anda ikuti — biasanya sesi anda mula belajar.'
              : 'The curriculum structure you follow — usually the session you started in.'}
          >
            <select
              className="input"
              value={form.intake_year ?? ''}
              onChange={(e) => set('intake_year', e.target.value)}
            >
              <option value="">{t.common.notSet}</option>
              {intakes.map((y) => (
                <option key={y} value={y}>
                  {y}/{Number(y) + 1}
                </option>
              ))}
            </select>
          </Field>
          {text('intake_semester', t.profile.intakeSemester)}
          {text('entry_type', t.profile.entryType)}
          {text('programme_mode', t.profile.mode)}
          {text('muet_band', t.profile.muet)}
          {text('sponsor_name', t.profile.sponsorName)}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">{t.sharing.title}</h2>
        <p className="mb-4 mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{t.sharing.intro}</p>

        <div className="space-y-3">
          <Toggle
            checked={!!form.share_profile}
            onChange={(v) => set('share_profile', v)}
            label={t.sharing.shareProfile}
            hint={t.sharing.shareProfileHint}
          />
          <Toggle
            checked={!!form.share_persona}
            onChange={(v) => set('share_persona', v)}
            label={t.sharing.sharePersona}
            hint={t.sharing.sharePersonaHint}
            disabled={!form.share_profile}
          />
          <Toggle
            checked={!!form.share_pillars}
            onChange={(v) => set('share_pillars', v)}
            label={t.sharing.sharePillars}
            disabled={!form.share_profile}
          />
        </div>

        <div className="mt-4">
          <Field label={t.sharing.bio} hint={t.sharing.bioHint}>
            <textarea
              className="input" rows={2} maxLength={280}
              value={form.bio ?? ''}
              onChange={(e) => set('bio', e.target.value)}
            />
          </Field>
        </div>

        <Alert tone="info">{t.sharing.never}</Alert>
      </section>

      <section className="card">
        <h2 className="section-title mb-4">{t.profile.career}</h2>
        <Field label={t.profile.careerGoal} hint={t.profile.careerHint}>
          <textarea
            className="input" rows={3}
            value={form.career_goal ?? ''}
            onChange={(e) => set('career_goal', e.target.value)}
          />
        </Field>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setDeleteOpen(true)} className="text-xs text-status-critical hover:underline">
          {t.profile.deleteAccount}
        </button>
        <button className="btn-primary" disabled={busy}>{t.profile.save}</button>
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title={t.profile.deleteAccount}>
        <p className="text-sm text-[color:var(--text-2)]">{t.profile.deleteConfirm}</p>
        <input
          className="input mt-3" value={deleteText}
          onChange={(e) => setDeleteText(e.target.value)} placeholder="DELETE"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteOpen(false)} className="btn-ghost">{t.common.cancel}</button>
          <button type="button" onClick={onDelete} disabled={deleteText !== 'DELETE' || busy} className="btn-danger">
            {t.common.delete}
          </button>
        </div>
      </Modal>
    </form>
  )
}


function Toggle({
  checked, onChange, label, hint, disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <label className={`flex gap-3 ${disabled ? 'opacity-50' : ''}`}>
      <input
        type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs" style={{ color: 'var(--text-3)' }}>{hint}</span>}
      </span>
    </label>
  )
}
