import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { IncomeRecord, BarberCommission } from "@/types";

export function BarberCommissions() {
  const { user } = useAuth();
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [commission, setCommission] = useState<BarberCommission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.barber_id) return;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

    Promise.all([
      adapter.getIncome({ date_from: monthStart, barber_id: user.barber_id }),
      adapter.getCommissions("monthly", user.barber_id),
    ]).then(([inc, comms]) => {
      setRecords(inc);
      setCommission(comms[0] || null);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Mis comisiones" description="Ingresos y comisiones del mes" />

      {commission && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Servicios</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{commission.total_services}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Mi comisión</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-emerald-600">{formatCurrency(commission.total_commission)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Propinas</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(commission.total_tips)}</div></CardContent>
          </Card>
        </div>
      )}

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <DollarSign className="mb-4 h-12 w-12" />
          <p>Sin registros este mes</p>
        </div>
      ) : (
        <DataTable
          data={records as unknown as Record<string, unknown>[]}
          keyField="income_id"
          columns={[
            { key: "date", header: "Fecha", render: (item) => formatDate(String(item.date)) },
            { key: "service_name", header: "Servicio" },
            { key: "gross_amount", header: "Bruto", render: (item) => formatCurrency(Number(item.gross_amount)) },
            { key: "commission_amount", header: "Mi comisión", render: (item) => formatCurrency(Number(item.commission_amount)) },
            { key: "tip", header: "Propina", render: (item) => formatCurrency(Number(item.tip)) },
          ]}
        />
      )}
    </div>
  );
}
