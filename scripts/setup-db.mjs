#!/usr/bin/env node
/**
 * myRPS — one-command database setup.
 *
 *   npm run db:setup
 *
 * Applies every file in supabase/ to your Supabase project, in order, then
 * verifies the result. Safe to run again: every migration is idempotent, and
 * re-running does not touch student data.
 *
 * It needs a Postgres connection string. In the Supabase dashboard press
 * **Connect** at the top, choose **Session pooler**, copy the URI, and replace
 * [YOUR-PASSWORD] with the database password you saved when you created the
 * project. Use the session pooler (port 5432), not the transaction pooler —
 * the transaction pooler cannot run some of these statements.
 *
 * Pass it as DATABASE_URL, either in .env or on the command line:
 *   DATABASE_URL="postgresql://..." npm run db:setup
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import pg from 'pg'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const checkOnly = argv.includes('--check')

function flag(name) {
  const i = argv.indexOf(name)
  return i === -1 ? null : argv[i + 1] ?? null
}

/**
 * --adhoc supabase/adhoc/foo.sql   run a one-off script after the migrations
 * --set  key=value                 expose it to that script as
 *                                  current_setting('myrps.key')
 *
 * Values are passed as query parameters, never interpolated into the SQL
 * text, so a stray quote in an email address cannot change what runs.
 */
const adhocPath = flag('--adhoc')
const settings = argv
  .map((a, i) => (a === '--set' ? argv[i + 1] : null))
  .filter(Boolean)
  .map((pair) => {
    const idx = pair.indexOf('=')
    if (idx === -1) throw new Error(`--set expects key=value, got "${pair}"`)
    return [pair.slice(0, idx), pair.slice(idx + 1)]
  })

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
}

