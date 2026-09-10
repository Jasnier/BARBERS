export interface Barber {
  barber_id: string;
  user_id: string;
  name: string;
  phone: string;
  specialty: string;
  commission_rate: number;
  commission_type: "service" | "daily";
  active: boolean;
  avatar_url: string;
}
