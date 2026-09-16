# myRPS — Care. Guide. Shine.

A companion system for a UniMAP **Rakan Pendamping Siswa (RPS)** / Academic
Advisor to follow their advisees' academic progress, 7 Pillars participation and
psychometric profile in one place.

Built as a personal initiative. **Not an official UniMAP system** — every figure
in it is entered by the student, and AMIS remains the official record. The
interface says so on every page.

**New here? Start with [SETUP.md](SETUP.md).** Database setup is one command:

```bash
npm install && npm run db:setup
```

---

## What it does

**For the student**
- A profile modelled on the AMIS layout, minus the financial fields
- A 140-credit progress tracker across the UR6523007 curriculum, broken down by
  block (Core / Elective / Common Core / University / Co-curriculum)
- An indicative GPA and CGPA, and a target-grade planner (Modul 03's *Borang
  Sasaran*)
- The Multiple Intelligences psychometric test from Modul 2, scored
  automatically, with a radar chart and a persona card
- 7 Pillars checklist and an RPS meeting logbook
- A leaderboard and chatroom that never expose anyone's grades

**For the RPS**
- An approval queue for new registrations
- A master list sorted by **early-warning flags** — open fails, CGPA under 2.00,
  no meeting in eight weeks, no pillars, incomplete profile
- Each student's full profile, psychometric result and meeting history
- One-click verification of meetings and pillar completions
- CRUD over the curriculum, so a syllabus change doesn't need a developer
- CSV export

## Stack

| | |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Hosting | GitHub Pages (static, free) |
| Backend | Supabase — Postgres, Auth, Storage, Realtime (free tier) |
| Charts | hand-rolled SVG, no chart library |

## Verifying it

`./scripts/verify-local.sh` applies every migration to a throwaway local
PostgreSQL and runs 22 tests against it — that a student cannot approve
themselves, cannot read another student's records, cannot retake the
psychometric test without the RPS resetting it, cannot self-verify a meeting to
farm leaderboard points, that a subject repeated three times counts once toward
the 140, and that both curriculum intakes total exactly 140 credits. Run it
before changing anything in `supabase/`.

`npm run db:check` runs the same structural checks against the live project
without modifying it.

## Security model in one paragraph

The site is static, so the Supabase anon key ships inside the bundle where
anyone can read it. Every access rule therefore lives in the database as Row
Level Security (`supabase/03_rls.sql`), not in the UI. Admin rights live in
their own `admins` table — never in `user_metadata`, which users can rewrite
themselves. Approval state is changed only through a security-definer function,
so a student cannot approve themselves. The leaderboard is a view that exposes
name and engagement points and nothing else. Profile photos live in a private
bucket served by short-lived signed URLs.

## Data protection

Sensitive fields (race, religion, household income, family details) are
collected under an explicit consent screen quoting the PDPA 2010, are optional,
and are visible only to the student and the RPS. Students can delete their
account and all associated data themselves from the profile page. Admin actions
are recorded in an audit log.

## Attribution

The psychometric instrument is the **Multiple Intelligences Test** by
V Chislett MSc and A Chapman (2005-06), based on Howard Gardner's MI model,
available free from businessballs.com. Its terms are *"not to be sold or
published"*, so the question bank is **not** in this repository — it is seeded
directly into your own Supabase project, behind a login. See SETUP.md step 3.

Curriculum structure, 7 Pillars themes and the grade scale come from the UniMAP
Academic Guide Book, MODUL RPS 2025 and the Panduan RPS (JHEP).

## Licence

Source code: MIT. The content from UniMAP documents and the psychometric
instrument remain the property of their respective owners.
