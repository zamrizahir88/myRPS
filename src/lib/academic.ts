import type { GradeScale, StudentRecord, Subject, SubjectCategory } from './types'

export const CATEGORY_ORDER: SubjectCategory[] = [
  'core', 'elective', 'common_core', 'university', 'cocurriculum', 'audit',
]

/**
 * Ranks a record the way the database views do: the term it happened in, with
 * a term-less row last. attempt_no breaks a tie, for rows written before terms
 * existed. Ranking by attempt_no alone was wrong — nothing has set it since
 * terms arrived, so every row is 1 and whichever row the database happened to
 * return first won.
 */
function rankOf(r: StudentRecord, termKeys?: Map<string, string>): string {
  return (r.term_id && termKeys?.get(r.term_id)) || ''
}

export type EarnedSource = 'pass' | 'exempted'

/**
 * One entry per subject the student has cleared, and how they cleared it.
 *
 * A subject counts once however many times it was taken: SMQ11103 passed on
 * the second attempt is 3 credits, not 6. And a pass is banked — a later
 * attempt can change the grade that counts toward CGPA, but it can never take
 * the credit back. An exam pass outranks an exemption: if they sat it, that is
 * what happened.
 */
export function earnedSubjects(
  records: StudentRecord[],
  subjects: Map<string, Subject>,
): { subject: Subject; source: EarnedSource }[] {
  const source = new Map<string, EarnedSource>()
  for (const r of records) {
    if (r.state === 'pass') source.set(r.subject_id, 'pass')
    else if (r.state === 'exempted' && !source.has(r.subject_id)) source.set(r.subject_id, 'exempted')
  }
  const out: { subject: Subject; source: EarnedSource }[] = []
  for (const [subjectId, src] of source) {
    const subject = subjects.get(subjectId)
    if (subject) out.push({ subject, source: src })
  }
  return out
}

export interface CreditProgress {
  /** Toward graduation: capped per category, so a third elective cannot inflate it. */
  earned: number
  required: number
  percent: number
  byCategory: { category: SubjectCategory; earned: number; required: number }[]
  /** Credits earned by sitting the subject and passing it. */
  taken: number
  /** Credits granted as exemptions — no grade, no GPA effect. */
  exempted: number
  /** taken + exempted, uncapped: what the student has actually earned. */
  totalEarned: number
}

export function creditProgress(
  records: StudentRecord[],
  subjects: Map<string, Subject>,
  requirements: Map<SubjectCategory, number>,
): CreditProgress {
  const earnedBy = new Map<SubjectCategory, number>()
  let taken = 0
  let exempted = 0

  for (const { subject, source } of earnedSubjects(records, subjects)) {
    if (!subject.counts_to_total) continue
    earnedBy.set(subject.category, (earnedBy.get(subject.category) ?? 0) + subject.credit)
    if (source === 'pass') taken += subject.credit
    else exempted += subject.credit
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
    taken,
    exempted,
    totalEarned: taken + exempted,
  }
}

/**
 * The load a student is carrying in one term: everything registered, repeats
 * included. A repeat costs them the same hours whether or not the credit is
 * new, which is the point of watching this number.
 */
export function registeredCredits(
  records: StudentRecord[],
  subjects: Map<string, Subject>,
  termId: string | undefined,
): number {
  if (!termId) return 0
  let total = 0
  for (const r of records) {
    if (r.term_id !== termId) continue
    if (r.state !== 'active' && r.state !== 'pass' && r.state !== 'fail') continue
    total += subjects.get(r.subject_id)?.credit ?? 0
  }
  return total
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
  termKeys?: Map<string, string>,
): { gpa: number | null; credits: number } {
  // The latest graded attempt of each subject, and only that one.
  const latest = new Map<string, StudentRecord>()
  for (const r of records) {
    if (r.state !== 'pass' && r.state !== 'fail') continue
    if (!r.grade) continue
    const current = latest.get(r.subject_id)
    if (!current) { latest.set(r.subject_id, r); continue }
    const [a, b] = [rankOf(r, termKeys), rankOf(current, termKeys)]
    if (a > b || (a === b && r.attempt_no > current.attempt_no)) latest.set(r.subject_id, r)
  }

  let weighted = 0
  let credits = 0
  for (const r of latest.values()) {
    const s = subjects.get(r.subject_id)
    const g = r.grade ? grades.get(r.grade) : undefined
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
