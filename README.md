# BarberPro — Gestión de Barberías

Sistema web SaaS multi-tienda para gestionar barberías: citas, clientes, barberos, servicios, productos, promociones, caja, liquidaciones, fidelización y portal de cliente. Incluye panel SuperAdmin para operar N tiendas.

> Stack: Vite + React 18 + TypeScript + Tailwind + shadcn/Radix + React Query + React Hook Form + Zod + Supabase + Recharts.

## Funcionalidades

**Administración de tienda (`/` con rol `admin`)**
- Dashboard con KPIs del día, gráficos y accesos rápidos (`src/pages/DashboardPage.tsx`)
- Citas: CRUD + filtros por estado/fecha/barbero, completar / cancelar / no-show (`AppointmentsPage.tsx` + `CompleteAppointmentDialog`)
- Clientes CRM: historial, visitas, última visita (`ClientsPage.tsx`)
- Barberos: alta, comisión % / tipo `service|daily`, horarios por día (`BarbersPage.tsx` + `BarberScheduleDialog`)
- Catálogos: servicios (`corte|barba|paquete|tratamiento|otro`), productos con stock, promociones con vigencia
- Ingresos y estadísticas: bruto / comisión / tienda / propina, ranking por barbero (`IncomePage.tsx`, `StatsPage.tsx`)
- Caja por turno: apertura/cierre, movimientos, gastos y retiros (`CashRegisterPage.tsx`)
- Liquidaciones: generar por barbero/periodo, ajustes, pagos parciales, detalle (`settlements/SettlementsPage.tsx`)
- Revisión walk-in: aprobar/rechazar `service_requests` con método de pago, gratis y propina (`AdminReviewPage.tsx`)
- Recompensas / fidelización y configuración de tienda (`RewardsPage.tsx`, `SettingsPage.tsx`)

**Barbero (rol `barber`)**
- `BarberDashboard`: mis citas de hoy, comisión, propinas
- `BarberAppointments`: solo mis citas
- `BarberNewService`: servicio sin cita (walk-in) → crea `service_request` pendiente
- `BarberCommissions` + `my-settlements`: mis ingresos y liquidaciones pendiente/pagado

**SuperAdmin SaaS (rol `supersistema`, `/super`)**
- `SuperDashboard`: nº tiendas, usuarios, alertas
- `ShopsPage`: CRUD `shops`, activar/bloquear, entrar a tienda (impersonar)
- `UsersPage`: usuarios por tienda, roles `admin|barber|supersistema`
- `BillingPage`: suscripciones/cobros por tienda

**Portal cliente (`/client`, login teléfono + PIN)**
- Reserva eligiendo barbero/horario validado contra `schedules`
- Catálogo de servicios + promos, productos con favoritos
- Mis citas, programa de lealtad (visitas → corte gratis), perfil + cambio de PIN

## Stack técnico

