import type { GradeScale, StudentRecord, Subject, SubjectCategory } from './types'

export const CATEGORY_ORDER: SubjectCategory[] = [
  'core', 'elective', 'common_core', 'university', 'cocurriculum', 'audit',
]

/**
 * One row per subject, keeping the highest attempt number. A repeated subject
 * must count once — SMQ11103 taken three times is still 3 credits, not 9.
 */
function latestAttempts(records: StudentRecord[]): StudentRecord[] {
  const best = new Map<string, StudentRecord>()
  for (const r of records) {
    const current = best.get(r.subject_id)
    if (!current || r.attempt_no > current.attempt_no) best.set(r.subject_id, r)
  }
  return [...best.values()]
}

export interface CreditProgress {
  earned: number
  required: number
  percent: number
  byCategory: { category: SubjectCategory; earned: number; required: number }[]
}

export function creditProgress(
  records: StudentRecord[],
  subjects: Map<string, Subject>,
  requirements: Map<SubjectCategory, number>,
): CreditProgress {
  const earnedBy = new Map<SubjectCategory, number>()

  for (const r of latestAttempts(records)) {
    if (r.state !== 'pass' && r.state !== 'exempted') continue
    const s = subjects.get(r.subject_id)
    if (!s || !s.counts_to_total) continue
    earnedBy.set(s.category, (earnedBy.get(s.category) ?? 0) + s.credit)
  }

  const byCategory = CATEGORY_ORDER
    .filter((c) => (requirements.get(c) ?? 0) > 0)
    .map((category) => ({
      category,
      // A student may take a third elective; it cannot inflate the total.
      earned: Math.min(earnedBy.get(category) ?? 0, requirements.get(category) ?? 0),
      required: requirements.get(category) ?? 0,
    }))

  const earned = byCategory.reduce((sum, c) => sum + c.earned, 0)
  const required = byCategory.reduce((sum, c) => sum + c.required, 0)

  return {
    earned,
    required,
    percent: required > 0 ? Math.round((earned / required) * 100) : 0,
    byCategory,
  }
}

/**
 * Indicative GPA. Per the RPS Panduan, when a course has been repeated the
 * failed attempt leaves both the numerator and the denominator, so only the
 * latest graded attempt of each subject counts. Pass/fail courses such as
 * Industrial Training are excluded — they carry credit but no grade point.
 */
export function computeGpa(
  records: StudentRecord[],
  subjects: Map<string, Subject>,
  grades: Map<string, GradeScale>,
  semester?: string,
): { gpa: number | null; credits: number } {
  let weighted = 0
  let credits = 0

  for (const r of latestAttempts(records)) {
    if (semester && r.semester_taken !== semester) continue
    if (!r.grade) continue
    if (r.state !== 'pass' && r.state !== 'fail') continue
    const s = subjects.get(r.subject_id)
    const g = grades.get(r.grade)
    if (!s || !g || !s.is_graded) continue
    weighted += g.points * s.credit
    credits += s.credit
  }

  return { gpa: credits > 0 ? Math.round((weighted / credits) * 100) / 100 : null, credits }
}

/** GPA a student would get if every target grade were achieved. */
export function projectedGpa(
  targets: { subject_id: string; target_grade: string }[],
  subjects: Map<string, Subject>,
  grades: Map<string, GradeScale>,
): { gpa: number | null; credits: number } {
  let weighted = 0
  let credits = 0
  for (const t of targets) {
    const s = subjects.get(t.subject_id)
    const g = grades.get(t.target_grade)
    if (!s || !g || !s.is_graded) continue
    weighted += g.points * s.credit
    credits += s.credit
  }
  return { gpa: credits > 0 ? Math.round((weighted / credits) * 100) / 100 : null, credits }
}

/** Academic sessions offered in the pickers: 2026/2027 and 15 years on. */
export function sessionOptions(): string[] {
  const out: string[] = []
  for (let y = 2026; y <= 2041; y++) out.push(`${y}/${y + 1}`)
  return out
}

/** 'Tahun 2 · Semester 1 · Sesi 2026/2027' */
export function termLabel(
  term: { study_year: number; semester: number; session: string },
  locale: 'en' | 'ms',
): string {
  const sem = term.semester === 3
    ? (locale === 'ms' ? 'Semester Tambahan' : 'Special Semester')
    : `${locale === 'ms' ? 'Semester' : 'Semester'} ${term.semester}`
  const year = locale === 'ms' ? `Tahun ${term.study_year}` : `Year ${term.study_year}`
  const session = locale === 'ms' ? `Sesi ${term.session}` : `Session ${term.session}`
  return `${year} · ${sem} · ${session}`
}

/** Sortable, matching public.term_key() in the database. */
export function termKey(term: { session: string; semester: number }): string {
  return `${term.session}-${term.semester}`
}

/** '2024-S1' -> 'Sem 1, 2024/2025'. */
export function semesterLabel(value: string | null, locale: 'en' | 'ms'): string {
  if (!value) return '—'
  const [year, part] = value.split('-')
  const session = `${year}/${Number(year) + 1}`
  if (part === 'T') return locale === 'ms' ? `Semester Tambahan ${session}` : `Special Sem ${session}`
  const n = part === 'S1' ? 1 : 2
  return locale === 'ms' ? `Sem ${n}, ${session}` : `Sem ${n}, ${session}`
}

/** Semester options from a few years back to a couple ahead. */
export function semesterOptions(): string[] {
  const now = new Date().getFullYear()
  const out: string[] = []
  for (let y = now - 6; y <= now + 1; y++) out.push(`${y}-S1`, `${y}-S2`, `${y}-T`)
  return out
}
