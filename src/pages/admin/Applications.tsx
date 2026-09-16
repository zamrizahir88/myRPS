import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { Alert, Field, Modal, Spinner } from '../../components/ui'
import type { Profile } from '../../lib/types'

export default function Applications() {
  const { t, locale } = useI18n()
  const [rows, setRows] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<Profile | null>(null)
  const [reason, setReason] = useState('')

  async function load() {
    const { data, error: err } = await supabase
      .from('profiles').select('*')
      .eq('approval_state', 'pending')
      .order('created_at', { ascending: true })
    if (err) setError(err.message)
    setRows((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function decide(id: string, state: 'approved' | 'rejected', why?: string) {
    // Goes through the security-definer RPC; approval_state is not directly
    // writable, not even by the admin's own UPDATE.
    const { error: err } = await supabase.rpc('admin_set_approval', {
      target: id, new_state: state, reason: why ?? null,
    })
    if (err) { setError(err.message); return }
    setRejecting(null)
    setReason('')
    await load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      {error && <Alert tone="critical">{error}</Alert>}
      {rows.length === 0 ? (
        <Alert tone="good">{t.admin.noPending}</Alert>
      ) : (
        <div className="card">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-xs text-[color:var(--text-3)]">
                  <th className="px-2 py-2 font-medium">{t.auth.email}</th>
                  <th className="px-2 py-2 font-medium">{t.admin.name}</th>
                  <th className="px-2 py-2 font-medium">{t.admin.matric}</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-2 py-2">{r.email_official}</td>
                    <td className="px-2 py-2">{r.full_name ?? t.common.none}</td>
                    <td className="tnum px-2 py-2">{r.matric_no ?? t.common.none}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <button onClick={() => void decide(r.id, 'approved')} className="btn-primary px-3 py-1 text-xs">
                        {t.admin.approve}
                      </button>
                      <button onClick={() => setRejecting(r)} className="btn-ghost ml-2 px-3 py-1 text-xs">
                        {t.admin.reject}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[color:var(--text-3)]">
            {locale === 'ms'
              ? 'Pendaftaran hanya dibenarkan daripada domain e-mel pelajar yang ditetapkan.'
              : 'Only addresses on the configured student email domain can reach this queue.'}
          </p>
        </div>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={t.admin.reject}>
        <Field label={t.admin.rejectReason}>
          <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setRejecting(null)} className="btn-ghost">{t.common.cancel}</button>
          <button onClick={() => rejecting && void decide(rejecting.id, 'rejected', reason)} className="btn-danger">
            {t.admin.reject}
          </button>
        </div>
      </Modal>
    </div>
  )
}
