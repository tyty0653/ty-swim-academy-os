# TY Swim Academy OS Mobile UI Design Specification

This document defines the mobile-first visual direction for the next TY Swim Academy OS UI pass. It is a design and implementation specification only. It must not change Supabase schema, RLS, storage permissions, approval logic, payroll logic, package deduction logic, or role permissions.

## Design Goal

TY Swim Academy OS should feel like a focused mobile operations app for a swim academy, not a desktop admin dashboard squeezed onto a phone.

The experience should be:

- Simple enough for a non-technical owner to understand in 10 seconds.
- Fast enough for part-time coaches to use before and after lessons.
- Calm, premium, academy-style, blue and white.
- Card-first on mobile.
- Safety-first for coaches.
- Review-first for admins.
- Clear about what is daily-use and what is advanced.

## Mobile Foundation

### Target Viewports

Design and test these widths:

- 375 x 812
- 390 x 844
- 430 x 932
- 768 x 1024

No page-level horizontal scrolling is allowed. If advanced tables are still needed, they must live inside a contained scroll area under an Advanced section.

### Page Shell

- Phone page padding: 16px left/right.
- Small tablet page padding: 20px left/right.
- Top header height: 64px to 76px.
- Bottom navigation height: 64px to 72px.
- Bottom safe padding: 96px minimum when bottom nav is visible.
- Main content gap: 20px between major sections.
- Section gap: 16px.
- Card gap: 12px.
- Card padding: 16px.
- Dense card padding: 12px.
- Form field gap: 12px.
- Button row gap: 10px.

Every card, list row, flex child, grid child, and form group must use `min-width: 0` behavior so long names, addresses, IDs, and Chinese text wrap instead of overflowing.

### Typography

- App name in header: 15px, 700.
- Role label: 12px, 600.
- Page title: 20px, 650, line-height 1.25.
- Section title: 17px, 650.
- Card title: 16px, 650.
- Lesson time: 18px, 700.
- Large metric number: 24px to 28px, 700.
- Body text: 14px, line-height 1.5.
- Helper text: 13px, line-height 1.5.
- Metadata label: 12px, 600.
- Badge text: 12px to 13px, 650.
- Button text: 14px to 15px, 650.

Do not scale font size with viewport width. Do not use negative letter spacing.

### Color And Mood

- Background: very light blue-white or slate-white.
- Surface: white cards.
- Primary: academy blue for primary action, active nav, links.
- Secondary: soft blue surface or white with blue border.
- Success: emerald for approved, paid, completed.
- Warning: amber for pending review, expiring, low remaining lessons.
- Danger: rose for safety alert, rejected, void, destructive action.
- Neutral: slate for metadata and inactive states.

Avoid heavy gradients, decorative blobs, oversized hero styling, and visual noise. This OS should feel like a premium internal app.

### Card Rules

- Radius: 12px for mobile cards.
- Border: 1px solid light slate/blue border.
- Shadow: none or very subtle.
- Card max width: 100%.
- Card content order:
  1. Time, name, or status.
  2. Most important operational context.
  3. Safety or warning.
  4. Primary action.
  5. Secondary actions.
- Long addresses and notes must wrap after 2 to 3 lines, then allow Details if needed.
- Avoid nested cards. Use sections, strips, or rows inside a card instead.

### Button Rules

- Minimum tap height: 44px.
- Main phone button: full width.
- Two secondary buttons may sit side by side only if both labels fit at 375px.
- If labels are long, stack buttons vertically.
- Primary action appears once per screen or once per actionable card.
- Destructive actions use confirmation and should not look like the default action.
- Button placement:
  - Coach Today: primary action inside each lesson card.
  - Coach Submit Record: full-width bottom action after form, optionally sticky inside safe area.
  - Student Profile: primary profile action below current focus.
  - Admin Today: primary next action inside urgent task card.
  - More: Sign out inside Account section above the fold.

### Badge Rules

- Badge height: 24px to 28px.
- Radius: full pill.
- Padding: 6px horizontal, 4px vertical.
- Badges may wrap to a second row.
- Do not create a badge row wider than the card.

Status mapping:

- Scheduled: soft blue or slate.
- Rescheduled: purple-blue or amber.
- Pending Review: amber.
- Approved: emerald.
- Needs Edit: amber.
- Cancelled: slate or rose based on urgency.
- Replacement Needed: amber.
- Safety Alert: rose.
- Photo Required: amber.

### Chinese Label Rules

Use short Chinese where space is tight.

Bottom nav:

- Today: 今日
- Schedule: 课程
- Students: 学生
- Pay: 工资
- Review: 审核
- More: 更多

Primary actions:

- Submit Record: 提交记录
- Update Progress: 更新进度
- Review Lessons: 审核课程
- Schedule Lesson: 安排课程
- Add Student: 添加学生
- Sign out: 登出

Short statuses:

- Scheduled: 已安排
- Pending Review: 待审核
- Approved: 已通过
- Needs Edit: 需修改
- Safety Alert: 安全提醒
- Photo Required: 需照片

Rules:

- Bottom nav labels should be 2 to 4 Chinese characters.
- Primary buttons should be 4 to 8 Chinese characters.
- Do not put long Chinese explanations inside buttons.
- English plus Chinese is allowed for critical account actions, for example `Sign out / 登出`.
- Long Chinese helper text must live in normal body text and wrap inside cards.

### What To Hide On Mobile By Default

Hide or collapse:

- Advanced data tables.
- Raw database-like record details.
- Full filters.
- Full syllabus checklist.
- Full audit or setup technical details.
- Long lesson history beyond latest 3 to 5 records.
- Admin finance cards from Coach.
- Date/time reschedule fields during normal coach submission.
- Package/payroll/payment controls from Coach.

Show immediately:

- Safety alerts.
- Today or next lesson.
- Primary action.
- WhatsApp and Map access if available.
- Current level and current focus.
- Missing required setup warnings for Admin.
- Sign out in More / Account.

## Mobile Navigation

### Header

Use a compact two-line header.

Information hierarchy:

1. App name: `TY Swim OS`.
2. Role label: `Admin` or `Coach`.
3. Current page title.
4. Optional account/more icon only if useful.

Do not show page dropdown, Dashboard, and Sign out in one row on mobile. Dashboard is Today.

### Bottom Tabs

Admin tabs:

- Today / 今日
- Students / 学生
- Schedule / 课程
- Review / 审核
- More / 更多

Coach tabs:

- Today / 今日
- Schedule / 课程
- Students / 学生
- Pay / 工资

Rules:

- Fixed bottom navigation.
- 48px minimum tap target per tab.
- Active state must be obvious with blue text, icon, or soft blue pill.
- Safe-area bottom padding must prevent browser bars from covering content.
- Money is inside More for Admin on mobile unless future testing proves it needs top-level access.
- Sign out is never a bottom tab.

## Screen 1: Coach Today

### Purpose

Coach Today is the coach's daily action screen. A coach should know where to go, who they teach, what safety issue to remember, and what to submit after class.

### Exact Information Hierarchy

1. Header: TY Swim OS, Coach, Today.
2. Compact daily summary:
   - Today's lessons count.
   - Pending records count.
3. Next lesson card or first lesson card:
   - Time.
   - Class/group name.
   - Student names.
   - Venue/address.
   - Safety alert.
   - Current focus.
   - Status and photo badge.
   - Primary action.
   - WhatsApp and Map.
4. Remaining lessons today.
5. Submitted or approved lessons.
6. Empty state if no lessons.

### Above The Fold On Phone

At 390 x 844, the user must see:

- Page title `Today`.
- Summary row.
- First lesson card time, class name, student names, and safety alert if present.
- `Submit Record` button, or at least the top of the button without needing a long scroll.

### Layout Wireframe

```text
Header
  TY Swim OS        Coach
  Today

Summary Row
  [Today 2] [Pending 1]

Lesson Card
  4:00 PM - 5:00 PM
  DEMO 1-2 Beginner
  Alicia Demo, Bryan Demo
  Condo Pool, Mont Kiara
  Safety Alert: nervous in deep water
  Focus: Bubble breathing + back float
  [Scheduled] [Photo required]
  [Submit Record]
  [WhatsApp] [Map]

Next Lesson Preview

Bottom Tabs
```

### Primary Action

- English: `Submit Record`
- Chinese: `提交记录`
- Placement: full-width inside each actionable lesson card, after safety/current focus.

### Secondary Actions

- `WhatsApp` / `WhatsApp`
- `Map` / `地图`
- `Open Profile` / `打开档案`

Secondary actions sit below the primary action. On 375px, use either two equal columns for WhatsApp and Map or stack them if labels are long.

### Hide Or Collapse

- Weekly schedule.
- Payroll summary.
- Full student profile.
- Full progress checklist.
- Admin review controls.
- Package price, payment, expense, and company income.

### What Not To Show On Mobile

