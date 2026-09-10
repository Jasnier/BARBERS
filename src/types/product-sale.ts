export interface ProductSale {
  sale_id: string;
  shop_id: string;
  product_id: string;
  client_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  sold_at: string;
}
