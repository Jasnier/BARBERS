import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import adapter from "@/services";
import type { Appointment, ShopPaymentMethod } from "@/types";

interface CompleteAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  onCompleted: () => void;
}

export function CompleteAppointmentDialog({ open, onOpenChange, appointment, onCompleted }: CompleteAppointmentDialogProps) {
  const [paymentMethods, setPaymentMethods] = useState<ShopPaymentMethod[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [tip, setTip] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      adapter.getActiveShopPaymentMethods().then((methods) => {
        setPaymentMethods(methods);
        if (methods.length > 0 && !paymentMethod) {
          setPaymentMethod(methods[0].key);
        }
      }).catch(console.error);
    }
  }, [open]);

  const handleComplete = async () => {
    if (!paymentMethod) {
      setError("Selecciona un método de pago");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await adapter.updateAppointmentStatus(appointment.appointment_id, "completed", {
        payment_method: paymentMethod,
        tip: Number(tip) || 0,
        notes: notes,
      });
      onOpenChange(false);
      onCompleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error completando la cita");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Completar cita</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{appointment.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Barbero:</span>
              <span>{appointment.barber_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servicio:</span>
              <span>{appointment.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hora:</span>
              <span>{appointment.start_time} - {appointment.end_time}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de pago *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Propina (opcional)</Label>
            <Input
              type="number"
              value={tip}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTip(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
              placeholder="Observaciones sobre el servicio..."
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleComplete} disabled={saving || !paymentMethod}>
            {saving ? "Completando..." : "Completar cita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
