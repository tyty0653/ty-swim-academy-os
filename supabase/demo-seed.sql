-- TY Swim Academy OS demo seed
-- Safe fake data only. Do not use real customer/student data here.
--
-- Before running:
-- 1. Create one Admin user and one Coach user in Supabase Auth.
-- 2. Replace the two UUID values below with those Auth user IDs.
-- 3. Run this after supabase/schema.sql.
--
-- Quick reset/delete demo data only:
--   This file deletes and recreates records with DEMO-* codes or DEMO_SEED notes.
--   It does not delete future real records.

do $$
declare
  -- REPLACE THESE TWO VALUES WITH REAL auth.users.id VALUES.
  v_admin_profile_id uuid := '00000000-0000-0000-0000-000000000001';
  v_coach_profile_id uuid := '00000000-0000-0000-0000-000000000002';

  v_coach_id uuid;
  v_customer_id uuid;
  v_student_a_id uuid;
  v_student_b_id uuid;
  v_venue_id uuid;
  v_class_id uuid;
  v_package_id uuid;
  v_schedule_id uuid;
begin
  if v_admin_profile_id::text = '00000000-0000-0000-0000-000000000001'
    or v_coach_profile_id::text = '00000000-0000-0000-0000-000000000002' then
    raise exception 'Replace v_admin_profile_id and v_coach_profile_id with real Supabase Auth user IDs before running demo-seed.sql';
  end if;

  delete from public.lesson_change_logs where lesson_id in (select id from public.lessons where lesson_code like 'DEMO-%');
  delete from public.lesson_participants where lesson_id in (select id from public.lessons where lesson_code like 'DEMO-%');
  delete from public.lesson_photos where lesson_id in (select id from public.lessons where lesson_code like 'DEMO-%');
  delete from public.expenses where linked_payroll_period_id in (
    select pp.id from public.payroll_periods pp join public.coaches c on c.id = pp.coach_id where c.coach_code like 'DEMO%'
  ) or notes like 'DEMO_SEED%';
  delete from public.payroll_items where lesson_id in (select id from public.lessons where lesson_code like 'DEMO-%');
  delete from public.payroll_periods where coach_id in (select id from public.coaches where coach_code like 'DEMO%');
  delete from public.lessons where lesson_code like 'DEMO-%';
  delete from public.recurring_schedules where notes like 'DEMO_SEED%';
  delete from public.package_financials where notes like 'DEMO_SEED%';
  delete from public.packages where package_code like 'DEMO-%';
  delete from public.class_students where class_id in (select id from public.classes where class_code like 'DEMO-%');
  delete from public.classes where class_code like 'DEMO-%';
  delete from public.consents where notes like 'DEMO_SEED%';
  delete from public.venues where venue_notes like 'DEMO_SEED%';
  delete from public.students where student_code like 'DEMO-%';
  delete from public.customers where customer_code like 'DEMO-%';
  delete from public.coach_rates where coach_id in (select id from public.coaches where coach_code like 'DEMO%') or notes like 'DEMO_SEED%';
  delete from public.coaches where coach_code like 'DEMO%';

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

  insert into public.students (student_code, customer_id, display_name, age, gender, level, learning_goal, health_notes, special_needs, safety_alert, preferred_language, status)
  values
    ('DEMO-STU-0001', v_customer_id, 'Demo Student A', 7, 'female', 'Beginner', 'Water confidence and floating.', 'No known health issue confirmed in demo.', null, null, 'English / Chinese', 'active'),
    ('DEMO-STU-0002', v_customer_id, 'Demo Student B', 9, 'male', 'Beginner', 'Breathing and kicking.', 'Demo note: mild water anxiety.', null, 'Needs gentle warm-up.', 'English / Chinese', 'active')
  on conflict (student_code) do update set
    customer_id = excluded.customer_id,
    display_name = excluded.display_name,
    age = excluded.age,
    level = excluded.level,
    health_notes = excluded.health_notes,
    safety_alert = excluded.safety_alert;

  select id into v_student_a_id from public.students where student_code = 'DEMO-STU-0001';
  select id into v_student_b_id from public.students where student_code = 'DEMO-STU-0002';

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
