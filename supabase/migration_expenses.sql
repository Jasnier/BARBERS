-- =============================================
-- BarberPro - Migration: Expenses & Withdrawals
-- =============================================
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id          TEXT PRIMARY KEY,
  shop_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'tag',
  color       TEXT NOT NULL DEFAULT 'gray',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_shop ON expense_categories (shop_id);

-- 2. Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id                TEXT PRIMARY KEY,
  shop_id           TEXT NOT NULL,
  cash_register_id  TEXT DEFAULT '',
  category_id       TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method    TEXT NOT NULL DEFAULT 'CASH'
    CHECK (payment_method IN ('CASH','NEQUI','DAVIPLATA','CARD','TRANSFER','OTHER')),
  description       TEXT NOT NULL DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT '',
  created_by_name   TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','CANCELLED')),
  cancelled_by      TEXT DEFAULT '',
  cancelled_by_name TEXT DEFAULT '',
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT DEFAULT '',
  cash_movement_id  TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_expenses_shop ON expenses (shop_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses (status);
CREATE INDEX IF NOT EXISTS idx_expenses_created ON expenses (created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_register ON expenses (cash_register_id);

-- 3. Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id                TEXT PRIMARY KEY,
  shop_id           TEXT NOT NULL,
  cash_register_id  TEXT DEFAULT '',
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason            TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT '',
  created_by_name   TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','CANCELLED')),
  cancelled_by      TEXT DEFAULT '',
  cancelled_by_name TEXT DEFAULT '',
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT DEFAULT '',
  cash_movement_id  TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_shop ON withdrawals (shop_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals (status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawals (created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_register ON withdrawals (cash_register_id);

-- 4. RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies: expense_categories
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expense_categories_select' AND tablename = 'expense_categories') THEN
    CREATE POLICY expense_categories_select ON expense_categories
      FOR SELECT USING (shop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expense_categories_insert' AND tablename = 'expense_categories') THEN
    CREATE POLICY expense_categories_insert ON expense_categories
      FOR INSERT WITH CHECK (shop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expense_categories_update' AND tablename = 'expense_categories') THEN
    CREATE POLICY expense_categories_update ON expense_categories
      FOR UPDATE USING (shop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expense_categories_delete' AND tablename = 'expense_categories') THEN
    CREATE POLICY expense_categories_delete ON expense_categories
      FOR DELETE USING (public.user_role() = 'supersistema');
  END IF;
END $$;

-- 6. RLS policies: expenses
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_select' AND tablename = 'expenses') THEN
    CREATE POLICY expenses_select ON expenses
      FOR SELECT USING (shop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_insert' AND tablename = 'expenses') THEN
    CREATE POLICY expenses_insert ON expenses
      FOR INSERT WITH CHECK (shop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_update' AND tablename = 'expenses') THEN
    CREATE POLICY expenses_update ON expenses
      FOR UPDATE USING (shop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'expenses_delete' AND tablename = 'expenses') THEN
    CREATE POLICY expenses_delete ON expenses
      FOR DELETE USING (public.user_role() = 'supersistema');
  END IF;
END $$;

-- 7. RLS policies: withdrawals
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawals_select' AND tablename = 'withdrawals') THEN
    CREATE POLICY withdrawals_select ON withdrawals
      FOR SELECT USING (shop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawals_insert' AND tablename = 'withdrawals') THEN
    CREATE POLICY withdrawals_insert ON withdrawals
      FOR INSERT WITH CHECK (shop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawals_update' AND tablename = 'withdrawals') THEN
    CREATE POLICY withdrawals_update ON withdrawals
      FOR UPDATE USING (shop_id = public.user_shop_id() OR public.user_role() = 'supersistema');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'withdrawals_delete' AND tablename = 'withdrawals') THEN
    CREATE POLICY withdrawals_delete ON withdrawals
      FOR DELETE USING (public.user_role() = 'supersistema');
  END IF;
END $$;

-- 8. Seed default expense categories per shop (run manually after shop creation, or via adapter)
-- The adapter will handle seeding via upsert on first access.
