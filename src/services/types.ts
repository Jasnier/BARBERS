import type {
  User,
  AuthResult,
  Client,
  ClientSession,
  Barber,
  Service,
  Appointment,
  AppointmentFilters,
  ServiceRecord,
  ServiceRequest,
  IncomeRecord,
  BarberCommission,
  Schedule,
  ShopConfig,
  Shop,
  Product,
  Promotion,
  CashRegister,
  CashMovement,
  CashMovementType,
  PaymentMethod,
  ShopPaymentMethod,
  Payment,
  ExpenseCategory,
  Expense,
  Withdrawal,
  AdminMovement,
  Settlement,
  SettlementPayment,
  SettlementWithDetails,
} from "@/types";

export interface DataAdapter {
  login(identifier: string, password: string, mode?: "admin" | "barber" | "supersistema"): Promise<AuthResult>;
  logout(): Promise<void>;
  validateToken(token: string): Promise<User>;

  getClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client>;
  createClient(data: Omit<Client, "client_id" | "created_at" | "last_visit" | "total_visits">): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  getBarbers(): Promise<Barber[]>;
  getBarberById(id: string): Promise<Barber>;
  createBarber(data: Omit<Barber, "barber_id">): Promise<Barber>;
  updateBarber(id: string, data: Partial<Barber>): Promise<Barber>;
  deleteBarber(id: string): Promise<void>;

  getServices(): Promise<Service[]>;
  getServiceById(id: string): Promise<Service>;
  createService(data: Omit<Service, "service_id">): Promise<Service>;
  updateService(id: string, data: Partial<Service>): Promise<Service>;
  deleteService(id: string): Promise<void>;

