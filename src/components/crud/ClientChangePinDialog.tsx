import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import adapter from "@/services";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientChangePinDialog({ open, onOpenChange }: Props) {
  const { client } = useClientAuth();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPin !== confirmPin) { setError("Los PIN no coinciden"); return; }
    if (newPin.length < 4) { setError("El PIN debe tener al menos 4 dígitos"); return; }
    if (newPin === currentPin) { setError("El nuevo PIN debe ser diferente al actual"); return; }
    setLoading(true);
    try {
      await adapter.changeClientPin(client!.client_id, currentPin, newPin);
      setSuccess(true);
      setCurrentPin(""); setNewPin(""); setConfirmPin("");
      setTimeout(() => { setSuccess(false); onOpenChange(false); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPin(""); setNewPin(""); setConfirmPin(""); setError(""); setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar PIN</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold text-green-600">✓ PIN actualizado</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <div className="space-y-2">
              <Label>PIN actual</Label>
              <Input type="password" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Nuevo PIN (mínimo 4 dígitos)</Label>
              <Input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} minLength={4} required />
            </div>
            <div className="space-y-2">
              <Label>Confirmar nuevo PIN</Label>
              <Input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} minLength={4} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
