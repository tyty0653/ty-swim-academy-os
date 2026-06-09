# TY Swim Academy OS Mobile UI Design Specification

This specification defines the next mobile-first UI direction for TY Swim Academy OS before implementation. It is not a feature request and should not change Supabase schema, RLS, storage, approval logic, payroll logic, or role permissions.

## Product Direction

TY Swim Academy OS should feel like a calm daily operations app for a swim academy, not a compressed database admin panel.

Primary users:

- Coach: uses phone during daily lessons. Needs fast access to class time, student safety, parent contact, map, lesson submission, progress update, and own pay.
- Admin: uses phone and desktop for operations. Needs daily control, pending review, student setup, account/settings access, and logout.

Visual tone:

- Clean academy blue and white.
- Practical, premium, focused.
- Calm density, not decorative.
- Mobile-first; desktop can use wider layouts later.

## Global Mobile Rules

Target viewports:

- 375 x 812
- 390 x 844
- 430 x 932
- 768 x 1024

No page-level horizontal overflow is allowed. Wide tables must not appear as the default mobile view.

### Layout

- Page padding: 16px on phones, 20px on small tablets.
- Section gap: 16px.
- Card gap: 12px.
- Card padding: 14px to 16px.
- Bottom safe padding: at least 88px plus safe-area inset when bottom navigation is visible.
- Content max width on mobile: 100%.
- Every flex/grid child must allow wrapping with `min-width: 0`.

### Typography

- Page title: 20px, 600 weight, line-height 1.25.
- Section title: 16px to 18px, 600 weight.
- Card title: 15px to 16px, 600 weight.
- Primary metric: 24px to 28px, 650 weight.
- Body text: 14px, line-height 1.5.
- Helper text: 13px, line-height 1.5.
- Metadata label: 12px, 600 weight, uppercase only for English short labels.
- Avoid viewport-based font scaling.
- Letter spacing should remain 0 except tiny uppercase labels.

### Color

- Primary: academy blue, use for active nav, primary action, important links.
- Background: very light slate/blue white.
- Cards: white with subtle slate border.
- Warning: amber for expiring, low package, missing info.
- Danger: rose for safety alerts, rejected/void/destructive actions.
- Success: emerald for approved, paid, completed, ready.
- Do not overuse blue; use slate for normal text and borders.

### Cards

- Border radius: 10px to 12px on mobile app cards.
- Border: 1px solid light slate.
- Shadow: very subtle or none. Avoid floating card stacks.
- Card content order:
  1. Important status/time/name
  2. Context
  3. Alert if any
  4. Primary action
  5. Secondary actions
- Long text must wrap. Addresses and notes should not force horizontal scroll.
- Repeated cards should share the same rhythm.

### Buttons

- Minimum tap height: 44px.
- Primary button is full width on phone unless paired with one equal secondary action.
- Primary action color: blue.
- Secondary action: white/soft blue border.
- Danger action: rose and usually secondary unless confirming destructive intent.
- Avoid more than one primary button in the same card.
- Button labels must be concrete:
  - Use `Submit Record`, not `Open` when submission is the intent.
  - Use `Open Profile`, not generic `Open`.
  - Use `Sign out / 登出` visibly in Account.

### Badges

- Badge height: 24px to 28px.
- Use sentence-case English.
- Use short Chinese labels.
- Keep badges inline but allow wrapping to next line.
- Status badges should use consistent meanings:
  - Scheduled: blue/slate
  - Pending Review: amber
  - Approved: emerald
  - Needs Edit: amber
  - Rejected/Void: rose/slate
  - Safety Alert: rose
  - Photo Required: amber

### Chinese Label Length Rules

Chinese labels can be visually wider or denser than English in compact controls.

Rules:

- Bottom nav labels must be 2 to 4 Chinese characters where possible:
  - 今日
  - 课程
  - 学生
  - 工资
  - 更多
- Primary buttons can be 4 to 8 Chinese characters:
  - 提交记录
  - 更新进度
  - 打开档案
  - 登出
- Avoid long mixed labels inside bottom nav or small chips.
- If English + Chinese is shown together, use it only for critical account actions such as `Sign out / 登出`.
- Long helper text may be Chinese sentence form, but must wrap in cards.
- Do not put long Chinese explanation inside buttons.

### Collapsing and Hiding Rules

Default mobile view should show daily actions first and hide advanced details.

Hide or collapse by default:

