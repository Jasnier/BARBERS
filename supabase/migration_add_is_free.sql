-- =============================================
-- BarberPro - Migration: add is_free to service_requests
-- =============================================
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS is_free boolean not null default false;
