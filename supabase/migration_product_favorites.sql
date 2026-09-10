-- =============================================
-- BarberPro - Migration: Product Favorites + Sales Tracking
-- =============================================

-- 1. product_favorites
CREATE TABLE IF NOT EXISTS product_favorites (
  client_id   TEXT NOT NULL,
  product_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, product_id)
);

-- 2. product_sales (para metricas de mas vendido)
CREATE TABLE IF NOT EXISTS product_sales (
  sale_id       TEXT PRIMARY KEY,
  shop_id       TEXT NOT NULL,
  product_id    TEXT NOT NULL,
  client_id     TEXT NOT NULL DEFAULT '',
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  sold_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_sales_product ON product_sales (product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_shop ON product_sales (shop_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_date ON product_sales (sold_at);
