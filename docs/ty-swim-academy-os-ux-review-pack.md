# TY Swim Academy OS UX Review Pack

Copy/paste this document to ChatGPT or another UX reviewer when asking for feedback. Do not include passwords, Supabase keys, or real customer data.

## A. Current System Summary

TY Swim Academy OS is a standalone internal operations app for a swim academy. It is separate from the public marketing website.

Technology:

- Vite React frontend
- Supabase Auth
- Supabase Database with RLS
- Supabase private Storage buckets
- SQL schema in `supabase/schema.sql`
- demo seed in `supabase/demo-seed.sql`

Main users:

- Admin: owner/operations user with full access
- Coach: assigned coach with limited access

Current Admin navigation:

1. Today
2. Students
3. Schedule
4. Review
5. Money
6. More

Current Coach navigation:

1. Today
2. My Schedule
3. My Students
4. My Pay

Important routes:

- `/login`
- `/dashboard`
- `/students`
- `/schedule`
- `/review`
- `/money`
- `/more`
- `/help`
- `/system-check`
- `/lessons/:id`
- advanced Admin routes such as `/customers`, `/venues`, `/classes`, `/packages`, `/payments`, `/expenses`, `/import`, `/data-cleanup`, `/reports`, `/settings`

Main workflows:

- Add family/customer
- Add student(s)
- Add venue/address
- Create class/group
- Add package
- Schedule fixed weekly lesson
- Schedule flexible coach-arranged lesson
- Coach submits lesson record
- Admin approves/rejects/requests edit
- Approved lesson deducts package once
- Approved payable lesson creates payroll item once
- Admin generates payroll
- Mark payroll paid creates coach salary expense once
- Admin records payments and uploads payment proof
- Admin records expenses and uploads receipts
- Admin/Coach use System Check to verify setup and permissions

Role boundaries:

- Admin can see and manage everything.
- Coach can see assigned students, classes, venues, lessons, health notes, WhatsApp, address, lesson history, and own payroll.
- Coach must not see customer price, payments, company income, expenses, payment proof, expense receipt, other coach payroll, or Admin-only finance notes.

## B. Current UI/UX Design Intent

Design intent:

- minimal and app-like
- blue/white TY Swim Academy academy style
- daily workflow first, database tables second
- Admin Today acts as a control centre
- Coach Today is mobile-first with lesson cards
- advanced tools are hidden under More
- students setup is guided through steps
- Review is grouped by action type
- Money is available but not the main dashboard focus
- System Check explains setup and permission problems in beginner-friendly language

Tone:

- simple English
- operational, calm, professional
- notes support Chinese/English mixed input

## C. Current Known Strengths

- Navigation is much simpler than a full database admin panel.
- Admin has a clear Today page with daily counts and next actions.
- Coach Today uses mobile-friendly cards with WhatsApp, map, safety alert, photo badge, and Submit Record.
- Students page starts with a guided setup flow instead of showing tables immediately.
- Schedule page separates Fixed Weekly and Flexible / Coach-arranged modes.
- Review page groups Pending, Rescheduled, Cancelled, Needs edit, and Missing photos.
- Money page groups Payments, Payroll, Expenses, and Summary.
- System Check gives pass/warning/fail results plus next actions.
- Demo seed and QA scripts exist for safer testing.
- Approved lessons are read-only for Coach.
- Package deduction and payroll creation happen through approval functions designed to avoid duplicates.
- Private storage buckets are used for lesson photos, payment proofs, and expense receipts.
- Coach UI avoids payment/expense/price fields.

## D. Current Possible Pain Points

These are based on the current code/UI structure and should be reviewed carefully.

1. Advanced tables are still table-heavy.

The app hides advanced tables, but once opened, customers/students/venues/classes/packages/payments/expenses/settings are still generic table + modal screens. Non-technical users may need clearer form grouping.

2. Students setup is a guided step list, not a true wizard.

The six setup steps help, but clicking most steps opens advanced tables. A beginner might still wonder exactly where to click next after creating one record.

3. "Add New" is generic.

The app now says `Add New`, but users may prefer context labels such as `Add Family`, `Add Student`, `Add Venue`, `Add Class`, or `Add Package` inside each table.

4. Schedule can still feel busy.

Schedule includes mode cards, filters, fixed weekly schedules table, fixed lessons, flexible classes, and flexible lessons. This is complete, but may be a lot on one page.

5. Fixed Weekly generation may need more explanation in the modal.

The page explains that one rescheduled lesson does not change the weekly pattern, but the modal itself could explain what "Generate weeks" means.

6. Review page has both cards and a table.

This helps quick approval and detailed scanning, but with many records it may feel duplicated. Reviewers should decide whether cards or table should be primary.

7. Lesson detail for Coach still shows scheduling fields.