- Advanced data tables.
- Detailed filters.
- Full syllabus checklist.
- Full audit/system technical details.
- Admin finance cards from Coach.
- Long historical records beyond latest 3 to 5 items.
- Optional scheduling changes inside Coach Submit Record.

Show by default:

- Safety alerts.
- Today or next lesson.
- Primary action.
- Current focus.
- WhatsApp and Map if available.
- Missing required data warnings for Admin.

## Navigation

### Mobile Header

Structure:

- Line 1: `TY Swim OS` plus role label.
- Line 2: current page title.
- Right side: small More/Profile button only if needed.

Do not show page dropdown, Dashboard, and Sign out in one mobile row.

### Bottom Navigation

Coach bottom tabs:

- Today
- Schedule
- Students
- Pay

Admin bottom tabs:

- Today
- Students
- Schedule
- Review
- More

Rules:

- Fixed to bottom.
- Active tab: blue filled pill or strong blue text/background.
- Tap target at least 48px tall.
- Money is under More on mobile unless a future owner test shows it must be top-level.
- Sign out lives in More / Account, not in bottom nav.

## Core Screen 1: Coach Today

Purpose: A coach should know exactly what to do before and after lessons today.

Primary action: `Submit Record` for the next actionable lesson.

Above the fold:

- Page title: Today.
- Compact summary row:
  - Today's lessons
  - Pending records
- First lesson card.

Layout:

```text
Mobile Header

Summary row
[Today 2] [Pending 1]

Lesson Card
  Time
  Class/group name
  Student names
  Venue/address
  Safety alert if any
  Current focus
  Status/photo badge row
  [Submit Record]
  [WhatsApp] [Map]

Next lesson card...

Bottom Nav
```

Card rules:

- One lesson per card.
- Time is top-left and prominent.
- Class/group name is the card title.
- Safety alert uses rose card strip and appears before actions.
- Current focus uses soft blue strip.
- Photo required badge appears near status.
- WhatsApp and Map are secondary actions.
- If WhatsApp or Map is missing, show disabled button text `No WhatsApp` / `No map`.
- Approved lesson card should show `Approved - no further action needed` and remove primary submit emphasis.

What to hide/collapse:

- Payroll details.
- Full weekly schedule.
- Full student history.
- Full progress checklist.

Empty state:

- Title: `No lessons today`
- Body: `Assigned lessons will appear here with contact, map, safety alerts, and a fast submit button.`

## Core Screen 2: Coach Submit Record

Purpose: Submit a lesson record in under one minute on a phone.

Primary action: `Submit Record`.

Above the fold:

- Lesson summary.
- Result selector.
- Attendance.
- Submit button should be visible or near-visible without a long scroll.

Layout:

```text
Mobile Header

Lesson Summary Card
  Time/date
  Class/group
  Students
  Status badge

Result Card
  Completed / Cancelled segmented control

Attendance Card
  Student rows
  Present / Absent / Sick / Late

Notes Card
  Progress note
  Next focus

Photo Card
  Optional upload
  Photo required badge if required

Quick Progress Card
  Current level
  1-2 focus criteria only
  Learning / Almost / Passed

[Submit Record]

Collapsed: Change date/time

Bottom Nav
```

Field rules:

- Result selector must be first normal input.
- Attendance should be tap-friendly chips, not table cells.
- Progress note and next focus are text areas with 2 to 3 visible rows.
- Photo upload defaults to internal use.
- Optional progress update shows only current level and 1 to 2 focus criteria.
- Full syllabus link is secondary: `View full syllabus`.
- Change date/time is collapsed behind a button.

Read-only states:

- Approved, rejected, void, or archived lessons are read-only for Coach.
- Show a clear status block: `Approved - no further action needed.`

What to hide/collapse:

- Admin approval controls.
- Count package lesson.
- Coach payable.
- Pay override.
- Customer price/payment.
- Full lesson change log.

## Core Screen 3: Student Profile

Purpose: One clean place to understand a student before teaching.

Primary action:

- Coach: `Update Progress`
- Admin: `Edit / Complete Missing Info` or `Schedule Lesson`

Above the fold:

- Student name.
- Current level badge.
- Safety card if any safety data exists.
- WhatsApp and Map buttons.
- Current focus.

Layout:

