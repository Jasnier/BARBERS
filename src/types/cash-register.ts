export type CashRegisterStatus = "OPEN" | "CLOSED";

export type CashMovementType = "INCOME" | "EXPENSE" | "WITHDRAWAL" | "ADJUSTMENT";

export type CashMovementCategory =
  | "SERVICE"
  | "PRODUCT"
  | "TIP"
  | "OTHER_INCOME"
  | "SUPPLIES"
  | "RENT"
  | "UTILITIES"
  | "SALARIES"
  | "OTHER_EXPENSE"
  | "WITHDRAWAL"
  | "ADJUSTMENT";

export type PaymentMethod = "CASH" | "NEQUI" | "DAVIPLATA" | "CARD" | "TRANSFER" | "OTHER";

export interface CashRegister {
  id: string;
  shop_id: string;
  opened_by: string;
  opened_by_name: string;
  opened_at: string;
  opening_amount: number;
  closed_by: string;
  closed_by_name: string;
  closed_at: string | null;
  expected_cash: number;
  counted_cash: number;
  difference: number;
  closing_note: string;
  closing_reason: string;
  status: CashRegisterStatus;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  shop_id: string;
  type: CashMovementType;
  category: CashMovementCategory;
  amount: number;
  payment_method: PaymentMethod;
  description: string;
  reference_type: string;
  reference_id: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface CashRegisterSummary {
  totalIncome: number;
  totalExpense: number;
  totalWithdrawal: number;
  totalAdjustment: number;
  expectedCash: number;
  incomeByMethod: Record<PaymentMethod, number>;
  expenseByMethod: Record<PaymentMethod, number>;
  movementCount: number;
}
