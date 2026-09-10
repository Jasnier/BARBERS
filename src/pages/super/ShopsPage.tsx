import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Plus, Edit, Trash2, Lock, Unlock, LogIn } from "lucide-react";
import adapter from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import type { Shop } from "@/types";

export function ShopsPage() {
  const navigate = useNavigate();
  const { enterShop } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [blockingShop, setBlockingShop] = useState<Shop | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", owner_name: "", subscription_plan: "monthly" as "trial" | "monthly" | "yearly" | "custom", admin_email: "", admin_password: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setShops(await adapter.getShops()); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingShop(null);
    setForm({ name: "", address: "", phone: "", email: "", owner_name: "", subscription_plan: "monthly", admin_email: "", admin_password: "" });
    setDialogOpen(true);
  };

  const openEdit = (shop: Shop) => {
    setEditingShop(shop);
    setForm({ name: shop.name, address: shop.address, phone: shop.phone, email: shop.email, owner_name: shop.owner_name, subscription_plan: shop.subscription_plan, admin_email: "", admin_password: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingShop) {
        await adapter.updateShop(editingShop.shop_id, form);
      } else {
        const newShop = await adapter.createShop({ ...form, active: true, blocked: false, block_reason: "", subscription_start: null, subscription_end: null });
        // Create admin user for the new shop
        if (form.admin_email && form.admin_password) {
          try {
            await adapter.createUser({
              email: form.admin_email,
              password: form.admin_password,
              name: form.owner_name || form.name,
              role: "admin",
              shop_id: newShop.shop_id,
            });
          } catch (userErr: any) {
            alert("Tienda creada, pero error creando usuario admin: " + userErr.message);
          }
        }
      }
      setDialogOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const handleDelete = async (shopId: string) => {
    if (!confirm("¿Eliminar esta tienda?")) return;
    try { await adapter.deleteShop(shopId); load(); } catch (e: any) { alert(e.message); }
  };

  const openBlock = (shop: Shop) => {
    setBlockingShop(shop);
    setBlockReason(shop.block_reason || "");
    setBlockDialogOpen(true);
  };

  const handleBlock = async () => {
    if (!blockingShop) return;
    setSaving(true);
    try {
      if (blockingShop.blocked) {
        await adapter.unblockShop(blockingShop.shop_id);
      } else {
        await adapter.blockShop(blockingShop.shop_id, blockReason);
      }
      setBlockDialogOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const handleEnterShop = (shopId: string) => {
    enterShop(shopId);
    navigate("/");
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Tiendas" description="Gestiona todas las barberías">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Crear tienda
        </Button>
      </PageHeader>

      {shops.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center p-10 text-center">
            <Store className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No hay tiendas</p>
            <p className="text-sm text-muted-foreground">Crea la primera tienda para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Card key={shop.shop_id} className={shop.blocked ? "border-red-300 bg-red-50/50" : ""}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{shop.name}</h3>
                    <p className="text-sm text-muted-foreground">{shop.owner_name}</p>
                  </div>
                  {shop.blocked ? (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Bloqueada</span>
                  ) : shop.active ? (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Activa</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">Inactiva</span>
                  )}
                </div>

                <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                  {shop.address && <p>📍 {shop.address}</p>}
                  {shop.phone && <p>📞 {shop.phone}</p>}
                  {shop.email && <p>✉️ {shop.email}</p>}
                  <p>📋 Plan: {shop.subscription_plan}</p>
                  {shop.blocked && shop.block_reason && (
                    <p className="text-red-600">⚠️ {shop.block_reason}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(shop)}>
                    <Edit className="mr-1 h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant={shop.blocked ? "default" : "destructive"} onClick={() => openBlock(shop)}>
                    {shop.blocked ? <><Unlock className="mr-1 h-3 w-3" /> Desbloquear</> : <><Lock className="mr-1 h-3 w-3" /> Bloquear</>}
                  </Button>
                  <Button size="sm" onClick={() => handleEnterShop(shop.shop_id)}>
                    <LogIn className="mr-1 h-3 w-3" /> Entrar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(shop.shop_id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShop ? "Editar tienda" : "Crear tienda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Barbería Ejemplo" />
            </div>
            <div className="space-y-2">
              <Label>Dueño</Label>
              <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} placeholder="Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle 123" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+57 300 123 4567" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@barberia.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plan de suscripción</Label>
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
            {!editingShop && (
              <>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="mb-3 text-sm font-medium">Usuario administrador de la tienda</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Email del admin</Label>
                      <Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="admin@barberia.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contraseña</Label>
                      <Input type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                    </div>
                  </div>
                </div>
              </>
            )}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Guardando..." : editingShop ? "Guardar cambios" : "Crear tienda"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{blockingShop?.blocked ? "Desbloquear tienda" : "Bloquear tienda"}</DialogTitle>
          </DialogHeader>
          {blockingShop && !blockingShop.blocked && (
            <div className="space-y-2">
              <Label>Motivo del bloqueo</Label>
              <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ej: No ha pagado la suscripción" />
            </div>
          )}
          <Button onClick={handleBlock} disabled={saving} variant={blockingShop?.blocked ? "default" : "destructive"} className="w-full">
            {saving ? "Procesando..." : blockingShop?.blocked ? "Desbloquear" : "Bloquear"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