- Tables.
- Multi-week lesson grids.
- Raw customer/package IDs as primary content.
- More than 2 primary-looking buttons in one card.
- Financial information.

### Empty And Success States

- Empty title: `No lessons today`
- Empty body: `Assigned lessons will appear here with contact, map, safety alerts, and a fast submit button.`
- Submitted success: `Record submitted for Admin review.`
- All done: `All today's lesson records submitted.`
- Approved: `Approved - no further action needed.`

### Spacing

- Summary gap: 12px.
- Lesson card padding: 16px.
- Safety strip padding: 12px.
- Button top margin: 14px.
- Between lesson cards: 12px.

## Screen 2: Coach Submit Record

### Purpose

Coach Submit Record lets a coach submit a normal completed lesson in under one minute.

### Exact Information Hierarchy

1. Header: TY Swim OS, Coach, Submit Record.
2. Lesson summary card:
   - Date/time.
   - Class/group.
   - Student names.
   - Status badge.
3. Result selector:
   - Completed.
   - Cancelled.
4. Attendance.
5. Short progress note.
6. Next focus.
7. Optional photo upload.
8. Optional quick progress update.
9. Submit Record.
10. Collapsed Change date/time.

### Above The Fold On Phone

At 390 x 844, the user must see:

- Lesson summary.
- Completed/Cancelled selector.
- At least the first attendance row.
- Clear path to `Submit Record`.

If sticky action is used, `Submit Record` is visible above bottom nav. If not sticky, it should appear soon after notes and photo upload without a long scroll.

### Layout Wireframe

```text
Header
  TY Swim OS        Coach
  Submit Record

Lesson Summary
  Tue, 4:00 PM
  DEMO 1-2 Beginner
  Alicia Demo, Bryan Demo
  [Scheduled]

Result
  [Completed] [Cancelled]

Attendance
  Alicia Demo
  [Present] [Absent] [Sick] [Late]
  Bryan Demo
  [Present] [Absent] [Sick] [Late]

Notes
  Short progress note
  Next focus

Photo
  [Add lesson photo]

Quick Progress
  Level 1 Water Safety
  Back float 5 sec
  [Learning] [Almost] [Passed]

[Submit Record]

Details: Change date/time
```

### Primary Action

- English: `Submit Record`
- Chinese: `提交记录`
- Placement: full-width at the end of the normal form. A sticky safe-area button is acceptable if it does not cover fields.

### Secondary Actions

- `Change date/time` / `更改时间`
- `View full syllabus` / `查看级别`
- `Save draft` only if already supported. Do not invent draft behavior in implementation.

### Hide Or Collapse

`Change date/time` is collapsed by default and expands to:

- Date.
- Start time.
- End time.
- Reason.

Full syllabus is not shown in normal submission. Show only current level and 1 to 2 focus criteria.

### What Not To Show On Mobile

- Package deduction toggle.
- Coach payable toggle.
- Pay amount.
- Customer price.
- Payment status.
- Admin approval buttons.
- Full lesson change log.
- Full level checklist.

### Read-Only State

For approved, rejected, void, or archived lessons:

- Show status block near top.
- Text: `Approved - no further action needed.`
- Hide editable fields.
- Keep lesson summary and notes readable.

### Spacing And Type

- Form cards: 16px padding.
- Field gap: 12px.
- Chip gap: 8px.
- Textarea min height: 72px.
- Segmented control height: 44px.
- Submit button height: 48px.

## Screen 3: Student Profile

### Purpose

Student Profile is the safest and fastest way to understand a student before teaching. It must work for both Admin and Coach, with Coach seeing only assigned and non-financial information.

### Exact Information Hierarchy

1. Header: TY Swim OS, role, Student Profile.
2. Profile header:
   - Student name.
   - Family/parent.
   - Current level badge.
   - Level status badge.
   - Package remaining badge when safe to show.
   - WhatsApp and Map.
3. Safety card:
   - Safety alert.
   - Health notes.
   - Special needs.
   - Confidence/fear of water note if present.
   - Photo consent.
4. Current focus/progress card:
   - Level 1 to 6.
   - Current focus.
   - Last assessed.
   - Progress summary.
   - Update Progress.
5. Lesson setup:
   - Coach.
   - Class/group.
   - Schedule mode.
   - Venue/address.
   - Access note.
6. Recent lessons:
   - Last 3 to 5 lesson cards.
7. Admin-only finance card.
8. Advanced details.

### Above The Fold On Phone

At 390 x 844, the user must see:

- Student name.
- Current level badge.
- WhatsApp and Map buttons.
- Safety card if any alert exists.
- Current focus start.

