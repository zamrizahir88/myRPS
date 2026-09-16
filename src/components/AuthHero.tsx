import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { Logo } from './Brand'

/** 22px stroke icons, sized for the feature list. */
const ico = {
  width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.8,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
const IconCredits = () => <svg {...ico}><path d="M12 3a9 9 0 1 1-9 9" /><path d="M12 3a9 9 0 0 1 9 9h-9Z" /></svg>
const IconSemester = () => <svg {...ico}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18M8 15h3" /></svg>
const IconGpa = () => <svg {...ico}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>
const IconBrain = () => <svg {...ico}><path d="M12 5a3 3 0 0 0-6 0 3 3 0 0 0-1 5.8A3 3 0 0 0 7 17a3 3 0 0 0 5 1.5V5ZM12 5a3 3 0 0 1 6 0 3 3 0 0 1 1 5.8A3 3 0 0 1 17 17a3 3 0 0 1-5 1.5" /></svg>
const IconPillars = () => <svg {...ico}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" /></svg>
const IconMeetings = () => <svg {...ico}><circle cx="9" cy="8" r="3" /><path d="M2 20a7 7 0 0 1 14 0M17 4.5a3.5 3.5 0 0 1 0 7" /></svg>
const IconFeed = () => <svg {...ico}><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" /></svg>

/**
 * The signed-out panel. It has to answer "what is this and why would I open
 * it" for a student who has never seen the system, so it shows the features
 * and a sample of the feed rather than a bare tagline.
 */
export default function AuthHero() {
  const { t, locale } = useI18n()
  const { canInstall, showIosHint, install } = useInstallPrompt()
  const ms = locale === 'ms'

  // Three sample threads, cycled slowly. Static, the panel reads as a
  // screenshot; moving, it reads as a place where things happen.
  const samples = ms ? SAMPLES_MS : SAMPLES_EN
  const [sample, setSample] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setSample((i) => (i + 1) % samples.length), 6000)
    return () => clearInterval(id)
  }, [samples.length])
  const shown = samples[sample % samples.length]

  const features = [
    { icon: <IconCredits />,  title: ms ? '140 kredit, dipantau' : 'All 140 credits, tracked',
      body: ms ? 'Lihat tepat berapa kredit lagi sebelum bergraduat.' : 'See exactly how far you are from graduating.' },
    { icon: <IconSemester />, title: ms ? 'Setiap semester' : 'Semester by semester',
      body: ms ? 'Rekod Tahun 1 Semester 1, Sesi 2026/2027 dan kursus yang diambil.' : 'Record Year 1 Semester 1, Session 2026/2027 and the subjects you took.' },
    { icon: <IconGpa />,      title: ms ? 'Anggaran PNG & PNGK' : 'Indicative GPA & CGPA',
      body: ms ? 'Dikira sendiri apabila keputusan keluar. Kursus ulangan diambil kira.' : 'Calculated for you as results come out. Repeats handled properly.' },
    { icon: <IconBrain />,    title: ms ? 'Profil psikometrik' : 'Your psychometric profile',
      body: ms ? 'Kenali kecerdasan terkuat anda dan cara belajar yang sesuai.' : 'Find your strongest intelligence, and how to study to it.' },
    { icon: <IconPillars />,  title: ms ? '7 Pillars' : 'The 7 Pillars',
      body: ms ? 'Tandakan setiap pillar yang anda lengkapkan.' : 'Tick off each pillar as you complete it.' },
    { icon: <IconMeetings />, title: ms ? 'Rekod pertemuan RPS' : 'Your RPS meeting log',
      body: ms ? 'Setiap sesi bersama penasihat akademik anda, tersimpan.' : 'Every session with your advisor, kept in one place.' },
  ]

  return (
    <aside
      className="relative overflow-hidden px-6 py-8 lg:w-[52%] lg:px-12 lg:py-12"
      style={{
        backgroundColor: '#131F50',
        backgroundImage: 'linear-gradient(150deg, #1A2A6C 0%, #131F50 55%, #0C1435 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full opacity-20 blur-3xl"
        style={{ background: '#FFC627' }}
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div>
            <p className="font-display text-2xl font-extrabold tracking-tight text-white">myRPS</p>
            <p className="text-xs font-semibold text-gold">{t.app.tagline}</p>
          </div>
        </div>

        <h1 className="mt-7 font-display text-2xl font-extrabold leading-tight text-white lg:text-3xl xl:text-4xl">
          {ms ? 'Pantau kemajuan anda.' : 'Track your progress.'}
          <br />
          <span className="text-gold">{ms ? 'Bersama RPS anda.' : 'Alongside your RPS.'}</span>
        </h1>

        {/* Features: the whole point of the panel, so they lead on desktop */}
        <ul className="mt-7 hidden gap-x-6 gap-y-5 lg:grid lg:grid-cols-2">
          {features.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-gold">{f.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white">{f.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-white/65">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* On a phone the form must stay near the top, so this is a short list */}
        <ul className="mt-5 flex flex-wrap gap-2 lg:hidden">
          {features.slice(0, 4).map((f) => (
            <li
              key={f.title}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/85"
            >
              <span className="text-gold">{f.icon}</span>
              {f.title}
            </li>
          ))}
        </ul>

        {/* A sample of the feed — clearly labelled, so nobody reads it as real */}
        <div className="mt-8 hidden lg:block">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/45">
            <span className="text-gold"><IconFeed /></span>
            {ms ? 'Suara kohort — contoh paparan' : 'Your cohort feed — example'}
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
            <div key={sample} className="animate-fade-up">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-[#4A3400]">
                  {shown.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-bold text-white">{shown.author}</span>
                    {shown.tag && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                        {shown.tag}
                      </span>
                    )}
                    {shown.code && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                        #{shown.code}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-white/90">{shown.body}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-white/80">
                    {shown.reactions.map((r) => (
                      <span key={r} className="rounded-full bg-white/10 px-2 py-1">{r}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2.5 border-t border-white/10 pt-3">
                {shown.replies.map((reply) => (
                  <div key={reply.author} className="flex gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                        reply.rps ? 'bg-navy-500' : 'bg-white/15'
                      }`}
                    >
                      {reply.initials}
                    </span>
                    <p className="text-xs leading-relaxed text-white/75">
                      <span className="font-bold text-white">{reply.author}</span>
                      {reply.rps && (
                        <span className="ml-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold text-[#4A3400]">
                          RPS
                        </span>
                      )}{' '}
                      {reply.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-center gap-1.5">
                {samples.map((_, i) => (
                  <span
                    key={i}
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: i === sample % samples.length ? 18 : 6,
                      background: i === sample % samples.length ? '#FFC627' : 'rgba(255,255,255,.25)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {(canInstall || showIosHint) && (
          <div className="mt-7 rounded-2xl border border-gold/30 bg-gold/10 p-3.5">
            {canInstall ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white">{t.auth.install}</span>
                  <span className="block text-xs text-white/70">{t.auth.installHint}</span>
                </span>
                <button onClick={() => void install()} className="btn-accent shrink-0 px-4 py-2 text-xs">
                  {t.auth.install}
                </button>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-white/80">
                <span className="font-bold text-white">{t.auth.installHint}.</span>{' '}
                {t.auth.iosInstall}
              </p>
            )}
          </div>
        )}

        <ul className="mt-7 hidden flex-wrap gap-1.5 xl:flex">
          {t.app.pillarsShort.map((p, i) => (
            <li
              key={p}
              className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/70"
            >
              <span className="font-bold text-gold">P{i + 1}</span> {p}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}


interface Sample {
  initials: string; author: string; tag?: string; code?: string
  body: string; reactions: string[]
  replies: { initials: string; author: string; body: string; rps?: boolean }[]
}

const SAMPLES_MS: Sample[] = [
  {
    initials: 'AZ', author: 'Aina Zulaikha', tag: '🤝 Perlu bantuan', code: 'NMK21103',
    body: 'Siapa ambil Electromagnetic Theory semester ni? Chapter 3 memang pening 😩',
    reactions: ['👏 4', '🔥 6', '💪 2'],
    replies: [
      { initials: 'HF', author: 'Haziq Firdaus', body: 'Aku dah lepas semester lepas. Jom study group Sabtu ni?' },
      { initials: 'MZ', author: 'Dr. Zamri', rps: true, body: 'Bagus. Saya boleh tempah bilik perbincangan — jumpa saya lepas kelas.' },
    ],
  },
  {
    initials: 'NS', author: 'Nurul Syafiqah', tag: '⭐ 7 Pillars',
    body: 'Baru habis Program Jiwa Murni di Kangar. Pillar 3 ✅ — tinggal dua lagi!',
    reactions: ['👏 9', '🔥 3'],
    replies: [
      { initials: 'AK', author: 'Amir Khairul', body: 'Power! Aku pun nak join batch depan.' },
      { initials: 'MZ', author: 'Dr. Zamri', rps: true, body: 'Syabas. Saya dah sahkan pillar anda.' },
    ],
  },
  {
    initials: 'MZ', author: 'Dr. Zamri', tag: '📣 Pengumuman',
    body: 'Pendaftaran kursus Semester 2 bermula minggu depan. Kemas kini rekod anda dulu supaya kita boleh semak bersama.',
    reactions: ['👏 12', '💪 5'],
    replies: [
      { initials: 'AZ', author: 'Aina Zulaikha', body: 'Noted Dr. Saya dah masukkan semua kursus semester lepas.' },
    ],
  },
]

const SAMPLES_EN: Sample[] = [
  {
    initials: 'AZ', author: 'Aina Zulaikha', tag: '🤝 Needs help', code: 'NMK21103',
    body: 'Anyone else taking Electromagnetic Theory? Chapter 3 is melting my brain 😩',
    reactions: ['👏 4', '🔥 6', '💪 2'],
    replies: [
      { initials: 'HF', author: 'Haziq Firdaus', body: 'Passed it last semester — study group on Saturday?' },
      { initials: 'MZ', author: 'Dr. Zamri', rps: true, body: 'Good idea. I can book a discussion room — see me after class.' },
    ],
  },
  {
    initials: 'NS', author: 'Nurul Syafiqah', tag: '⭐ 7 Pillars',
    body: 'Just finished the Jiwa Murni programme in Kangar. Pillar 3 done ✅ — two to go!',
    reactions: ['👏 9', '🔥 3'],
    replies: [
      { initials: 'AK', author: 'Amir Khairul', body: 'Nice! I am joining the next batch.' },
      { initials: 'MZ', author: 'Dr. Zamri', rps: true, body: 'Well done. I have verified your pillar.' },
    ],
  },
  {
    initials: 'MZ', author: 'Dr. Zamri', tag: '📣 Announcement',
    body: 'Semester 2 course registration opens next week. Update your records first so we can go through them together.',
    reactions: ['👏 12', '💪 5'],
    replies: [
      { initials: 'AZ', author: 'Aina Zulaikha', body: 'Noted Dr. I have entered all of last semester already.' },
    ],
  },
]
