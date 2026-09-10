-- =============================================
-- BarberPro - Migration: service_requests
-- =============================================
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================

-- New table for service requests (walk-ins)
CREATE TABLE IF NOT EXISTS service_requests (
  request_id    text primary key,
  shop_id       text not null default 'shop_1',
  barber_id     text not null references barbers(barber_id) on delete cascade,
  client_name   text not null,
  service_id    text not null references services(service_id) on delete cascade,
  service_name  text not null,
  price_charged numeric(10,2) not null default 0,
  photo_url     text not null default '',
  notes         text not null default '',
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text not null default '',
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_shop ON service_requests (shop_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_barber ON service_requests (barber_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests (status);

-- Disable RLS (MVP)
ALTER TABLE service_requests DISABLE ROW LEVEL SECURITY;

-- Storage bucket for service photos
-- Run this in: Supabase Dashboard > Storage > New bucket
-- Bucket name: service-photos
-- Public: yes

-- Comment
COMMENT ON TABLE service_requests IS 'Servicios sin cita previa, pendientes de aprobación del admin';
