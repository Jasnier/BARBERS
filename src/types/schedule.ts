export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface Schedule {
  schedule_id: string;
  barber_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  active: boolean;
}

export interface ShopCategory {
  id: string;
  name: string;
}

export interface LoyaltyConfig {
  enabled: boolean;
  visits_required: number;
  reward_message: string;
}

export interface RewardDynamic {
  id: string;
  name: string;
  description: string;
  type: "raffle" | "promotion" | "custom";
  active: boolean;
}

export interface RewardsConfig {
  enabled: boolean;
  loyalty: LoyaltyConfig;
  dynamics: RewardDynamic[];
}

export interface ShopConfig {
  shop_name: string;
  timezone: string;
  currency: string;
  open_time: string;
  close_time: string;
  commission_type: "service" | "daily";
  categories: ShopCategory[];
  rewards: RewardsConfig;
}
