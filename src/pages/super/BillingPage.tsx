import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, AlertTriangle, Edit } from "lucide-react";
import adapter from "@/services";
import type { Shop } from "@/types";

export function BillingPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [editShop, setEditShop] = useState<Shop | null>(null);
  const [form, setForm] = useState({ subscription_plan: "monthly", subscription_start: "", subscription_end: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setShops(await adapter.getShops()); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (shop: Shop) => {
    setEditShop(shop);
    setForm({
      subscription_plan: shop.subscription_plan,
      subscription_start: shop.subscription_start || "",
      subscription_end: shop.subscription_end || "",
    });
    setEditShop(shop);
  };

  const handleSave = async () => {
    if (!editShop) return;
    setSaving(true);
    try {
      await adapter.updateShop(editShop.shop_id, {
        subscription_plan: form.subscription_plan as any,
        subscription_start: form.subscription_start || null,
        subscription_end: form.subscription_end || null,
      });
      setEditShop(null);
      load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const isExpired = (shop: Shop) => {
    if (!shop.subscription_end) return false;
    return new Date(shop.subscription_end) < new Date();
  };

  const daysUntilExpiry = (shop: Shop) => {
    if (!shop.subscription_end) return null;
    const diff = new Date(shop.subscription_end).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const expired = shops.filter(isExpired);
  const expiringSoon = shops.filter((s) => {
    const days = daysUntilExpiry(s);
    return days !== null && days > 0 && days <= 7;
  });

  return (
    <div>
      <PageHeader title="Facturación" description="Gestiona suscripciones y pagos de las barberías" />

      {(expired.length > 0 || expiringSoon.length > 0) && (
        <div className="mb-6 space-y-3">
          {expired.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">{expired.length} tienda(s) con suscripción vencida</p>
              </div>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2 text-yellow-700">
                <Calendar className="h-5 w-5" />
                <p className="font-medium">{expiringSoon.length} tienda(s) vencen en menos de 7 días</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shops.map((shop) => {
          const expired = isExpired(shop);
          const days = daysUntilExpiry(shop);
          return (
            <Card key={shop.shop_id} className={expired ? "border-red-300" : ""}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{shop.name}</h3>
                    <p className="text-sm text-muted-foreground">{shop.owner_name}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(shop)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium capitalize">{shop.subscription_plan}</span>
                  </div>
                  {shop.subscription_start && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inicio:</span>
                      <span>{shop.subscription_start}</span>
                    </div>
                  )}
                  {shop.subscription_end && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vence:</span>
                      <span className={expired ? "font-bold text-red-600" : days !== null && days <= 7 ? "font-medium text-yellow-600" : ""}>
                        {shop.subscription_end}
                        {expired && " (VENCIDA)"}
                        {days !== null && days > 0 && days <= 7 && ` (${days} días)`}
                      </span>
                    </div>
                  )}
                  {shop.blocked && (
                    <div className="mt-2 rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                      Bloqueada: {shop.block_reason || "Sin motivo especificado"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editShop} onOpenChange={() => setEditShop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar suscripción — {editShop?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={form.subscription_plan} onValueChange={(v) => setForm({ ...form, subscription_plan: v as typeof form.subscription_plan })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Prueba</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="yearly">Anual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Input type="date" value={form.subscription_start} onChange={(e) => setForm({ ...form, subscription_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de vencimiento</Label>
              <Input type="date" value={form.subscription_end} onChange={(e) => setForm({ ...form, subscription_end: e.target.value })} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
