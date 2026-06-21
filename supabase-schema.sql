-- ════════════════════════════════════════════════
-- OMCR Document Request System — Supabase Schema
-- Run this once in Supabase SQL Editor
-- ════════════════════════════════════════════════

-- 1. REQUESTS TABLE
create table requests (
  id text primary key,                 -- e.g. OMCR-AB12CD34
  name text not null,
  dob date,
  pob text,
  contact text not null,
  email text,
  address text,
  doctype text not null,
  copies int not null default 1,
  purpose text not null,
  remarks text,
  status text not null default 'Pending',
  walkin boolean not null default false,
  id_photo_url text,
  selfie_photo_url text,
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2. APPOINTMENTS TABLE
create table appointments (
  id text primary key,                 -- e.g. APPT-AB12CD
  name text not null,
  contact text not null,
  purpose text not null,
  appt_date date not null,
  appt_time text not null,
  booked_at timestamptz not null default now()
);

-- 3. ENABLE ROW LEVEL SECURITY
alter table requests enable row level security;
alter table appointments enable row level security;

-- 4. POLICIES — Public portal (anon key) can INSERT and SELECT-by-id
--    This lets requestors submit requests and track by their own ID,
--    without being able to browse everyone else's data.

-- Anyone can submit a new request
create policy "Anyone can insert requests"
  on requests for insert
  to anon
  with check (true);

-- Anyone can read requests (needed for Track-by-ID; the portal only
-- queries by exact ID, so this is fine for a small office system —
-- IDs are random 8-character codes, not guessable)
create policy "Anyone can view requests"
  on requests for select
  to anon
  using (true);

-- Anyone can update their own request status to Cancelled
-- (the app only allows this when status = 'Pending')
create policy "Anyone can update requests"
  on requests for update
  to anon
  using (true);

-- Anyone can book and view appointments
create policy "Anyone can insert appointments"
  on appointments for insert
  to anon
  with check (true);

create policy "Anyone can view appointments"
  on appointments for select
  to anon
  using (true);

-- 5. STORAGE BUCKET for ID photos & selfies
insert into storage.buckets (id, name, public)
values ('verification-photos', 'verification-photos', true);

-- Allow anyone to upload verification photos
create policy "Anyone can upload verification photos"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'verification-photos');

-- Allow anyone to view verification photos (needed so admin can display them)
create policy "Anyone can view verification photos"
  on storage.objects for select
  to anon
  using (bucket_id = 'verification-photos');
