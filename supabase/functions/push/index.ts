// myRPS — push notifications
//
// The database calls this the moment a post, a comment or a sign-up is
// written (see supabase/19_push.sql), with nothing but the kind and the id.
// This function reads the row itself, decides who should hear about it, and
// sends each of their phones a notification.
//
// Deploy with "Verify JWT" OFF. That is safe here: the request is not trusted
// for anything. The function only ever announces a row that really exists, is
// minutes old, and has not been announced before — so calling it by hand can
// at most do what the database was about to do anyway.
//
// Secrets this function needs (Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   the pair the app subscribes with
//   VAPID_SUBJECT                         mailto:you@example.com
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type Locale = 'ms' | 'en'
interface Subscription { endpoint: string; user_id: string; p256dh: string; auth: string; locale: Locale }
interface Message { title: string; body: string; url: string; tag: string }

// Older than this and it is history, not news — a row replayed long after the
// fact should not buzz anybody's phone.
const FRESH_MINUTES = 10

const TEXT = {
  ms: {
    announcement: (name: string) => `📣 Pengumuman daripada ${name}`,
    help: (name: string) => `🤝 ${name} perlukan bantuan`,
    commented: (name: string) => `${name} mengulas kiriman anda`,
    registration: 'Pendaftaran baharu menunggu kelulusan',
    someone: 'Seseorang',
  },
  en: {
    announcement: (name: string) => `📣 Announcement from ${name}`,
    help: (name: string) => `🤝 ${name} needs help`,
    commented: (name: string) => `${name} commented on your post`,
    registration: 'A new registration is waiting for approval',
    someone: 'Someone',
  },
}

const clip = (text: string, max = 140) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

const isFresh = (iso: string) => Date.now() - Date.parse(iso) < FRESH_MINUTES * 60_000

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// deno-lint-ignore no-explicit-any
type Db = any

/** Who to tell, and what to tell them. Null when there is nothing to send. */
async function plan(
  db: Db, kind: string, id: string,
): Promise<{ recipients: Subscription[]; compose: (locale: Locale) => Message } | null> {
  const nameOf = async (userId: string): Promise<string | null> => {
    const { data } = await db.from('profiles').select('full_name').eq('id', userId).maybeSingle()
    return data?.full_name?.trim() || null
  }
  // Approved accounts only: a subscription can outlive an approval.
  const subscriptionsOf = async (userIds: string[]): Promise<Subscription[]> => {
    if (userIds.length === 0) return []
    const { data } = await db.from('push_subscriptions').select('*').in('user_id', userIds)
    return (data as Subscription[]) ?? []
  }
  const approvedExcept = async (userId: string): Promise<string[]> => {
    const { data } = await db.from('profiles').select('id').eq('approval_state', 'approved').neq('id', userId)
    return ((data as { id: string }[]) ?? []).map((r) => r.id)
  }

  if (kind === 'post') {
    const { data: post } = await db.from('posts').select('*').eq('id', id).maybeSingle()
    if (!post || post.deleted_at || !isFresh(post.created_at)) return null
    const name = await nameOf(post.user_id)
    return {
      recipients: await subscriptionsOf(await approvedExcept(post.user_id)),
      compose: (locale) => {
        const t = TEXT[locale]
        const who = name ?? t.someone
        return {
          title: post.kind === 'announcement' ? t.announcement(who) : post.kind === 'help' ? t.help(who) : who,
          body: clip(post.body),
          url: '#/feed',
          tag: `post-${post.id}`,
        }
      },
    }
  }

  if (kind === 'comment') {
    const { data: comment } = await db.from('post_comments').select('*').eq('id', id).maybeSingle()
    if (!comment || comment.deleted_at || !isFresh(comment.created_at)) return null
    const { data: post } = await db.from('posts').select('id, user_id, deleted_at').eq('id', comment.post_id).maybeSingle()
    // Commenting on your own post tells nobody.
    if (!post || post.deleted_at || post.user_id === comment.user_id) return null
    const name = await nameOf(comment.user_id)
    return {
      recipients: await subscriptionsOf([post.user_id]),
      compose: (locale) => ({
        title: TEXT[locale].commented(name ?? TEXT[locale].someone),
        body: clip(comment.body),
        url: '#/feed',
        tag: `comment-${comment.id}`,
      }),
    }
  }

  if (kind === 'registration') {
    const { data: profile } = await db.from('profiles')
      .select('id, full_name, email_official, approval_state, created_at').eq('id', id).maybeSingle()
    if (!profile || profile.approval_state !== 'pending' || !isFresh(profile.created_at)) return null
    const { data: admins } = await db.from('admins').select('user_id')
    return {
      recipients: await subscriptionsOf(((admins as { user_id: string }[]) ?? []).map((a) => a.user_id)),
      compose: (locale) => ({
        title: TEXT[locale].registration,
        body: profile.full_name?.trim() || profile.email_official || '',
        url: '#/admin/applications',
        tag: `registration-${profile.id}`,
      }),
    }
  }

  return null
}

export async function handle(
  db: Db,
  send: (sub: Subscription, payload: string) => Promise<unknown>,
  input: { kind?: unknown; id?: unknown },
) {
  const kind = String(input.kind ?? '')
  const id = String(input.id ?? '')
  if (!['post', 'comment', 'registration'].includes(kind) || !/^[0-9a-f-]{36}$/i.test(id)) {
    return { status: 400, body: { error: 'bad request' } }
  }

  const planned = await plan(db, kind, id)
  if (!planned) return { status: 200, body: { sent: 0, reason: 'nothing to announce' } }

  // Claim it before sending: a second call for the same row stops here.
  const { error: claimed } = await db.from('push_sent').insert({ kind, ref: id })
  if (claimed) return { status: 200, body: { sent: 0, reason: 'already announced' } }

  let sent = 0
  const gone: string[] = []
  await Promise.all(planned.recipients.map(async (sub) => {
    try {
      await send(sub, JSON.stringify(planned.compose(sub.locale === 'en' ? 'en' : 'ms')))
      sent++
    } catch (err) {
      // 404 / 410: the phone unsubscribed or the app was removed. Forget it,
      // or every future post would try it again.
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) gone.push(sub.endpoint)
    }
  }))
  if (gone.length > 0) await db.from('push_subscriptions').delete().in('endpoint', gone)

  return { status: 200, body: { sent, removed: gone.length } }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return json({ error: 'VAPID keys are not set' }, 500)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', publicKey, privateKey)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  let input: { kind?: unknown; id?: unknown }
  try {
    input = await req.json()
  } catch {
    return json({ error: 'bad request' }, 400)
  }

  const send = (sub: Subscription, payload: string) =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      // An hour: a notification about a post is not worth delivering tomorrow.
      { TTL: 3600, urgency: 'high' },
    )

  const result = await handle(db, send, input)
  return json(result.body, result.status)
})
