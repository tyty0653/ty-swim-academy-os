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

### Language

The OS supports English and 中文. Use the language toggle on the login page or in More -> Account. The choice is saved in the same browser, so Admin and Coach can keep the interface in the language they prefer. Notes, health information, lesson progress, and internal comments can still mix Chinese and English freely.

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

Purpose: student and family workspace.

Students now has two simple modes:

- Student / Family Profiles: the normal daily view for searching students, checking safety, package status, progress, venue, coach, and recent lessons.
- Add Student / Family: a guided setup flow for creating a new family, student, venue, class, package, and first lesson.

Use Student / Family Profiles when you want to check or update an existing student. Use Add Student / Family when a new family joins. Advanced records stay hidden under `Advanced records` for unusual corrections and exports.

The Add Student / Family flow has six steps:

1. Add Family / Customer
2. Add Student(s)
3. Add Venue / Address
4. Create Class / Group
5. Add Package
6. Schedule First Lesson

Each step has a focused form and guides you to the next step after saving. You can save progressively. If some information is not ready, save what you know first and finish the missing items later from the profile.

The setup sections collect:

- Family / Parent: family display name, parent name, WhatsApp, secondary contact, source, and Admin-only internal note.
- Student Basic Info: student name, age, gender, current Level 1-6, language, and learning goal.
- Health & Safety: health notes, special needs or water confidence, safety alert, emergency notes, and photo consent.
- Venue / Location: pool name, full address, area, map link, pool type, access instruction, parking note, and pool depth/safety note.
- Class / Lesson Setup: group name, class type, assigned coach, duration, fixed weekly or flexible schedule, default day/time if fixed weekly, and photo-required setting.
- Package: package type, total lessons, remaining lessons, validity, payment date, Admin-only customer price, payment status, and payment method.
- First Lesson: date, start time, end time, coach, venue, and package link.

Payment proof upload stays in Money -> Payments because payment proof files are private Admin-only files.

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

### Student / Family Profile

Open a profile from Students by clicking `Open Profile` on a student card.

The profile header shows:

- student name
- family/parent
- WhatsApp button
- map button
- current level badge
- package remaining badge
- student status

Profile cards:

- Safety: health notes, special needs, safety alert, and photo consent.
- Lesson Setup: coach, class type, schedule mode, venue, address, access notes, parking, and pool notes.
- Package: remaining lessons, used lessons, expiry date, status, and renewal warning.
- Progress: current Level 1-6, current focus, last assessment, passed criteria count, and Update Progress.
- Recent Lessons: latest lesson records, status, coach note, and photo count.
- Admin-only Finance: customer price/payment records, proof storage path, and internal notes. This card is hidden from Coach.

The profile also highlights missing data such as missing WhatsApp, age, health confirmation, venue address, Google Maps link, coach, package, photo consent, or current level.

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

### Backup Export

Admin can export all Admin-accessible database records from More -> Admin Tools or Reports.

The JSON backup includes operational records, finance/payment/payroll/expense records, lesson records, student progress records, audit logs if accessible, and storage paths saved in database rows. It does not include raw image files, payment proof file binaries, or expense receipt file binaries.

Keep the JSON file private. It can contain customer, child/student, lesson, and finance data.

### Audit Logs

Audit Logs are Admin-only and read-only. They show date/time, actor, action, entity type, record id/code, and a short summary. Use them to check important changes such as lesson approvals, reversals, payment edits, package updates, payroll actions, expense changes, and backup exports.

### More

Purpose: advanced and occasional tools so the daily menu stays simple.

Tools:

- Help Guide: simple in-app usage summary
- Setup Check: setup, permission, storage, and demo-data checks
- Levels & Progress: TY Swim Academy Level 1-6 syllabus and student progress tracking
- CSV Import: import old Google Sheet CSV data
- Data Cleanup: find missing important data
- Reports: lesson, payment, expense, payroll, and renewal exports
- Audit Logs: read-only history of important changes and backup exports
- Export All Data JSON: Admin backup download from More -> Admin Tools or Reports
- Settings: profiles, coaches, coach rates
- Detailed list routes for customers, venues, classes, packages, and lesson history

