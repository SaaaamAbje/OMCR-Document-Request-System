-- ════════════════════════════════════════════════
-- OMCR — Add language preference column
-- Run this in Supabase SQL Editor
-- Needed so status-update emails (triggered from admin) know whether
-- to send in English or Filipino, matching what the requestor used.
-- ════════════════════════════════════════════════

alter table requests add column if not exists lang text default 'en';
