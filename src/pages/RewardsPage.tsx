import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trophy, Gift, Search, Zap, Ticket } from "lucide-react";
import adapter from "@/services";
import type { Client, ShopConfig } from "@/types";

interface ClientReward extends Client {
  progress: number;
  eligible: boolean;
  redeemed: number;
}

export function RewardsPage() {
  const [clients, setClients] = useState<ClientReward[]>([]);
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"loyalty" | "dynamics">("loyalty");

  const load = async () => {
    try {
      const [clis, cfg] = await Promise.all([adapter.getClients(), adapter.getShopConfig()]);
      setConfig(cfg);
      const required = cfg.rewards?.loyalty?.visits_required || 10;
      const rewards = clis.map((c) => {
        const total = c.total_visits || 0;
        const redeemed = Math.floor(total / required);
        const progress = total % required;
        return { ...c, progress, eligible: progress === 0 && total > 0, redeemed };
      });
      setClients(rewards.sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const loyalty = config?.rewards?.loyalty;
  const dynamics = config?.rewards?.dynamics || [];
  const required = loyalty?.visits_required || 10;
  const rewardMsg = loyalty?.reward_message || "¡Corte gratis!";
  const eligibleCount = clients.filter((c) => c.total_visits >= required).length;

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  const typeLabel = (t: string) => t === "raffle" ? "Rifa" : t === "promotion" ? "Promoción" : "Otra";
  const typeIcon = (t: string) => t === "raffle" ? <Ticket className="h-4 w-4" /> : t === "promotion" ? <Gift className="h-4 w-4" /> : <Zap className="h-4 w-4" />;

  return (
    <div>
      <PageHeader title="Recompensas" description="Programa de fidelidad y dinámicas" />

      <div className="mb-6 flex gap-2">
        <Button variant={activeTab === "loyalty" ? "default" : "outline"} onClick={() => setActiveTab("loyalty")}>
          <Trophy className="mr-2 h-4 w-4" /> Fidelidad
        </Button>
        <Button variant={activeTab === "dynamics" ? "default" : "outline"} onClick={() => setActiveTab("dynamics")}>
          <Zap className="mr-2 h-4 w-4" /> Dinámicas ({dynamics.filter((d) => d.active).length})
        </Button>
      </div>

      {activeTab === "loyalty" ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Con servicio gratis pendiente</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  <span className="text-2xl font-bold">{eligibleCount}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Regla</CardTitle></CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{required} cortes</p>
                <p className="text-xs text-muted-foreground">→ {rewardMsg}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total clientes</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{clients.length}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Clientes y progreso</CardTitle>
              <div className="mt-2 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono..." className="pl-9" />
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sin clientes</p>
              ) : (
                <div className="space-y-3">
                  {filtered.map((c) => {
                    const total = c.total_visits || 0;
                    const isEligible = total >= required;
                    const pct = isEligible ? 100 : Math.min(100, (total / required) * 100);
                    return (
                      <div key={c.client_id} className={`rounded-lg border p-3 ${isEligible ? "border-green-300 bg-green-50" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone || "Sin teléfono"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{total} / {required} cortes</p>
                            {isEligible ? (
                              <Badge className="bg-green-100 text-green-800">
                                <Trophy className="mr-1 h-3 w-3" /> {rewardMsg}
                              </Badge>
                            ) : (
                              <p className="text-xs text-muted-foreground">Faltan {required - total}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div className={`h-full rounded-full transition-all ${isEligible ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {dynamics.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Zap className="mx-auto mb-4 h-12 w-12" />
                <p>Sin dinámicas creadas.</p>
                <p className="text-xs">Créalas en Configuración → Recompensas → Dinámicas extra</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {dynamics.map((dyn) => (
                <Card key={dyn.id} className={dyn.active ? "" : "opacity-50"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {typeIcon(dyn.type)}
                      {dyn.name}
                      <Badge variant={dyn.active ? "default" : "secondary"}>
                        {dyn.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{typeLabel(dyn.type)}</p>
                    {dyn.description && <p className="mt-1 text-sm">{dyn.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
