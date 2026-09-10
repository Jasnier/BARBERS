import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Scissors, Home, Calendar, Star, LogOut, Menu, X, KeyRound, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { ClientChangePinDialog } from "@/components/crud/ClientChangePinDialog";

const navItems = [
  { to: "/client", icon: Home, label: "Inicio", end: true },
  { to: "/client/services", icon: Scissors, label: "Servicios" },
  { to: "/client/products", icon: Package, label: "Productos" },
  { to: "/client/appointments", icon: Calendar, label: "Mis citas" },
  { to: "/client/loyalty", icon: Star, label: "Fidelidad" },
  { to: "/client/profile", icon: User, label: "Mi perfil" },
];

export function ClientLayout() {
  const { client, shopName, logout } = useClientAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-white transition-transform duration-200 md:static md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-blue-600" />
              <span className="font-bold">BarberPro</span>
            </div>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-4 border-b">
            <p className="text-xs text-muted-foreground">{shopName}</p>
            <p className="text-sm font-semibold truncate">{client?.name}</p>
            <p className="text-xs text-muted-foreground">{client?.phone}</p>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t p-4 space-y-1">
            <button
              onClick={() => { setPinDialogOpen(true); setSidebarOpen(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <KeyRound className="h-5 w-5" />
              Cambiar PIN
            </button>
            <button
              onClick={() => { logout(); setSidebarOpen(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white/80 backdrop-blur px-4 md:px-6">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold">
            {navItems.find((n) => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))?.label || "BarberPro"}
          </h1>
          <div className="flex-1" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
            {client?.name?.charAt(0) || "C"}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white md:hidden">
          <div className="flex h-14 items-center justify-around">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive ? "text-blue-600" : "text-muted-foreground"
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
      <ClientChangePinDialog open={pinDialogOpen} onOpenChange={setPinDialogOpen} />
    </div>
  );
}
