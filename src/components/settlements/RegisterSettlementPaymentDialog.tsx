import { useState, useEffect } from "react";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, DollarSign } from "lucide-react";
import type { SettlementWithDetails, PaymentMethod } from "@/types";

interface RegisterSettlementPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlement: SettlementWithDetails | null;
  onPaymentDone: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "NEQUI", label: "Nequi" },
  { value: "DAVIPLATA", label: "Daviplata" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "OTHER", label: "Otro" },
];

export function RegisterSettlementPaymentDialog({
  open,
  onOpenChange,
  settlement,
  onPaymentDone,
}: RegisterSettlementPaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [shopPaymentMethods, setShopPaymentMethods] = useState<string[]>([]);

  useEffect(() => {
    if (open && settlement) {
      const pending = settlement.total_amount - settlement.paid_amount;
      setAmount(String(Math.round(pending)));
      setMethod("CASH");
      setNotes("");

      adapter.getShopPaymentMethods().then((pm) => {
        setShopPaymentMethods(pm.filter((p: any) => p.enabled).map((p: any) => p.method));
      }).catch(() => {});
    }
  }, [open, settlement]);

  async function handlePay() {
    if (!settlement || !amount) return;
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      alert("Monto inválido");
      return;
    }
    const pending = settlement.total_amount - settlement.paid_amount;
    if (amt > pending) {
      alert(`Excede el pendiente. Máximo: ${formatCurrency(pending)}`);
      return;
    }
    setLoading(true);
    try {
      await adapter.registerSettlementPayment(settlement.id, {
        amount: amt,
        payment_method: method,
        notes,
        paid_by_name: "Admin",
      });
      alert(`Pago de ${formatCurrency(amt)} registrado`);
      onPaymentDone();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open || !settlement) return null;
  const pending = settlement.total_amount - settlement.paid_amount;

  const availableMethods = shopPaymentMethods.length > 0
    ? PAYMENT_METHODS.filter((m) => shopPaymentMethods.includes(m.value))
    : PAYMENT_METHODS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Pago a {settlement.barber_name} — Pendiente: {formatCurrency(pending)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Monto</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              max={pending}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setAmount(String(Math.round(pending)))}>
                Total ({formatCurrency(pending)})
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAmount(String(Math.round(pending / 2)))}>
                Mitad
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Referencia, comprobante..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handlePay} disabled={loading || !amount} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Confirmar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