```text
Mobile Header

Profile Header Card
  Student name
  Family/parent
  Level badge
  Package remaining badge if Admin or safe Coach summary
  [WhatsApp] [Map]

Safety Card
  Safety alert
  Health notes
  Special needs/confidence
  Photo consent

Current Focus Card
  Level 1-6
  Focus
  Last assessed
  [Update Progress]

Lesson Setup Card
  Coach
  Schedule mode
  Venue/address
  Access note

Recent Lessons
  Last 3-5 cards

Admin-only Finance
  Hidden from Coach
```

Coach visibility:

- Student name.
- Parent WhatsApp.
- Venue/address/map.
- Health/safety alert.
- Special needs/confidence.
- Current level and focus.
- Recent lesson history.
- Update Progress.

Coach must not see:

- Customer price.
- Payments.
- Expenses.
- Admin-only finance notes.
- Payment proof.
- Other coach payroll.

What to hide/collapse:

- Admin-only finance card from Coach.
- Full class/package history behind details.
- Advanced raw records.
- More than 5 recent lessons.

Missing data:

- Missing data chips appear for Admin only unless the missing item affects safety or lesson delivery.
- Safety-related missing data can appear to Coach as `Health not confirmed yet`.

## Core Screen 4: Admin Today

Purpose: Daily control centre for the owner/admin.

Primary action: context-sensitive; normally `Review Lessons` if pending review exists, otherwise `Schedule Lesson` or `Add Student`.

Above the fold:

- Page title: Today.
- Key alert cards:
  - Today's lessons
  - Pending review
  - Reschedule alerts
  - Renewals soon
- One primary next action.

Layout:

```text
Mobile Header

Daily Summary
  [Today's lessons]
  [Pending review]
  [Reschedule alerts]
  [Renewals soon]

Primary Next Action Card
  Most urgent item
  [Review Lessons] or [Schedule Lesson]

Today Lessons
  Lesson cards

Next Actions
  Task rows

Setup checklist only if no data / incomplete setup

Bottom Nav
```

Card rules:

- Summary cards use 2-column grid on phones only if labels fit; otherwise single column.
- Numeric value is large, label is short.
- Notes are one line or hidden on very small phones.
- Today lessons use cards, not tables.
- Next actions are compact rows.

What to hide/collapse:

- Finance summary.
- Full weekly lesson table.
- Detailed cleanup list.
- Advanced reports.
- Setup checklist after core setup is complete.

Empty state:

- If no data: show setup checklist.
- If no urgent tasks: show `Nothing urgent right now`.

## Core Screen 5: More / Account

Purpose: Mobile settings and account area.

Primary action: `Sign out / 登出` inside Account.

Above the fold:

- Account card.
- Language toggle.
- Sign out button.

Layout:

```text
Mobile Header

Account Section
  Current user
  Role
  Language toggle
  [Sign out / 登出]

Help & Setup
  Help Guide
  Setup Check / My Account Check
  Levels & Progress

Admin Tools (Admin only)
  Money
  Audit Logs
  Import
  Data Cleanup
  Reports
  Settings

Records (Admin only)
  Customers/Families
  Venues
  Classes/Groups
  Packages
  Lesson History

Bottom Nav
```

Rules:

- More is a settings list, not a grid of cards.
- One row per item.
- Each row has title, optional one-line description, and chevron.
- Coach More must not show Admin Tools or Records.
- Coach may show My Account Check, Help Guide, Levels & Progress.
- Sign out button must be visible and styled as a clear account action.
- `data-testid="sign-out-button"` remains on Sign out.

## Implementation Guardrails

Do not implement this spec by adding new business features.

Allowed in the next implementation batch:

- Reorder existing content.
- Hide advanced sections behind toggles.
- Convert default mobile tables into cards.
- Improve spacing, type scale, button hierarchy, and labels.
- Add missing stable test ids for existing elements.
- Improve empty states.

Not allowed in the next implementation batch:

- Schema/RLS changes.
- Parent portal.
- AI features.
- Calendar drag and drop.
- Invoice/PDF reports.
- New accounting system.
- Service role in frontend.
- Exposing finance data to Coach.

## Acceptance Checklist

- Coach Today feels useful within 10 seconds.
- Coach Submit Record can be completed quickly on a phone.
- Student Profile shows safety and focus before secondary details.
- Admin Today shows daily priorities before advanced records.
- More / Account makes Sign out obvious.
- No page-level horizontal overflow at 375px.
- Chinese labels do not break buttons or bottom nav.
- Advanced tables are not default mobile views.
- Coach never sees finance/admin-only data.
- Build, smoke routes, live QA, and UI checks still pass after implementation.
