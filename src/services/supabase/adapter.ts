/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./client";
import type { DataAdapter } from "../types";
import type {
  User,
  AuthResult,
  Barber,
  Client,
  ClientSession,
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
  SettlementItem,
  SettlementAdjustment,
  SettlementPayment,
  SettlementWithDetails,
} from "@/types";

function generateId(prefix: string): string {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

const CLIENT_SHOP_KEY = "barberpro_client_shop_id";

const ALLOWED_PROFILE_FIELDS = ["name", "phone", "email", "notes"] as const;

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export class SupabaseAdapter implements DataAdapter {
  private shopId: string = "";
  private originalShopId: string = "";
  private categoriesSeedPromise: Promise<ExpenseCategory[]> | null = null;

  private getClientShopId(): string {
    return this.shopId || localStorage.getItem(CLIENT_SHOP_KEY) || "";
  }

  private async assertNotBlocked(shopId?: string): Promise<void> {
    const targetShopId = shopId || this.getClientShopId();
    if (!targetShopId || targetShopId === "global") return;
    const blocked = await this.isShopBlocked(targetShopId);
    if (blocked) {
      const { data: shop } = await supabase.from("shops").select("block_reason").eq("shop_id", targetShopId).single();
      throw new Error(`Operación bloqueada: ${(shop as any)?.block_reason || "La tienda tiene la suscripción vencida. Contacte al administrador."}`);
    }
  }

  private simpleHash(pin: string): string {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return "pin_" + Math.abs(hash).toString(36);
  }

  private async resolveUser(email: string): Promise<{ profile: any; barberId?: string }> {
    const { data: profile } = await supabase
      .from("users").select("*").eq("email", email).single();
    if (!profile) throw new Error("Perfil no encontrado");

    let barberId: string | undefined;
    if (profile.role === "barber") {
      const { data: barber } = await supabase
        .from("barbers").select("barber_id").eq("user_id", profile.user_id).single();
      barberId = barber?.barber_id;
    }

    return { profile, barberId };
  }

  // ---- Authentication ----

  async login(identifier: string, password: string, mode: "admin" | "barber" | "supersistema" = "admin"): Promise<AuthResult> {
    if (mode === "barber") {
      const { data: profile } = await supabase
        .from("users").select("*").eq("access_code", identifier).eq("role", "barber").single();
      if (!profile) throw new Error("Código no encontrado");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });
      if (error) throw new Error("Contraseña incorrecta");

      const { barberId } = await this.resolveUser(profile.email);
      this.shopId = profile.shop_id;

      return {
        token: data.session.access_token,
        user: {
          user_id: profile.user_id,
          shop_id: profile.shop_id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          active: profile.active,
          created_at: profile.created_at,
          barber_id: barberId,
        },
        shop_id: profile.shop_id,
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });
    if (error) throw new Error(error.message);

    const { profile, barberId } = await this.resolveUser(identifier);

    if (profile.role === "supersistema") {
      this.shopId = "global";
      this.originalShopId = "global";
      return {
        token: data.session.access_token,
        user: {
          user_id: profile.user_id,
          shop_id: "global",
          email: profile.email,
          name: profile.name,
          role: profile.role,
          active: profile.active,
          created_at: profile.created_at,
        },
        shop_id: "global",
      };
    }

    this.shopId = profile.shop_id;

    return {
      token: data.session.access_token,
      user: {
        user_id: profile.user_id,
        shop_id: profile.shop_id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        active: profile.active,
        created_at: profile.created_at,
        barber_id: barberId,
      },
      shop_id: profile.shop_id,
    };
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    this.shopId = "";
    this.originalShopId = "";
  }

  async validateToken(_token: string): Promise<User> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No hay sesión");

    const { profile, barberId } = await this.resolveUser(session.user.email!);
    this.shopId = profile.shop_id;

    return {
      user_id: profile.user_id,
      shop_id: profile.shop_id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      active: profile.active,
      created_at: profile.created_at,
      barber_id: barberId,
    };
  }

  // ---- Clients ----

  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from("clients").select("*").eq("shop_id", this.shopId).order("name");
    if (error) throw error;
    return (data || []) as Client[];
  }

  async getClientById(id: string): Promise<Client> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("clients").select("*").eq("client_id", id).eq("shop_id", shopId).single();
    if (error) throw error;
    return data as Client;
  }

  async createClient(clientData: Omit<Client, "client_id" | "created_at" | "last_visit" | "total_visits">): Promise<Client> {
    await this.assertNotBlocked();
    const toInsert: any = {
      ...clientData,
      client_id: generateId("cli"),
      shop_id: this.shopId,
      created_at: new Date().toISOString(),
      last_visit: "",
      total_visits: 0,
    };
    if (toInsert.pin_hash) {
      toInsert.pin_hash = this.simpleHash(toInsert.pin_hash);
    }
    const { data, error } = await supabase
      .from("clients")
      .insert(toInsert)
      .select().single();
    if (error) throw error;
    return data as Client;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from("clients").update(updates).eq("client_id", id).eq("shop_id", this.shopId).select().single();
    if (error) throw error;
    return data as Client;
  }

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase.from("clients").delete().eq("client_id", id).eq("shop_id", this.shopId);
    if (error) throw error;
  }

  // ---- Barbers ----

  async getBarbers(): Promise<Barber[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("barbers").select("*").eq("shop_id", shopId).order("name");
    if (error) throw error;
    return (data || []) as Barber[];
  }

  async getBarberById(id: string): Promise<Barber> {
    const { data, error } = await supabase
      .from("barbers").select("*").eq("barber_id", id).eq("shop_id", this.shopId).single();
    if (error) throw error;
    return data as Barber;
  }

  async createBarber(barberData: Omit<Barber, "barber_id">): Promise<Barber> {
    await this.assertNotBlocked();
    const { data, error } = await supabase
      .from("barbers")
      .insert({ ...barberData, barber_id: generateId("brb"), shop_id: this.shopId })
      .select().single();
    if (error) throw error;
    return data as Barber;
  }

  async updateBarber(id: string, updates: Partial<Barber>): Promise<Barber> {
    const { data, error } = await supabase
      .from("barbers").update(updates).eq("barber_id", id).eq("shop_id", this.shopId).select().single();
    if (error) throw error;
    return data as Barber;
  }

  async deleteBarber(id: string): Promise<void> {
    const { error } = await supabase.from("barbers").delete().eq("barber_id", id).eq("shop_id", this.shopId);
    if (error) throw error;
  }

  // ---- Services ----

  async getServices(): Promise<Service[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("services").select("*").eq("shop_id", shopId).order("name");
    if (error) throw error;
    return (data || []) as Service[];
  }

  async getServiceById(id: string): Promise<Service> {
    const { data, error } = await supabase
      .from("services").select("*").eq("service_id", id).eq("shop_id", this.shopId).single();
    if (error) throw error;
    return data as Service;
  }

  async createService(serviceData: Omit<Service, "service_id">): Promise<Service> {
    await this.assertNotBlocked();
    const { data, error } = await supabase
      .from("services")
      .insert({ ...serviceData, service_id: generateId("srv"), shop_id: this.shopId })
      .select().single();
    if (error) throw error;
    return data as Service;
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service> {
    const { data, error } = await supabase
      .from("services").update(updates).eq("service_id", id).eq("shop_id", this.shopId).select().single();
    if (error) throw error;
    return data as Service;
  }

  async deleteService(id: string): Promise<void> {
    const { error } = await supabase.from("services").delete().eq("service_id", id).eq("shop_id", this.shopId);
    if (error) throw error;
  }

  // ---- Appointments ----

  async getAppointments(filters: AppointmentFilters): Promise<Appointment[]> {
    const today = new Date().toISOString().split("T")[0];

    // Auto-cancel pending appointments whose date has passed
    const { data: expiredPending } = await supabase
      .from("appointments")
      .select("appointment_id")
      .eq("shop_id", this.shopId)
      .eq("status", "pending")
      .lt("date", today);

    if (expiredPending && expiredPending.length > 0) {
      const ids = expiredPending.map((p: any) => p.appointment_id);
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .in("appointment_id", ids)
        .eq("shop_id", this.shopId);
    }

    // Main query: future/current appointments (respecting filters)
    let query = supabase
      .from("appointments")
      .select("*, clients(name), barbers(name, commission_rate), services(name, price)")
      .eq("shop_id", this.shopId);

    if (filters.date) query = query.eq("date", filters.date);
    if (filters.date_from) query = query.gte("date", filters.date_from);
    if (filters.date_to) query = query.lte("date", filters.date_to);
    if (filters.barber_id) query = query.eq("barber_id", filters.barber_id);
    if (filters.status) query = query.eq("status", filters.status);

    const { data, error } = await query.order("date").order("start_time");
    if (error) throw error;

    const results = (data || []).map((a: any) => ({
      ...a,
      client_name: a.clients?.name || "Desconocido",
      barber_name: a.barbers?.name || "Desconocido",
      service_name: a.services?.name || "Desconocido",
      service_price: a.services?.price ?? 0,
    })) as Appointment[];

    // If no date filter, also fetch recent expired confirmed appointments (last 7 days)
    if (!filters.date && !filters.date_from) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const pastDate = sevenDaysAgo.toISOString().split("T")[0];

      let pastQuery = supabase
        .from("appointments")
        .select("*, clients(name), barbers(name, commission_rate), services(name, price)")
        .eq("shop_id", this.shopId)
        .eq("status", "confirmed")
        .gte("date", pastDate)
        .lt("date", today);

      if (filters.barber_id) pastQuery = pastQuery.eq("barber_id", filters.barber_id);

      const { data: pastData } = await pastQuery.order("date").order("start_time");

      if (pastData) {
        const pastAppointments = pastData.map((a: any) => ({
          ...a,
          client_name: a.clients?.name || "Desconocido",
          barber_name: a.barbers?.name || "Desconocido",
          service_name: a.services?.name || "Desconocido",
          service_price: a.services?.price ?? 0,
          _expired: true,
        })) as Appointment[];
        results.push(...pastAppointments);
      }
    }

    return results;
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, clients(name), barbers(name), services(name)")
      .eq("appointment_id", id).eq("shop_id", this.shopId).single();
    if (error) throw error;
    return {
      ...data,
      client_name: (data as any).clients?.name || "Desconocido",
      barber_name: (data as any).barbers?.name || "Desconocido",
      service_name: (data as any).services?.name || "Desconocido",
    } as Appointment;
  }

  async createAppointment(data: Omit<Appointment, "appointment_id" | "created_at">): Promise<Appointment> {
    const shopId = this.getClientShopId();
    await this.assertNotBlocked(shopId);

    const { data: existing } = await supabase
      .from("appointments")
      .select("appointment_id")
      .eq("shop_id", shopId)
      .eq("barber_id", data.barber_id)
      .eq("date", data.date)
      .eq("start_time", data.start_time)
      .not("status", "in", '("cancelled","no_show")')
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error("Este horario ya está ocupado para este barbero. Elige otro horario.");
    }

    const { data: result, error } = await supabase
      .from("appointments")
      .insert({
        appointment_id: generateId("apt"),
        shop_id: shopId,
        client_id: data.client_id,
        barber_id: data.barber_id,
        service_id: data.service_id,
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status,
        notes: data.notes || "",
        created_by: data.created_by || "",
      })
      .select().single();
    if (error) throw error;
    return result as Appointment;
  }

  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await supabase
      .from("appointments").update(updates).eq("appointment_id", id).eq("shop_id", this.shopId).select().single();
    if (error) throw error;
    return data as Appointment;
  }

  async updateAppointmentStatus(id: string, status: Appointment["status"], completionData?: { payment_method?: string; tip?: number; notes?: string }): Promise<void> {
    const { error } = await supabase
      .from("appointments").update({ status }).eq("appointment_id", id).eq("shop_id", this.shopId);
    if (error) throw error;

    if (status === "completed") {
      const apt = await this.getAppointmentById(id);
      const service = await this.getServiceById(apt.service_id);

      await this.createServiceRecord({
        appointment_id: id,
        client_id: apt.client_id,
        barber_id: apt.barber_id,
        service_id: apt.service_id,
        date: apt.date,
        price_charged: service.price,
        tip: completionData?.tip || 0,
        notes: completionData?.notes || "",
        payment_method: completionData?.payment_method || "CASH",
      } as any);
    }
  }

  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase.from("appointments").delete().eq("appointment_id", id).eq("shop_id", this.shopId);
    if (error) throw error;
  }

  // ---- Service Records ----

  async getServiceRecords(filters?: { date?: string; barber_id?: string }): Promise<ServiceRecord[]> {
    let query = supabase
      .from("service_records")
      .select("*, clients(name), barbers(name), services(name)")
      .eq("shop_id", this.shopId);

    if (filters?.date) query = query.eq("date", filters.date);
    if (filters?.barber_id) query = query.eq("barber_id", filters.barber_id);

    const { data, error } = await query.order("date", { ascending: false });
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      client_name: r.clients?.name || "Desconocido",
      barber_name: r.barbers?.name || "Desconocido",
      service_name: r.services?.name || "Desconocido",
    })) as ServiceRecord[];
  }

  async createServiceRecord(data: Omit<ServiceRecord, "record_id" | "created_at">): Promise<ServiceRecord> {
    await this.assertNotBlocked();

    const { data: result, error } = await supabase
      .from("service_records")
      .insert({
        ...data,
        record_id: generateId("rec"),
        shop_id: this.shopId,
        created_at: new Date().toISOString(),
      })
      .select().single();
    if (error) throw error;

    const { data: barber } = await supabase
      .from("barbers").select("commission_rate").eq("barber_id", data.barber_id).single();

    const commissionRate = (barber as any)?.commission_rate || 0.4;
    const gross = data.price_charged;
    const commission = gross * (commissionRate / 100);

    await supabase.from("income").insert({
      income_id: generateId("inc"),
      record_id: (result as any).record_id,
      barber_id: data.barber_id,
      service_id: data.service_id,
      date: data.date,
      gross_amount: gross,
      commission_amount: commission,
      shop_amount: gross - commission,
      tip: data.tip,
      shop_id: this.shopId,
    });

    if (gross > 0) {
      const paymentMethod = ((data as any).payment_method as PaymentMethod) || "CASH";
      await this.createAutomaticMovement({
        type: "INCOME",
        category: "SERVICE",
        amount: gross,
        payment_method: paymentMethod,
        description: `Servicio registrado`,
        reference_type: "SERVICE_RECORD",
        reference_id: (result as any).record_id,
        created_by: "",
        created_by_name: "Sistema",
      }).catch(() => {});
    }

    if (data.tip && data.tip > 0) {
      await this.createAutomaticMovement({
        type: "INCOME",
        category: "TIP",
        amount: data.tip,
        payment_method: "CASH",
        description: `Propina`,
        reference_type: "SERVICE_RECORD",
        reference_id: (result as any).record_id,
        created_by: "",
        created_by_name: "Sistema",
      }).catch(() => {});
    }

    await supabase.rpc("increment_client_visits", { p_client_id: data.client_id });

    return result as ServiceRecord;
  }

  // ---- Income ----

  async getIncome(filters?: { date_from?: string; date_to?: string; barber_id?: string }): Promise<IncomeRecord[]> {
    let query = supabase
      .from("income")
      .select("*, barbers(name), services(name)")
      .eq("shop_id", this.shopId);

    if (filters?.date_from) query = query.gte("date", filters.date_from);
    if (filters?.date_to) query = query.lte("date", filters.date_to);
    if (filters?.barber_id) query = query.eq("barber_id", filters.barber_id);

    const { data, error } = await query.order("date", { ascending: false });
    if (error) throw error;

    return (data || []).map((i: any) => ({
      ...i,
      barber_name: i.barbers?.name || "Desconocido",
      service_name: i.services?.name || "Desconocido",
    })) as IncomeRecord[];
  }

  async getCommissions(period: string, barberId?: string): Promise<BarberCommission[]> {
    const now = new Date();
    let startDate = "";

    if (period === "daily") startDate = now.toISOString().split("T")[0];
    else if (period === "weekly") {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      startDate = d.toISOString().split("T")[0];
    } else if (period === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    }

    const barbers = barberId
      ? [await this.getBarberById(barberId)]
      : await this.getBarbers();
    const income = await this.getIncome({ date_from: startDate, barber_id: barberId });

    return barbers.filter((b) => b.active).map((barber) => {
      const barberIncome = income.filter((i) => i.barber_id === barber.barber_id);
      return {
        barber_id: barber.barber_id,
        barber_name: barber.name,
        total_services: barberIncome.length,
        total_gross: barberIncome.reduce((s, i) => s + (i.gross_amount || 0), 0),
        total_commission: barberIncome.reduce((s, i) => s + (i.commission_amount || 0), 0),
        total_tips: barberIncome.reduce((s, i) => s + (i.tip || 0), 0),
        period,
      };
    });
  }

  // ---- Schedules ----

  async getSchedules(barberId: string): Promise<Schedule[]> {
    const { data, error } = await supabase
      .from("schedules").select("*").eq("barber_id", barberId).order("day_of_week");
    if (error) throw error;
    return (data || []) as Schedule[];
  }

  async updateSchedules(barberId: string, schedules: Omit<Schedule, "schedule_id">[]): Promise<void> {
    await supabase.from("schedules").delete().eq("barber_id", barberId);

    const rows = schedules.map((s) => ({
      ...s,
      schedule_id: generateId("sch"),
      barber_id: barberId,
      shop_id: this.shopId,
    }));

    const { error } = await supabase.from("schedules").insert(rows);
    if (error) throw error;
  }

  // ---- Shop Config ----

  async getShopConfig(): Promise<ShopConfig> {
    const { data, error } = await supabase
      .from("shop_config").select("*").eq("shop_id", this.shopId);
    if (error) throw error;

    const config: Record<string, string> = {};
    (data || []).forEach((row: any) => { config[row.key] = row.value; });

    let categories: { id: string; name: string }[] = [];
    try { categories = config.categories ? JSON.parse(config.categories) : []; } catch { categories = []; }

    const defaultLoyalty = { enabled: false, visits_required: 10, reward_message: "¡Corte gratis!" };
    let loyalty = defaultLoyalty;
    try {
      const raw = config.loyalty ? JSON.parse(config.loyalty) : null;
      loyalty = raw ? { ...defaultLoyalty, ...raw } : defaultLoyalty;
    } catch { loyalty = defaultLoyalty; }

    let dynamics: { id: string; name: string; description: string; type: "raffle" | "promotion" | "custom"; active: boolean }[] = [];
    try { dynamics = config.dynamics ? JSON.parse(config.dynamics) : []; } catch { dynamics = []; }

    return {
      shop_name: config.shop_name || "",
      timezone: config.timezone || "America/Bogota",
      currency: config.currency || "COP",
      open_time: config.open_time || "09:00",
      close_time: config.close_time || "19:00",
      commission_type: (config.commission_type as "service" | "daily") || "service",
      categories,
      rewards: {
        enabled: loyalty.enabled,
        loyalty,
        dynamics,
      },
    };
  }

  async updateShopConfig(config: Partial<ShopConfig>): Promise<ShopConfig> {
    await this.assertNotBlocked();
    const entries = Object.entries(config).filter(([, v]) => v !== undefined);

    for (const [key, value] of entries) {
      let storedValue: string;
      if (key === "categories") {
        storedValue = JSON.stringify(value);
      } else if (key === "rewards") {
        const r = value as any;
        await this._upsertConfigKey("loyalty", JSON.stringify(r.loyalty || {}));
        await this._upsertConfigKey("dynamics", JSON.stringify(r.dynamics || []));
        await this._upsertConfigKey("rewards_enabled", String(r.enabled || false));
        continue;
      } else {
        storedValue = String(value);
      }
      await this._upsertConfigKey(key, storedValue!);
    }

    return this.getShopConfig();
  }

  private async _upsertConfigKey(key: string, value: string) {
    const { data: existing } = await supabase
      .from("shop_config").select("id")
      .eq("shop_id", this.shopId).eq("key", key).single();

    if (existing) {
      await supabase.from("shop_config").update({ value }).eq("id", (existing as any).id);
    } else {
      await supabase.from("shop_config").insert({
        id: generateId("cfg"), key, value, shop_id: this.shopId,
      });
    }
  }

  // ---- Service Requests (walk-ins) ----

  async getServiceRequests(filters?: { status?: string; barber_id?: string }): Promise<ServiceRequest[]> {
    let query = supabase
      .from("service_requests")
      .select("*, barbers(name)")
      .eq("shop_id", this.shopId);

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.barber_id) query = query.eq("barber_id", filters.barber_id);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      barber_name: r.barbers?.name || "Desconocido",
    })) as ServiceRequest[];
  }

  async createServiceRequest(data: Omit<ServiceRequest, "request_id" | "created_at" | "status" | "rejection_reason" | "reviewed_at">): Promise<ServiceRequest> {
    await this.assertNotBlocked();

    const { data: result, error } = await supabase
      .from("service_requests")
      .insert({
        ...data,
        request_id: generateId("srq"),
        shop_id: this.shopId,
        status: "pending",
        rejection_reason: "",
        created_at: new Date().toISOString(),
      })
      .select().single();
    if (error) throw new Error(`Error guardando solicitud: ${error.message} (${error.code})`);
    return result as ServiceRequest;
  }

  async reviewServiceRequest(id: string, status: "approved" | "rejected", reason?: string, paymentMethod?: string): Promise<void> {
    const { data: existingReq, error: fetchErr } = await supabase
      .from("service_requests").select("status").eq("request_id", id).single();
    if (fetchErr || !existingReq) throw new Error("Solicitud no encontrada");
    if ((existingReq as any).status !== "pending") {
      throw new Error("Esta solicitud ya fue procesada");
    }

    const updateData: any = {
      status,
      rejection_reason: reason || "",
      reviewed_at: new Date().toISOString(),
    };
    if (status === "approved" && paymentMethod) {
      updateData.payment_method = paymentMethod;
    }

    const { error } = await supabase
      .from("service_requests")
      .update(updateData)
      .eq("request_id", id);
    if (error) throw error;

    if (status === "approved") {
      const { data: req } = await supabase
        .from("service_requests").select("*").eq("request_id", id).single();

      if (req) {
        const today = new Date().toISOString().split("T")[0];
        const isFree = (req as any).is_free || false;

        const { data: service } = await supabase
          .from("services").select("price").eq("service_id", (req as any).service_id).single();
        const servicePrice = (service as any)?.price ?? (req as any).price_charged;

        const { data: barber } = await supabase
          .from("barbers").select("commission_rate").eq("barber_id", (req as any).barber_id).single();

        const commissionRate = (barber as any)?.commission_rate || 40;
        const gross = isFree ? 0 : servicePrice;
        const tipAmount = isFree ? 0 : ((req as any).tip || 0);
        const commission = isFree ? 0 : gross * (commissionRate / 100);

        let clientId = "";
        const { data: existingClient } = await supabase
          .from("clients").select("client_id, total_visits")
          .eq("shop_id", this.shopId)
          .ilike("name", (req as any).client_name)
          .limit(1)
          .single();

        if (existingClient) {
          clientId = (existingClient as any).client_id;
          const currentVisits = (existingClient as any).total_visits || 0;
          const newVisits = isFree ? Math.max(0, currentVisits - 1) : currentVisits + 1;
          await supabase
            .from("clients")
            .update({
              total_visits: newVisits,
              last_visit: today,
            })
            .eq("client_id", clientId);
        } else {
          const clientPhone = (req as any).client_phone || "";
          const newClientId = generateId("cli");
          const { error: clientErr } = await supabase.from("clients").insert({
            client_id: newClientId,
            shop_id: this.shopId,
            name: (req as any).client_name,
            phone: clientPhone,
            email: "",
            notes: "Creado desde servicio walk-in",
            created_at: new Date().toISOString(),
            last_visit: today,
            total_visits: 1,
            active: false,
          });
          if (!clientErr) clientId = newClientId;
        }

        const newRecordId = generateId("rec");
        const { error: recErr } = await supabase.from("service_records").insert({
          record_id: newRecordId,
          shop_id: this.shopId,
          appointment_id: null,
          client_id: clientId,
          barber_id: (req as any).barber_id,
          service_id: (req as any).service_id,
          date: today,
          price_charged: gross,
          tip: tipAmount,
          notes: `[Walk-in] ${(req as any).client_name} — ${(req as any).notes || ""}`,
          created_at: new Date().toISOString(),
        });
        if (recErr) {
          console.error("Error creating service_record:", recErr.message, recErr);
          throw new Error("Error creando registro de servicio: " + recErr.message);
        }

        const { error: incErr } = await supabase.from("income").insert({
          income_id: generateId("inc"),
          record_id: newRecordId,
          barber_id: (req as any).barber_id,
          service_id: (req as any).service_id,
          date: today,
          gross_amount: gross,
          commission_amount: commission,
          shop_amount: gross - commission,
          tip: tipAmount,
          shop_id: this.shopId,
        });
        if (incErr) {
          console.error("Error creating income:", incErr.message, incErr);
          throw new Error("Error creando ingreso: " + incErr.message);
        }

        if (gross > 0) {
          const finalPaymentMethod = (paymentMethod || "CASH") as PaymentMethod;
          await this.createAutomaticMovement({
            type: "INCOME",
            category: "SERVICE",
            amount: gross,
            payment_method: finalPaymentMethod,
            description: `Servicio walk-in: ${(req as any).client_name}`,
            reference_type: "SERVICE_RECORD",
            reference_id: newRecordId,
            created_by: "",
            created_by_name: "Sistema",
          }).catch(() => {});
        }

        if (tipAmount > 0) {
          const finalTipPaymentMethod = (paymentMethod || "CASH") as PaymentMethod;
          await this.createAutomaticMovement({
            type: "INCOME",
            category: "TIP",
            amount: tipAmount,
            payment_method: finalTipPaymentMethod,
            description: `Propina walk-in: ${(req as any).client_name}`,
            reference_type: "SERVICE_RECORD",
            reference_id: newRecordId,
            created_by: "",
            created_by_name: "Sistema",
          }).catch(() => {});
        }
      }
    }
  }

  // ---- Photos ----

  async uploadServicePhoto(file: File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error("Tipo de archivo no permitido. Usa JPEG, PNG, WebP o GIF.");
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      throw new Error("El archivo excede el tamaño máximo de 5MB.");
    }

    const shopId = this.getClientShopId();
    const fileName = `${shopId}/${generateId("photo")}_${file.name}`;
    const { error } = await supabase.storage
      .from("service-photos")
      .upload(fileName, file);

    if (error) throw new Error("Error subiendo foto: " + error.message);

    const { data } = supabase.storage
      .from("service-photos")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  // ---- Super Admin: Shops ----

  async getShops(): Promise<Shop[]> {
    const { data, error } = await supabase.from("shops").select("*").order("name");
    if (error) throw error;
    return (data || []) as Shop[];
  }

  async getShopById(shopId: string): Promise<Shop> {
    const { data, error } = await supabase.from("shops").select("*").eq("shop_id", shopId).single();
    if (error) throw error;
    return data as Shop;
  }

  async createShop(shopData: Omit<Shop, "shop_id" | "created_at">): Promise<Shop> {
    const shopId = generateId("shop");
    const { data, error } = await supabase
      .from("shops")
      .insert({ ...shopData, shop_id: shopId, created_at: new Date().toISOString() })
      .select().single();
    if (error) throw error;
    return data as Shop;
  }

  async updateShop(shopId: string, updates: Partial<Shop>): Promise<Shop> {
    const { data, error } = await supabase
      .from("shops").update(updates).eq("shop_id", shopId).select().single();
    if (error) throw error;
    return data as Shop;
  }

  async deleteShop(shopId: string): Promise<void> {
    const { error } = await supabase.from("shops").delete().eq("shop_id", shopId);
    if (error) throw error;
  }

  async blockShop(shopId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from("shops")
      .update({ blocked: true, block_reason: reason })
      .eq("shop_id", shopId);
    if (error) throw error;
  }

  async unblockShop(shopId: string): Promise<void> {
    const { error } = await supabase
      .from("shops")
      .update({ blocked: false, block_reason: "" })
      .eq("shop_id", shopId);
    if (error) throw error;
  }

  async isShopBlocked(shopId: string): Promise<boolean> {
    if (!shopId || shopId === "global") return false;
    const { data, error } = await supabase
      .from("shops").select("blocked").eq("shop_id", shopId).single();
    if (error) return true;
    return (data as any)?.blocked || false;
  }

  // ---- Super Admin: User Management ----

  async getAllUsers(filters?: { shop_id?: string; role?: string }): Promise<User[]> {
    let query = supabase.from("users").select("*");
    if (filters?.shop_id) query = query.eq("shop_id", filters.shop_id);
    if (filters?.role) query = query.eq("role", filters.role);
    const { data, error } = await query.order("name");
    if (error) throw error;
    return (data || []) as User[];
  }

  async createUser(userData: { email: string; password: string; name: string; role: string; shop_id: string }): Promise<User> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: { data: { name: userData.name, role: userData.role } },
    });
    if (authError) throw new Error("Error creando usuario: " + authError.message);

    const userId = authData.user?.id || "";

    const { data, error } = await supabase
      .from("users")
      .insert({
        user_id: userId,
        shop_id: userData.shop_id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        active: true,
        password_hash: "supabase_auth",
      })
      .select().single();
    if (error) throw error;
    return data as User;
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from("users").update(updates).eq("user_id", userId).select().single();
    if (error) throw error;
    return data as User;
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.from("users").delete().eq("user_id", userId);
    if (error) throw error;
  }

  // ---- Super Admin: Shop Context ----

  enterShop(shopId: string): void {
    if (!this.originalShopId) this.originalShopId = this.shopId;
    this.shopId = shopId;
  }

  exitShop(): void {
    this.shopId = this.originalShopId || "global";
    this.originalShopId = "";
  }

  getOriginalShopId(): string {
    return this.originalShopId || "global";
  }

  // ---- Password Management ----

  async changePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error("Error cambiando contraseña: " + error.message);
  }

  // ---- Client Portal ----

  async clientLogin(phone: string, pin: string): Promise<ClientSession> {
    const normalizedPhone = phone.trim();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("phone", normalizedPhone)
      .limit(1)
      .maybeSingle();
    if (error || !data) throw new Error("Teléfono o PIN incorrecto");

    const client = data as Client;
    if (!client.active) throw new Error("Tu cuenta está pendiente de aprobación por el administrador");
    if (client.pin_hash && client.pin_hash !== this.simpleHash(pin)) {
      throw new Error("Teléfono o PIN incorrecto");
    }

    let shopName = "";
    if (client.shop_id) {
      localStorage.setItem(CLIENT_SHOP_KEY, client.shop_id);
      const { data: shop } = await supabase
        .from("shop_config").select("value").eq("shop_id", client.shop_id).eq("key", "shop_name").single();
      shopName = (shop as any)?.value || "";
    }

    return {
      client,
      shop_name: shopName,
      token: `client_${client.client_id}_${generateSecureToken()}`,
    };
  }

  async getClientByPhone(phone: string): Promise<Client | null> {
    const shopId = this.getClientShopId();
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("shop_id", shopId)
      .eq("phone", phone.trim())
      .maybeSingle();
    return (data as Client) || null;
  }

  async getClientServiceHistory(clientId: string): Promise<ServiceRecord[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("service_records")
      .select("*, barbers(name), services(name)")
      .eq("shop_id", shopId)
      .eq("client_id", clientId)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      barber_name: r.barbers?.name || "Desconocido",
      service_name: r.services?.name || "Desconocido",
    })) as ServiceRecord[];
  }

  async getClientAppointments(clientId: string): Promise<Appointment[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("appointments")
      .select("*, barbers(name), services(name)")
      .eq("shop_id", shopId)
      .eq("client_id", clientId)
      .order("date", { ascending: false });
    if (error) throw error;
    return (data || []).map((a: any) => ({
      ...a,
      client_name: "",
      barber_name: a.barbers?.name || "Desconocido",
      service_name: a.services?.name || "Desconocido",
    })) as Appointment[];
  }

  async getClientLoyaltyProgress(clientId: string): Promise<{ total_visits: number; visits_required: number; remaining: number; reward_message: string }> {
    const { data: client } = await supabase
      .from("clients").select("total_visits").eq("client_id", clientId).single();

    const shopId = this.getClientShopId();
    const { data: loyaltyConfig } = await supabase
      .from("shop_config").select("value").eq("shop_id", shopId).eq("key", "loyalty").single();

    let visitsRequired = 10;
    let rewardMessage = "¡Corte gratis!";
    try {
      const raw = loyaltyConfig ? JSON.parse((loyaltyConfig as any).value) : null;
      if (raw) {
        visitsRequired = raw.visits_required || 10;
        rewardMessage = raw.reward_message || "¡Corte gratis!";
      }
    } catch { /* use defaults */ }

    const totalVisits = (client as any)?.total_visits || 0;
    const remaining = Math.max(0, visitsRequired - (totalVisits % visitsRequired));

    return { total_visits: totalVisits, visits_required: visitsRequired, remaining, reward_message: rewardMessage };
  }

  async changeClientPin(clientId: string, currentPin: string, newPin: string): Promise<void> {
    const { data: client, error: fetchError } = await supabase
      .from("clients").select("pin_hash").eq("client_id", clientId).single();
    if (fetchError || !client) throw new Error("Cliente no encontrado");
    if ((client as any).pin_hash && (client as any).pin_hash !== this.simpleHash(currentPin)) {
      throw new Error("PIN actual incorrecto");
    }
    if (newPin.length < 4) throw new Error("El nuevo PIN debe tener al menos 4 dígitos");
    const { error } = await supabase
      .from("clients").update({ pin_hash: this.simpleHash(newPin) }).eq("client_id", clientId);
    if (error) throw error;
  }

  async approveClient(clientId: string): Promise<void> {
    const { error } = await supabase
      .from("clients").update({ active: true }).eq("client_id", clientId);
    if (error) throw error;
  }

  async rejectClient(clientId: string): Promise<void> {
    const { error } = await supabase
      .from("clients").delete().eq("client_id", clientId);
    if (error) throw error;
  }

  // ---- Products ----

  async getProducts(): Promise<Product[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("products").select("*").eq("shop_id", shopId).eq("active", true).order("name");
    if (error) throw error;
    return (data || []) as Product[];
  }

  async createProduct(data: Omit<Product, "product_id" | "created_at">): Promise<Product> {
    await this.assertNotBlocked();
    const shopId = this.getClientShopId();
    const { data: result, error } = await supabase
      .from("products")
      .insert({ ...data, product_id: generateId("prod"), shop_id: shopId, created_at: new Date().toISOString() })
      .select().single();
    if (error) throw error;
    return result as Product;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const { data: result, error } = await supabase
      .from("products").update(data).eq("product_id", id).select().single();
    if (error) throw error;
    return result as Product;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase.from("products").delete().eq("product_id", id);
    if (error) throw error;
  }

  // ---- Product Favorites ----

  async getFavoriteProductIds(clientId: string): Promise<string[]> {
    const { data } = await supabase
      .from("product_favorites").select("product_id").eq("client_id", clientId);
    return (data || []).map((r: any) => r.product_id);
  }

  async toggleProductFavorite(clientId: string, productId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from("product_favorites").select("product_id")
      .eq("client_id", clientId).eq("product_id", productId).maybeSingle();
    if (existing) {
      await supabase.from("product_favorites").delete()
        .eq("client_id", clientId).eq("product_id", productId);
      return false;
    } else {
      await supabase.from("product_favorites").insert({ client_id: clientId, product_id: productId });
      return true;
    }
  }

  async isProductFavorite(clientId: string, productId: string): Promise<boolean> {
    const { data } = await supabase
      .from("product_favorites").select("product_id")
      .eq("client_id", clientId).eq("product_id", productId).maybeSingle();
    return !!data;
  }

  // ---- Product Sales ----

  async getProductSalesCount(productId: string): Promise<number> {
    const shopId = this.getClientShopId();
    const { count } = await supabase
      .from("product_sales").select("*", { count: "exact", head: true })
      .eq("shop_id", shopId).eq("product_id", productId);
    return count || 0;
  }

  async recordProductSale(data: { product_id: string; client_id: string; quantity: number; unit_price: number; payment_method: string }): Promise<void> {
    const shopId = this.getClientShopId();
    const totalAmount = data.quantity * data.unit_price;
    await supabase.from("product_sales").insert({
      sale_id: generateId("psale"),
      shop_id: shopId,
      product_id: data.product_id,
      client_id: data.client_id,
      quantity: data.quantity,
      unit_price: data.unit_price,
      total_amount: totalAmount,
      payment_method: data.payment_method,
      sold_at: new Date().toISOString(),
    });
  }

  async updateClientProfile(clientId: string, data: Partial<Client>): Promise<Client> {
    const sanitized: Record<string, any> = {};
    for (const key of ALLOWED_PROFILE_FIELDS) {
      if (key in data) {
        (sanitized as any)[key] = (data as any)[key];
      }
    }
    const { data: result, error } = await supabase
      .from("clients").update(sanitized).eq("client_id", clientId).select().single();
    if (error) throw error;
    return result as Client;
  }

  // ---- Promotions ----

  async getPromotions(): Promise<Promotion[]> {
    const shopId = this.getClientShopId();
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("promotions")
      .select("*, services(name)")
      .eq("shop_id", shopId)
      .eq("active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("end_date");
    if (error) throw error;
    return (data || []).map((p: any) => ({
      ...p,
      service_name: p.services?.name || "Servicio eliminado",
    })) as Promotion[];
  }

  async createPromotion(data: Omit<Promotion, "promotion_id" | "created_at" | "service_name">): Promise<Promotion> {
    await this.assertNotBlocked();
    const shopId = this.getClientShopId();
    const { data: result, error } = await supabase
      .from("promotions")
      .insert({ ...data, promotion_id: generateId("promo"), shop_id: shopId, created_at: new Date().toISOString() })
      .select().single();
    if (error) throw error;
    return result as Promotion;
  }

  async updatePromotion(id: string, data: Partial<Promotion>): Promise<Promotion> {
    const { data: result, error } = await supabase
      .from("promotions").update(data).eq("promotion_id", id).select().single();
    if (error) throw error;
    return result as Promotion;
  }

  async deletePromotion(id: string): Promise<void> {
    const { error } = await supabase.from("promotions").delete().eq("promotion_id", id);
    if (error) throw error;
  }

  // ---- Cash Register (Caja) ----

  async getOpenCashRegister(): Promise<CashRegister | null> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("cash_registers")
      .select("*")
      .eq("shop_id", shopId)
      .eq("status", "OPEN")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as CashRegister) || null;
  }

  async openCashRegister(openingAmount: number, userName: string): Promise<CashRegister> {
    await this.assertNotBlocked();
    const shopId = this.getClientShopId();

    const { data: existing } = await supabase
      .from("cash_registers")
      .select("id")
      .eq("shop_id", shopId)
      .eq("status", "OPEN")
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Error("Ya existe una caja abierta para esta barbería");
    }

    const registerId = generateId("cr");
    const { data, error } = await supabase
      .from("cash_registers")
      .insert({
        id: registerId,
        shop_id: shopId,
        opened_by: "",
        opened_by_name: userName,
        opened_at: new Date().toISOString(),
        opening_amount: openingAmount,
        closed_by: "",
        closed_by_name: "",
        closed_at: null,
        expected_cash: openingAmount,
        counted_cash: 0,
        difference: 0,
        closing_note: "",
        closing_reason: "",
        status: "OPEN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data as CashRegister;
  }

  async closeCashRegister(
    registerId: string,
    countedCash: number,
    closingNote: string,
    closingReason: string,
    userName: string
  ): Promise<CashRegister> {
    const { data: register, error: fetchErr } = await supabase
      .from("cash_registers").select("*").eq("id", registerId).single();
    if (fetchErr || !register) throw new Error("Caja no encontrada");
    if ((register as any).status === "CLOSED") throw new Error("Esta caja ya está cerrada");

    const expectedCash = await supabase.rpc("calculate_expected_cash", { p_register_id: registerId });
    const expected = Number(expectedCash.data) || 0;
    const difference = countedCash - expected;

    const { data, error } = await supabase
      .from("cash_registers")
      .update({
        closed_by: "",
        closed_by_name: userName,
        closed_at: new Date().toISOString(),
        expected_cash: expected,
        counted_cash: countedCash,
        difference,
        closing_note: closingNote,
        closing_reason: closingReason,
        status: "CLOSED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", registerId)
      .select()
      .single();
    if (error) throw error;
    return data as CashRegister;
  }

  async getCashRegisterById(id: string): Promise<CashRegister> {
    const { data, error } = await supabase
      .from("cash_registers").select("*").eq("id", id).single();
    if (error) throw error;
    return data as CashRegister;
  }

  async getCashRegisterSummary(registerId: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    totalWithdrawal: number;
    totalAdjustment: number;
    expectedCash: number;
    incomeByMethod: Record<PaymentMethod, number>;
    expenseByMethod: Record<PaymentMethod, number>;
    movementCount: number;
  }> {
    const { data: register, error: regErr } = await supabase
      .from("cash_registers").select("opening_amount").eq("id", registerId).single();
    if (regErr || !register) throw new Error("Caja no encontrada");

    const openingAmount = Number((register as any).opening_amount) || 0;

    const { data: movements } = await supabase
      .from("cash_movements").select("*").eq("cash_register_id", registerId);
    const movs = (movements || []) as CashMovement[];

    const defaultMethods: Record<PaymentMethod, number> = {
      CASH: 0, NEQUI: 0, DAVIPLATA: 0, CARD: 0, TRANSFER: 0, OTHER: 0,
    };

    let totalIncome = 0;
    let totalExpense = 0;
    let totalWithdrawal = 0;
    let totalAdjustment = 0;
    const incomeByMethod: Record<PaymentMethod, number> = { ...defaultMethods };
    const expenseByMethod: Record<PaymentMethod, number> = { ...defaultMethods };

    for (const m of movs) {
      if (m.type === "INCOME") {
        totalIncome += m.amount;
        incomeByMethod[m.payment_method] = (incomeByMethod[m.payment_method] || 0) + m.amount;
      } else if (m.type === "EXPENSE") {
        totalExpense += m.amount;
        expenseByMethod[m.payment_method] = (expenseByMethod[m.payment_method] || 0) + m.amount;
      } else if (m.type === "WITHDRAWAL") {
        totalWithdrawal += m.amount;
      } else if (m.type === "ADJUSTMENT") {
        totalAdjustment += m.amount;
      }
    }

    const cashIncome = incomeByMethod["CASH"] || 0;
    const cashExpense = expenseByMethod["CASH"] || 0;
    const expectedCash = openingAmount + cashIncome - cashExpense - totalWithdrawal + totalAdjustment;

    return {
      totalIncome,
      totalExpense,
      totalWithdrawal,
      totalAdjustment,
      expectedCash,
      incomeByMethod,
      expenseByMethod,
      movementCount: movs.length,
    };
  }

  async getCashRegisters(filters?: { date_from?: string; date_to?: string; status?: string }): Promise<CashRegister[]> {
    const shopId = this.getClientShopId();
    let query = supabase.from("cash_registers").select("*").eq("shop_id", shopId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.date_from) query = query.gte("opened_at", filters.date_from);
    if (filters?.date_to) query = query.lte("opened_at", filters.date_to + "T23:59:59");
    const { data, error } = await query.order("opened_at", { ascending: false });
    if (error) throw error;
    return (data || []) as CashRegister[];
  }

  async getCashMovements(registerId: string): Promise<CashMovement[]> {
    const { data, error } = await supabase
      .from("cash_movements").select("*").eq("cash_register_id", registerId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as CashMovement[];
  }

  async createCashMovement(data: {
    type: CashMovementType;
    category: string;
    amount: number;
    payment_method: PaymentMethod;
    description: string;
    reference_type?: string;
    reference_id?: string;
    created_by: string;
    created_by_name: string;
  }): Promise<CashMovement> {
    const shopId = this.getClientShopId();

    const { data: openReg } = await supabase
      .from("cash_registers").select("id").eq("shop_id", shopId).eq("status", "OPEN").limit(1).maybeSingle();
    if (!openReg) throw new Error("No hay una caja abierta para registrar movimientos");

    const movementId = generateId("cmv");
    const { data: result, error } = await supabase
      .from("cash_movements")
      .insert({
        id: movementId,
        cash_register_id: (openReg as any).id,
        shop_id: shopId,
        type: data.type,
        category: data.category,
        amount: data.amount,
        payment_method: data.payment_method,
        description: data.description,
        reference_type: data.reference_type || "",
        reference_id: data.reference_id || "",
        created_by: data.created_by,
        created_by_name: data.created_by_name,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return result as CashMovement;
  }

  async createAutomaticMovement(data: {
    type: CashMovementType;
    category: string;
    amount: number;
    payment_method: PaymentMethod;
    description: string;
    reference_type: string;
    reference_id: string;
    created_by: string;
    created_by_name: string;
  }): Promise<CashMovement | null> {
    const shopId = this.getClientShopId();
    const { data: openReg } = await supabase
      .from("cash_registers").select("id").eq("shop_id", shopId).eq("status", "OPEN").limit(1).maybeSingle();
    if (!openReg) return null;

    const movementId = generateId("cmv");
    const { data: result, error } = await supabase
      .from("cash_movements")
      .insert({
        id: movementId,
        cash_register_id: (openReg as any).id,
        shop_id: shopId,
        type: data.type,
        category: data.category,
        amount: data.amount,
        payment_method: data.payment_method,
        description: data.description,
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        created_by: data.created_by,
        created_by_name: data.created_by_name,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return null;
    return result as CashMovement;
  }

  // ---- Payment Methods (configurable per shop) ----

  async getShopPaymentMethods(): Promise<ShopPaymentMethod[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("shop_payment_methods")
      .select("*")
      .eq("shop_id", shopId)
      .order("sort_order");
    if (error) throw error;
    return (data || []) as ShopPaymentMethod[];
  }

  async getActiveShopPaymentMethods(): Promise<ShopPaymentMethod[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("shop_payment_methods")
      .select("*")
      .eq("shop_id", shopId)
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return (data || []) as ShopPaymentMethod[];
  }

  async updateShopPaymentMethod(id: string, data: Partial<ShopPaymentMethod>): Promise<void> {
    const shopId = this.getClientShopId();
    const { error } = await supabase
      .from("shop_payment_methods")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("shop_id", shopId);
    if (error) throw error;
  }

  async addShopPaymentMethod(data: { key: string; label: string; sort_order?: number }): Promise<ShopPaymentMethod> {
    const shopId = this.getClientShopId();
    const id = generateId("spm");
    const { data: result, error } = await supabase
      .from("shop_payment_methods")
      .insert({
        id,
        shop_id: shopId,
        key: data.key.toUpperCase(),
        label: data.label,
        active: true,
        sort_order: data.sort_order ?? 0,
        config: {},
      })
      .select()
      .single();
    if (error) throw error;
    return result as ShopPaymentMethod;
  }

  async deleteShopPaymentMethod(id: string): Promise<void> {
    const shopId = this.getClientShopId();
    const { error } = await supabase
      .from("shop_payment_methods")
      .delete()
      .eq("id", id)
      .eq("shop_id", shopId);
    if (error) throw error;
  }

  async reorderShopPaymentMethods(orderedIds: string[]): Promise<void> {
    const shopId = this.getClientShopId();
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase
        .from("shop_payment_methods")
        .update({ sort_order: i + 1, updated_at: new Date().toISOString() })
        .eq("id", orderedIds[i])
        .eq("shop_id", shopId);
    }
  }

  // ---- Payments (split payment support) ----

  async createPayment(data: {
    reference_type: string;
    reference_id: string;
    amount: number;
    payment_method: string;
    description?: string;
    created_by?: string;
    created_by_name?: string;
  }): Promise<Payment> {
    const shopId = this.getClientShopId();
    const id = generateId("pay");
    const { data: result, error } = await supabase
      .from("payments")
      .insert({
        id,
        shop_id: shopId,
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        amount: data.amount,
        payment_method: data.payment_method,
        description: data.description || "",
        created_by: data.created_by || "",
        created_by_name: data.created_by_name || "",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return result as Payment;
  }

  async getPayments(referenceType: string, referenceId: string): Promise<Payment[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("shop_id", shopId)
      .eq("reference_type", referenceType)
      .eq("reference_id", referenceId)
      .order("created_at");
    if (error) throw error;
    return (data || []) as Payment[];
  }

  async getPaymentsByDateRange(dateFrom: string, dateTo: string): Promise<Payment[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("shop_id", shopId)
      .gte("created_at", dateFrom)
      .lte("created_at", dateTo)
      .order("created_at");
    if (error) throw error;
    return (data || []) as Payment[];
  }

  async getPaymentsSummaryByMethod(dateFrom: string, dateTo: string): Promise<Record<string, number>> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("payments")
      .select("payment_method, amount")
      .eq("shop_id", shopId)
      .gte("created_at", dateFrom)
      .lte("created_at", dateTo);
    if (error) throw error;
    const summary: Record<string, number> = {};
    for (const row of (data || []) as any[]) {
      summary[row.payment_method] = (summary[row.payment_method] || 0) + Number(row.amount);
    }
    return summary;
  }

  // ---- Expense Categories ----

  async getExpenseCategories(): Promise<ExpenseCategory[]> {
    const shopId = this.getClientShopId();
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;

    const categories = (data || []) as ExpenseCategory[];
    if (categories.length > 0) return categories;

    // Only seed once per adapter instance
    if (!this.categoriesSeedPromise) {
      this.categoriesSeedPromise = (async () => {
        const defaults = [
          { name: "Insumos", icon: "scissors", color: "blue", sort_order: 1 },
          { name: "Productos", icon: "package", color: "purple", sort_order: 2 },
          { name: "Servicios públicos", icon: "zap", color: "yellow", sort_order: 3 },
          { name: "Arriendo", icon: "home", color: "red", sort_order: 4 },
          { name: "Mantenimiento", icon: "wrench", color: "orange", sort_order: 5 },
          { name: "Limpieza", icon: "sparkles", color: "green", sort_order: 6 },
          { name: "Publicidad", icon: "megaphone", color: "pink", sort_order: 7 },
          { name: "Transporte", icon: "truck", color: "cyan", sort_order: 8 },
          { name: "Equipos", icon: "monitor", color: "indigo", sort_order: 9 },
          { name: "Comisiones bancarias", icon: "credit-card", color: "gray", sort_order: 10 },
          { name: "Liquidaciones", icon: "file-text", color: "emerald", sort_order: 11 },
          { name: "Otros", icon: "tag", color: "gray", sort_order: 12 },
        ];
        const toInsert = defaults.map((d) => ({
          id: generateId("cat"),
          shop_id: shopId,
          ...d,
          is_default: true,
          is_active: true,
          created_at: new Date().toISOString(),
        }));
        const { data: inserted } = await supabase.from("expense_categories").insert(toInsert).select();
        return (inserted || []) as ExpenseCategory[];
      })();
    }
    return this.categoriesSeedPromise;
  }

  async createExpenseCategory(data: { name: string; icon?: string; color?: string }): Promise<ExpenseCategory> {
    const shopId = this.getClientShopId();
    const { data: cat, error } = await supabase
      .from("expense_categories")
      .insert({
        id: generateId("cat"),
        shop_id: shopId,
        name: data.name,
        icon: data.icon || "tag",
        color: data.color || "gray",
        sort_order: 99,
        is_default: false,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return cat as ExpenseCategory;
  }

  async updateExpenseCategory(id: string, data: Partial<ExpenseCategory>): Promise<void> {
    const { error } = await supabase.from("expense_categories").update(data).eq("id", id);
    if (error) throw error;
  }

  async deleteExpenseCategory(id: string): Promise<void> {
    const { error } = await supabase.from("expense_categories").update({ is_active: false }).eq("id", id);
    if (error) throw error;
  }

  // ---- Expenses ----

  async getExpenses(filters?: { date_from?: string; date_to?: string; category_id?: string; payment_method?: string; status?: string }): Promise<Expense[]> {
    const shopId = this.getClientShopId();
    let query = supabase
      .from("expenses")
      .select("*, expense_categories(name)")
      .eq("shop_id", shopId);

    if (filters?.date_from) query = query.gte("created_at", filters.date_from + "T00:00:00");
    if (filters?.date_to) query = query.lte("created_at", filters.date_to + "T23:59:59");
    if (filters?.category_id) query = query.eq("category_id", filters.category_id);
    if (filters?.payment_method) query = query.eq("payment_method", filters.payment_method);
    if (filters?.status && filters.status !== "ALL") query = query.eq("status", filters.status);
    else if (filters?.status === "ALL") { /* no filter */ }
    else query = query.eq("status", "ACTIVE");

    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((e: any) => ({
      ...e,
      category_name: e.expense_categories?.name || "Sin categoría",
    })) as Expense[];
  }

  async createExpense(data: { category_id: string; amount: number; payment_method: PaymentMethod; description: string; created_by_name: string }): Promise<Expense> {
    const shopId = this.getClientShopId();
    const openReg = await this.getOpenCashRegister();
    const expenseId = generateId("exp");

    const expenseData: any = {
      id: expenseId,
      shop_id: shopId,
      cash_register_id: openReg?.id || "",
      category_id: data.category_id,
      amount: data.amount,
      payment_method: data.payment_method,
      description: data.description,
      created_by: "",
      created_by_name: data.created_by_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "ACTIVE",
      cash_movement_id: "",
    };

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert(expenseData)
      .select("*, expense_categories(name)")
      .single();
    if (error) throw error;

    // If cash payment and open register, create cash movement
    if (data.payment_method === "CASH" && openReg) {
      try {
        const movement = await this.createCashMovement({
          type: "EXPENSE",
          category: "OTHER_EXPENSE",
          amount: data.amount,
          payment_method: "CASH",
          description: `[Gasto] ${data.description}`,
          reference_type: "EXPENSE",
          reference_id: expenseId,
          created_by: "",
          created_by_name: data.created_by_name,
        });
        await supabase.from("expenses").update({ cash_movement_id: movement.id }).eq("id", expenseId);
      } catch {
        // Cash movement creation is best-effort; expense is still recorded
      }
    }

    return {
      ...expense,
      category_name: (expense as any).expense_categories?.name || "Sin categoría",
    } as Expense;
  }

  async cancelExpense(id: string, reason: string, cancelled_by_name: string): Promise<void> {
    const { data: expense, error: fetchErr } = await supabase
      .from("expenses").select("*").eq("id", id).single();
    if (fetchErr || !expense) throw new Error("Gasto no encontrado");

    const { error } = await supabase
      .from("expenses")
      .update({
        status: "CANCELLED",
        cancelled_by: "",
        cancelled_by_name,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;

    // Reverse cash movement if exists
    if ((expense as any).cash_movement_id && (expense as any).payment_method === "CASH") {
      try {
        await this.createCashMovement({
          type: "ADJUSTMENT",
          category: "ADJUSTMENT",
          amount: (expense as any).amount,
          payment_method: "CASH",
          description: `[Anulación gasto] ${reason}`,
          reference_type: "EXPENSE_CANCEL",
          reference_id: id,
          created_by: "",
          created_by_name: cancelled_by_name,
        });
      } catch {
        // Best-effort reversal
      }
    }
  }

  // ---- Withdrawals ----

  async getWithdrawals(filters?: { date_from?: string; date_to?: string; reason?: string; status?: string }): Promise<Withdrawal[]> {
    const shopId = this.getClientShopId();
    let query = supabase
      .from("withdrawals")
      .select("*")
      .eq("shop_id", shopId);

    if (filters?.date_from) query = query.gte("created_at", filters.date_from + "T00:00:00");
    if (filters?.date_to) query = query.lte("created_at", filters.date_to + "T23:59:59");
    if (filters?.reason) query = query.eq("reason", filters.reason);
    if (filters?.status && filters.status !== "ALL") query = query.eq("status", filters.status);
    else if (filters?.status === "ALL") { /* no filter */ }
    else query = query.eq("status", "ACTIVE");

    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Withdrawal[];
  }

  async createWithdrawal(data: { amount: number; reason: string; description: string; created_by_name: string }): Promise<Withdrawal> {
    const shopId = this.getClientShopId();
    const openReg = await this.getOpenCashRegister();

    // Validate sufficient cash
    if (openReg) {
      const availableCash = await this.getAvailableCash();
      if (data.amount > availableCash) {
        throw new Error("No hay suficiente efectivo disponible en caja");
      }
    }

    const withdrawalId = generateId("wdr");
    const withdrawalData: any = {
      id: withdrawalId,
      shop_id: shopId,
      cash_register_id: openReg?.id || "",
      amount: data.amount,
      reason: data.reason,
      description: data.description,
      created_by: "",
      created_by_name: data.created_by_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "ACTIVE",
      cash_movement_id: "",
    };

    const { data: withdrawal, error } = await supabase
      .from("withdrawals")
      .insert(withdrawalData)
      .select()
      .single();
    if (error) throw error;

    // Always create cash movement for withdrawals (cash only)
    if (openReg) {
      try {
        const movement = await this.createCashMovement({
          type: "WITHDRAWAL",
          category: "WITHDRAWAL",
          amount: data.amount,
          payment_method: "CASH",
          description: `[Retiro] ${data.reason}${data.description ? ` — ${data.description}` : ""}`,
          reference_type: "WITHDRAWAL",
          reference_id: withdrawalId,
          created_by: "",
          created_by_name: data.created_by_name,
        });
        await supabase.from("withdrawals").update({ cash_movement_id: movement.id }).eq("id", withdrawalId);
      } catch {
        // Best-effort; withdrawal is still recorded
      }
    }

    return withdrawal as Withdrawal;
  }

  async cancelWithdrawal(id: string, reason: string, cancelled_by_name: string): Promise<void> {
    const { data: withdrawal, error: fetchErr } = await supabase
      .from("withdrawals").select("*").eq("id", id).single();
    if (fetchErr || !withdrawal) throw new Error("Retiro no encontrado");

    const { error } = await supabase
      .from("withdrawals")
      .update({
        status: "CANCELLED",
        cancelled_by: "",
        cancelled_by_name,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;

    // Reverse cash movement
    if ((withdrawal as any).cash_movement_id) {
      try {
        await this.createCashMovement({
          type: "ADJUSTMENT",
          category: "ADJUSTMENT",
          amount: (withdrawal as any).amount,
          payment_method: "CASH",
          description: `[Anulación retiro] ${reason}`,
          reference_type: "WITHDRAWAL_CANCEL",
          reference_id: id,
          created_by: "",
          created_by_name: cancelled_by_name,
        });
      } catch {
        // Best-effort reversal
      }
    }
  }

  async getAvailableCash(): Promise<number> {
    const reg = await this.getOpenCashRegister();
    if (!reg) return 0;
    const summary = await this.getCashRegisterSummary(reg.id);
    return summary.expectedCash;
  }

  // ---- Admin Movements (unified history) ----

  async getAdminMovements(filters?: { date_from?: string; date_to?: string; type?: string; category?: string; payment_method?: string }): Promise<AdminMovement[]> {
    const movements: AdminMovement[] = [];

    if (!filters?.type || filters.type === "EXPENSE") {
      const expenses = await this.getExpenses({
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        category_id: filters?.category,
        payment_method: filters?.payment_method,
        status: "ALL",
      });
      expenses.forEach((e) => {
        movements.push({
          id: e.id,
          type: "EXPENSE",
          date: e.created_at,
          category: e.category_name || "Sin categoría",
          amount: e.amount,
          payment_method: e.payment_method,
          description: e.description,
          created_by_name: e.created_by_name,
          status: e.status,
          cancelled_at: e.cancelled_at,
          cancellation_reason: e.cancellation_reason,
        });
      });
    }

    if (!filters?.type || filters.type === "WITHDRAWAL") {
      const withdrawals = await this.getWithdrawals({
        date_from: filters?.date_from,
        date_to: filters?.date_to,
        reason: filters?.category,
        status: "ALL",
      });
      withdrawals.forEach((w) => {
        movements.push({
          id: w.id,
          type: "WITHDRAWAL",
          date: w.created_at,
          category: w.reason,
          amount: w.amount,
          payment_method: "CASH",
          description: w.description,
          created_by_name: w.created_by_name,
          status: w.status,
          cancelled_at: w.cancelled_at,
          cancellation_reason: w.cancellation_reason,
        });
      });
    }

    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return movements;
  }

  // ---- Financial Summary ----

  async getFinancialSummary(filters?: { date_from?: string; date_to?: string }): Promise<{
    totalExpenses: number;
    totalWithdrawals: number;
    expensesByCategory: Record<string, number>;
    expensesByMethod: Record<string, number>;
  }> {
    const expenses = await this.getExpenses({ date_from: filters?.date_from, date_to: filters?.date_to, status: "ACTIVE" });
    const withdrawals = await this.getWithdrawals({ date_from: filters?.date_from, date_to: filters?.date_to, status: "ACTIVE" });

    const expensesByCategory: Record<string, number> = {};
    const expensesByMethod: Record<string, number> = {};

    expenses.forEach((e) => {
      const catName = e.category_name || "Sin categoría";
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + e.amount;
      expensesByMethod[e.payment_method] = (expensesByMethod[e.payment_method] || 0) + e.amount;
    });

    return {
      totalExpenses: expenses.reduce((s, e) => s + e.amount, 0),
      totalWithdrawals: withdrawals.reduce((s, w) => s + w.amount, 0),
      expensesByCategory,
      expensesByMethod,
    };
  }

  // ---- Settlements (Liquidaciones) ----

  async getSettlements(filters?: { barber_id?: string; status?: string; date_from?: string; date_to?: string }): Promise<Settlement[]> {
    const shopId = this.getClientShopId();
    let query = supabase.from("settlements").select("*").eq("barbershop_id", shopId);
    if (filters?.barber_id) query = query.eq("barber_id", filters.barber_id);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.date_from) query = query.gte("period_start", filters.date_from);
    if (filters?.date_to) query = query.lte("period_end", filters.date_to);
    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Settlement[];
  }

  async getSettlementById(id: string): Promise<SettlementWithDetails> {
    const shopId = this.getClientShopId();
    const { data: settlement, error } = await supabase
      .from("settlements").select("*").eq("id", id).eq("barbershop_id", shopId).single();
    if (error || !settlement) throw new Error("Liquidación no encontrada");

    const [itemsRes, adjRes, payRes] = await Promise.all([
      supabase.from("settlement_items").select("*").eq("settlement_id", id).order("service_date"),
      supabase.from("settlement_adjustments").select("*").eq("settlement_id", id).order("created_at"),
      supabase.from("settlement_payments").select("*").eq("settlement_id", id).eq("status", "ACTIVE").order("paid_at"),
    ]);

    return {
      ...(settlement as Settlement),
      items: (itemsRes.data || []) as SettlementItem[],
      adjustments: (adjRes.data || []) as SettlementAdjustment[],
      payments: (payRes.data || []) as SettlementPayment[],
    };
  }

  async generateSettlement(data: { barber_id: string; period_start: string; period_end: string; created_by_name: string }): Promise<SettlementWithDetails> {
    const shopId = this.getClientShopId();

    // Check for existing active settlement with overlapping period
    const { data: existing } = await supabase
      .from("settlements").select("id")
      .eq("barbershop_id", shopId)
      .eq("barber_id", data.barber_id)
      .in("status", ["DRAFT", "APPROVED", "PARTIALLY_PAID"])
      .gte("period_end", data.period_start)
      .lte("period_start", data.period_end);
    if (existing && existing.length > 0) {
      throw new Error("Ya existe una liquidación activa para este barbero en este período");
    }

    // Get barber info
    const barber = await this.getBarberById(data.barber_id);

    // Get income records for the period, excluding already settled ones
    const income = await this.getIncome({ date_from: data.period_start, date_to: data.period_end, barber_id: data.barber_id });

    // Get already settled income IDs
    const { data: settledItems } = await supabase
      .from("settlement_items").select("income_id")
      .eq("barbershop_id", shopId)
      .in("income_id", income.map((i) => i.income_id));

    const settledIds = new Set((settledItems || []).map((si: any) => si.income_id));
    const unsettledIncome = income.filter((inc) => !settledIds.has(inc.income_id));

    if (unsettledIncome.length === 0) {
      throw new Error("No hay servicios pendientes de liquidar para este barbero en este período");
    }

    const settlementId = generateId("stl");

    // Build items
    const items: Omit<SettlementItem, "id" | "created_at">[] = unsettledIncome.map((inc) => {
      const commissionRate = barber.commission_rate || 40;
      return {
        settlement_id: settlementId,
        barbershop_id: shopId,
        income_id: inc.income_id,
        service_name: inc.service_name || "Servicio",
        client_name: "",
        service_date: inc.date,
        gross_amount: inc.gross_amount,
        discount_amount: 0,
        net_amount: inc.gross_amount,
        commission_rate: commissionRate,
        commission_amount: inc.commission_amount,
        tip_amount: inc.tip,
      };
    });

    const servicesTotal = items.reduce((s, i) => s + i.gross_amount, 0);
    const commissionTotal = items.reduce((s, i) => s + i.commission_amount, 0);
    const tipsTotal = items.reduce((s, i) => s + i.tip_amount, 0);
    const totalAmount = commissionTotal + tipsTotal;

    // Insert settlement
    const settlementData = {
      id: settlementId,
      barbershop_id: shopId,
      barber_id: data.barber_id,
      barber_name: barber.name,
      period_start: data.period_start,
      period_end: data.period_end,
      services_total: servicesTotal,
      commission_total: commissionTotal,
      tips_total: tipsTotal,
      adjustments_total: 0,
      advances_total: 0,
      total_amount: totalAmount,
      paid_amount: 0,
      pending_amount: totalAmount,
      status: "DRAFT",
      created_by: "",
      created_by_name: data.created_by_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: settErr } = await supabase.from("settlements").insert(settlementData);
    if (settErr) throw settErr;

    // Insert items
    const itemsToInsert = items.map((item) => ({
      id: generateId("sti"),
      ...item,
      created_at: new Date().toISOString(),
    }));
    const { error: itemsErr } = await supabase.from("settlement_items").insert(itemsToInsert);
    if (itemsErr) throw itemsErr;

    return this.getSettlementById(settlementId);
  }

  async approveSettlement(id: string, approved_by_name: string): Promise<void> {
    const { data: settlement, error: fetchErr } = await supabase
      .from("settlements").select("*").eq("id", id).single();
    if (fetchErr || !settlement) throw new Error("Liquidación no encontrada");
    if ((settlement as any).status !== "DRAFT") throw new Error("Solo se pueden aprobar liquidaciones en borrador");

    const { error } = await supabase
      .from("settlements")
      .update({
        status: "APPROVED",
        approved_by: "",
        approved_by_name,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  }

  async cancelSettlement(id: string, reason: string, cancelled_by_name: string): Promise<void> {
    const shopId = this.getClientShopId();
    const { data: settlement, error: fetchErr } = await supabase
      .from("settlements").select("*").eq("id", id).single();
    if (fetchErr || !settlement) throw new Error("Liquidación no encontrada");
    if ((settlement as any).status === "CANCELLED") throw new Error("La liquidación ya está anulada");

    // Cancel any ACTIVE payments and their related expenses
    const { data: payments } = await supabase
      .from("settlement_payments").select("id, cash_movement_id")
      .eq("settlement_id", id).eq("status", "ACTIVE");

    if (payments && payments.length > 0) {
      // Cancel each payment
      for (const pay of payments) {
        await supabase.from("settlement_payments").update({
          status: "CANCELLED",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        }).eq("id", pay.id);

        // Cancel related expenses: try by cash_movement_id first, then by description
        if (pay.cash_movement_id) {
          await supabase.from("expenses").update({
            status: "CANCELLED",
            cancelled_by_name,
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
            updated_at: new Date().toISOString(),
          }).eq("cash_movement_id", pay.cash_movement_id).eq("status", "ACTIVE");
        }
        // Also cancel by description match (covers edge cases)
        await supabase.from("expenses").update({
          status: "CANCELLED",
          cancelled_by_name,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        }).eq("shop_id", shopId).eq("status", "ACTIVE").like("description", `%Liquidación%Pago a ${(settlement as any).barber_name}%`);
      }
    }

    const { error } = await supabase
      .from("settlements")
      .update({
        status: "CANCELLED",
        cancelled_by: "",
        cancelled_by_name,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  }

  async addSettlementAdjustment(settlementId: string, data: { type: string; amount: number; description: string; created_by_name: string }): Promise<void> {
    const shopId = this.getClientShopId();
    const { data: settlement, error: fetchErr } = await supabase
      .from("settlements").select("*").eq("id", settlementId).single();
    if (fetchErr || !settlement) throw new Error("Liquidación no encontrada");
    if ((settlement as any).status === "CANCELLED" || (settlement as any).status === "PAID") {
      throw new Error("No se pueden agregar ajustes a esta liquidación");
    }

    const { error: adjErr } = await supabase.from("settlement_adjustments").insert({
      id: generateId("adj"),
      settlement_id: settlementId,
      barbershop_id: shopId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      created_by: "",
      created_by_name: data.created_by_name,
      created_at: new Date().toISOString(),
    });
    if (adjErr) throw adjErr;

    // Recalculate totals
    const { data: allAdjs } = await supabase
      .from("settlement_adjustments").select("type, amount")
      .eq("settlement_id", settlementId);

    let adjTotal = 0;
    let advTotal = 0;
    (allAdjs || []).forEach((a: any) => {
      if (a.type === "ADVANCE") advTotal += Number(a.amount);
      else adjTotal += Number(a.amount);
    });

    const commission = Number((settlement as any).commission_total) || 0;
    const tips = Number((settlement as any).tips_total) || 0;
    const total = commission + tips + adjTotal - advTotal;
    const paid = Number((settlement as any).paid_amount) || 0;

    await supabase.from("settlements").update({
      adjustments_total: adjTotal,
      advances_total: advTotal,
      total_amount: total,
      pending_amount: total - paid,
      updated_at: new Date().toISOString(),
    }).eq("id", settlementId);
  }

  async registerSettlementPayment(settlementId: string, data: { amount: number; payment_method: PaymentMethod; notes: string; paid_by_name: string }): Promise<SettlementPayment> {
    const shopId = this.getClientShopId();
    const { data: settlement, error: fetchErr } = await supabase
      .from("settlements").select("*").eq("id", settlementId).single();
    if (fetchErr || !settlement) throw new Error("Liquidación no encontrada");
    if ((settlement as any).status === "CANCELLED") throw new Error("No se puede pagar una liquidación anulada");
    if ((settlement as any).status === "PAID") throw new Error("La liquidación ya está completamente pagada");

    const totalAmount = Number((settlement as any).total_amount) || 0;
    const paidAmount = Number((settlement as any).paid_amount) || 0;
    const pending = totalAmount - paidAmount;

    if (data.amount > pending) {
      throw new Error(`El monto excede el pendiente. Disponible: $${pending.toLocaleString("es-CO")}`);
    }

    const paymentId = generateId("stp");
    let cashMovementId = "";

    // Find "Liquidaciones" category, fallback to "Otros"
    let categoryId = "";
    const { data: liqCat } = await supabase
      .from("expense_categories").select("id")
      .eq("shop_id", shopId).eq("name", "Liquidaciones").eq("is_active", true).limit(1).maybeSingle();
    if (liqCat?.id) {
      categoryId = liqCat.id;
    } else {
      const { data: otrosCat } = await supabase
        .from("expense_categories").select("id")
        .eq("shop_id", shopId).eq("name", "Otros").eq("is_active", true).limit(1).maybeSingle();
      categoryId = otrosCat?.id || "";
    }

    // Create cash movement if cash payment
    if (data.payment_method === "CASH") {
      try {
        const movement = await this.createCashMovement({
          type: "EXPENSE",
          category: "OTHER_EXPENSE",
          amount: data.amount,
          payment_method: "CASH",
          description: `[Liquidación] Pago a ${(settlement as any).barber_name}`,
          reference_type: "SETTLEMENT_PAYMENT",
          reference_id: paymentId,
          created_by: "",
          created_by_name: data.paid_by_name,
        });
        cashMovementId = movement.id;
      } catch {
        // Best-effort
      }
    }

    // Create expense record so it appears in Gastos y retiros + Dashboard
    const openReg = await this.getOpenCashRegister();
    const expId = generateId("exp");
    const { error: expErr } = await supabase.from("expenses").insert({
      id: expId,
      shop_id: shopId,
      cash_register_id: openReg?.id || "",
      category_id: categoryId,
      amount: data.amount,
      payment_method: data.payment_method,
      description: `[Liquidación] Pago a ${(settlement as any).barber_name}${data.notes ? " — " + data.notes : ""}`,
      created_by: "",
      created_by_name: data.paid_by_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "ACTIVE",
      cash_movement_id: cashMovementId || paymentId,
    });
    if (expErr) {
      console.error("Error creating expense for settlement payment:", expErr);
    }

    const { data: payment, error: payErr } = await supabase.from("settlement_payments").insert({
      id: paymentId,
      settlement_id: settlementId,
      barbershop_id: shopId,
      amount: data.amount,
      payment_method: data.payment_method,
      paid_at: new Date().toISOString(),
      paid_by: "",
      paid_by_name: data.paid_by_name,
      notes: data.notes,
      cash_movement_id: cashMovementId,
      status: "ACTIVE",
      created_at: new Date().toISOString(),
    }).select().single();
    if (payErr) throw payErr;

    // Update settlement totals
    const newPaid = paidAmount + data.amount;
    const newPending = totalAmount - newPaid;
    let newStatus: string;
    if (newPending <= 0) newStatus = "PAID";
    else newStatus = "PARTIALLY_PAID";

    await supabase.from("settlements").update({
      paid_amount: newPaid,
      pending_amount: newPending,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", settlementId);

    return payment as SettlementPayment;
  }

  async getSettlementPayments(settlementId: string): Promise<SettlementPayment[]> {
    const { data, error } = await supabase
      .from("settlement_payments").select("*")
      .eq("settlement_id", settlementId)
      .eq("status", "ACTIVE")
      .order("paid_at");
    if (error) throw error;
    return (data || []) as SettlementPayment[];
  }

  async getSettlementSummary(filters?: { date_from?: string; date_to?: string }): Promise<{
    total_commission: number;
    total_paid: number;
    total_pending: number;
    by_barber: Record<string, { name: string; commission: number; paid: number; pending: number }>;
  }> {
    const shopId = this.getClientShopId();
    let query = supabase.from("settlements").select("*").eq("barbershop_id", shopId)
      .in("status", ["APPROVED", "PARTIALLY_PAID", "PAID"]);
    if (filters?.date_from) query = query.gte("period_start", filters.date_from);
    if (filters?.date_to) query = query.lte("period_end", filters.date_to);

    const { data, error } = await query;
    if (error) throw error;

    const settlements = (data || []) as Settlement[];
    const byBarber: Record<string, { name: string; commission: number; paid: number; pending: number }> = {};

    settlements.forEach((s) => {
      if (!byBarber[s.barber_id]) {
        byBarber[s.barber_id] = { name: s.barber_name, commission: 0, paid: 0, pending: 0 };
      }
      byBarber[s.barber_id].commission += s.total_amount;
      byBarber[s.barber_id].paid += s.paid_amount;
      byBarber[s.barber_id].pending += s.pending_amount;
    });

    return {
      total_commission: settlements.reduce((s, st) => s + st.total_amount, 0),
      total_paid: settlements.reduce((s, st) => s + st.paid_amount, 0),
      total_pending: settlements.reduce((s, st) => s + st.pending_amount, 0),
      by_barber: byBarber,
    };
  }
}
