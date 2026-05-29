-- TY Swim Academy OS demo seed
-- Safe fake data only. Do not use real customer/student data here.
--
-- Before running:
-- 1. Create one Admin user and one Coach user in Supabase Auth.
-- 2. The default UUIDs below are the current test Auth user IDs.
--    Replace them only if you create new Admin/Coach Auth users.
-- 3. Run this after supabase/schema.sql.
--
-- Quick reset/delete demo data only:
--   This file deletes and recreates records with DEMO-* codes or DEMO_SEED notes.
--   It does not delete future real records.

do $$
declare
  -- Current test Supabase Auth user IDs.
  -- These are not service_role keys or passwords.
  v_admin_profile_id uuid := 'fe2a2b41-3bbe-4efe-bde1-5a3256a3b5fa';
  v_coach_profile_id uuid := '352b3c16-62cb-4f08-8c2f-f85eae8ac542';

  v_coach_id uuid;
  v_customer_id uuid;
  v_student_a_id uuid;
  v_student_b_id uuid;
  v_venue_id uuid;
  v_class_id uuid;
  v_package_id uuid;
  v_schedule_id uuid;
  v_demo_coach_ids uuid[];
  v_demo_customer_ids uuid[];
  v_demo_student_ids uuid[];
  v_demo_venue_ids uuid[];
  v_demo_class_ids uuid[];
  v_demo_package_ids uuid[];
  v_demo_schedule_ids uuid[];
  v_demo_lesson_ids uuid[];
  v_demo_payroll_period_ids uuid[];