Use More when setup, troubleshooting, import, reports, backup export, audit review, or advanced data management is needed.

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

Coach navigation has four main items: Today, My Schedule, My Students, and My Pay. Coach can also open My Account Check from Today or More.

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

The Coach view is a simplified profile-card view, not an admin table. Coach can search assigned students, open a student profile, tap WhatsApp, tap Map, and update progress.

Coach can see:

- assigned customer/family contact
- WhatsApp
- student name, age, gender, level, goal
- current TY Swim skill level, current focus, passed skills, and assessment notes
- health notes, safety alert, special needs
- assigned venue/address and access notes
- assigned class/group details
- lesson history for assigned lessons

Coach student profiles show Safety first, then lesson setup, package remaining count, progress, and recent lessons. Finance cards are not shown to Coach.

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

### My Account Check

Coach can open My Account Check from Today, More, or by going to `/system-check`.

This helps confirm:

- account is active
- coach profile is linked
- assigned lessons are visible
- assigned students and venues are visible
- My Pay access is working
- finance and admin-only records are hidden for privacy

It does not show technical setup details. If something looks wrong, Coach should contact Admin.

## 5. Core Workflows

### 1. Add A New Family / Customer

Admin:

1. Open Students.
2. Click Add Student / Family.
3. Open Step 1 Add Family / Customer.
4. Enter family display name, parent name, WhatsApp, secondary contact, source, and optional internal note.
5. Save Family.

Result: a customer/family row is created.

### 2. Add Student(s)

Admin:

1. Open Students.
2. Click Add Student / Family.
3. Open Step 2 Add Student(s).
4. Choose the family/customer.
5. Enter display name, age, gender, current Level 1-6, preferred language, learning goal, health notes, special needs/confidence note, safety alert, and photo consent.
6. Save Student.

Result: student row is created and linked to family.

### 3. Add Venue / Address

Admin:

1. Open Students.
2. Click Add Student / Family.
3. Open Step 3 Add Venue / Address.
4. Choose customer if the venue belongs to a family.
5. Enter venue name, address, area, pool type, map link, access instruction, parking note, and pool depth/safety note.
6. Save Venue.

Result: venue row is created.

### 4. Create Class / Group

Admin:

1. Open Students.
2. Click Add Student / Family.
3. Open Step 4 Create Class / Group.
4. Choose customer, class type, scheduling mode, assigned coach, default venue, duration, photo required, and student(s) in the class.
5. If fixed weekly, add the usual day and time.
6. Save Class.

Result: teaching group is created.

### 5. Add Package

Admin:

1. Open Students.
2. Click Add Student / Family.
3. Open Step 5 Add Package.
4. Select package type and enter total/remaining lessons.
5. Enter start date, payment date, validity months, payment status, and optional Admin-only customer price.
6. Save Package.

Result: package is created. If a payment amount/status was entered, an Admin-only payment record is also created. Upload payment proof later in Money -> Payments.

### View A Student Profile

Admin or Coach:

1. Open Students or My Students.
2. Search by student, parent, phone, class, coach, or area.
3. Use filters such as Active, Expiring soon, Low lessons, Missing health, Missing venue, Missing consent, or Level 1-6.
4. Click Open Profile.
5. Review Safety, Lesson Setup, Package, Progress, and Recent Lessons.
6. Click Update Progress when the student's level/focus changes.

Admin also sees the Admin-only Finance card. Coach does not.

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
8. Optionally update 1-2 current focus skills with Learning / Almost / Passed.
9. Click Lesson completed or Lesson cancelled.

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

### 14. Void / Reverse Approved Lesson

Admin can open an approved lesson and use Void / Reverse approval.

This requires a reason. If the original approval deducted a package lesson, the system restores one lesson. If an unpaid payroll item exists, it is voided. If payroll has already been paid, the system blocks automatic reversal and shows:

`Cannot reverse automatically because payroll has already been paid. Please create an adjustment manually.`

The lesson becomes `void`, Coach still cannot edit it, and an audit log is written.

### 15. Payment Proof Upload

Admin:

1. Open Money.
2. Open Payments.
3. Add or edit a payment.
4. Upload proof screenshot to the private `payment-proofs` bucket.
5. Save.

