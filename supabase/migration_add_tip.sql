-- =============================================
-- BarberPro - Migration: add tip + client_phone to service_requests
-- =============================================
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS client_phone text not null default '';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS tip numeric(10,2) not null default 0;
