# TY Swim Academy OS User Guide

This guide explains the current TY Swim Academy OS in simple English for the academy owner, Admin users, and Coaches. It is based on the current standalone Vite React app and Supabase setup in this repository.

Do not share passwords, Supabase keys, or private customer data when sending this guide to another person or AI tool.

## 1. What TY Swim Academy OS Is

TY Swim Academy OS is an internal staff system for running daily swim academy operations. It is separate from the public TY Swim Academy website.

It replaces spreadsheet-style tracking with a safer workflow for:

- families and customers
- students
- venues and addresses
- classes and groups
- lesson packages
- fixed weekly schedules
- flexible coach-arranged lessons
- coach lesson records
- Admin review and approval
- package lesson deduction
- coach payroll
- payments and expenses
- reports, import, cleanup, and system checks

The main problem it solves: coaches need enough information to coordinate lessons with customers, but they must not see private finance information such as customer price, payments, company income, expenses, or other coaches' payroll.

### Who Uses It

Admin:

- academy owner or trusted operations staff
- can see and manage all records
- can approve lessons
- can manage payments, expenses, payroll, settings, import, reports, and cleanup

Coach:

- swim coach assigned to classes and lessons
- can see assigned students, classes, venues, contacts, health notes, lesson history, and own payroll
- can submit lesson records and upload lesson photos
- can reschedule lessons with a reason
- cannot approve lessons or see sensitive finance information

### Sensitive Data

Sensitive data includes:

- customer charged price
- payment records
- payment proof screenshots
- company income
- expenses and receipts
- other coaches' salary/payroll
- Admin-only internal notes
- Supabase keys and passwords

Coach should not see any of the finance items above. Coach can see contact, address, health/safety, assigned lesson details, and their own expected pay.

Notes fields support Chinese/English mixed input. 简短备注可以中英混合填写.

## 2. Login And Roles

Open the app and sign in at `/login`.

### Admin Login

Admin signs in with the Admin email and password created in Supabase Auth. The Auth user must also have a matching row in the `profiles` table:

- `id` = Supabase Auth user ID
- `role` = `admin`
- `active` = true

After login, Admin goes to Today (`/dashboard`) and can access all Admin navigation.

### Coach Login

Coach signs in with the Coach email and password created in Supabase Auth. The Auth user must have:

- a matching `profiles` row with `role = coach`
- `active = true`
- a linked `coaches.profile_id` row

After login, Coach goes to Today and only sees Coach navigation.

### If Profile Is Missing

If Auth login succeeds but there is no matching staff profile, the login screen shows:

`Login succeeded, but your staff profile is missing or inactive. Please contact Admin.`

This means the email/password is correct, but the user is not connected to a staff profile yet.

### If Role Is Invalid Or Inactive

If the profile role is not `admin` or `coach`, the app shows a clear invalid role message.

If the profile is inactive, the app shows that the staff account is inactive and asks the user to contact Admin.

The login button has timeout/error handling so it should not spin forever.

### What Each Role Can See

Admin can see:

- all customers, students, venues, classes, packages, lessons
- payments, expenses, payroll, reports, import, cleanup, settings
- audit logs and lesson change logs
- payment proofs and expense receipts

Coach can see:

- assigned lessons
- assigned classes/groups
- assigned students
- assigned venues and map/address information
- student health notes, safety alerts, special needs, and lesson history
- own expected payroll items
- lesson photos for assigned lessons

Coach cannot see:

- customer price
- payments
- payment proofs
- expenses
- expense receipts
- company income/profit
- other coach payroll
- Admin-only financial notes

## 3. Admin Navigation

Admin navigation has six main items: Today, Students, Schedule, Review, Money, and More. Setup Check is available from Today and More.

### Today

Purpose: daily control centre.

Open Today first each day. It shows what needs attention without making Admin open every table.

Sections/cards:

- Today's lessons: lessons scheduled today
- Pending review: coach submissions that need Admin decision
- Reschedule alerts: date/time changes that Admin has not reviewed
- Renewals soon: packages with one lesson left or expiring soon
- Today and This Week: upcoming lesson list
- Next Actions: urgent items such as missing required photos, cancelled lessons, replacement lessons, missing data, and renewals
- Setup Checklist: appears when demo/new data is incomplete

Important buttons:

- Add Family: opens the guided Students workflow
- Schedule Lesson: opens Schedule
- Review Lessons: opens Review
- Setup Check: opens setup and permission checks

Data updated: Today itself mostly reads data. Buttons take you to pages that create or update records.

Warning: Pending review should be checked before assuming packages or payroll are up to date.

