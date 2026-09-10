import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PromotionDialog } from "@/components/crud/PromotionDialog";
import { Megaphone, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import adapter from "@/services";
import type { Promotion, Service } from "@/types";

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const load = useCallback(() => {
    Promise.all([adapter.getPromotions(), adapter.getServices()])
      .then(([p, s]) => { setPromotions(p); setServices(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta promocion?")) return;
    await adapter.deletePromotion(id);
    load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Promociones" description="Crea ofertas por tiempo limitado para tus servicios">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>Nueva promocion</Button>
      </PageHeader>

      {promotions.length === 0 ? (
        <EmptyState
          title="Sin promociones"
          description="Crea tu primera promocion para atraer mas clientes."
          icon={<Megaphone className="h-6 w-6 text-muted-foreground" />}
          action={{ label: "Nueva promocion", onClick: () => { setEditing(null); setDialogOpen(true); } }}
        />
      ) : (
        <DataTable
          data={promotions as unknown as Record<string, unknown>[]}
          keyField="promotion_id"
          columns={[
            { key: "title", header: "Titulo" },
            { key: "service_name", header: "Servicio", render: (item) => String(item.service_name || "—") },
            { key: "discount", header: "Descuento", render: (item) => {
              const type = item.discount_type as string;
              const val = Number(item.discount_value);
              return type === "percentage" ? `${val}%` : `$${val.toLocaleString("es-CO")}`;
            }},
            { key: "dates", header: "Vigencia", render: (item) => (
              <span className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {String(item.start_date)} al {String(item.end_date)}
              </span>
            )},
            { key: "actions", header: "", render: (item) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(promotions.find(p => p.promotion_id === item.promotion_id) || null); setDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(String(item.promotion_id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )},
          ]}
        />
      )}

      <PromotionDialog open={dialogOpen} onOpenChange={setDialogOpen} promotion={editing} services={services} onSaved={load} />
    </div>
  );
}
