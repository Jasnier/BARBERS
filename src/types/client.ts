export interface Client {
  client_id: string;
  shop_id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
  last_visit: string;
  total_visits: number;
  pin_hash: string;
  active: boolean;
}

export interface ClientSession {
  client: Client;
  shop_name: string;
  token: string;
}
