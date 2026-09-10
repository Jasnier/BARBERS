import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import { Unlock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpened: () => void;
}

export function OpenCashRegisterDialog({ open, onOpenChange, onOpened }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) {
      setError("Ingresa un monto válido");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await adapter.openCashRegister(parsed, user?.name || "Administrador");
      onOpenChange(false);
      setAmount("");
      onOpened();
    } catch (e: any) {
      setError(e.message || "Error al abrir caja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" /> Abrir Caja
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Fecha: {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <p className="text-sm text-muted-foreground">
            Usuario: {user?.name}
          </p>
          <div className="space-y-2">
            <Label>Efectivo inicial</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(""); }}
              min="0"
            />
            {amount && !isNaN(parseFloat(amount)) && (
              <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(amount))}</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Abriendo..." : "Abrir caja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
