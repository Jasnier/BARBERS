import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Calendar, Users, DollarSign, AlertTriangle, Clock, Scissors, Star, Trophy, CreditCard, X, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { Appointment, IncomeRecord, ServiceRequest } from "@/types";

const PIE_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

type Period = "day" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Hoy",
  week: "Semana",
  month: "Mes",
  year: "Año",
};

function getDateRange(period: Period): { dateFrom: string; dateTo: string; label: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  if (period === "day") {
    return { dateFrom: today, dateTo: today, label: today };
  }
  if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      dateFrom: monday.toISOString().split("T")[0],
      dateTo: sunday.toISOString().split("T")[0],
      label: `${monday.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} — ${sunday.toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`,
    };
  }
  if (period === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      dateFrom: first.toISOString().split("T")[0],
      dateTo: last.toISOString().split("T")[0],
      label: now.toLocaleDateString("es-CO", { month: "long", year: "numeric" }),
    };
  }
  const first = new Date(now.getFullYear(), 0, 1);
  const last = new Date(now.getFullYear(), 11, 31);
  return {
    dateFrom: first.toISOString().split("T")[0],
    dateTo: last.toISOString().split("T")[0],
    label: String(now.getFullYear()),
  };
}

function formatDateLabel(d: string) {
  const date = new Date(d + "T12:00:00");
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [kpiDetail, setKpiDetail] = useState<string | null>(null);

  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [isCustomRange, setIsCustomRange] = useState(false);

  const [periodAppointments, setPeriodAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [periodIncome, setPeriodIncome] = useState<IncomeRecord[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ServiceRequest[]>([]);
  const [appointmentsAll, setAppointmentsAll] = useState<Appointment[]>([]);
  const [shopConfig, setShopConfig] = useState<any>(null);
  const [paymentSummary, setPaymentSummary] = useState<Record<string, number>>({});
  const [activePaymentMethods, setActivePaymentMethods] = useState<{ key: string; label: string }[]>([]);
  const [financialSummary, setFinancialSummary] = useState<{ totalExpenses: number; totalWithdrawals: number; expensesByCategory: Record<string, number> }>({ totalExpenses: 0, totalWithdrawals: 0, expensesByCategory: {} });

  const activeRange = useMemo(() => {
    if (isCustomRange && customDateFrom && customDateTo) {
      return { dateFrom: customDateFrom, dateTo: customDateTo, label: `${formatDateLabel(customDateFrom)} — ${formatDateLabel(customDateTo)}` };
    }
    return getDateRange(period);
  }, [period, isCustomRange, customDateFrom, customDateTo]);

  const handlePeriodChange = (p: Period) => {
    setIsCustomRange(false);
    setCustomDateFrom("");
    setCustomDateTo("");
    setPeriod(p);
  };

  const handleCustomRange = () => {
    if (customDateFrom && customDateTo && customDateFrom <= customDateTo) {
      setIsCustomRange(true);
    }
  };

  const clearCustomRange = () => {
    setIsCustomRange(false);
    setCustomDateFrom("");
    setCustomDateTo("");
  };

  const loadData = useCallback(async (dateFrom: string, dateTo: string) => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const [
        clis,
        pApts,
        upcoming,
        pInc,
        pendReqs,
        allApts,
        cfg,
      ] = await Promise.all([
        adapter.getClients(),
        adapter.getAppointments({ date_from: dateFrom, date_to: dateTo }),
        adapter.getAppointments({ date_from: today }),
        adapter.getIncome({ date_from: dateFrom, date_to: dateTo }),
        adapter.getServiceRequests({ status: "pending" }),
        adapter.getAppointments({ date_from: dateFrom, date_to: dateTo }),
        adapter.getShopConfig(),
      ]);

      setClients(clis);
      setPeriodAppointments(pApts);
      setUpcomingAppointments(upcoming.slice(0, 8));
      setPeriodIncome(pInc);
      setPendingRequests(pendReqs);
      setAppointmentsAll(allApts);
      setShopConfig(cfg);

      const dateFromTs = dateFrom + "T00:00:00";
      const dateToTs = dateTo + "T23:59:59";
      adapter.getPaymentsSummaryByMethod(dateFromTs, dateToTs).then(setPaymentSummary).catch(() => {});
      adapter.getActiveShopPaymentMethods().then((methods) => {
        setActivePaymentMethods(methods.map((m) => ({ key: m.key, label: m.label })));
      }).catch(() => {});
      adapter.getFinancialSummary({ date_from: dateFrom, date_to: dateTo }).then(setFinancialSummary).catch(() => {});
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(activeRange.dateFrom, activeRange.dateTo);
  }, [activeRange.dateFrom, activeRange.dateTo, loadData]);

  const stats = useMemo(() => {
    const pendingApts = periodAppointments.filter((a) => a.status === "pending").length;
    const loyaltyEnabled = shopConfig?.rewards?.loyalty?.enabled || false;
    const visitsRequired = shopConfig?.rewards?.loyalty?.visits_required || 10;
    const eligibleClients = loyaltyEnabled ? clients.filter((c) => (c.total_visits || 0) >= visitsRequired).length : 0;

    const cards = [
      { title: "Citas", value: String(periodAppointments.length), icon: Calendar, sub: `Pendientes: ${pendingApts}`, color: "text-blue-600", bg: "bg-blue-50" },
      { title: "Clientes", value: String(clients.length), icon: Users, sub: "Registrados", color: "text-green-600", bg: "bg-green-50" },
      { title: "Ingresos", value: formatCurrency(periodIncome.reduce((s, i) => s + (i.gross_amount || 0), 0)), icon: DollarSign, sub: `${periodIncome.length} servicios`, color: "text-emerald-600", bg: "bg-emerald-50" },
      { title: "Propinas", value: formatCurrency(periodIncome.reduce((s, i) => s + (i.tip || 0), 0)), icon: Star, sub: "Para barberos", color: "text-purple-600", bg: "bg-purple-50" },
    ];

    if (loyaltyEnabled) {
      cards.push({
        title: "Corte gratis",
        value: String(eligibleClients),
        icon: Trophy,
        sub: `Cada ${visitsRequired} cortes`,
        color: "text-yellow-600",
        bg: "bg-yellow-50",
      });
    }

    cards.push({
      title: "Gastos y retiros",
      value: formatCurrency(financialSummary.totalExpenses + financialSummary.totalWithdrawals),
      icon: TrendingDown,
      sub: `${formatCurrency(financialSummary.totalExpenses)} gastos · ${formatCurrency(financialSummary.totalWithdrawals)} retiros`,
      color: "text-red-600",
      bg: "bg-red-50",
    });

    return cards;
  }, [periodAppointments, clients, periodIncome, shopConfig, financialSummary]);

  // ── Dynamic income chart data ──
  const incomeChartData = useMemo(() => {
    if (isCustomRange) {
      const days = Math.ceil((new Date(customDateTo).getTime() - new Date(customDateFrom).getTime()) / 86400000) + 1;
      if (days <= 31) {
        return buildDailyBuckets(periodIncome, customDateFrom, customDateTo);
      }
      return buildMonthlyBuckets(periodIncome, customDateFrom, customDateTo);
    }

    if (period === "day") return buildHourlyBuckets(periodIncome);
    if (period === "week") return buildWeekdayBuckets(periodIncome);
    if (period === "month") return buildWeeklyBuckets(periodIncome);
    return buildMonthlyBuckets(periodIncome);
  }, [periodIncome, period, isCustomRange, customDateFrom, customDateTo]);

  const incomeChartTitle = useMemo(() => {
    if (isCustomRange) {
      const days = Math.ceil((new Date(customDateTo).getTime() - new Date(customDateFrom).getTime()) / 86400000) + 1;
      if (days <= 31) return "Ingresos diarios";
      return "Ingresos mensuales";
    }
    if (period === "day") return "Ingresos por hora";
    if (period === "week") return "Ingresos por día de la semana";
    if (period === "month") return "Ingresos diarios del mes";
    return "Ingresos mensuales del año";
  }, [period, isCustomRange, customDateFrom, customDateTo]);

  const appointmentPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    appointmentsAll.forEach((a) => {
      const label = a.status === "pending" ? "Pendiente" : a.status === "confirmed" ? "Confirmada" : a.status === "completed" ? "Completada" : "Cancelada";
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [appointmentsAll]);

  const topServices = useMemo(() => {
    const counts: Record<string, { count: number; gross: number }> = {};
    periodIncome.forEach((inc) => {
      const name = inc.service_name || "Desconocido";
      if (!counts[name]) counts[name] = { count: 0, gross: 0 };
      counts[name].count++;
      counts[name].gross += inc.gross_amount || 0;
    });
    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [periodIncome]);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Dashboard" description="Resumen contable de tu barbería" />

      {/* Filter Bar */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Segmented period selector */}
            <div className="inline-flex rounded-lg bg-muted p-0.5">
              {(["day", "week", "month", "year"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    period === p && !isCustomRange
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="h-8 w-[130px] rounded-lg border-muted bg-background text-xs"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="h-8 w-[130px] rounded-lg border-muted bg-background text-xs"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCustomRange}
                disabled={!customDateFrom || !customDateTo || (customDateFrom === customDateTo && !isCustomRange)}
                className={`h-8 rounded-lg px-3 text-xs ${isCustomRange ? "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800" : ""}`}
              >
                Aplicar
              </Button>
              {isCustomRange && (
                <button
                  onClick={clearCustomRange}
                  className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active range summary */}
          <p className="whitespace-nowrap text-xs text-muted-foreground">{activeRange.label}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.title} className="cursor-pointer transition-all hover:shadow-md" onClick={() => setKpiDetail(s.title)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <div className={`rounded-lg p-2 ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Methods Breakdown */}
      {activePaymentMethods.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4 text-blue-600" />Ingresos por método de pago</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-4">
                {activePaymentMethods.map((pm) => {
                  const amount = paymentSummary[pm.key] || 0;
                  const colors: Record<string, string> = { CASH: "text-green-600 bg-green-50", NEQUI: "text-blue-600 bg-blue-50", DAVIPLATA: "text-purple-600 bg-purple-50", CARD: "text-orange-600 bg-orange-50", TRANSFER: "text-cyan-600 bg-cyan-50", OTHER: "text-gray-600 bg-gray-50" };
                  return (
                    <div key={pm.key} className={`rounded-lg p-4 text-center min-w-[120px] flex-1 max-w-[180px] ${colors[pm.key] || "text-gray-600 bg-gray-50"}`}>
                      <p className="text-xs font-medium mb-1">{pm.label}</p>
                      <p className="text-lg font-bold">{formatCurrency(amount)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <span className="text-sm font-medium">Total: {formatCurrency(Object.values(paymentSummary).reduce((s, v) => s + v, 0))}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Financial Summary: Expenses & Withdrawals */}
      {(financialSummary.totalExpenses > 0 || financialSummary.totalWithdrawals > 0) && (
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Gastos del período</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(financialSummary.totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Retiros del período</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(financialSummary.totalWithdrawals)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">Gastos por categoría</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(financialSummary.expensesByCategory).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(financialSummary.expensesByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 4)
                    .map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{cat}</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Dynamic Income Chart */}
        <Card>
          <CardHeader><CardTitle className="text-base">{incomeChartTitle}</CardTitle></CardHeader>
          <CardContent>
            {incomeChartData.every((d) => d.ingresos === 0) ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de ingresos aún</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={incomeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={11} interval={incomeChartData.length > 14 ? Math.floor(incomeChartData.length / 10) : 0} />
                  <YAxis fontSize={12} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#2563EB" radius={[4, 4, 0, 0]} name="Bruto" />
                  <Bar dataKey="comisiones" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Comisiones" />
                  <Bar dataKey="propinas" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Propinas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Appointment Status Pie */}
        <Card>
          <CardHeader><CardTitle className="text-base">Estado de citas</CardTitle></CardHeader>
          <CardContent>
            {appointmentPieData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin citas en este período</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={appointmentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {appointmentPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Upcoming appointments */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-4 w-4 text-blue-600" />Próximas citas</CardTitle></CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Sin citas próximas</p>
            ) : (
              <div className="space-y-2">
                {upcomingAppointments.map((a) => (
                  <div key={a.appointment_id} className="flex items-center justify-between rounded-lg border p-2">
                    <div>
                      <p className="text-sm font-medium">{a.client_name}</p>
                      <p className="text-xs text-muted-foreground">{a.barber_name} — {a.service_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{a.date}</p>
                      <p className="text-xs text-muted-foreground">{a.start_time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts / Pending */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-500" />Alertas y pendientes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800">{pendingRequests.length} servicio(s) pendiente(s) de aprobación</p>
                  {pendingRequests.slice(0, 3).map((r) => (
                    <p key={r.request_id} className="mt-1 text-xs text-amber-700">
                      {r.barber_name} — {r.service_name} — {formatCurrency(r.price_charged)}
                    </p>
                  ))}
                </div>
              )}
              {periodAppointments.filter((a) => a.status === "pending").length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-800">
                    {periodAppointments.filter((a) => a.status === "pending").length} cita(s) sin confirmar
                  </p>
                </div>
              )}
              {pendingRequests.length === 0 && periodAppointments.filter((a) => a.status === "pending").length === 0 && (
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <Clock className="mb-2 h-8 w-8" />
                  <p className="text-sm">Todo al día</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top services */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Scissors className="h-4 w-4 text-purple-600" />Servicios más vendidos</CardTitle></CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Sin datos aún</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} servicios — {formatCurrency(s.gross)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI Detail Modal */}
      <Dialog open={!!kpiDetail} onOpenChange={() => setKpiDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{kpiDetail}</DialogTitle>
          </DialogHeader>
          {kpiDetail === "Citas" && (
            <div className="space-y-2">
              {periodAppointments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin citas en este período</p>
              ) : periodAppointments.map((a) => (
                <div key={a.appointment_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{a.client_name}</p>
                    <p className="text-xs text-muted-foreground">{a.barber_name} — {a.service_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{a.date}</p>
                    <p className="text-xs text-muted-foreground">{a.start_time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {kpiDetail === "Clientes" && (
            <div className="space-y-2">
              {clients.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin clientes</p>
              ) : clients.slice(0, 50).map((c) => (
                <div key={c.client_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone || "Sin teléfono"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.total_visits || 0} visitas</p>
                </div>
              ))}
              {clients.length > 50 && <p className="text-xs text-muted-foreground text-center">Mostrando 50 de {clients.length}</p>}
            </div>
          )}
          {kpiDetail === "Ingresos" && (
            <div className="space-y-2">
              {periodIncome.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin ingresos en este período</p>
              ) : periodIncome.map((inc) => (
                <div key={inc.income_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{inc.service_name}</p>
                    <p className="text-xs text-muted-foreground">{inc.barber_name} — {inc.date}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(inc.gross_amount)}</p>
                </div>
              ))}
            </div>
          )}
          {kpiDetail === "Propinas" && (
            <div className="space-y-2">
              {periodIncome.filter((i) => i.tip > 0).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin propinas en este período</p>
              ) : periodIncome.filter((i) => i.tip > 0).map((inc) => (
                <div key={inc.income_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{inc.service_name}</p>
                    <p className="text-xs text-muted-foreground">{inc.barber_name} — {inc.date}</p>
                  </div>
                  <p className="text-sm font-bold text-purple-600">{formatCurrency(inc.tip)}</p>
                </div>
              ))}
            </div>
          )}
          {kpiDetail === "Corte gratis" && (
            <div className="space-y-2">
              {clients.filter((c) => (c.total_visits || 0) >= (shopConfig?.rewards?.loyalty?.visits_required || 10)).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Sin clientes elegibles</p>
              ) : clients.filter((c) => (c.total_visits || 0) >= (shopConfig?.rewards?.loyalty?.visits_required || 10)).map((c) => (
                <div key={c.client_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <p className="text-sm font-bold text-yellow-600">{c.total_visits || 0} visitas</p>
                </div>
              ))}
            </div>
          )}
          {kpiDetail === "Gastos y retiros" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Detalles completos disponibles en la sección de gastos.</p>
              <Button onClick={() => { setKpiDetail(null); navigate("/expenses"); }}>
                Ir a Gastos y Retiros
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Chart bucket builders ──

type ChartBucket = { label: string; ingresos: number; comisiones: number; propinas: number };

function buildHourlyBuckets(incs: IncomeRecord[]): ChartBucket[] {
  const buckets: ChartBucket[] = [];
  for (let h = 7; h <= 21; h++) {
    const label = `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`;
    const filtered = incs.filter((inc) => {
      const d = new Date(inc.recorded_at);
      return d.getHours() === h;
    });
    buckets.push({
      label,
      ingresos: filtered.reduce((s, i) => s + (i.gross_amount || 0), 0),
      comisiones: filtered.reduce((s, i) => s + (i.commission_amount || 0), 0),
      propinas: filtered.reduce((s, i) => s + (i.tip || 0), 0),
    });
  }
  return buckets;
}

function buildWeekdayBuckets(incs: IncomeRecord[]): ChartBucket[] {
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  return dayNames.map((name, i) => {
    const filtered = incs.filter((inc) => {
      const d = new Date(inc.date + "T12:00:00");
      const jsDay = d.getDay();
      return (jsDay === 0 ? 6 : jsDay - 1) === i;
    });
    return {
      label: name,
      ingresos: filtered.reduce((s, j) => s + (j.gross_amount || 0), 0),
      comisiones: filtered.reduce((s, j) => s + (j.commission_amount || 0), 0),
      propinas: filtered.reduce((s, j) => s + (j.tip || 0), 0),
    };
  });
}

function buildWeeklyBuckets(incs: IncomeRecord[]): ChartBucket[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const buckets: ChartBucket[] = [];
  let weekStart = 1;
  let weekNum = 1;
  while (weekStart <= daysInMonth) {
    const weekEnd = Math.min(weekStart + 6, daysInMonth);
    const filtered = incs.filter((inc) => {
      if (!inc.date.startsWith(monthPrefix)) return false;
      const day = parseInt(inc.date.split("-")[2], 10);
      return day >= weekStart && day <= weekEnd;
    });
    const startLabel = `${weekStart}/${month + 1}`;
    const endLabel = `${weekEnd}/${month + 1}`;
    buckets.push({
      label: `Sem ${weekNum} (${startLabel}–${endLabel})`,
      ingresos: filtered.reduce((s, i) => s + (i.gross_amount || 0), 0),
      comisiones: filtered.reduce((s, i) => s + (i.commission_amount || 0), 0),
      propinas: filtered.reduce((s, i) => s + (i.tip || 0), 0),
    });
    weekStart = weekEnd + 1;
    weekNum++;
  }
  return buckets;
}

function buildDailyBuckets(incs: IncomeRecord[], from?: string, to?: string): ChartBucket[] {
  if (from && to) {
    const buckets: ChartBucket[] = [];
    const start = new Date(from + "T12:00:00");
    const end = new Date(to + "T12:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
      const filtered = incs.filter((inc) => inc.date === dateStr);
      buckets.push({
        label,
        ingresos: filtered.reduce((s, i) => s + (i.gross_amount || 0), 0),
        comisiones: filtered.reduce((s, i) => s + (i.commission_amount || 0), 0),
        propinas: filtered.reduce((s, i) => s + (i.tip || 0), 0),
      });
    }
    return buckets;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const buckets: ChartBucket[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const label = String(d);
    const filtered = incs.filter((inc) => inc.date === dateStr);
    buckets.push({
      label,
      ingresos: filtered.reduce((s, i) => s + (i.gross_amount || 0), 0),
      comisiones: filtered.reduce((s, i) => s + (i.commission_amount || 0), 0),
      propinas: filtered.reduce((s, i) => s + (i.tip || 0), 0),
    });
  }
  return buckets;
}

function buildMonthlyBuckets(incs: IncomeRecord[], from?: string, to?: string): ChartBucket[] {
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  if (from && to) {
    const buckets: ChartBucket[] = [];
    const startDate = new Date(from + "T12:00:00");
    const endDate = new Date(to + "T12:00:00");
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= endDate) {
      const y = current.getFullYear();
      const m = current.getMonth();
      const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;
      const filtered = incs.filter((inc) => inc.date.startsWith(prefix));
      buckets.push({
        label: `${monthNames[m]} ${y}`,
        ingresos: filtered.reduce((s, i) => s + (i.gross_amount || 0), 0),
        comisiones: filtered.reduce((s, i) => s + (i.commission_amount || 0), 0),
        propinas: filtered.reduce((s, i) => s + (i.tip || 0), 0),
      });
      current.setMonth(current.getMonth() + 1);
    }
    return buckets;
  }
  const now = new Date();
  const year = now.getFullYear();
  return monthNames.map((name, i) => {
    const prefix = `${year}-${String(i + 1).padStart(2, "0")}`;
    const filtered = incs.filter((inc) => inc.date.startsWith(prefix));
    return {
      label: name,
      ingresos: filtered.reduce((s, j) => s + (j.gross_amount || 0), 0),
      comisiones: filtered.reduce((s, j) => s + (j.commission_amount || 0), 0),
      propinas: filtered.reduce((s, j) => s + (j.tip || 0), 0),
    };
  });
}
