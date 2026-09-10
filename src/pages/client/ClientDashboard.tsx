import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Calendar, Star, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { ServiceRecord, Appointment } from "@/types";

export function ClientDashboard() {
  const { client, shopName } = useClientAuth();
  const [history, setHistory] = useState<ServiceRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loyalty, setLoyalty] = useState({ total_visits: 0, visits_required: 10, remaining: 10, reward_message: "¡Corte gratis!" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    Promise.all([
      adapter.getClientServiceHistory(client.client_id),
      adapter.getClientAppointments(client.client_id),
      adapter.getClientLoyaltyProgress(client.client_id),
    ])
      .then(([h, a, l]) => { setHistory(h); setAppointments(a); setLoyalty(l); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [client]);

  if (loading) return <LoadingSpinner size="lg" />;

  const upcoming = appointments.filter((a) => a.status === "pending" || a.status === "confirmed").slice(0, 3);
  const recentHistory = history.slice(0, 5);
  const progressPct = loyalty.visits_required > 0
    ? ((loyalty.total_visits % loyalty.visits_required) / loyalty.visits_required) * 100
    : 0;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Hola, {client?.name?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">{shopName}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{history.length}</p>
              <p className="text-xs text-muted-foreground">Citas totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loyalty.total_visits}</p>
              <p className="text-xs text-muted-foreground">Visitas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Progress */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold">Programa de Fidelidad</p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Te faltan <strong>{loyalty.remaining}</strong> visitas para: <strong>{loyalty.reward_message}</strong>
          </p>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>{loyalty.total_visits % loyalty.visits_required} / {loyalty.visits_required}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-amber-200">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <Link to="/client/loyalty" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline">
            Ver detalles <ArrowRight className="h-3 w-3" />
          </Link>
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Próximas citas</p>
            <Link to="/client/appointments" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes citas próximas</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((a) => (
                <div key={a.appointment_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{a.service_name}</p>
                    <p className="text-xs text-muted-foreground">Con {a.barber_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{a.date}</p>
                    <p className="text-xs text-muted-foreground">{a.start_time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent History */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Historial reciente</p>
            <Link to="/client/appointments" className="text-xs text-primary hover:underline">Ver todo</Link>
          </div>
          {recentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin historial aún</p>
          ) : (
            <div className="space-y-2">
              {recentHistory.map((r) => (
                <div key={r.record_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{r.service_name}</p>
                    <p className="text-xs text-muted-foreground">Con {r.barber_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(r.price_charged)}</p>
                    <p className="text-xs text-muted-foreground">{r.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
