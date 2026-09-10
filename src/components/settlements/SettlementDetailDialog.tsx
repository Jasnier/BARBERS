import { useState, useEffect, useCallback } from "react";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  CheckCircle,
  XCircle,
  DollarSign,
  Plus,
  FileText,
} from "lucide-react";
import { RegisterSettlementPaymentDialog } from "./RegisterSettlementPaymentDialog";
import type {
  SettlementWithDetails,
  SettlementStatus,
  AdjustmentType,
  PaymentMethod,
} from "@/types";

interface SettlementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settlementId: string | null;
  onUpdate: () => void;
}

const STATUS_LABELS: Record<SettlementStatus, string> = {
  DRAFT: "Borrador",
  APPROVED: "Aprobada",
  PARTIALLY_PAID: "Parcialmente pagada",
  PAID: "Pagada",
  CANCELLED: "Anulada",
};

const STATUS_COLORS: Record<SettlementStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const ADJ_LABELS: Record<string, string> = {
  BONUS: "Bono",
  DEDUCTION: "Descuento",
  ADVANCE: "Anticipo",
  CORRECTION: "Corrección",
  OTHER: "Otro",
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "NEQUI", label: "Nequi" },
  { value: "DAVIPLATA", label: "Daviplata" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "OTHER", label: "Otro" },
];

const ADJ_TYPES: { value: AdjustmentType; label: string }[] = [
  { value: "BONUS", label: "Bono" },
  { value: "DEDUCTION", label: "Descuento" },
  { value: "ADVANCE", label: "Anticipo" },
  { value: "CORRECTION", label: "Corrección" },
  { value: "OTHER", label: "Otro" },
];

