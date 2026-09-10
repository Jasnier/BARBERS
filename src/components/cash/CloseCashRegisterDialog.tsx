import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import { Lock } from "lucide-react";
import type { CashRegister } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  register: CashRegister;
  onClosed: () => void;
}

const CLOSING_REASONS = [
  { value: "OK", label: "Caja cuadrada" },
  { value: "ERROR_PAYMENT", label: "Error al registrar pago" },
  { value: "MISSING_WITHDRAWAL", label: "Retiro no registrado" },
  { value: "ERROR_CHANGE", label: "Error al entregar cambio" },
  { value: "DIFFERENCE", label: "Diferencia de caja" },
  { value: "OTHER", label: "Otro" },
];

export function CloseCashRegisterDialog({ open, onOpenChange, register, onClosed }: Props) {
  const { user } = useAuth();
  const [countedCash, setCountedCash] = useState("");
  const [closingReason, setClosingReason] = useState("OK");
  const [closingNote, setClosingNote] = useState("");
  const [expectedCash, setExpectedCash] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      adapter.getCashRegisterSummary(register.id).then((sum) => {
        setExpectedCash(sum.expectedCash);
      }).catch(() => setExpectedCash(0));
    }
  }, [open, register.id]);

  const difference = parseFloat(countedCash || "0") - expectedCash;

  const handleSubmit = async () => {
    const parsed = parseFloat(countedCash);
    if (isNaN(parsed) || parsed < 0) {
      setError("Ingresa el efectivo contado");
      return;
    }
    if (difference !== 0 && closingReason === "OK") {
      setError("Selecciona un motivo para la diferencia");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await adapter.closeCashRegister(
        register.id,
        parsed,
        closingNote,
        closingReason,
        user?.name || "Administrador"
      );
      onOpenChange(false);
      setCountedCash("");
      setClosingNote("");
      setClosingReason("OK");
      onClosed();
    } catch (e: any) {
      setError(e.message || "Error al cerrar caja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Cerrar Caja
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Efectivo inicial</span>
              <span className="font-medium">{formatCurrency(register.opening_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Efectivo esperado</span>
              <span className="font-bold text-primary">{formatCurrency(expectedCash)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Efectivo contado</Label>
            <Input
              type="number"
              placeholder="0"
              value={countedCash}
              onChange={(e) => { setCountedCash(e.target.value); setError(""); }}
              min="0"
            />
          </div>

          {countedCash && (
            <div className={`rounded-lg p-3 text-center ${difference === 0 ? "bg-green-50 text-green-700" : difference > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
              {difference === 0 && <p className="font-semibold">✓ Caja cuadrada</p>}
              {difference > 0 && <p className="font-semibold">Sobrante de {formatCurrency(difference)}</p>}
              {difference < 0 && <p className="font-semibold">Faltante de {formatCurrency(Math.abs(difference))}</p>}
            </div>
          )}

          {difference !== 0 && (
            <div className="space-y-2">
              <Label>Motivo de la diferencia</Label>
              <Select value={closingReason} onValueChange={setClosingReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLOSING_REASONS.filter(r => r.value !== "OK").map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observación (opcional)</Label>
            <Input
              placeholder="Nota de cierre..."
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={loading}>
            {loading ? "Cerrando..." : "Cerrar caja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
