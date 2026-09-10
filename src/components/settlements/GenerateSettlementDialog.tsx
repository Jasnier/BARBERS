import { useState, useEffect } from "react";
import adapter from "@/services";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import type { Barber, SettlementWithDetails } from "@/types";

interface GenerateSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (settlement: SettlementWithDetails) => void;
}

export function GenerateSettlementDialog({
  open,
  onOpenChange,
  onGenerated,
}: GenerateSettlementDialogProps) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      adapter.getBarbers().then(setBarbers).catch(() => setBarbers([]));
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setPeriodStart(firstDay.toISOString().split("T")[0]);
      setPeriodEnd(lastDay.toISOString().split("T")[0]);
      setSelectedBarber("");
    }
  }, [open]);

  async function handleGenerate() {
    if (!selectedBarber || !periodStart || !periodEnd) {
      alert("Seleccione barbero y período");
      return;
    }
    if (periodStart > periodEnd) {
      alert("La fecha fin debe ser posterior a la inicio");
      return;
    }
    setLoading(true);
    try {
      const settlement = await adapter.generateSettlement({
        barber_id: selectedBarber,
        period_start: periodStart,
        period_end: periodEnd,
        created_by_name: "Admin",
      });
      alert("Liquidación generada");
      onGenerated(settlement);
      onOpenChange(false);
    } catch (err: any) {
      alert(err.message || "No se pudo generar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Generar Liquidación
          </DialogTitle>
          <DialogDescription>
            Seleccione el barbero y el período a liquidar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Barbero</Label>
            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar barbero..." />
              </SelectTrigger>
              <SelectContent>
                {barbers.map((b) => (
                  <SelectItem key={b.barber_id} value={b.barber_id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            Se incluirán todos los servicios del barbero en el período que no hayan sido liquidados previamente.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={loading || !selectedBarber}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Generar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
