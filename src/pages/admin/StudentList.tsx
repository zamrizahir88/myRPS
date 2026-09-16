import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'
import { Alert, Spinner } from '../../components/ui'
import type { StudentSummary } from '../../lib/types'

const EIGHT_WEEKS_MS = 56 * 24 * 60 * 60 * 1000

interface Flag { key: string; label: string; tone: 'critical' | 'warning' }

/**
 * The early-warning rules. A flat list of 16 students tells you nothing at a
 * glance; this is what turns the table into "who do I call this week".
 */
function flagsFor(s: StudentSummary, t: ReturnType<typeof useI18n>['t']): Flag[] {
  const out: Flag[] = []
  if (s.open_fails > 0) out.push({ key: 'fail', label: t.admin.flagFail, tone: 'critical' })
  if (s.cgpa !== null && s.cgpa < 2) out.push({ key: 'cgpa', label: t.admin.flagCgpa, tone: 'critical' })
  if (!s.last_meeting_at || Date.now() - new Date(s.last_meeting_at).getTime() > EIGHT_WEEKS_MS) {
    out.push({ key: 'meeting', label: t.admin.flagNoMeeting, tone: 'warning' })
  }
  if (s.pillars_done === 0) out.push({ key: 'pillars', label: t.admin.flagNoPillars, tone: 'warning' })
  if (!s.profile_completed) out.push({ key: 'profile', label: t.admin.flagProfile, tone: 'warning' })
  return out
}

export default function StudentList() {
  const { t, locale } = useI18n()
  const [rows, setRows] = useState<StudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [onlyFlagged, setOnlyFlagged] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const [{ data, error: err }, { data: adminRows }] = await Promise.all([
        supabase.from('student_summary').select('*')
          .eq('approval_state', 'approved').order('full_name'),
        // readable to admins only, by policy
        supabase.from('admins').select('user_id'),
      ])
      if (err) setError(err.message)
      // Belt and braces: the view excludes admins too, but filtering here as
      // well means this is right immediately, without re-running any SQL.
      const adminIds = new Set(((adminRows as { user_id: string }[]) ?? []).map((a) => a.user_id))
      setRows(((data as StudentSummary[]) ?? []).filter((r) => !adminIds.has(r.user_id)))
      setLoading(false)
    })()
  }, [])

  const decorated = useMemo(
    () => rows.map((r) => ({ row: r, flags: flagsFor(r, t) })),
    [rows, t],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return decorated
      .filter(({ row, flags }) => {
        if (onlyFlagged && flags.length === 0) return false
        if (!q) return true
        return (row.full_name ?? '').toLowerCase().includes(q)
          || (row.matric_no ?? '').toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const severity = (f: Flag[]) => f.filter((x) => x.tone === 'critical').length * 10 + f.length
        return severity(b.flags) - severity(a.flags)
      })
  }, [decorated, query, onlyFlagged])

  function exportCsv() {
    const header = ['Name', 'Matric', 'Credits', 'Required', 'CGPA', 'Pillars', 'Meetings', 'Verified', 'Last meeting', 'Flags']
    const lines = decorated.map(({ row, flags }) => [
      row.full_name ?? '', row.matric_no ?? '', row.credits_earned, row.credits_required,
      row.cgpa ?? '', row.pillars_done, row.meetings_total, row.meetings_verified,
      row.last_meeting_at ? new Date(row.last_meeting_at).toISOString().slice(0, 10) : '',
      flags.map((f) => f.label).join('; '),
    ])
    const csv = [header, ...lines]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `myrps-students-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      {error && <Alert tone="critical">{error}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-xs" placeholder={t.common.search}
          value={query} onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-[color:var(--text-2)]">
          <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
          {t.admin.attention}
        </label>
        <button onClick={exportCsv} className="btn-ghost ml-auto text-xs">{t.admin.exportCsv}</button>
      </div>

      {onlyFlagged && filtered.length === 0 ? (
        <Alert tone="good">{t.admin.allClear}</Alert>
      ) : (
        <div className="card">
          <p className="mb-3 text-xs text-[color:var(--text-3)]">{t.admin.attentionHint}</p>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-xs text-[color:var(--text-3)]">
                  <th className="px-2 py-2 font-medium">{t.admin.name}</th>
                  <th className="px-2 py-2 font-medium">{t.admin.matric}</th>
                  <th className="px-2 py-2 font-medium">{t.admin.credits}</th>
                  <th className="px-2 py-2 font-medium">{t.admin.cgpa}</th>
                  <th className="px-2 py-2 font-medium">{t.admin.pillars}</th>
                  <th className="px-2 py-2 font-medium">{t.admin.meetings}</th>
                  <th className="px-2 py-2 font-medium">{t.admin.lastMeeting}</th>
                  <th className="px-2 py-2 font-medium">{t.admin.flags}</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ row, flags }) => (
                  <tr key={row.user_id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-2 py-2 font-medium">{row.full_name ?? t.common.none}</td>
                    <td className="tnum px-2 py-2">{row.matric_no ?? t.common.none}</td>
                    <td className="tnum px-2 py-2">
                      {row.credits_earned}/{row.credits_required}
                      <span className="ml-1 text-xs text-[color:var(--text-3)]">
                        ({Math.round((row.credits_earned / Math.max(row.credits_required, 1)) * 100)}%)
                      </span>
                    </td>
                    <td className={`tnum px-2 py-2 ${row.cgpa !== null && row.cgpa < 2 ? 'font-semibold text-status-critical' : ''}`}>
                      {row.cgpa?.toFixed(2) ?? t.common.none}
                    </td>
                    <td className="tnum px-2 py-2">{row.pillars_done}/7</td>
                    <td className="tnum px-2 py-2">{row.meetings_verified}/{row.meetings_total}</td>
                    <td className="px-2 py-2 text-xs">
                      {row.last_meeting_at
                        ? new Date(row.last_meeting_at).toLocaleDateString(locale === 'ms' ? 'ms-MY' : 'en-MY')
                        : t.common.none}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {flags.map((fl) => (
                          <span
                            key={fl.key}
                            className={`chip ${
                              fl.tone === 'critical' ? 'bg-[#fdecec] text-[#8f2727]' : 'bg-[#fdf4e0] text-[#7a5600]'
                            }`}
                          >
                            {fl.tone === 'critical' ? '●' : '▲'} {fl.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Link to={`/admin/student/${row.user_id}`} className="text-xs text-[color:var(--brand)] hover:underline">
                        {t.admin.viewProfile}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
