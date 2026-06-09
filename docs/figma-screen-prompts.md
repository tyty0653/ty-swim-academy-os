# TY Swim Academy OS Figma Screen Prompts

Use these prompts to create mobile-first Figma concepts for TY Swim Academy OS. Do not include real student/customer data, passwords, Supabase keys, or private URLs.

Design format for all screens:

- Device frame: iPhone 390 x 844.
- Style: clean premium swim academy operations app.
- Palette: white, very light slate, academy blue, emerald success, amber warning, rose safety.
- Typography: modern sans-serif, compact but readable.
- Cards: white, subtle border, 10-12px radius, soft spacing.
- Navigation: simple mobile header and fixed bottom tabs.
- Language: English labels, with occasional Chinese label stress tests where specified.
- Avoid marketing hero sections, decorative blobs, heavy gradients, and table-first layouts.

## Prompt 1: Coach Today

Create a mobile app screen for "TY Swim Academy OS - Coach Today".

User: part-time swim coach checking lessons on a phone.

Screen goals:

- Show what lessons are today.
- Make parent contact and map easy.
- Make Submit Record the obvious primary action.
- Show safety alert and current focus before actions.

Layout:

- Top mobile header:
  - "TY Swim OS"
  - role label "Coach"
  - page title "Today"
- Compact summary row with two cards:
  - "Today" value "2"
  - "Pending" value "1"
- Main lesson card above the fold:
  - time "4:00 PM - 5:00 PM"
  - class/group "DEMO 1-2 Beginner"
  - students "Alicia Demo, Bryan Demo"
  - venue/address "Condo Pool, Mont Kiara"
  - rose safety alert strip "Safety Alert: nervous in deep water"
  - blue current focus strip "Current Focus: Bubble breathing + back float"
  - badges "Scheduled" and "Photo required"
  - primary full-width blue button "Submit Record"
  - secondary two-button row "WhatsApp" and "Map"
- Second lesson card partly visible below.
- Fixed bottom nav:
  - Today active
  - Schedule
  - Students
  - Pay

Visual requirements:

- No tables.
- Thumb-friendly buttons.
- Long student/address text wraps cleanly.
- Calm blue/white academy style.
- Include a Chinese label stress test somewhere small: "提交记录" should fit as primary button text.

## Prompt 2: Coach Submit Record

Create a mobile app screen for "TY Swim Academy OS - Coach Submit Record".

User: coach submitting a lesson after class.

Screen goals:

- Complete a normal lesson record in under one minute.
- Keep date/time reschedule hidden.
- Make the Submit Record button obvious.

Layout:

- Top mobile header:
  - "TY Swim OS"
  - role "Coach"
  - title "Submit Record"
- Lesson summary card:
  - date/time
  - class/group
  - two student names
  - status badge "Scheduled"
- Result card:
  - segmented control "Completed" selected, "Cancelled"
- Attendance card:
  - student row "Alicia Demo" with chips Present selected, Absent, Sick, Late
  - student row "Bryan Demo" with chips Present selected, Absent, Sick, Late
- Notes card:
  - field "Short progress note"
  - field "Next focus"
- Photo card:
  - badge "Photo optional"
  - upload area "Add lesson photo"
- Quick progress card:
  - "Level 1 Water Safety"
  - criteria row "Back float 5 sec"
  - chips Learning, Almost, Passed
  - small link "View full syllabus"
- Primary sticky or full-width bottom button:
  - "Submit Record"
- Collapsed secondary row:
  - "Change date/time"

Visual requirements:

- Single column.
- No admin controls.
- No package/payroll/price fields.
- Keep the full syllabus out of the default screen.
- Include Chinese label stress test: "更改日期/时间" collapsed row should fit and wrap if needed.

## Prompt 3: Student Profile

Create a mobile app screen for "TY Swim Academy OS - Student Profile".

User: coach or admin viewing a student before class.

Screen goals:

- Safety first.
- Show current level and focus.
- Make WhatsApp, Map, and Update Progress easy.
- Keep finance hidden from coach version.

Layout:

- Top mobile header:
  - "TY Swim OS"
  - role "Coach"
  - title "Student Profile"
