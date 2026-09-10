import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Tag, Gift, Trophy, Zap, Lock, CreditCard, GripVertical } from "lucide-react";
import adapter from "@/services";
import type { ShopConfig, ShopCategory, RewardDynamic, ShopPaymentMethod } from "@/types";

export function SettingsPage() {
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const [newDynName, setNewDynName] = useState("");
  const [newDynDesc, setNewDynDesc] = useState("");
  const [newDynType, setNewDynType] = useState<"raffle" | "promotion" | "custom">("raffle");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [paymentMethods, setPaymentMethods] = useState<ShopPaymentMethod[]>([]);
  const [newPmKey, setNewPmKey] = useState("");
  const [newPmLabel, setNewPmLabel] = useState("");
  const [pmSaving, setPmSaving] = useState(false);

  useEffect(() => {
    adapter.getShopConfig().then(setConfig).catch(console.error).finally(() => setLoading(false));
    adapter.getShopPaymentMethods().then(setPaymentMethods).catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      await adapter.updateShopConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const categories: ShopCategory[] = config?.categories || [];

  const updateCategories = async (cats: ShopCategory[]) => {
    const updated = { ...config!, categories: cats };
    setConfig(updated);
    await adapter.updateShopConfig(updated);
  };

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name || categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const newCat: ShopCategory = { id: `cat_${Date.now()}`, name };
    await updateCategories([...categories, newCat]);
    setNewCatName("");
  };

  const updateCategory = async (id: string) => {
    const name = editCatName.trim();
    if (!name) return;
    await updateCategories(categories.map((c) => (c.id === id ? { ...c, name } : c)));
    setEditCatId(null);
    setEditCatName("");
  };

  const deleteCategory = async (id: string) => {
    await updateCategories(categories.filter((c) => c.id !== id));
  };

  const updateDynamics = async (dyns: RewardDynamic[]) => {
    const updated = { ...config!, rewards: { ...config!.rewards, dynamics: dyns } };
    setConfig(updated);
    await adapter.updateShopConfig(updated);
  };

  const addDynamic = async () => {
    const name = newDynName.trim();
    if (!name) return;
    const newDyn: RewardDynamic = {
      id: `dyn_${Date.now()}`,
      name,
      description: newDynDesc.trim(),
      type: newDynType,
      active: true,
    };
    await updateDynamics([...(config!.rewards.dynamics || []), newDyn]);
    setNewDynName("");
    setNewDynDesc("");
  };

  const toggleDynamic = async (id: string) => {
    const dyns = (config!.rewards.dynamics || []).map((d) =>
      d.id === id ? { ...d, active: !d.active } : d
    );
    await updateDynamics(dyns);
  };

  const deleteDynamic = async (id: string) => {
    await updateDynamics((config!.rewards.dynamics || []).filter((d) => d.id !== id));
  };

  const toggleLoyalty = async () => {
    const updated = {
      ...config!,
      rewards: {
        ...config!.rewards,
        loyalty: { ...config!.rewards.loyalty, enabled: !config!.rewards.loyalty.enabled },
      },
    };
    setConfig(updated);
    await adapter.updateShopConfig(updated);
  };

  const updateLoyalty = async (field: string, value: any) => {
    const updated = {
      ...config!,
      rewards: {
        ...config!.rewards,
        loyalty: { ...config!.rewards.loyalty, [field]: value },
      },
    };
    setConfig(updated);
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!config) return <p className="text-muted-foreground">Error al cargar configuración.</p>;

  return (
    <div>
      <PageHeader title="Configuración" description="Ajustes de tu barbería" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>General</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la barbería</Label>
              <Input value={config.shop_name} onChange={(e) => setConfig({ ...config, shop_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Zona horaria</Label>
              <Input value={config.timezone} onChange={(e) => setConfig({ ...config, timezone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select value={config.currency} onValueChange={(v) => setConfig({ ...config, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP — Peso colombiano</SelectItem>
                  <SelectItem value="MXN">MXN — Peso mexicano</SelectItem>
                  <SelectItem value="USD">USD — Dólar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Horario y comisiones</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Apertura</Label>
                <Input type="time" value={config.open_time} onChange={(e) => setConfig({ ...config, open_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cierre</Label>
                <Input type="time" value={config.close_time} onChange={(e) => setConfig({ ...config, close_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de comisión</Label>
              <Select value={config.commission_type} onValueChange={(v) => setConfig({ ...config, commission_type: v as "service" | "daily" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Por servicio</SelectItem>
                  <SelectItem value="daily">Diaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Categories CRUD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categorías de servicios
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nueva categoría..."
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <Button size="sm" onClick={addCategory} disabled={!newCatName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {categories.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Sin categorías. Agrega una arriba.</p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2 rounded-lg border p-2">
                    {editCatId === cat.id ? (
                      <>
                        <Input
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          className="flex-1"
                          onKeyDown={(e) => e.key === "Enter" && updateCategory(cat.id)}
                          autoFocus
                        />
                        <Button size="sm" variant="default" onClick={() => updateCategory(cat.id)}>OK</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditCatId(null)}>X</Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{cat.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteCategory(cat.id)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rewards config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Recompensas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toggle global */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Activar recompensas</p>
                <p className="text-xs text-muted-foreground">Habilita programas de fidelidad y dinámicas</p>
              </div>
              <button
                type="button"
                onClick={toggleLoyalty}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.rewards.loyalty.enabled ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.rewards.loyalty.enabled ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            {/* 1. Fidelidad fija */}
            <div className={`rounded-lg border p-4 ${config.rewards.loyalty.enabled ? "border-green-200 bg-green-50" : "opacity-50"}`}>
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-green-600" />
                <p className="text-sm font-semibold">Fidelidad — Siempre activa</p>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Cada X cortes el siguiente es gratis. Se aplica automáticamente.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cortes para ganar</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.rewards.loyalty.visits_required}
                    onChange={(e) => updateLoyalty("visits_required", Number(e.target.value) || 1)}
                    disabled={!config.rewards.loyalty.enabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mensaje</Label>
                  <Input
                    value={config.rewards.loyalty.reward_message}
                    onChange={(e) => updateLoyalty("reward_message", e.target.value)}
                    placeholder="¡Corte gratis!"
                    disabled={!config.rewards.loyalty.enabled}
                  />
                </div>
              </div>
              {config.rewards.loyalty.enabled && (
                <div className="mt-3 rounded bg-green-100 px-3 py-2 text-xs text-green-800">
                  Cada <strong>{config.rewards.loyalty.visits_required}</strong> cortes → <strong>{config.rewards.loyalty.reward_message}</strong>
                </div>
              )}
            </div>

            {/* 2. Dinámicas extra */}
            <div className={`rounded-lg border p-4 ${config.rewards.loyalty.enabled ? "" : "opacity-50"}`}>
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-600" />
                <p className="text-sm font-semibold">Dinámicas extra</p>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Rifas, promociones especiales, sorteos, etc.</p>

              {config.rewards.loyalty.enabled && (
                <>
                  <div className="mb-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newDynName}
                        onChange={(e) => setNewDynName(e.target.value)}
                        placeholder="Nombre (ej: Rifa navideña)"
                        onKeyDown={(e) => e.key === "Enter" && addDynamic()}
                      />
                      <select
                        value={newDynType}
                        onChange={(e) => setNewDynType(e.target.value as any)}
                        className="rounded-md border px-2 text-sm"
                      >
                        <option value="raffle">Rifa</option>
                        <option value="promotion">Promoción</option>
                        <option value="custom">Otra</option>
                      </select>
                      <Button size="sm" onClick={addDynamic} disabled={!newDynName.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={newDynDesc}
                      onChange={(e) => setNewDynDesc(e.target.value)}
                      placeholder="Descripción (opcional)"
                    />
                  </div>

                  {(config.rewards.dynamics || []).length === 0 ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">Sin dinámicas creadas</p>
                  ) : (
                    <div className="space-y-2">
                      {(config.rewards.dynamics || []).map((dyn) => (
                        <div key={dyn.id} className={`flex items-center gap-2 rounded-lg border p-2 ${dyn.active ? "" : "opacity-50"}`}>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{dyn.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {dyn.type === "raffle" ? "Rifa" : dyn.type === "promotion" ? "Promoción" : "Otra"}
                              {dyn.description && ` — ${dyn.description}`}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => toggleDynamic(dyn.id)}>
                            {dyn.active ? "ON" : "OFF"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteDynamic(dyn.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Métodos de pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Configura los métodos de pago aceptados en tu barbería. Los métodos inactivos no aparecerán al registrar servicios.</p>

            {paymentMethods.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">Cargando métodos de pago...</p>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className={`flex items-center gap-3 rounded-lg border p-3 ${pm.active ? "" : "opacity-50"}`}>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pm.label}</p>
                      <p className="text-xs text-muted-foreground">{pm.key}</p>
                    </div>
                    <Button
                      size="sm"
                      variant={pm.active ? "default" : "outline"}
                      className="h-7 px-3 text-xs"
                      onClick={async () => {
                        setPmSaving(true);
                        await adapter.updateShopPaymentMethod(pm.id, { active: !pm.active });
                        setPaymentMethods((prev) => prev.map((p) => p.id === pm.id ? { ...p, active: !p.active } : p));
                        setPmSaving(false);
                      }}
                      disabled={pmSaving}
                    >
                      {pm.active ? "Activo" : "Inactivo"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={async () => {
                        if (!confirm(`Eliminar método "${pm.label}"?`)) return;
                        setPmSaving(true);
                        await adapter.deleteShopPaymentMethod(pm.id);
                        setPaymentMethods((prev) => prev.filter((p) => p.id !== pm.id));
                        setPmSaving(false);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Input
                value={newPmKey}
                onChange={(e) => setNewPmKey(e.target.value)}
                placeholder="Clave (ej: PSE)"
                className="w-32"
              />
              <Input
                value={newPmLabel}
                onChange={(e) => setNewPmLabel(e.target.value)}
                placeholder="Nombre visible (ej: PSE)"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!newPmKey.trim() || !newPmLabel.trim()) return;
                  setPmSaving(true);
                  try {
                    const newPm = await adapter.addShopPaymentMethod({
                      key: newPmKey.trim(),
                      label: newPmLabel.trim(),
                      sort_order: paymentMethods.length + 1,
                    });
                    setPaymentMethods((prev) => [...prev, newPm]);
                    setNewPmKey("");
                    setNewPmLabel("");
                  } catch (err: any) {
                    alert(err?.message || "Error agregando método");
                  } finally {
                    setPmSaving(false);
                  }
                }}
                disabled={pmSaving || !newPmKey.trim() || !newPmLabel.trim()}
              >
                <Plus className="h-4 w-4 mr-1" /> Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
        {saved && <span className="text-sm text-green-600">Guardado correctamente</span>}
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Cambiar contraseña
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Actualiza la contraseña de tu cuenta de administrador.</p>
            {passwordError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{passwordError}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label>Confirmar contraseña</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }} placeholder="Repite la contraseña" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={async () => {
                  setPasswordError("");
                  setPasswordSaved(false);
                  if (newPassword.length < 6) { setPasswordError("La contraseña debe tener al menos 6 caracteres"); return; }
                  if (newPassword !== confirmPassword) { setPasswordError("Las contraseñas no coinciden"); return; }
                  setPasswordSaving(true);
                  try {
                    await adapter.changePassword(newPassword);
                    setPasswordSaved(true);
                    setNewPassword("");
                    setConfirmPassword("");
                    setTimeout(() => setPasswordSaved(false), 3000);
                  } catch (err: any) {
                    setPasswordError(err.message || "Error al cambiar contraseña");
                  } finally {
                    setPasswordSaving(false);
                  }
                }}
                disabled={passwordSaving || !newPassword}
              >
                {passwordSaving ? "Guardando..." : "Cambiar contraseña"}
              </Button>
              {passwordSaved && <span className="text-sm text-green-600">Contraseña actualizada correctamente</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
