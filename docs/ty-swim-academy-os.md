# TY Swim Academy OS

TY Swim Academy OS is the standalone internal Admin/Coach operations system for TY Swim Academy. It is separate from the public marketing website.

## Setup

1. Create a Supabase project.
2. Add these variables to `.env.local`:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Confirm these private Storage buckets exist:
   - `lesson-photos`
   - `payment-proofs`
   - `expense-receipts`
5. Run the app with `npm run dev` and open `/login`.

If env variables are missing, the app shows a setup message instead of crashing.

## Daily Navigation

Admin sees:

- Today
- Students
- Schedule
- Review
- Money
- More

Coach sees:

- Today
- My Schedule
- My Students
- My Pay

Advanced routes such as `/customers`, `/venues`, `/classes`, `/packages`, `/payments`, `/expenses`, `/import`, `/data-cleanup`, `/reports`, and `/settings` still exist, but they are grouped under the simplified daily navigation.

## First Admin

1. In Supabase Auth, create an email/password user for the owner/Admin.
2. Copy the Auth user ID.
3. Insert the profile:

```sql
insert into public.profiles (id, full_name, email, role, active)
values ('AUTH_USER_ID_HERE', 'TY Swim Admin', 'admin@example.com', 'admin', true);
```

4. Sign in at `/login`.

Coaches are created the same way, with `role = 'coach'`, then linked to a row in `coaches.profile_id`.

## Role Permissions

Admin can read and manage all OS tables, payments, expenses, payroll, settings, imports, and review approvals.

Coach can read only assigned customers, students, venues, classes, lessons, lesson participants, lesson photos, consents, and their own payroll. Coach cannot read payment records, customer charged price, company income, expenses, profit, other coaches' payroll, or Admin-only notes stored in financial tables.

Coach lesson changes are limited to their own unapproved lessons. Approved lessons are locked from coach editing by RLS and by the UI.

## Core Tables

The schema includes:

`profiles`, `coaches`, `coach_rates`, `customers`, `students`, `venues`, `classes`, `class_students`, `packages`, `package_financials`, `recurring_schedules`, `lessons`, `lesson_participants`, `lesson_photos`, `lesson_change_logs`, `payroll_periods`, `payroll_items`, `expenses`, `consents`, `import_batches`, `audit_logs`, and `settings`.

Financial data is intentionally separated from packages in `package_financials`, which is Admin-only.

## Approval Rules

Coach completion flow:

1. Coach updates attendance, progress, notes, optional photos, and submits the lesson.
2. Lesson status becomes `completed_pending_review` or `cancelled_pending_review`.
3. Admin reviews in `/review`.
4. Admin approval calls `approve_lesson`.

`approve_lesson` enforces:

- Package deduction happens once only, using `lessons.approved_package_applied`.
- Family/group packages deduct one lesson per approved group lesson, not per participant.
- Payroll item creation happens once only, using the unique `payroll_items.lesson_id`.
- Only approved lessons with `count_package_lesson = true` affect package usage.
- Only approved lessons with `coach_payable = true` affect payroll.

If an approval must be reversed, void or adjust with an Admin note and audit trail instead of hard-deleting records.

## Scheduling

Fixed weekly schedules are stored in `recurring_schedules`. Admin can generate upcoming lessons with `generate_lessons_from_schedule`. Rescheduling one generated lesson updates only that lesson and writes a `lesson_change_logs` row.

Flexible classes let Admin or assigned Coach create lesson appointments. Coach-created flexible lessons still require final Admin approval after completion.

Package expiry creates reminders in the UI; it does not delete or stop lessons automatically.

## CSV Import

Open `/import`, select the import type, upload a CSV, review the preview, then import.

Customer/package summary supports headers such as:

```text
电话号码, phone_number, 课程, class_type, 教练, coach_code, 配套, package_total, 状态, status,
开始日期, start_date, 最后上课日期, last_lesson_date, 价钱, price, 教练工资, coach_wage,
介绍费, referral_fee, 总, total, 已上堂, used_lessons, 剩余堂, remaining_lessons, 要求提醒, reminder
```

Lesson record import supports:

```text
电话号码, phone_number, 教练, coach_code, 上课日期, lesson_date, 工资, wage,
备注, note, 结账, payroll_status, 结账日期, payroll_paid_date
```

Import behavior:

- Phone numbers are kept as strings to preserve leading zeros.
- Missing names become placeholders like `Customer 1668`, `Student 1668`, and `Group 1668`.
- Customer summary import creates customer, student, class, package, and Admin-only financial rows.
- Legacy lesson import marks lessons as approved historical records with `count_package_lesson = false` and `coach_payable = false` so imported summary used/remaining counts are not double-counted.
- Import history is stored in `import_batches`.

## Storage

Buckets are private:

- `lesson-photos`: Coach can upload/read only photos for their own lessons. Admin can manage all.
- `payment-proofs`: Admin only.
- `expense-receipts`: Admin only.

The UI stores private storage paths in database rows. Add signed URL viewing later if you want inline previews.

## Exports

Most list pages include CSV export. Payroll, reports, renewals, and operational tables export CSV first. Excel export can be added later with a workbook library if needed.

## Recommended Next Batch

- Add server-side Edge Functions for signed private image previews.
- Add richer calendar views after real operational data is loaded.
- Add bulk CSV row error reporting table if imports become large.
- Add notification delivery through email/WhatsApp after Admin notification rules are finalized.

## Vercel Later

Do not deploy this app to Vercel until local QA and Supabase test-project QA are stable.

Recommended order:

1. Test locally with `.env.local`.
2. Run `supabase/schema.sql` in a Supabase test project.
3. Load fake data with `supabase/demo-seed.sql`.
4. Run the Admin and Coach flows in `docs/ty-swim-academy-os-testing-guide.md`.
5. Deploy to Vercel only after System Check is clean and the demo flow feels stable.

Future recommended URL: `os.tyswimacademy.com`.
