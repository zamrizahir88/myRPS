import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { creditProgress, computeGpa } from '../lib/academic'
import type { GradeScale, StudentRecord, Subject, SubjectCategory } from '../lib/types'

interface Options {
  userId: string | undefined
  programmeCode: string | null | undefined
  intakeYear: string | null | undefined
}

export function useAcademic({ userId, programmeCode, intakeYear }: Options) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [records, setRecords] = useState<StudentRecord[]>([])
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

    const [subs, recs, gs, reqs] = await Promise.all([
      supabase.from('curriculum_subjects').select('*')
        .eq('programme_code', programme).eq('intake_year', intake)
        .eq('is_active', true).order('planned_semester').order('code'),
      supabase.from('student_records').select('*').eq('user_id', userId),
      supabase.from('grade_scale').select('*').order('sort_order'),
      supabase.from('curriculum_requirements').select('category, required_credits')
        .eq('programme_code', programme).eq('intake_year', intake),
    ])

    const firstError = subs.error ?? recs.error ?? gs.error ?? reqs.error
    if (firstError) setError(firstError.message)

    setSubjects((subs.data as Subject[]) ?? [])
    setRecords((recs.data as StudentRecord[]) ?? [])
    setGrades((gs.data as GradeScale[]) ?? [])
    setRequirements((reqs.data as { category: SubjectCategory; required_credits: number }[]) ?? [])
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

  const gpa = useMemo(
    () => computeGpa(records, subjectMap, gradeMap),
    [records, subjectMap, gradeMap],
  )

  const semesterGpas = useMemo(() => {
    const semesters = [...new Set(records.map((r) => r.semester_taken).filter(Boolean))].sort() as string[]
    return semesters
      .map((sem) => ({ semester: sem, ...computeGpa(records, subjectMap, gradeMap, sem) }))
      .filter((s) => s.gpa !== null)
  }, [records, subjectMap, gradeMap])

  return {
    subjects, records, grades, subjectMap, gradeMap, requirementMap,
    progress, gpa, semesterGpas, loading, error, reload: load,
  }
}