Coach submission includes date, start, end, and reschedule reason before attendance/progress. This is useful, but it may distract coaches who only need to submit a normal completed lesson.

8. Money terms may be too accounting-like.

Payments, Expenses, Payroll, Estimated net, and Export CSV are accurate but may need owner-friendly helper text or month filters.

9. System Check contains technical concepts.

It explains pass/warning/fail, but terms such as storage buckets, RLS, service_role, and env variables may still be technical for a non-technical owner.

10. Mobile navigation is simple but not fully app-like.

The app uses compact responsive navigation. A bottom-tab style may feel more native for coaches, but this has not been implemented.

11. Settings is powerful but technical.

Profiles, coaches, and coach rates are table-based. First Admin creation still depends on Supabase setup documentation.

12. Import page may show old sheet encoding issues.

The import mapper supports Chinese headers, but some current source code strings appear encoded in a hard-to-read way. The import may work, but the code/readability should be reviewed before relying on large legacy imports.

13. No parent portal.

This is intentional for now. The OS is internal only.

14. No drag-and-drop calendar.

This is intentional. Schedule is list/table based to keep the system simple and stable first.

## E. Questions For External AI/User Reviewers

Use these questions to guide feedback:

1. Is the Admin Today page understandable within 10 seconds?
2. Does Today show the right daily actions for a swim academy owner?
3. Is Coach Today simple enough for a part-time coach using a phone?
4. Would a new Admin know how to add a family, student, venue, class, package, and first lesson?
5. Should the Students setup become a true step-by-step wizard?
6. Are the labels "Students", "Schedule", "Review", "Money", and "More" clear?
7. Is "Money" the right label, or should it be "Finance" or "Payments & Payroll"?
8. Is "Review" clear enough, or should it be "Approve Lessons"?
9. Is the Schedule page too crowded?
10. Are Fixed Weekly and Flexible / Coach-arranged modes easy to understand?
11. Is the Review/Approve flow clear and trustworthy?
12. Are Approve, Request edit, and Reject buttons clear?
13. Should package deduction and payroll creation be explained more directly before approval?
14. Is Coach lesson submission too long?
15. Should normal Coach submission hide date/time unless the coach taps "Reschedule"?
16. Are safety alerts visible enough on Coach Today?
17. Is photo required clear enough?
18. Are empty states friendly and helpful?
19. Which advanced tables should stay hidden under More or Advanced?
20. What should be turned into a wizard before real staff use?
21. Is System Check understandable for a non-technical owner?
22. Should System Check have a simpler "What to fix first" summary at the top?
23. Are export/import actions too prominent or safely tucked away?
24. What would make this feel more like a daily app and less like a database?
25. What should be improved before giving Coach accounts to real coaches?

## F. Suggested Next Optimisation Directions

### Priority 1: Must Fix Before Real Use

- Confirm live Supabase RLS with Admin and Coach test accounts.
- Confirm storage upload/preview/delete works with private buckets.
- Confirm Coach cannot access payments, expenses, prices, or other coach payroll from both UI and RLS.
- Confirm approving the same lesson cannot deduct package twice.
- Confirm approving the same lesson cannot create duplicate payroll item.
- Confirm marking payroll paid cannot create duplicate expense.
- Verify demo seed and System Check are reliable in the real test Supabase project.
- Review the CSV import header encoding before using legacy sheet imports heavily.
- Add a clearer first-time setup path for linking Auth users to profiles and coaches.

### Priority 2: Should Improve Before Giving To Coaches

- Make Coach lesson submission shorter by hiding reschedule fields unless "Change date/time" is tapped.
- Add clearer success messages after Coach submits a lesson.
- Add a Coach "today done" state after all lessons are submitted.
- Make photo-required lessons more obvious.
- Add a simple bottom navigation style for Coach mobile if desired.
- Rename generic buttons to context-specific labels inside each table.
- Add clearer helper text to Fixed Weekly schedule creation.
- Add an Admin review confirmation that explains package/payroll impact.

### Priority 3: Nice To Have Later

- True guided wizard for new family setup.
- Better calendar view after list flow is stable.
- Better report filters and Excel export.
- Parent portal, only after internal OS is stable.
- More polished onboarding checklist with progress and direct create forms.
- Dashboard personalization by role.
- More friendly import mapping UI for old Google Sheet data.
- Optional coach push/email notifications later.

## Suggested Prompt For ChatGPT Or Another AI

Paste this:

```
You are reviewing the UX of TY Swim Academy OS, an internal swim academy operations app. Please evaluate whether it is simple enough for a non-technical academy owner and part-time coaches. Focus on Admin daily workflow, Coach mobile workflow, guided setup, Review/Approve flow, Schedule clarity, Money clarity, empty states, button labels, and what should be hidden under Advanced. Do not suggest major new business features yet. Prioritize practical simplification and safety.

Here is the current system summary and UX review pack:
[paste this document]
```

