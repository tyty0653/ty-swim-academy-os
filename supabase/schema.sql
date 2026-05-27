-- TY Swim Academy OS schema
-- Run this in the Supabase SQL editor, then create the first Admin profile as documented.

create extension if not exists pgcrypto;

create type app_role as enum ('admin', 'coach');
create type class_type as enum ('1-1', '1-2', '1-3', '1-4', 'special');
create type scheduling_mode as enum ('fixed_weekly', 'flexible');
create type lesson_status as enum ('scheduled', 'rescheduled', 'completed_pending_review', 'cancelled_pending_review', 'needs_edit', 'approved', 'rejected', 'archived');
create type attendance_status as enum ('present', 'absent', 'sick', 'late', 'no_show', 'not_applicable');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  role app_role not null default 'coach',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  coach_code text unique not null,
  display_name text not null,
  phone text,
  gender text,
  areas_covered text,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coach_rates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  class_type class_type not null,
  default_rate numeric(12,2) not null default 0,
  effective_from date not null default current_date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists customers_id_seq;
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique default ('CUS-' || lpad(nextval('customers_id_seq')::text, 4, '0')),
  display_name text,
  parent_name text,
  whatsapp text,
  secondary_contact text,
  source text,
  status text not null default 'active',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists students_id_seq;
