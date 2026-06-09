# TY Swim Academy OS Figma Screen Prompts

These prompts are written for Figma Make or another design AI. Paste each prompt directly into the design tool. Do not include real student names, real customer data, passwords, Supabase keys, or private URLs.

Shared style direction for every prompt:

- Create a premium mobile operations app for TY Swim Academy OS.
- Device size: iPhone 390 x 844.
- Visual style: academy blue and white, clean, rounded, mobile app-like, calm, premium, not an admin dashboard.
- UI density: practical daily-use density, not empty marketing space and not cramped database software.
- Background: very light blue-white.
- Cards: white, 12px radius, subtle slate-blue border, no heavy shadows.
- Spacing: 16px page padding, 20px major section gap, 12px card gap, 16px card padding.
- Typography: modern sans-serif, 20px page title, 16px card title, 14px body, 12px badges, 44px minimum tap targets.
- Navigation: compact mobile header and fixed bottom tab navigation.
- Language: mostly English, with short Chinese examples. Chinese labels must fit and wrap cleanly.
- Avoid: desktop tables, sidebars, hero sections, decorative blobs, heavy gradients, raw database IDs, crowded button rows.

## Prompt 1: Coach Today

Paste this prompt:

```text
Design a mobile app screen for TY Swim Academy OS called "Coach Today".

The user is a part-time swim coach checking today's lessons on a phone before going to classes. The screen must feel like a calm premium swim academy app, not an admin dashboard. Use academy blue and white, rounded 12px cards, light blue-white background, 16px page padding, 20px section gaps, 44px tap targets, and a fixed bottom tab bar.

Use realistic demo content only:
- Coach: Coach Demo
- Lesson 1: 4:00 PM - 5:00 PM
- Class: DEMO 1-2 Beginner
- Students: Alicia Demo, Bryan Demo
- Venue: Condo Pool, Mont Kiara
- Safety alert: Nervous in deep water
- Current focus: Bubble breathing + back float
- Status: Scheduled
- Photo badge: Photo required
- Lesson 2 preview: 6:00 PM - 7:00 PM, Flexible Water Safety, Public Pool, Bangsar

Exact information hierarchy:
1. Compact header with "TY Swim OS", role "Coach", page title "Today".
2. Two small summary cards: "Today 2" and "Pending 1".
3. First lesson card above the fold.
4. Second lesson card partially visible below the fold.
5. Fixed bottom tabs: Today, Schedule, Students, Pay.

Above the fold must show:
- Today page title.
- Summary row.
- First lesson time.
- Class/group name.
- Student names.
- Safety alert if present.
- Main "Submit Record" button.

First lesson card layout:
- Top line: large lesson time "4:00 PM - 5:00 PM".
- Card title: "DEMO 1-2 Beginner".
- Student line: "Alicia Demo, Bryan Demo".
- Address line: "Condo Pool, Mont Kiara".
- Rose safety strip: "Safety Alert: nervous in deep water".
- Soft blue focus strip: "Focus: Bubble breathing + back float".
- Badge row: "Scheduled", "Photo required".
- Full-width primary blue button: "Submit Record".
- Secondary button row: "WhatsApp" and "Map".

Chinese label examples to include and make sure they fit:
- Submit Record: 提交记录
- Today: 今日
- Schedule: 课程
- Students: 学生
- Pay: 工资
- Safety Alert: 安全提醒

What to hide on this mobile screen:
- Payroll summary.
- Full weekly schedule.
- Full student history.
- Full progress checklist.
- Admin review controls.
- Customer price, payments, expenses, company income.
- Tables.

Primary action: Submit Record / 提交记录.
Secondary actions: WhatsApp, Map, Open Profile.

Make the design card-first, thumb-friendly, with no horizontal overflow. Long names and addresses must wrap cleanly.
```

## Prompt 2: Coach Submit Record

Paste this prompt:

```text
Design a mobile app screen for TY Swim Academy OS called "Coach Submit Record".

The user is a swim coach submitting a lesson record after class. The screen should let the coach submit a normal completed lesson in under one minute. It must be single-column, calm, premium, and mobile-first. Use academy blue and white, rounded cards, 16px page padding, 12px field gaps, 44px tap targets, and a clear full-width primary button.

Use realistic demo content only:
- Date/time: Tue, 4:00 PM - 5:00 PM
- Class: DEMO 1-2 Beginner
- Students: Alicia Demo, Bryan Demo
- Status: Scheduled
- Level: Level 1 Water Safety
- Focus criterion: Back float 5 sec

Exact information hierarchy:
1. Compact header with "TY Swim OS", role "Coach", page title "Submit Record".
2. Lesson summary card.
3. Result selector.
4. Attendance card.
5. Notes card.
6. Photo card.
7. Quick progress card.
8. Full-width Submit Record button.
9. Collapsed Change date/time row.

Above the fold must show:
- Lesson summary.
- Completed/Cancelled selector.
- At least the first attendance row.
- Clear path to Submit Record.

Lesson summary card:
- "Tue, 4:00 PM - 5:00 PM"
- "DEMO 1-2 Beginner"
- "Alicia Demo, Bryan Demo"
- Badge: "Scheduled"

Result card:
- Segmented control with "Completed" selected and "Cancelled" unselected.

Attendance card:
- Row for Alicia Demo with chips: Present selected, Absent, Sick, Late.
- Row for Bryan Demo with chips: Present selected, Absent, Sick, Late.
- Chips must be large enough to tap and wrap if needed.

Notes card:
- Textarea label: "Short progress note".
- Textarea label: "Next focus".
- Use 2 to 3 visible rows for each.

Photo card:
- Badge: "Photo optional".
- Upload area: "Add lesson photo".
- Keep photo usage internal by default.

Quick progress card:
- "Level 1 Water Safety".
- Criterion: "Back float 5 sec".
- Status chips: Learning, Almost, Passed.
- Small secondary link: "View full syllabus".

Primary action:
- Full-width blue button: "Submit Record".
- Chinese label version: 提交记录.

Secondary action:
- Collapsed row after the main form: "Change date/time" / 更改时间.
- Do not show date/time fields until this row is expanded.

What to hide on this default mobile screen:
- Full skill checklist.
- Admin approval buttons.
- Count package lesson.
- Coach payable.
- Pay override.
- Customer price.
- Payment status.
- Payroll details.
- Lesson change log.

Also show a read-only variant note somewhere subtle:
- "Approved - no further action needed."

Make it feel fast, focused, and non-technical. No tables and no horizontal overflow.
```

## Prompt 3: Student Profile

Paste this prompt:

