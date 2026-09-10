export interface ExpenseCategory {
  id: string;
  shop_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export type ExpenseStatus = "ACTIVE" | "CANCELLED";
export type WithdrawalReason = "RETIRO_PROPIETARIO" | "DEPOSITO_BANCARIO" | "COMPRA_EXTERNA" | "CAMBIO_EFECTIVO" | "OTRO";

export interface Expense {
  id: string;
  shop_id: string;
  cash_register_id: string;
  category_id: string;
  category_name?: string;
  amount: number;
  payment_method: string;
  description: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  status: ExpenseStatus;
  cancelled_by: string;
  cancelled_by_name: string;
  cancelled_at: string | null;
  cancellation_reason: string;
  cash_movement_id: string;
}

export interface Withdrawal {
  id: string;
  shop_id: string;
  cash_register_id: string;
  amount: number;
  reason: string;
  description: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  status: ExpenseStatus;
  cancelled_by: string;
  cancelled_by_name: string;
  cancelled_at: string | null;
  cancellation_reason: string;
  cash_movement_id: string;
}

export type AdminMovementType = "EXPENSE" | "WITHDRAWAL";

export interface AdminMovement {
  id: string;
  type: AdminMovementType;
  date: string;
  category: string;
  amount: number;
  payment_method: string;
  description: string;
  created_by_name: string;
  status: ExpenseStatus;
  cancelled_at: string | null;
  cancellation_reason: string;
}