create table public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text unique default ('STU-' || lpad(nextval('students_id_seq')::text, 4, '0')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  display_name text,
  age integer,
  gender text,
  level text,
  learning_goal text,
  health_notes text,
  special_needs text,
  safety_alert text,
  preferred_language text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  venue_name text,
  full_address text,
  area text,
  pool_type text not null default 'other',
  google_maps_link text,
  parking_note text,
  access_instruction text,
  entry_fee_note text,
  pool_depth_note text,
  venue_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists classes_id_seq;
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  class_code text unique default ('CLS-' || lpad(nextval('classes_id_seq')::text, 4, '0')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  class_name text,
  class_type class_type not null default '1-1',
  scheduling_mode scheduling_mode not null default 'flexible',
  assigned_coach_id uuid references public.coaches(id) on delete set null,
  default_venue_id uuid references public.venues(id) on delete set null,
  default_duration_minutes integer not null default 60,
  photo_required boolean not null default false,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  active boolean not null default true,
  joined_at date not null default current_date,
  left_at date,
  unique(class_id, student_id)
);

create sequence if not exists packages_id_seq;
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  package_code text unique default ('PKG-' || lpad(nextval('packages_id_seq')::text, 4, '0')),
  customer_id uuid not null references public.customers(id) on delete restrict,
  class_id uuid references public.classes(id) on delete set null,
  package_type text not null default '4_lessons',
  total_lessons integer not null default 4,
  used_lessons integer not null default 0,
  remaining_lessons integer not null default 4,
  validity_months integer,
  start_date date,
  payment_date date,
  expiry_date date,
  status text not null default 'active',
  imported_from_legacy boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.package_financials (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.packages(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  amount numeric(12,2) not null default 0,
  payment_date date,
  payment_method text not null default 'other',
  payment_status text not null default 'pending',
  proof_storage_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete restrict,
  venue_id uuid references public.venues(id) on delete set null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  active_from date not null default current_date,
  active_until date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists lessons_id_seq;
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  lesson_code text unique default ('LES-' || lpad(nextval('lessons_id_seq')::text, 4, '0')),
  class_id uuid not null references public.classes(id) on delete restrict,
  package_id uuid references public.packages(id) on delete restrict,
  coach_id uuid references public.coaches(id) on delete set null,
  original_coach_id uuid references public.coaches(id) on delete set null,
  substitute_reason text,
  venue_id uuid references public.venues(id) on delete set null,
  recurring_schedule_id uuid references public.recurring_schedules(id) on delete set null,
  scheduling_mode scheduling_mode not null default 'flexible',
  scheduled_date date not null,
  start_time time,
  end_time time,
  duration_minutes integer not null default 60,
  status lesson_status not null default 'scheduled',
  cancellation_type text,
  count_package_lesson boolean not null default true,
  coach_payable boolean not null default true,
  need_replacement boolean not null default false,
  approved_package_applied boolean not null default false,
  coach_submitted_at timestamptz,
  admin_reviewed_at timestamptz,
  admin_reviewed_by uuid references public.profiles(id) on delete set null,
  coach_notes text,
  admin_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index lessons_recurring_occurrence_idx on public.lessons(recurring_schedule_id, scheduled_date, start_time) where recurring_schedule_id is not null;

create table public.lesson_participants (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  attendance attendance_status not null default 'present',
  progress_note text,
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_id, student_id)
);

create table public.lesson_photos (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  photo_type text not null default 'attendance_proof',
  caption text,
  created_at timestamptz not null default now()
);

create table public.lesson_change_logs (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  change_type text not null,
  old_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  reason text,
  admin_seen boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete restrict,
  period_month date not null,
  status text not null default 'draft',
  total_lessons integer not null default 0,
  total_amount numeric(12,2) not null default 0,
  paid_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(coach_id, period_month)
);

create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_period_id uuid references public.payroll_periods(id) on delete set null,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  coach_id uuid not null references public.coaches(id) on delete restrict,
  pay_amount numeric(12,2) not null default 0,
  rate_source text not null default 'default_rate',
  override_reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lesson_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null default 'other',
  amount numeric(12,2) not null default 0,
  payment_method text,
  vendor text,
  linked_payroll_period_id uuid references public.payroll_periods(id) on delete set null,
  receipt_storage_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index expenses_payroll_once_idx on public.expenses(linked_payroll_period_id) where linked_payroll_period_id is not null and category = 'coach_salary';

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  internal_photo_allowed boolean not null default false,
  marketing_photo_status text not null default 'unknown',
  platforms_allowed text[] not null default '{}',
  consent_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  import_type text not null,
  file_name text,
  imported_by uuid references public.profiles(id) on delete set null default auth.uid(),
  row_count integer not null default 0,
  success_count integer not null default 0,
  error_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger coaches_updated before update on public.coaches for each row execute function public.set_updated_at();
create trigger coach_rates_updated before update on public.coach_rates for each row execute function public.set_updated_at();
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger students_updated before update on public.students for each row execute function public.set_updated_at();
create trigger venues_updated before update on public.venues for each row execute function public.set_updated_at();
create trigger classes_updated before update on public.classes for each row execute function public.set_updated_at();
create trigger packages_updated before update on public.packages for each row execute function public.set_updated_at();
create trigger package_financials_updated before update on public.package_financials for each row execute function public.set_updated_at();
create trigger recurring_schedules_updated before update on public.recurring_schedules for each row execute function public.set_updated_at();
create trigger lessons_updated before update on public.lessons for each row execute function public.set_updated_at();
create trigger lesson_participants_updated before update on public.lesson_participants for each row execute function public.set_updated_at();
create trigger payroll_periods_updated before update on public.payroll_periods for each row execute function public.set_updated_at();
create trigger payroll_items_updated before update on public.payroll_items for each row execute function public.set_updated_at();
create trigger expenses_updated before update on public.expenses for each row execute function public.set_updated_at();
create trigger consents_updated before update on public.consents for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.current_coach_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.coaches where profile_id = auth.uid() and status = 'active' limit 1;
$$;

create or replace function public.is_assigned_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.classes where id = p_class_id and assigned_coach_id = public.current_coach_id());
$$;

create or replace function public.is_assigned_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.classes where customer_id = p_customer_id and assigned_coach_id = public.current_coach_id());
$$;

create or replace function public.is_assigned_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.lessons where id = p_lesson_id and coach_id = public.current_coach_id());
$$;

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
    values (auth.uid(), lower(tg_op), tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'INSERT' then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, new_data)
    values (auth.uid(), lower(tg_op), tg_table_name, new.id, to_jsonb(new));
    return new;
  end if;
  return old;
end;
$$;

