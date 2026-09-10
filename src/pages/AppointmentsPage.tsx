import { useEffect, useState, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AppointmentDialog } from "@/components/crud/AppointmentDialog";
import { CompleteAppointmentDialog } from "@/components/crud/CompleteAppointmentDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Pencil, Trash2, CheckCircle, XCircle, Clock, Search, Eye } from "lucide-react";
import { formatTime, formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { Appointment, AppointmentStatus } from "@/types";

const statusColors: Record<AppointmentStatus, string> = {
  pending: "border-yellow-400 bg-yellow-50 text-yellow-800",
  confirmed: "border-blue-400 bg-blue-50 text-blue-800",
  in_progress: "border-purple-400 bg-purple-50 text-purple-800",
  completed: "border-green-400 bg-green-50 text-green-800",
  cancelled: "border-red-400 bg-red-50 text-red-800",
  no_show: "border-gray-400 bg-gray-50 text-gray-800",
};

const statusDotColors: Record<AppointmentStatus, string> = {
  pending: "bg-yellow-400",
  confirmed: "bg-blue-400",
  in_progress: "bg-purple-400",
  completed: "bg-green-400",
  cancelled: "bg-red-400",
  no_show: "bg-gray-400",
};

const statusBadgeColors: Record<AppointmentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const KPI_STATUSES: AppointmentStatus[] = ["pending", "confirmed", "in_progress", "completed", "cancelled"];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};

const KPI_ICONS: Record<AppointmentStatus, React.ReactNode> = {
  pending: <Clock className="h-5 w-5" />,
  confirmed: <CheckCircle className="h-5 w-5" />,
  in_progress: <Clock className="h-5 w-5" />,
  completed: <CheckCircle className="h-5 w-5" />,
  cancelled: <XCircle className="h-5 w-5" />,
  no_show: <XCircle className="h-5 w-5" />,
};

