-- =============================================
-- BarberPro - Migration: Client portal auth
-- =============================================

-- 1. Add auth fields to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pin_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- 2. Unique phone per shop (skip empty phones)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_shop
  ON clients (shop_id, phone) WHERE phone != '';
