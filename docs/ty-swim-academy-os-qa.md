# TY Swim Academy OS QA

Date: 2026-05-28

## Build And App Smoke Test

- [x] `npm install` completed with 0 vulnerabilities.
- [x] `npm run build` completed successfully after the QA/UI changes.
- [x] Standalone Vite routes returned HTTP 200 for `/`, `/login`, and `/dashboard`.
- [x] Added `npm run smoke:routes` for repeatable local route checks.
- [x] Added `npm run qa:check` for live Supabase Admin/Coach RLS and workflow checks when test credentials are available.
- [x] Live QA and System Check use bucket-specific reachability checks instead of unreliable `listBuckets()` output.
- [x] Missing Supabase env variables keep the app from crashing and show the setup screen.

## Schema And Frontend Consistency

- [x] Frontend table queries match tables created by `supabase/schema.sql`.
- [x] Coach data loading no longer requests Admin-only `package_financials`, `expenses`, `import_batches`, or `audit_logs`.
- [x] Admin data loading still includes operational, finance, payroll, import, and audit tables.
- [x] CSV import field mapping supports English headers and Chinese simplified/traditional headers.
- [x] Added `supabase/demo-seed.sql` with safe fake data and replaceable Auth user ID placeholders.
- [x] Demo seed can be rerun to reset only `DEMO-*` / `DEMO_SEED` data.
- [x] Demo seed includes fixed weekly schedule, fixed scheduled lesson, flexible scheduled lesson, and one pending-review lesson.
- [x] Demo seed now force-resets `DEMO-LES-0003` to `completed_pending_review` and raises an error if that row is not created.

## Auth And Roles

- [x] Login uses Supabase email/password auth.
- [x] Login now has timeout/error handling so the button cannot spin forever.
- [x] Missing profile, invalid role, inactive profile, wrong password, and missing env variables show clear setup messages.
- [x] Admin route access remains unrestricted by UI and RLS.
- [x] Coach main navigation is limited to Today, My Schedule, My Students, and My Pay.
- [x] Coach direct access to Admin-only sections returns the No Access screen.
- [x] Coach RLS can read assigned students/classes/lessons/venues and own payroll.
- [x] Coach RLS cannot read payment records, expenses, import batches, audit logs, or other coach payroll.

## Lesson Flow

- [x] Coach lesson submit path updates lessons to `completed_pending_review` or `cancelled_pending_review`.
- [x] Approved lessons are read-only for Coach in the UI.
- [x] Added database trigger to block Coach edits to approved lessons.
- [x] Tightened lesson participant RLS so Coach can read approved records but cannot edit approved attendance/progress.
- [x] Added database trigger to block Coach edits to financial/Admin review fields such as `count_package_lesson`, `coach_payable`, `need_replacement`, `admin_notes`, and review metadata.
- [x] Admin approval uses `approve_lesson`.
- [x] Package deduction is guarded by `approved_package_applied` and only runs once.
- [x] Payroll item creation is guarded by unique `payroll_items.lesson_id` and only runs once.

## Payroll Flow

- [x] Payroll generation groups approved payable lessons by coach/month.
- [x] Mark paid calls `mark_payroll_paid`.
- [x] Coach salary expense creation is guarded by a unique partial index on `expenses.linked_payroll_period_id` for `coach_salary`.
- [x] Coach can see own expected/paid payroll only.

## CSV Import

- [x] Phone numbers are treated as strings in import mapping.
- [x] Placeholder names are created from the phone last four digits.
- [x] Customer/package summary creates family, student, class, package, and Admin-only payment data.
- [x] Legacy lesson import sets `count_package_lesson = false` and `coach_payable = false`, preventing double package/payroll counting from historical rows.
- [x] Import batch counts are recorded.

## Storage And Sensitive Files

- [x] SQL creates `lesson-photos`, `payment-proofs`, and `expense-receipts` as private buckets.
- [x] Coach can insert/read lesson photos only for own lessons.
- [x] Coach cannot upload photos after a lesson is approved.
- [x] Coach cannot delete lesson photos; Admin can manage photos.
- [x] Payment proof and expense receipt storage policies are Admin-only.
- [x] Private lesson photos, payment proofs, and expense receipts now use signed preview links in the UI.
- [x] Admin can delete lesson photos and uploaded private payment/expense files from the UI.

## Sensitive UI Exposure

- [x] Coach navigation hides Money, Review, Import, Cleanup, Reports, Settings, Payments, and Expenses.
- [x] Coach data loading excludes payment/expense/audit/import tables.
- [x] Coach-facing screens do not show customer charged price, company income, payments, expenses, profit, or other coaches' payroll.
- [x] Added Admin-only `/system-check` page under More.
- [x] System Check shows env, session, profile, role, table, storage, demo data, coach profile, sensitive-module, payroll-scope, service-role, and data-count checks.
- [x] Admin backup export downloads JSON rows only and logs the export when audit insert is available.
- [x] Audit Logs page is Admin-only and read-only.
- [x] Approved lesson reversal is Admin-only, requires a reason, restores package only once, voids unpaid payroll, and blocks paid payroll reversal.
- [x] Lesson photo usage defaults to internal, Coach uploads stay internal, and marketing usage requires student marketing-approved consent.
- [x] Coach can open `/system-check` as a Coach Check to verify assigned records are visible and financial records stay hidden.

## UX QA

- [x] Admin Today page is a control centre with quick actions instead of a finance-heavy dashboard.
- [x] Admin Today now includes cancelled lesson and missing required photo attention cards.
- [x] Students page now starts with a guided setup flow and hides advanced tables until needed.
- [x] Schedule page clearly separates Fixed Weekly and Flexible / Coach-arranged modes.
- [x] Review page groups Pending, Rescheduled, Cancelled, Needs Edit, and Missing Photos.
- [x] Money page groups Payments, Coach Payroll, Expenses, and Export / Accounting Summary.
- [x] Coach Today cards are mobile-first and show contact, map, safety, photo requirement, and Submit Record.
- [x] Coach lesson submission is simplified to attendance, completed/cancelled, progress, next focus, photo, and submit.

## Live Supabase Test Still Recommended

These need real Supabase project credentials and test users to verify against live RLS responses:

- [ ] Create one Admin user and one Coach user in Supabase Auth.
- [ ] Link the Coach profile to a coach row.
- [ ] Create sample assigned and unassigned classes.
- [ ] Confirm Coach cannot query unassigned records from the browser.
- [ ] Upload a lesson photo as Coach and confirm payment/expense bucket access is denied.
- [ ] Run one real Coach submit -> Admin approve -> payroll -> paid payroll flow.
