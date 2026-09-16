# Setting up myRPS

**You do not need to install anything. Everything below happens in your web
browser.** No terminal, no folders on your computer, no Node.

About 20 minutes, in five parts. Nothing costs money.

---

## Where things stand

The system is finished and stored on GitHub. What does not exist yet is your
**Supabase project** — the database that holds student accounts and records.
Only you can create that, because it lives in your account.

The house is built. These steps connect the water and electricity.

---

# Part 1 — Create the database (5 min)

1. Go to **<https://supabase.com>** and click **Start your project**. Sign in
   with GitHub — it is the fastest way, and you already have a GitHub account.

2. You will land on a page listing your projects. It is empty. Click
   **New project**.

3. Fill in:
   - **Name**: `myrps`
   - **Database Password**: click **Generate a password**, then
     **copy it and save it somewhere safe** (Notes, WhatsApp to yourself,
     password manager — anywhere you will find it again).
   - **Region**: `Southeast Asia (Singapore)`
   - **Plan**: Free

4. Click **Create new project** and wait about two minutes while it sets up.

> **"I don't see a Connect button"** — that button only appears *inside* a
> project. If you are looking at the Supabase home page or the list of
> projects, it is not there yet. You do not need it at all with these
> instructions, so ignore it.

---

# Part 2 — Build the tables (3 min)

1. Open this file on GitHub:
   **[RUN_THIS_IN_SUPABASE.sql](RUN_THIS_IN_SUPABASE.sql)**

2. Near the top right of the file there is a **copy icon** (two overlapping
   squares), labelled *Copy raw file* when you hover over it. Click it. The
   whole file is now on your clipboard.

3. Back in Supabase, in the left sidebar click **SQL Editor**.

4. Click **New query**.

5. Click into the big empty box and paste (Ctrl+V, or Cmd+V on a Mac).

6. Click the green **Run** button at the bottom right.

After a few seconds you should see **"Success. No rows returned."**
That is what success looks like — "no rows" is correct, it means the commands
ran and there was nothing to display.

### Check it worked

Click **New query** again, paste this in, and Run:

```sql
select 'tables created' as check,
       case when count(*) >= 15 then 'OK' else 'PROBLEM' end as result
  from pg_tables where schemaname = 'public'
union all
select 'security rules on',
       case when count(*) = 0 then 'OK' else 'PROBLEM' end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
union all
select 'curriculum loaded',
       case when count(*) = 108 then 'OK' else 'PROBLEM' end
  from public.curriculum_subjects
union all
select 'psychometric questions',
       case when count(*) = 70 then 'OK' else 'PROBLEM' end
  from public.psychometric_items;
```

All four rows should say **OK**. If any says PROBLEM, tell me which one.

---

# Part 3 — Three settings in Supabase (5 min)

### 3a. Make yourself the admin

**Do this before you register**, or you will sign up as an ordinary student.

1. Left sidebar → **Table Editor**
2. In the table list, click **app_settings**
3. Find the row where `key` is `bootstrap_admin_email`
4. Click its `value` cell (it says `CHANGE-ME@unimap.edu.my`) and replace it
   with **your staff email**, e.g. `zamrizahir@unimap.edu.my`
5. Press Enter / click Save

While you are in that table, also set:

| key | set it to |
|---|---|
| `rps_whatsapp` | your WhatsApp number, digits only with country code: `60123456789` |
| `rps_name` | `Ts. Dr. Mohd Zamri bin Zahir Ahmad` |

Leave `allowed_email_domain` as `studentmail.unimap.edu.my` — that is what
stops strangers registering.

### 3b. Require email confirmation

Left sidebar → **Authentication** → **Sign In / Providers** → click **Email**.

Make sure **Confirm email** is turned **ON**. Without it, someone could
register using another student's address.

### 3c. Tell Supabase where your site lives

Left sidebar → **Authentication** → **URL Configuration**.

- **Site URL**: `https://zamrizahir88.github.io/myRPS/`
- **Redirect URLs**: click Add URL and enter
  `https://zamrizahir88.github.io/myRPS/**`

---

# Part 4 — Connect the website to the database (5 min)

The website needs two values from Supabase.

### Get them

Supabase left sidebar → **Project Settings** (the gear at the bottom).

**The Project URL** is under **General** or **Data API**, and looks like
`https://abcdefghijk.supabase.co`.

**The key** is under **API Keys**. You will see two kinds:

