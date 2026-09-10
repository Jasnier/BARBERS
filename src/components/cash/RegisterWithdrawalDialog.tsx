import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRegistered: () => void;
}

const REASONS: { value: string; label: string }[] = [
  { value: "RETIRO_PROPIETARIO", label: "Retiro del propietario" },
  { value: "DEPOSITO_BANCARIO", label: "Depósito bancario" },
  { value: "COMPRA_EXTERNA", label: "Compra externa" },
  { value: "CAMBIO_EFECTIVO", label: "Cambio de efectivo" },
  { value: "OTRO", label: "Otro" },
];

export function RegisterWithdrawalDialog({ open, onOpenChange, onRegistered }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableCash, setAvailableCash] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      adapter.getAvailableCash().then(setAvailableCash).catch(() => setAvailableCash(null));
    } else {
      setAvailableCash(null);
    }
  }, [open]);

  const parsedAmount = parseFloat(amount) || 0;
  const exceedsAvailable = availableCash !== null && parsedAmount > availableCash;

  const handleSubmit = async () => {
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError("Ingresa un monto válido"); return; }
    if (!reason) { setError("Selecciona el motivo del retiro"); return; }
    if (availableCash !== null && parsedAmount > availableCash) {
      setError("No hay suficiente efectivo disponible en caja");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await adapter.createWithdrawal({
        amount: parsedAmount,
        reason,
        description: note.trim(),
        created_by_name: user?.name || "Administrador",
      });
      onOpenChange(false);
      setAmount("");
      setReason("");
      setNote("");
      onRegistered();
    } catch (e: any) {
      setError(e.message || "Error al registrar retiro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5" /> Registrar Retiro de Efectivo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {availableCash !== null && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Efectivo disponible</p>
              <p className="text-lg font-bold">{formatCurrency(availableCash)}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Monto</Label>
            <Input type="number" placeholder="0" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} min="0" />
            {parsedAmount > 0 && (
              <p className={`text-sm ${exceedsAvailable ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                {formatCurrency(parsedAmount)}{exceedsAvailable && " — Excede el disponible"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Input placeholder="Detalle adicional..." value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || exceedsAvailable}>
            {loading ? "Registrando..." : "Registrar retiro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
