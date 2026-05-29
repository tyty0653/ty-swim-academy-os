# TY Swim Academy OS Testing Guide

This guide is for local QA with a Supabase test project. Do not deploy to Vercel yet.

## 1. Local App Checks

Run:

```bash
npm install
npm run build
npm run smoke:routes
npm run qa:check
```

Expected:

- Install completes with 0 vulnerabilities.
- Build completes without errors.
- Smoke routes return `PASS 200` for core routes.
- Live QA either runs against Supabase test credentials or clearly reports which `.env.local` values are missing.

## 2. Supabase Test Project

1. Create a separate Supabase project for testing.
2. Run `supabase/schema.sql`. If your test Supabase project already had an older OS schema, run `supabase/skill-progress-migration.sql` and `supabase/pre-real-use-safety-migration.sql` before rerunning demo seed.
3. Create one Admin Auth user and one Coach Auth user.
4. Copy both Auth user IDs.
5. Open `supabase/demo-seed.sql`.
6. Replace:
   - `00000000-0000-0000-0000-000000000001` with the Admin Auth user ID.
   - `00000000-0000-0000-0000-000000000002` with the Coach Auth user ID.
7. Run `supabase/demo-seed.sql`.

The demo seed uses fake data only and deletes previous `DEMO-*` rows before inserting fresh demo data.

To reset demo data later, run the same `supabase/demo-seed.sql` again. The reset section only removes demo rows with `DEMO-*` codes or `DEMO_SEED` notes, so future real records are not touched.

After seeding, `DEMO-LES-0003` should exist with status `completed_pending_review`. If it does not, rerun the latest `demo-seed.sql`; the seed raises an error if that pending review lesson cannot be created.

The demo seed also creates fake Level 1 student progress rows for the two demo students, so `/skill-levels`, Students, My Students, and lesson progress updates can be tested without entering data manually.

After the safety migration, test Export All Data JSON from More -> Admin Tools or Reports, Audit Logs from More, and Void / Reverse approval on an approved unpaid demo lesson.

## 3. Local Env

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your-test-project-url
VITE_SUPABASE_ANON_KEY=your-test-project-anon-key
```

Run:

```bash
npm run dev
```

Open `/login`.

## 4. Login Troubleshooting

If login does not work, use these messages:

- Supabase setup required: `.env.local` is missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`.
- Login failed: email or password is wrong, or the Auth user does not exist.
- Login succeeded, but your staff profile is missing or inactive: the Auth user exists, but `profiles.id` does not match the Auth user ID, or the profile is inactive.
- Your staff role is not valid: set `profiles.role` to `admin` or `coach`.
- TY Swim Academy OS could not finish loading: check internet connection, Supabase URL/key, and whether `schema.sql` has been applied.

The sign-in button should always stop loading after success, failure, or timeout.

## 5. Admin Test Script

Sign in as Admin.

Check:

- `/dashboard`: Today Control Centre shows setup/data cards.
- `/students`: guided workflow appears.
- `/schedule`: Fixed Weekly and Flexible modes are separate and understandable.
- `/review`: review categories show pending, rescheduled, cancelled, needs edit, missing photos.
- `/money`: payments, payroll, expenses, and export summary are grouped.
- `/more`: System Check, import, cleanup, reports, settings, and advanced tools are available.
- `/system-check`: all setup checks are pass or understandable warnings.
- `/system-check`: confirms env, session, profile, role, tables, buckets, demo data, coach profile link, sensitive coach restrictions, counts, and next action.
- Bucket checks use bucket-specific reachability, not `listBuckets()`, because `listBuckets()` can be unreliable from an anon/authenticated frontend client.

Flow:

1. Open the demo scheduled lesson.
2. Confirm Admin can see package/payroll toggles.
3. Approve a pending test lesson after Coach submits it.
4. Approving the same lesson again must not deduct package or create payroll twice.
5. Generate payroll.
6. Mark payroll paid.
7. Mark paid again must not create duplicate coach salary expense.

## 6. Coach Test Script

Sign in as Coach.

Check:

- Navigation shows only Today, My Schedule, My Students, My Pay.
- Coach cannot open `/money`, `/payments`, `/expenses`, `/review`, `/import`, `/settings`, or `/system-check`.
- Today cards show lesson time, class/group, student names, venue/address, WhatsApp, map, safety alert, photo required badge, and Submit Record.
- Coach lesson form shows only attendance, completed/cancelled, short progress note, next focus, optional photo, and submit.
- Approved lessons are read-only.
- Coach sees own payroll only.
- Coach does not see payment amount, customer price, expenses, profit, or other coach payroll.

## 7. Storage Checks

In Supabase Storage:

- `lesson-photos` is private.
- `payment-proofs` is private.
- `expense-receipts` is private.

As Coach:

- Upload a photo for an assigned unapproved lesson.
- Confirm payment proof and expense receipt access is denied.

As Admin:

- Confirm Admin can manage lesson photos, payment proofs, and expense receipts.

## 8. Vercel Later

Before Vercel, complete the live Supabase checklist in `docs/ty-swim-academy-os-live-qa.md`.

Do not deploy until local/test Supabase QA is stable. When ready, use only these frontend env variables:

```bash
VITE_SUPABASE_URL=your-production-project-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

Never add a Supabase `service_role` key to Vercel frontend env variables.

Recommended future URL: `os.tyswimacademy.com`.

## 9. Do Not Deploy Yet

Keep this in local/test Supabase QA until:

- Admin and Coach demo flow works.
- System Check is clean.
- Lesson approval, payroll, and storage rules are verified.
- The owner and one coach can use the UI without explanation.

Future recommended URL after QA: `os.tyswimacademy.com`.