### Students

Purpose: beginner-friendly setup wizard for customer/family records.

Use this page when adding a new family. The default screen shows a real six-step setup wizard:

1. Add Family / Customer
2. Add Student(s)
3. Add Venue / Address
4. Create Class / Group
5. Add Package
6. Schedule First Lesson

Each step has a focused form and guides you to the next step after saving. The advanced tables are hidden under `Advanced records`.

Advanced tables:

- Families
- Students
- Venues
- Classes
- Packages

What each section means:

- Families: parent/customer contact and WhatsApp
- Students: student age, level, goal, health notes, safety alert, language, status
- Venues: pool address, map link, parking, access, pool notes
- Classes: teaching group, class type, assigned coach, schedule mode, photo required toggle
- Packages: package type, total lessons, used/remaining lessons, expiry, status

Important rule: package belongs to a family/group/class. A group lesson deducts one package lesson, not one per student.

### Schedule

Purpose: manage fixed weekly lessons and flexible coach-arranged lessons.

Two modes are shown clearly:

- Fixed Weekly: regular weekly timetable
- Flexible / Coach-arranged: appointment-style lessons coordinated by coach/customer

Fixed Weekly:

- Admin can create a fixed weekly schedule
- The app generates upcoming lessons from the recurring schedule
- A coach can reschedule one lesson occurrence without changing the whole weekly pattern

Flexible:

- Admin or Coach can create an appointment for a flexible class
- Coach-created flexible lessons create a change log for Admin attention
- Completion still requires Coach submit -> Admin approve

Buttons:

- Fixed Weekly: opens modal to create recurring schedule and generate lessons
- Flexible Lesson: opens modal to create a lesson appointment
- Filters: shows date, coach, class, status, mode, pending review, and replacement filters
- Create appointment: creates a flexible lesson for a flexible class

Warning: scheduling a lesson does not deduct a package or create payroll. Only Admin approval does that.

### Review

Purpose: approve or return coach submissions and schedule changes.

Tabs:

- Pending lesson records
- Rescheduled lessons
- Cancelled lessons
- Needs edit
- Missing required photos

Main actions:

- Approve: approves lesson and applies package/payroll if toggles are enabled
- Request edit / Needs Edit: sends lesson back for correction
- Reject: rejects record
- Open: opens full lesson detail to inspect attendance, notes, photos, package toggle, payroll toggle, replacement flag, change logs, and audit logs

Important rule: approval is the official step. Package remaining lessons and coach payroll should only change after approval.

### Money

Purpose: Admin-only finance workspace.

Tabs:

- Summary
- Payments
- Payroll
- Expenses

Summary cards:

- Payments collected
- Expenses
- Coach salary payable
- Estimated net

Payments:

- record customer payment
- link payment to package/customer
- upload payment proof screenshot
- export CSV

Payroll:

- generate monthly payroll
- view payroll periods and payroll items
- mark payroll paid
- export payroll CSV

Expenses:

- record expense such as pool fee, advertising, equipment, transport, software, bank charge
- upload receipt
- coach salary expenses are created automatically when payroll is marked paid

Warning: Money is Admin-only. Coaches must not see it.

### More

Purpose: advanced and occasional tools so the daily menu stays simple.

Tools:

- Help Guide: simple in-app usage summary
- Setup Check: setup, permission, storage, and demo-data checks
- CSV Import: import old Google Sheet CSV data
- Data Cleanup: find missing important data
- Reports: lesson, payment, expense, payroll, and renewal exports
- Settings: profiles, coaches, coach rates
- Detailed list routes for customers, venues, classes, packages, and lesson history

Use More when setup, troubleshooting, import, reports, or advanced data management is needed.

### Setup Check

Purpose: beginner-friendly setup and permission check page.

It checks:

- Supabase env variables
- current session
- current profile
- role
- core tables
- storage bucket reachability for Admin
- demo data presence
- pending review lesson
- coach profile link
- service_role key not exposed to frontend
- Admin access to payments, expenses, payroll
- Coach access restrictions when logged in as Coach
- basic data counts

Use it after:

- setting up Supabase
- running demo seed
- login problems
- permission/RLS concerns
- storage upload problems

If a check fails, read the Next action column.

## 4. Coach Navigation

Coach navigation has four main items: Today, My Schedule, My Students, and My Pay. Coach can also open Setup Check directly.

### Today

Purpose: mobile-first daily lesson cards.

Coach sees cards with:

- lesson time
- class/group name
- student names
- venue/address
- WhatsApp button
- Map button
- safety alert
- photo required badge when needed
- Submit Record button
- Approved label when read-only

