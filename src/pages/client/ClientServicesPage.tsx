import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Scissors, Clock, Megaphone, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import adapter from "@/services";
import type { Service, Promotion } from "@/types";

export function ClientServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adapter.getServices(), adapter.getPromotions()])
      .then(([s, p]) => { setServices(s); setPromotions(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  const getPromoForService = (serviceId: string) => promotions.find((p) => p.service_id === serviceId);

  const getDiscountedPrice = (service: Service, promo: Promotion) => {
    if (promo.discount_type === "percentage") {
      return service.price * (1 - promo.discount_value / 100);
    }
    return Math.max(0, service.price - promo.discount_value);
  };

  const grouped = services.reduce((acc, s) => {
    const cat = s.category || "Otros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Servicios</h1>
        <p className="text-sm text-muted-foreground">Conoce nuestros servicios y precios</p>
      </div>

      {/* Active Promotions Banner */}
      {promotions.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-orange-600">
            <Megaphone className="h-4 w-4" /> Promociones activas
          </h2>
          <div className="space-y-3">
            {promotions.map((promo) => (
              <Card key={promo.promotion_id} className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                    <Tag className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-orange-800">{promo.title}</p>
                    <p className="text-xs text-orange-700">
                      {promo.service_name} — {promo.discount_type === "percentage" ? `${promo.discount_value}% de descuento` : `$${promo.discount_value.toLocaleString("es-CO")} de descuento`}
                    </p>
                    {promo.description && <p className="text-xs text-orange-600 mt-0.5">{promo.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-orange-600">Vigente hasta</p>
                    <p className="text-xs font-medium text-orange-800">{promo.end_date}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Services by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">{category}</h2>
          <div className="space-y-3">
            {items.map((service) => {
              const promo = getPromoForService(service.service_id);
              const promoPrice = promo ? getDiscountedPrice(service, promo) : null;
              return (
                <Card key={service.service_id} className={promo ? "border-orange-200" : ""}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <Scissors className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{service.name}</p>
                        {promo && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                            <Tag className="h-3 w-3" /> OFERTA
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {service.duration_min} min
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {promoPrice !== null ? (
                        <>
                          <p className="text-sm text-muted-foreground line-through">{formatCurrency(service.price)}</p>
                          <p className="text-lg font-bold text-orange-600">{formatCurrency(promoPrice)}</p>
                        </>
                      ) : (
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(service.price)}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {services.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center p-10 text-center">
            <Scissors className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No hay servicios disponibles</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
