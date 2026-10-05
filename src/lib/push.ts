import { supabase } from './supabase'
import type { Locale } from '../i18n'

/**
 * Phone notifications. The browser asks the person once; if they say yes it
 * hands back a subscription, which is saved so the server can reach that
 * phone. Turning the bell off throws the subscription away at both ends.
 */

// Remembers that this person turned the bell on, so a phone that was signed
// out and back in picks its subscription up again without asking twice.
const WANTED_KEY = 'myrps.push'

export type PushState =
  | 'unconfigured'   // the project has no push key yet: show nothing
  | 'unsupported'    // this browser cannot do it at all
  | 'needs-install'  // iPhone: only once the app is on the home screen
  | 'blocked'        // the person, or their phone, said no
  | 'off'
  | 'on'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function wanted(): boolean {
  try {
    return localStorage.getItem(WANTED_KEY) === '1'
  } catch {
    return false
  }
}

function setWanted(on: boolean) {
  try {
    if (on) localStorage.setItem(WANTED_KEY, '1')
    else localStorage.removeItem(WANTED_KEY)
  } catch {
    // blocked storage — the bell still works, it just will not re-arm itself
  }
}

let cachedKey: string | null | undefined

/** The project's public push key, or null while push is not set up. */
export async function pushPublicKey(): Promise<string | null> {
  if (cachedKey !== undefined) return cachedKey
  const { data, error } = await supabase
    .from('app_settings').select('value').eq('key', 'push_public_key').maybeSingle()
  // A failed read is not "not set up": leave it to be asked again.
  if (error) return null
  cachedKey = (data as { value: string | null } | null)?.value?.trim() || null
  return cachedKey
}

/** The push service wants the key as raw bytes, not the base64url it is stored as. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function save(sub: PushSubscription, locale: Locale) {
  const keys = sub.toJSON().keys ?? {}
  return supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint, p_p256dh: keys.p256dh ?? '', p_auth: keys.auth ?? '', p_locale: locale,
  })
}

export async function pushState(): Promise<PushState> {
  if (!(await pushPublicKey())) return 'unconfigured'
  if (!supported()) return isIos() ? 'needs-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted' || !wanted()) return 'off'
  const reg = await navigator.serviceWorker.ready
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off'
}

/** Asks the phone's permission if it has not been asked, then subscribes. */
export async function enablePush(locale: Locale): Promise<PushState> {
  const key = await pushPublicKey()
  if (!key) return 'unconfigured'
  if (!supported()) return isIos() ? 'needs-install' : 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }))

  const { error } = await save(sub, locale)
  if (error) throw new Error(error.message)
  setWanted(true)
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  setWanted(false)
  if (!supported()) return 'off'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint })
    await sub.unsubscribe()
  }
  return Notification.permission === 'denied' ? 'blocked' : 'off'
}

/**
 * On every start: if this person had the bell on, make sure the server still
 * has this phone under their name. Covers a browser that rotated its
 * subscription, a changed language, and signing back in after signing out.
 */
export async function refreshPush(locale: Locale): Promise<void> {
  if (!wanted() || !supported() || Notification.permission !== 'granted') return
  const key = await pushPublicKey()
  if (!key) return
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }))
  await save(sub, locale)
}

/**
 * Signing out: this phone stops being theirs, so it must stop receiving what
 * is meant for them. The choice is remembered, and refreshPush() restores it
 * when they sign back in.
 */
export async function releasePush(): Promise<void> {
  if (!supported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint })
  } catch {
    // never let this stand between someone and the sign-out button
  }
}