Before class:

- check time and venue
- tap WhatsApp if coordination is needed
- tap Map if needed
- read safety/health alert
- check whether photo is required

After class:

- tap Submit Record
- record attendance and progress
- upload optional/required photo
- submit completed or cancelled lesson

### My Schedule

Purpose: see assigned upcoming fixed weekly and flexible lessons.

Coach can:

- view assigned lessons
- open lesson detail
- create flexible appointment if assigned to a flexible class
- update date/time with reschedule reason before approval

Coach cannot:

- see other coaches' lessons
- approve lessons
- edit approved lessons

### My Students

Purpose: see assigned student/customer information needed for lesson coordination.

Coach can see:

- assigned customer/family contact
- WhatsApp
- student name, age, gender, level, goal
- health notes, safety alert, special needs
- assigned venue/address and access notes
- assigned class/group details
- lesson history for assigned lessons

Coach cannot see:

- customer price
- payments
- expenses
- company income
- other coach payroll
- Admin-only finance notes

### My Pay

Purpose: show Coach's own expected pay.

Coach sees:

- expected pay from approved payable lessons
- approved lesson payroll items
- paid/unpaid status

Coach does not see:

- other coaches' payroll
- company expenses
- customer payments

### Coach Setup Check

Coach can open Setup Check directly, usually from the Setup Check button on Today or by going to `/system-check`.

This helps confirm:

- coach profile is linked
- assigned lessons are visible
- assigned students/classes/venues are visible
- payments and expenses are hidden
- other coach payroll is hidden

## 5. Core Workflows

### 1. Add A New Family / Customer

Admin:

1. Open Students.
2. Click Step 1 Add Family / Customer.
3. Open advanced table if needed.
4. Click Add Family in Customers / Families if using advanced records.
5. Enter display name, parent name, WhatsApp, secondary contact, source, status, and optional internal notes.
6. Save.

Result: a customer/family row is created.

### 2. Add Student(s)

Admin:

1. Open Students.
2. Click Step 2 Add Student(s).
3. Click Add Student in Students if using advanced records.
4. Choose the family/customer.
5. Enter display name, age, gender, level, learning goal, health notes, special needs, safety alert, preferred language, and status.
6. Save.

Result: student row is created and linked to family.

### 3. Add Venue / Address

Admin:

1. Open Students.
2. Click Step 3 Add Venue / Address.
3. Click Add Venue in Venues if using advanced records.
4. Choose customer if the venue belongs to a family.
5. Enter venue name, address, area, pool type, map link, parking/access/entry/depth notes.
6. Save.

Result: venue row is created.

### 4. Create Class / Group

Admin:

1. Open Students.
2. Click Step 4 Create Class / Group.
3. Click Add Class in Classes / Groups if using advanced records.
4. Choose customer, class type, scheduling mode, assigned coach, default venue, duration, photo required, and status.
5. Save.
6. In the Classes / Groups table, use the Students action to add the student(s) into the class/group.

Result: teaching group is created.

### 5. Add Package

Admin:

1. Open Students.
2. Click Step 5 Add Package.
3. Click Add Package in Packages if using advanced records.
4. Choose customer and class.
5. Select package type and enter total lessons.
6. Enter used/remaining lessons if needed.
7. Enter start/payment/expiry dates and status.
8. Save.

Result: package is created. Expiry can be calculated from package type/start date in the app utilities, but Admin should still verify package data.

### 6. Schedule Fixed Weekly Lesson

Admin:

1. Open Schedule.
2. Click Fixed Weekly.
3. Choose class, coach, venue, day of week, start/end time, and number of weeks to generate.
4. Save.

Result: recurring schedule is created and upcoming lesson rows are generated.

### 7. Schedule Flexible / Coach-Arranged Lesson

Admin or Coach:

1. Open Schedule.
2. Click Flexible Lesson.
3. Choose class.
4. Pick date, start, and end time.
5. Add coach note if useful.
6. Create lesson.

Result: flexible lesson is created. A lesson change log is added so Admin can see the change.

### 8. Coach Submits Lesson Record

Coach:

1. Open Today or My Schedule.
2. Open lesson.
3. Confirm date/time. If changed, enter reschedule reason.
4. Set attendance for each student.
5. Add short progress note.
6. Add next focus.
7. Upload photo if needed.
8. Click Lesson completed or Lesson cancelled.

Result:

- completed lesson becomes `completed_pending_review`
- cancelled lesson becomes `cancelled_pending_review`
- Admin must review it

