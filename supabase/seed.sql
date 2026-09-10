-- =============================================
-- BarberPro - Seed Data (Post schema execution)
-- =============================================
-- IMPORTANTE: Ejecuta esto DESPUES de schema.sql
-- y DESPUES de crear el usuario en Supabase Auth
-- =============================================

-- =============================================
-- 1. Crear usuario admin en Supabase Auth
-- =============================================
-- Ve a: Authentication > Users > Invite user
-- Email: admin@barberia.com
-- Password: admin123
-- 
-- O usa el SQL Editor con:
-- select auth.admin_create_user(
--   'admin@barberia.com',
--   'admin123',
--   '{"email_confirm": true}'::jsonb
-- );

-- =============================================
-- 2. Datos de ejemplo (opcional)
-- =============================================

-- Barberia por defecto
insert into shop_config (id, shop_id, key, value) values
  ('cfg_001', 'shop_1', 'shop_name', 'BarberPro Demo'),
  ('cfg_002', 'shop_1', 'timezone', 'America/Mexico_City'),
  ('cfg_003', 'shop_1', 'currency', 'MXN'),
  ('cfg_004', 'shop_1', 'open_time', '09:00'),
  ('cfg_005', 'shop_1', 'close_time', '19:00'),
  ('cfg_006', 'shop_1', 'commission_type', 'service')
on conflict (id) do nothing;

-- Barberos de ejemplo
insert into barbers (barber_id, shop_id, user_id, name, phone, specialty, commission_rate, commission_type, active) values
  ('brb_001', 'shop_1', '', 'Carlos Martinez', '+52 55 1234 5678', 'Corte clasico', 40.00, 'service', true),
  ('brb_002', 'shop_1', '', 'Miguel Rodriguez', '+52 55 8765 4321', 'Barba y degollado', 35.00, 'service', true)
on conflict (barber_id) do nothing;

-- Servicios de ejemplo
insert into services (service_id, shop_id, name, description, price, duration_min, category, active) values
  ('srv_001', 'shop_1', 'Corte de cabello', 'Corte clasico o degradado', 150.00, 30, 'corte', true),
  ('srv_002', 'shop_1', 'Arreglo de barba', 'Recorte y perfilado de barba', 100.00, 20, 'barba', true),
  ('srv_003', 'shop_1', 'Corte + Barba', 'Paquete completo de corte y barba', 220.00, 45, 'paquete', true),
  ('srv_004', 'shop_1', 'Lavado y tratamientos', 'Lavado con productos premium', 80.00, 15, 'tratamiento', true)
on conflict (service_id) do nothing;

-- Horarios de ejemplo (lunes a sabado 9am-7pm)
insert into schedules (schedule_id, shop_id, barber_id, day_of_week, start_time, end_time, active) values
  ('sch_001', 'shop_1', 'brb_001', 'monday', '09:00', '19:00', true),
  ('sch_002', 'shop_1', 'brb_001', 'tuesday', '09:00', '19:00', true),
  ('sch_003', 'shop_1', 'brb_001', 'wednesday', '09:00', '19:00', true),
  ('sch_004', 'shop_1', 'brb_001', 'thursday', '09:00', '19:00', true),
  ('sch_005', 'shop_1', 'brb_001', 'friday', '09:00', '19:00', true),
  ('sch_006', 'shop_1', 'brb_001', 'saturday', '09:00', '17:00', true),
  ('sch_007', 'shop_1', 'brb_002', 'monday', '09:00', '19:00', true),
  ('sch_008', 'shop_1', 'brb_002', 'tuesday', '09:00', '19:00', true),
  ('sch_009', 'shop_1', 'brb_002', 'wednesday', '09:00', '19:00', true),
  ('sch_010', 'shop_1', 'brb_002', 'thursday', '09:00', '19:00', true),
  ('sch_011', 'shop_1', 'brb_002', 'friday', '09:00', '19:00', true),
  ('sch_012', 'shop_1', 'brb_002', 'saturday', '09:00', '17:00', true)
on conflict (schedule_id) do nothing;

-- Clientes de ejemplo
insert into clients (client_id, shop_id, name, phone, email, notes) values
  ('cli_001', 'shop_1', 'Juan Perez', '+52 55 1111 2222', 'juan@email.com', 'Cliente frecuente, prefiere corte degradado'),
  ('cli_002', 'shop_1', 'Pedro Garcia', '+52 55 3333 4444', 'pedro@email.com', 'Primera visita'),
  ('cli_003', 'shop_1', 'Roberto Sanchez', '+52 55 5555 6666', 'roberto@email.com', 'Barba larga, usa pomada')
on conflict (client_id) do nothing;
