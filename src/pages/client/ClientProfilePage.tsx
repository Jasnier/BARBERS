import { useState, type FormEvent } from "react";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, FileText } from "lucide-react";
import adapter from "@/services";

export function ClientProfilePage() {
  const { client, shopName } = useClientAuth();
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [email, setEmail] = useState(client?.email || "");
  const [notes, setNotes] = useState(client?.notes || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const updated = await adapter.updateClientProfile(client.client_id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
      });
      // Update local session with new data
      const stored = localStorage.getItem("barberpro_client_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.client = updated;
        localStorage.setItem("barberpro_client_session", JSON.stringify(parsed));
      }
      setSuccess("Perfil actualizado correctamente");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">{shopName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Informacion de contacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefono</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Notas / Preferencias</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Prefiere corte con tijera, alergias, etc." />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
              {client.name?.charAt(0) || "C"}
            </div>
            <div>
              <p className="text-sm font-medium">{client.name}</p>
              <p className="text-xs text-muted-foreground">Cliente desde {new Date(client.created_at).toLocaleDateString("es-CO")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
