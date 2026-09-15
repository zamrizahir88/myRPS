# Setting up myRPS

Written for someone who has never used Supabase. Follow it top to bottom once;
after that, deploying a change is just `git push`.

Budget about 45 minutes. Nothing here costs money.

---

## What you are building

| Piece | Where it runs | Cost |
|---|---|---|
| The website | GitHub Pages | free |
| Accounts, database, file storage, chat | Supabase free tier | free |

The website is a folder of static files. It has no server of its own — it talks
straight to Supabase from the student's browser.

**The consequence, and the one thing to understand before you start:** the key
the website uses to reach your database is inside the JavaScript, and anyone can
read it. That is normal and it is how Supabase is designed to work. What stops a
student reading another student's IC number is **Row Level Security** — the
rules in `supabase/03_rls.sql`. If you ever add a table by hand, it has no
policies until you write them, and until then it is readable by anyone who opens
the browser console. Never skip step 4.

---

## Step 1 — Create the Supabase project

1. Go to <https://supabase.com> and sign up (GitHub login is easiest).
2. **New project**.
   - Name: `myrps`
   - Database password: generate one and **save it in your password manager**.
     You will rarely need it, but it cannot be recovered.
   - Region: **Southeast Asia (Singapore)** — closest to Perlis.
   - Plan: Free.
3. Wait ~2 minutes while it provisions.

## Step 2 — Copy your two keys

Left sidebar → **Project Settings** → **API**.

Copy these two, you'll need them in step 7:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **anon public** key — a long string starting `eyJ...`

> There is also a **service_role** key on that page. It bypasses every security
> rule in your database. Never put it in this project, in GitHub, or in a
> browser. If you ever paste it somewhere public, rotate it immediately.

## Step 3 — Create the tables

Left sidebar → **SQL Editor** → **New query**.

Open each file from the `supabase/` folder of this repo, paste the whole
contents into the editor, and press **Run**. **Do them in order** — each one
depends on the last:

1. `01_schema.sql` — the tables
2. `02_functions.sql` — signup gate, admin actions, guards
3. `03_rls.sql` — **the security rules**
4. `04_views.sql` — credits, GPA, the safe leaderboard
5. `05_storage.sql` — the private bucket for profile photos
6. `06_seed.sql` — grade scale, settings, the UR6523007 curriculum
7. `07_realtime.sql` — live chat

Each should finish with "Success. No rows returned". If one errors, fix it
before running the next.

Then run the file I sent you separately, **`psychometric_items.sql`** — the 70
test statements. It is not in this repo on purpose: the Multiple Intelligences
Test is free to use but licensed *"not to be sold or published"*, and this repo
is public. Keep that file on your own computer.

## Step 4 — Check the security rules actually applied

Left sidebar → **Advisors** → **Security Advisor**.

You want **no errors** about "RLS disabled in public". Two *warnings* are
expected and intentional:

- `leaderboard` and `member_names` are flagged as security-definer views. That
  is deliberate — they are how students see each other's names and engagement
  scores without being able to read each other's profiles. Their column lists
  are the privacy boundary. Read the comment at the top of `04_views.sql` before
  you ever add a column to them.

## Step 5 — Configure sign-ups

**Authentication** → **Sign In / Providers** → Email:

- **Enable email provider**: on
- **Confirm email**: **on**. Without it, anyone can register using someone
  else's address.

**Authentication** → **URL Configuration**:

- **Site URL**: `https://zamrizahir88.github.io/myRPS/`
- **Redirect URLs**: add `https://zamrizahir88.github.io/myRPS/**`
  and `http://localhost:5173/**` for local testing.

> Supabase's built-in email sender is rate-limited to a handful of messages per
> hour. Fine for a cohort of 16 registering over a week. If you ever onboard a
> whole cohort in one afternoon, connect a free Resend or Brevo SMTP account
> under **Project Settings → Authentication → SMTP**.

## Step 6 — Make yourself the admin

This is the step people get wrong. Do it **before** you register.

**Table Editor** → `app_settings` → find the row `bootstrap_admin_email` → set
its value to **your staff email** (e.g. `zamrizahir@unimap.edu.my`) → save.

While you are there, check the other rows:

| key | what it does |
|---|---|
| `allowed_email_domain` | only this domain can register. `studentmail.unimap.edu.my` |
| `bootstrap_admin_email` | this address becomes the RPS admin, and bypasses the domain rule |
| `rps_whatsapp` | your number, international format, digits only: `60123456789` |
| `rps_name` | shown on announcements |

Now register at your own site with that staff address. You will be approved and
made admin automatically.

**To add a second admin later:** Table Editor → `admins` → Insert row → paste
the person's user id (find it under Authentication → Users). There is no button
for this on purpose.

## Step 7 — Tell GitHub about your Supabase project

In this repository on GitHub: **Settings** → **Secrets and variables** →
**Actions**.

Under **Secrets** → *New repository secret*:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL from step 2 |
| `VITE_SUPABASE_ANON_KEY` | your anon public key from step 2 |

Under **Variables** → *New repository variable*:

| Name | Value |
|---|---|
| `VITE_ALLOWED_DOMAIN` | `studentmail.unimap.edu.my` |
| `VITE_RPS_WHATSAPP` | `60123456789` |
| `VITE_RPS_NAME` | `Ts. Dr. Mohd Zamri bin Zahir Ahmad` |

(They are "secrets" only by habit — the anon key is public by design. Keeping
them out of the code just means you can rotate the project without editing
files.)

## Step 8 — Turn on GitHub Pages

**Settings** → **Pages** → **Source**: **GitHub Actions**.

Then push to `main`, or go to **Actions** → *Deploy to GitHub Pages* → **Run
workflow**. Two minutes later the site is live at:

**https://zamrizahir88.github.io/myRPS/**

---

## Running it on your own computer

```bash
npm install
cp .env.example .env     # then fill in the same values as step 7
npm run dev              # http://localhost:5173/myRPS/
```

---

## Things worth knowing

**The free tier pauses after 7 days of no activity.** A semester break will do
it, and students will get errors when they come back. `.github/workflows/
keepalive.yml` pings it every Monday to prevent this. It needs the same two
secrets from step 7.

**Back up before each semester.** Supabase → Database → Backups is thin on the
free tier. The simplest habit: Admin panel → Export CSV, once a semester, before
the exam period.

**Storage budget.** 1 GB, and profile photos are downscaled to ~40 KB each
before upload. Forty students is about 2 MB. You will not run out.

**Approving a student** does not email them. Tell them to just sign in again.

**If a student says the psychometric test is empty**, you have not run
`psychometric_items.sql` yet (end of step 3).

**If registration fails with a 500 error**, the address is outside
`allowed_email_domain`. That is the gate working.

## Where things live

```
supabase/          SQL you paste into the Supabase SQL editor, in numbered order
src/lib/           scoring, GPA and credit maths — the rules live here
src/pages/         one file per screen
src/i18n/          every piece of UI text, in BM and EN
.github/workflows/ deploy on push, and the weekly keepalive
```