Safety must appear before lesson history and admin-only details.

### Layout Wireframe

```text
Header
  TY Swim OS        Coach/Admin
  Student Profile

Profile Header
  Alicia Demo
  Demo Family / Parent Demo
  [Level 1] [Learning] [7 left]
  [WhatsApp] [Map]

Safety
  Safety Alert: nervous in deep water
  Health: no medical issue reported
  Special needs: slow warm-up
  Photo consent: Internal only

Current Focus
  Level 1 Water Safety
  Bubble breathing, back float, recover to stand
  Last assessed: 2026-06-01
  [Update Progress]

Lesson Setup
Recent Lessons
Admin Finance (Admin only)
Advanced
```

### Primary Action

Coach:

- `Update Progress` / `更新进度`

Admin:

- `Edit Student` / `编辑学生`
- If missing data exists, prefer `Complete Missing Info` / `补齐资料`

### Secondary Actions

- `WhatsApp`
- `Map` / `地图`
- `Schedule Lesson` / `安排课程`
- `Open Class` / `查看班级`

### Hide Or Collapse

For Coach:

- Admin-only finance.
- Customer price.
- Payment history.
- Payment proof.
- Internal financial notes.
- Expenses.
- Audit logs.

For Admin mobile:

- Full package/payment history behind details.
- Raw advanced records.
- More than 5 recent lessons.

### What Not To Show On Mobile

- Raw multi-table data.
- Large editable form by default.
- Payment proof previews to Coach.
- Full audit trail by default.
- Long lesson history table.

### Missing Data Rules

Admin sees missing data chips:

- Missing WhatsApp / 缺 WhatsApp
- Missing age / 缺年龄
- Missing health confirmation / 缺健康确认
- Missing venue / 缺地址
- Missing map link / 缺地图
- Missing coach / 缺教练
- Missing package / 缺配套
- Missing photo consent / 缺照片同意
- Missing level / 缺级别

Coach only sees missing data when it affects lesson safety or coordination, for example `Health not confirmed yet`.

### Spacing And Type

- Profile header padding: 16px.
- Safety card border or strip: rose left border 4px.
- Badge row gap: 6px.
- Action button row gap: 10px.
- Recent lesson cards: 12px gap.

## Screen 4: Admin Today

### Purpose

Admin Today is the owner's daily control centre. It should show what needs attention today before showing records or finance.

### Exact Information Hierarchy

1. Header: TY Swim OS, Admin, Today.
2. Daily summary metrics:
   - Today's lessons.
   - Pending review.
   - Reschedule alerts.
   - Renewals soon.
3. Primary next action card:
   - Most urgent item.
   - Recommended action.
4. Today lessons:
   - Compact lesson cards.
5. Next actions:
   - Reschedules.
   - Missing photos.
   - Replacement lessons.
   - Missing data.
6. Setup checklist only when setup is incomplete.
7. Lower priority summaries.

### Above The Fold On Phone

At 390 x 844, the user must see:

- Page title `Today`.
- Four priority metrics or first two plus part of next row.
- One primary next action card.
- Primary action button, usually `Review Lessons` if pending review exists.

Finance must not be above the fold unless the page has no operational alerts.

### Layout Wireframe

```text
Header
  TY Swim OS        Admin
  Today

Daily Summary
  [Today 5] [Pending 2]
  [Rescheduled 1] [Renewals 3]

Next Action
  Review coach submissions
  2 lesson records need approval
  [Review Lessons]

Today's Lessons
  Lesson Card
  Lesson Card

Next Actions
  Check reschedules
  Follow up renewals
  Clean missing data

Bottom Tabs
```

### Primary Action

Priority order:

1. `Review Lessons` / `审核课程`
2. `Check Reschedules` / `查看改期`
3. `Schedule Lesson` / `安排课程`
4. `Add Student` / `添加学生`

Only one primary next action should be visually dominant.

### Secondary Actions

- `Add Family` / `添加家庭`
- `Add Class` / `添加班级`
- `Add Package` / `添加配套`
- `Open Setup Check` / `设置检查`

Quick actions should be compact and may be collapsed behind `More actions` if the page feels crowded.

### Hide Or Collapse

- Finance summary.
- Full lesson table.
- Full data cleanup list.
- Full reports.
- Advanced filters.
- Import/export tools.

### What Not To Show On Mobile

- Desktop dashboard grid with many equal cards.
- Money as the first focus.
- More than 4 summary metrics above the fold.
- Tables.
- Long technical setup errors.

### Empty State

