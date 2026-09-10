import { useState, useEffect } from "react";
import adapter from "@/services";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Loader2,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  RefreshCw,
} from "lucide-react";
import { GenerateSettlementDialog } from "@/components/settlements/GenerateSettlementDialog";
import { SettlementDetailDialog } from "@/components/settlements/SettlementDetailDialog";
import type { Settlement, SettlementStatus, Barber } from "@/types";

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

export function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBarber, setFilterBarber] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [setts, brbs] = await Promise.all([
        adapter.getSettlements({
          barber_id: filterBarber === "all" ? undefined : filterBarber,
          status: filterStatus === "all" ? undefined : filterStatus,
          date_from: filterFrom || undefined,
          date_to: filterTo || undefined,
        }),
        adapter.getBarbers(),
      ]);
      setSettlements(setts);
      setBarbers(brbs);
    } catch {
      alert("No se pudieron cargar las liquidaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterBarber, filterStatus, filterFrom, filterTo]);

  const draft = settlements.filter((s) => s.status === "DRAFT").length;
  const approved = settlements.filter((s) => s.status === "APPROVED" || s.status === "PARTIALLY_PAID").length;
  const totalPending = settlements.reduce((s, st) => s + (st.status !== "CANCELLED" ? st.pending_amount : 0), 0);
  const totalPaid = settlements.reduce((s, st) => s + st.paid_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Liquidaciones</h1>
          <p className="text-sm text-gray-500">Gestión de liquidaciones y pagos a barberos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowGenerate(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-1" /> Nueva liquidación
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg"><FileText className="h-5 w-5 text-gray-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Borradores</p>
                <p className="text-xl font-bold">{draft}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Clock className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Aprobadas/Pendientes</p>
                <p className="text-xl font-bold text-blue-700">{approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><AlertCircle className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Pendiente total</p>
                <p className="text-xl font-bold text-orange-700">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total pagado</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filtros</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Barbero</Label>
              <Select value={filterBarber} onValueChange={setFilterBarber}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((b) => (
                    <SelectItem key={b.barber_id} value={b.barber_id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                  <SelectItem value="APPROVED">Aprobada</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Parcial</SelectItem>
                  <SelectItem value="PAID">Pagada</SelectItem>
                  <SelectItem value="CANCELLED">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No hay liquidaciones</p>
              <p className="text-sm text-gray-400">Crea una nueva con el botón de arriba</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Barbero</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Período</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Pagado</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Pendiente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s) => {
                    const isCancelled = s.status === "CANCELLED";
                    return (
                    <tr key={s.id} className={`border-b cursor-pointer ${isCancelled ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"}`} onClick={() => setSelectedId(s.id)}>
                      <td className="px-4 py-3 font-medium">{s.barber_name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.period_start} — {s.period_end}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isCancelled ? "text-gray-400 line-through" : ""}`}>{formatCurrency(s.total_amount)}</td>
                      <td className={`px-4 py-3 text-right ${isCancelled ? "text-gray-400 line-through" : "text-green-700"}`}>{formatCurrency(s.paid_amount)}</td>
                      <td className={`px-4 py-3 text-right ${isCancelled ? "text-gray-400" : "text-orange-700"}`}>{formatCurrency(s.pending_amount)}</td>
                      <td className="px-4 py-3"><Badge className={isCancelled ? "bg-gray-100 text-gray-500" : STATUS_COLORS[s.status]}>{STATUS_LABELS[s.status]}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedId(s.id); }}>
                          Ver
                        </Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <GenerateSettlementDialog
        open={showGenerate}
        onOpenChange={setShowGenerate}
        onGenerated={(s) => { setSelectedId(s.id); loadData(); }}
      />

      <SettlementDetailDialog
        open={!!selectedId}
        onOpenChange={(o) => { if (!o) setSelectedId(null); }}
        settlementId={selectedId}
        onUpdate={loadData}
      />
    </div>
  );
}
