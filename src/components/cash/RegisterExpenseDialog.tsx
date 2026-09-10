import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpCircle } from "lucide-react";
import type { PaymentMethod, ExpenseCategory } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRegistered: () => void;
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "NEQUI", label: "Nequi" },
  { value: "DAVIPLATA", label: "Daviplata" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "OTHER", label: "Otro" },
];

export function RegisterExpenseDialog({ open, onOpenChange, onRegistered }: Props) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      adapter.getExpenseCategories().then(setCategories).catch(() => {});
    }
  }, [open]);

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!categoryId) { setError("Selecciona una categoría"); return; }
    if (isNaN(parsed) || parsed <= 0) { setError("Ingresa un monto válido"); return; }
    if (!description.trim()) { setError("Ingresa una descripción"); return; }

    setLoading(true);
    setError("");
    try {
      await adapter.createExpense({
        category_id: categoryId,
        amount: parsed,
        payment_method: method,
        description: description.trim(),
        created_by_name: user?.name || "Administrador",
      });
      onOpenChange(false);
      setCategoryId("");
      setAmount("");
      setDescription("");
      onRegistered();
    } catch (e: any) {
      setError(e.message || "Error al registrar gasto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5" /> Registrar Gasto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Monto</Label>
            <Input type="number" placeholder="0" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} min="0" />
            {amount && !isNaN(parseFloat(amount)) && (
              <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(amount))}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {method === "CASH" && (
              <p className="text-xs text-muted-foreground">Se descontará del efectivo en caja</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input placeholder="Ej: Compra de navajas" value={description} onChange={(e) => { setDescription(e.target.value); setError(""); }} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Registrando..." : "Registrar gasto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
