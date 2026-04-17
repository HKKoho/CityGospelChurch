-- Migration 004: Church portal simple authentication

-- pgcrypto for bcrypt password hashing
create extension if not exists pgcrypto;

-- ============================================================
-- CHURCH AUTH TABLE
-- Stores hashed passwords keyed by last_four_digits.
-- No direct read/write via RLS — all access through RPCs.
-- ============================================================

create table if not exists church_auth (
  last_four_digits text primary key check (char_length(last_four_digits) = 4),
  password_hash    text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- No direct access — RPCs are the only path
alter table church_auth enable row level security;

-- ============================================================
-- church_signup
-- Upserts the password hash for a given last_four_digits.
-- Handles both new registration and forgot-password (same flow).
-- Callable by anon (no Supabase session required).
-- ============================================================

create or replace function church_signup(
  p_last_four text,
  p_password  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Validate inputs
  if char_length(p_last_four) <> 4 or p_last_four !~ '^\d{4}$' then
    raise exception 'last_four_digits must be exactly 4 numeric digits';
  end if;

  if char_length(p_password) <> 8 or p_password !~ '^[A-Za-z0-9]{8}$' then
    raise exception 'Password must be exactly 8 alphanumeric characters (A-Z, a-z, 0-9)';
  end if;

  insert into church_auth (last_four_digits, password_hash, updated_at)
  values (p_last_four, crypt(p_password, gen_salt('bf')), now())
  on conflict (last_four_digits) do update
    set password_hash = excluded.password_hash,
        updated_at    = now();
end;
$$;

-- ============================================================
-- church_signin
-- Verifies credentials and returns the member's name from worksheet.
-- Returns empty string if auth succeeds but no worksheet entry found.
-- Raises exception on invalid credentials.
-- ============================================================

create or replace function church_signin(
  p_last_four text,
  p_password  text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_name text;
begin
  -- Look up stored hash
  select password_hash into v_hash
  from church_auth
  where last_four_digits = p_last_four;

  if v_hash is null then
    raise exception 'Invalid credentials';
  end if;

  -- Verify password
  if crypt(p_password, v_hash) <> v_hash then
    raise exception 'Invalid credentials';
  end if;

  -- Lookup name from worksheet (optional — may not exist)
  select name into v_name
  from worksheet
  where last_four_digits = p_last_four
  limit 1;

  return coalesce(v_name, '');
end;
$$;

-- ============================================================
-- Grant execute to anon role (church portal has no Supabase session)
-- ============================================================

grant execute on function church_signup(text, text) to anon;
grant execute on function church_signin(text, text) to anon;
