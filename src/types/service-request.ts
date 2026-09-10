export interface ServiceRequest {
  request_id: string;
  barber_id: string;
  barber_name?: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  service_name: string;
  price_charged: number;
  tip: number;
  is_free: boolean;
  photo_url: string;
  notes: string;
  payment_method: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string;
  reviewed_at: string;
  created_at: string;
}
