# TY Swim Academy OS Live Supabase QA

Use this before Vercel. It verifies the OS against a real Supabase test project with RLS enabled.

Do not use real customer/student data. Do not add a `service_role` key to frontend env variables.

## 1. Test Setup

Create two Supabase Auth users:

- Admin test user
- Coach test user

Run:

1. `supabase/schema.sql`
2. `supabase/demo-seed.sql`

If this is an existing test project with an older OS schema, run `supabase/skill-progress-migration.sql` and `supabase/pre-real-use-safety-migration.sql` before rerunning `demo-seed.sql`.

Before running `demo-seed.sql`, replace:

- `00000000-0000-0000-0000-000000000001` with the Admin Auth user ID.
- `00000000-0000-0000-0000-000000000002` with the Coach Auth user ID.

You can rerun `demo-seed.sql` anytime to reset demo data. It deletes only `DEMO-*` rows and `DEMO_SEED` records.

After a successful seed, these records should exist:

- `DEMO-PKG-0001`
- `DEMO-LES-0001` with status `scheduled`
- `DEMO-LES-0002` with status `scheduled`
- `DEMO-LES-0003` with status `completed_pending_review`
- fake Level 1 progress for the two demo students

If `npm run qa:check` says demo lessons are missing, rerun the latest `supabase/demo-seed.sql`. The seed now raises an error if it cannot create `DEMO-LES-0003` as pending review.

## 2. Local Env

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your-test-project-url
VITE_SUPABASE_ANON_KEY=your-test-project-anon-key
QA_ADMIN_EMAIL=admin-test-email
QA_ADMIN_PASSWORD=admin-test-password
QA_COACH_EMAIL=coach-test-email
QA_COACH_PASSWORD=coach-test-password
```

Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are frontend env variables. Never add a Supabase `service_role` key here.

## 3. Run Automated Checks

Basic local checks:

```bash
npm install
npm run build
npm run smoke:routes
```

Live read/RLS check:

```bash
npm run qa:check
```

Full demo mutation check:

```bash
QA_RUN_MUTATIONS=true npm run qa:check
```

On PowerShell:

```powershell
$env:QA_RUN_MUTATIONS='true'
npm run qa:check
Remove-Item Env:\QA_RUN_MUTATIONS
```

The mutation check expects fresh demo data. If package deduction or pending review checks fail because the demo lesson was already approved, rerun `supabase/demo-seed.sql` and run the command again.

## 4. What The QA Script Checks

Admin:

- Admin login works.
- Admin profile exists and is active.
- Required tables are readable.
- Private storage buckets are reachable by Admin using bucket-specific checks.
- Demo package and lessons exist.
- Pending review demo lesson exists.
- Payment, expense, and payroll data are accessible to Admin.
- Student skill progress data is accessible.
- `/skill-levels` shows the Level 1-6 syllabus and demo student progress.
- Admin can export all data JSON and an audit log is written.
- Audit Logs page is Admin-only.
- Approved unpaid lessons can be safely reversed; paid payroll reversals are blocked.
- Lesson photo marketing usage is blocked unless every active student has marketing-approved consent.
- Admin can approve the demo pending lesson.
- Package remaining lessons deducts exactly once.
- Payroll item is created exactly once.
- Monthly payroll can be generated.
- Mark payroll paid creates exactly one expense.
- Repeating mark paid does not duplicate the expense.
- Admin can upload, signed-preview, and delete payment proof and expense receipt test files.

Coach:

- Coach login works.
- Coach profile exists and is active.
- Coach row is linked to the login profile.
- Coach can see assigned lessons/classes/students/venues.
- Coach cannot see payments.
- Coach cannot see expenses.
- Coach cannot see other coach payroll.
- Coach cannot approve a lesson.
- Coach can upload and signed-preview a lesson photo only for an assigned unapproved lesson.
- Coach cannot upload payment proofs.
- Coach cannot upload expense receipts.

The script does not use `listBuckets()` as the source of truth, because Supabase may not reliably expose bucket listing through an anon/authenticated frontend client. Instead:

- Read-only QA checks Admin reachability with `storage.from(bucket).list(...)`.
- Mutation QA checks real upload, signed preview, and delete behavior.
- Bucket privacy is still controlled by `supabase/schema.sql`, which creates all three buckets with `public = false`.

If the bucket reachability check fails:

1. Rerun `supabase/schema.sql`.
2. In Supabase Dashboard, open Storage and confirm these private buckets exist:
   - `lesson-photos`
   - `payment-proofs`
   - `expense-receipts`
3. Confirm the storage policies from `schema.sql` exist.
4. Rerun `npm run qa:check`.

## 5. System Check

Run the app:

```bash
npm run dev
```

Admin flow:

1. Log in as Admin.
2. Open `/system-check`.
3. Confirm setup, demo data, storage buckets, payments, expenses, payroll, and recommended next action.

Coach flow:

1. Log out.
2. Log in as Coach.
3. Open `/system-check` or click `Run Coach Check` on Coach Today.
4. Confirm assigned lessons/classes/students/venues are visible.
5. Confirm payment and expense checks say hidden.
6. Confirm payroll shows own items only.

## 6. Manual UI Flow

After rerunning `demo-seed.sql`:

1. Log in as Coach.
2. Open Today or My Schedule.
3. Open `DEMO-LES-0001` or the visible scheduled lesson.
4. Add attendance/progress/next focus.
5. Upload a lesson photo.
6. Click `Lesson completed`.
7. Confirm the lesson becomes Pending Review.
8. Log in as Admin.
9. Open Review.
10. Approve the pending lesson.
11. Open Students or Packages and confirm the package remaining count decreased by 1.
12. Approve again or run the QA script and confirm it does not deduct again.
13. Open Money -> Coach Payroll.
14. Generate payroll for the lesson month.
15. Mark payroll paid.
16. Open Expenses and confirm one coach salary expense exists.

## 7. SQL Verification Queries

Run these in Supabase SQL editor after the mutation QA:

```sql
select package_code, total_lessons, used_lessons, remaining_lessons, status
from public.packages
where package_code = 'DEMO-PKG-0001';

select lesson_code, status, count_package_lesson, coach_payable, approved_package_applied
from public.lessons
where lesson_code like 'DEMO-LES-%'
order by lesson_code;

select l.lesson_code, count(pi.id) as payroll_items
from public.lessons l
left join public.payroll_items pi on pi.lesson_id = l.id
where l.lesson_code = 'DEMO-LES-0003'
group by l.lesson_code;

select pp.period_month, pp.status, pp.total_lessons, pp.total_amount, count(e.id) as linked_expenses
from public.payroll_periods pp
left join public.expenses e on e.linked_payroll_period_id = pp.id and e.category = 'coach_salary'
join public.coaches c on c.id = pp.coach_id
where c.coach_code like 'DEMO%'
group by pp.id
order by pp.period_month desc;
```

RLS should be verified through the app or `npm run qa:check`, not only through the SQL editor, because the SQL editor runs with elevated database privileges.

## 8. Vercel Decision

Only move to Vercel preview after:

- `npm run qa:check` passes with Admin and Coach credentials.
- `QA_RUN_MUTATIONS=true npm run qa:check` passes on fresh demo data.
- Admin and Coach `/system-check` have no unexplained failures.
- Signed previews work for lesson photos, payment proofs, and expense receipts.

Vercel preview settings later:

- Build command: `npm run build`
- Output directory: `dist`
- Env variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Never add `service_role`
- Future production URL: `os.tyswimacademy.com`
