import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ProductDialog } from "@/components/crud/ProductDialog";
import { Package, Pencil, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { Product } from "@/types";

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [salesCounts, setSalesCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const prods = await adapter.getProducts();
      setProducts(prods);
      const counts: Record<string, number> = {};
      await Promise.all(prods.map(async (p) => {
        counts[p.product_id] = await adapter.getProductSalesCount(p.product_id);
      }));
      setSalesCounts(counts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este producto?")) return;
    await adapter.deleteProduct(id);
    load();
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div>
      <PageHeader title="Productos" description="Gestiona los productos de tu barbershop">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>Nuevo producto</Button>
      </PageHeader>

      {products.length === 0 ? (
        <EmptyState
          title="Sin productos"
          description="Agrega tu primer producto para vender en la barbershop."
          icon={<Package className="h-6 w-6 text-muted-foreground" />}
          action={{ label: "Nuevo producto", onClick: () => { setEditing(null); setDialogOpen(true); } }}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card key={product.product_id} className="overflow-hidden relative group">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="h-40 w-full object-contain bg-muted" />
              ) : (
                <div className="h-40 w-full bg-muted flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <CardContent className="p-3 space-y-2">
                <p className="font-semibold text-sm truncate">{product.name}</p>
                {product.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(product.price)}</p>
                  {salesCounts[product.product_id] > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShoppingCart className="h-3 w-3" /> {salesCounts[product.product_id]}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Stock: {product.stock}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(product); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(product.product_id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} onSaved={load} />
    </div>
  );
}
