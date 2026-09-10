import { useState, useEffect, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormattedInput } from "@/components/shared/FormattedInput";
import { supabase } from "@/services/supabase/client";
import adapter from "@/services";
import type { Barber } from "@/types";

interface BarberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barber?: Barber | null;
  onSaved: () => void;
}

export function BarberDialog({ open, onOpenChange, barber, onSaved }: BarberDialogProps) {
  const isEdit = !!barber;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [commissionRate, setCommissionRate] = useState("40");
  const [commissionType, setCommissionType] = useState<"service" | "daily">("service");
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("barber123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(barber?.name || "");
      setPhone(barber?.phone || "");
      setSpecialty(barber?.specialty || "");
      setCommissionRate(String(barber?.commission_rate ?? 40));
      setCommissionType(barber?.commission_type || "service");
      setAccessCode("");
      setPassword("barber123");
      setError("");
    }
  }, [open, barber]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let userId = barber?.user_id || "";

      // Create Supabase Auth user for new barbers
      if (!isEdit && accessCode) {
        const internalEmail = `${accessCode.toLowerCase().replace(/\s/g, "")}@barberpro.local`;

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: internalEmail,
          password,
          options: { data: { name, role: "barber" } },
        });
        if (authError) throw new Error("Error creando usuario: " + authError.message);
        userId = authData.user?.id || "";

        // Create entry in public.users table
        const { error: userError } = await supabase.from("users").insert({
          user_id: userId,
          email: internalEmail,
          name,
          role: "barber",
          active: true,
          password_hash: "supabase_auth",
          access_code: accessCode.toLowerCase().replace(/\s/g, ""),
        });
        if (userError) console.warn("Could not create users entry:", userError.message);
      }

      const barberData = {
        name, phone, specialty,
        commission_rate: Number(commissionRate),
        commission_type: commissionType,
        active: true,
        avatar_url: barber?.avatar_url || "",
        user_id: userId,
      } as Omit<Barber, "barber_id">;

      if (isEdit && barber) {
        await adapter.updateBarber(barber.barber_id, barberData);
      } else {
        await adapter.createBarber(barberData);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar barbero" : "Nuevo barbero"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Especialidad</Label>
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Comisión %</Label>
              <FormattedInput value={commissionRate} onChange={setCommissionRate} min={0} max={100} placeholder="40" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={commissionType} onValueChange={(v) => setCommissionType(v as "service" | "daily")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Por servicio</SelectItem>
                  <SelectItem value="daily">Diario</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isEdit && (
            <>
              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Cuenta de acceso del barbero</p>
              </div>
              <div className="space-y-2">
                <Label>Código de acceso *</Label>
                <Input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  required
                  placeholder="Ej: carlos, miguel_01"
                />
                <p className="text-xs text-muted-foreground">El barbero usará este código para iniciar sesión</p>
              </div>
              <div className="space-y-2">
                <Label>Contraseña *</Label>
                <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <p className="text-xs text-muted-foreground">Contraseña inicial (el barbero puede cambiarla después)</p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
