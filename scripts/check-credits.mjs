#!/usr/bin/env node
/**
 * The credit and GPA rules, exercised directly. These are the numbers a
 * student's degree is judged by, and they used to be wrong in two ways that no
 * screenshot would reveal: repeats were ranked by an attempt_no nothing sets,
 * and a later failed re-sit could erase credit already earned.
 *
 *   node scripts/check-credits.mjs
 */
import { build } from 'esbuild'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = join(mkdtempSync(join(tmpdir(), 'myrps-credits-')), 'academic.mjs')
await build({
  entryPoints: ['src/lib/academic.ts'],
  outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
})
const { creditProgress, computeGpa, registeredCredits, earnedSubjects } = await import(out)

const failures = []
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures.push(name)
  console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, wanted ${JSON.stringify(expected)})`}`)
}

// ---- a tiny curriculum ------------------------------------------------------
const subject = (id, credit, category, extra = {}) => [id, {
  id, credit, category, is_graded: true, counts_to_total: true, ...extra,
}]
const subjects = new Map([
  subject('maths', 3, 'core'),
  subject('programming', 4, 'core'),
  subject('ethics', 2, 'university'),
  subject('training', 6, 'core', { is_graded: false }),   // pass/fail, no grade point
  subject('extra', 3, 'elective'),
  subject('spare', 3, 'elective'),
])
const grades = new Map([
  ['A', { grade: 'A', points: 4 }], ['B', { grade: 'B', points: 3 }],
  ['C', { grade: 'C', points: 2 }], ['E', { grade: 'E', points: 0 }],
])
const requirements = new Map([['core', 13], ['university', 2], ['elective', 3]])
// Terms, newest last. The key is what ranks a repeat.
const termKeys = new Map([['t1', '2026/2027-1'], ['t2', '2026/2027-2'], ['t3', '2027/2028-1']])

let seq = 0
const rec = (subject_id, state, grade, term_id) =>
  ({ id: `r${seq++}`, subject_id, state, grade: grade ?? null, term_id: term_id ?? null, attempt_no: 1 })

// ---- a repeat counts once, and the pass is the one that counts --------------
const repeated = [
  rec('maths', 'fail', 'E', 't1'),
  rec('maths', 'pass', 'C', 't2'),
]
check('a repeated subject earns its credit once, not twice',
  creditProgress(repeated, subjects, requirements).totalEarned, 3)
check('the repeat, not the first attempt, sets the CGPA',
  computeGpa(repeated, subjects, grades, termKeys).gpa, 2)
check('the failed attempt leaves the credits the CGPA is divided by',
  computeGpa(repeated, subjects, grades, termKeys).credits, 3)

// ---- rows in any order, because the database does not promise one -----------
check('the same two rows in the other order give the same CGPA',
  computeGpa([...repeated].reverse(), subjects, grades, termKeys).gpa, 2)

// ---- credit once earned is banked -------------------------------------------
const passedThenResat = [
  rec('maths', 'pass', 'C', 't1'),
  rec('maths', 'fail', 'E', 't2'),
]
check('a later failed re-sit cannot take back credit already earned',
  creditProgress(passedThenResat, subjects, requirements).totalEarned, 3)
check('but the CGPA follows the latest attempt, even downward',
  computeGpa(passedThenResat, subjects, grades, termKeys).gpa, 0)

// ---- exemptions ------------------------------------------------------------
const withExemption = [
  rec('maths', 'pass', 'A', 't1'),
  rec('ethics', 'exempted', null, null),       // no semester, no grade
]
const p = creditProgress(withExemption, subjects, requirements)
check('credits taken and credits exempted are counted apart', [p.taken, p.exempted], [3, 2])
check('the total is the two added together', p.totalEarned, 5)
check('an exemption never touches the CGPA',
  computeGpa(withExemption, subjects, grades, termKeys).gpa, 4)

const satItAnyway = [
  rec('maths', 'exempted', null, null),
  rec('maths', 'pass', 'B', 't1'),
]
check('sitting a subject outranks an exemption for the same subject',
  earnedSubjects(satItAnyway, subjects).map((e) => e.source), ['pass'])
check('and it is still only counted once',
  creditProgress(satItAnyway, subjects, requirements).totalEarned, 3)

// ---- pass/fail subjects carry credit but no grade point ---------------------
const training = [rec('training', 'pass', null, 't1')]
check('industrial training earns credit', creditProgress(training, subjects, requirements).totalEarned, 6)
check('industrial training has no CGPA effect',
  computeGpa(training, subjects, grades, termKeys).gpa, null)

// ---- the graduation bar stays capped, the earned total does not -------------
const extraElectives = [
  rec('extra', 'pass', 'A', 't1'),
  rec('spare', 'pass', 'A', 't1'),
]
const q = creditProgress(extraElectives, subjects, requirements)
check('a third elective cannot inflate progress toward graduation', q.earned, 3)
check('but the student is still told what they really earned', q.totalEarned, 6)

// ---- the load they are carrying now ----------------------------------------
const thisTerm = [
  rec('maths', 'active', null, 't3'),
  rec('programming', 'active', null, 't3'),
  rec('ethics', 'pass', 'A', 't2'),            // last semester, not this one
  rec('extra', 'planned', null, 't3'),         // planned is not registered
]
check('registered credits count this semester only', registeredCredits(thisTerm, subjects, 't3'), 7)
check('a repeat still costs the student its hours',
  registeredCredits([...thisTerm, rec('spare', 'fail', 'E', 't3')], subjects, 't3'), 10)
check('no current semester, no load', registeredCredits(thisTerm, subjects, undefined), 0)

console.log(failures.length ? `\n${failures.length} failing` : '\nCredit rules OK')
process.exit(failures.length ? 1 : 0)
