import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n'

const tab = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-navy-700 text-white' : 'bg-[color:var(--surface-2)] text-[color:var(--text-2)] hover:bg-[color:var(--border)]'
  }`

export default function AdminLayout() {
  const { t, f } = useI18n()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    void (async () => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_state', 'pending')
      setPending(count ?? 0)
    })()
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t.admin.title}</h1>
        <nav className="flex flex-wrap gap-2">
          <NavLink to="/admin" end className={tab}>{t.admin.students}</NavLink>
          <NavLink to="/admin/applications" className={tab}>
            {t.admin.applications}
            {pending > 0 && (
              <span className="ml-2 rounded-full bg-status-critical px-1.5 py-0.5 text-[10px] text-white">
                {f(t.admin.pendingCount, { n: pending })}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin/curriculum" className={tab}>{t.admin.curriculum}</NavLink>
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
