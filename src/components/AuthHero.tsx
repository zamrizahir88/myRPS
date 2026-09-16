import { useI18n } from '../i18n'
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
  const ms = locale === 'ms'

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
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-[#4A3400]">
                AZ
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-bold text-white">Aina Zulaikha</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                    🤝 {ms ? 'Perlu bantuan' : 'Needs help'}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                    #NMK21103
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-white/90">
                  {ms
                    ? 'Siapa ambil Electromagnetic Theory semester ni? Chapter 3 memang pening 😩'
                    : 'Anyone else taking Electromagnetic Theory? Chapter 3 is melting my brain 😩'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-white/80">
                  <span className="rounded-full bg-gold/20 px-2 py-1">👏 4</span>
                  <span className="rounded-full bg-white/10 px-2 py-1">🔥 6</span>
                  <span className="rounded-full bg-white/10 px-2 py-1">💪 2</span>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2.5 border-t border-white/10 pt-3">
              <div className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white">
                  HF
                </span>
                <p className="text-xs leading-relaxed text-white/75">
                  <span className="font-bold text-white">Haziq Firdaus</span>{' '}
                  {ms
                    ? 'Aku dah lepas semester lepas. Jom study group Sabtu ni?'
                    : 'Passed it last semester — study group on Saturday?'}
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-500 text-[11px] font-bold text-white">
                  MZ
                </span>
                <p className="text-xs leading-relaxed text-white/75">
                  <span className="font-bold text-white">Dr. Zamri</span>
                  <span className="ml-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold text-[#4A3400]">
                    RPS
                  </span>{' '}
                  {ms
                    ? 'Bagus. Saya boleh tempah bilik perbincangan — jumpa saya lepas kelas.'
                    : 'Good idea. I can book a discussion room — see me after class.'}
                </p>
              </div>
            </div>
          </div>
        </div>

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
