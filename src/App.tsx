import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ClientProtectedRoute } from "@/components/auth/ClientProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { LoginPage } from "@/pages/LoginPage";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { NotFoundPage } from "@/pages/NotFoundPage";

import { DashboardPage } from "@/pages/DashboardPage";
import { AppointmentsPage } from "@/pages/AppointmentsPage";
import { ClientsPage } from "@/pages/ClientsPage";
import { BarbersPage } from "@/pages/BarbersPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { IncomePage } from "@/pages/IncomePage";
import { StatsPage } from "@/pages/StatsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AdminReviewPage } from "@/pages/AdminReviewPage";
import { RewardsPage } from "@/pages/RewardsPage";
import { BarberDashboard } from "@/pages/barber/BarberDashboard";
import { BarberAppointments } from "@/pages/barber/BarberAppointments";
import { BarberCommissions } from "@/pages/barber/BarberCommissions";
import { BarberNewService } from "@/pages/barber/BarberNewService";
import { SuperDashboard } from "@/pages/super/SuperDashboard";
import { ShopsPage } from "@/pages/super/ShopsPage";
import { UsersPage } from "@/pages/super/UsersPage";
import { BillingPage } from "@/pages/super/BillingPage";
import { ClientLoginPage } from "@/pages/client/ClientLoginPage";
import { ClientDashboard } from "@/pages/client/ClientDashboard";
import { ClientServicesPage } from "@/pages/client/ClientServicesPage";
import { ClientAppointmentsPage } from "@/pages/client/ClientAppointmentsPage";
import { ClientLoyaltyPage } from "@/pages/client/ClientLoyaltyPage";
import { ClientProductsPage } from "@/pages/client/ClientProductsPage";
import { ClientProfilePage } from "@/pages/client/ClientProfilePage";
import { ProductsPage } from "@/pages/ProductsPage";
import { PromotionsPage } from "@/pages/PromotionsPage";
import { CashRegisterPage } from "@/pages/CashRegisterPage";
import { ExpensesHistoryPage } from "@/pages/ExpensesHistoryPage";
import { SettlementsPage } from "@/pages/settlements/SettlementsPage";
import { BarberSettlementsPage } from "@/pages/settlements/BarberSettlementsPage";

function SuperAdminRoutes() {
  const { currentShopId } = useAuth();
  if (currentShopId) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === "barber") return <BarberDashboard />;
  return <DashboardPage />;
}

function NormalRoutes() {
  const { user, currentShopId } = useAuth();
  const isInShop = user?.role === "supersistema" && !!currentShopId;
  const isAdmin = user?.role === "admin" || isInShop;
  const isBarber = user?.role === "barber";

  if (!isAdmin && !isBarber) return <Navigate to="/super" replace />;
  return <Outlet />;
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {/* Super Admin Global Panel */}
      <Route path="/super" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
        <Route element={<SuperAdminRoutes />}>
          <Route index element={<SuperDashboard />} />
          <Route path="shops" element={<ShopsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="billing" element={<BillingPage />} />
        </Route>
      </Route>

      {/* Normal App */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route element={<NormalRoutes />}>
          <Route index element={<RoleDashboard />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="income" element={<IncomePage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="barbers" element={<BarbersPage />} />
          <Route path="review" element={<AdminReviewPage />} />
          <Route path="cash" element={<CashRegisterPage />} />
          <Route path="expenses" element={<ExpensesHistoryPage />} />
          <Route path="settlements" element={<SettlementsPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="my-appointments" element={<BarberAppointments />} />
          <Route path="new-service" element={<BarberNewService />} />
          <Route path="my-commissions" element={<BarberCommissions />} />
          <Route path="my-settlements" element={<BarberSettlementsPage />} />
        </Route>
      </Route>

      {/* Client Portal */}
      <Route path="/client/login" element={<ClientAuthProvider><ClientLoginPage /></ClientAuthProvider>} />
      <Route path="/client" element={<ClientAuthProvider><ClientProtectedRoute><ClientLayout /></ClientProtectedRoute></ClientAuthProvider>}>
        <Route index element={<ClientDashboard />} />
        <Route path="services" element={<ClientServicesPage />} />
        <Route path="products" element={<ClientProductsPage />} />
        <Route path="appointments" element={<ClientAppointmentsPage />} />
        <Route path="loyalty" element={<ClientLoyaltyPage />} />
        <Route path="profile" element={<ClientProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
