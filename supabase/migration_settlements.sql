-- =============================================
-- BarberPro - Migration: Settlements & Payments
-- =============================================
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Settlements (Liquidaciones)
CREATE TABLE IF NOT EXISTS settlements (
  id                TEXT PRIMARY KEY,
  barbershop_id     TEXT NOT NULL,
  barber_id         TEXT NOT NULL,
  barber_name       TEXT NOT NULL DEFAULT '',
  period_start      TEXT NOT NULL,
  period_end        TEXT NOT NULL,
  services_total    NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tips_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustments_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  advances_total    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','APPROVED','PARTIALLY_PAID','PAID','CANCELLED')),
  created_by        TEXT NOT NULL DEFAULT '',
  created_by_name   TEXT NOT NULL DEFAULT '',
  approved_by       TEXT DEFAULT '',
  approved_by_name  TEXT DEFAULT '',
  approved_at       TIMESTAMPTZ,
  cancelled_by      TEXT DEFAULT '',
  cancelled_by_name TEXT DEFAULT '',
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlements_shop ON settlements (barbershop_id);
CREATE INDEX IF NOT EXISTS idx_settlements_barber ON settlements (barber_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements (status);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON settlements (period_start, period_end);

-- Prevent duplicate active settlements for same barber + overlapping period
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlements_unique_active
  ON settlements (barbershop_id, barber_id, period_start, period_end)
  WHERE status IN ('DRAFT','APPROVED','PARTIALLY_PAID');

-- 2. Settlement Items (Detalle congelado)
CREATE TABLE IF NOT EXISTS settlement_items (
  id                TEXT PRIMARY KEY,
  settlement_id     TEXT NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  barbershop_id     TEXT NOT NULL,
  income_id         TEXT NOT NULL,
  service_name      TEXT NOT NULL DEFAULT '',
  client_name       TEXT NOT NULL DEFAULT '',
  service_date      TEXT NOT NULL,
  gross_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_rate   NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tip_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement ON settlement_items (settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_income ON settlement_items (income_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_shop ON settlement_items (barbershop_id);

-- Prevent same income record in two settlements
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_items_unique_income
  ON settlement_items (barbershop_id, income_id);

-- 3. Settlement Adjustments (Ajustes manuales)
CREATE TABLE IF NOT EXISTS settlement_adjustments (
  id                TEXT PRIMARY KEY,
  settlement_id     TEXT NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  barbershop_id     TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'OTHER'
    CHECK (type IN ('BONUS','DEDUCTION','ADVANCE','CORRECTION','OTHER')),
  amount            NUMERIC(12,2) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT '',
  created_by_name   TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_adjustments_settlement ON settlement_adjustments (settlement_id);

-- 4. Settlement Payments (Pagos)
CREATE TABLE IF NOT EXISTS settlement_payments (
  id                TEXT PRIMARY KEY,
  settlement_id     TEXT NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  barbershop_id     TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method    TEXT NOT NULL DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH','NEQUI','DAVIPLATA','CARD','TRANSFER','OTHER')),
  paid_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_by           TEXT NOT NULL DEFAULT '',
  paid_by_name      TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  cash_movement_id  TEXT DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','CANCELLED')),
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_payments_settlement ON settlement_payments (settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_payments_shop ON settlement_payments (barbershop_id);

-- 5. RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_payments ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlements_select' AND tablename = 'settlements') THEN
    CREATE POLICY settlements_select ON settlements
      FOR SELECT USING (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlements_insert' AND tablename = 'settlements') THEN
    CREATE POLICY settlements_insert ON settlements
      FOR INSERT WITH CHECK (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlements_update' AND tablename = 'settlements') THEN
    CREATE POLICY settlements_update ON settlements
      FOR UPDATE USING (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlements_delete' AND tablename = 'settlements') THEN
    CREATE POLICY settlements_delete ON settlements
      FOR DELETE USING (public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlement_items_select' AND tablename = 'settlement_items') THEN
    CREATE POLICY settlement_items_select ON settlement_items
      FOR SELECT USING (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlement_items_insert' AND tablename = 'settlement_items') THEN
    CREATE POLICY settlement_items_insert ON settlement_items
      FOR INSERT WITH CHECK (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlement_adjustments_select' AND tablename = 'settlement_adjustments') THEN
    CREATE POLICY settlement_adjustments_select ON settlement_adjustments
      FOR SELECT USING (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlement_adjustments_insert' AND tablename = 'settlement_adjustments') THEN
    CREATE POLICY settlement_adjustments_insert ON settlement_adjustments
      FOR INSERT WITH CHECK (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlement_payments_select' AND tablename = 'settlement_payments') THEN
    CREATE POLICY settlement_payments_select ON settlement_payments
      FOR SELECT USING (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlement_payments_insert' AND tablename = 'settlement_payments') THEN
    CREATE POLICY settlement_payments_insert ON settlement_payments
      FOR INSERT WITH CHECK (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'settlement_payments_update' AND tablename = 'settlement_payments') THEN
    CREATE POLICY settlement_payments_update ON settlement_payments
      FOR UPDATE USING (barbershop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;