type SortField = "start_time" | "client_name" | "barber_name" | "service_name";

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [completing, setCompleting] = useState<Appointment | null>(null);
  const [detailViewing, setDetailViewing] = useState<Appointment | null>(null);

  const [activeStatus, setActiveStatus] = useState<AppointmentStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("start_time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const load = useCallback(() => {
    adapter.getAppointments({}).then(setAppointments).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: appointments.length };
    for (const a of appointments) {
      c[a.status] = (c[a.status] || 0) + 1;
    }
    return c;
  }, [appointments]);

  const filtered = useMemo(() => {
    let list = [...appointments];
    if (activeStatus !== "all") {
      list = list.filter((a) => a.status === activeStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) =>
        (a.client_name || "").toLowerCase().includes(q) ||
        (a.barber_name || "").toLowerCase().includes(q) ||
        (a.service_name || "").toLowerCase().includes(q) ||
        (a.start_time || "").includes(q)
      );
    }
    list.sort((a, b) => {
      const va = String(a[sortField] || "").toLowerCase();
      const vb = String(b[sortField] || "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return list;
  }, [appointments, activeStatus, searchQuery, sortField, sortDir]);

  const handleStatus = async (id: string, status: AppointmentStatus) => {
    await adapter.updateAppointmentStatus(id, status);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta cita?")) return;
    await adapter.deleteAppointment(id);
    load();
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Agenda" description="Gestiona las citas de tu barbershop">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>Nueva cita</Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {KPI_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(activeStatus === s ? "all" : s)}
            className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
              activeStatus === s ? "ring-2 ring-offset-2 ring-blue-400 border-blue-400" : "border-transparent"
            } ${statusColors[s]}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`rounded-full p-1.5 ${statusDotColors[s]} text-white`}>
                {KPI_ICONS[s]}
              </div>
              <span className="text-2xl font-bold">{counts[s] || 0}</span>
            </div>
            <p className="text-sm font-medium">{statusLabels[s]}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, barbero, servicio o hora..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="start_time">Hora</SelectItem>
            <SelectItem value="client_name">Cliente</SelectItem>
            <SelectItem value="barber_name">Barbero</SelectItem>
            <SelectItem value="service_name">Servicio</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
          {sortDir === "asc" ? "↑ Ascendente" : "↓ Descendente"}
        </Button>
      </div>

      {activeStatus !== "all" && (
        <div className="flex items-center gap-2 mb-3">
          <Badge className={statusBadgeColors[activeStatus]}>{statusLabels[activeStatus]}</Badge>
          <span className="text-sm text-muted-foreground">{filtered.length} cita{filtered.length !== 1 ? "s" : ""}</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setActiveStatus("all")}>
            Limpiar filtro
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin citas"
          description={activeStatus !== "all" ? "No hay citas con este estado." : "Crea una nueva cita para comenzar."}
          icon={<Calendar className="h-6 w-6 text-muted-foreground" />}
          action={activeStatus !== "all" ? undefined : { label: "Nueva cita", onClick: () => { setEditing(null); setDialogOpen(true); } }}
        />
      ) : (
        <div className="rounded-lg border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium cursor-pointer hover:text-blue-600" onClick={() => toggleSort("client_name")}>
                    Cliente{sortIndicator("client_name")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium cursor-pointer hover:text-blue-600" onClick={() => toggleSort("barber_name")}>
                    Barbero{sortIndicator("barber_name")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium cursor-pointer hover:text-blue-600" onClick={() => toggleSort("service_name")}>
                    Servicio{sortIndicator("service_name")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium cursor-pointer hover:text-blue-600" onClick={() => toggleSort("start_time")}>
                    Hora{sortIndicator("start_time")}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.appointment_id} className={`border-b last:border-b-0 transition-colors ${a._expired ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-muted/30"}`}>
                    <td className="px-4 py-3 font-medium">
                      {a.client_name}
                      {a._expired && <span className="ml-2 text-xs text-red-600 font-normal">Vencida</span>}
                    </td>
                    <td className="px-4 py-3">{a.barber_name}</td>
                    <td className="px-4 py-3">{a.service_name}</td>
                    <td className="px-4 py-3">
                      {a._expired && <span className="text-xs text-red-500 mr-1">{a.date}</span>}
                      {formatTime(String(a.start_time))} - {formatTime(String(a.end_time))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={a._expired ? "bg-red-100 text-red-800" : statusBadgeColors[a.status]}>
                        {a._expired ? "Vencida" : statusLabels[a.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" title="Ver detalle" onClick={() => setDetailViewing(a)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {a._expired && (
                          <Button variant="ghost" size="sm" title="Reprogramar" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                            <Clock className="h-4 w-4 text-orange-600" />
                          </Button>
                        )}
                        {a.status === "pending" && !a._expired && (
                          <>
                            <Button variant="ghost" size="sm" title="Confirmar" onClick={() => handleStatus(a.appointment_id, "confirmed")}>
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Cancelar" onClick={() => handleStatus(a.appointment_id, "cancelled")}>
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {a.status === "confirmed" && !a._expired && (
                          <Button variant="ghost" size="sm" title="Iniciar" onClick={() => handleStatus(a.appointment_id, "in_progress")}>
                            <Clock className="h-4 w-4 text-purple-600" />
                          </Button>
                        )}
                        {a.status === "in_progress" && (
                          <Button variant="ghost" size="sm" title="Completar" onClick={() => setCompleting(a)}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {!["completed", "cancelled", "no_show"].includes(a.status) && !a._expired && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(a.appointment_id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AppointmentDialog open={dialogOpen} onOpenChange={setDialogOpen} appointment={editing} onSaved={load} />
      {completing && (
        <CompleteAppointmentDialog
          open={!!completing}
          onOpenChange={(open) => { if (!open) setCompleting(null); }}
          appointment={completing}
          onCompleted={load}
        />
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailViewing} onOpenChange={() => setDetailViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de la cita</DialogTitle>
          </DialogHeader>
          {detailViewing && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge className={statusBadgeColors[detailViewing.status]}>{statusLabels[detailViewing.status]}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{detailViewing.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Barbero:</span>
                  <span>{detailViewing.barber_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servicio:</span>
                  <span>{detailViewing.service_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span>{detailViewing.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hora:</span>
                  <span>{detailViewing.start_time} - {detailViewing.end_time}</span>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3 text-sm">
                <p className="font-medium text-sm">Costos</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Servicio:</span>
                  <span>{formatCurrency(detailViewing.service_price || 0)}</span>
                </div>
                {detailViewing.tip != null && detailViewing.tip > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Propina:</span>
                    <span className="text-green-600">{formatCurrency(detailViewing.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">{formatCurrency((detailViewing.service_price || 0) + (detailViewing.tip || 0))}</span>
                </div>
                {detailViewing.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método de pago:</span>
                    <span className="font-medium">{PAYMENT_LABELS[detailViewing.payment_method] || detailViewing.payment_method}</span>
                  </div>
                )}
              </div>

              {detailViewing.notes && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground mb-1">Notas:</p>
                  <p>{detailViewing.notes}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Creada: {detailViewing.created_at ? new Date(detailViewing.created_at).toLocaleString("es-CO") : "—"}
                {detailViewing.created_by && <span className="ml-2">por {detailViewing.created_by}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
