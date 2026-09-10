import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  DollarSign,
  BarChart3,
  Settings,
  UserCog,
  ClipboardCheck,
  PlusCircle,
  Gift,
  Package,
  Megaphone,
  Wallet,
  Receipt,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import adapter from "@/services";

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "supersistema";
  const location = useLocation();
  const [rewardsEnabled, setRewardsEnabled] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      adapter.getShopConfig().then((cfg) => {
        setRewardsEnabled(cfg.rewards?.loyalty?.enabled || false);
      }).catch(() => {});
    }
  }, [isAdmin, location.pathname]);

  const baseAdminNav = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/appointments", icon: Calendar, label: "Agenda" },
    { to: "/review", icon: ClipboardCheck, label: "Revisar servicios" },
    { to: "/cash", icon: Wallet, label: "Caja" },
    { to: "/expenses", icon: Receipt, label: "Gastos y retiros" },
    { to: "/settlements", icon: FileText, label: "Liquidaciones" },
    { to: "/clients", icon: Users, label: "Clientes" },
    { to: "/services", icon: Scissors, label: "Servicios" },
    { to: "/products", icon: Package, label: "Productos" },
    { to: "/promotions", icon: Megaphone, label: "Promociones" },
    { to: "/income", icon: DollarSign, label: "Ingresos" },
    { to: "/stats", icon: BarChart3, label: "Estadísticas" },
    { to: "/barbers", icon: UserCog, label: "Barberos" },
  ];

  if (rewardsEnabled) {
    baseAdminNav.push({ to: "/rewards", icon: Gift, label: "Recompensas" });
  }

  baseAdminNav.push({ to: "/settings", icon: Settings, label: "Configuración" });

  const barberNavItems = [
    { to: "/", icon: LayoutDashboard, label: "Mi Dashboard" },
    { to: "/my-appointments", icon: Calendar, label: "Mis citas" },
    { to: "/new-service", icon: PlusCircle, label: "Registrar servicio" },
    { to: "/my-commissions", icon: DollarSign, label: "Mis comisiones" },
    { to: "/my-settlements", icon: FileText, label: "Mis liquidaciones" },
  ];

  const navItems = isAdmin ? baseAdminNav : barberNavItems;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Scissors className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">BarberPro</span>
      </div>

      <div className="px-6 py-3">
        <p className="text-xs text-muted-foreground">{user?.role === "supersistema" ? "Super Admin" : isAdmin ? "Administrador" : "Barbero"}</p>
        <p className="text-sm font-medium truncate">{user?.name}</p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
