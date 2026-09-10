-- =============================================
-- BarberPro - Migration: Cash Register (Caja)
-- =============================================
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Add payment_method to service_records
ALTER TABLE service_records
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'CASH'
  CHECK (payment_method IN ('CASH','NEQUI','DAVIPLATA','CARD','TRANSFER','OTHER'));

-- 2. Add payment_method to income
ALTER TABLE income
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'CASH'
  CHECK (payment_method IN ('CASH','NEQUI','DAVIPLATA','CARD','TRANSFER','OTHER'));

-- 3. cash_registers table
CREATE TABLE IF NOT EXISTS cash_registers (
  id              TEXT PRIMARY KEY,
  shop_id         TEXT NOT NULL,
  opened_by       TEXT NOT NULL,
  opened_by_name  TEXT NOT NULL DEFAULT '',
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  opening_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  closed_by       TEXT DEFAULT '',
  closed_by_name  TEXT NOT NULL DEFAULT '',
  closed_at       TIMESTAMPTZ,
  expected_cash   NUMERIC(12,2) NOT NULL DEFAULT 0,
  counted_cash    NUMERIC(12,2) NOT NULL DEFAULT 0,
  difference      NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_note    TEXT NOT NULL DEFAULT '',
  closing_reason  TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','CLOSED')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: only one OPEN cash register per shop
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_registers_open
  ON cash_registers (shop_id)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_cash_registers_shop ON cash_registers (shop_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers (status);

-- 4. cash_movements table
CREATE TABLE IF NOT EXISTS cash_movements (
  id                TEXT PRIMARY KEY,
  cash_register_id  TEXT NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  shop_id           TEXT NOT NULL,
  type              TEXT NOT NULL
    CHECK (type IN ('INCOME','EXPENSE','WITHDRAWAL','ADJUSTMENT')),
  category          TEXT NOT NULL DEFAULT 'OTHER_INCOME'
    CHECK (category IN (
      'SERVICE','PRODUCT','TIP','OTHER_INCOME',
      'SUPPLIES','RENT','UTILITIES','SALARIES','OTHER_EXPENSE',
      'WITHDRAWAL','ADJUSTMENT'
    )),
  amount            NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_method    TEXT NOT NULL DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH','NEQUI','DAVIPLATA','CARD','TRANSFER','OTHER')),
  description       TEXT NOT NULL DEFAULT '',
  reference_type    TEXT NOT NULL DEFAULT '',
  reference_id      TEXT NOT NULL DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT '',
  created_by_name   TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON cash_movements (cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_shop ON cash_movements (shop_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements (type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_reference ON cash_movements (reference_type, reference_id);

-- 5. Idempotency: prevent duplicate movements for same service/income record
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_movements_service_unique
  ON cash_movements (cash_register_id, reference_type, reference_id)
  WHERE reference_type IN ('SERVICE_RECORD','INCOME');

-- 6. RLS
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for cash_registers
CREATE POLICY cash_registers_select ON cash_registers
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY cash_registers_insert ON cash_registers
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY cash_registers_update ON cash_registers
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY cash_registers_delete ON cash_registers
  FOR DELETE USING (
    public.user_role() = 'supersistema'
  );

-- 8. RLS policies for cash_movements
CREATE POLICY cash_movements_select ON cash_movements
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY cash_movements_insert ON cash_movements
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY cash_movements_update ON cash_movements
  FOR UPDATE USING (
    public.user_role() = 'supersistema'
  );

CREATE POLICY cash_movements_delete ON cash_movements
  FOR DELETE USING (
    public.user_role() = 'supersistema'
  );

-- 9. Function: calculate expected cash for a register
CREATE OR REPLACE FUNCTION calculate_expected_cash(p_register_id TEXT)
RETURNS NUMERIC AS $$
  SELECT COALESCE(opening_amount, 0)
    + COALESCE((
      SELECT SUM(amount) FROM cash_movements
      WHERE cash_register_id = p_register_id
        AND type = 'INCOME'
        AND payment_method = 'CASH'
    ), 0)
    - COALESCE((
      SELECT SUM(amount) FROM cash_movements
      WHERE cash_register_id = p_register_id
        AND type = 'EXPENSE'
        AND payment_method = 'CASH'
    ), 0)
    - COALESCE((
      SELECT SUM(amount) FROM cash_movements
      WHERE cash_register_id = p_register_id
        AND type = 'WITHDRAWAL'
        AND payment_method = 'CASH'
    ), 0)
    + COALESCE((
      SELECT SUM(amount) FROM cash_movements
      WHERE cash_register_id = p_register_id
        AND type = 'ADJUSTMENT'
        AND payment_method = 'CASH'
    ), 0)
  FROM cash_registers WHERE id = p_register_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;
