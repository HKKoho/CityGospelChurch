-- Migration 005: 1cm venue application form

create table venue_applications (
  id uuid primary key default uuid_generate_v4(),

  -- Applicant
  organization       text not null check (char_length(organization) > 0),
  contact_person     text not null,
  contact_title      text not null check (contact_title in ('先生', '女士')),
  mobile             text not null,
  email              text not null,

  -- Venue
  venue_type         text not null check (venue_type in ('全場', '禮堂', '草地', '一般房間')),
  room_count         integer check (room_count is null or (room_count >= 1 and room_count <= 10)),

  -- Sessions: [{date, start_time, end_time}]  e.g. [{date:"2026-05-01", start:"09:00", end:"12:00"}]
  sessions           jsonb not null,

  -- Activity
  activity_nature    text not null check (activity_nature in ('福音性聚會', '課程、研討會、教育性聚會', '文娛康樂')),
  activity_mode      text not null check (activity_mode in ('公開聚會', '會內聚會', '收費活動')),
  activity_fee       numeric(10,2),
  target_audience    text[] not null,
  attendance_range   text not null check (attendance_range in ('20 人或以下', '21–50 人', '51–100 人', '101–200 人', '200 人以上')),

  -- Description
  description        text not null,

  -- On-site rep
  rep_name           text not null,
  rep_title          text not null check (rep_title in ('先生', '女士')),

  -- Admin
  status             text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes        text,

  created_at         timestamptz not null default now()
);

create index idx_venue_applications_status on venue_applications(status);
create index idx_venue_applications_created on venue_applications(created_at);

-- ============================================================
-- RLS
-- ============================================================

alter table venue_applications enable row level security;

-- Anyone (including unauthenticated visitors) can submit an application
create policy "venue_applications_insert" on venue_applications
  for insert to anon, authenticated with check (true);

-- Only admins can read and manage applications
create policy "venue_applications_select" on venue_applications
  for select to authenticated using (is_admin());

create policy "venue_applications_update" on venue_applications
  for update to authenticated using (is_admin());

create policy "venue_applications_delete" on venue_applications
  for delete to authenticated using (is_admin());

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table venue_applications;
