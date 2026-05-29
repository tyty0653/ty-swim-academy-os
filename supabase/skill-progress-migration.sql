-- TY Swim Academy OS skill progress migration
-- Run this on an existing Supabase project that already has supabase/schema.sql applied.

create table if not exists public.student_skill_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  current_level integer not null default 1 check (current_level between 1 and 6),
  level_status text not null default 'not_started' check (level_status in ('not_started', 'learning', 'almost_ready', 'passed')),
  current_focus text,
  last_assessed_at timestamptz,
  assessment_note text,
  suggested_level_up boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_skill_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  level_number integer not null check (level_number between 1 and 6),
  criterion_id text not null,
  status text not null default 'not_started' check (status in ('not_started', 'learning', 'almost', 'passed')),
  note text,
  last_assessed_at timestamptz,
  assessed_by uuid references public.profiles(id) on delete set null default auth.uid(),
  lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, level_number, criterion_id)
);

create table if not exists public.lesson_skill_assessments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  level_number integer not null check (level_number between 1 and 6),
  criterion_id text not null,
  status text not null check (status in ('not_started', 'learning', 'almost', 'passed')),
  note text,
  next_focus text,
  suggest_level_up boolean not null default false,
  assessed_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.is_assigned_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_students cs
    join public.classes c on c.id = cs.class_id
    where cs.student_id = p_student_id
      and cs.active is not false
      and c.assigned_coach_id = public.current_coach_id()
  );
$$;

drop trigger if exists student_skill_profiles_updated on public.student_skill_profiles;
create trigger student_skill_profiles_updated before update on public.student_skill_profiles for each row execute function public.set_updated_at();

drop trigger if exists student_skill_progress_updated on public.student_skill_progress;
create trigger student_skill_progress_updated before update on public.student_skill_progress for each row execute function public.set_updated_at();

alter table public.student_skill_profiles enable row level security;
alter table public.student_skill_progress enable row level security;
alter table public.lesson_skill_assessments enable row level security;

drop policy if exists admin_all_student_skill_profiles on public.student_skill_profiles;
create policy admin_all_student_skill_profiles on public.student_skill_profiles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coach_read_assigned_skill_profiles on public.student_skill_profiles;
create policy coach_read_assigned_skill_profiles on public.student_skill_profiles for select using (public.is_assigned_student(student_id));
drop policy if exists coach_insert_assigned_skill_profiles on public.student_skill_profiles;
create policy coach_insert_assigned_skill_profiles on public.student_skill_profiles for insert with check (public.is_assigned_student(student_id));
drop policy if exists coach_update_assigned_skill_profiles on public.student_skill_profiles;
create policy coach_update_assigned_skill_profiles on public.student_skill_profiles for update using (public.is_assigned_student(student_id)) with check (public.is_assigned_student(student_id));

drop policy if exists admin_all_student_skill_progress on public.student_skill_progress;
create policy admin_all_student_skill_progress on public.student_skill_progress for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coach_read_assigned_skill_progress on public.student_skill_progress;
create policy coach_read_assigned_skill_progress on public.student_skill_progress for select using (public.is_assigned_student(student_id));
drop policy if exists coach_insert_assigned_skill_progress on public.student_skill_progress;
create policy coach_insert_assigned_skill_progress on public.student_skill_progress for insert with check (public.is_assigned_student(student_id));
drop policy if exists coach_update_assigned_skill_progress on public.student_skill_progress;
create policy coach_update_assigned_skill_progress on public.student_skill_progress for update using (public.is_assigned_student(student_id)) with check (public.is_assigned_student(student_id));

drop policy if exists admin_all_lesson_skill_assessments on public.lesson_skill_assessments;
create policy admin_all_lesson_skill_assessments on public.lesson_skill_assessments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists coach_read_own_lesson_skill_assessments on public.lesson_skill_assessments;
create policy coach_read_own_lesson_skill_assessments on public.lesson_skill_assessments for select using (public.is_assigned_lesson(lesson_id) and public.is_assigned_student(student_id));
drop policy if exists coach_insert_own_lesson_skill_assessments on public.lesson_skill_assessments;
create policy coach_insert_own_lesson_skill_assessments on public.lesson_skill_assessments for insert with check (public.is_assigned_lesson(lesson_id) and public.is_assigned_student(student_id));
