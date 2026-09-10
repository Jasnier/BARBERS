export interface Promotion {
  promotion_id: string;
  shop_id: string;
  service_id: string;
  service_name?: string;
  title: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
}
