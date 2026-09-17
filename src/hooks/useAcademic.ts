import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { creditProgress, computeGpa, registeredCredits, termKey } from '../lib/academic'
import type { GradeScale, StudentRecord, StudentTerm, Subject, SubjectCategory } from '../lib/types'

interface Options {
  userId: string | undefined
  programmeCode: string | null | undefined
  intakeYear: string | null | undefined
}

export function useAcademic({ userId, programmeCode, intakeYear }: Options) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [records, setRecords] = useState<StudentRecord[]>([])
  const [terms, setTerms] = useState<StudentTerm[]>([])
  const [grades, setGrades] = useState<GradeScale[]>([])
  const [requirements, setRequirements] = useState<{ category: SubjectCategory; required_credits: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    const programme = programmeCode ?? 'UR6523007'
    const intake = intakeYear ?? '2025'

    const [subs, recs, gs, reqs, trms] = await Promise.all([
      supabase.from('curriculum_subjects').select('*')
        .eq('programme_code', programme).eq('intake_year', intake)
        .eq('is_active', true).order('planned_semester').order('code'),
      supabase.from('student_records').select('*').eq('user_id', userId),
      supabase.from('grade_scale').select('*').order('sort_order'),
      supabase.from('curriculum_requirements').select('category, required_credits')
        .eq('programme_code', programme).eq('intake_year', intake),
      supabase.from('student_terms').select('*').eq('user_id', userId),
    ])

    const firstError = subs.error ?? recs.error ?? gs.error ?? reqs.error ?? trms.error
    if (firstError) setError(firstError.message)

    setSubjects((subs.data as Subject[]) ?? [])
    setRecords((recs.data as StudentRecord[]) ?? [])
    setGrades((gs.data as GradeScale[]) ?? [])
    setRequirements((reqs.data as { category: SubjectCategory; required_credits: number }[]) ?? [])
    // newest term first — that is the one the student is working in
    setTerms(((trms.data as StudentTerm[]) ?? []).sort((a, b) =>
      `${b.session}-${b.semester}`.localeCompare(`${a.session}-${a.semester}`)))
    setLoading(false)
  }, [userId, programmeCode, intakeYear])

  useEffect(() => { void load() }, [load])

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects])
  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.grade, g])), [grades])
  const requirementMap = useMemo(
    () => new Map(requirements.map((r) => [r.category, r.required_credits])),
    [requirements],
  )

  const progress = useMemo(
    () => creditProgress(records, subjectMap, requirementMap),
    [records, subjectMap, requirementMap],
  )

  /** term id -> sortable key, so a repeat is ranked by when it happened. */
  const termKeys = useMemo(
    () => new Map(terms.map((t) => [t.id, termKey(t)])),
    [terms],
  )

  const gpa = useMemo(
    () => computeGpa(records, subjectMap, gradeMap, termKeys),
    [records, subjectMap, gradeMap, termKeys],
  )

  /** The term the student is in now, and the load they are carrying in it. */
  const currentTerm = terms[0]
  const currentTermCredits = useMemo(
    () => registeredCredits(records, subjectMap, currentTerm?.id),
    [records, subjectMap, currentTerm?.id],
  )

  /** Exemptions belong to no semester, so they are kept out of the term list. */
  const exemptions = useMemo(
    () => records.filter((r) => r.state === 'exempted' && !r.term_id),
    [records],
  )

  /** GPA for each term as it happened, oldest first, for the trend. */
  const termGpas = useMemo(() => {
    return [...terms]
      .sort((a, b) => `${a.session}-${a.semester}`.localeCompare(`${b.session}-${b.semester}`))
      .map((term) => {
        const inTerm = records.filter((r) => r.term_id === term.id)
        let weighted = 0
        let credits = 0
        for (const r of inTerm) {
          const subject = subjectMap.get(r.subject_id)
          const grade = r.grade ? gradeMap.get(r.grade) : undefined
          if (!subject?.is_graded || !grade) continue
          if (r.state !== 'pass' && r.state !== 'fail') continue
          weighted += grade.points * subject.credit
          credits += subject.credit
        }
        return {
          term,
          gpa: credits > 0 ? Math.round((weighted / credits) * 100) / 100 : null,
          credits,
        }
      })
      .filter((t) => t.gpa !== null)
  }, [terms, records, subjectMap, gradeMap])

  return {
    subjects, records, terms, grades, subjectMap, gradeMap, requirementMap,
    progress, gpa, termGpas, currentTerm, currentTermCredits, exemptions,
    loading, error, reload: load,
  }
}