If no data exists:

- Title: `Start setup`
- Body: `Add a coach, family, student, venue, class, package, then schedule the first lesson.`
- Checklist:
  1. Add coach.
  2. Add family.
  3. Add student.
  4. Add venue.
  5. Create class.
  6. Add package.
  7. Schedule first lesson.

If no urgent action exists:

- Title: `Nothing urgent right now`
- Body: `Today's lessons, coach submissions, renewals, and missing data will appear here when they need attention.`

### Spacing

- Metric grid gap: 12px.
- Metric card padding: 14px.
- Next action card padding: 16px.
- Section top margin: 20px.
- Task row height: 48px minimum.

## Screen 5: More / Account

### Purpose

More / Account is the mobile settings area. It must make account actions obvious and keep advanced tools away from daily screens.

### Exact Information Hierarchy

1. Header: TY Swim OS, role, More.
2. Account card:
   - User name/email.
   - Role.
   - Language toggle.
   - Sign out.
3. Help and setup:
   - Help Guide.
   - Setup Check for Admin or My Account Check for Coach.
   - Levels and Progress.
4. Admin tools, Admin only:
   - Money.
   - Audit Logs.
   - Export All Data.
   - Import.
   - Data Cleanup.
   - Reports.
   - Settings.
5. Records, Admin only:
   - Customers/Families.
   - Venues.
   - Classes/Groups.
   - Packages.
   - Lesson History.
6. App/support notes.

### Above The Fold On Phone

At 390 x 844, the user must see:

- Account identity.
- Role.
- Language toggle.
- `Sign out / 登出`.
- First Help and Setup row.

Sign out must not be hidden at the bottom of a long settings list.

### Layout Wireframe

```text
Header
  TY Swim OS        Admin/Coach
  More

Account
  Coach Demo
  Coach
  [English] [中文]
  [Sign out / 登出]

Help & Setup
  Help Guide        >
  My Account Check  >
  Levels & Progress >

Admin Tools (Admin only)
Records (Admin only)

Bottom Tabs
```

### Primary Action

- `Sign out / 登出`
- Placement: inside Account card above the fold.
- Style: clear but not alarming. Soft rose border or neutral account button is acceptable.
- Keep `data-testid="sign-out-button"` in implementation.

### Secondary Actions

Coach:

- `Help Guide` / `帮助`
- `My Account Check` / `账户检查`
- `Levels & Progress` / `级别进度`

Admin:

- `Setup Check` / `设置检查`
- `Audit Logs` / `操作记录`
- `Export All Data` / `导出备份`
- `Settings` / `设置`

### Hide Or Collapse

Coach must not see:

- Money.
- Payments.
- Expenses.
- Audit Logs.
- Export All Data.
- Reports.
- Admin setup technical details.
- Customer price.

Admin may see advanced groups, but keep them as settings rows or collapsed groups.

### What Not To Show On Mobile

- Grid of large cards.
- Dashboard-style metrics.
- Technical setup text above account actions.
- Raw environment or database wording for Coach.
- Sign out hidden inside an icon-only menu.

### Spacing

- Account card padding: 16px.
- Settings row height: 52px minimum.
- Row horizontal padding: 14px to 16px.
- Group title top margin: 20px.
- Row gap: 8px if rows are separated cards, or 0 if grouped in one list container.

## Screen-Level Acceptance Checklist

Use this before implementation starts:

- Coach Today shows one useful lesson card above the fold.
- Coach Submit Record hides date/time changes by default.
- Student Profile puts safety and focus above admin/advanced data.
- Admin Today puts review/reschedule/renewal tasks above finance.
- More / Account shows Sign out above the fold.
- Chinese labels fit bottom nav and primary buttons.
- No screen requires horizontal scrolling at 375px.
- Tables are not default mobile views.
- Coach never sees customer price, payment records, expenses, admin finance notes, or other coach payroll.
- Design still works if names, addresses, and notes contain mixed Chinese and English.

## Implementation Guardrails For Later

Allowed in a later implementation batch:

- Reorder existing content.
- Convert mobile tables to cards.
- Hide advanced content behind Details.
- Improve labels, helper text, empty states, spacing, and button hierarchy.
- Add stable test ids for existing UI controls.

Not allowed as part of this mobile UI pass:

- Schema/RLS changes.
- Parent portal.
- AI features.
- Google Calendar sync.
- Drag-and-drop calendar.
- Invoice or PDF reports.
- Complex accounting.
- Service role in frontend.
- Exposing finance or admin-only records to Coach.
