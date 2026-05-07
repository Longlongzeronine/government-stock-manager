import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

interface Msg { role: "user" | "assistant" | "system"; content: string; }

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: Msg[] }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { error: "AI is not configured. Add the LOVABLE_API_KEY secret to enable the assistant.", reply: "" };

    // Read inventory snapshot via publishable key (RLS does not block reads for auth; viewer-equivalent server access — public-key fallback)
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    let context = "";
    if (url && key) {
      try {
        const sb = createClient(url, key);
        const { data: items } = await sb.from("items").select("name,quantity,unit,reorder_level,category:categories(name),supplier:suppliers(name)").order("quantity");
        const { data: tx } = await sb.from("transactions").select("type,quantity,created_at,item:items(name)").order("created_at", { ascending: false }).limit(100);
        const low = (items ?? []).filter((i: any) => i.quantity <= i.reorder_level).slice(0, 25);
        const summary = {
          total_items: items?.length ?? 0,
          out_of_stock: (items ?? []).filter((i: any) => i.quantity === 0).length,
          low_stock_items: low.map((i: any) => ({ name: i.name, qty: i.quantity, unit: i.unit, reorder: i.reorder_level, category: i.category?.name, supplier: i.supplier?.name })),
          recent_transactions: (tx ?? []).slice(0, 30).map((t: any) => ({ item: t.item?.name, type: t.type, qty: t.quantity, at: t.created_at })),
        };
        context = `Live inventory snapshot (JSON):\n${JSON.stringify(summary)}`;
      } catch (e) { console.error("snapshot error", e); }
    }

    const systemPrompt = `You are the AI Inventory Assistant for a Government Office Inventory Management System. Your tone is formal, professional, concise, and clear — appropriate for government correspondence. Use the live inventory snapshot below as your source of truth. When recommending reorders, prioritize items that are out of stock or critically low (quantity at or below half of reorder level). Format responses with short paragraphs and bullet lists where helpful.\n\n${context}`;

    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...data.messages],
        }),
      });
      if (!r.ok) {
        if (r.status === 429) return { error: "Rate limit exceeded. Please try again shortly.", reply: "" };
        if (r.status === 402) return { error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.", reply: "" };
        const txt = await r.text();
        console.error("AI gateway error:", r.status, txt);
        return { error: "AI gateway error", reply: "" };
      }
      const j = await r.json();
      const reply = j.choices?.[0]?.message?.content ?? "";
      return { reply, error: null };
    } catch (e: any) {
      console.error(e);
      return { error: e?.message ?? "AI request failed", reply: "" };
    }
  });
