-- Ecclesia Manager: Sessions table + worksheet department field
-- Adds roll call session management and kiosk support

-- ============================================================
-- SESSIONS TABLE
-- ============================================================
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  date date not null default current_date,
  is_active boolean not null default false,
  created_by uuid references users(uid) on delete set null,
  created_at timestamptz not null default now()
);

-- Only one session can be active at a time
create unique index idx_sessions_one_active on sessions (is_active) where is_active = true;

-- ============================================================
-- WORKSHEET: ADD DEPARTMENT COLUMN
-- ============================================================
alter table worksheet add column if not exists department text;

-- ============================================================
-- ATTENDANCE: ADD SESSION REFERENCE
-- ============================================================
alter table attendance add column if not exists session_id uuid references sessions(id) on delete set null;
create index idx_attendance_session_id on attendance(session_id);

-- ============================================================
-- KIOSK CHECK-IN RPC (bypasses RLS for kiosk mode)
-- ============================================================
create or replace function kiosk_checkin(
  p_session_id uuid,
  p_last_four text,
  p_name text
) returns void as $$
begin
  insert into attendance (date, user_id, user_name, last_four_digits, status, session_id, created_at)
  values (
    current_date,
    auth.uid(),
    p_name,
    p_last_four,
    'present',
    p_session_id,
    now()
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- SESSIONS RLS
-- ============================================================
alter table sessions enable row level security;

-- Anyone authenticated can read sessions (kiosk needs to check active session)
create policy "sessions_select" on sessions for select to authenticated using (true);
create policy "sessions_insert" on sessions for insert to authenticated with check (is_admin());
create policy "sessions_update" on sessions for update to authenticated using (is_admin());
create policy "sessions_delete" on sessions for delete to authenticated using (is_admin());

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table sessions;
