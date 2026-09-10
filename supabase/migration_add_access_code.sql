-- =============================================
-- BarberPro - Migration: add access_code to users
-- =============================================
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- =============================================

-- Add access_code column for barber login
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_code text unique;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_access_code ON users (access_code);

-- Update the existing admin user (optional, for reference)
-- UPDATE users SET access_code = 'admin' WHERE email = 'admin@barberia.com';
