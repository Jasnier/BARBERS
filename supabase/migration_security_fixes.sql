-- =============================================
-- BarberPro - Migration: Security fixes
-- =============================================
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Atomic visit increment function (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_client_visits(p_client_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE clients
  SET total_visits = total_visits + 1,
      last_visit = CURRENT_DATE::TEXT
  WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 2. Unique constraint: prevent double-booking same barber at same time
-- Partial index: only enforces for non-cancelled/no_show appointments
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_barber_time_unique
  ON appointments (barber_id, date, start_time)
  WHERE status NOT IN ('cancelled', 'no_show');

-- 3. Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS products (
  product_id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products (shop_id);

CREATE TABLE IF NOT EXISTS promotions (
  promotion_id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_promotions_shop ON promotions (shop_id);

-- 4. Enable RLS on ALL tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- 5. Helper: get current user's role and shop_id from public.users
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE user_id = auth.uid()::TEXT LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

CREATE OR REPLACE FUNCTION public.user_shop_id()
RETURNS TEXT AS $$
  SELECT shop_id FROM public.users WHERE user_id = auth.uid()::TEXT LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.user_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_shop_id() FROM anon, authenticated;

-- 5. RLS Policies

-- USERS: users can read their own profile; supersistema can do everything
CREATE POLICY users_select_own ON users
  FOR SELECT USING (user_id = auth.uid()::TEXT OR public.user_role() = 'supersistema');

CREATE POLICY users_insert_supersistema ON users
  FOR INSERT WITH CHECK (public.user_role() = 'supersistema');

CREATE POLICY users_update_supersistema ON users
  FOR UPDATE USING (public.user_role() = 'supersistema');

CREATE POLICY users_delete_supersistema ON users
  FOR DELETE USING (public.user_role() = 'supersistema');

-- SHOPS: supersistema full access; others read-only their own
CREATE POLICY shops_select ON shops
  FOR SELECT USING (true);

CREATE POLICY shops_insert_supersistema ON shops
  FOR INSERT WITH CHECK (public.user_role() = 'supersistema');

CREATE POLICY shops_update_supersistema ON shops
  FOR UPDATE USING (public.user_role() = 'supersistema');

CREATE POLICY shops_delete_supersistema ON shops
  FOR DELETE USING (public.user_role() = 'supersistema');

-- BARBERS: admin/barber can see their shop; supersistema sees all
CREATE POLICY barbers_select ON barbers
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY barbers_insert ON barbers
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY barbers_update ON barbers
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY barbers_delete ON barbers
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- CLIENTS: admin can manage their shop; supersistema sees all
CREATE POLICY clients_select ON clients
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY clients_insert ON clients
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY clients_update ON clients
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY clients_delete ON clients
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- SERVICES: same pattern
CREATE POLICY services_select ON services
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY services_insert ON services
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY services_update ON services
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY services_delete ON services
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- APPOINTMENTS
CREATE POLICY appointments_select ON appointments
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY appointments_insert ON appointments
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY appointments_update ON appointments
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY appointments_delete ON appointments
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- SERVICE_RECORDS
CREATE POLICY service_records_select ON service_records
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY service_records_insert ON service_records
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY service_records_update ON service_records
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY service_records_delete ON service_records
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- INCOME
CREATE POLICY income_select ON income
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY income_insert ON income
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY income_update ON income
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY income_delete ON income
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- SCHEDULES
CREATE POLICY schedules_select ON schedules
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY schedules_insert ON schedules
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY schedules_update ON schedules
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY schedules_delete ON schedules
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- SHOP_CONFIG
CREATE POLICY shop_config_select ON shop_config
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY shop_config_insert ON shop_config
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY shop_config_update ON shop_config
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY shop_config_delete ON shop_config
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- PRODUCTS
CREATE POLICY products_select ON products
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY products_insert ON products
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY products_update ON products
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY products_delete ON products
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- PROMOTIONS
CREATE POLICY promotions_select ON promotions
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY promotions_insert ON promotions
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY promotions_update ON promotions
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY promotions_delete ON promotions
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- SERVICE_REQUESTS
CREATE POLICY service_requests_select ON service_requests
  FOR SELECT USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY service_requests_insert ON service_requests
  FOR INSERT WITH CHECK (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY service_requests_update ON service_requests
  FOR UPDATE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

CREATE POLICY service_requests_delete ON service_requests
  FOR DELETE USING (
    shop_id = public.user_shop_id()
    OR public.user_role() = 'supersistema'
  );

-- 6. Storage RLS: configurar desde Supabase Dashboard > Storage > Policies
-- No se puede crear desde SQL editor por permisos del esquema storage
