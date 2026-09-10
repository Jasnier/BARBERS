import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import adapter from "@/services";
import type { Schedule, DayOfWeek } from "@/types";

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

interface BarberScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberId: string;
  barberName: string;
}

export function BarberScheduleDialog({ open, onOpenChange, barberId, barberName }: BarberScheduleDialogProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !barberId) return;
    setLoading(true);
    adapter.getSchedules(barberId)
      .then((existing) => {
        const byDay: Record<string, Schedule> = {};
        existing.forEach((s) => { byDay[s.day_of_week] = s; });
        setSchedules(DAYS.map((d) => byDay[d.value] || {
          schedule_id: "",
          barber_id: barberId,
          day_of_week: d.value,
          start_time: "09:00",
          end_time: "18:00",
          active: false,
        }));
      })
      .catch(() => setSchedules(
        DAYS.map((d) => ({
          schedule_id: "",
          barber_id: barberId,
          day_of_week: d.value,
          start_time: "09:00",
          end_time: "18:00",
          active: d.value !== "sunday",
        }))
      ))
      .finally(() => setLoading(false));
  }, [open, barberId]);

  const updateSchedule = (dayIndex: number, field: keyof Schedule, value: string | boolean) => {
    setSchedules((prev) => prev.map((s, i) => i === dayIndex ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const toSave = schedules.filter((s) => s.active || s.schedule_id).map(({ schedule_id, ...rest }) => rest);
      await adapter.updateSchedules(barberId, toSave);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Error guardando horarios");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Horario — {barberName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando horarios...</div>
        ) : (
          <div className="space-y-3">
            {DAYS.map((d, i) => {
              const s = schedules[i];
              return (
                <div key={d.value} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${s.active ? "bg-white" : "bg-muted/50"}`}>
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-medium">{d.label}</p>
                  </div>
                  <Button
                    type="button"
                    variant={s.active ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-3 text-xs"
                    onClick={() => updateSchedule(i, "active", !s.active)}
                  >
                    {s.active ? "Activo" : "Inactivo"}
                  </Button>
                  {s.active && (
                    <div className="flex items-center gap-2 flex-1">
                      <div className="space-y-1">
                        <Label className="text-xs">Inicio</Label>
                        <Input
                          type="time"
                          value={s.start_time}
                          onChange={(e) => updateSchedule(i, "start_time", e.target.value)}
                          className="h-8 w-28"
                        />
                      </div>
                      <span className="text-muted-foreground mt-4">—</span>
                      <div className="space-y-1">
                        <Label className="text-xs">Fin</Label>
                        <Input
                          type="time"
                          value={s.end_time}
                          onChange={(e) => updateSchedule(i, "end_time", e.target.value)}
                          className="h-8 w-28"
                        />
                      </div>
                    </div>
                  )}
                  {!s.active && (
                    <p className="text-xs text-muted-foreground flex-1">No labora</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar horarios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
