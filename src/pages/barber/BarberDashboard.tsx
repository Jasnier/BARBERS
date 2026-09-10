import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Calendar, DollarSign, TrendingUp, Award } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import adapter from "@/services";

export function BarberDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ appointments: 0, commission: 0, tips: 0, services: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.barber_id) return;
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      adapter.getAppointments({ date: today, barber_id: user.barber_id }),
      adapter.getCommissions("monthly", user.barber_id),
    ]).then(([apts, comms]) => {
      setStats({
        appointments: apts.length,
        commission: comms[0]?.total_commission || 0,
        tips: comms[0]?.total_tips || 0,
        services: comms[0]?.total_services || 0,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title={`Hola, ${user?.name?.split(" ")[0] || "Barbero"}`} description="Resumen de tu día" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Citas hoy</CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.appointments}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Servicios este mes</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.services}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Comisión del mes</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(stats.commission)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Propinas</CardTitle>
            <Award className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(stats.tips)}</div></CardContent>
        </Card>
      </div>
    </div>
  );
}