```text
Design a mobile app screen for TY Swim Academy OS called "Student Profile".

The user is a coach or admin viewing a student before class. The screen must put safety and current learning focus before lesson history or admin details. It should feel like a polished mobile profile page in a premium swim academy operations app, not a database record.

Use academy blue and white, light blue-white background, white rounded 12px cards, 16px page padding, 20px section gaps, and clean readable typography.

Use realistic demo content only:
- Student: Alicia Demo
- Family: Demo Family
- Parent: Parent Demo
- Level: Level 1
- Level status: Learning
- Package count: 7 lessons left
- Safety alert: Nervous in deep water
- Health: No medical issue reported
- Special needs/confidence: Needs slow warm-up
- Photo consent: Internal only
- Current focus: Bubble breathing, back float, recover to stand
- Last assessed: 2026-06-01
- Venue: Condo Pool, Mont Kiara
- Schedule mode: Fixed weekly
- Coach: Coach Demo

Exact information hierarchy:
1. Compact header with "TY Swim OS", role "Coach", page title "Student Profile".
2. Profile header card.
3. Safety card.
4. Current Focus card.
5. Lesson Setup card.
6. Recent Lessons cards.
7. Admin finance card only for the Admin variant, hidden for Coach.
8. Advanced details collapsed.

Above the fold must show:
- Student name.
- Current level badge.
- WhatsApp and Map buttons.
- Safety card if any alert exists.
- Start of Current Focus card.

Profile header card:
- Large student name: "Alicia Demo".
- Family line: "Demo Family / Parent Demo".
- Badge row: "Level 1", "Learning", "7 lessons left".
- Action row: "WhatsApp" and "Map".

Safety card:
- Title: "Safety".
- Rose alert: "Nervous in deep water".
- Health note: "No medical issue reported".
- Special needs/confidence: "Needs slow warm-up".
- Badge: "Internal only".

Current Focus card:
- Title: "Current Focus".
- Main text: "Bubble breathing, back float, recover to stand".
- Metadata: "Last assessed: 2026-06-01".
- Full-width or strong primary button: "Update Progress".

Lesson Setup card:
- Coach: Coach Demo.
- Class: DEMO 1-2 Beginner.
- Mode: Fixed weekly.
- Venue: Condo Pool, Mont Kiara.
- Access note: "Use side gate, parent will meet coach".

Recent Lessons:
- Show 3 compact cards with date, status, short coach note.

Chinese label examples to include and make sure they fit:
- Update Progress: 更新进度
- Current Focus: 当前重点
- Safety: 安全
- Internal only: 内部使用
- Missing health note warning: 缺健康确认

Coach version must not show:
- Customer price.
- Payment status.
- Payment proof.
- Expenses.
- Admin-only financial notes.
- Audit logs.
- Other coach payroll.

Admin variant may include a collapsed "Admin finance" card lower on the page, not above the fold.

Make safety visually prominent but calm. No raw tables, no horizontal overflow, and all mixed Chinese/English text must wrap.
```

## Prompt 4: Admin Today

Paste this prompt:

```text
Design a mobile app screen for TY Swim Academy OS called "Admin Today".

The user is the swim academy owner checking daily operations. The page should feel like a control centre for what needs attention today, not a finance dashboard and not a database table.

Use a premium academy blue and white mobile app style: light blue-white background, white rounded cards, subtle borders, 16px page padding, 20px section gaps, 44px buttons, clean sans-serif typography, and fixed bottom tabs.

Use realistic demo content only:
- Today's lessons: 5
- Pending review: 2
- Reschedule alerts: 1
- Renewals soon: 3
- Primary task: Review coach submissions
- Today's lesson example: 4:00 PM, DEMO 1-2 Beginner, Coach Demo, Condo Pool, Mont Kiara, Pending Review

Exact information hierarchy:
1. Compact header with "TY Swim OS", role "Admin", page title "Today".
2. Daily summary metrics.
3. Primary Next Action card.
4. Today's Lessons section with cards.
5. Next Actions task rows.
6. Setup checklist only if no data or incomplete setup.
7. Lower-priority summaries below the fold.
8. Fixed bottom tabs.

Above the fold must show:
- Today page title.
- Four priority metrics or first two plus the next row.
- One clear Primary Next Action card.
- Primary action button "Review Lessons".

Daily summary:
- 2-column compact metric grid if it fits.
- Card 1: "Today's lessons" value 5.
- Card 2: "Pending review" value 2.
- Card 3: "Reschedule alerts" value 1.
- Card 4: "Renewals soon" value 3.

Primary Next Action card:
- Title: "Review coach submissions".
- Body: "2 lesson records need approval".
- Full-width blue button: "Review Lessons".
- Chinese label example: 审核课程.

Today's Lessons:
- Use compact lesson cards, not a table.
- Each card shows time, class/group, coach, venue, status badge, and a secondary "Open" or "Review" action.

Next Actions:
- Use simple rows:
  - "Check reschedules".
  - "Follow up renewals".
  - "Clean missing data".

Bottom tabs:
- Today active.
- Students.
- Schedule.
- Review.
- More.
- Chinese stress labels: 今日, 学生, 课程, 审核, 更多.

What to hide above the fold:
- Finance summary.
- Full lesson table.
- Full reports.
- Import/export tools.
- Technical setup errors.
- Detailed cleanup list.

The design should communicate "what should I do today?" within 10 seconds. Avoid crowded admin dashboard styling, large grids, and tables.
```

