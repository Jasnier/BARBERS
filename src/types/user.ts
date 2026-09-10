export type Role = "admin" | "barber" | "supersistema";

export interface User {
  user_id: string;
  shop_id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  created_at: string;
  barber_id?: string;
}

export interface AuthResult {
  token: string;
  user: User;
  shop_id: string;
}