export function SettlementDetailDialog({
  open,
  onOpenChange,
  settlementId,
  onUpdate,
}: SettlementDetailDialogProps) {
  const [settlement, setSettlement] = useState<SettlementWithDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const [adjType, setAdjType] = useState<AdjustmentType>("BONUS");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDesc, setAdjDesc] = useState("");
  const [adjLoading, setAdjLoading] = useState(false);

  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);

  const [showPayDialog, setShowPayDialog] = useState(false);

  const load = useCallback(async () => {
    if (!settlementId || !open) return;
    setLoading(true);
    try {
      const s = await adapter.getSettlementById(settlementId);
      setSettlement(s);
    } catch {
      alert("No se pudo cargar la liquidación");
    } finally {
      setLoading(false);
    }
  }, [settlementId, open]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove() {
    if (!settlement) return;
    setLoading(true);
    try {
      await adapter.approveSettlement(settlement.id, "Admin");
      alert("Liquidación aprobada");
      await load();
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!settlement || !cancelReason.trim()) return;
    setLoading(true);
    try {
      await adapter.cancelSettlement(settlement.id, cancelReason, "Admin");
      alert("Liquidación anulada");
      setShowCancel(false);
      setCancelReason("");
      await load();
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAdjustment() {
    if (!settlement || !adjAmount || !adjDesc.trim()) return;
    const amt = Number(adjAmount);
    if (isNaN(amt) || amt === 0) return;
    setAdjLoading(true);
    try {
      await adapter.addSettlementAdjustment(settlement.id, {
        type: adjType,
        amount: amt,
        description: adjDesc,
        created_by_name: "Admin",
      });
      alert("Ajuste agregado");
      setAdjAmount("");
      setAdjDesc("");
      await load();
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdjLoading(false);
    }
  }

  function handlePaymentDone() {
    setShowPayDialog(false);
    load();
    onUpdate();
  }

  if (!open || !settlementId) return null;
  const s = settlement;
  const canApprove = s && s.status === "DRAFT";
  const canPay = s && (s.status === "APPROVED" || s.status === "PARTIALLY_PAID");
  const canCancel = s && s.status !== "CANCELLED";
  const canEdit = s && (s.status === "DRAFT" || s.status === "APPROVED" || s.status === "PARTIALLY_PAID");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Liquidación — {s?.barber_name || "..."}
            </DialogTitle>
            <DialogDescription>
              Período: {s?.period_start || ""} al {s?.period_end || ""}
            </DialogDescription>
          </DialogHeader>

          {loading && !s ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : s ? (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="summary">Resumen</TabsTrigger>
                <TabsTrigger value="details">Detalle</TabsTrigger>
                <TabsTrigger value="adjustments">Ajustes ({s.adjustments.length})</TabsTrigger>
                <TabsTrigger value="payments">Pagos ({s.payments.length})</TabsTrigger>
              </TabsList>

              {/* RESUMEN */}
              <TabsContent value="summary" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Servicios</p>
                    <p className="text-lg font-bold">{formatCurrency(s.services_total)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600">Comisión</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(s.commission_total)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600">Propinas</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(s.tips_total)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600">Ajustes</p>
                    <p className="text-lg font-bold text-purple-700">{formatCurrency(s.adjustments_total)}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-orange-600">Anticipos</p>
                    <p className="text-lg font-bold text-orange-700">{formatCurrency(s.advances_total)}</p>
                  </div>
                  <div className="bg-gray-900 text-white rounded-lg p-3">
                    <p className="text-xs text-gray-300">Total a pagar</p>
                    <p className="text-lg font-bold">{formatCurrency(s.total_amount)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Pagado</span>
                    <span className="font-semibold text-green-700">{formatCurrency(s.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Pendiente</span>
                    <span className="font-semibold text-orange-700">{formatCurrency(s.pending_amount)}</span>
                  </div>
                  {s.paid_amount > 0 && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((s.paid_amount / s.total_amount) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 space-y-1">
                  <p>Creada por: {s.created_by_name} — {new Date(s.created_at).toLocaleString("es-CO")}</p>
                  {s.approved_at && <p>Aprobada por: {s.approved_by_name} — {new Date(s.approved_at).toLocaleString("es-CO")}</p>}
                  {s.cancelled_at && <p>Anulada por: {s.cancelled_by_name} — Motivo: {s.cancellation_reason}</p>}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {canApprove && (
                    <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
                    </Button>
                  )}
                  {canPay && (
                    <Button onClick={() => setShowPayDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <DollarSign className="h-4 w-4 mr-1" /> Registrar Pago
                    </Button>
                  )}
                  {canCancel && (
                    <Button variant="destructive" onClick={() => setShowCancel(!showCancel)}>
                      <XCircle className="h-4 w-4 mr-1" /> Anular
                    </Button>
                  )}
                </div>

                {showCancel && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                    <Label className="text-red-700">Motivo de anulación</Label>
                    <Input
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Ingrese el motivo..."
                    />
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" onClick={handleCancel} disabled={loading || !cancelReason.trim()}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Confirmar anulación
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowCancel(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* DETALLE */}
              <TabsContent value="details">
                {s.items.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">No hay servicios</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 text-xs font-medium text-gray-500 px-3">
                      <span>Fecha</span>
                      <span>Servicio</span>
                      <span className="text-right">Bruto</span>
                      <span className="text-right">Comisión</span>
                      <span className="text-right">Propina</span>
                    </div>
                    {s.items.map((item) => (
                      <div key={item.id} className="grid grid-cols-5 text-sm px-3 py-2 border-b last:border-0">
                        <span className="text-gray-600">{item.service_date}</span>
                        <span>{item.service_name}</span>
                        <span className="text-right">{formatCurrency(item.gross_amount)}</span>
                        <span className="text-right text-blue-700">{formatCurrency(item.commission_amount)}</span>
                        <span className="text-right text-green-700">{formatCurrency(item.tip_amount)}</span>
                      </div>
                    ))}
                    <div className="grid grid-cols-5 text-sm font-bold px-3 py-2 border-t-2">
                      <span className="col-span-2">Totales ({s.items.length})</span>
                      <span className="text-right">{formatCurrency(s.services_total)}</span>
                      <span className="text-right text-blue-700">{formatCurrency(s.commission_total)}</span>
                      <span className="text-right text-green-700">{formatCurrency(s.tips_total)}</span>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* AJUSTES */}
              <TabsContent value="adjustments" className="space-y-4">
                {canEdit && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Plus className="h-4 w-4" /> Agregar ajuste
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select value={adjType} onValueChange={(v) => setAdjType(v as AdjustmentType)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ADJ_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Monto</Label>
                        <Input
                          type="number"
                          value={adjAmount}
                          onChange={(e) => setAdjAmount(e.target.value)}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        value={adjDesc}
                        onChange={(e) => setAdjDesc(e.target.value)}
                        placeholder="Motivo del ajuste..."
                        className="h-9"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddAdjustment}
                      disabled={adjLoading || !adjAmount || !adjDesc.trim()}
                    >
                      {adjLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Agregar
                    </Button>
                  </div>
                )}

                {s.adjustments.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">Sin ajustes</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 text-xs font-medium text-gray-500 px-3">
                      <span>Tipo</span>
                      <span>Descripción</span>
                      <span className="text-right">Monto</span>
                      <span>Creado por</span>
                    </div>
                    {s.adjustments.map((a) => (
                      <div key={a.id} className="grid grid-cols-4 text-sm px-3 py-2 border-b">
                        <Badge variant="outline">{ADJ_LABELS[a.type] || a.type}</Badge>
                        <span>{a.description}</span>
                        <span className={`text-right font-semibold ${a.type === "DEDUCTION" || a.type === "ADVANCE" ? "text-red-600" : "text-green-600"}`}>
                          {a.type === "DEDUCTION" || a.type === "ADVANCE" ? "-" : "+"}
                          {formatCurrency(a.amount)}
                        </span>
                        <span className="text-xs text-gray-500">{a.created_by_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* PAGOS */}
              <TabsContent value="payments" className="space-y-3">
                {canPay && (
                  <Button onClick={() => setShowPayDialog(true)} className="w-full" variant="outline">
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar nuevo pago
                  </Button>
                )}

                {s.payments.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">Sin pagos registrados</p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 text-xs font-medium text-gray-500 px-3">
                      <span>Fecha</span>
                      <span>Método</span>
                      <span className="text-right">Monto</span>
                      <span>Notas</span>
                    </div>
                    {s.payments.map((p) => (
                      <div key={p.id} className="grid grid-cols-4 text-sm px-3 py-2 border-b">
                        <span>{new Date(p.paid_at).toLocaleDateString("es-CO")}</span>
                        <Badge variant="outline">{PAYMENT_METHODS.find(m => m.value === p.payment_method)?.label || p.payment_method}</Badge>
                        <span className="text-right font-semibold text-green-700">{formatCurrency(p.amount)}</span>
                        <span className="text-xs text-gray-500">{p.notes || "-"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      <RegisterSettlementPaymentDialog
        open={showPayDialog}
        onOpenChange={setShowPayDialog}
        settlement={s}
        onPaymentDone={handlePaymentDone}
      />
    </>
  );
}