create trigger audit_lessons after insert or update on public.lessons for each row execute function public.audit_row();
create trigger audit_packages after insert or update on public.packages for each row execute function public.audit_row();
create trigger audit_payroll after insert or update on public.payroll_periods for each row execute function public.audit_row();
create trigger audit_expenses after insert or update on public.expenses for each row execute function public.audit_row();
create trigger audit_payments after insert or update on public.package_financials for each row execute function public.audit_row();

create or replace function public.approve_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons%rowtype;
  v_rate numeric(12,2);
begin
  if not public.is_admin() then
    raise exception 'Only Admin can approve lessons';
  end if;

  select * into v_lesson from public.lessons where id = p_lesson_id for update;
  if not found then
    raise exception 'Lesson not found';
  end if;

  if v_lesson.count_package_lesson and v_lesson.package_id is not null and not v_lesson.approved_package_applied then
    update public.packages
    set used_lessons = used_lessons + 1,
        remaining_lessons = greatest(remaining_lessons - 1, 0),
        status = case when greatest(remaining_lessons - 1, 0) = 0 then 'completed' else status end
    where id = v_lesson.package_id;

    update public.lessons set approved_package_applied = true where id = p_lesson_id;
  end if;

  if v_lesson.coach_payable and v_lesson.coach_id is not null then
    select cr.default_rate into v_rate
    from public.coach_rates cr
    join public.classes c on c.id = v_lesson.class_id
    where cr.coach_id = v_lesson.coach_id
      and cr.class_type = c.class_type
      and cr.active
      and cr.effective_from <= coalesce(v_lesson.scheduled_date, current_date)
    order by cr.effective_from desc
    limit 1;

    insert into public.payroll_items(lesson_id, coach_id, pay_amount, rate_source, status)
    values (p_lesson_id, v_lesson.coach_id, coalesce(v_rate, 0), case when v_rate is null then 'override' else 'default_rate' end, 'pending')
    on conflict (lesson_id) do nothing;
  end if;

  update public.lessons
  set status = 'approved',
      admin_reviewed_at = now(),
      admin_reviewed_by = auth.uid(),
      updated_by = auth.uid()
  where id = p_lesson_id;
end;
$$;

