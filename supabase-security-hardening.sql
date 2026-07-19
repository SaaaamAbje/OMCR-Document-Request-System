-- ════════════════════════════════════════════════
-- OMCR — Phase 1 Security Hardening
-- Rate limiting via Postgres function + private photo bucket
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════

-- ── SECTION A: PRIVATE PHOTO BUCKET ──────────────────────────────────────
-- Remove the public direct-URL access policy for verification photos.
-- Photos are now accessed ONLY via time-limited signed URLs generated
-- by authenticated staff sessions. Anon users can still upload (required
-- for form submission) but can no longer read photo objects directly.

drop policy if exists "Direct URL access to verification photos" on storage.objects;
drop policy if exists "Anyone can view verification photos" on storage.objects;

-- Keep upload permission for anon (portal needs to upload on submit)
-- Keep authenticated staff view (now via signed URLs, but RLS must allow it)
-- The createSignedUrl() call in admin uses the service role internally;
-- the resulting signed URL is a time-limited token that bypasses RLS
-- for that specific object for the duration specified.

-- Optionally make the bucket non-public via dashboard:
-- Storage > verification-photos > Edit > uncheck "Public bucket"
-- This prevents direct object URL access entirely.

-- ── SECTION B: RATE LIMITING ──────────────────────────────────────────────

-- 1. Create a rate limit tracking table
create table if not exists rate_limits (
  key        text primary key,
  count      int not null default 1,
  window_start timestamptz not null default now()
);

alter table rate_limits enable row level security;

-- Only service role can read/write rate_limits (Edge Functions use service key)
-- Anon and authenticated users have no direct access
create policy "No public access to rate limits"
  on rate_limits for all
  to anon, authenticated
  using (false);

-- 2. Function: check and increment rate limit
-- Returns true if the request is allowed, false if rate limited
-- key: identifier (e.g. IP address or fingerprint)
-- max_requests: maximum allowed in the window
-- window_seconds: rolling window duration
create or replace function check_rate_limit(
  p_key text,
  p_max_requests int default 5,
  p_window_seconds int default 300  -- 5 minutes
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
  v_window_start timestamptz;
  v_now timestamptz := now();
begin
  select count, window_start
  into v_count, v_window_start
  from rate_limits
  where key = p_key;

  if not found then
    -- First request from this key
    insert into rate_limits (key, count, window_start)
    values (p_key, 1, v_now)
    on conflict (key) do update
    set count = rate_limits.count + 1;
    return true;
  end if;

  -- Check if window has expired
  if v_now - v_window_start > (p_window_seconds || ' seconds')::interval then
    -- Reset window
    update rate_limits
    set count = 1, window_start = v_now
    where key = p_key;
    return true;
  end if;

  -- Within window — check count
  if v_count >= p_max_requests then
    return false;
  end if;

  -- Increment count
  update rate_limits
  set count = count + 1
  where key = p_key;
  return true;
end;
$$;

-- 3. Signed URL helper: generate a short-lived signed URL for a storage object
-- This is used by the admin dashboard to view verification photos
-- securely without exposing permanent public URLs
create or replace function get_signed_photo_url(
  p_path text,
  p_expires_in int default 300  -- 5 minutes
)
returns text
language plpgsql
security definer
as $$
begin
  -- Supabase storage signed URLs are generated via the JS client
  -- using sb.storage.from(bucket).createSignedUrl(path, expiresIn)
  -- This function exists as a placeholder for documentation purposes.
  -- The actual signed URL generation is handled in the application layer.
  return p_path;
end;
$$;
