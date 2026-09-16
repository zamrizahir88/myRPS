import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { Alert, Avatar, Spinner } from '../components/ui'
import { useAvatarUrls } from '../hooks/useAvatarUrls'
import Greeting from '../components/Greeting'
import type { LeaderboardRow, Subject } from '../lib/types'

const EMOJI = ['👏', '🔥', '❤️', '💪'] as const
type Emoji = (typeof EMOJI)[number]

interface Post {
  id: string
  user_id: string
  kind: 'post' | 'help' | 'announcement'
  body: string
  subject_code: string | null
  created_at: string
  deleted_at: string | null
}
interface Comment {
  id: string
  post_id: string
  user_id: string
  body: string
  created_at: string
  deleted_at: string | null
}
interface Reaction { post_id: string; user_id: string; emoji: Emoji }

export default function Feed() {
  const { t, locale } = useI18n()
  const { profile, isAdmin, avatarUrl } = useAuth()

  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [avatarPaths, setAvatarPaths] = useState<Map<string, string>>(new Map())
  const [board, setBoard] = useState<LeaderboardRow[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [draftKind, setDraftKind] = useState<'post' | 'help' | 'announcement'>('post')
  const [filter, setFilter] = useState<'all' | 'help' | 'announcement'>('all')
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const [sentAt, setSentAt] = useState(0)

  const load = useCallback(async () => {
    const [p, c, r, n, lb, subs] = await Promise.all([
      supabase.from('posts').select('*').is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(100),
      supabase.from('post_comments').select('*').is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase.from('post_reactions').select('post_id, user_id, emoji'),
      supabase.from('member_names').select('user_id, full_name, avatar_path'),
      supabase.from('leaderboard').select('*'),
      supabase.from('curriculum_subjects').select('*').eq('is_active', true).order('code'),
    ])
    setPosts((p.data as Post[]) ?? [])
    setComments((c.data as Comment[]) ?? [])
    setReactions((r.data as Reaction[]) ?? [])
    const members = (n.data as { user_id: string; full_name: string | null; avatar_path: string | null }[]) ?? []
    setNames(new Map(members.map((row) => [row.user_id, row.full_name ?? '—'])))
    setAvatarPaths(new Map(
      members.filter((row) => row.avatar_path).map((row) => [row.user_id, row.avatar_path as string]),
    ))
    setBoard(((lb.data as LeaderboardRow[]) ?? []).sort((a, b) => b.points - a.points))
    // one entry per code: the same course exists in several curriculum versions
    const seen = new Set<string>()
    setSubjects(((subs.data as Subject[]) ?? []).filter((s) => {
      if (seen.has(s.code)) return false
      seen.add(s.code)
      return true
    }))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  // Live: someone else's post, reaction or comment appears without a refresh.
  useEffect(() => {
    const channel = supabase
      .channel('feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, () => void load())
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [load])

  const signedAvatars = useAvatarUrls([...avatarPaths.values()])
  const avatarFor = useCallback(
    (userId: string) => {
      const path = avatarPaths.get(userId)
      return path ? signedAvatars.get(path) ?? null : null
    },
    [avatarPaths, signedAvatars],
  )

  const myReaction = useMemo(() => {
    const map = new Map<string, Emoji>()
    for (const r of reactions) if (r.user_id === profile?.id) map.set(r.post_id, r.emoji)
    return map
  }, [reactions, profile?.id])

  const countsFor = useCallback(
    (postId: string) => {
      const counts = new Map<Emoji, number>()
      for (const r of reactions) {
        if (r.post_id !== postId) continue
        counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1)
      }
      return counts
    },
    [reactions],
  )

  const visible = useMemo(
    () => (filter === 'all' ? posts : posts.filter((p) => p.kind === filter)),
    [posts, filter],
  )

  if (loading) return <Spinner label={t.common.loading} />

  async function publish() {
    const body = draft.trim()
    if (!body) return
    if (Date.now() - sentAt < 3000) return   // a small floor against flooding
    setSentAt(Date.now())
    setDraft('')
    const { error: err } = await supabase.from('posts').insert({
      user_id: profile!.id,
      body,
      kind: isAdmin ? draftKind : draftKind === 'announcement' ? 'post' : draftKind,
      subject_code: draftSubject || null,
    })
    if (err) { setError(err.message); setDraft(body); return }
    setDraftSubject('')
    setDraftKind('post')
    await load()
  }

  async function react(postId: string, emoji: Emoji) {
    const current = myReaction.get(postId)
    if (current === emoji) {
      await supabase.from('post_reactions').delete()
        .eq('post_id', postId).eq('user_id', profile!.id)
    } else {
      await supabase.from('post_reactions')
        .upsert({ post_id: postId, user_id: profile!.id, emoji }, { onConflict: 'post_id,user_id' })
    }
    await load()
  }

  async function comment(postId: string) {
    const body = (commentDraft[postId] ?? '').trim()
    if (!body) return
    setCommentDraft((d) => ({ ...d, [postId]: '' }))
    const { error: err } = await supabase.from('post_comments')
      .insert({ post_id: postId, user_id: profile!.id, body })
    if (err) setError(err.message)
    await load()
  }

  async function remove(table: 'posts' | 'post_comments', id: string) {
    await supabase.from(table)
      .update({ deleted_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  const when = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return locale === 'ms' ? 'baru sahaja' : 'just now'
    if (mins < 60) return `${mins}m`
    if (mins < 1440) return `${Math.round(mins / 60)}h`
    return new Date(iso).toLocaleDateString(locale === 'ms' ? 'ms-MY' : 'en-MY',
      { day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-5">
      <Greeting subtitle={t.feed.subtitle} />
      {error && <Alert tone="critical">{error}</Alert>}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {/* composer */}
          <div className="card">
            <div className="flex gap-3">
              <Avatar name={profile?.full_name ?? null} url={avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <textarea
                  className="input resize-none" rows={3} maxLength={2000}
                  placeholder={t.feed.placeholder}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    className="input max-w-[11rem] py-1.5 text-xs"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                  >
                    <option value="">{t.feed.noSubject}</option>
                    {subjects.map((s) => (
                      <option key={s.code} value={s.code}>{s.code}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
                    <input
                      type="checkbox"
                      checked={draftKind === 'help'}
                      onChange={(e) => setDraftKind(e.target.checked ? 'help' : 'post')}
                    />
                    {t.feed.askForHelp}
                  </label>

                  {isAdmin && (
                    <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
                      <input
                        type="checkbox"
                        checked={draftKind === 'announcement'}
                        onChange={(e) => setDraftKind(e.target.checked ? 'announcement' : 'post')}
                      />
                      {t.feed.asAnnouncement}
                    </label>
                  )}

                  <button
                    onClick={() => void publish()}
                    disabled={!draft.trim()}
                    className="btn-primary ml-auto px-4 py-1.5 text-xs"
                  >
                    {t.feed.post}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-1.5">
            {([['all', t.feed.tabAll], ['help', t.feed.tabHelp], ['announcement', t.feed.tabAnnouncements]] as const)
              .map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    filter === key ? 'bg-[color:var(--brand-solid)] text-white' : 'tint-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
          </div>

          {visible.length === 0 && (
            <div className="card text-center">
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>{t.feed.empty}</p>
            </div>
          )}

          {visible.map((post) => {
            const counts = countsFor(post.id)
            const mine = myReaction.get(post.id)
            const thread = comments.filter((c) => c.post_id === post.id)
            const open = openComments.has(post.id)
            return (
              <article
                key={post.id}
                className={`card animate-fade-up ${
                  post.kind === 'announcement' ? 'border-l-4 border-l-gold' : ''
                }`}
              >
                <header className="flex items-start gap-3">
                  <Avatar name={names.get(post.user_id) ?? null} url={avatarFor(post.user_id)} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-bold">{names.get(post.user_id) ?? '—'}</span>
                      {post.kind === 'announcement' && (
                        <span className="chip tint-warn">📣 {t.feed.announcement}</span>
                      )}
                      {post.kind === 'help' && (
                        <span className="chip tint-info">🤝 {t.feed.needHelp}</span>
                      )}
                      {post.subject_code && (
                        <span className="chip tint-muted tnum">#{post.subject_code}</span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>· {when(post.created_at)}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{post.body}</p>
                  </div>
                  {(post.user_id === profile?.id || isAdmin) && (
                    <button
                      onClick={() => void remove('posts', post.id)}
                      className="text-xs" style={{ color: 'var(--text-3)' }}
                      title={t.common.delete}
                    >
                      ✕
                    </button>
                  )}
                </header>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {EMOJI.map((e) => {
                    const n = counts.get(e) ?? 0
                    const active = mine === e
                    return (
                      <button
                        key={e}
                        onClick={() => void react(post.id, e)}
                        className={`chip transition ${active ? 'tint-info' : 'tint-muted'}`}
                        aria-pressed={active}
                      >
                        <span aria-hidden>{e}</span>
                        {n > 0 && <span className="tnum">{n}</span>}
                      </button>
                    )
                  })}
                  <button
                    onClick={() =>
                      setOpenComments((s) => {
                        const next = new Set(s)
                        next.has(post.id) ? next.delete(post.id) : next.add(post.id)
                        return next
                      })
                    }
                    className="chip tint-muted"
                  >
                    💬 {thread.length > 0 ? thread.length : ''} {t.feed.comment}
                  </button>
                </div>

                {open && (
                  <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                    {thread.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <Avatar name={names.get(c.user_id) ?? null} url={avatarFor(c.user_id)} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-xs font-bold">{names.get(c.user_id) ?? '—'}</span>
                            <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                              {when(c.created_at)}
                            </span>
                            {(c.user_id === profile?.id || isAdmin) && (
                              <button
                                onClick={() => void remove('post_comments', c.id)}
                                className="text-[11px]" style={{ color: 'var(--text-3)' }}
                              >
                                {t.common.delete}
                              </button>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        className="input py-1.5 text-sm"
                        placeholder={t.feed.commentPlaceholder}
                        value={commentDraft[post.id] ?? ''}
                        onChange={(e) => setCommentDraft((d) => ({ ...d, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void comment(post.id) }
                        }}
                      />
                      <button onClick={() => void comment(post.id)} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
                        {t.feed.send}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>

        {/* leaderboard alongside the feed rather than on its own tab */}
        <aside className="space-y-4">
          <div className="card">
            <h2 className="section-title mb-3">{t.community.leaderboard}</h2>
            <ol className="space-y-1">
              {board.slice(0, 10).map((r, i) => (
                <li
                  key={r.user_id}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                    r.user_id === profile?.id ? 'tint-info' : ''
                  }`}
                >
                  <span className="tnum w-5 shrink-0 text-xs font-bold" style={{ color: 'var(--text-3)' }}>
                    {i + 1}
                  </span>
                  <Avatar name={r.full_name} url={avatarFor(r.user_id)} size={26} />
                  <span className="min-w-0 flex-1 truncate text-sm">{r.full_name ?? '—'}</span>
                  {r.badge_pillars_master && <span title={t.community.pillarsMaster}>★</span>}
                  {r.badge_improving && <span title={t.community.improving}>▲</span>}
                  <span className="tnum text-sm font-bold">{r.points}</span>
                </li>
              ))}
              {board.length === 0 && (
                <li className="text-sm" style={{ color: 'var(--text-3)' }}>{t.community.empty}</li>
              )}
            </ol>
            <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
              {t.community.privacyNote}
            </p>
          </div>

          <div className="card">
            <h2 className="section-title mb-2">{t.feed.rulesTitle}</h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{t.community.rules}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
