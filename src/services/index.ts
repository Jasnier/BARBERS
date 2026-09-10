import { SupabaseAdapter } from "./supabase/adapter";
import type { DataAdapter } from "./types";

const adapter: DataAdapter = new SupabaseAdapter();

export default adapter;
export type { DataAdapter } from "./types";
