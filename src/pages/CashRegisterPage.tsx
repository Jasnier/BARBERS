import { useState, useEffect, useCallback } from "react";
import { Wallet, Lock, Unlock, ArrowDownCircle, ArrowUpCircle, Receipt, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import type { CashRegister, CashMovement, CashRegisterSummary, PaymentMethod } from "@/types";
import { OpenCashRegisterDialog } from "@/components/cash/OpenCashRegisterDialog";
import { CloseCashRegisterDialog } from "@/components/cash/CloseCashRegisterDialog";
import { RegisterExpenseDialog } from "@/components/cash/RegisterExpenseDialog";
import { RegisterWithdrawalDialog } from "@/components/cash/RegisterWithdrawalDialog";
import { CashMovementsList } from "@/components/cash/CashMovementsList";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

export function CashRegisterPage() {
  const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null);
  const [summary, setSummary] = useState<CashRegisterSummary | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showMovements, setShowMovements] = useState(false);

  const loadRegister = useCallback(async () => {
    try {
      const reg = await adapter.getOpenCashRegister();
      setActiveRegister(reg);
      if (reg) {
        const [sum, movs] = await Promise.all([
          adapter.getCashRegisterSummary(reg.id),
          adapter.getCashMovements(reg.id),
        ]);
        setSummary(sum);
        setMovements(movs);
      }
    } catch {
      setActiveRegister(null);
      setSummary(null);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRegister(); }, [loadRegister]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeRegister) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6" /> Caja
            </h1>
            <p className="text-muted-foreground">Gestión diaria de la caja</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lock className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Caja Cerrada</h2>
            <p className="text-muted-foreground mb-6 text-center">No hay una caja abierta para hoy.</p>
            <Button size="lg" onClick={() => setShowOpen(true)}>
              <Unlock className="mr-2 h-5 w-5" /> Abrir caja
            </Button>
          </CardContent>
        </Card>
        <OpenCashRegisterDialog open={showOpen} onOpenChange={setShowOpen} onOpened={loadRegister} />
      </div>
    );
  }

  const cashIn = summary?.incomeByMethod?.CASH || 0;
  const cashOut = (summary?.expenseByMethod?.CASH || 0) + (summary?.totalWithdrawal || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Caja
          </h1>
          <p className="text-muted-foreground">
            Abierta por {activeRegister.opened_by_name} a las{" "}
            {new Date(activeRegister.opened_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Badge className="bg-green-100 text-green-700 border-green-200 text-sm">
          <span className="mr-1 h-2 w-2 rounded-full bg-green-500 inline-block" /> ABIERTA
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Efectivo Inicial</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(activeRegister.opening_amount)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ingresos Totales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalIncome || 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Egresos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(summary?.totalExpense || 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Retiros</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-orange-600">{formatCurrency(summary?.totalWithdrawal || 0)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Efectivo Físico Esperado</CardTitle></CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">{formatCurrency(summary?.expectedCash || 0)}</div>
          <p className="text-sm text-muted-foreground mt-1">
            = {formatCurrency(activeRegister.opening_amount)} inicial + {formatCurrency(cashIn)} ingresos efectivo − {formatCurrency(cashOut)} salidas efectivo
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Desglose por Método de Pago</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(summary?.incomeByMethod || {}).map(([method, amount]) => {
              if (!amount || amount === 0) return null;
              return (
                <div key={method} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="text-sm">{METHOD_LABELS[method as PaymentMethod]}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="outline" onClick={() => setShowExpense(true)} className="flex items-center gap-2">
          <ArrowUpCircle className="h-4 w-4" /> Registrar gasto
        </Button>
        <Button variant="outline" onClick={() => setShowWithdrawal(true)} className="flex items-center gap-2">
          <ArrowDownCircle className="h-4 w-4" /> Registrar retiro
        </Button>
        <Button variant="outline" onClick={() => setShowMovements(true)} className="flex items-center gap-2">
          <Receipt className="h-4 w-4" /> Ver movimientos ({movements.length})
        </Button>
        <Button variant="destructive" onClick={() => setShowClose(true)} className="flex items-center gap-2">
          <Lock className="h-4 w-4" /> Cerrar caja
        </Button>
      </div>

      <OpenCashRegisterDialog open={showOpen} onOpenChange={setShowOpen} onOpened={loadRegister} />
      <CloseCashRegisterDialog open={showClose} onOpenChange={setShowClose} register={activeRegister} onClosed={loadRegister} />
      <RegisterExpenseDialog open={showExpense} onOpenChange={setShowExpense} onRegistered={loadRegister} />
      <RegisterWithdrawalDialog open={showWithdrawal} onOpenChange={setShowWithdrawal} onRegistered={loadRegister} />
      <CashMovementsList open={showMovements} onOpenChange={setShowMovements} movements={movements} />
    </div>
  );
}
