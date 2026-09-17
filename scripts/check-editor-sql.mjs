#!/usr/bin/env node
/**
 * Files meant to be pasted into the Supabase SQL Editor must be plain SQL.
 * psql backslash commands (\set, \echo, \i ...) are a psql feature — the
 * editor sends the text straight to Postgres, which rejects them with
 * "syntax error at or near \". Testing such a file with psql hides the bug,
 * which is exactly how one shipped.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = ['RUN_THIS_IN_SUPABASE.sql', 'FIX_MY_LOGIN.sql', 'MIGRATE_TERMS.sql', 'MIGRATE_FIXES.sql', 'MIGRATE_FEED.sql', 'MIGRATE_AVATARS.sql', 'MIGRATE_PROFILES.sql', 'MIGRATE_VISIBLE_PROFILES.sql', 'MIGRATE_DEMO_STUDENT.sql', 'MIGRATE_EXEMPTIONS.sql', 'CHECK_DATABASE.sql']
let bad = false

for (const name of files) {
  const path = join(root, name)
  if (!existsSync(path)) continue
  const offenders = readFileSync(path, 'utf8')
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => /^\s*\\[a-z]/i.test(line))

  if (offenders.length) {
    bad = true
    console.error(`${name}: psql-only commands, will fail in the SQL Editor:`)
    for (const o of offenders) console.error(`  line ${o.n}: ${o.line.trim()}`)
  } else {
    console.log(`${name}: plain SQL, safe to paste`)
  }
}
process.exit(bad ? 1 : 0)
