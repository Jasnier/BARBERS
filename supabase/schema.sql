-- =============================================
-- BarberPro - Supabase Schema
-- =============================================
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- =============================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. TABLA: users
-- =============================================
create table users (
  user_id       text primary key,
  shop_id       text not null default 'shop_1',
  email         text unique not null,
  name          text not null,
  password_hash text not null,
  role          text not null default 'barber' check (role in ('admin', 'barber')),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- =============================================
-- 2. TABLA: barbers
-- =============================================
create table barbers (
  barber_id        text primary key,
  shop_id          text not null default 'shop_1',
  user_id          text not null default '',
  name             text not null,
  phone            text not null default '',
  specialty        text not null default '',
  commission_rate  numeric(5,2) not null default 40.00,
  commission_type  text not null default 'service' check (commission_type in ('service', 'daily')),
  active           boolean not null default true,
  avatar_url       text not null default ''
);

-- =============================================
-- 3. TABLA: clients
-- =============================================
create table clients (
  client_id    text primary key,
  shop_id      text not null default 'shop_1',
  name         text not null,
  phone        text not null default '',
  email        text not null default '',
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  last_visit   text not null default '',
  total_visits integer not null default 0
);

-- =============================================
-- 4. TABLA: services
-- =============================================
create table services (
  service_id   text primary key,
  shop_id      text not null default 'shop_1',
  name         text not null,
  description  text not null default '',
  price        numeric(10,2) not null default 0,
  duration_min integer not null default 30,
  category     text not null default 'corte' check (category in ('corte', 'barba', 'paquete', 'tratamiento', 'otro')),
  active       boolean not null default true
);

-- =============================================
-- 5. TABLA: appointments
-- =============================================
create table appointments (
  appointment_id text primary key,
  shop_id        text not null default 'shop_1',
  client_id      text not null references clients(client_id) on delete cascade,
  barber_id      text not null references barbers(barber_id) on delete cascade,
  service_id     text not null references services(service_id) on delete cascade,
  date           text not null,
  start_time     text not null,
  end_time       text not null,
  status         text not null default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes          text not null default '',
  created_by     text not null default '',
  created_at     timestamptz not null default now()
);

-- =============================================
-- 6. TABLA: service_records
-- =============================================
create table service_records (
  record_id      text primary key,
  shop_id        text not null default 'shop_1',
  appointment_id text not null references appointments(appointment_id) on delete cascade,
  client_id      text not null references clients(client_id) on delete cascade,
  barber_id      text not null references barbers(barber_id) on delete cascade,
  service_id     text not null references services(service_id) on delete cascade,
  date           text not null,
  price_charged  numeric(10,2) not null default 0,
  tip            numeric(10,2) not null default 0,
  notes          text not null default '',
  created_at     timestamptz not null default now()
);

-- =============================================
-- 7. TABLA: income
-- =============================================
create table income (
  income_id         text primary key,
  shop_id           text not null default 'shop_1',
  record_id         text not null references service_records(record_id) on delete cascade,
  barber_id         text not null references barbers(barber_id) on delete cascade,
  service_id        text not null references services(service_id) on delete cascade,
  date              text not null,
  gross_amount      numeric(10,2) not null default 0,
  commission_amount numeric(10,2) not null default 0,
  shop_amount       numeric(10,2) not null default 0,
  tip               numeric(10,2) not null default 0,
  recorded_at       timestamptz not null default now()
);

-- =============================================
-- 8. TABLA: schedules
-- =============================================
create table schedules (
  schedule_id  text primary key,
  shop_id      text not null default 'shop_1',
  barber_id    text not null references barbers(barber_id) on delete cascade,
  day_of_week  text not null check (day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time   text not null default '09:00',
  end_time     text not null default '19:00',
  active       boolean not null default true
);

-- =============================================
-- 9. TABLA: shop_config
-- =============================================
create table shop_config (
  id       text primary key,
  shop_id  text not null default 'shop_1',
  key      text not null,
  value    text not null default ''
);

-- Unique constraint: one config key per shop
create unique index idx_shop_config_shop_key on shop_config (shop_id, key);

-- =============================================
-- INDEXES
-- =============================================
create index idx_barbers_shop       on barbers (shop_id);
create index idx_clients_shop       on clients (shop_id);
create index idx_services_shop      on services (shop_id);
create index idx_appointments_shop  on appointments (shop_id);
create index idx_appointments_date  on appointments (date);
create index idx_appointments_barber on appointments (barber_id);
create index idx_appointments_status on appointments (status);
create index idx_service_records_shop on service_records (shop_id);
create index idx_income_shop        on income (shop_id);
create index idx_income_barber      on income (barber_id);
create index idx_income_date        on income (date);
create index idx_schedules_barber   on schedules (barber_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
-- For MVP: disable RLS (single shop, no multi-tenant)
-- Enable later when adding multi-shop support

alter table users           disable row level security;
alter table barbers         disable row level security;
alter table clients         disable row level security;
alter table services        disable row level security;
alter table appointments    disable row level security;
alter table service_records disable row level security;
alter table income          disable row level security;
alter table schedules       disable row level security;
alter table shop_config     disable row level security;

-- =============================================
-- SEED DATA: Usuario admin + Barberia default
-- =============================================
-- Password: admin123 (hash bcrypt)
-- NOTA: Este hash es para "admin123" con bcrypt.
-- Si usas Supabase Auth, crea el usuario desde el dashboard.

insert into users (user_id, shop_id, email, name, password_hash, role, active)
values (
  'usr_admin_001',
  'shop_1',
  'admin@barberia.com',
  'Administrador',
  '$2a$10$YourBcryptHashHere',
  'admin',
  true
) on conflict (user_id) do nothing;

-- =============================================
-- HELPER FUNCTION: incrementar visitas del cliente
-- =============================================
create or replace function increment_client_visits(p_client_id text)
returns void as $$
begin
  update clients
  set total_visits = total_visits + 1,
      last_visit = to_char(now(), 'YYYY-MM-DD')
  where client_id = p_client_id;
end;
$$ language plpgsql;

-- =============================================
-- COMENTARIOS
-- =============================================
comment on table users is 'Usuarios del sistema (admin y barberos)';
comment on table barbers is 'Barberos registrados en la barberia';
comment on table clients is 'Base de datos de clientes';
comment on table services is 'Servicios ofrecidos por la barberia';
comment on table appointments is 'Citas agendadas';
comment on table service_records is 'Historial de servicios realizados';
comment on table income is 'Registro de ingresos y comisiones';
comment on table schedules is 'Horarios de trabajo de cada barbero';
comment on table shop_config is 'Configuracion general de la barberia';