function loadDotEnv() {
  const path = join(root, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

async function askForUrl() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  console.log(`
${c.bold('Supabase connection string needed.')}

  1. Open your project at https://supabase.com/dashboard
  2. Press ${c.bold('Connect')} at the top of the page
  3. Choose ${c.bold('Session pooler')} and copy the URI
  4. Replace [YOUR-PASSWORD] with your database password
`)
  const answer = await rl.question('Connection string: ')
  rl.close()
  return answer.trim()
}

function migrationFiles() {
  const files = readdirSync(join(root, 'supabase'))
    .filter((f) => /^\d\d_.*\.sql$/.test(f))
    .sort()
    .map((f) => ({ label: f, path: join(root, 'supabase', f), required: true }))

  return files
}

async function apply(client, file) {
  const sql = readFileSync(file.path, 'utf8')
  process.stdout.write(`  ${file.label.padEnd(34)}`)
  try {
    // One transaction per file, so a failure leaves nothing half-applied.
    await client.query('begin')
    await client.query(sql)
    await client.query('commit')
    console.log(c.green('ok'))
    return true
  } catch (err) {
    await client.query('rollback').catch(() => {})
    console.log(c.red('failed'))
    console.error(`\n${c.red(err.message)}`)
    if (err.hint) console.error(c.dim(`hint: ${err.hint}`))
    if (err.position) console.error(c.dim(`at character ${err.position}`))
    return false
  }
}

const CHECKS = [
  {
    name: 'Row Level Security on every table',
    sql: `select string_agg(c.relname, ', ') as detail
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    // A table without RLS is readable by anyone holding the anon key.
    ok: (r) => !r.detail,
    fail: (r) => `RLS is OFF for: ${r.detail}. Re-run supabase/03_rls.sql.`,
  },
  {
    name: 'Signed-out role has no table access',
    sql: `select string_agg(distinct table_name, ', ') as detail
          from information_schema.role_table_grants
          where grantee = 'anon' and table_schema = 'public'`,
    ok: (r) => !r.detail,
    fail: (r) => `anon can still reach: ${r.detail}. Re-run supabase/03_rls.sql.`,
  },
  {
    name: 'Curriculum seeded (140 credits per intake)',
    sql: `select string_agg(intake_year || '=' || total, ', ') as detail from (
            select intake_year, sum(required_credits) as total
            from public.curriculum_requirements group by intake_year
          ) t where total <> 140`,
    ok: (r) => !r.detail,
    fail: (r) => `Credit totals are wrong: ${r.detail}. Re-run supabase/06_seed.sql.`,
  },
  {
    name: 'Psychometric bank loaded (70 items, 10 per intelligence)',
    sql: `select case
            when (select count(*) from public.psychometric_items) = 0 then 'empty'
            when (select count(*) from public.psychometric_items) <> 70 then 'wrong count'
            when exists (select 1 from public.psychometric_items
                         group by intelligence having count(*) <> 10) then 'uneven'
          end as detail`,
    ok: (r) => !r.detail,
    fail: (r) =>
      r.detail === 'empty'
        ? 'Not loaded — check that supabase/08_psychometric_items.sql ran.'
        : `Item bank looks wrong (${r.detail}).`,
    warnOnly: true,
  },
  {
    name: 'Avatar bucket is private',
    sql: `select case when public then 'PUBLIC' end as detail
          from storage.buckets where id = 'avatars'`,
    ok: (r) => !r || !r.detail,
    fail: () => 'The avatars bucket is public — student photos would be world-readable.',
  },
  {
    name: 'Admin configured',
    sql: `select case
            when (select value from public.app_settings where key = 'bootstrap_admin_email')
                 like 'CHANGE-ME%' then 'not set'
            when (select count(*) from public.admins) = 0 then 'nobody registered yet'
          end as detail`,
    ok: (r) => !r.detail,
    fail: (r) =>
      r.detail === 'not set'
        ? "Set app_settings.bootstrap_admin_email to your staff email BEFORE you register."
        : 'No admin yet — register with the bootstrap email to become one.',
    warnOnly: true,
  },
]

async function verify(client) {
  console.log(`\n${c.bold('Checking the result')}`)
  let failures = 0
  let warnings = 0

  for (const check of CHECKS) {
    const { rows } = await client.query(check.sql)
    const row = rows[0] ?? {}
    if (check.ok(row)) {
      console.log(`  ${c.green('✓')} ${check.name}`)
    } else if (check.warnOnly) {
      console.log(`  ${c.yellow('!')} ${check.name}\n      ${c.yellow(check.fail(row))}`)
      warnings++
    } else {
      console.log(`  ${c.red('✗')} ${check.name}\n      ${c.red(check.fail(row))}`)
      failures++
    }
  }
  return { failures, warnings }
}

async function main() {
  loadDotEnv()
  const url = process.env.DATABASE_URL || (await askForUrl())
  if (!url) {
    console.error(c.red('No connection string given.'))
    process.exit(1)
  }
  if (/:6543\//.test(url)) {
    console.error(c.red('\nThat is the transaction pooler (port 6543). It cannot run these'))
    console.error(c.red('migrations. Use the Session pooler string instead (port 5432).'))
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString: url,
    // Supabase terminates TLS with its own CA, which we do not ship. The
    // connection is still encrypted; we just aren't pinning the certificate.
    ssl: { rejectUnauthorized: false },
    application_name: 'myrps-setup',
  })

  try {
    await client.connect()
  } catch (err) {
    console.error(c.red(`\nCould not connect: ${err.message}`))
    console.error(c.dim('Check the password in the connection string, and that you copied the'))
    console.error(c.dim('Session pooler URI rather than the direct connection.'))
    process.exit(1)
  }

  const { rows: [who] } = await client.query('select current_database() db, version()')
  console.log(`\n${c.bold('myRPS database setup')}`)
  console.log(c.dim(`  connected to ${who.db}\n`))

  if (!checkOnly) {
    console.log(c.bold('Applying migrations'))
    for (const file of migrationFiles()) {
      const ok = await apply(client, file)
      if (!ok && file.required) {
        console.error(c.red('\nStopped. Nothing from that file was applied; fix it and run again.'))
        await client.end()
        process.exit(1)
      }
    }
  }

  if (adhocPath) {
    const full = join(root, adhocPath)
    if (!existsSync(full)) {
      console.error(c.red(`\nNo such script: ${adhocPath}`))
      await client.end()
      process.exit(1)
    }
    console.log(`\n${c.bold('Running one-off script')}`)
    for (const [key, value] of settings) {
      await client.query('select set_config($1, $2, false)', [`myrps.${key}`, value])
      console.log(c.dim(`  myrps.${key} = ${value}`))
    }
    const ok = await apply(client, { label: adhocPath, path: full, required: true })
    if (!ok) {
      await client.end()
      process.exit(1)
    }
    // Show whatever the script's final SELECT returned, so the result table is
    // visible in the Actions log.
    const sql = readFileSync(full, 'utf8')
    const lastSelect = sql.split(/;\s*$/m).map((s2) => s2.trim())
      .filter((s2) => /^select/i.test(s2)).pop()
    if (lastSelect) {
      const { rows } = await client.query(lastSelect)
      if (rows.length) console.table(rows)
    }
  }

  const { failures, warnings } = await verify(client)
  await client.end()

  if (failures > 0) {
    console.error(`\n${c.red(`${failures} check(s) failed.`)}`)
    process.exit(1)
  }

  console.log(`\n${c.green('Database ready.')}${warnings ? c.yellow(` (${warnings} thing(s) to finish)`) : ''}`)
  console.log(`
${c.bold('Still to do by hand')} — these are account settings, not database objects:

  1. Authentication → Sign In / Providers → Email: turn ${c.bold('Confirm email')} ON
  2. Authentication → URL Configuration → Site URL:
       https://zamrizahir88.github.io/myRPS/
     and add this to Redirect URLs:
       https://zamrizahir88.github.io/myRPS/**
  3. GitHub repo → Settings → Secrets and variables → Actions:
       VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY   (Project Settings → API)

Then register with your staff email to become the admin. Full walkthrough: SETUP.md
`)
}

main().catch((err) => {
  console.error(c.red(err.stack ?? String(err)))
  process.exit(1)
})
