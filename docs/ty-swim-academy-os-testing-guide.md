# TY Swim Academy OS Testing Guide

This guide is for local QA with a Supabase test project. Do not deploy to Vercel yet.

## 1. Local App Checks

Run:

```bash
npm install
npm run build
npm run smoke:routes
```

Expected:

- Install completes with 0 vulnerabilities.
- Build completes without errors.
- Smoke routes return `PASS 200` for core routes.

## 2. Supabase Test Project

1. Create a separate Supabase project for testing.
2. Run `supabase/schema.sql`.
3. Create one Admin Auth user and one Coach Auth user.
4. Copy both Auth user IDs.
5. Open `supabase/demo-seed.sql`.
6. Replace:
   - `00000000-0000-0000-0000-000000000001` with the Admin Auth user ID.
   - `00000000-0000-0000-0000-000000000002` with the Coach Auth user ID.
7. Run `supabase/demo-seed.sql`.

The demo seed uses fake data only and deletes previous `DEMO-*` rows before inserting fresh demo data.

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

## 4. Admin Test Script

Sign in as Admin.

Check:

- `/dashboard`: Today Control Centre shows setup/data cards.
- `/students`: guided workflow appears.
- `/schedule`: Fixed Weekly and Flexible modes are separate and understandable.
- `/review`: review categories show pending, rescheduled, cancelled, needs edit, missing photos.
- `/money`: payments, payroll, expenses, and export summary are grouped.
- `/more`: System Check, import, cleanup, reports, settings, and advanced tools are available.
- `/system-check`: all setup checks are pass or understandable warnings.

Flow:

1. Open the demo scheduled lesson.
2. Confirm Admin can see package/payroll toggles.
3. Approve a pending test lesson after Coach submits it.
4. Approving the same lesson again must not deduct package or create payroll twice.
5. Generate payroll.
6. Mark payroll paid.
7. Mark paid again must not create duplicate coach salary expense.

## 5. Coach Test Script

Sign in as Coach.

Check:

- Navigation shows only Today, My Schedule, My Students, My Pay.
- Coach cannot open `/money`, `/payments`, `/expenses`, `/review`, `/import`, `/settings`, or `/system-check`.
- Today cards show lesson time, class/group, student names, venue/address, WhatsApp, map, safety alert, photo required badge, and Submit Record.
- Coach lesson form shows only attendance, completed/cancelled, short progress note, next focus, optional photo, and submit.
- Approved lessons are read-only.
- Coach sees own payroll only.
- Coach does not see payment amount, customer price, expenses, profit, or other coach payroll.

## 6. Storage Checks

In Supabase Storage:

- `lesson-photos` is private.
- `payment-proofs` is private.
- `expense-receipts` is private.

As Coach:

- Upload a photo for an assigned unapproved lesson.
- Confirm payment proof and expense receipt access is denied.

As Admin:

- Confirm Admin can manage lesson photos, payment proofs, and expense receipts.

## 7. Do Not Deploy Yet

Keep this in local/test Supabase QA until:

- Admin and Coach demo flow works.
- System Check is clean.
- Lesson approval, payroll, and storage rules are verified.
- The owner and one coach can use the UI without explanation.

Future recommended URL after QA: `os.tyswimacademy.com`.
