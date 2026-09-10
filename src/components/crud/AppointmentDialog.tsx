import { useState, useEffect, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import adapter from "@/services";
import type { Barber, Client, Service, Appointment } from "@/types";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onSaved: () => void;
}

export function AppointmentDialog({ open, onOpenChange, appointment, onSaved }: AppointmentDialogProps) {
  const isEdit = !!appointment;
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [barberId, setBarberId] = useState("");
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (open) {
      setBarberId(appointment?.barber_id || "");
      setClientId(appointment?.client_id || "");
      setServiceId(appointment?.service_id || "");
      setDate(appointment?.date && appointment.date >= today ? appointment.date : today);
      setStartTime(appointment?.start_time || "10:00");
      setEndTime(appointment?.end_time || "10:30");
      setNotes(appointment?.notes || "");
      setError("");
      Promise.all([adapter.getBarbers(), adapter.getClients(), adapter.getServices()])
        .then(([b, c, s]) => { setBarbers(b); setClients(c); setServices(s); })
        .catch(console.error);
    }
  }, [open, appointment, today]);

  const selectedService = services.find((s) => s.service_id === serviceId);

  const handleServiceChange = (sid: string) => {
    setServiceId(sid);
    const svc = services.find((s) => s.service_id === sid);
    if (svc && startTime) {
      const [h, m] = startTime.split(":").map(Number);
      const endMin = h * 60 + m + svc.duration_min;
      const eh = String(Math.floor(endMin / 60)).padStart(2, "0");
      const em = String(endMin % 60).padStart(2, "0");
      setEndTime(`${eh}:${em}`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (date < today) {
      setError("La fecha no puede ser anterior a hoy");
      return;
    }

    setLoading(true);
    try {
      const data = {
        client_id: clientId,
        barber_id: barberId,
        service_id: serviceId,
        date, start_time: startTime, end_time: endTime,
        status: (appointment?.status || "pending") as Appointment["status"],
        notes,
        created_by: "",
      } as Omit<Appointment, "appointment_id" | "created_at">;
      if (isEdit && appointment) {
        await adapter.updateAppointment(appointment.appointment_id, data);
      } else {
        await adapter.createAppointment(data);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cita" : "Nueva cita"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.client_id} value={c.client_id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Barbero *</Label>
            <Select value={barberId} onValueChange={setBarberId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar barbero" /></SelectTrigger>
              <SelectContent>
                {barbers.map((b) => (
                  <SelectItem key={b.barber_id} value={b.barber_id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Servicio *</Label>
            <Select value={serviceId} onValueChange={handleServiceChange}>
              <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.service_id} value={s.service_id}>{s.name} — ${s.price}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService && (
              <p className="text-xs text-muted-foreground">Duración: {selectedService.duration_min} min</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fecha *</Label>
            <Input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inicio *</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Fin *</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
