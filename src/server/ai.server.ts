import { createClient } from "@supabase/supabase-js";

export async function getInventorySnapshot() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const sb = createClient(url, key);
  const { data: items } = await sb.from("items").select("name,quantity,unit,reorder_level,category:categories(name),supplier:suppliers(name)").order("quantity");
  const { data: tx } = await sb.from("transactions").select("type,quantity,created_at,item:items(name)").order("created_at", { ascending: false }).limit(100);
  const low = (items ?? []).filter((i: any) => i.quantity <= i.reorder_level).slice(0, 25);
  return {
    total_items: items?.length ?? 0,
    out_of_stock: (items ?? []).filter((i: any) => i.quantity === 0).length,
    low_stock_items: low.map((i: any) => ({ name: i.name, qty: i.quantity, unit: i.unit, reorder: i.reorder_level, category: i.category?.name, supplier: i.supplier?.name })),
    recent_transactions: (tx ?? []).slice(0, 30).map((t: any) => ({ item: t.item?.name, type: t.type, qty: t.quantity, at: t.created_at })),
  };
}
