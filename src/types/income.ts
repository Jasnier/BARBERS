export interface IncomeRecord {
  income_id: string;
  record_id: string;
  barber_id: string;
  barber_name?: string;
  service_id: string;
  service_name?: string;
  date: string;
  gross_amount: number;
  commission_amount: number;
  shop_amount: number;
  tip: number;
  recorded_at: string;
}

export interface BarberCommission {
  barber_id: string;
  barber_name: string;
  total_services: number;
  total_gross: number;
  total_commission: number;
  total_tips: number;
  period: string;
}
