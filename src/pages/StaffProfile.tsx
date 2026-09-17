import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { useToast } from '../components/Toast'
import { downscaleToJpeg } from '../lib/image'
import { Alert, Avatar, Field } from '../components/ui'
import RpsCard from '../components/RpsCard'
import type { Profile } from '../lib/types'

/**
 * The RPS was being handed the student form — matric number, SPM results,
 * curriculum intake, sponsor, next of kin, "career goal after graduation".
 * None of it applies. Ten fields that do.
 */
export default function StaffProfile() {
  const { t } = useI18n()
  const { profile, refreshProfile, avatarUrl } = useAuth()
  const { show } = useToast()
  const [form, setForm] = useState<Partial<Profile>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (profile) setForm(profile) }, [profile])
  if (!profile) return null

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onUpload(file: File) {
    setBusy(true)
    try {
      const blob = await downscaleToJpeg(file)
      const path = `${profile!.id}/avatar.jpg`
      const { error: upErr } = await supabase.storage
        .from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      await supabase.from('profiles').update({ avatar_path: path }).eq('id', profile!.id)
      await refreshProfile()
      show(t.common.saved)
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
    const { error: err } = await supabase.from('profiles').update({
      full_name: form.full_name ?? null,
      title: form.title ?? null,
      position_title: form.position_title ?? null,
      department: form.department ?? null,
      office_location: form.office_location ?? null,
      whatsapp: (form.whatsapp ?? '').replace(/\D/g, '') || null,
      cv_url: form.cv_url ?? null,
      bio: form.bio ?? null,
      email_personal: form.email_personal ?? null,
      phone_mobile: form.phone_mobile ?? null,
      profile_completed: !!form.full_name,
    }).eq('id', profile!.id)
    setBusy(false)
    if (err) { setError(err.message); return }
    await refreshProfile()
    show(t.profile.saved)
  }

  const text = (key: keyof Profile, label: string, hint?: string, type = 'text') => (
    <Field label={label} hint={hint}>
      <input
        className="input" type={type}
        value={(form[key] as string) ?? ''}
        onChange={(e) => set(key, e.target.value as never)}
      />
    </Field>
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="h-page">{t.staff.title}</h1>
          <button className="btn-primary" disabled={busy}>{t.profile.save}</button>
        </div>

        {error && <Alert tone="critical">{error}</Alert>}

        <section className="card">
          <h2 className="section-title mb-1">{t.profile.photo}</h2>
          <p className="mb-4 text-xs" style={{ color: 'var(--text-3)' }}>{t.staff.seenByStudents}</p>
          <div className="flex items-center gap-4">
            <Avatar name={form.full_name ?? null} url={avatarUrl} size={72} />
            <label className="btn-ghost cursor-pointer">
              {t.profile.uploadPhoto}
              <input
                type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f) }}
              />
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="section-title mb-1">{t.staff.title}</h2>
          <p className="mb-4 text-xs" style={{ color: 'var(--text-3)' }}>{t.staff.seenByStudents}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('full_name', t.profile.fullName)}
            {text('title', t.staff.yourTitle, 'Ts. Dr.')}
            {text('position_title', t.staff.position, 'Pensyarah Kanan')}
            {text('department', t.staff.department)}
            {text('office_location', t.staff.office)}
            {text('email_official', t.profile.emailOfficial, undefined, 'email')}
            {text('whatsapp', t.staff.whatsapp, t.staff.whatsappHint, 'tel')}
            {text('cv_url', t.staff.cvUrl, t.staff.cvHint, 'url')}
          </div>
          <div className="mt-4">
            <Field label={t.staff.bio} hint={t.staff.bioHint}>
              <textarea
                className="input" rows={3}
                value={form.bio ?? ''}
                onChange={(e) => set('bio', e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="card">
          <h2 className="section-title mb-1">{t.profile.contact}</h2>
          <p className="mb-4 text-xs" style={{ color: 'var(--text-3)' }}>{t.staff.privateSection}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('email_personal', t.profile.emailPersonal, undefined, 'email')}
            {text('phone_mobile', t.profile.phoneMobile, undefined, 'tel')}
          </div>
        </section>

        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy}>{t.profile.save}</button>
        </div>
      </form>

      {/* what the student actually sees, updating as you type */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
          {t.staff.seenByStudents}
        </p>
        <RpsCard />
      </aside>
    </div>
  )
}
