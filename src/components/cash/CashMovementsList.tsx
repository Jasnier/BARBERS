import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { CashMovement, CashMovementType, PaymentMethod } from "@/types";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Edit3 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  movements: CashMovement[];
}

const TYPE_CONFIG: Record<CashMovementType, { label: string; icon: typeof ArrowUpCircle; color: string; badge: string }> = {
  INCOME: { label: "Ingreso", icon: ArrowUpCircle, color: "text-green-600", badge: "bg-green-100 text-green-700" },
  EXPENSE: { label: "Egreso", icon: ArrowDownCircle, color: "text-red-600", badge: "bg-red-100 text-red-700" },
  WITHDRAWAL: { label: "Retiro", icon: RefreshCw, color: "text-orange-600", badge: "bg-orange-100 text-orange-700" },
  ADJUSTMENT: { label: "Ajuste", icon: Edit3, color: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

export function CashMovementsList({ open, onOpenChange, movements }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Movimientos de Caja ({movements.length})</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 space-y-2">
          {movements.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No hay movimientos registrados</p>
          )}
          {movements.map((m) => {
            const config = TYPE_CONFIG[m.type];
            const Icon = config.icon;
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                <Icon className={`h-5 w-5 shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${config.badge} text-xs`}>{config.label}</Badge>
                    <span className="text-xs text-muted-foreground">{METHOD_LABELS[m.payment_method]}</span>
                    {m.reference_type && (
                      <span className="text-xs text-muted-foreground">• {m.reference_type}</span>
                    )}
                  </div>
                  <p className="text-sm truncate">{m.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    {m.created_by_name && ` — ${m.created_by_name}`}
                  </p>
                </div>
                <p className={`font-bold shrink-0 ${m.type === "INCOME" ? "text-green-600" : m.type === "EXPENSE" || m.type === "WITHDRAWAL" ? "text-red-600" : "text-blue-600"}`}>
                  {m.type === "INCOME" ? "+" : "-"}{formatCurrency(m.amount)}
                </p>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
