import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { Alert, Avatar, Spinner } from '../components/ui'
import type { ChatMessage, LeaderboardRow } from '../lib/types'

type Board = 'points' | 'pillars' | 'meetings'

export default function Community() {
  const { t, locale } = useI18n()
  const { profile, isAdmin } = useAuth()

  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [board, setBoard] = useState<Board>('points')
  const [draft, setDraft] = useState('')
  const [asAnnouncement, setAsAnnouncement] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sentAt, setSentAt] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void (async () => {
      const [lb, mn, msgs] = await Promise.all([
        supabase.from('leaderboard').select('*'),
        supabase.from('member_names').select('user_id, full_name'),
        supabase.from('chat_messages').select('*').is('deleted_at', null)
          .order('created_at', { ascending: true }).limit(200),
      ])
      setRows((lb.data as LeaderboardRow[]) ?? [])
      setNames(new Map(((mn.data as { user_id: string; full_name: string | null }[]) ?? [])
        .map((r) => [r.user_id, r.full_name ?? '—'])))
      setMessages((msgs.data as ChatMessage[]) ?? [])
      setLoading(false)
    })()
  }, [])

  // Realtime chat. RLS applies to the stream too, so a pending account gets
  // nothing even though it is subscribed.
  useEffect(() => {
    const channel = supabase
      .channel('chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => setMessages((m) => [...m, payload.new as ChatMessage]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const updated = payload.new as ChatMessage
          setMessages((m) => m.filter((x) => x.id !== updated.id || !updated.deleted_at)
            .map((x) => (x.id === updated.id ? updated : x)))
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const sorted = useMemo(() => {
    const copy = [...rows]
    if (board === 'pillars') {
      copy.sort((a, b) => b.pillars_done - a.pillars_done || b.points - a.points)
    } else if (board === 'meetings') {
      copy.sort((a, b) => b.meetings_verified - a.meetings_verified || b.points - a.points)
    } else {
      copy.sort((a, b) => b.points - a.points)
    }
    return copy
  }, [rows, board])

  if (loading) return <Spinner label={t.common.loading} />

  async function send() {
    const body = draft.trim()
    if (!body) return
    // 3-second floor between messages — enough to stop a flood, invisible in
    // normal use.
    if (Date.now() - sentAt < 3000) return
    setDraft('')
    setSentAt(Date.now())
    const { error: err } = await supabase.from('chat_messages').insert({
      user_id: profile!.id,
      body,
      is_announcement: isAdmin && asAnnouncement,
    })
    if (err) { setError(err.message); setDraft(body) }
  }

  async function remove(id: string) {
    await supabase.from('chat_messages')
      .update({ deleted_at: new Date().toISOString(), deleted_by: profile!.id })
      .eq('id', id)
    setMessages((m) => m.filter((x) => x.id !== id))
  }

  const metric = (r: LeaderboardRow) =>
    board === 'pillars' ? `${r.pillars_done}/7`
      : board === 'meetings' ? String(r.meetings_verified)
        : `${r.points} ${t.community.points}`

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">{t.community.title}</h1>
      {error && <Alert tone="critical">{error}</Alert>}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">{t.community.leaderboard}</h2>
            <div className="flex gap-1">
              {([
                ['points', t.community.points],
                ['pillars', t.community.pillarsBoard],
                ['meetings', t.community.meetingsBoard],
              ] as [Board, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setBoard(key)}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    board === key ? 'bg-[color:var(--brand)] text-white' : 'bg-[color:var(--surface-2)] text-[color:var(--text-2)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ol className="space-y-1">
            {sorted.map((r, i) => (
              <li
                key={r.user_id}
                className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                  r.user_id === profile?.id ? 'tint-info' : ''
                }`}
              >
                <span className="tnum w-6 shrink-0 text-sm font-semibold text-[color:var(--text-3)]">{i + 1}</span>
                <Avatar name={r.full_name} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm">{r.full_name ?? '—'}</span>
                {r.badge_pillars_master && (
                  <span className="chip tint-good" title={t.community.pillarsMaster}>★ 7</span>
                )}
                {r.badge_improving && (
                  <span className="chip tint-info" title={t.community.improving}>▲</span>
                )}
                <span className="tnum shrink-0 text-sm font-medium">{metric(r)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-[color:var(--text-3)]">{t.community.privacyNote}</p>
        </div>

        <div className="card flex h-[32rem] flex-col">
          <h2 className="section-title mb-3">{t.community.chat}</h2>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-sm text-[color:var(--text-3)]">{t.community.empty}</p>}
            {messages.map((m) => {
              const mine = m.user_id === profile?.id
              return (
                <div key={m.id} className="flex gap-2">
                  <Avatar name={names.get(m.user_id) ?? null} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-medium">{names.get(m.user_id) ?? '—'}</span>
                      {m.is_announcement && (
                        <span className="chip tint-warn">{t.community.announcement}</span>
                      )}
                      <span className="text-[11px] text-[color:var(--text-3)]">
                        {new Date(m.created_at).toLocaleTimeString(locale === 'ms' ? 'ms-MY' : 'en-MY', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {(mine || isAdmin) && (
                        <button
                          onClick={() => void remove(m.id)}
                          className="text-[11px] text-[color:var(--text-3)] hover:text-status-critical"
                        >
                          {t.community.delete}
                        </button>
                      )}
                    </div>
                    <p
                      className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${
                        m.is_announcement ? 'rounded-lg border-l-2 border-status-warning tint-warn px-2 py-1' : ''
                      }`}
                    >
                      {m.body}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>

          <div className="mt-3 border-t border-[color:var(--border)] pt-3">
            {isAdmin && (
              <label className="mb-2 flex items-center gap-2 text-xs text-[color:var(--text-2)]">
                <input
                  type="checkbox" checked={asAnnouncement}
                  onChange={(e) => setAsAnnouncement(e.target.checked)}
                />
                {t.community.postAsAnnouncement}
              </label>
            )}
            <div className="flex gap-2">
              <input
                className="input" value={draft} maxLength={1000}
                placeholder={t.community.placeholder}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
              />
              <button onClick={() => void send()} className="btn-primary shrink-0">{t.community.send}</button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--text-3)]">{t.community.rules}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
