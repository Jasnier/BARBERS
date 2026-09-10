import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Store, Users, AlertTriangle, CheckCircle } from "lucide-react";
import adapter from "@/services";
import type { Shop, User } from "@/types";

export function SuperDashboard() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adapter.getShops(), adapter.getAllUsers()])
      .then(([s, u]) => { setShops(s); setUsers(u); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const activeShops = shops.filter((s) => s.active && !s.blocked);
  const blockedShops = shops.filter((s) => s.blocked);
  const totalUsers = users.length;

  const stats = [
    { title: "Total Tiendas", value: shops.length, icon: Store, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Tiendas Activas", value: activeShops.length, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
    { title: "Bloqueadas", value: blockedShops.length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
    { title: "Total Usuarios", value: totalUsers, icon: Users, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard Super Administrador" description="Vista global de todas las barberías" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${s.bg}`}>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.title}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tiendas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {shops.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay tiendas registradas</p>
            ) : (
              <div className="space-y-3">
                {shops.slice(0, 5).map((shop) => (
                  <div key={shop.shop_id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{shop.name}</p>
                      <p className="text-xs text-muted-foreground">{shop.owner_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {shop.blocked ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Bloqueada</span>
                      ) : shop.active ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Activa</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">Inactiva</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {shops.length > 5 && (
              <button onClick={() => navigate("/super/shops")} className="mt-3 text-sm text-primary hover:underline">
                Ver todas las tiendas
              </button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios por Rol</CardTitle>
          </CardHeader>
          <CardContent>
            {["admin", "barber", "supersistema"].map((role) => {
              const count = users.filter((u) => u.role === role).length;
              const labels: Record<string, string> = { admin: "Administradores", barber: "Barberos", supersistema: "Super Admins" };
              return (
                <div key={role} className="flex items-center justify-between border-b py-3 last:border-0">
                  <span className="text-sm">{labels[role]}</span>
                  <span className="font-bold">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
