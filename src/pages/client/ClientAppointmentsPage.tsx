import { useEffect, useState } from "react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { Appointment, Barber, Service, Schedule, DayOfWeek } from "@/types";

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  pending: { label: "Pendiente", icon: Clock, color: "text-yellow-700", bg: "bg-yellow-100" },
  confirmed: { label: "Confirmada", icon: CheckCircle, color: "text-blue-700", bg: "bg-blue-100" },
  in_progress: { label: "En progreso", icon: AlertCircle, color: "text-purple-700", bg: "bg-purple-100" },
  completed: { label: "Completada", icon: CheckCircle, color: "text-green-700", bg: "bg-green-100" },
  cancelled: { label: "Cancelada", icon: XCircle, color: "text-red-700", bg: "bg-red-100" },
  no_show: { label: "No asistio", icon: XCircle, color: "text-gray-700", bg: "bg-gray-100" },
};

const dayKeys: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function getDayOfWeek(dateStr: string): DayOfWeek {
  const d = new Date(dateStr + "T12:00:00");
  return dayKeys[(d.getDay() + 6) % 7];
}

function generateTimeSlots(start: string, end: string, durationMin: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (mins + durationMin <= endMins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    mins += durationMin;
  }
  return slots;
}

function getMinMaxDate() {
  const today = new Date();
  const max = new Date(today);
  max.setDate(max.getDate() + 30);
  return {
    min: today.toISOString().split("T")[0],
    max: max.toISOString().split("T")[0],
  };
}

export function ClientAppointmentsPage() {
  const { client } = useClientAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const { min: minDate, max: maxDate } = getMinMaxDate();

  const loadData = async () => {
    if (!client) return;
    const [apts, brbs, svcs] = await Promise.all([
      adapter.getClientAppointments(client.client_id),
      adapter.getBarbers(),
      adapter.getServices(),
    ]);
    setAppointments(apts);
    setBarbers(brbs);
    setServices(svcs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [client]);

  useEffect(() => {
    if (!selectedBarber) { setSchedules([]); return; }
    adapter.getSchedules(selectedBarber).then(setSchedules).catch(console.error);
  }, [selectedBarber]);

  useEffect(() => { setSelectedTime(""); }, [selectedDate, selectedBarber]);

  const selectedServiceObj = services.find((s) => s.service_id === selectedService);
  const durationMin = selectedServiceObj?.duration_min || 30;

  const getAvailableSlots = (): string[] => {
    if (!selectedBarber || !selectedDate) return [];
    const dow = getDayOfWeek(selectedDate);
    const barberSchedule = schedules.find((s) => s.barber_id === selectedBarber && s.day_of_week === dow && s.active);
    if (!barberSchedule) return [];
    const allSlots = generateTimeSlots(barberSchedule.start_time, barberSchedule.end_time, durationMin);

    const bookedTimes = appointments
      .filter((a) => a.barber_id === selectedBarber && a.date === selectedDate && a.status !== "cancelled")
      .map((a) => a.start_time);

    return allSlots.filter((slot) => {
      const slotEnd = new Date(`2000-01-01T${slot}:00`);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMin);
      const slotEndStr = `${String(slotEnd.getHours()).padStart(2, "0")}:${String(slotEnd.getMinutes()).padStart(2, "0")}`;
      return !bookedTimes.some((bt) => slot < bt && slotEndStr > bt);
    });
  };

  const availableSlots = getAvailableSlots();

  const handleBook = async () => {
    if (!client || !selectedBarber || !selectedService || !selectedDate || !selectedTime) return;
    setError("");
    setSubmitting(true);
    try {
      const svc = services.find((s) => s.service_id === selectedService);
      const end = new Date(`2000-01-01T${selectedTime}:00`);
      end.setMinutes(end.getMinutes() + (svc?.duration_min || 30));
      const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

      await adapter.createAppointment({
        client_id: client.client_id,
        client_name: client.name,
        barber_id: selectedBarber,
        service_id: selectedService,
        date: selectedDate,
        start_time: selectedTime,
        end_time: endTime,
        status: "pending",
        notes: "",
        created_by: "client",
      });

      setSuccess("Cita solicitada correctamente. Pendiente de confirmacion.");
      setShowBooking(false);
      setSelectedBarber("");
      setSelectedService("");
      setSelectedDate("");
      setSelectedTime("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agendar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const upcoming = appointments.filter((a) => ["pending", "confirmed", "in_progress"].includes(a.status));
  const past = appointments.filter((a) => ["completed", "cancelled", "no_show"].includes(a.status));

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Citas</h1>
          <p className="text-sm text-muted-foreground">Agenda y historial de citas</p>
        </div>
        <Button onClick={() => { setShowBooking(!showBooking); setError(""); setSuccess(""); }}>
          <Plus className="mr-1 h-4 w-4" /> Nueva cita
        </Button>
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {showBooking && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader><CardTitle className="text-lg">Agendar nueva cita</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Barbero *</Label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
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
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.service_id} value={s.service_id}>
                      {s.name} - {formatCurrency(s.price)} ({s.duration_min} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input
                type="date"
                min={minDate}
                max={maxDate}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {selectedBarber && selectedDate && (
              <div className="space-y-2">
                <Label>Horario disponible *</Label>
                {schedules.filter((s) => s.barber_id === selectedBarber && s.active).length === 0 ? (
                  <p className="text-sm text-amber-600">Este barbero no tiene horario configurado</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay horarios disponibles para esta fecha</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          selectedTime === slot
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowBooking(false)}>Cancelar</Button>
              <Button
                onClick={handleBook}
                disabled={submitting || !selectedBarber || !selectedService || !selectedDate || !selectedTime}
              >
                {submitting ? "Agendando..." : "Agendar cita"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Proximas</h2>
        {upcoming.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">No tienes citas proximas</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => {
              const st = statusConfig[a.status] || statusConfig.pending;
              return (
                <Card key={a.appointment_id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{a.service_name}</p>
                      <p className="text-xs text-muted-foreground">Con {a.barber_name}</p>
                      <p className="text-xs text-muted-foreground">{a.date} a las {a.start_time}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${st.bg} ${st.color}`}>
                      <st.icon className="h-3 w-3" /> {st.label}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Historial</h2>
        {past.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Sin historial</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {past.map((a) => {
              const st = statusConfig[a.status] || statusConfig.pending;
              return (
                <Card key={a.appointment_id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <Calendar className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{a.service_name}</p>
                      <p className="text-xs text-muted-foreground">Con {a.barber_name}</p>
                      <p className="text-xs text-muted-foreground">{a.date} a las {a.start_time}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${st.bg} ${st.color}`}>
                      <st.icon className="h-3 w-3" /> {st.label}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
