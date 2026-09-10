-- =============================================
-- BarberPro - Migration: Add supersistema role + shops table
-- =============================================

-- 1. Actualizar check constraint de roles para incluir supersistema
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'barber', 'supersistema'));

-- 2. Crear tabla shops
CREATE TABLE IF NOT EXISTS shops (
  shop_id             TEXT PRIMARY KEY,
  name                TEXT NOT NULL DEFAULT '',
  address             TEXT NOT NULL DEFAULT '',
  phone               TEXT NOT NULL DEFAULT '',
  email               TEXT NOT NULL DEFAULT '',
  owner_name          TEXT NOT NULL DEFAULT '',
  active              BOOLEAN NOT NULL DEFAULT true,
  blocked             BOOLEAN NOT NULL DEFAULT false,
  block_reason        TEXT NOT NULL DEFAULT '',
  subscription_plan   TEXT NOT NULL DEFAULT 'monthly'
    CHECK (subscription_plan IN ('trial', 'monthly', 'yearly', 'custom')),
  subscription_start  DATE,
  subscription_end    DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Insertar shop_1 existente
INSERT INTO shops (shop_id, name, owner_name, subscription_plan, active)
VALUES ('shop_1', 'BarberPro Demo', 'Administrador', 'monthly', true)
ON CONFLICT (shop_id) DO NOTHING;

-- 4. Insertar usuario supersistema en users
INSERT INTO users (user_id, shop_id, email, name, password_hash, role, active)
VALUES (
  'usr_super_001',
  'global',
  'super@barberpro.com',
  'Super Administrador',
  'supabase_auth',
  'supersistema',
  true
) ON CONFLICT (user_id) DO NOTHING;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_shops_active ON shops (active);
CREATE INDEX IF NOT EXISTS idx_shops_blocked ON shops (blocked);
