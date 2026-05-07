import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type AppRole = "admin" | "staff" | "viewer";
export type TxType = "IN" | "OUT";

export interface Item {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  supplier_id: string | null;
  quantity: number;
  unit: string;
  reorder_level: number;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
}
export interface Category { id: string; name: string; description: string | null; created_at: string; }
export interface Supplier { id: string; name: string; contact: string | null; address: string | null; notes: string | null; created_at: string; }
export interface Transaction {
  id: string; item_id: string; type: TxType; quantity: number;
  staff_id: string | null; staff_name: string | null; remarks: string | null; created_at: string;
  item?: { id: string; name: string; unit: string } | null;
}
export interface Profile { id: string; full_name: string | null; email: string | null; created_at: string; }
export interface AuditLog { id: string; actor_id: string | null; actor_email: string | null; action: string; table_name: string; row_id: string | null; payload: any; created_at: string; }
