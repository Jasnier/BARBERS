import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Package, Heart, ShoppingCart, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import type { Product } from "@/types";

export function ClientProductsPage() {
  const { client } = useClientAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [salesCounts, setSalesCounts] = useState<Record<string, number>>({});

  const clientId = client?.client_id || "";

  const loadData = useCallback(async () => {
    try {
      const prods = await adapter.getProducts();
      setProducts(prods);
      if (clientId) {
        const favIds = await adapter.getFavoriteProductIds(clientId);
        setFavorites(new Set(favIds));
        const counts: Record<string, number> = {};
        await Promise.all(prods.map(async (p) => {
          counts[p.product_id] = await adapter.getProductSalesCount(p.product_id);
        }));
        setSalesCounts(counts);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleFav = async (productId: string) => {
    if (!clientId) return;
    const isFav = await adapter.toggleProductFavorite(clientId, productId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.add(productId); else next.delete(productId);
      return next;
    });
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const topProducts = [...products]
    .sort((a, b) => (salesCounts[b.product_id] || 0) - (salesCounts[a.product_id] || 0))
    .filter((p) => (salesCounts[p.product_id] || 0) > 0)
    .slice(0, 4);

  const grouped = products.reduce((acc, p) => {
    const cat = p.category || "Otros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Productos</h1>
        <p className="text-sm text-muted-foreground">Conoce los productos disponibles en la barbershop</p>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center p-10 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No hay productos disponibles</p>
            <p className="text-sm text-muted-foreground">Pronto se agregaran productos</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {topProducts.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                <Star className="h-4 w-4 text-yellow-500" /> Mas vendidos
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topProducts.map((product) => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    isFavorite={favorites.has(product.product_id)}
                    salesCount={salesCounts[product.product_id] || 0}
                    onToggleFav={() => toggleFav(product.product_id)}
                    showBadge
                  />
                ))}
              </div>
            </div>
          )}

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">{category}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {items.map((product) => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    isFavorite={favorites.has(product.product_id)}
                    salesCount={salesCounts[product.product_id] || 0}
                    onToggleFav={() => toggleFav(product.product_id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ProductCard({ product, isFavorite, salesCount, onToggleFav, showBadge }: {
  product: Product;
  isFavorite: boolean;
  salesCount: number;
  onToggleFav: () => void;
  showBadge?: boolean;
}) {
  return (
    <Card className="overflow-hidden relative group">
      {showBadge && salesCount > 0 && (
        <Badge className="absolute top-2 left-2 z-10 bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
          <Star className="h-3 w-3 mr-1" /> Top vendido
        </Badge>
      )}
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="h-40 w-full object-contain bg-muted" />
      ) : (
        <div className="h-40 w-full bg-muted flex items-center justify-center">
          <Package className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <CardContent className="p-3 space-y-2">
        <p className="font-semibold text-sm truncate">{product.name}</p>
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-blue-600">{formatCurrency(product.price)}</p>
          <Button
            variant="ghost" size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggleFav}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {product.stock > 0 ? `${product.stock} disp.` : "Agotado"}
          </span>
          {salesCount > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" /> {salesCount} vendidos
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
