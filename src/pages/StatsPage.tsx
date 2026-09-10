import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import adapter from "@/services";
import type { BarberCommission, IncomeRecord } from "@/types";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function StatsPage() {
  const [commissions, setCommissions] = useState<BarberCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarber, setSelectedBarber] = useState<BarberCommission | null>(null);

  const [services, setServices] = useState<IncomeRecord[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [filterService, setFilterService] = useState("all");

  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonthNum, setFilterMonthNum] = useState(now.getMonth());

  useEffect(() => {
    adapter.getCommissions("monthly").then(setCommissions).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadBarberDetail = useCallback(async (barberId: string) => {
    setServicesLoading(true);
    try {
      const { from, to } = getMonthRange(filterYear, filterMonthNum);
      const allIncome = await adapter.getIncome({ date_from: from, date_to: to, barber_id: barberId });
      setServices(allIncome);
    } catch (err) {
      console.error(err);
    } finally {
      setServicesLoading(false);
    }
  }, [filterYear, filterMonthNum]);

  useEffect(() => {
    if (selectedBarber) loadBarberDetail(selectedBarber.barber_id);
  }, [selectedBarber, loadBarberDetail]);

  const uniqueServiceNames = [...new Set(services.map((s) => s.service_name || "Desconocido"))];

  const filteredServices = services.filter((s) => {
    if (filterService !== "all" && s.service_name !== filterService) return false;
    return true;
  });

  const totals = filteredServices.reduce(
    (acc, s) => ({
      count: acc.count + 1,
      gross: acc.gross + (s.gross_amount || 0),
      commission: acc.commission + (s.commission_amount || 0),
      tips: acc.tips + (s.tip || 0),
    }),
    { count: 0, gross: 0, commission: 0, tips: 0 }
  );

  if (loading) return <LoadingSpinner size="lg" />;

  const total = commissions.reduce(
    (s, c) => ({
      services: s.services + c.total_services,
      gross: s.gross + c.total_gross,
      commission: s.commission + c.total_commission,
      tips: s.tips + c.total_tips,
    }),
    { services: 0, gross: 0, commission: 0, tips: 0 }
  );

  return (
    <div>
      <PageHeader title="Estadísticas" description="Rendimiento del mes" />

      {commissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BarChart3 className="mb-4 h-12 w-12" />
          <p>Sin datos este mes. Completa servicios para ver estadísticas.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Servicios</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{total.services}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ingresos brutos</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{formatCurrency(total.gross)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Comisiones</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-600">{formatCurrency(total.commission)}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Rendimiento por barbero</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissions.map((c) => (
                  <button
                    key={c.barber_id}
                    className="flex w-full items-center justify-between rounded-lg border-b p-1 text-left transition hover:bg-blue-50 last:border-0"
                    onClick={() => setSelectedBarber(c)}
                  >
                    <div>
                      <p className="font-medium">{c.barber_name}</p>
                      <p className="text-sm text-muted-foreground">{c.total_services} servicios — clic para ver detalle</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(c.total_commission)}</p>
                      <p className="text-sm text-muted-foreground">+ {formatCurrency(c.total_tips)} propinas</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Barber detail dialog */}
      <Dialog open={!!selectedBarber} onOpenChange={() => setSelectedBarber(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBarber?.barber_name} — Detalle de servicios</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Mes</p>
              <Select
                value={`${filterYear}-${filterMonthNum}`}
                onValueChange={(v) => {
                  const [y, m] = v.split("-").map(Number);
                  setFilterYear(y);
                  setFilterMonthNum(m);
                }}
              >
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 13 }, (_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const y = d.getFullYear();
                    const m = d.getMonth();
                    return (
                      <SelectItem key={`${y}-${m}`} value={`${y}-${m}`}>
                        {MONTHS[m]} {y}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Servicio</p>
              <Select value={filterService} onValueChange={setFilterService}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueServiceNames.map((sn) => (
                    <SelectItem key={sn} value={sn}>{sn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Servicios</p>
              <p className="text-xl font-bold">{totals.count}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Bruto</p>
              <p className="text-xl font-bold">{formatCurrency(totals.gross)}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Comisión</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(totals.commission)}</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Propinas</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(totals.tips)}</p>
            </div>
          </div>

          {servicesLoading ? (
            <div className="py-6"><LoadingSpinner size="md" /></div>
          ) : filteredServices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin servicios en este período</p>
          ) : (
            <div className="space-y-2 mt-3">
              {filteredServices.map((s) => (
                <div key={s.income_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.service_name}</p>
                    <p className="text-xs text-muted-foreground">{s.date}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatCurrency(s.gross_amount)}</p>
                    <p className="text-orange-600">com: {formatCurrency(s.commission_amount)}</p>
                    {s.tip > 0 && <p className="text-purple-600">propina: {formatCurrency(s.tip)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
