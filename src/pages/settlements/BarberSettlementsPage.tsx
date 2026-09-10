import { useState, useEffect } from "react";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  Eye,
  Wallet,
} from "lucide-react";
import { SettlementDetailDialog } from "@/components/settlements/SettlementDetailDialog";
import type { Settlement, SettlementStatus } from "@/types";

const STATUS_LABELS: Record<SettlementStatus, string> = {
  DRAFT: "Borrador",
  APPROVED: "Aprobada",
  PARTIALLY_PAID: "Parcial",
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

export function BarberSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adapter.getSettlements();
      setSettlements(data);
    } catch {
      alert("No se pudieron cargar tus liquidaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = tab === "all" ? settlements : settlements.filter((s) => s.status === tab);
  const totalPaid = settlements.reduce((s, st) => s + st.paid_amount, 0);
  const totalPending = settlements.reduce((s, st) => s + (st.status !== "CANCELLED" ? st.pending_amount : 0), 0);
  const totalEarned = settlements.filter((s) => s.status !== "CANCELLED").reduce((s, st) => s + st.total_amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Liquidaciones</h1>
        <p className="text-sm text-gray-500">Consulta el estado de tus liquidaciones y pagos</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <Wallet className="h-6 w-6 mx-auto text-blue-600 mb-1" />
            <p className="text-xs text-gray-500">Total ganado</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totalEarned)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto text-green-600 mb-1" />
            <p className="text-xs text-gray-500">Recibido</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-orange-600 mb-1" />
            <p className="text-xs text-gray-500">Pendiente</p>
            <p className="text-lg font-bold text-orange-700">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="APPROVED">Aprobadas</TabsTrigger>
              <TabsTrigger value="PARTIALLY_PAID">Parcial</TabsTrigger>
              <TabsTrigger value="PAID">Pagadas</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No hay liquidaciones</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((s) => (
                    <div
                      key={s.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedId(s.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={STATUS_COLORS[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                          <span className="text-sm text-gray-500">{s.period_start} — {s.period_end}</span>
                        </div>
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Comisión</p>
                          <p className="font-semibold">{formatCurrency(s.commission_total)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Propinas</p>
                          <p className="font-semibold text-green-700">{formatCurrency(s.tips_total)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Recibido</p>
                          <p className="font-semibold text-blue-700">{formatCurrency(s.paid_amount)}</p>
                        </div>
                      </div>
                      {s.pending_amount > 0 && s.status !== "CANCELLED" && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                          <Clock className="h-3 w-3" /> Pendiente: {formatCurrency(s.pending_amount)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SettlementDetailDialog
        open={!!selectedId}
        onOpenChange={(o) => { if (!o) setSelectedId(null); }}
        settlementId={selectedId}
        onUpdate={load}
      />
    </div>
  );
}
