import type { PaymentMethod } from "./cash-register";

export interface ShopPaymentMethod {
  id: string;
  shop_id: string;
  key: PaymentMethod | string;
  label: string;
  active: boolean;
  sort_order: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  shop_id: string;
  reference_type: string;
  reference_id: string;
  amount: number;
  payment_method: PaymentMethod | string;
  description: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}