- Profile header card:
  - student name "Alicia Demo"
  - parent/family "Demo Family / Parent Demo"
  - badges "Level 1" and "Learning"
  - package badge "7 lessons left" as safe count only
  - action row "WhatsApp" and "Map"
- Safety card:
  - title "Safety"
  - rose alert "Nervous in deep water"
  - health notes "No medical issue reported"
  - special needs/confidence "Needs slow warm-up"
  - photo consent badge "Internal only"
- Current focus card:
  - "Current Focus"
  - "Bubble breathing, back float, recover to stand"
  - "Last assessed: 2026-06-01"
  - primary button "Update Progress"
- Lesson setup card:
  - coach
  - venue/address
  - schedule mode
- Recent lessons:
  - last 3 compact cards
- Admin-only finance card is not shown in this coach concept.

Visual requirements:

- Safety card appears above lesson setup.
- No raw database table.
- Cards use consistent spacing.
- Long Chinese text should wrap: test with "当前重点：水中吐气、背浮、站立恢复".

## Prompt 4: Admin Today

Create a mobile app screen for "TY Swim Academy OS - Admin Today".

User: swim academy owner checking daily operations.

Screen goals:

- Show daily priorities quickly.
- Make pending review the most obvious action when present.
- Avoid database admin clutter.

Layout:

- Top mobile header:
  - "TY Swim OS"
  - role "Admin"
  - title "Today"
- Summary grid:
  - "Today's lessons" value "5"
  - "Pending review" value "2"
  - "Reschedule alerts" value "1"
  - "Renewals soon" value "3"
- Primary next action card:
  - title "Review coach submissions"
  - text "2 lesson records need approval"
  - primary blue button "Review Lessons"
- Today's lessons section:
  - 2 compact lesson cards
  - each card shows time, class, coach, venue, status
- Next Actions section:
  - task rows:
    - "Check reschedules"
    - "Follow up renewals"
    - "Clean missing data"
- Fixed bottom nav:
  - Today active
  - Students
  - Schedule
  - Review
  - More

Visual requirements:

- No finance summary above the fold.
- No tables.
- Summary cards can be 2 columns if labels fit; otherwise stack.
- Important numbers are prominent but not huge.
- Include Chinese label stress test for summary card "待审核" and bottom nav "更多".

## Prompt 5: More / Account

Create a mobile app screen for "TY Swim Academy OS - More / Account".

User: Admin or Coach managing account/settings.

Screen goals:

- Make Sign out obvious.
- Show language toggle.
- Keep More as settings list, not a grid.
- Hide Admin tools from Coach version.

Layout:

- Top mobile header:
  - "TY Swim OS"
  - role label
  - title "More"
- Account section card:
  - current user "Coach Demo"
  - role "Coach"
  - language toggle "English | 中文"
  - full-width rose/soft danger button "Sign out / 登出"
- Help & Setup list:
  - row "Help Guide"
  - row "My Account Check"
  - row "Levels & Progress"
- For Admin variant only, include collapsed groups:
  - "Admin Tools"
  - "Records"
- For Coach variant, do not show:
  - Money
  - Payments
  - Expenses
  - Audit Logs
  - Export All Data
  - Reports
- Fixed bottom nav visible.

Visual requirements:

- One row per item with chevron.
- Sign out appears above the fold.
- Chinese label "登出" is visible.
- No card grid on phone.
- Calm settings-app feeling.

## Shared Component Prompt

Create a small TY Swim Academy OS mobile component sheet:

- Primary button
- Secondary button
- Danger/sign-out button
- Status badge variants:
  - Scheduled
  - Pending Review
  - Approved
  - Needs Edit
  - Safety Alert
  - Photo Required
- Lesson card
- Student profile header card
- Safety alert card
- Settings row
- Bottom nav

Style:

- Academy blue/white.
- Rounded 10-12px.
- 44px minimum tap targets.
- Text wraps cleanly.
- Chinese labels fit:
  - 今日
  - 课程
  - 学生
  - 工资
  - 更多
  - 提交记录
  - 更新进度
  - 登出

Do not include business-sensitive finance data in Coach components.
