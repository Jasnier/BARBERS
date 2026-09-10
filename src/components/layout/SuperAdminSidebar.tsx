import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  Users,
  CreditCard,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface SuperAdminSidebarProps {
  onClose?: () => void;
}

const navItems = [
  { to: "/super", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/super/shops", icon: Store, label: "Tiendas" },
  { to: "/super/users", icon: Users, label: "Usuarios" },
  { to: "/super/billing", icon: CreditCard, label: "Facturación" },
];

export function SuperAdminSidebar({ onClose }: SuperAdminSidebarProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Shield className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-bold">BarberPro</span>
      </div>

      <div className="px-6 py-3">
        <p className="text-xs text-muted-foreground">Super Administrador</p>
        <p className="text-sm font-medium truncate">{user?.name}</p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
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

      <div className="border-t p-4">
        <button
          onClick={() => { logout(); onClose?.(); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