### 9. Admin Reviews / Approves Lesson

Admin:

1. Open Review.
2. Choose Pending, Cancelled, Rescheduled, Needs edit, or Missing photos.
3. Click Approve for simple records, or Open for full detail.
4. Check attendance, progress, notes, photos, package toggle, payroll toggle, replacement flag.
5. Approve, Request edit, or Reject.

Result:

- approved lesson becomes `approved`
- if count package lesson is true, package is deducted once
- if coach payable is true, payroll item is created once

### 10. Package Lesson Deduction

Package deduction only happens when Admin approves a lesson and `count_package_lesson` is true.

The approval database function is designed to avoid double deduction if approval is attempted again.

For family/group packages, one approved group lesson deducts one lesson from the shared package, not one lesson per student.

### 11. Payroll Item Creation

Payroll item creation only happens when Admin approves a lesson and `coach_payable` is true.

The approval database function is designed to avoid duplicate payroll items for the same lesson.

### 12. Mark Payroll Paid

Admin:

1. Open Money.
2. Open Payroll.
3. Generate payroll for the month if needed.
4. Click Mark paid on the payroll period.
5. Confirm.

Result:

- payroll period becomes paid
- payroll items become paid
- coach salary expense is created once

### 13. Coach Salary Becomes Expense

When payroll is marked paid, the database function creates an expense row with category `coach_salary` linked to the payroll period.

A unique database index prevents duplicate coach salary expenses for the same paid payroll period.

### 14. Payment Proof Upload

Admin:

1. Open Money.
2. Open Payments.
3. Add or edit a payment.
4. Upload proof screenshot to the private `payment-proofs` bucket.
5. Save.

Coach cannot access payment proofs.

### 15. Expense Receipt Upload

Admin:

1. Open Money.
2. Open Expenses.
3. Add or edit an expense.
4. Upload receipt to the private `expense-receipts` bucket.
5. Save.

Coach cannot access expense receipts.

### 16. Setup Check Usage

Admin:

1. Open More.
2. Open Setup Check.
3. Read pass/warning/fail rows.
4. Follow the Next action text.
5. Check Basic Data Counts.

Coach:

1. Open Setup Check from Today or go to `/system-check`.
2. Confirm assigned lessons/students are visible.
3. Confirm finance is hidden.

### 17. Demo Seed / Testing Usage

Use demo seed only in a test Supabase project.

1. Create Admin and Coach users in Supabase Auth.
2. Copy their Auth user IDs.
3. Open `supabase/demo-seed.sql`.
4. Replace the Admin and Coach Auth ID variables where the file instructs you.
5. Run the SQL in Supabase SQL Editor.
6. Log in as Admin and open Setup Check.
7. Log in as Coach and open Setup Check.

Demo rows use `DEMO-*` codes so they can be reset without deleting future real records.

Do not mix demo data with real customer data in production.

## 6. Button And Action Reference

| Button / Action | Page | Role | What it does | Side effect / warning |
| --- | --- | --- | --- | --- |
| Add Family | Today / Students | Admin | Opens Students guided workflow | Creates customer data when saved |
| Add Family / Add Student / Add Venue / Add Class / Add Package | Advanced records | Admin | Opens a modal to create the matching record type | Use the setup wizard first for normal new families |
| Add Student | Students workflow | Admin | Opens student setup area | Student should be linked to a family |
| Add Class | Students workflow / classes table | Admin | Creates class/group | Must assign coach and schedule mode carefully |
| Add Package | Students workflow / packages table | Admin | Creates package | Package count must match paid package |
| Schedule Lesson | Today / Schedule | Admin | Opens Schedule | Scheduling alone does not deduct package |
| Fixed Weekly | Schedule | Admin | Creates recurring weekly schedule | Generated lessons can be individually rescheduled |
| Flexible Lesson | Schedule | Admin / Coach | Creates flexible appointment | Coach-created appointment creates Admin change log |
| Create appointment | Schedule | Admin / Coach | Starts flexible lesson creation | Final completion still needs review |
| Filters | Schedule | Admin / Coach | Shows date/coach/class/status filters | Does not change data |
| Submit Record | Coach Today / lesson card | Coach | Opens lesson submission | Coach cannot submit approved read-only lessons |
| Save draft | Lesson detail | Coach / Admin | Saves lesson notes, attendance, date/time | Date/time change requires reschedule reason |
| Lesson completed | Coach lesson detail | Coach | Sends lesson to pending review | Does not deduct package until Admin approves |
| Lesson cancelled | Coach lesson detail | Coach | Sends cancellation to pending review | Admin decides replacement/payroll/package effect |
| Upload Photo | Lesson detail | Coach / Admin | Uploads image to `lesson-photos` | Coach only for assigned lessons; bucket is private |
| Approve | Review | Admin | Approves lesson | Can deduct package once and create payroll item once |
| Approve and apply package/payroll | Lesson detail | Admin | Runs lesson approval function | Check toggles before approving |
| Request edit / Needs Edit | Review | Admin | Sends lesson back for correction | Coach must update and resubmit |
| Reject | Review | Admin | Rejects lesson record | Does not deduct package or create payroll |
| Generate | Payroll | Admin | Generates monthly payroll period/items | Based on approved payable lessons |
| Mark paid | Payroll | Admin | Marks payroll paid | Creates coach salary expense once |
| Upload Payment Proof | Payments | Admin | Uploads proof screenshot | Admin-only private bucket |
| Upload Expense Receipt | Expenses | Admin | Uploads receipt | Admin-only private bucket |
| Export CSV | Tables / Money / Reports | Admin mostly, Coach where allowed | Downloads visible rows | Be careful not to share exported sensitive data |
| Import preview rows | CSV Import | Admin | Imports mapped CSV rows | Use test data first; phone numbers are text |
| Run Setup Check | Today / More / direct | Admin / Coach | Checks setup and access | Coach check proves coach-scoped view only |
| Open | Review / cleanup | Admin | Opens detailed record | Use for records needing inspection |
| Delete lesson photo | Lesson detail | Admin | Deletes photo from storage and row | Confirm before deleting |