- Frontend: `react@18.3.1`, `react-router-dom@6.26`, `@tanstack/react-query@5.56`, `react-hook-form@7.53` + `zod@3.23`
- UI: `tailwindcss@3.4`, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`, 10 primitivos `@radix-ui/*`, `lucide-react@0.460`
- Datos/fechas/gráficos: `@supabase/supabase-js@2.45`, `date-fns@4.1` (locale `es`), `recharts@2.15`
- Build: `vite@5.4`, `@vitejs/plugin-react@4.3`, `typescript@5.5`
- Ruteo en `src/App.tsx:67`, bootstrap en `src/main.tsx:19` (`QueryClient staleTime 2min + BrowserRouter + AuthProvider`). Alias `@` → `./src` (`vite.config.ts:8`), dev server puerto `3000`.

## Estructura

```
BARBERS/
├── index.html                  # lang es, title BarberPro
├── vite.config.ts              # alias @, port 3000
├── tailwind.config.ts          # darkMode class, tema shadcn
├── package.json                # scripts dev/build/preview/lint
├── .env.example                # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_NAME
├── supabase/
│   ├── schema.sql              # 9 tablas núcleo
│   ├── seed.sql                # shop_config demo + barberos + servicios
│   └── migration_*.sql         # 18 migraciones (shops, auth cliente, productos, caja, settlements...)
└── src/
    ├── App.tsx                 # 3 árboles: /login, /super, /, /client
    ├── main.tsx
    ├── index.css
    ├── config/constants.ts     # APP_NAME, DAYS, CATEGORIES, STATUSES
    ├── contexts/               # AuthContext (staff), ClientAuthContext (portal)
    ├── lib/utils.ts            # cn(), formatCurrency COP, formatDate/Time
    ├── services/supabase/      # client.ts + adapter.ts (DAL ~2260 líneas)
    ├── types/                  # 18 tipos: user, shop, barber, client, appointment...
    ├── components/
    │   ├── auth/               # ProtectedRoute, ClientProtectedRoute
    │   ├── layout/             # AppLayout, Sidebar, MobileNav, SuperAdminLayout, ClientLayout
    │   ├── shared/             # PageHeader, DataTable, EmptyState, LoadingSpinner
    │   ├── ui/                 # button, card, dialog, input, select, tabs...
    │   ├── crud/               # 9 diálogos (Appointment, Client, Barber, Service...)
    │   ├── cash/               # Open/CloseCashRegister, Expenses, Withdrawals
    │   └── settlements/        # Generate, Detail, RegisterPayment
    └── pages/
        ├── LoginPage, DashboardPage, AppointmentsPage, ClientsPage, BarbersPage...
        ├── barber/             # BarberDashboard, BarberAppointments, BarberNewService...
        ├── settlements/        # SettlementsPage, BarberSettlementsPage
        ├── super/              # SuperDashboard, ShopsPage, UsersPage, BillingPage
        └── client/             # ClientLogin, ClientDashboard, ClientServices...
```

## Modelo de datos (Supabase/Postgres)

Núcleo `supabase/schema.sql` (todas con `shop_id`, RLS deshabilitado en MVP):
- `users(user_id,email,name,password_hash,role,active)` + seed `admin@barberia.com`
- `barbers(barber_id,user_id,name,commission_rate,commission_type,active)`
- `clients(client_id,name,phone,email,total_visits,last_visit)` + `increment_client_visits()`
- `services(service_id,name,price,duration_min,category,active)`
- `appointments(client_id,barber_id,service_id,date,start_time,end_time,status)`
- `service_records(appointment_id,price_charged,tip)` + `income(gross_amount,commission_amount,shop_amount,tip)`
- `schedules(barber_id,day_of_week,start_time,end_time)` + `shop_config(shop_id,key,value)`

Extendido por migraciones:
- `shops` + `role supersistema`, `clients(pin_hash,auth_active,access_code)`
- `products`, `product_sales`, `product_favorites`, `promotions`
- `service_requests(barber_id,client_name/phone,service_id,price,tip,payment_method,status,is_free)`
- `cash_registers(status open|closed)`, `cash_movements(type income|expense|withdrawal)`
- `expenses/withdrawals`, `shop_payment_methods`, `payments`
- `settlements(barber_id,period_from/to,total_gross,total_commission,status pending|paid)`

Flujo: `reserva cliente / walk-in → cita pending→confirmed→in_progress → service_request → revisión admin → service_records + income (bruto → comisión vs tienda) → caja turno → liquidación periodo → fidelización + stats`.

## Puesta en marcha

Requisitos: Node 18+, cuenta Supabase.

```bash
npm install
cp .env.example .env
# editar .env:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...
# VITE_APP_NAME=BarberPro

# Base de datos (en Supabase SQL Editor, en orden):
# 1. supabase/schema.sql
# 2. supabase/seed.sql
# 3. supabase/migration_*.sql (en orden alfabético)

npm run dev      # http://localhost:3000
npm run build    # tsc -b && vite build → dist/
npm run preview  # previsualizar build
npm run lint
```

`.env` está ignorado por `.gitignore:3`. No subir claves reales. `dist/` y `node_modules/` también ignorados.

## Rutas principales

| Ruta | Acceso |
|------|--------|
| `/login` | staff admin/barber (+ supersistema) |
| `/` | dashboard según rol |
| `/appointments`, `/clients`, `/barbers`, `/services`, `/products`, `/promotions` | admin |
| `/income`, `/stats`, `/cash`, `/expenses`, `/settlements`, `/review`, `/rewards`, `/settings` | admin |
| `/my-appointments`, `/new-service`, `/my-commissions`, `/my-settlements` | barber |
| `/super`, `/super/shops`, `/super/users`, `/super/billing` | supersistema |
| `/client/login`, `/client`, `/client/services`, `/client/appointments`, `/client/loyalty` | cliente |

## Git

```bash
git init
git add .
git commit -m "feat: BarberPro inicial"
git branch -M main
git remote add origin <URL_GITHUB>
git push -u origin main
```

> Nota: `EcoModa_BI.pbix`-style no aplica aquí; en este repo se excluyen `node_modules/`, `dist/`, `.env` por `.gitignore`.
