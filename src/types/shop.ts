export interface Shop {
  shop_id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  owner_name: string;
  active: boolean;
  blocked: boolean;
  block_reason: string;
  subscription_plan: "trial" | "monthly" | "yearly" | "custom";
  subscription_start: string | null;
  subscription_end: string | null;
  created_at: string;
}
