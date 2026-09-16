export type ApprovalState = 'pending' | 'approved' | 'rejected'
export type RecordState = 'planned' | 'active' | 'pass' | 'fail' | 'exempted'
export type SubjectCategory =
  | 'core' | 'elective' | 'common_core' | 'university' | 'cocurriculum' | 'audit'

export type IntelligenceKey =
  | 'linguistic' | 'logical' | 'musical' | 'kinesthetic'
  | 'spatial' | 'interpersonal' | 'intrapersonal'

export interface Profile {
  id: string
  approval_state: ApprovalState
  full_name: string | null
  matric_no: string | null
  ic_no: string | null
  date_of_birth: string | null
  birth_state: string | null
  gender: string | null
  disability: string | null
  race: string | null
  religion: string | null
  nationality: string | null
  marital_status: string | null
  parental_income: string | null
  email_personal: string | null
  email_official: string | null
  phone_home: string | null
  phone_mobile: string | null
  address_line: string | null
  postcode: string | null
  city: string | null
  state: string | null
  hostel_status: string | null
  kin_name: string | null
  kin_relation: string | null
  kin_phone: string | null
  father_occupation: string | null
  mother_occupation: string | null
  dependents_count: number | null
  parent_address: string | null
  programme_code: string | null
  intake_year: string | null
  intake_semester: string | null
  entry_type: string | null
  programme_mode: string | null
  spm_results: Record<string, string> | null
  stpm_results: Record<string, string> | null
  muet_band: string | null
  sponsor_name: string | null
  career_goal: string | null
  avatar_path: string | null
  consent_version: string | null
  consent_at: string | null
  is_demo: boolean
  profile_completed: boolean
  rejection_reason: string | null
  created_at: string
}

export interface Subject {
  id: string
  programme_code: string
  intake_year: string
  code: string
  name_en: string
  name_ms: string | null
  credit: number
  category: SubjectCategory
  planned_semester: number | null
  is_graded: boolean
  counts_to_total: boolean
  is_active: boolean
}

export interface StudentTerm {
  id: string
  user_id: string
  session: string      // '2026/2027'
  semester: number     // 1, 2, or 3 for Semester Tambahan
  study_year: number
  created_at: string
}

export interface StudentRecord {
  id: string
  user_id: string
  subject_id: string
  attempt_no: number
  state: RecordState
  grade: string | null
  semester_taken: string | null
  term_id: string | null
}

export interface GradeScale {
  grade: string
  points: number
  is_pass: boolean
  sort_order: number
}

export interface PsychometricAttempt {
  id: string
  user_id: string
  attempt_no: number
  responses: Record<string, number>
  linguistic: number
  logical: number
  musical: number
  kinesthetic: number
  spatial: number
  interpersonal: number
  intrapersonal: number
  strength: IntelligenceKey
  weakness: IntelligenceKey
  taken_at: string
}

export interface PsychometricItem {
  question_no: number
  intelligence: IntelligenceKey
  text_en: string
  text_ms: string | null
}

export interface Meeting {
  id: string
  user_id: string
  meeting_at: string
  location: string
  topic: string
  student_notes: string | null
  rps_notes: string | null
  verified: boolean
  created_by: string
  created_at: string
}

export interface PillarCompletion {
  id: string
  user_id: string
  pillar_code: string
  activity_name: string | null
  completed_on: string | null
  verified: boolean
}

export interface ChatMessage {
  id: string
  user_id: string
  body: string
  is_announcement: boolean
  deleted_at: string | null
  created_at: string
}

export interface StudentSummary {
  user_id: string
  full_name: string | null
  matric_no: string | null
  approval_state: ApprovalState
  programme_code: string | null
  intake_year: string | null
  profile_completed: boolean
  career_goal: string | null
  is_demo: boolean
  is_staff: boolean
  current_session: string | null
  current_semester: number | null
  current_study_year: number | null
  credits_earned: number
  credits_required: number
  cgpa: number | null
  pillars_done: number
  meetings_total: number
  meetings_verified: number
  last_meeting_at: string | null
  open_fails: number
  has_psychometric: boolean
}

export interface LeaderboardRow {
  user_id: string
  full_name: string | null
  pillars_done: number
  meetings_verified: number
  points: number
  badge_pillars_master: boolean
  badge_improving: boolean
}

// Minimal shape for the typed client; the app reads/writes through the
// interfaces above rather than a generated schema.
export type Database = any
