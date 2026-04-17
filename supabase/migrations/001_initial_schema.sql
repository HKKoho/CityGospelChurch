-- Ecclesia Manager: Initial Schema
-- Supports both hosted Supabase and self-hosted Supabase (Docker)

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type user_role as enum ('admin', 'congregation', 'public');
create type booking_status as enum ('pending', 'approved', 'rejected');
create type media_type as enum ('video', 'audio', 'image');
create type attendance_status as enum ('present', 'absent');

-- ============================================================
-- TABLES
-- ============================================================

-- Users (linked to Supabase Auth)
create table users (
  uid uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) > 0 and char_length(name) < 100),
  email text not null check (email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
  role user_role not null default 'public',
  last_four_digits text check (last_four_digits is null or char_length(last_four_digits) = 4),
  phone text,
  created_at timestamptz not null default now()
);

-- Rooms
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  capacity integer not null,
  description text not null default '',
  image_url text not null default ''
);

-- Bookings
create table bookings (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(uid) on delete cascade,
  user_name text not null,
  room_name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_status not null default 'pending',
  purpose text not null default '',
  created_at timestamptz not null default now()
);

-- Media
create table media (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  type media_type not null,
  url text not null,
  description text not null default '',
  category text not null default '',
  created_at timestamptz not null default now()
);

-- Attendance
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  user_id uuid not null references users(uid) on delete cascade,
  user_name text not null,
  last_four_digits text not null check (char_length(last_four_digits) = 4),
  status attendance_status not null default 'present',
  created_at timestamptz not null default now()
);

-- Worksheet (4-digit code to name mapping for roll call)
create table worksheet (
  id uuid primary key default uuid_generate_v4(),
  last_four_digits text not null check (char_length(last_four_digits) = 4),
  name text not null,
  user_id uuid references users(uid) on delete set null
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_bookings_user_id on bookings(user_id);
create index idx_bookings_room_id on bookings(room_id);
create index idx_attendance_user_id on attendance(user_id);
create index idx_attendance_date on attendance(date);
create index idx_attendance_user_date on attendance(user_id, date);
create index idx_worksheet_last_four on worksheet(last_four_digits);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if the current authenticated user is an admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from users
    where uid = auth.uid()
    and role = 'admin'
  )
  or (
    auth.jwt() ->> 'email' = 'phish.econ@gmail.com'
    and (auth.jwt() ->> 'email_verified')::boolean = true
  );
$$ language sql security definer stable set search_path = public;

-- Prevent non-admins from changing booking status
create or replace function prevent_status_change()
returns trigger as $$
begin
  if not is_admin() and OLD.status is distinct from NEW.status then
    raise exception 'Only admins can change booking status';
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger booking_status_guard
  before update on bookings
  for each row execute function prevent_status_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table users enable row level security;
alter table rooms enable row level security;
alter table media enable row level security;
alter table bookings enable row level security;
alter table attendance enable row level security;
alter table worksheet enable row level security;

-- USERS policies
create policy "users_select" on users for select to authenticated using (true);
create policy "users_insert" on users for insert to authenticated
  with check (uid = auth.uid() and role <> 'admin');
create policy "users_update" on users for update to authenticated
  using (is_admin() or uid = auth.uid())
  with check (is_admin() or (uid = auth.uid() and role = (select role from users where uid = auth.uid())));
create policy "users_delete" on users for delete to authenticated using (is_admin());

-- ROOMS policies (public read, admin write)
create policy "rooms_select" on rooms for select using (true);
create policy "rooms_insert" on rooms for insert to authenticated with check (is_admin());
create policy "rooms_update" on rooms for update to authenticated using (is_admin());
create policy "rooms_delete" on rooms for delete to authenticated using (is_admin());

-- MEDIA policies (public read, admin write)
create policy "media_select" on media for select using (true);
create policy "media_insert" on media for insert to authenticated with check (is_admin());
create policy "media_update" on media for update to authenticated using (is_admin());
create policy "media_delete" on media for delete to authenticated using (is_admin());

-- BOOKINGS policies
create policy "bookings_select" on bookings for select to authenticated
  using (is_admin() or user_id = auth.uid());
create policy "bookings_insert" on bookings for insert to authenticated
  with check (user_id = auth.uid());
create policy "bookings_update" on bookings for update to authenticated
  using (is_admin() or user_id = auth.uid());
create policy "bookings_delete" on bookings for delete to authenticated
  using (is_admin() or (user_id = auth.uid() and status = 'pending'));

-- ATTENDANCE policies
create policy "attendance_select" on attendance for select to authenticated
  using (is_admin() or user_id = auth.uid());
create policy "attendance_insert" on attendance for insert to authenticated
  with check (user_id = auth.uid());
create policy "attendance_update" on attendance for update to authenticated using (is_admin());
create policy "attendance_delete" on attendance for delete to authenticated using (is_admin());

-- WORKSHEET policies
create policy "worksheet_select" on worksheet for select to authenticated using (true);
create policy "worksheet_insert" on worksheet for insert to authenticated with check (is_admin());
create policy "worksheet_update" on worksheet for update to authenticated using (is_admin());
create policy "worksheet_delete" on worksheet for delete to authenticated using (is_admin());

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table media;
alter publication supabase_realtime add table attendance;
alter publication supabase_realtime add table worksheet;
