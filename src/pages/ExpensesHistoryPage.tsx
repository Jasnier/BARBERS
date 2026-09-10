import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import { RegisterExpenseDialog } from "@/components/cash/RegisterExpenseDialog";
import { RegisterWithdrawalDialog } from "@/components/cash/RegisterWithdrawalDialog";
import {
  ArrowUpCircle,
  X,
  Filter,
  Ban,
  TrendingDown,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import type { AdminMovement, ExpenseCategory } from "@/types";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

const WITHDRAWAL_REASONS: Record<string, string> = {
  RETIRO_PROPIETARIO: "Retiro propietario",
  DEPOSITO_BANCARIO: "Depósito bancario",
  COMPRA_EXTERNA: "Compra externa",
  CAMBIO_EFECTIVO: "Cambio efectivo",
  OTRO: "Otro",
};

export function ExpensesHistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<AdminMovement[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AdminMovement | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (typeFilter !== "all") filters.type = typeFilter;
      if (categoryFilter !== "all") filters.category = categoryFilter;
      if (methodFilter !== "all") filters.payment_method = methodFilter;

      const [movs, cats] = await Promise.all([
        adapter.getAdminMovements(filters),
        adapter.getExpenseCategories(),
      ]);
      setMovements(movs);
      setCategories(cats);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, typeFilter, categoryFilter, methodFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalExpenses = movements.filter((m) => m.type === "EXPENSE" && m.status === "ACTIVE").reduce((s, m) => s + m.amount, 0);
  const totalWithdrawals = movements.filter((m) => m.type === "WITHDRAWAL" && m.status === "ACTIVE").reduce((s, m) => s + m.amount, 0);

  const handleCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelling(true);
    try {
      if (cancelTarget.type === "EXPENSE") {
        await adapter.cancelExpense(cancelTarget.id, cancelReason.trim(), user?.name || "Administrador");
      } else {
        await adapter.cancelWithdrawal(cancelTarget.id, cancelReason.trim(), user?.name || "Administrador");
      }
      setShowCancelDialog(false);
      setCancelTarget(null);
      setCancelReason("");
      loadData();
    } catch (e: any) {
      alert(e.message || "Error al anular");
    } finally {
      setCancelling(false);
    }
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setMethodFilter("all");
  };

  const hasFilters = dateFrom || dateTo || typeFilter !== "all" || categoryFilter !== "all" || methodFilter !== "all";

  return (
    <div>
      <PageHeader title="Gastos y Retiros" description="Historial financiero administrativo">
        <div className="flex gap-2">
          <Button onClick={() => setShowExpenseDialog(true)} size="sm" variant="outline">
            <ArrowUpCircle className="mr-1 h-4 w-4" /> Nuevo gasto
          </Button>
          <Button onClick={() => setShowWithdrawalDialog(true)} size="sm" variant="outline">
            Nuevo retiro
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total gastos</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total retiros</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalWithdrawals)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total general</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses + totalWithdrawals)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-[140px] text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-[140px] text-xs" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="EXPENSE">Gastos</SelectItem>
                  <SelectItem value="WITHDRAWAL">Retiros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Categoría</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Método</Label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="NEQUI">Nequi</SelectItem>
                  <SelectItem value="DAVIPLATA">Daviplata</SelectItem>
                  <SelectItem value="CARD">Tarjeta</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                <X className="mr-1 h-3 w-3" /> Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos ({movements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner size="md" />
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 font-medium">Categoría</th>
                    <th className="pb-2 font-medium">Método</th>
                    <th className="pb-2 font-medium text-right">Monto</th>
                    <th className="pb-2 font-medium">Descripción</th>
                    <th className="pb-2 font-medium">Usuario</th>
                    <th className="pb-2 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const isCancelled = m.status === "CANCELLED";
                    return (
                    <tr key={`${m.type}-${m.id}`} className={`border-b last:border-0 ${isCancelled ? "bg-gray-50 opacity-60" : ""}`}>
                      <td className="py-2.5 whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {isCancelled ? (
                          <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">Anulado</Badge>
                        ) : (
                          <Badge variant={m.type === "EXPENSE" ? "destructive" : "default"} className="text-xs">
                            {m.type === "EXPENSE" ? "Gasto" : "Retiro"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5">
                        {m.type === "EXPENSE" ? m.category : (WITHDRAWAL_REASONS[m.category] || m.category)}
                      </td>
                      <td className="py-2.5">{METHOD_LABELS[m.payment_method] || m.payment_method}</td>
                      <td className={`py-2.5 text-right font-medium ${isCancelled ? "text-gray-400 line-through" : "text-red-600"}`}>
                        -{formatCurrency(m.amount)}
                      </td>
                      <td className="py-2.5 max-w-[200px] truncate text-muted-foreground">
                        {m.description || "—"}
                        {isCancelled && m.cancellation_reason && (
                          <span className="block text-xs text-red-400 mt-0.5">Motivo: {m.cancellation_reason}</span>
                        )}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">{m.created_by_name}</td>
                      <td className="py-2.5 text-right">
                        {m.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                            onClick={() => { setCancelTarget(m); setShowCancelDialog(true); }}
                          >
                            <Ban className="mr-1 h-3 w-3" /> Anular
                          </Button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular {cancelTarget?.type === "EXPENSE" ? "Gasto" : "Retiro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cancelTarget && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p><strong>Monto:</strong> {formatCurrency(cancelTarget.amount)}</p>
                <p><strong>Descripción:</strong> {cancelTarget.description || "—"}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Motivo de anulación</Label>
              <Input
                placeholder="Describe el motivo..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            {cancelTarget?.type === "EXPENSE" && cancelTarget.payment_method === "CASH" && (
              <p className="text-xs text-muted-foreground">
                Se generará un movimiento de ajuste en caja para reversar el efectivo.
              </p>
            )}
            {cancelTarget?.type === "WITHDRAWAL" && (
              <p className="text-xs text-muted-foreground">
                Se generará un movimiento de ajuste en caja para reversar el retiro.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCancelDialog(false); setCancelTarget(null); setCancelReason(""); }}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling ? "Anulando..." : "Anular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RegisterExpenseDialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog} onRegistered={loadData} />
      <RegisterWithdrawalDialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog} onRegistered={loadData} />
    </div>
  );
}
