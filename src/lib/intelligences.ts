import type { IntelligenceKey } from './types'

export const INTELLIGENCE_KEYS: IntelligenceKey[] = [
  'linguistic', 'logical', 'musical', 'kinesthetic',
  'spatial', 'interpersonal', 'intrapersonal',
]

export const MAX_SCORE_PER_INTELLIGENCE = 40 // 10 statements x 4 points

interface Definition {
  /** Persona title shown on the result card. */
  title_en: string
  title_ms: string
  name_en: string
  name_ms: string
  accent: string
  traits_en: string[]
  traits_ms: string[]
  figures: string
  careers_en: string
  careers_ms: string
  /** Study tips the RPS can point at during a meeting. */
  study_en: string
  study_ms: string
}

// Descriptions follow Lampiran 2 (Definisi Psikometrik) of MODUL RPS 2025.
export const DEFINITIONS: Record<IntelligenceKey, Definition> = {
  linguistic: {
    title_en: 'The Wordsmith', title_ms: 'Sang Pencerita',
    name_en: 'Linguistic', name_ms: 'Linguistik',
    accent: '#2a78d6',
    traits_en: [
      'Sensitive to spoken and written language',
      'Picks up new languages readily',
      'Uses language to reach a goal',
      'Expresses ideas rhetorically or poetically',
    ],
    traits_ms: [
      'Kepekaan terhadap bahasa lisan dan tulisan',
      'Kebolehan mempelajari bahasa baharu',
      'Menggunakan bahasa untuk mencapai matlamat',
      'Menyatakan diri secara retorik atau puitis',
    ],
    figures: 'Shakespeare, Oprah Winfrey',
    careers_en: 'Lawyer, speaker/host, writer, journalist, curator',
    careers_ms: 'Peguam, penceramah/hos, penulis, wartawan, kurator',
    study_en: 'Rewrite notes in your own words; explain a topic aloud before the exam.',
    study_ms: 'Tulis semula nota dengan ayat sendiri; terangkan topik secara lisan sebelum peperiksaan.',
  },
  logical: {
    title_en: 'The Analyst', title_ms: 'Sang Penganalisis',
    name_en: 'Logical-Mathematical', name_ms: 'Logik-Matematik',
    accent: '#1baf7a',
    traits_en: [
      'Analyses problems logically',
      'Comfortable with mathematics and scientific inquiry',
      'Uses abstraction, reasoning and critical thinking',
      'Understands the underlying principles of a causal system',
    ],
    traits_ms: [
      'Analisis masalah secara logik',
      'Operasi matematik dan penyelidikan saintifik',
      'Menggunakan logik, abstraksi, penaakulan dan pemikiran kritis',
      'Memahami prinsip asas sistem kausal',
    ],
    figures: 'Albert Einstein, Bill Gates',
    careers_en: 'Mathematician, accountant, statistician, scientist, systems analyst',
    careers_ms: 'Ahli matematik, akauntan, ahli statistik, ahli sains, penganalisis komputer',
    study_en: 'Work from worked examples to first principles; build your own formula sheet.',
    study_ms: 'Belajar daripada contoh berjawapan kepada prinsip asas; bina helaian formula sendiri.',
  },
  musical: {
    title_en: 'The Composer', title_ms: 'Sang Pemuzik',
    name_en: 'Musical', name_ms: 'Muzikal',
    accent: '#eb6834',
    traits_en: [
      'Skilled in performance, composition and appreciation of music',
      'Recognises, distinguishes and creates music',
      'Sensitive to rhythm, pitch, melody and tone colour',
    ],
    traits_ms: [
      'Kemahiran persembahan, gubahan dan apresiasi muzik',
      'Mengenal, membezakan, mencipta dan mengekspresikan muzik',
      'Kepekaan terhadap irama, pic, melodi dan warna tona',
    ],
    figures: 'Beethoven, Ed Sheeran',
    careers_en: 'Singer, songwriter, DJ, musician',
    careers_ms: 'Penyanyi, penggubah lagu, DJ, pemuzik',
    study_en: 'Study to instrumental music; turn sequences and formulas into rhythms.',
    study_ms: 'Belajar dengan muzik instrumental; jadikan urutan dan formula sebagai irama.',
  },
  kinesthetic: {
    title_en: 'The Maker', title_ms: 'Sang Pencipta',
    name_en: 'Bodily-Kinesthetic', name_ms: 'Kinestetik-Tubuh',
    accent: '#eda100',
    traits_en: [
      'Uses the body to solve problems or make things',
      'Flexibility, balance, agility, strength',
      'Excels in sport, dance, acting and handcraft',
    ],
    traits_ms: [
      'Menggunakan tubuh untuk selesaikan masalah atau hasilkan produk',
      'Keluwesan, keseimbangan, ketangkasan dan kekuatan',
      'Cemerlang dalam sukan, tarian, lakonan dan kraftangan',
    ],
    figures: 'Michael Jordan, Simone Biles',
    careers_en: 'Dancer, athlete, surgeon, mechanic, carpenter, physiotherapist',
    careers_ms: 'Penari, atlet, pakar bedah, mekanik, tukang kayu, ahli terapi fizikal',
    study_en: 'Learn in the lab before the lecture notes; study standing up, in short bursts.',
    study_ms: 'Belajar di makmal sebelum nota kuliah; ulang kaji sambil berdiri, dalam sesi pendek.',
  },
  spatial: {
    title_en: 'The Visualiser', title_ms: 'Sang Pereka',
    name_en: 'Spatial-Visual', name_ms: 'Spatial',
    accent: '#4a3aa7',
    traits_en: [
      'Accurate perception of the visual-spatial world',
      'Transforms and manipulates visual information',
      'Strong at visualisation, drawing, sense of direction, maps',
    ],
    traits_ms: [
      'Persepsi tepat dunia visual-ruang',
      'Kebolehan mengubah dan memanipulasi maklumat visual',
      'Kemahiran visualisasi, melukis, deria arah, teka-teki, peta',
    ],
    figures: 'Frank Lloyd Wright, Amelia Earhart',
    careers_en: 'Pilot, surgeon, architect, graphic artist, interior designer',
    careers_ms: 'Juruterbang, pakar bedah, arkitek, artis grafik, pereka hiasan dalaman',
    study_en: 'Redraw every concept as a diagram; use mind maps and colour-coded circuits.',
    study_ms: 'Lukis semula setiap konsep sebagai rajah; guna peta minda dan litar berwarna.',
  },
  interpersonal: {
    title_en: 'The Connector', title_ms: 'Sang Perantara',
    name_en: 'Interpersonal', name_ms: 'Interpersonal',
    accent: '#e87ba4',
    traits_en: [
      'Understands the intentions and motivations of others',
      'Interacts and collaborates effectively',
      'Sensitive to the moods and feelings of individuals',
    ],
    traits_ms: [
      'Memahami niat, motivasi dan kehendak orang lain',
      'Berinteraksi dan bekerjasama dengan berkesan',
      'Kepekaan terhadap emosi, perangai dan motivasi individu',
    ],
    figures: 'Mahatma Gandhi, Mother Teresa',
    careers_en: 'Teacher, psychologist, manager, sales engineer, public relations',
    careers_ms: 'Guru, ahli psikologi, pengurus, jurutera jualan, perhubungan awam',
    study_en: 'Form a study group; you learn most by teaching the material to someone else.',
    study_ms: 'Bentuk kumpulan belajar; anda paling banyak belajar dengan mengajar orang lain.',
  },
  intrapersonal: {
    title_en: 'The Reflector', title_ms: 'Sang Pemikir',
    name_en: 'Intrapersonal', name_ms: 'Intrapersonal',
    accent: '#e34948',
    traits_en: [
      'Understands own desires, fears and capacities',
      'Orders life around self-knowledge',
      'Recognises and interprets own emotions and motivations',
    ],
    traits_ms: [
      'Memahami diri sendiri (keinginan, ketakutan, kebolehan)',
      'Mengatur kehidupan berdasarkan kesedaran diri',
      'Mengenal dan memahami emosi, motivasi dan niat diri',
    ],
    figures: 'Aristotle, Maya Angelou',
    careers_en: 'Therapist, psychologist, counsellor, entrepreneur, clergy',
    careers_ms: 'Terapis, ahli psikologi, kaunselor, usahawan, ahli agama',
    study_en: 'Plan your own schedule and review it weekly; quiet solo study suits you.',
    study_ms: 'Rancang jadual sendiri dan semak setiap minggu; belajar bersendirian sesuai untuk anda.',
  },
}

/** Sums the 1–4 responses into a score per intelligence. */
export function scoreResponses(
  responses: Record<number, number>,
  items: { question_no: number; intelligence: IntelligenceKey }[],
): Record<IntelligenceKey, number> {
  const totals = Object.fromEntries(
    INTELLIGENCE_KEYS.map((k) => [k, 0]),
  ) as Record<IntelligenceKey, number>

  for (const item of items) {
    const value = responses[item.question_no]
    if (value) totals[item.intelligence] += value
  }
  return totals
}

export function strengthAndWeakness(scores: Record<IntelligenceKey, number>) {
  const sorted = [...INTELLIGENCE_KEYS].sort((a, b) => scores[b] - scores[a])
  return { strength: sorted[0], weakness: sorted[sorted.length - 1] }
}