Coach cannot access payment proofs.

### 16. Expense Receipt Upload

Admin:

1. Open Money.
2. Open Expenses.
3. Add or edit an expense.
4. Upload receipt to the private `expense-receipts` bucket.
5. Save.

Coach cannot access expense receipts.

### 17. Setup Check Usage

Admin:

1. Open More.
2. Open Setup Check.
3. Read pass/warning/fail rows.
4. Follow the Next action text.
5. Check Basic Data Counts.

Coach:

1. Open My Account Check from Today or go to `/system-check`.
2. Confirm assigned lessons/students/venues are visible.
3. Confirm My Pay access is working.
4. Confirm finance and admin-only records are hidden.

### 18. Demo Seed / Testing Usage

Use demo seed only in a test Supabase project.

1. Create Admin and Coach users in Supabase Auth.
2. Copy their Auth user IDs.
3. Open `supabase/demo-seed.sql`.
4. Replace the Admin and Coach Auth ID variables where the file instructs you.
5. Run the SQL in Supabase SQL Editor.
6. Log in as Admin and open Setup Check.
7. Log in as Coach and open My Account Check.

Demo rows use `DEMO-*` codes so they can be reset without deleting future real records.

Do not mix demo data with real customer data in production.

## 6. Button And Action Reference

| Button / Action | Page | Role | What it does | Side effect / warning |
| --- | --- | --- | --- | --- |
| Add Family | Today / Students | Admin | Opens Students guided workflow | Creates customer data when saved |
| Add Student / Family | Students | Admin | Opens the guided setup flow | Best starting point for a new family |
| Student Profiles | Students | Admin | Opens searchable student/family profile cards | Normal daily student workspace |
| Open Profile | Students / My Students | Admin / Coach | Opens the student profile with safety, lesson setup, package, progress, and recent lessons | Coach version hides Admin-only finance |
| Add Family / Add Student / Add Venue / Add Class / Add Package | Advanced records | Admin | Opens a modal to create the matching record type | Use the setup wizard first for normal new families |
| Add Student | Students workflow | Admin | Opens student setup area | Student should be linked to a family |
| Add Class | Students workflow / classes table | Admin | Creates class/group | Must assign coach and schedule mode carefully |
| Add Package | Students workflow / packages table | Admin | Creates package | Package count must match paid package |
| Schedule Lesson | Today / Schedule | Admin | Opens Schedule | Scheduling alone does not deduct package |
| Open full syllabus | Students / More / lesson detail | Admin / Coach | Opens Level 1-6 syllabus and student progress page | Coach only sees assigned students |
| Update Progress | Students / My Students / lesson detail | Admin / Coach | Opens the current level checklist for one student | Does not affect package deduction, payroll, payment, or expense |
| Save Progress | Progress modal | Admin / Coach | Saves skill status, notes, current focus, last assessed date, and optional level-up suggestion | Coach can update assigned students only |
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
| Void / Reverse approval | Lesson detail | Admin | Reverses an approved unpaid lesson safely | Requires reason; blocks if payroll already paid |
| Request edit / Needs Edit | Review | Admin | Sends lesson back for correction | Coach must update and resubmit |
| Reject | Review | Admin | Rejects lesson record | Does not deduct package or create payroll |
| Generate | Payroll | Admin | Generates monthly payroll period/items | Based on approved payable lessons |
| Mark paid | Payroll | Admin | Marks payroll paid | Creates coach salary expense once |
| Upload Payment Proof | Payments | Admin | Uploads proof screenshot | Admin-only private bucket |
| Upload Expense Receipt | Expenses | Admin | Uploads receipt | Admin-only private bucket |
| Export CSV | Tables / Money / Reports | Admin mostly, Coach where allowed | Downloads visible rows | Be careful not to share exported sensitive data |
| Export All Data JSON | More / Reports | Admin | Downloads Admin-accessible database backup | Includes finance and child/student data; keep private |
| Audit Logs | More | Admin | Opens read-only change history | Coach cannot access |
| Import preview rows | CSV Import | Admin | Imports mapped CSV rows | Use test data first; phone numbers are text |
| Run Setup Check | Today / More / direct | Admin | Checks setup and technical access | Admin-only full system health page |
| My Account Check | Coach Today / More / direct | Coach | Checks coach account, assignments, pay access, and finance privacy | No technical setup details are shown |
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
| `not_started` | Skill or level has not been worked on yet |
| `learning` | Student is learning the skill but not consistent yet |
| `almost` | Skill is close to passing, but still needs polish |
| `almost_ready` | Level is close to passing |
| `passed` | Skill or level has been passed |

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
5. Optionally update each student's current level progress.
6. Check My Pay for approved payable lessons.

