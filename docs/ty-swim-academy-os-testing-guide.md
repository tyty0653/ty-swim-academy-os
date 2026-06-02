# TY Swim Academy OS Testing Guide

This guide is for local QA with a Supabase test project. Do not deploy to Vercel yet.

## 1. Local App Checks

Run:

```bash
npm install
npm run build
npm run smoke:routes
npm run qa:check
npm run ui:check
```

Expected:

- Install completes with 0 vulnerabilities.
- Build completes without errors.
- Smoke routes return `PASS 200` for core routes.
- Live QA either runs against Supabase test credentials or clearly reports which `.env.local` values are missing.
- UI checks either run Admin/Coach mobile/desktop checks or clearly skip when QA login credentials are missing.

If Playwright says browser binaries are missing, run:

```bash
npx playwright install chromium
```

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
QA_ADMIN_EMAIL=admin-test-email
QA_ADMIN_PASSWORD=admin-test-password
QA_COACH_EMAIL=coach-test-email
QA_COACH_PASSWORD=coach-test-password
```

Run:

```bash
npm run dev
```

Open `/login`.

The QA passwords are read only by local scripts and must not be committed. `.env.local` is ignored by git.

## 4. Automated UI And Mobile Checks

The repository includes Playwright checks so you do not need to inspect every page manually.

Run the mobile/desktop UI quality checks:

```bash
npm run ui:check
```

This starts the local Vite app, logs in with the QA Admin and QA Coach accounts, and checks:

- key Admin pages load: Today, Students, Student Profile, Schedule, Review, Money, More, Setup Check, Audit Logs
- key Coach pages load: Today, Schedule, Students, Student Profile, Submit Record, My Pay, My Account Check
- mobile viewports do not have horizontal overflow
- mobile bottom navigation appears below desktop width
- Sign out is visible in More
- the English / 中文 language toggle is available on login and More -> Account
- Coach profile pages do not show Admin-only finance cards

Viewports checked:

- 375 x 812
- 390 x 844
- 430 x 932
- 768 x 1024
- 1440 x 900

If `QA_ADMIN_EMAIL`, `QA_ADMIN_PASSWORD`, `QA_COACH_EMAIL`, or `QA_COACH_PASSWORD` are missing, the authenticated UI tests are skipped with a clear message. Add those values to `.env.local` or your shell to run the full check.

The UI check now runs one Admin and one Coach Supabase login preflight before checking pages. If the Coach password is wrong, you should see a clear message such as `Coach QA login failed. Check QA_COACH_EMAIL / QA_COACH_PASSWORD.` instead of many unrelated Coach page failures. The output may show the QA email used, but it must never print the password.

The preflight result is saved locally for troubleshooting:

```text
test-artifacts/ui-auth-preflight.json
```

This file is ignored by git.

If a student profile or submit-record test is skipped, rerun the latest `supabase/demo-seed.sql` or make sure the Coach test account is assigned to at least one demo class, student, and lesson.

When a UI check fails, Playwright saves a failure screenshot here:

```text
test-artifacts/ui-screenshots/failures/
```

Horizontal overflow failures include a short list of likely overflowing elements in the terminal output.

To review the Chinese interface manually, switch the language toggle to 中文 on the login page or More -> Account, then run `npm run ui:screenshots` after signing in locally. The automated login tests start from the default English labels so credentials and selectors stay stable.

## 5. Screenshot Capture

Run:

```bash
npm run ui:screenshots
```

Screenshots are saved to:

```text
test-artifacts/ui-screenshots/
```

The folder is ignored by git. Screenshots are grouped by viewport, for example:

```text
test-artifacts/ui-screenshots/mobile-390/admin-students.png
test-artifacts/ui-screenshots/mobile-390/coach-today.png
```

The screenshot command uses the same QA login credentials as `npm run ui:check`.

## 6. Lighthouse Mobile Report

Run:

```bash
npm run quality:lighthouse
```

By default this starts the local app and audits `/login` with mobile settings. Reports are saved to:

```text
test-artifacts/lighthouse/
```

To audit a deployed preview instead:

```bash
LIGHTHOUSE_URL=https://your-preview-url.vercel.app/login npm run quality:lighthouse
```

On Windows PowerShell:

```powershell
$env:LIGHTHOUSE_URL="https://your-preview-url.vercel.app/login"; npm run quality:lighthouse
```

Lighthouse focuses on mobile performance, accessibility, and best practices. Minor score issues do not affect `npm run build`; use the report as guidance before deployment.

## 7. Login Troubleshooting

If login does not work, use these messages:

- Supabase setup required: `.env.local` is missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`.
- Login failed: email or password is wrong, or the Auth user does not exist.
- Login succeeded, but your staff profile is missing or inactive: the Auth user exists, but `profiles.id` does not match the Auth user ID, or the profile is inactive.
- Your staff role is not valid: set `profiles.role` to `admin` or `coach`.
- TY Swim Academy OS could not finish loading: check internet connection, Supabase URL/key, and whether `schema.sql` has been applied.

