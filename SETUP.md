# Setting up myRPS

Written for someone who has never used Supabase.

Most of the database work is now a single command. What's left is four settings
in two dashboards — those are account settings, not database objects, so no
script can do them for you.

Budget about 25 minutes. Nothing here costs money.

---

## What you are building

| Piece | Where it runs | Cost |
|---|---|---|
| The website | GitHub Pages | free |
| Accounts, database, file storage, chat | Supabase free tier | free |

The website is a folder of static files with no server of its own. It talks
straight to Supabase from the student's browser.

**The one thing to understand before you start:** the key the website uses to
reach your database is inside the JavaScript, and anyone can read it. That is
normal and it is how Supabase is designed. What stops one student reading
another's IC number is **Row Level Security** — the rules in
`supabase/03_rls.sql`. The setup script checks those rules applied, and refuses
to report success if they didn't.

---

## Step 1 — Create the Supabase project

1. Go to <https://supabase.com> and sign up (GitHub login is easiest).
2. **New project**.
   - Name: `myrps`
   - Database password: generate one and **save it in your password manager**.
     You need it in step 2 and it cannot be recovered.
   - Region: **Southeast Asia (Singapore)** — closest to Perlis.
   - Plan: Free.
3. Wait ~2 minutes while it provisions.

## Step 2 — Run the setup

Press **Connect** at the top of the Supabase dashboard, choose **Session
pooler**, and copy the URI. Replace `[YOUR-PASSWORD]` with the password from
step 1.

> Take the **Session pooler** string (port 5432), not the Transaction pooler
> (port 6543). The transaction pooler cannot run these statements; the script
> stops with an explanation if you paste the wrong one.

Then, in a terminal in this project folder:

```bash
npm install
npm run db:setup
```

It asks for the connection string, applies all seven migrations in order,
and then checks its own work:

```
Applying migrations
  01_schema.sql                     ok
  02_functions.sql                  ok
  03_rls.sql                        ok
  04_views.sql                      ok
  05_storage.sql                    ok
  06_seed.sql                       ok
  07_realtime.sql                   ok
  private/psychometric_items.sql    ok

Checking the result
  ✓ Row Level Security on every table
  ✓ Signed-out role has no table access
  ✓ Curriculum seeded (140 credits per intake)
  ✓ Psychometric bank loaded (70 items, 10 per intelligence)
  ✓ Avatar bucket is private
```

Drop the `psychometric_items.sql` file I sent you into a `private/` folder
first and it gets applied too. It is not in this repository on purpose: the
Multiple Intelligences Test is free to use but licensed *"not to be sold or
published"*, and this repo is public. `private/` is gitignored.

**Re-running is safe.** Every migration is idempotent and student data is never
touched, so `npm run db:setup` is also how you apply future changes. To check
an existing project without changing anything: `npm run db:check`.

### No Node on your machine?

Do it from GitHub instead. Add a repository secret `SUPABASE_DB_URL` with the
same connection string (**Settings → Secrets and variables → Actions**), then
**Actions → Set up Supabase database → Run workflow**. Optionally add a second
secret `PSYCHOMETRIC_ITEMS_SQL` with the contents of that file pasted in — a
secret is not published, so it is a fine place for it.

### Prefer to paste SQL by hand?

The files in `supabase/` are plain SQL. Open the Supabase **SQL Editor** and run
them in numbered order, `01` through `07`, then the psychometric file. Same
result, more clicking.

---

## Step 3 — Four settings the script cannot touch

**Supabase → Authentication → Sign In / Providers → Email**

1. **Confirm email**: **on**. Without it, anyone can register using someone
   else's address.

**Supabase → Authentication → URL Configuration**

2. **Site URL**: `https://zamrizahir88.github.io/myRPS/`
3. **Redirect URLs**: add `https://zamrizahir88.github.io/myRPS/**`
   (and `http://localhost:5173/**` if you want to test locally)

**GitHub → Settings → Secrets and variables → Actions**

4. Two secrets, both from Supabase **Project Settings → API**:

| Secret | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL, `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the **anon public** key, starting `eyJ...` |

And three variables (the *Variables* tab, not *Secrets*):

| Variable | Value |
|---|---|
| `VITE_ALLOWED_DOMAIN` | `studentmail.unimap.edu.my` |
| `VITE_RPS_WHATSAPP` | `60123456789` |
| `VITE_RPS_NAME` | `Ts. Dr. Mohd Zamri bin Zahir Ahmad` |

> There is also a **service_role** key on that API page. It bypasses every
> security rule in your database. Never put it in this project, in GitHub, or
> in a browser. If it ever leaks, rotate it immediately.

## Step 4 — Make yourself the admin

This is the step people get wrong. Do it **before** you register.

Supabase → **Table Editor** → `app_settings` → the row `bootstrap_admin_email`
→ set the value to **your staff email** → save.

While you're there, check the rest:

| key | what it does |
|---|---|
| `allowed_email_domain` | only this domain may register: `studentmail.unimap.edu.my` |
| `bootstrap_admin_email` | this address becomes the RPS admin, and bypasses the domain rule |
| `rps_whatsapp` | your number, international format, digits only |
| `rps_name` | shown on announcements |

Then register on your own site with that staff address. You are approved and
made admin automatically. Running `npm run db:check` afterwards should show
**✓ Admin configured**.

**To add a second admin later:** Table Editor → `admins` → Insert row → paste
their user id from Authentication → Users. There is no button for this on
purpose.

## Step 5 — Turn on GitHub Pages

**Settings** → **Pages** → **Source**: **GitHub Actions**.

Push to `main`, or **Actions → Deploy to GitHub Pages → Run workflow**. Two
minutes later:

**https://zamrizahir88.github.io/myRPS/**

---

## Running it on your own computer

```bash
npm install
cp .env.example .env     # fill in the same values as step 3
npm run dev              # http://localhost:5173/myRPS/
```

## Changing the database later

Edit the file in `supabase/`, then:

```bash
./scripts/verify-local.sh   # runs it against a throwaway local Postgres first
npm run db:setup            # then apply to the real project
```

`verify-local.sh` needs PostgreSQL 16 installed locally. It applies every
migration to a scratch database and runs 22 security tests — that a student
can't approve themselves, can't read another student's records, can't retake
the psychometric test, can't self-verify a meeting for leaderboard points, that
a repeated subject counts once, and so on. Worth running before you touch the
live project.

---

## Things worth knowing

**The free tier pauses after 7 days of no activity.** A semester break will do
it, and students get errors when they come back.
`.github/workflows/keepalive.yml` pings it every Monday. It uses the same two
secrets from step 3.

**Back up before each semester.** Free-tier backups are thin. The simplest
habit: Admin panel → Export CSV, once a semester, before the exam period.

**Storage.** 1 GB, and photos are downscaled to ~40 KB before upload. Forty
students is about 2 MB.

**Approving a student does not email them.** Tell them to sign in again.

**Psychometric test shows as unavailable** → the question bank isn't loaded.
Put the file in `private/` and re-run `npm run db:setup`.

**Registration fails with a 500** → the address is outside
`allowed_email_domain`. That's the gate working.

## Where things live

```
supabase/          the migrations, numbered in the order they must run
scripts/setup-db.mjs   applies them and verifies the result
scripts/local-test.sql the security test suite
scripts/verify-local.sh  runs both against a throwaway local database
src/lib/           scoring, GPA and credit maths — the rules live here
src/pages/         one file per screen
src/i18n/          every piece of UI text, in BM and EN
.github/workflows/ deploy on push, database setup, weekly keepalive
```