## 7. Status Meanings

| Status | Simple meaning |
| --- | --- |
| `scheduled` | Lesson is planned but not submitted yet |
| `rescheduled` | Date/time changed and Admin should review the change |
| `completed_pending_review` | Coach submitted completed lesson; Admin must approve |
| `cancelled_pending_review` | Coach submitted cancellation; Admin must review |
| `needs_edit` | Admin wants Coach/Admin to fix details before approval |
| `approved` | Admin approved; package/payroll effects have been applied if enabled |
| `rejected` | Admin rejected the lesson record |
| `archived` | Record is hidden from normal daily use but kept for history |
| `paid` | Payment/payroll item/period has been paid |
| `unpaid` | Not paid yet, or still payable |
| `active` | Record is currently in use |
| `inactive` | Record is not currently in use |
| `completed` | Package/customer/class reached a completed state |
| `expired` | Package expiry date has passed |
| `void` | Record is intentionally cancelled/invalid but kept for audit history |
| `paused` | Temporarily stopped |
| `draft` | Payroll or record is being prepared |
| `ready` | Payroll or record is ready for next step |

## 8. Safety Rules

### Why Approved Lessons Are Locked For Coach

Approved lessons affect package counts and payroll. If coaches could edit approved lessons, package count and payroll history could become unreliable. Coach must ask Admin for corrections after approval.

### Why Admin Review Is Required

Coach submits lesson records, but Admin confirms whether the lesson should count for package deduction, payroll, replacement, or cancellation handling.

### Why Coach Cannot See Customer Price

Customer price is private company finance. Coaches only need operational details and their own pay.

### Why Coach Cannot See Payments Or Expenses

Payments, payment proof, company income, expenses, and receipts are Admin-only. This protects customer privacy and business finance.

### Why Storage Buckets Are Private

Lesson photos, payment proofs, and expense receipts may contain private people, children, addresses, payment details, or receipts. Buckets must stay private and files should be viewed through signed access only.

### Why `service_role` Must Never Be Used In Frontend Or Vercel

The Supabase service role key bypasses RLS. If it is exposed in a browser app, anyone could potentially access or change protected data. The frontend must only use:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Why Demo Data Should Not Mix With Real Data

Demo rows are for testing. They use `DEMO-*` codes so they can be reset safely. In production, avoid mixing demo customers, students, packages, and payments with real records.

## 9. Practical Daily Routine

Admin daily routine:

1. Open Today.
2. Check pending review and reschedule alerts.
3. Approve straightforward lessons.
4. Open detailed lesson if notes/photos/package/payroll need checking.
5. Follow up packages with one lesson left or expiring soon.
6. Check replacement lessons and missing data.
7. Use Money weekly/monthly for payroll, payments, expenses, and exports.

Coach daily routine:

1. Open Today before lessons.
2. Check time, WhatsApp, map, safety notes, and photo requirement.
3. Teach lesson.
4. Submit lesson record after class.
5. Check My Pay for approved payable lessons.