begin
  -- This guard only rejects the original placeholder values, not real Auth IDs.
  if v_admin_profile_id::text = '00000000-0000-0000-0000-000000000001'
    or v_coach_profile_id::text = '00000000-0000-0000-0000-000000000002' then
    raise exception 'Replace v_admin_profile_id and v_coach_profile_id with real Supabase Auth user IDs before running demo-seed.sql';
  end if;

  -- Reset demo data only. The id sets intentionally include generated lessons and
  -- mutation-QA rows that reference demo packages/classes/coaches/schedules even
  -- when their generated code does not start with DEMO-.
  select coalesce(array_agg(id), '{}'::uuid[]) into v_demo_coach_ids
  from public.coaches
  where coach_code like 'DEMO%' or notes like 'DEMO_SEED%';

  select coalesce(array_agg(id), '{}'::uuid[]) into v_demo_customer_ids
  from public.customers
  where customer_code like 'DEMO-%' or source = 'demo_seed' or internal_notes like 'DEMO_SEED%';

  select coalesce(array_agg(id), '{}'::uuid[]) into v_demo_student_ids
  from public.students
  where student_code like 'DEMO-%'
     or customer_id = any(v_demo_customer_ids)
     or learning_goal like 'DEMO_SEED%'
     or health_notes like 'DEMO_SEED%';

  select coalesce(array_agg(id), '{}'::uuid[]) into v_demo_venue_ids
  from public.venues
  where venue_notes like 'DEMO_SEED%'
     or customer_id = any(v_demo_customer_ids);

  select coalesce(array_agg(id), '{}'::uuid[]) into v_demo_class_ids
  from public.classes
  where class_code like 'DEMO-%'
     or notes like 'DEMO_SEED%'
     or customer_id = any(v_demo_customer_ids)
     or assigned_coach_id = any(v_demo_coach_ids);

  select coalesce(array_agg(id), '{}'::uuid[]) into v_demo_package_ids
  from public.packages
  where package_code like 'DEMO-%'
     or notes like 'DEMO_SEED%'
     or customer_id = any(v_demo_customer_ids)
     or class_id = any(v_demo_class_ids);

  select coalesce(array_agg(id), '{}'::uuid[]) into v_demo_schedule_ids
  from public.recurring_schedules
  where notes like 'DEMO_SEED%'
     or class_id = any(v_demo_class_ids)
     or coach_id = any(v_demo_coach_ids);

  select coalesce(array_agg(id), '{}'::uuid[]) into v_demo_lesson_ids
  from public.lessons
  where lesson_code like 'DEMO-%'
     or package_id = any(v_demo_package_ids)
     or class_id = any(v_demo_class_ids)
     or coach_id = any(v_demo_coach_ids)
     or recurring_schedule_id = any(v_demo_schedule_ids)
     or exists (
       select 1
       from public.lesson_participants lp
       where lp.lesson_id = public.lessons.id
         and lp.student_id = any(v_demo_student_ids)
     )
     or coach_notes like 'DEMO_SEED%'
     or admin_notes like 'DEMO_SEED%';

  select coalesce(array_agg(id), '{}'::uuid[]) into v_demo_payroll_period_ids
  from public.payroll_periods
  where coach_id = any(v_demo_coach_ids)
     or notes like 'DEMO_SEED%';

  delete from public.lesson_change_logs where lesson_id = any(v_demo_lesson_ids);
  delete from public.lesson_skill_assessments
  where lesson_id = any(v_demo_lesson_ids)
     or student_id = any(v_demo_student_ids);
  delete from public.lesson_participants where lesson_id = any(v_demo_lesson_ids);
  delete from public.lesson_photos where lesson_id = any(v_demo_lesson_ids);
  delete from public.payroll_items
  where lesson_id = any(v_demo_lesson_ids)
     or coach_id = any(v_demo_coach_ids)
     or payroll_period_id = any(v_demo_payroll_period_ids);
  delete from public.expenses
  where linked_payroll_period_id = any(v_demo_payroll_period_ids)
     or notes like 'DEMO_SEED%';
  delete from public.payroll_periods
  where id = any(v_demo_payroll_period_ids)
     or coach_id = any(v_demo_coach_ids);
  delete from public.lessons where id = any(v_demo_lesson_ids);
  delete from public.recurring_schedules
  where id = any(v_demo_schedule_ids)
     or class_id = any(v_demo_class_ids)
     or coach_id = any(v_demo_coach_ids)
     or notes like 'DEMO_SEED%';
  delete from public.package_financials
  where package_id = any(v_demo_package_ids)
     or customer_id = any(v_demo_customer_ids)
     or notes like 'DEMO_SEED%';
  delete from public.packages
  where id = any(v_demo_package_ids)
     or package_code like 'DEMO-%'
     or notes like 'DEMO_SEED%';
  delete from public.class_students
  where class_id = any(v_demo_class_ids)
     or student_id = any(v_demo_student_ids);
  delete from public.classes
  where id = any(v_demo_class_ids)
     or class_code like 'DEMO-%'
     or notes like 'DEMO_SEED%';
  delete from public.consents
  where customer_id = any(v_demo_customer_ids)
     or student_id = any(v_demo_student_ids)
     or notes like 'DEMO_SEED%';
  delete from public.student_skill_progress
  where student_id = any(v_demo_student_ids);
  delete from public.student_skill_profiles
  where student_id = any(v_demo_student_ids);
  delete from public.venues
  where id = any(v_demo_venue_ids)
     or venue_notes like 'DEMO_SEED%';
  delete from public.students
  where id = any(v_demo_student_ids)
     or student_code like 'DEMO-%';
  delete from public.customers
  where id = any(v_demo_customer_ids)
     or customer_code like 'DEMO-%'
     or source = 'demo_seed';
  delete from public.coach_rates
  where coach_id = any(v_demo_coach_ids)
     or notes like 'DEMO_SEED%';
  delete from public.coaches
  where id = any(v_demo_coach_ids)
     or coach_code like 'DEMO%';

  insert into public.profiles (id, full_name, email, role, active)
  values
    (v_admin_profile_id, 'Demo Admin', 'demo.admin@example.test', 'admin', true),
    (v_coach_profile_id, 'Demo Coach', 'demo.coach@example.test', 'coach', true)
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    active = true;

  insert into public.coaches (profile_id, coach_code, display_name, phone, areas_covered, status, notes)
  values (v_coach_profile_id, 'DEMO-COACH', 'Demo Coach', '0100000000', 'Demo Area', 'active', 'DEMO_SEED')
  on conflict (coach_code) do update set
    profile_id = excluded.profile_id,
    display_name = excluded.display_name,
    phone = excluded.phone,
    status = 'active'
  returning id into v_coach_id;

  insert into public.coach_rates (coach_id, class_type, default_rate, effective_from, active, notes)
  values (v_coach_id, '1-2', 70, current_date - 30, true, 'DEMO_SEED')
  on conflict do nothing;

  insert into public.customers (customer_code, display_name, parent_name, whatsapp, source, status, internal_notes)
  values ('DEMO-CUS-0001', 'Demo Family', 'Demo Parent', '0101234567', 'demo_seed', 'active', 'Fake demo customer for QA.')
  on conflict (customer_code) do update set
    display_name = excluded.display_name,
    parent_name = excluded.parent_name,
    whatsapp = excluded.whatsapp,
    source = 'demo_seed'
  returning id into v_customer_id;

  insert into public.students (student_code, customer_id, display_name, age, gender, level, learning_goal, health_notes, special_needs, safety_alert, photo_consent_status, photo_consent_note, photo_consent_updated_at, preferred_language, status)
  values
    ('DEMO-STU-0001', v_customer_id, 'Demo Student A', 7, 'female', 'Beginner', 'Water confidence and floating.', 'No known health issue confirmed in demo.', null, null, 'marketing_approved', 'DEMO_SEED fake marketing consent approved for testing photo usage.', now(), 'English / Chinese', 'active'),
    ('DEMO-STU-0002', v_customer_id, 'Demo Student B', 9, 'male', 'Beginner', 'Breathing and kicking.', 'Demo note: mild water anxiety.', null, 'Needs gentle warm-up.', 'internal_only', 'DEMO_SEED internal lesson photo only.', now(), 'English / Chinese', 'active')
  on conflict (student_code) do update set
    customer_id = excluded.customer_id,
    display_name = excluded.display_name,
    age = excluded.age,
    level = excluded.level,
    health_notes = excluded.health_notes,
    safety_alert = excluded.safety_alert,
    photo_consent_status = excluded.photo_consent_status,
    photo_consent_note = excluded.photo_consent_note,
    photo_consent_updated_at = excluded.photo_consent_updated_at;

  select id into v_student_a_id from public.students where student_code = 'DEMO-STU-0001';
  select id into v_student_b_id from public.students where student_code = 'DEMO-STU-0002';

  insert into public.student_skill_profiles (student_id, current_level, level_status, current_focus, last_assessed_at, assessment_note, suggested_level_up, updated_by)
  values
    (v_student_a_id, 1, 'learning', 'Float to stand recovery and push & glide.', now(), 'DEMO_SEED Level 1 water safety tracking.', false, v_coach_profile_id),
    (v_student_b_id, 1, 'learning', 'Breath control and relaxed floating.', now(), 'DEMO_SEED Level 1 confidence tracking.', false, v_coach_profile_id)
  on conflict (student_id) do update set
    current_level = excluded.current_level,
    level_status = excluded.level_status,
    current_focus = excluded.current_focus,
    last_assessed_at = excluded.last_assessed_at,
    assessment_note = excluded.assessment_note,
    suggested_level_up = excluded.suggested_level_up,
    updated_by = excluded.updated_by;

  insert into public.student_skill_progress (student_id, level_number, criterion_id, status, note, last_assessed_at, assessed_by)
  values
    (v_student_a_id, 1, 'safe_entry_exit', 'passed', 'DEMO_SEED confident entry and exit.', now(), v_coach_profile_id),
    (v_student_a_id, 1, 'bubble_breathing', 'almost', 'DEMO_SEED improving breath control.', now(), v_coach_profile_id),
    (v_student_a_id, 1, 'front_star_float_5s', 'learning', 'DEMO_SEED needs calmer body line.', now(), v_coach_profile_id),
    (v_student_b_id, 1, 'safe_entry_exit', 'learning', 'DEMO_SEED needs gentle support.', now(), v_coach_profile_id),
    (v_student_b_id, 1, 'bubble_breathing', 'learning', 'DEMO_SEED short bubbles only.', now(), v_coach_profile_id)
  on conflict (student_id, level_number, criterion_id) do update set
    status = excluded.status,
    note = excluded.note,
    last_assessed_at = excluded.last_assessed_at,
    assessed_by = excluded.assessed_by;

  insert into public.venues (customer_id, venue_name, full_address, area, pool_type, google_maps_link, parking_note, access_instruction, pool_depth_note, active, venue_notes)
  values (v_customer_id, 'Demo Condo Pool', 'Demo Residence, Jalan Example, Johor Bahru', 'Demo Area', 'condo', 'https://maps.google.com/?q=Johor+Bahru', 'Visitor parking at guard house.', 'Register as visitor.', 'Shallow end available.', true, 'DEMO_SEED')
  returning id into v_venue_id;

  insert into public.classes (class_code, customer_id, class_name, class_type, scheduling_mode, assigned_coach_id, default_venue_id, default_duration_minutes, photo_required, status, notes)
  values ('DEMO-CLS-0001', v_customer_id, 'Demo Sibling Group', '1-2', 'fixed_weekly', v_coach_id, v_venue_id, 60, true, 'active', 'DEMO_SEED fixed weekly class')
  on conflict (class_code) do update set
    customer_id = excluded.customer_id,
    assigned_coach_id = excluded.assigned_coach_id,
    default_venue_id = excluded.default_venue_id,
    photo_required = true,
    status = 'active'
  returning id into v_class_id;

  insert into public.class_students (class_id, student_id, active)
  values (v_class_id, v_student_a_id, true), (v_class_id, v_student_b_id, true)
  on conflict (class_id, student_id) do update set active = true, left_at = null;

  insert into public.packages (package_code, customer_id, class_id, package_type, total_lessons, used_lessons, remaining_lessons, validity_months, start_date, payment_date, expiry_date, status, imported_from_legacy, notes)
  values ('DEMO-PKG-0001', v_customer_id, v_class_id, '8_lessons', 8, 0, 8, 4, current_date, current_date, (current_date + interval '4 months')::date, 'active', false, 'DEMO_SEED')
  on conflict (package_code) do update set
    customer_id = excluded.customer_id,
    class_id = excluded.class_id,
    total_lessons = 8,
    used_lessons = 0,
    remaining_lessons = 8,
    status = 'active'
  returning id into v_package_id;

  insert into public.package_financials (package_id, customer_id, amount, payment_date, payment_method, payment_status, notes)
  values (v_package_id, v_customer_id, 680, current_date, 'bank_transfer', 'paid', 'DEMO_SEED fake paid payment')
  on conflict do nothing;

  insert into public.recurring_schedules (class_id, coach_id, venue_id, day_of_week, start_time, end_time, active_from, status, notes)
  values (v_class_id, v_coach_id, v_venue_id, extract(dow from current_date)::integer, '17:00', '18:00', current_date, 'active', 'DEMO_SEED fixed weekly schedule')
  returning id into v_schedule_id;

  insert into public.lessons (lesson_code, class_id, package_id, coach_id, venue_id, recurring_schedule_id, scheduling_mode, scheduled_date, start_time, end_time, duration_minutes, status, count_package_lesson, coach_payable, created_by, updated_by, coach_notes)
  values
    ('DEMO-LES-0001', v_class_id, v_package_id, v_coach_id, v_venue_id, v_schedule_id, 'fixed_weekly', current_date, '17:00', '18:00', 60, 'scheduled', true, true, v_admin_profile_id, v_admin_profile_id, 'DEMO_SEED scheduled fixed weekly lesson'),
    ('DEMO-LES-0002', v_class_id, v_package_id, v_coach_id, v_venue_id, null, 'flexible', current_date + 3, '10:00', '11:00', 60, 'scheduled', true, true, v_admin_profile_id, v_admin_profile_id, 'DEMO_SEED flexible lesson appointment'),
    ('DEMO-LES-0003', v_class_id, v_package_id, v_coach_id, v_venue_id, null, 'flexible', current_date - 1, '10:00', '11:00', 60, 'completed_pending_review', true, true, v_coach_profile_id, v_coach_profile_id, 'DEMO_SEED pending review lesson submitted by coach')
  on conflict (lesson_code) do update set
    class_id = excluded.class_id,
    package_id = excluded.package_id,
    coach_id = excluded.coach_id,
    venue_id = excluded.venue_id,
    recurring_schedule_id = excluded.recurring_schedule_id,
    scheduling_mode = excluded.scheduling_mode,
    scheduled_date = excluded.scheduled_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    duration_minutes = excluded.duration_minutes,
    status = excluded.status,
    count_package_lesson = excluded.count_package_lesson,
    coach_payable = excluded.coach_payable,
    approved_package_applied = false,
    admin_reviewed_at = null,
    admin_reviewed_by = null,
    created_by = excluded.created_by,
    updated_by = excluded.updated_by,
    coach_notes = excluded.coach_notes,
    admin_notes = null;

  insert into public.lesson_participants (lesson_id, student_id, attendance, progress_note, next_focus)
  select l.id, s.id, 'present', 'DEMO_SEED progress note', 'DEMO_SEED next focus'
  from public.lessons l
  cross join public.students s
  where l.lesson_code in ('DEMO-LES-0001', 'DEMO-LES-0002', 'DEMO-LES-0003')
    and s.student_code in ('DEMO-STU-0001', 'DEMO-STU-0002')
  on conflict (lesson_id, student_id) do nothing;

  insert into public.consents (customer_id, internal_photo_allowed, marketing_photo_status, platforms_allowed, consent_date, notes)
  values (v_customer_id, true, 'ask_first', array['internal'], current_date, 'DEMO_SEED fake consent row')
  on conflict do nothing;

  if not exists (
    select 1 from public.lessons
    where lesson_code = 'DEMO-LES-0003'
      and status = 'completed_pending_review'
      and package_id = v_package_id
      and coach_id = v_coach_id
  ) then
    raise exception 'Demo seed failed to create DEMO-LES-0003 as completed_pending_review';
  end if;
end $$;