create or replace function public.generate_monthly_payroll(p_period_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', p_period_month)::date;
  v_coach record;
  v_period_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only Admin can generate payroll';
  end if;

  for v_coach in
    select distinct pi.coach_id
    from public.payroll_items pi
    join public.lessons l on l.id = pi.lesson_id
    where l.status = 'approved'
      and l.scheduled_date >= v_month
      and l.scheduled_date < (v_month + interval '1 month')
      and pi.status in ('pending', 'included')
  loop
    insert into public.payroll_periods(coach_id, period_month, status)
    values (v_coach.coach_id, v_month, 'ready')
    on conflict (coach_id, period_month) do update set status = excluded.status
    returning id into v_period_id;

    update public.payroll_items pi
    set payroll_period_id = v_period_id,
        status = 'included'
    from public.lessons l
    where l.id = pi.lesson_id
      and pi.coach_id = v_coach.coach_id
      and l.scheduled_date >= v_month
      and l.scheduled_date < (v_month + interval '1 month')
      and pi.status in ('pending', 'included');

    update public.payroll_periods pp
    set total_lessons = (select count(*) from public.payroll_items where payroll_period_id = v_period_id and status <> 'void'),
        total_amount = (select coalesce(sum(pay_amount), 0) from public.payroll_items where payroll_period_id = v_period_id and status <> 'void')
    where pp.id = v_period_id;
  end loop;
end;
$$;

create or replace function public.mark_payroll_paid(p_period_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.payroll_periods%rowtype;
  v_coach_name text;
begin
  if not public.is_admin() then
    raise exception 'Only Admin can mark payroll paid';
  end if;

  select * into v_period from public.payroll_periods where id = p_period_id for update;
  if not found then
    raise exception 'Payroll period not found';
  end if;

  update public.payroll_periods set status = 'paid', paid_date = current_date where id = p_period_id;
  update public.payroll_items set status = 'paid' where payroll_period_id = p_period_id and status <> 'void';
  select display_name into v_coach_name from public.coaches where id = v_period.coach_id;

  insert into public.expenses(expense_date, category, amount, payment_method, vendor, linked_payroll_period_id, notes)
  values (current_date, 'coach_salary', v_period.total_amount, 'other', v_coach_name, p_period_id, 'Auto-created from paid payroll')
  on conflict do nothing;
end;
$$;

create or replace function public.generate_lessons_from_schedule(p_schedule_id uuid, p_weeks integer default 8)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule public.recurring_schedules%rowtype;
  v_date date;
  v_end date;
  v_package_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only Admin can generate recurring lessons';
  end if;

  select * into v_schedule from public.recurring_schedules where id = p_schedule_id;
  if not found then
    raise exception 'Schedule not found';
  end if;

  v_date := v_schedule.active_from;
  v_end := v_schedule.active_from + ((greatest(p_weeks, 1) * 7) || ' days')::interval;
  select id into v_package_id from public.packages
  where class_id = v_schedule.class_id and status in ('active', 'paused')
  order by created_at desc limit 1;

  while v_date <= v_end loop
    if extract(dow from v_date)::integer = v_schedule.day_of_week then
      insert into public.lessons(class_id, package_id, coach_id, venue_id, recurring_schedule_id, scheduling_mode, scheduled_date, start_time, end_time, duration_minutes, status, count_package_lesson, coach_payable)
      values (v_schedule.class_id, v_package_id, v_schedule.coach_id, v_schedule.venue_id, v_schedule.id, 'fixed_weekly', v_date, v_schedule.start_time, v_schedule.end_time, extract(epoch from (v_schedule.end_time - v_schedule.start_time))::integer / 60, 'scheduled', true, true)
      on conflict do nothing;
    end if;
    v_date := v_date + interval '1 day';
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.coach_rates enable row level security;
alter table public.customers enable row level security;
alter table public.students enable row level security;
alter table public.venues enable row level security;
alter table public.classes enable row level security;
alter table public.class_students enable row level security;
alter table public.packages enable row level security;
alter table public.package_financials enable row level security;
alter table public.recurring_schedules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_participants enable row level security;
alter table public.lesson_photos enable row level security;
alter table public.lesson_change_logs enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payroll_items enable row level security;
alter table public.expenses enable row level security;
alter table public.consents enable row level security;
alter table public.import_batches enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_admin_write on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy admin_all_coaches on public.coaches for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_self on public.coaches for select using (profile_id = auth.uid());

create policy admin_all_coach_rates on public.coach_rates for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_own_rates on public.coach_rates for select using (coach_id = public.current_coach_id());

create policy admin_all_customers on public.customers for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_assigned_customers on public.customers for select using (public.is_assigned_customer(id));

create policy admin_all_students on public.students for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_assigned_students on public.students for select using (exists (
  select 1 from public.class_students cs join public.classes c on c.id = cs.class_id
  where cs.student_id = students.id and c.assigned_coach_id = public.current_coach_id()
));

create policy admin_all_venues on public.venues for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_assigned_venues on public.venues for select using (exists (
  select 1 from public.classes c where c.default_venue_id = venues.id and c.assigned_coach_id = public.current_coach_id()
) or exists (
  select 1 from public.lessons l where l.venue_id = venues.id and l.coach_id = public.current_coach_id()
));

create policy admin_all_classes on public.classes for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_assigned_classes on public.classes for select using (assigned_coach_id = public.current_coach_id());

create policy admin_all_class_students on public.class_students for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_assigned_class_students on public.class_students for select using (public.is_assigned_class(class_id));

create policy admin_all_packages on public.packages for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_assigned_packages on public.packages for select using (public.is_assigned_class(class_id));

create policy admin_all_financials on public.package_financials for all using (public.is_admin()) with check (public.is_admin());

create policy admin_all_schedules on public.recurring_schedules for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_schedules on public.recurring_schedules for select using (coach_id = public.current_coach_id());

create policy admin_all_lessons on public.lessons for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_own_lessons on public.lessons for select using (coach_id = public.current_coach_id());
create policy coach_create_flexible_lessons on public.lessons for insert with check (
  coach_id = public.current_coach_id()
  and scheduling_mode = 'flexible'
  and public.is_assigned_class(class_id)
  and status in ('scheduled', 'rescheduled')
);
create policy coach_update_own_unapproved_lessons on public.lessons for update using (
  coach_id = public.current_coach_id()
  and status <> 'approved'
) with check (
  coach_id = public.current_coach_id()
  and status <> 'approved'
);

create policy admin_all_participants on public.lesson_participants for all using (public.is_admin()) with check (public.is_admin());
create policy coach_participants on public.lesson_participants for all using (public.is_assigned_lesson(lesson_id)) with check (public.is_assigned_lesson(lesson_id));

create policy admin_all_photos on public.lesson_photos for all using (public.is_admin()) with check (public.is_admin());
create policy coach_photos on public.lesson_photos for all using (public.is_assigned_lesson(lesson_id)) with check (public.is_assigned_lesson(lesson_id));

create policy admin_all_change_logs on public.lesson_change_logs for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_own_change_logs on public.lesson_change_logs for select using (public.is_assigned_lesson(lesson_id));
create policy coach_create_own_change_logs on public.lesson_change_logs for insert with check (public.is_assigned_lesson(lesson_id));

create policy admin_all_payroll_periods on public.payroll_periods for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_own_payroll_periods on public.payroll_periods for select using (coach_id = public.current_coach_id());

create policy admin_all_payroll_items on public.payroll_items for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_own_payroll_items on public.payroll_items for select using (coach_id = public.current_coach_id());

create policy admin_all_expenses on public.expenses for all using (public.is_admin()) with check (public.is_admin());

create policy admin_all_consents on public.consents for all using (public.is_admin()) with check (public.is_admin());
create policy coach_read_assigned_consents on public.consents for select using (public.is_assigned_customer(customer_id));

create policy admin_all_import_batches on public.import_batches for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all_audit_logs on public.audit_logs for select using (public.is_admin());
create policy admin_all_settings on public.settings for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('lesson-photos', 'lesson-photos', false),
  ('payment-proofs', 'payment-proofs', false),
  ('expense-receipts', 'expense-receipts', false)
on conflict (id) do update set public = false;

create policy lesson_photos_admin_storage on storage.objects for all
using (bucket_id = 'lesson-photos' and public.is_admin())
with check (bucket_id = 'lesson-photos' and public.is_admin());

create policy lesson_photos_coach_storage on storage.objects for insert
with check (
  bucket_id = 'lesson-photos'
  and exists (
    select 1 from public.lessons l
    where l.id::text = (storage.foldername(name))[1]
      and l.coach_id = public.current_coach_id()
      and l.status <> 'approved'
  )
);

create policy lesson_photos_coach_read_storage on storage.objects for select
using (
  bucket_id = 'lesson-photos'
  and exists (
    select 1 from public.lessons l
    where l.id::text = (storage.foldername(name))[1]
      and l.coach_id = public.current_coach_id()
  )
);

create policy payment_proofs_admin_storage on storage.objects for all
using (bucket_id = 'payment-proofs' and public.is_admin())
with check (bucket_id = 'payment-proofs' and public.is_admin());

create policy expense_receipts_admin_storage on storage.objects for all
using (bucket_id = 'expense-receipts' and public.is_admin())
with check (bucket_id = 'expense-receipts' and public.is_admin());

insert into public.settings(key, value)
values
  ('package_validity_months', '{"single":1,"4_lessons":2,"6_lessons":3,"8_lessons":4,"special":null}'),
  ('lesson_statuses', '["scheduled","rescheduled","completed_pending_review","cancelled_pending_review","needs_edit","approved","rejected","archived"]'),
  ('payment_methods', '["TNG","bank_transfer","DuitNow","cash","other"]'),
  ('expense_categories', '["coach_salary","pool_fee","advertising","equipment","transport","software","bank_charge","other"]'),
  ('class_types', '["1-1","1-2","1-3","1-4","special"]'),
  ('photo_check_in_defaults', '{"default_required":false}')
on conflict (key) do update set value = excluded.value;