The sign-in button should always stop loading after success, failure, or timeout.

## 8. Admin Test Script

Sign in as Admin.

Check:

- `/dashboard`: Today Control Centre shows setup/data cards.
- `/students`: guided workflow appears.
- `/schedule`: Fixed Weekly and Flexible modes are separate and understandable.
- `/review`: review categories show pending, rescheduled, cancelled, needs edit, missing photos.
- `/money`: payments, payroll, expenses, and export summary are grouped.
- `/more`: System Check, import, cleanup, reports, settings, and advanced tools are available.
- `/system-check` as Admin: all setup checks are pass or understandable warnings.
- `/system-check` as Admin: confirms env, session, profile, role, tables, buckets, demo data, coach profile link, sensitive coach restrictions, counts, and next action.
- Bucket checks use bucket-specific reachability, not `listBuckets()`, because `listBuckets()` can be unreliable from an anon/authenticated frontend client.

Flow:

1. Open the demo scheduled lesson.
2. Confirm Admin can see package/payroll toggles.
3. Approve a pending test lesson after Coach submits it.
4. Approving the same lesson again must not deduct package or create payroll twice.
5. Generate payroll.
6. Mark payroll paid.
7. Mark paid again must not create duplicate coach salary expense.

## 9. Coach Test Script

Sign in as Coach.

Check:

- Navigation shows only Today, My Schedule, My Students, My Pay.
- Coach cannot open `/money`, `/payments`, `/expenses`, `/review`, `/import`, or `/settings`.
- Coach can open `/system-check`, but it shows only My Account Check with account, assignments, pay access, and finance privacy.
- Today cards show lesson time, class/group, student names, venue/address, WhatsApp, map, safety alert, photo required badge, and Submit Record.
- Coach lesson form shows only attendance, completed/cancelled, short progress note, next focus, optional photo, and submit.
- Approved lessons are read-only.
- Coach sees own payroll only.
- Coach does not see payment amount, customer price, expenses, profit, or other coach payroll.

## 10. Storage Checks

In Supabase Storage:

- `lesson-photos` is private.
- `payment-proofs` is private.
- `expense-receipts` is private.

As Coach:

- Upload a photo for an assigned unapproved lesson.
- Confirm payment proof and expense receipt access is denied.

As Admin:

- Confirm Admin can manage lesson photos, payment proofs, and expense receipts.

## 11. Vercel Later

Before Vercel, complete the live Supabase checklist in `docs/ty-swim-academy-os-live-qa.md`.

Do not deploy until local/test Supabase QA is stable. When ready, use only these frontend env variables:

```bash
VITE_SUPABASE_URL=your-production-project-url
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

Never add a Supabase `service_role` key to Vercel frontend env variables.

Recommended future URL: `os.tyswimacademy.com`.

## 12. Do Not Deploy Yet

Keep this in local/test Supabase QA until:

- Admin and Coach demo flow works.
- System Check is clean.
- Lesson approval, payroll, and storage rules are verified.
- The owner and one coach can use the UI without explanation.

Future recommended URL after QA: `os.tyswimacademy.com`.
