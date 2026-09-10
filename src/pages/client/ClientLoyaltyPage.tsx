import { useEffect, useState } from "react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Star, Trophy, Gift } from "lucide-react";
import adapter from "@/services";
import type { ServiceRecord } from "@/types";

export function ClientLoyaltyPage() {
  const { client } = useClientAuth();
  const [loyalty, setLoyalty] = useState({ total_visits: 0, visits_required: 10, remaining: 10, reward_message: "¡Corte gratis!" });
  const [history, setHistory] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    Promise.all([
      adapter.getClientLoyaltyProgress(client.client_id),
      adapter.getClientServiceHistory(client.client_id),
    ])
      .then(([l, h]) => { setLoyalty(l); setHistory(h); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [client]);

  if (loading) return <LoadingSpinner size="lg" />;

  const completedVisits = loyalty.total_visits % loyalty.visits_required;
  const progressPct = loyalty.visits_required > 0 ? (completedVisits / loyalty.visits_required) * 100 : 0;
  const freeServicesEarned = Math.floor(loyalty.total_visits / loyalty.visits_required);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Programa de Fidelidad ⭐</h1>
        <p className="text-sm text-muted-foreground">Acumula visitas y gana recompensas</p>
      </div>

      {/* Progress Card */}
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Trophy className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedVisits} / {loyalty.visits_required}</p>
              <p className="text-sm text-muted-foreground">Visitas completadas</p>
            </div>
          </div>

          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-semibold">{Math.round(progressPct)}%</span>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-amber-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="rounded-lg bg-white/70 p-4 text-center">
            <Gift className="mx-auto mb-2 h-6 w-6 text-amber-600" />
            {loyalty.remaining > 0 ? (
              <p className="text-sm">
                Te faltan <strong className="text-amber-700">{loyalty.remaining} visitas</strong> para:{""}
                <br />
                <strong className="text-lg">{loyalty.reward_message}</strong>
              </p>
            ) : (
              <p className="text-sm font-semibold text-green-700">
                ¡Felicidades! Has ganado: {loyalty.reward_message}
              </p>
            )}
          </div>

          {freeServicesEarned > 0 && (
            <p className="mt-3 text-center text-xs text-amber-700">
              Has ganado {freeServicesEarned} servicio(s) gratis en total
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{loyalty.total_visits}</p>
            <p className="text-xs text-muted-foreground">Visitas totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{freeServicesEarned}</p>
            <p className="text-xs text-muted-foreground">Cortes gratis ganados</p>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Historial de visitas</h2>
        {history.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Sin visitas aún</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {history.map((r, i) => (
              <div key={r.record_id} className="flex items-center gap-3 rounded-lg border bg-white p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                  {history.length - i}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.service_name}</p>
                  <p className="text-xs text-muted-foreground">{r.date} • {r.barber_name}</p>
                </div>
                <Star className="h-4 w-4 text-amber-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
