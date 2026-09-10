-- =============================================
-- BarberPro - Migration: fix FKs for walk-in services
-- =============================================
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Make appointment_id nullable (walk-ins don't have appointments)
ALTER TABLE service_records
  ALTER COLUMN appointment_id DROP NOT NULL;

-- Drop the FK constraint on appointment_id (it blocks inserts without an appointment)
ALTER TABLE service_records
  DROP CONSTRAINT IF EXISTS service_records_appointment_id_fkey;

-- Re-add FK as nullable (still validates when value is present)
ALTER TABLE service_records
  ADD CONSTRAINT service_records_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL;

-- 2. Fix income.record_id — make it nullable since walk-in income
--    may not map to a specific service_record
ALTER TABLE income
  ALTER COLUMN record_id DROP NOT NULL;

ALTER TABLE income
  DROP CONSTRAINT IF EXISTS income_record_id_fkey;

ALTER TABLE income
  ADD CONSTRAINT income_record_id_fkey
  FOREIGN KEY (record_id) REFERENCES service_records(record_id) ON DELETE SET NULL;
