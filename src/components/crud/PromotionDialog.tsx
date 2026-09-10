import { useState, useEffect, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import adapter from "@/services";
import type { Promotion, Service } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion?: Promotion | null;
  services: Service[];
  onSaved: () => void;
}

export function PromotionDialog({ open, onOpenChange, promotion, services, onSaved }: Props) {
  const isEdit = !!promotion;
  const [serviceId, setServiceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setServiceId(promotion?.service_id || "");
      setTitle(promotion?.title || "");
      setDescription(promotion?.description || "");
      setDiscountType(promotion?.discount_type || "percentage");
      setDiscountValue(promotion ? String(promotion.discount_value) : "");
      setStartDate(promotion?.start_date || "");
      setEndDate(promotion?.end_date || "");
      setError("");
    }
  }, [open, promotion]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        service_id: serviceId,
        title: title.trim(),
        description: description.trim(),
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
        start_date: startDate,
        end_date: endDate,
        active: true,
        shop_id: "",
      };
      if (isEdit && promotion) {
        await adapter.updatePromotion(promotion.promotion_id, payload);
      } else {
        await adapter.createPromotion(payload as any);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar promocion" : "Nueva promocion"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div className="space-y-2">
            <Label>Servicio *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.service_id} value={s.service_id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Titulo de la promocion *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ej: 2x1 en cortes" />
          </div>

          <div className="space-y-2">
            <Label>Descripcion</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles de la promocion" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de descuento *</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                  <SelectItem value="fixed">Valor fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{discountType === "percentage" ? "Descuento %" : "Descuento $"}</Label>
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
                min={0}
                max={discountType === "percentage" ? 100 : undefined}
                placeholder={discountType === "percentage" ? "Ej: 20" : "Ej: 5000"}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha inicio *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
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
