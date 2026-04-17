-- Migration 006: Add pastoral and officer admin roles

-- ============================================================
-- EXTEND ENUM
-- ============================================================

alter type user_role add value if not exists 'pastoral';
alter type user_role add value if not exists 'officer';

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Church-side staff: super admin or pastoral care
create or replace function is_church_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from users
    where uid = auth.uid()
    and role in ('admin', 'pastoral')
  )
  or (
    auth.jwt() ->> 'email' = 'phish.econ@gmail.com'
    and (auth.jwt() ->> 'email_verified')::boolean = true
  );
$$;

-- 1cm-side staff: super admin or admin officer
create or replace function is_1cm_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from users
    where uid = auth.uid()
    and role in ('admin', 'officer')
  )
  or (
    auth.jwt() ->> 'email' = 'phish.econ@gmail.com'
    and (auth.jwt() ->> 'email_verified')::boolean = true
  );
$$;

-- ============================================================
-- UPDATE RLS — ATTENDANCE (pastoral can read/manage)
-- ============================================================

drop policy if exists "attendance_select" on attendance;
create policy "attendance_select" on attendance for select to authenticated
  using (is_church_admin() or user_id = auth.uid() or user_id is null);

drop policy if exists "attendance_update" on attendance;
create policy "attendance_update" on attendance for update to authenticated
  using (is_church_admin());

drop policy if exists "attendance_delete" on attendance;
create policy "attendance_delete" on attendance for delete to authenticated
  using (is_church_admin());

-- ============================================================
-- UPDATE RLS — WORKSHEET (pastoral can manage)
-- ============================================================

drop policy if exists "worksheet_insert" on worksheet;
create policy "worksheet_insert" on worksheet for insert to authenticated
  with check (is_church_admin());

drop policy if exists "worksheet_update" on worksheet;
create policy "worksheet_update" on worksheet for update to authenticated
  using (is_church_admin());

drop policy if exists "worksheet_delete" on worksheet;
create policy "worksheet_delete" on worksheet for delete to authenticated
  using (is_church_admin());

-- ============================================================
-- UPDATE RLS — SESSIONS (pastoral can manage)
-- ============================================================

drop policy if exists "sessions_insert" on sessions;
create policy "sessions_insert" on sessions for insert to authenticated
  with check (is_church_admin());

drop policy if exists "sessions_update" on sessions;
create policy "sessions_update" on sessions for update to authenticated
  using (is_church_admin());

drop policy if exists "sessions_delete" on sessions;
create policy "sessions_delete" on sessions for delete to authenticated
  using (is_church_admin());

-- ============================================================
-- UPDATE RLS — MEDIA (pastoral can manage)
-- ============================================================

drop policy if exists "media_insert" on media;
create policy "media_insert" on media for insert to authenticated
  with check (is_church_admin());

drop policy if exists "media_update" on media;
create policy "media_update" on media for update to authenticated
  using (is_church_admin());

drop policy if exists "media_delete" on media;
create policy "media_delete" on media for delete to authenticated
  using (is_church_admin());

-- ============================================================
-- UPDATE RLS — VENUE APPLICATIONS (officer can read/manage)
-- ============================================================

drop policy if exists "venue_applications_select" on venue_applications;
create policy "venue_applications_select" on venue_applications for select to authenticated
  using (is_1cm_admin());

drop policy if exists "venue_applications_update" on venue_applications;
create policy "venue_applications_update" on venue_applications for update to authenticated
  using (is_1cm_admin());

drop policy if exists "venue_applications_delete" on venue_applications;
create policy "venue_applications_delete" on venue_applications for delete to authenticated
  using (is_1cm_admin());

-- ============================================================
-- UPDATE RLS — ROOMS (officer can manage)
-- ============================================================

drop policy if exists "rooms_insert" on rooms;
create policy "rooms_insert" on rooms for insert to authenticated
  with check (is_1cm_admin());

drop policy if exists "rooms_update" on rooms;
create policy "rooms_update" on rooms for update to authenticated
  using (is_1cm_admin());

drop policy if exists "rooms_delete" on rooms;
create policy "rooms_delete" on rooms for delete to authenticated
  using (is_1cm_admin());

-- ============================================================
-- UPDATE RLS — BOOKINGS (officer can manage)
-- ============================================================

drop policy if exists "bookings_select" on bookings;
create policy "bookings_select" on bookings for select to authenticated
  using (is_1cm_admin() or user_id = auth.uid());

drop policy if exists "bookings_update" on bookings;
create policy "bookings_update" on bookings for update to authenticated
  using (is_1cm_admin() or user_id = auth.uid());

drop policy if exists "bookings_delete" on bookings;
create policy "bookings_delete" on bookings for delete to authenticated
  using (is_1cm_admin() or (user_id = auth.uid() and status = 'pending'));

-- ============================================================
-- UPDATE RLS — USERS (pastoral can view; only admin can change roles)
-- ============================================================

drop policy if exists "users_select" on users;
create policy "users_select" on users for select to authenticated using (true);

drop policy if exists "users_update" on users;
create policy "users_update" on users for update to authenticated
  using (is_admin() or uid = auth.uid())
  with check (is_admin() or (uid = auth.uid() and role = (select role from users where uid = auth.uid())));
