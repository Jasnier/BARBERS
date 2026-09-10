import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ServiceDialog } from "@/components/crud/ServiceDialog";
import { Scissors, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { Service } from "@/types";

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const load = useCallback(() => {
    adapter.getServices().then(setServices).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    await adapter.deleteService(id);
    load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Servicios" description="Define los servicios y precios de tu barbería">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>Nuevo servicio</Button>
      </PageHeader>

      {services.length === 0 ? (
        <EmptyState
          title="Sin servicios registrados"
          description="Agrega tu primer servicio para comenzar."
          icon={<Scissors className="h-6 w-6 text-muted-foreground" />}
          action={{ label: "Nuevo servicio", onClick: () => { setEditing(null); setDialogOpen(true); } }}
        />
      ) : (
        <DataTable
          data={services as unknown as Record<string, unknown>[]}
          keyField="service_id"
          columns={[
            { key: "name", header: "Nombre" },
            { key: "category", header: "Categoría", render: (item) => <Badge variant="outline">{String(item.category)}</Badge> },
            { key: "price", header: "Precio", render: (item) => formatCurrency(Number(item.price ?? 0)) },
            { key: "duration_min", header: "Duración", render: (item) => `${item.duration_min} min` },
            { key: "active", header: "Estado", render: (item) => (
              <Badge variant={item.active ? "default" : "secondary"}>{item.active ? "Activo" : "Inactivo"}</Badge>
            )},
            { key: "actions", header: "", render: (item) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(services.find(s => s.service_id === item.service_id) || null); setDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(String(item.service_id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )},
          ]}
        />
      )}

      <ServiceDialog open={dialogOpen} onOpenChange={setDialogOpen} service={editing} onSaved={load} />
    </div>
  );
}
