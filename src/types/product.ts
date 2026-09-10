export interface Product {
  product_id: string;
  shop_id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  active: boolean;
  created_at: string;
}
