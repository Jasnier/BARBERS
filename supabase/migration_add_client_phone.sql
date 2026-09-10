-- =============================================
-- BarberPro - Migration: add client_phone
-- =============================================
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS client_phone text not null default '';
