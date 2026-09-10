export interface ServiceRecord {
  record_id: string;
  appointment_id: string;
  client_id: string;
  client_name?: string;
  barber_id: string;
  barber_name?: string;
  service_id: string;
  service_name?: string;
  date: string;
  price_charged: number;
  tip: number;
  notes: string;
  created_at: string;
}
