import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ClientDialog } from "@/components/crud/ClientDialog";
import { Users, Phone, Mail, Pencil, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import adapter from "@/services";
import type { Client } from "@/types";

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const load = useCallback(() => {
    adapter.getClients().then(setClients).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    await adapter.deleteClient(id);
    load();
  };

  const handleApprove = async (id: string) => {
    await adapter.approveClient(id);
    load();
  };

  const handleReject = async (id: string) => {
    if (!confirm("¿Rechazar y eliminar este cliente pendiente?")) return;
    await adapter.rejectClient(id);
    load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const pending = clients.filter((c) => !c.active);
  const active = clients.filter((c) => c.active);

  return (
    <div>
      <PageHeader title="Clientes" description="Gestiona tu base de clientes">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>Nuevo cliente</Button>
      </PageHeader>

      {/* Pending clients */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-amber-700">
            <Clock className="h-4 w-4" /> Pendientes de aprobación ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((c) => (
              <div key={c.client_id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone || "sin teléfono"} • PIN: {c.pin_hash ? "••••" : "sin PIN"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => handleApprove(c.client_id)}>
                    <CheckCircle className="mr-1 h-4 w-4" /> Aprobar
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-red-300 hover:bg-red-50" onClick={() => handleReject(c.client_id)}>
                    <XCircle className="mr-1 h-4 w-4" /> Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active clients */}
      {active.length === 0 && pending.length === 0 ? (
        <EmptyState
          title="Sin clientes registrados"
          description="Agrega tu primer cliente para comenzar."
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
          action={{ label: "Nuevo cliente", onClick: () => { setEditing(null); setDialogOpen(true); } }}
        />
      ) : (
        <DataTable
          data={active as unknown as Record<string, unknown>[]}
          keyField="client_id"
          columns={[
            { key: "name", header: "Nombre" },
            { key: "phone", header: "Teléfono", render: (item) => (
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {String(item.phone || "")}</span>
            )},
            { key: "email", header: "Email", render: (item) => (
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {String(item.email || "—")}</span>
            )},
            { key: "total_visits", header: "Visitas", render: (item) => String(item.total_visits ?? 0) },
            { key: "last_visit", header: "Última", render: (item) => item.last_visit ? formatDate(String(item.last_visit)) : "—" },
            { key: "actions", header: "", render: (item) => (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(clients.find(c => c.client_id === item.client_id) || null); setDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(String(item.client_id))}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )},
          ]}
        />
      )}

      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editing} onSaved={load} />
    </div>
  );
}
