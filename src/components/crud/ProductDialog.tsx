import { useState, useEffect, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import adapter from "@/services";
import type { Product } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSaved: () => void;
}

export function ProductDialog({ open, onOpenChange, product, onSaved }: Props) {
  const isEdit = !!product;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(product?.name || "");
      setDescription(product?.description || "");
      setPrice(product ? String(product.price) : "");
      setStock(product ? String(product.stock) : "");
      setCategory(product?.category || "");
      setImageUrl(product?.image_url || "");
      setError("");
    }
  }, [open, product]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        category: category.trim(),
        image_url: imageUrl.trim(),
        active: true,
        shop_id: "",
      };
      if (isEdit && product) {
        await adapter.updateProduct(product.product_id, payload);
      } else {
        await adapter.createProduct(payload as Omit<Product, "product_id" | "created_at">);
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
          <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej: Gorra BarberPro" />
          </div>
          <div className="space-y-2">
            <Label>Descripcion</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion del producto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Precio *</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min={0} />
            </div>
            <div className="space-y-2">
              <Label>Stock *</Label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required min={0} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Accesorios, Cuidado capilar" />
          </div>
          <div className="space-y-2">
            <Label>URL de imagen (opcional)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            {imageUrl && (
              <img src={imageUrl} alt="Vista previa" className="h-40 w-full object-contain bg-muted rounded-lg mt-2" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
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
