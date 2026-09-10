import { NavLink } from "react-router-dom";
import { LayoutDashboard, Calendar, Users, DollarSign, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Inicio" },
  { to: "/appointments", icon: Calendar, label: "Agenda" },
  { to: "/clients", icon: Users, label: "Clientes" },
  { to: "/income", icon: DollarSign, label: "Ingresos" },
  { to: "/stats", icon: User, label: "Perfil" },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
