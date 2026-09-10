import { useEffect, useState, useRef, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Gift, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { FormattedInput } from "@/components/shared/FormattedInput";
import { formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { Service, ServiceRequest, Client, ShopConfig } from "@/types";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export function BarberNewService() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [price, setPrice] = useState("");
  const [tip, setTip] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isFree, setIsFree] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loyaltyEnabled = config?.rewards?.loyalty?.enabled || false;
  const visitsRequired = config?.rewards?.loyalty?.visits_required || 10;
  const rewardMsg = config?.rewards?.loyalty?.reward_message || "¡Corte gratis!";

  const isClientEligible = (client: Client) => {
    if (!loyaltyEnabled) return false;
    return (client.total_visits || 0) >= visitsRequired;
  };

  const load = async () => {
    if (!user?.barber_id) return;
    const [svcs, reqs, clis, cfg] = await Promise.all([
      adapter.getServices(),
      adapter.getServiceRequests({ barber_id: user.barber_id }),
      adapter.getClients(),
      adapter.getShopConfig(),
    ]);
    setServices(svcs);
    setRequests(reqs);
    setClients(clis);
    setConfig(cfg);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  const handleClientNameChange = (value: string) => {
    setClientName(value);
    setIsNewClient(false);
    setClientPhone("");
    setSelectedClient(null);
    setIsFree(false);

    if (value.trim().length === 0) {
      setFilteredClients([]);
      setShowDropdown(false);
      return;
    }

    const query = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matches = clients.filter((c) => {
      const name = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const phone = (c.phone || "").toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
    setFilteredClients(matches.slice(0, 8));
    setShowDropdown(true);
  };

  const selectClient = (client: Client) => {
    setClientName(client.name);
    setClientPhone(client.phone || "");
    setSelectedClient(client);
    setIsNewClient(false);
    setShowDropdown(false);

    if (isClientEligible(client)) {
      setIsFree(true);
    } else {
      setIsFree(false);
    }
  };

  const handleNewClient = () => {
    setIsNewClient(true);
    setSelectedClient(null);
    setShowDropdown(false);
    setClientPhone("");
    setIsFree(false);
  };

  const handleServiceChange = (sid: string) => {
    setServiceId(sid);
    const svc = services.find((s) => s.service_id === sid);
    if (svc && !isFree) setPrice(String(svc.price));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.barber_id) return;
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      let photoUrl = "";
      if (photo) {
        try {
          photoUrl = await adapter.uploadServicePhoto(photo);
        } catch (photoErr) {
          console.warn("Photo upload failed, continuing without photo:", photoErr);
        }
      }

      const svc = services.find((s) => s.service_id === serviceId);
      const chargedPrice = isFree ? 0 : Number(price);

      // If new client, create with active:false (pending admin approval)
      if (isNewClient && clientName.trim() && clientPhone.trim()) {
        const last4 = clientPhone.replace(/\D/g, "").slice(-4);
        try {
          await adapter.createClient({
            name: clientName.trim(),
            phone: clientPhone.trim(),
            email: "",
            notes: "",
            pin_hash: last4,
            active: false,
            shop_id: "",
          } as any);
        } catch (clientErr: any) {
          // Client may already exist, continue with service request
          console.warn("Client creation skipped:", clientErr?.message);
        }
      }

      await adapter.createServiceRequest({
        barber_id: user.barber_id,
        client_name: clientName,
        client_phone: clientPhone,
        service_id: serviceId,
        service_name: svc?.name || "",
        price_charged: chargedPrice,
        tip: isFree ? 0 : Number(tip) || 0,
        photo_url: photoUrl,
        notes: isFree ? `[GRATIS - Fidelidad] ${notes}` : notes,
        is_free: isFree,
        payment_method: "CASH",
      });

      setSuccess(isFree ? "Servicio gratis registrado correctamente" : "Servicio enviado para aprobación");
      setClientName("");
      setClientPhone("");
      setServiceId("");
      setPrice("");
      setTip("");
      setNotes("");
      setPhoto(null);
      setPhotoPreview("");
      setIsNewClient(false);
      setSelectedClient(null);
      setIsFree(false);
      load();
    } catch (err: any) {
      console.error("Service request error:", err);
      const msg = err?.message || err?.error?.message || "Error al enviar";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Registrar servicio" description="Registra un servicio sin cita previa" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Nuevo servicio</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>}

              {/* Client autocomplete */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="relative" ref={dropdownRef}>
                  <Input
                    value={clientName}
                    onChange={(e) => handleClientNameChange(e.target.value)}
                    onFocus={() => { if (filteredClients.length > 0) setShowDropdown(true); }}
                    required
                    placeholder="Escribe nombre o teléfono..."
                  />
                  {showDropdown && filteredClients.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
                      {filteredClients.map((c) => (
                        <button
                          key={c.client_id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                          onClick={() => selectClient(c)}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="flex items-center gap-2">
                            {isClientEligible(c) && <Trophy className="h-3 w-3 text-yellow-500" />}
                            <span className="text-xs text-muted-foreground">{c.phone || "sin teléfono"}</span>
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 last:rounded-b-lg"
                        onClick={handleNewClient}
                      >
                        <span>+ Nuevo cliente:</span>
                        <span className="font-medium">"{clientName}"</span>
                      </button>
                    </div>
                  )}
                  {showDropdown && filteredClients.length === 0 && clientName.trim().length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                        onClick={handleNewClient}
                      >
                        <span>+ Registrar como nuevo cliente:</span>
                        <span className="font-medium">"{clientName}"</span>
                      </button>
                    </div>
                  )}
                </div>
                {isNewClient && (
                  <p className="text-xs text-blue-600">Nuevo cliente — ingresa el teléfono abajo</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Teléfono del cliente *</Label>
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} required placeholder="Ej: 55 1234 5678" />
              </div>

              <div className="space-y-2">
                <Label>Servicio *</Label>
                <Select value={serviceId} onValueChange={handleServiceChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.service_id} value={s.service_id}>{s.name} — {formatCurrency(s.price)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Free service toggle */}
              {selectedClient && isClientEligible(selectedClient) && (
                <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">{rewardMsg}</p>
                        <p className="text-xs text-green-700">
                          {selectedClient.name} tiene {(selectedClient.total_visits || 0)} cortes
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isFree;
                        setIsFree(next);
                        if (next) {
                          const svc = services.find((s) => s.service_id === serviceId);
                          if (svc) setPrice(String(svc.price));
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isFree ? "bg-green-600" : "bg-gray-300"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isFree ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                  {isFree && (
                    <Badge className="mt-2 bg-green-100 text-green-800">
                      <Gift className="mr-1 h-3 w-3" /> Servicio sin costo
                    </Badge>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Cobrado (del servicio)</Label>
                <FormattedInput
                  value={isFree ? "0" : price}
                  onChange={isFree ? () => {} : setPrice}
                  readOnly={isFree}
                  className={isFree ? "bg-green-50 text-green-700 line-through" : "bg-gray-50 font-semibold"}
                />
                <p className="text-xs text-muted-foreground">
                  {isFree ? "Servicio gratis por fidelidad" : "Precio definido por el servicio"}
                </p>
              </div>

              {!isFree && (
                <div className="space-y-2">
                  <Label>Propina (opcional)</Label>
                  <FormattedInput value={tip} onChange={setTip} min={0} placeholder="0" />
                  <p className="text-xs text-muted-foreground">100% para el barbero, sin comisión</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Foto (opcional)</Label>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-accent">
                    <Camera className="h-4 w-4" />
                    {photo ? "Cambiar foto" : "Subir foto"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPhoto(file);
                        setPhotoPreview(URL.createObjectURL(file));
                      }
                    }} />
                  </label>
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="h-16 w-16 rounded object-cover" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalles adicionales" />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Enviando..." : isFree ? "Registrar servicio gratis" : "Enviar para aprobación"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mis solicitudes</CardTitle></CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin solicitudes aún</p>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => (
                  <div key={r.request_id} className="flex items-start justify-between rounded-lg border p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{r.client_name}</p>
                        {(r as any).is_free && <Gift className="h-3 w-3 text-green-600" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.service_name} — {(r as any).is_free ? (
                          <span className="font-semibold text-green-600">GRATIS</span>
                        ) : (
                          formatCurrency(r.price_charged)
                        )}
                      </p>
                      {r.photo_url && (
                        <a href={r.photo_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                          Ver foto
                        </a>
                      )}
                      {r.status === "rejected" && r.rejection_reason && (
                        <p className="mt-1 text-xs text-red-600">Motivo: {r.rejection_reason}</p>
                      )}
                    </div>
                    <Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
