-- TY Swim Academy OS pre-real-use safety migration
-- Run this on an existing Supabase project that already has the OS schema.

alter type lesson_status add value if not exists 'void';

alter table public.students
  add column if not exists photo_consent_status text not null default 'unknown',
  add column if not exists photo_consent_note text,
  add column if not exists photo_consent_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_photo_consent_status_check'
  ) then
    alter table public.students
      add constraint students_photo_consent_status_check
      check (photo_consent_status in ('unknown', 'internal_only', 'marketing_approved', 'not_allowed'));
  end if;
end $$;

alter table public.lesson_photos
  add column if not exists usage text not null default 'internal';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lesson_photos_usage_check'
  ) then
    alter table public.lesson_photos
      add constraint lesson_photos_usage_check
      check (usage in ('internal', 'marketing_candidate', 'marketing_approved'));
  end if;
end $$;

create or replace function public.enforce_lesson_photo_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.usage in ('marketing_candidate', 'marketing_approved') then
    if exists (
      select 1
      from public.lessons l
      join public.class_students cs on cs.class_id = l.class_id and cs.active is not false
      join public.students s on s.id = cs.student_id
      where l.id = new.lesson_id
        and coalesce(s.photo_consent_status, 'unknown') <> 'marketing_approved'
    ) then
      raise exception 'Marketing photo usage requires marketing-approved consent for every student in the lesson';
    end if;
  end if;

  if not public.is_admin() and new.usage <> 'internal' then
    raise exception 'Coach uploads must stay internal';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_lesson_photo_usage_trigger on public.lesson_photos;
create trigger enforce_lesson_photo_usage_trigger
before insert or update on public.lesson_photos
for each row execute function public.enforce_lesson_photo_usage();

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

  if v_lesson.status = 'void' then
    raise exception 'Voided lessons cannot be approved';
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

create or replace function public.reverse_approved_lesson(p_lesson_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson public.lessons%rowtype;
  v_payroll public.payroll_items%rowtype;
  v_period_status text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_has_payroll boolean := false;
begin
  if not public.is_admin() then
    raise exception 'Only Admin can reverse approved lessons';
  end if;

  if v_reason is null then
    raise exception 'A reversal reason is required';
  end if;

  select * into v_lesson from public.lessons where id = p_lesson_id for update;
  if not found then
    raise exception 'Lesson not found';
  end if;

  if v_lesson.status <> 'approved' then
    raise exception 'Only approved lessons can be reversed';
  end if;

  select * into v_payroll from public.payroll_items where lesson_id = p_lesson_id for update;
  if found then
    v_has_payroll := true;
    select status into v_period_status from public.payroll_periods where id = v_payroll.payroll_period_id;
    if v_payroll.status = 'paid' or v_period_status = 'paid' then
      raise exception 'Cannot reverse automatically because payroll has already been paid. Please create an adjustment manually.';
    end if;
  end if;

  if v_lesson.approved_package_applied and v_lesson.package_id is not null then
    update public.packages
    set used_lessons = greatest(used_lessons - 1, 0),
        remaining_lessons = remaining_lessons + 1,
        status = case when status = 'completed' then 'active' else status end
    where id = v_lesson.package_id;
  end if;

  if v_has_payroll then
    update public.payroll_items
    set status = 'void',
        override_reason = concat_ws(' | ', nullif(override_reason, ''), 'Voided by lesson reversal: ' || v_reason)
    where id = v_payroll.id;

    if v_payroll.payroll_period_id is not null then
      update public.payroll_periods pp
      set total_lessons = (select count(*) from public.payroll_items where payroll_period_id = v_payroll.payroll_period_id and status <> 'void'),
          total_amount = (select coalesce(sum(pay_amount), 0) from public.payroll_items where payroll_period_id = v_payroll.payroll_period_id and status <> 'void')
      where pp.id = v_payroll.payroll_period_id;
    end if;
  end if;

  update public.lessons
  set status = 'void',
      approved_package_applied = false,
      admin_notes = concat_ws(E'\n', nullif(admin_notes, ''), 'Approval reversed: ' || v_reason),
      admin_reviewed_at = now(),
      admin_reviewed_by = auth.uid(),
      updated_by = auth.uid()
  where id = p_lesson_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
  values (
    auth.uid(),
    'reverse_approval',
    'lessons',
    p_lesson_id,
    to_jsonb(v_lesson),
    jsonb_build_object('reason', v_reason, 'restored_package', v_lesson.approved_package_applied, 'voided_payroll_item', v_has_payroll)
  );
end;
$$;

drop policy if exists coach_insert_own_photos on public.lesson_photos;
create policy coach_insert_own_photos on public.lesson_photos for insert with check (
  public.is_assigned_lesson(lesson_id)
  and exists (select 1 from public.lessons l where l.id = public.lesson_photos.lesson_id and l.status <> 'approved')
  and usage = 'internal'
);

drop policy if exists admin_insert_audit_logs on public.audit_logs;
create policy admin_insert_audit_logs on public.audit_logs for insert with check (public.is_admin());

update public.settings
set value = '["scheduled","rescheduled","completed_pending_review","cancelled_pending_review","needs_edit","approved","rejected","archived","void"]'::jsonb,
    updated_at = now()
where key = 'lesson_statuses';