## 10. Skill Levels And Student Progress

TY Swim Academy OS includes a Level 1-6 progress system for daily coaching and Admin review.

### Level Meaning

| Level | Name | Goal |
| --- | --- | --- |
| 1 | Water Safety / Floating / Survival Jump | Safe entry/exit, breathing, floats, recovery, push & glide, kicking, survival jump, and finding pool edge |
| 2 | Freestyle | Standard freestyle 15 m |
| 3 | Backstroke | Standard backstroke 15 m |
| 4 | Breaststroke | Standard breaststroke 15 m |
| 5 | Butterfly | Standard butterfly 15 m |
| 6 | Master Squad / Competition Skills / IM | 100 m IM, 25 m each stroke, and competition-style starts/turns/finishes |

All students should begin with Level 1 water safety assessment. Adult learners may start with breaststroke confidence work if they are stiff, nervous, or have weak mobility, but the student profile still tracks the official current TY Swim level.

### What Is Stored For Each Student

Each student can have:

- current level from 1 to 6
- level status: Not Started, Learning, Almost Ready, Passed
- current focus
- last assessed date
- assessment note
- checklist progress for each level criterion
- optional level-up suggestion

### How Admin Uses It

Admin can open Students or More -> Levels & Progress.

Admin can:

- see level badges and progress cards
- update any student's current level, status, focus, and checklist
- review passed and incomplete criteria
- see progress from lesson submissions
- decide when a student should move to the next level

The system does not force automatic level-up. If all criteria are passed, it shows the student as ready for the next level and Admin should confirm.

### How Coach Uses It On Mobile

Coach can open My Students or the lesson detail / Submit Record screen.

Coach should:

1. Tap Update Progress for the assigned student.
2. Review the current level checklist only.
3. Tap Learning, Almost, or Passed for skills worked on today.
4. Add short notes if useful. Chinese/English mixed notes are okay.
5. Update Next Focus / Current Focus.
6. Save Progress.

The full syllabus is available through View Syllabus, but it is secondary so Coach does not need to read all six levels during every lesson.

### Lesson Submission Integration

During Coach lesson submission, Update student progress is optional. It does not affect package deduction or payroll. Package deduction and coach payroll still only happen after Admin approves the lesson.

The normal Coach submit screen shows only 1-2 current focus skills for each student. Coach can tap Learning / Almost / Passed, add a short note or next focus, and save. The full checklist stays in Levels & Progress so the lesson submit page stays fast on phone.

## 11. Photo Consent And Usage

Each student has photo consent:

- `unknown`
- `internal_only`
- `marketing_approved`
- `not_allowed`

Coach-uploaded lesson photos default to internal usage. Coach cannot mark a photo as marketing-approved. Admin can change usage to marketing candidate or marketing approved only when every active student in the lesson has `marketing_approved` consent.

### Bonus Skills

Bonus skills are useful teaching tools and do not block main level progression unless Admin decides:

- Reverse Breaststroke: back floating breaststroke kick for breaststroke leg correction
- Head-up Breaststroke: safety, visibility, open water, and play; useful after Level 4 or safety-theme lessons

### SQL Setup For Existing Supabase Projects

For a new Supabase project, run `supabase/schema.sql`.

For an existing test project that already has the OS schema, run:

1. `supabase/skill-progress-migration.sql`
2. `supabase/pre-real-use-safety-migration.sql`
3. then rerun `supabase/demo-seed.sql` if you want demo progress data

Do not put the Supabase service role key in the frontend or Vercel. Coaches are protected by RLS and can update progress only for assigned students.
