export interface Pillar {
  code: string
  name_en: string
  name_ms: string
  /** Cluster A: all seven compulsory. Cluster B: P1-P3 compulsory, P4-P7 optional. */
  cluster_b_optional: boolean
}

// Program 7 Pillars UniMAP, per MODUL RPS 2025 section 15.
export const PILLARS: Pillar[] = [
  { code: 'p1', name_en: 'Leadership & Character', name_ms: 'Kepimpinan & Jati Diri', cluster_b_optional: false },
  { code: 'p2', name_en: 'Patriotism & Nationhood', name_ms: 'Patriotisme & Kenegaraan', cluster_b_optional: false },
  { code: 'p3', name_en: 'Community & Volunteerism', name_ms: 'Kemasyarakatan & Kesukarelawanan', cluster_b_optional: false },
  { code: 'p4', name_en: 'Academic Empowerment', name_ms: 'Pemantapan Akademik', cluster_b_optional: true },
  { code: 'p5', name_en: 'Talent Excellence', name_ms: 'Kecemerlangan Bakat', cluster_b_optional: true },
  { code: 'p6', name_en: 'Entrepreneurship & Sustainability', name_ms: 'Keusahawanan & Kelestarian', cluster_b_optional: true },
  { code: 'p7', name_en: 'Career', name_ms: 'Kerjaya', cluster_b_optional: true },
]