  getAppointments(filters: AppointmentFilters): Promise<Appointment[]>;
  getAppointmentById(id: string): Promise<Appointment>;
  createAppointment(data: Omit<Appointment, "appointment_id" | "created_at">): Promise<Appointment>;
  updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: Appointment["status"], completionData?: { payment_method?: string; tip?: number; notes?: string }): Promise<void>;
  deleteAppointment(id: string): Promise<void>;

  getServiceRecords(filters?: { date?: string; barber_id?: string }): Promise<ServiceRecord[]>;
  createServiceRecord(data: Omit<ServiceRecord, "record_id" | "created_at">): Promise<ServiceRecord>;

  // Service Requests (walk-ins)
  getServiceRequests(filters?: { status?: string; barber_id?: string }): Promise<ServiceRequest[]>;
  createServiceRequest(data: Omit<ServiceRequest, "request_id" | "created_at" | "status" | "rejection_reason" | "reviewed_at">): Promise<ServiceRequest>;
  reviewServiceRequest(id: string, status: "approved" | "rejected", reason?: string, paymentMethod?: string): Promise<void>;
  uploadServicePhoto(file: File): Promise<string>;

  getIncome(filters?: { date_from?: string; date_to?: string; barber_id?: string }): Promise<IncomeRecord[]>;
  getCommissions(period: string, barberId?: string): Promise<BarberCommission[]>;

  getSchedules(barberId: string): Promise<Schedule[]>;
  updateSchedules(barberId: string, schedules: Omit<Schedule, "schedule_id">[]): Promise<void>;

  getShopConfig(): Promise<ShopConfig>;
  updateShopConfig(config: Partial<ShopConfig>): Promise<ShopConfig>;

  // Super admin: shops
  getShops(): Promise<Shop[]>;
  getShopById(shopId: string): Promise<Shop>;
  createShop(data: Omit<Shop, "shop_id" | "created_at">): Promise<Shop>;
  updateShop(shopId: string, data: Partial<Shop>): Promise<Shop>;
  deleteShop(shopId: string): Promise<void>;
  blockShop(shopId: string, reason: string): Promise<void>;
  unblockShop(shopId: string): Promise<void>;
  isShopBlocked(shopId: string): Promise<boolean>;

  // Super admin: user management
  getAllUsers(filters?: { shop_id?: string; role?: string }): Promise<User[]>;
  createUser(data: { email: string; password: string; name: string; role: string; shop_id: string }): Promise<User>;
  updateUserProfile(userId: string, data: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;

  // Super admin: shop context switching
  enterShop(shopId: string): void;
  exitShop(): void;
  getOriginalShopId(): string;

  // Password management
  changePassword(newPassword: string): Promise<void>;

  // Client portal
  clientLogin(phone: string, pin: string): Promise<ClientSession>;
  getClientByPhone(phone: string): Promise<Client | null>;
  getClientServiceHistory(clientId: string): Promise<ServiceRecord[]>;
  getClientAppointments(clientId: string): Promise<Appointment[]>;
  getClientLoyaltyProgress(clientId: string): Promise<{ total_visits: number; visits_required: number; remaining: number; reward_message: string }>;
  changeClientPin(clientId: string, currentPin: string, newPin: string): Promise<void>;

  // Client approval (admin)
  approveClient(clientId: string): Promise<void>;
  rejectClient(clientId: string): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  createProduct(data: Omit<Product, "product_id" | "created_at">): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Product favorites (client)
  getFavoriteProductIds(clientId: string): Promise<string[]>;
  toggleProductFavorite(clientId: string, productId: string): Promise<boolean>;
  isProductFavorite(clientId: string, productId: string): Promise<boolean>;

  // Product sales metrics
  getProductSalesCount(productId: string): Promise<number>;
  recordProductSale(data: { product_id: string; client_id: string; quantity: number; unit_price: number; payment_method: string }): Promise<void>;

  // Client profile
  updateClientProfile(clientId: string, data: Partial<Client>): Promise<Client>;

  // Promotions
  getPromotions(): Promise<Promotion[]>;
  createPromotion(data: Omit<Promotion, "promotion_id" | "created_at" | "service_name">): Promise<Promotion>;
  updatePromotion(id: string, data: Partial<Promotion>): Promise<Promotion>;
  deletePromotion(id: string): Promise<void>;

  // Cash Register (Caja)
  getOpenCashRegister(): Promise<CashRegister | null>;
  openCashRegister(openingAmount: number, userName: string): Promise<CashRegister>;
  closeCashRegister(registerId: string, countedCash: number, closingNote: string, closingReason: string, userName: string): Promise<CashRegister>;
  getCashRegisterById(id: string): Promise<CashRegister>;
  getCashRegisterSummary(registerId: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    totalWithdrawal: number;
    totalAdjustment: number;
    expectedCash: number;
    incomeByMethod: Record<PaymentMethod, number>;
    expenseByMethod: Record<PaymentMethod, number>;
    movementCount: number;
  }>;
  getCashRegisters(filters?: { date_from?: string; date_to?: string; status?: string }): Promise<CashRegister[]>;

  // Cash Movements
  getCashMovements(registerId: string): Promise<CashMovement[]>;
  createCashMovement(data: {
    type: CashMovementType;
    category: string;
    amount: number;
    payment_method: PaymentMethod;
    description: string;
    reference_type?: string;
    reference_id?: string;
    created_by: string;
    created_by_name: string;
  }): Promise<CashMovement>;
  createAutomaticMovement(data: {
    type: CashMovementType;
    category: string;
    amount: number;
    payment_method: PaymentMethod;
    description: string;
    reference_type: string;
    reference_id: string;
    created_by: string;
    created_by_name: string;
  }): Promise<CashMovement | null>;

  // Payment Methods (configurable per shop)
  getShopPaymentMethods(): Promise<ShopPaymentMethod[]>;
  getActiveShopPaymentMethods(): Promise<ShopPaymentMethod[]>;
  updateShopPaymentMethod(id: string, data: Partial<ShopPaymentMethod>): Promise<void>;
  addShopPaymentMethod(data: { key: string; label: string; sort_order?: number }): Promise<ShopPaymentMethod>;
  deleteShopPaymentMethod(id: string): Promise<void>;
  reorderShopPaymentMethods(orderedIds: string[]): Promise<void>;

  // Payments (split payment support)
  createPayment(data: { reference_type: string; reference_id: string; amount: number; payment_method: string; description?: string; created_by?: string; created_by_name?: string }): Promise<Payment>;
  getPayments(referenceType: string, referenceId: string): Promise<Payment[]>;
  getPaymentsByDateRange(dateFrom: string, dateTo: string): Promise<Payment[]>;
  getPaymentsSummaryByMethod(dateFrom: string, dateTo: string): Promise<Record<string, number>>;

  // Expense Categories
  getExpenseCategories(): Promise<ExpenseCategory[]>;
  createExpenseCategory(data: { name: string; icon?: string; color?: string }): Promise<ExpenseCategory>;
  updateExpenseCategory(id: string, data: Partial<ExpenseCategory>): Promise<void>;
  deleteExpenseCategory(id: string): Promise<void>;

  // Expenses
  getExpenses(filters?: { date_from?: string; date_to?: string; category_id?: string; payment_method?: string; status?: string }): Promise<Expense[]>;
  createExpense(data: { category_id: string; amount: number; payment_method: PaymentMethod; description: string; created_by_name: string }): Promise<Expense>;
  cancelExpense(id: string, reason: string, cancelled_by_name: string): Promise<void>;

  // Withdrawals
  getWithdrawals(filters?: { date_from?: string; date_to?: string; reason?: string; status?: string }): Promise<Withdrawal[]>;
  createWithdrawal(data: { amount: number; reason: string; description: string; created_by_name: string }): Promise<Withdrawal>;
  cancelWithdrawal(id: string, reason: string, cancelled_by_name: string): Promise<void>;
  getAvailableCash(): Promise<number>;

  // Admin movements (unified expenses + withdrawals history)
  getAdminMovements(filters?: { date_from?: string; date_to?: string; type?: string; category?: string; payment_method?: string }): Promise<AdminMovement[]>;

  // Financial dashboard stats
  getFinancialSummary(filters?: { date_from?: string; date_to?: string }): Promise<{
    totalExpenses: number;
    totalWithdrawals: number;
    expensesByCategory: Record<string, number>;
    expensesByMethod: Record<string, number>;
  }>;

  // Settlements (Liquidaciones)
  getSettlements(filters?: { barber_id?: string; status?: string; date_from?: string; date_to?: string }): Promise<Settlement[]>;
  getSettlementById(id: string): Promise<SettlementWithDetails>;
  generateSettlement(data: { barber_id: string; period_start: string; period_end: string; created_by_name: string }): Promise<SettlementWithDetails>;
  approveSettlement(id: string, approved_by_name: string): Promise<void>;
  cancelSettlement(id: string, reason: string, cancelled_by_name: string): Promise<void>;
  addSettlementAdjustment(settlementId: string, data: { type: string; amount: number; description: string; created_by_name: string }): Promise<void>;
  registerSettlementPayment(settlementId: string, data: { amount: number; payment_method: PaymentMethod; notes: string; paid_by_name: string }): Promise<SettlementPayment>;
  getSettlementPayments(settlementId: string): Promise<SettlementPayment[]>;
  getSettlementSummary(filters?: { date_from?: string; date_to?: string }): Promise<{
    total_commission: number;
    total_paid: number;
    total_pending: number;
    by_barber: Record<string, { name: string; commission: number; paid: number; pending: number }>;
  }>;
}
