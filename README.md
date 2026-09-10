# BarberPro — SaaS de gestión para barberías

Plataforma multi-tienda para la operación completa de barberías: citas, clientes, barberos,
caja, gastos, liquidaciones/comisiones, productos, promociones y fidelización — con portal
de auto-reserva para clientes finales.

## Funcionalidades por rol

- **Super-admin (SaaS):** multi-tienda (shops), usuarios, facturación del servicio.
- **Admin de tienda:** dashboard con métricas (Recharts), citas, clientes, barberos,
  servicios, productos, promociones, caja registradora, gastos, liquidaciones,
  recompensas, estadísticas y configuración.
- **Barbero:** agenda propia, registro de servicios, comisiones y liquidaciones.
- **Cliente final:** reserva de citas, catálogo de servicios/productos,
  programa de lealtad y perfil.

## Stack

- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, Radix UI, React Router 6
- **Datos:** Supabase (PostgreSQL + Auth), TanStack React Query
- **Formularios:** React Hook Form + Zod · **Fechas:** date-fns · **Gráficos:** Recharts

## Estructura

```
src/          # App, pages/, components/, services/, contexts/, types/
supabase/     # schema.sql + seed.sql + 18 migraciones
              # (caja, gastos, liquidaciones, productos, promociones,
              #  propinas, métodos de pago, auth de clientes, multisede…)
```

## Puesta en marcha

```bash
npm install
cp .env.example .env   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
# Aplicar supabase/schema.sql + migraciones + seed.sql en tu proyecto Supabase
npm run dev
npm run build          # build de producción (tsc + vite)
```

## Notas

- Rutas protegidas por rol (`ProtectedRoute`, `ClientProtectedRoute`).
- Validación de formularios con Zod; caché y sincronización con React Query.
- Las claves de Supabase van en `.env` (nunca commitear).
