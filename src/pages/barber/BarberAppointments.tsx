import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/utils";
import adapter from "@/services";
import type { Appointment, AppointmentStatus } from "@/types";

const statusColors: Record<AppointmentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Pendiente", confirmed: "Confirmada", in_progress: "En curso",
  completed: "Completada", cancelled: "Cancelada", no_show: "No asistió",
};

export function BarberAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user?.barber_id) return;
    const today = new Date().toISOString().split("T")[0];
    adapter.getAppointments({ date_from: today, barber_id: user.barber_id })
      .then(setAppointments).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (id: string, status: AppointmentStatus) => {
    await adapter.updateAppointmentStatus(id, status);
    load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Mis citas" description="Citas de hoy en adelante" />

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Calendar className="mb-4 h-12 w-12" />
          <p>No tienes citas</p>
        </div>
      ) : (
        <DataTable
          data={appointments as unknown as Record<string, unknown>[]}
          keyField="appointment_id"
          columns={[
            { key: "client_name", header: "Cliente" },
            { key: "service_name", header: "Servicio" },
            { key: "start_time", header: "Hora", render: (item) => `${formatTime(String(item.start_time))} - ${formatTime(String(item.end_time))}` },
            { key: "status", header: "Estado", render: (item) => (
              <Badge className={statusColors[item.status as AppointmentStatus]}>
                {statusLabels[item.status as AppointmentStatus]}
              </Badge>
            )},
            { key: "actions", header: "", render: (item) => {
              const status = item.status as AppointmentStatus;
              return (
                <div className="flex gap-1">
                  {status === "confirmed" && (
                    <Button variant="ghost" size="sm" onClick={() => handleStatus(String(item.appointment_id), "in_progress")}>
                      <Clock className="h-4 w-4 text-purple-600" />
                    </Button>
                  )}
                  {status === "in_progress" && (
                    <Button variant="ghost" size="sm" onClick={() => handleStatus(String(item.appointment_id), "completed")}>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  {(status === "pending" || status === "confirmed") && (
                    <Button variant="ghost" size="sm" onClick={() => handleStatus(String(item.appointment_id), "cancelled")}>
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              );
            }},
          ]}
        />
      )}
    </div>
  );
}
