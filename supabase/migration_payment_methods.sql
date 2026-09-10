-- =============================================
-- MÉTODOS DE PAGO POR BARBERSHOP + TABLA DE PAGOS
-- Ejecutar solo si las tablas no existen aún
-- =============================================

-- 1. Métodos de pago configurables por barbería
CREATE TABLE IF NOT EXISTS shop_payment_methods (
  id            TEXT PRIMARY KEY,
  shop_id       TEXT NOT NULL REFERENCES shops(shop_id) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  label         TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  config        JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, key)
);

CREATE INDEX IF NOT EXISTS idx_shop_payment_methods_shop ON shop_payment_methods(shop_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shop_payment_methods_select' AND tablename = 'shop_payment_methods') THEN
    CREATE POLICY shop_payment_methods_select ON shop_payment_methods FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shop_payment_methods_insert' AND tablename = 'shop_payment_methods') THEN
    CREATE POLICY shop_payment_methods_insert ON shop_payment_methods FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shop_payment_methods_update' AND tablename = 'shop_payment_methods') THEN
    CREATE POLICY shop_payment_methods_update ON shop_payment_methods FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shop_payment_methods_delete' AND tablename = 'shop_payment_methods') THEN
    CREATE POLICY shop_payment_methods_delete ON shop_payment_methods FOR DELETE USING (true);
  END IF;
END $$;

ALTER TABLE shop_payment_methods ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE shop_payment_methods IS 'Métodos de pago configurables por cada barbería';

-- 2. Tabla de pagos (soporta pagos divididos)
CREATE TABLE IF NOT EXISTS payments (
  id                TEXT PRIMARY KEY,
  shop_id           TEXT NOT NULL REFERENCES shops(shop_id) ON DELETE CASCADE,
  reference_type    TEXT NOT NULL,
  reference_id      TEXT NOT NULL,
  amount            NUMERIC NOT NULL CHECK (amount > 0),
  payment_method    TEXT NOT NULL,
  description       TEXT DEFAULT '',
  created_by        TEXT DEFAULT '',
  created_by_name   TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_shop ON payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_select' AND tablename = 'payments') THEN
    CREATE POLICY payments_select ON payments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_insert' AND tablename = 'payments') THEN
    CREATE POLICY payments_insert ON payments FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_update' AND tablename = 'payments') THEN
    CREATE POLICY payments_update ON payments FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'payments_delete' AND tablename = 'payments') THEN
    CREATE POLICY payments_delete ON payments FOR DELETE USING (true);
  END IF;
END $$;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE payments IS 'Pagos registrados. Soporta pagos divididos (múltiples registros por misma referencia)';

-- 3. Seed: métodos de pago por defecto para shops existentes
INSERT INTO shop_payment_methods (id, shop_id, key, label, active, sort_order)
SELECT 'spm_' || s.shop_id || '_CASH', s.shop_id, 'CASH', 'Efectivo', true, 1
FROM shops s ON CONFLICT (shop_id, key) DO NOTHING;

INSERT INTO shop_payment_methods (id, shop_id, key, label, active, sort_order)
SELECT 'spm_' || s.shop_id || '_NEQUI', s.shop_id, 'NEQUI', 'Nequi', true, 2
FROM shops s ON CONFLICT (shop_id, key) DO NOTHING;

INSERT INTO shop_payment_methods (id, shop_id, key, label, active, sort_order)
SELECT 'spm_' || s.shop_id || '_DAVIPLATA', s.shop_id, 'DAVIPLATA', 'Daviplata', true, 3
FROM shops s ON CONFLICT (shop_id, key) DO NOTHING;

INSERT INTO shop_payment_methods (id, shop_id, key, label, active, sort_order)
SELECT 'spm_' || s.shop_id || '_CARD', s.shop_id, 'CARD', 'Tarjeta', true, 4
FROM shops s ON CONFLICT (shop_id, key) DO NOTHING;

INSERT INTO shop_payment_methods (id, shop_id, key, label, active, sort_order)
SELECT 'spm_' || s.shop_id || '_TRANSFER', s.shop_id, 'TRANSFER', 'Transferencia', true, 5
FROM shops s ON CONFLICT (shop_id, key) DO NOTHING;

INSERT INTO shop_payment_methods (id, shop_id, key, label, active, sort_order)
SELECT 'spm_' || s.shop_id || '_OTHER', s.shop_id, 'OTHER', 'Otro', false, 6
FROM shops s ON CONFLICT (shop_id, key) DO NOTHING;