## Prompt 5: More / Account

Paste this prompt:

```text
Design a mobile app screen for TY Swim Academy OS called "More / Account".

The user is opening account and settings from a phone. The screen should feel like a simple mobile settings page, not a grid of admin cards. Sign out must be visible above the fold.

Use premium academy blue and white styling, white rounded cards, light blue-white background, 16px page padding, 52px settings rows, 44px minimum buttons, and a fixed bottom tab bar.

Create the Coach version first, with a note that Admin has extra collapsed sections lower on the page.

Exact information hierarchy:
1. Compact header with "TY Swim OS", role "Coach", page title "More".
2. Account card.
3. Help and Setup list.
4. Coach-safe extra links.
5. Admin-only collapsed groups shown only in Admin variant.
6. Bottom navigation.

Above the fold must show:
- Current user identity.
- Role.
- Language toggle.
- Full-width "Sign out / 登出" button.
- First Help and Setup row.

Account card:
- Name: "Coach Demo".
- Role: "Coach".
- Email line: "coach.demo@example.com" or safe placeholder.
- Language toggle: "English | 中文".
- Full-width button: "Sign out / 登出".

Help and Setup list:
- Row: "Help Guide" with one-line description "How to use the OS".
- Row: "My Account Check" with description "Check your coach access".
- Row: "Levels & Progress" with description "View student level guide".

Coach version must not show:
- Money.
- Payments.
- Expenses.
- Audit Logs.
- Export All Data.
- Reports.
- Admin setup technical details.
- Customer price.

Admin variant lower on the page:
- Collapsed group "Admin Tools".
- Rows: Money, Setup Check, Audit Logs, Export All Data, Import, Data Cleanup, Reports, Settings.
- Collapsed group "Records".
- Rows: Customers / Families, Venues, Classes / Groups, Packages, Lesson History.

Bottom nav for Coach:
- Today, Schedule, Students, Pay.
- Chinese labels: 今日, 课程, 学生, 工资.

Primary action:
- Sign out / 登出.
- It should be clear and easy to find, but not visually scary.

Secondary actions:
- Help Guide / 帮助.
- My Account Check / 账户检查.
- Levels & Progress / 级别进度.

Do not use a card grid. Use one row per item with a chevron. Keep spacing calm and app-like. No raw technical words such as RLS, schema.sql, Supabase, env variables, or service_role in the Coach view.
```

## Optional Shared Component Prompt

Paste this prompt if a component sheet is useful before individual screens:

```text
Create a TY Swim Academy OS mobile component sheet for a premium academy blue/white operations app.

Device context: components should fit a 390px-wide mobile screen with 16px page padding.

Create these reusable components:
- Mobile header with app name, role, and page title.
- Bottom tab navigation for Coach: Today, Schedule, Students, Pay.
- Bottom tab navigation for Admin: Today, Students, Schedule, Review, More.
- Primary blue button, 44px minimum height.
- Secondary outline button, 44px minimum height.
- Sign out button using soft danger styling.
- Status badges: Scheduled, Pending Review, Approved, Needs Edit, Safety Alert, Photo Required.
- Lesson card for Coach Today.
- Student profile header card.
- Safety alert card.
- Current focus card.
- Settings row with title, description, and chevron.
- Metric card for Admin Today.

Style:
- Premium academy blue and white.
- White cards with subtle slate-blue border.
- 12px radius.
- 16px card padding.
- 12px internal gaps.
- Clean modern sans-serif.
- No heavy shadows, no gradients, no decorative blobs.

Chinese label fit tests:
- 今日
- 课程
- 学生
- 工资
- 审核
- 更多
- 提交记录
- 更新进度
- 审核课程
- 登出
- 安全提醒

Security/role note:
- Coach components must not include customer price, payments, expenses, admin finance notes, audit logs, or other coach payroll.
```