| What you see | Use it? |
|---|---|
| **Publishable key** — `sb_publishable_...` | ✅ **Yes, this one.** |
| *(older projects)* **anon public** — `eyJhbGci...` | ✅ Same thing, older format |
| **Secret key** — `sb_secret_...` | ❌ **Never.** |
| *(older projects)* **service_role** — `eyJhbGci...` | ❌ **Never.** |

> ### About the secret key
>
> The publishable key is *designed* to be public — it sits inside the website
> where anyone can read it, and that is fine, because the security rules you
> installed in Part 2 decide what it is allowed to see.
>
> The **secret key is the opposite**: it ignores every one of those rules. Anyone
> holding it can read every student's IC number, delete all records, and make
> themselves an admin. myRPS never uses it, so you never need to copy it
> anywhere.
>
> **If you ever paste a secret key somewhere it shouldn't be** — a chat, an
> email, a screenshot, a file — go to **Project Settings → API Keys**, find it
> under Secret keys, and **revoke or rotate** it. That instantly makes the
> leaked copy useless. Nothing in myRPS breaks.

### Put them in GitHub

1. Go to **<https://github.com/zamrizahir88/myRPS>**
2. **Settings** tab (top right of the repo, not your account settings)
3. Left sidebar → **Secrets and variables** → **Actions**
4. Click **New repository secret**, twice:

| Name | Secret |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your **publishable** key (`sb_publishable_...`) |

5. Now click the **Variables** tab (next to Secrets) → **New repository
   variable**, three times:

| Name | Value |
|---|---|
| `VITE_ALLOWED_DOMAIN` | `studentmail.unimap.edu.my` |
| `VITE_RPS_WHATSAPP` | `60123456789` |
| `VITE_RPS_NAME` | `Ts. Dr. Mohd Zamri bin Zahir Ahmad` |

---

# Part 5 — Publish the website (2 min)

1. Still in the repo **Settings** → left sidebar → **Pages**
2. Under **Source**, choose **GitHub Actions**
3. Go to the **Actions** tab → click **Deploy to GitHub Pages** on the left →
   **Run workflow** → **Run workflow**

Wait about two minutes for the green tick. Your site is then live at:

### **https://zamrizahir88.github.io/myRPS/**

---

# Finally — become the RPS

1. Open your site
2. Click **Create account**, and register with **your staff email** (the one
   you put in `bootstrap_admin_email`)
3. Check your inbox and click the confirmation link
4. Sign in

You are approved automatically and you will see the **RPS Panel** tab. Students
can now register with their `@studentmail.unimap.edu.my` addresses, and they
appear in your **Applications** queue waiting for you to approve them.

---

## If something goes wrong

| What you see | What it means |
|---|---|
| SQL editor shows a red error | Copy the error text and send it to me |
| "PROBLEM" in the check query | Tell me which row |
| Site loads but says "Missing VITE_SUPABASE_URL" | Part 4 secrets are missing or misspelled — re-run the deploy after fixing |
| "Invalid API key" once signed in | You used the secret key instead of the publishable one, or the key was revoked. Put the publishable key in and re-run the deploy |
| Registration fails with an error | The email is not `@studentmail.unimap.edu.my`. That is the gate working |
| You registered but have no RPS Panel | `bootstrap_admin_email` was not set before you registered. Tell me and I'll give you a one-line fix |
| Psychometric test says unavailable | Part 2 did not finish. Run the file again |
| Students say they were approved but still can't get in | Tell them to sign out and sign in again. Approval does not email them |

---

## Later, when you need it

**Changing the curriculum** — RPS Panel → Curriculum. Add, edit or remove
courses without touching any code.

**Backing up** — RPS Panel → Export CSV, once a semester before exams.

**The free tier sleeps after 7 days of no use.** A semester break will do it.
There is an automatic weekly ping in the repo that prevents this; it starts
working once Part 4 is done.

**Adding a second admin** — Supabase → Table Editor → `admins` → Insert row →
paste the person's user id from Authentication → Users.

---

## Appendix: for a developer

If someone with a development setup works on this later:

```bash
npm install
cp .env.example .env        # fill in the same values as Part 4
npm run dev                 # local preview
npm run db:setup            # apply migrations over a connection string
npm run db:bundle           # regenerate RUN_THIS_IN_SUPABASE.sql
./scripts/verify-local.sh   # 22 security tests against a throwaway database
```

The numbered files in `supabase/` are the source of truth;
`RUN_THIS_IN_SUPABASE.sql` is generated from them and must not be hand-edited.
