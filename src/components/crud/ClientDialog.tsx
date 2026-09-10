import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import adapter from "@/services";
import type { Client } from "@/types";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved: () => void;
}

export function ClientDialog({ open, onOpenChange, client, onSaved }: ClientDialogProps) {
  const isEdit = !!client;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const last4 = useMemo(() => {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 4 ? digits.slice(-4) : "";
  }, [phone]);

  useEffect(() => {
    if (open) {
      setName(client?.name || "");
      setPhone(client?.phone || "");
      setEmail(client?.email || "");
      setNotes(client?.notes || "");
      setError("");
    }
  }, [open, client]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isEdit && client) {
        await adapter.updateClient(client.client_id, { name, phone, email, notes });
      } else {
        await adapter.createClient({
          name,
          phone,
          email,
          notes,
          pin_hash: last4,
          active: true,
          shop_id: "",
        } as Omit<Client, "client_id" | "created_at" | "last_visit" | "total_visits">);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
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
          {!isEdit && last4 && (
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700">
              PIN inicial: <strong>{last4}</strong> (últimos 4 dígitos del teléfono). El cliente puede cambiarlo desde la app.
            </div>
          )}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferencias, etc." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
