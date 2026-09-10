export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Appointment {
  appointment_id: string;
  client_id: string;
  client_name?: string;
  barber_id: string;
  barber_name?: string;
  service_id: string;
  service_name?: string;
  service_price?: number;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string;
  created_by: string;
  created_at: string;
  payment_method?: string;
  tip?: number;
  _expired?: boolean;
}

export interface AppointmentFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  barber_id?: string;
  status?: AppointmentStatus;
}
