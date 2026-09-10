import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { CheckCircle, XCircle, Eye, Clock } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import adapter from "@/services";
import type { ServiceRequest } from "@/types";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export function AdminReviewPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [rejectDialog, setRejectDialog] = useState<ServiceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailRequest, setDetailRequest] = useState<ServiceRequest | null>(null);
  const [approveDialog, setApproveDialog] = useState<ServiceRequest | null>(null);
  const [approvePaymentMethod, setApprovePaymentMethod] = useState("CASH");
  const [activePaymentMethods, setActivePaymentMethods] = useState<{ key: string; label: string }[]>([]);

  const load = useCallback(() => {
    adapter.getServiceRequests({ status: filter === "all" ? undefined : filter })
      .then(setRequests).catch(console.error).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
    adapter.getActiveShopPaymentMethods().then((methods) => {
      setActivePaymentMethods(methods.map((m) => ({ key: m.key, label: m.label })));
    }).catch(() => {
      setActivePaymentMethods([
        { key: "CASH", label: "Efectivo" },
        { key: "NEQUI", label: "Nequi" },
        { key: "DAVIPLATA", label: "Daviplata" },
        { key: "CARD", label: "Tarjeta" },
        { key: "TRANSFER", label: "Transferencia" },
        { key: "OTHER", label: "Otro" },
      ]);
    });
  }, [load]);

  const handleApprove = async () => {
    if (!approveDialog) return;
    await adapter.reviewServiceRequest(approveDialog.request_id, "approved", undefined, approvePaymentMethod);
    setApproveDialog(null);
    setApprovePaymentMethod("CASH");
    load();
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    await adapter.reviewServiceRequest(rejectDialog.request_id, "rejected", rejectReason);
    setRejectDialog(null);
    setRejectReason("");
    load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Revisar servicios" description="Aprueba o rechaza servicios sin cita previa" />

      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => { setFilter(s); setLoading(true); }}
          >
            {s === "pending" && <Clock className="mr-1 h-3 w-3" />}
            {s === "approved" && <CheckCircle className="mr-1 h-3 w-3" />}
            {s === "rejected" && <XCircle className="mr-1 h-3 w-3" />}
            {s === "pending" ? "Pendientes" : s === "approved" ? "Aprobados" : s === "rejected" ? "Rechazados" : "Todos"}
          </Button>
        ))}
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Sin solicitudes {filter === "pending" ? "pendientes" : ""}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.request_id}>
              <CardContent className="flex items-center gap-4 p-4">
                {r.photo_url ? (
                  <img src={r.photo_url} alt="Servicio" className="h-20 w-20 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    Sin foto
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{r.client_name}</p>
                    <Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.barber_name} — {r.service_name} — {formatCurrency(r.price_charged)}
                    {r.tip > 0 && <span className="ml-1 text-green-600">+ {formatCurrency(r.tip)} propina</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                  {r.notes && <p className="mt-1 text-xs text-muted-foreground">Nota: {r.notes}</p>}
                  {r.status === "rejected" && r.rejection_reason && (
                    <p className="mt-1 text-xs text-red-600">Motivo rechazo: {r.rejection_reason}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDetailRequest(r)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {r.status === "pending" && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setApproveDialog(r); setApprovePaymentMethod("CASH"); }}>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setRejectDialog(r)}>
                        <XCircle className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailRequest} onOpenChange={() => setDetailRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del servicio</DialogTitle>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-3">
              {detailRequest.photo_url && (
                <img src={detailRequest.photo_url} alt="Servicio" className="w-full rounded-lg object-cover" />
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{detailRequest.client_name}</span>
                <span className="text-muted-foreground">Barbero:</span>
                <span>{detailRequest.barber_name}</span>
                <span className="text-muted-foreground">Servicio:</span>
                <span>{detailRequest.service_name}</span>
                <span className="text-muted-foreground">Cobrado:</span>
                <span>{formatCurrency(detailRequest.price_charged)}</span>
                {detailRequest.tip > 0 && (
                  <>
                    <span className="text-muted-foreground">Propina:</span>
                    <span className="text-green-600">{formatCurrency(detailRequest.tip)}</span>
                  </>
                )}
                <span className="text-muted-foreground">Estado:</span>
                <Badge className={statusColors[detailRequest.status]}>{statusLabels[detailRequest.status]}</Badge>
                {detailRequest.notes && (
                  <>
                    <span className="text-muted-foreground">Notas:</span>
                    <span>{detailRequest.notes}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar servicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo del rechazo</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej: No se evidencia el servicio"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReject}>Rechazar</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve dialog with payment method */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar servicio</DialogTitle>
          </DialogHeader>
          {approveDialog && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p><strong>Cliente:</strong> {approveDialog.client_name}</p>
                <p><strong>Servicio:</strong> {approveDialog.service_name}</p>
                <p><strong>Cobrado:</strong> {formatCurrency(approveDialog.price_charged)}</p>
                {approveDialog.tip > 0 && (
                  <p><strong>Propina:</strong> {formatCurrency(approveDialog.tip)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select value={approvePaymentMethod} onValueChange={setApprovePaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                <SelectContent>
                  {activePaymentMethods.map((m) => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancelar</Button>
                <Button onClick={handleApprove}>Aprobar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
