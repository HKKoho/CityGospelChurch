-- Migration 003: Fix kiosk check-in — nullable user_id, correct RPC, updated RLS

-- ============================================================
-- ATTENDANCE: make user_id nullable for kiosk check-ins
-- ============================================================

alter table attendance
  alter column user_id drop not null;

-- Extra index for kiosk lookups by last_four
create index if not exists idx_attendance_last_four on attendance(last_four_digits);

-- ============================================================
-- KIOSK CHECK-IN RPC (replace the previous broken version)
-- Changes from 002:
--   - user_id is null (kiosk has no auth context)
--   - duplicate check: same last_four + session = reject
--   - date taken from the session row, not current_date
--   - security definer + search_path lock
-- ============================================================

create or replace function kiosk_checkin(
  p_session_id uuid,
  p_last_four   text,
  p_name        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Session must exist and be active
  if not exists (
    select 1 from sessions
    where id = p_session_id and is_active = true
  ) then
    raise exception 'Session is not active';
  end if;

  -- Prevent duplicate check-ins
  if exists (
    select 1 from attendance
    where session_id = p_session_id
      and last_four_digits = p_last_four
  ) then
    raise exception 'Already checked in for this session';
  end if;

  insert into attendance (
    date,
    user_id,
    user_name,
    last_four_digits,
    status,
    session_id
  ) values (
    (select date from sessions where id = p_session_id),
    null,
    p_name,
    p_last_four,
    'present',
    p_session_id
  );
end;
$$;

-- ============================================================
-- ATTENDANCE RLS: allow null user_id rows (kiosk records)
-- ============================================================

drop policy if exists "attendance_insert" on attendance;
create policy "attendance_insert" on attendance for insert to authenticated
  with check (
    is_admin()
    or user_id = auth.uid()
    or user_id is null  -- kiosk inserts via kiosk_checkin() RPC
  );

drop policy if exists "attendance_select" on attendance;
create policy "attendance_select" on attendance for select to authenticated
  using (
    is_admin()
    or user_id = auth.uid()
    or user_id is null  -- kiosk records visible to all authenticated users
  );
