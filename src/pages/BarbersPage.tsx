import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { BarberDialog } from "@/components/crud/BarberDialog";
import { BarberScheduleDialog } from "@/components/crud/BarberScheduleDialog";
import { UserCog, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import adapter from "@/services";
import type { Barber } from "@/types";

export function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [scheduleBarber, setScheduleBarber] = useState<Barber | null>(null);

  const load = useCallback(() => {
    adapter.getBarbers().then(setBarbers).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este barbero?")) return;
    await adapter.deleteBarber(id);
    load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Barberos" description="Gestiona tu equipo de trabajo">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>Nuevo barbero</Button>
      </PageHeader>

      {barbers.length === 0 ? (
        <EmptyState
          title="Sin barberos registrados"
          description="Agrega tu primer barbero para comenzar."
          icon={<UserCog className="h-6 w-6 text-muted-foreground" />}
          action={{ label: "Nuevo barbero", onClick: () => { setEditing(null); setDialogOpen(true); } }}
        />
      ) : (
        <DataTable
          data={barbers as unknown as Record<string, unknown>[]}
          keyField="barber_id"
          columns={[
            { key: "name", header: "Nombre" },
            { key: "specialty", header: "Especialidad" },
            { key: "commission_rate", header: "Comisión", render: (item) => `${Number(item.commission_rate ?? 0)}%` },
            { key: "active", header: "Estado", render: (item) => (
              <Badge variant={item.active ? "default" : "secondary"}>{item.active ? "Activo" : "Inactivo"}</Badge>
            )},
            { key: "actions", header: "", render: (item) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setScheduleBarber(barbers.find(b => b.barber_id === item.barber_id) || null); }} title="Horarios">
                  <Clock className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditing(barbers.find(b => b.barber_id === item.barber_id) || null); setDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(String(item.barber_id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )},
          ]}
        />
      )}

      <BarberDialog open={dialogOpen} onOpenChange={setDialogOpen} barber={editing} onSaved={load} />
      {scheduleBarber && (
        <BarberScheduleDialog
          open={!!scheduleBarber}
          onOpenChange={(open) => { if (!open) setScheduleBarber(null); }}
          barberId={scheduleBarber.barber_id}
          barberName={scheduleBarber.name}
        />
      )}
    </div>
  );
}
