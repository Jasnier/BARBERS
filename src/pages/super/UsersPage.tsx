import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Edit, Trash2, Shield, User, Scissors } from "lucide-react";
import adapter from "@/services";
import type { User as UserType, Shop } from "@/types";

const roleLabels: Record<string, string> = { admin: "Administrador", barber: "Barbero", supersistema: "Super Admin" };
const roleIcons: Record<string, typeof Scissors> = { admin: Scissors, barber: User, supersistema: Shield };

export function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "barber", shop_id: "shop_1" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [u, s] = await Promise.all([
        adapter.getAllUsers({ shop_id: filterShop === "all" ? undefined : filterShop, role: filterRole === "all" ? undefined : filterRole }),
        adapter.getShops(),
      ]);
      setUsers(u);
      setShops(s);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterShop, filterRole]);

  const openCreate = () => {
    setEditingUser(null);
    setForm({ email: "", password: "", name: "", role: "barber", shop_id: shops[0]?.shop_id || "shop_1" });
    setDialogOpen(true);
  };

  const openEdit = (u: UserType) => {
    setEditingUser(u);
    setForm({ email: u.email, password: "", name: u.name, role: u.role, shop_id: u.shop_id });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingUser) {
        await adapter.updateUserProfile(editingUser.user_id, { name: form.name, role: form.role as any, shop_id: form.shop_id });
      } else {
        if (!form.password) { alert("La contraseña es requerida para nuevos usuarios"); setSaving(false); return; }
        await adapter.createUser(form as any);
      }
      setDialogOpen(false);
      load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    try { await adapter.deleteUser(userId); load(); } catch (e: any) { alert(e.message); }
  };

  const getShopName = (shopId: string) => shops.find((s) => s.shop_id === shopId)?.name || shopId;

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Usuarios" description="Gestiona todos los usuarios del sistema">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Crear usuario
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={filterShop} onValueChange={setFilterShop}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas las tiendas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las tiendas</SelectItem>
            {shops.map((s) => <SelectItem key={s.shop_id} value={s.shop_id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos los roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="barber">Barberos</SelectItem>
            <SelectItem value="supersistema">Super Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center p-10 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No hay usuarios</p>
            <p className="text-sm text-muted-foreground">Crea el primer usuario para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Rol</th>
                <th className="px-4 py-3 text-left font-medium">Tienda</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const Icon = roleIcons[u.role] || User;
                return (
                  <tr key={u.user_id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium">
                        <Icon className="h-3 w-3" /> {roleLabels[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{getShopName(u.shop_id)}</td>
                    <td className="px-4 py-3">
                      {u.active ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Activo</span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Inactivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(u.user_id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar usuario" : "Crear usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="barber">Barbero</SelectItem>
                  <SelectItem value="supersistema">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tienda</Label>
              <Select value={form.shop_id} onValueChange={(v) => setForm({ ...form, shop_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {shops.map((s) => <SelectItem key={s.shop_id} value={s.shop_id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Guardando..." : editingUser ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
