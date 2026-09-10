export type SettlementStatus = "DRAFT" | "APPROVED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type AdjustmentType = "BONUS" | "DEDUCTION" | "ADVANCE" | "CORRECTION" | "OTHER";

export interface Settlement {
  id: string;
  barbershop_id: string;
  barber_id: string;
  barber_name: string;
  period_start: string;
  period_end: string;
  services_total: number;
  commission_total: number;
  tips_total: number;
  adjustments_total: number;
  advances_total: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: SettlementStatus;
  created_by: string;
  created_by_name: string;
  approved_by: string;
  approved_by_name: string;
  approved_at: string | null;
  cancelled_by: string;
  cancelled_by_name: string;
  cancelled_at: string | null;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
}

export interface SettlementItem {
  id: string;
  settlement_id: string;
  barbershop_id: string;
  income_id: string;
  service_name: string;
  client_name: string;
  service_date: string;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  commission_rate: number;
  commission_amount: number;
  tip_amount: number;
  created_at: string;
}

export interface SettlementAdjustment {
  id: string;
  settlement_id: string;
  barbershop_id: string;
  type: AdjustmentType;
  amount: number;
  description: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface SettlementPayment {
  id: string;
  settlement_id: string;
  barbershop_id: string;
  amount: number;
  payment_method: string;
  paid_at: string;
  paid_by: string;
  paid_by_name: string;
  notes: string;
  cash_movement_id: string;
  status: "ACTIVE" | "CANCELLED";
  cancelled_at: string | null;
  cancellation_reason: string;
  created_at: string;
}

export interface SettlementWithDetails extends Settlement {
  items: SettlementItem[];
  adjustments: SettlementAdjustment[];
  payments: SettlementPayment[];
}
