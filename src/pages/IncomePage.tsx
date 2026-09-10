import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { IncomeRecord } from "@/types";

export function IncomePage() {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    adapter.getIncome({ date_from: monthStart }).then(setRecords).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const totalGross = records.reduce((s, r) => s + (r.gross_amount || 0), 0);
  const totalCommission = records.reduce((s, r) => s + (r.commission_amount || 0), 0);
  const totalShop = records.reduce((s, r) => s + (r.shop_amount || 0), 0);
  const totalTips = records.reduce((s, r) => s + (r.tip || 0), 0);

  return (
    <div>
      <PageHeader title="Ingresos" description="Controla los ingresos y comisiones de tu barbería" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bruto</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalGross)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Comisiones</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">{formatCurrency(totalCommission)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Barbería</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalShop)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Propinas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{formatCurrency(totalTips)}</div></CardContent>
        </Card>
      </div>

      {records.length === 0 ? (
        <EmptyState
          title="Sin registros este mes"
          description="Los ingresos se registrarán al completar servicios."
          icon={<DollarSign className="h-6 w-6 text-muted-foreground" />}
        />
      ) : (
        <DataTable
          data={records as unknown as Record<string, unknown>[]}
          keyField="income_id"
          columns={[
            { key: "date", header: "Fecha", render: (item) => formatDate(String(item.date)) },
            { key: "barber_name", header: "Barbero" },
            { key: "service_name", header: "Servicio" },
            { key: "gross_amount", header: "Bruto", render: (item) => formatCurrency(Number(item.gross_amount)) },
            { key: "commission_amount", header: "Comisión", render: (item) => formatCurrency(Number(item.commission_amount)) },
            { key: "tip", header: "Propina", render: (item) => formatCurrency(Number(item.tip)) },
          ]}
        />
      )}
    </div>
  );
}
