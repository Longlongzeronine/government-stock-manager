import { c as createServerRpc } from "./createServerRpc-RASzoWcs.js";
import { a2 as createServerFn } from "./server-DkTiwXTO.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
function offlineInventoryReply(snapshot, latestQuestion) {
  if (!snapshot) {
    return "Assistant is running in offline mode, but inventory data is unavailable. Check Supabase configuration.";
  }
  const low = snapshot.low_stock_items;
  const out = low.filter((item) => item.qty === 0);
  const critical = low.filter((item) => item.qty > 0 && item.qty <= Math.max(1, item.reorder / 2));
  const wantsReorder = /reorder|low|stock|out|critical|priority/i.test(latestQuestion);
  if (wantsReorder) {
    const lines = [`Inventory summary: ${snapshot.total_items} items, ${snapshot.out_of_stock} out of stock.`, "", "Reorder priorities:", ...low.slice(0, 10).map((item, index) => {
      const status = item.qty === 0 ? "out of stock" : "low stock";
      return `${index + 1}. ${item.name}: ${item.qty} ${item.unit} (${status}; reorder level ${item.reorder})`;
    })];
    if (low.length === 0) lines.push("No low-stock items found.");
    return lines.join("\n");
  }
  return [`Inventory summary: ${snapshot.total_items} items on record.`, `${snapshot.out_of_stock} items are out of stock.`, `${critical.length} items are critically low.`, `${snapshot.recent_transactions.length} recent transactions loaded.`, "", out.length ? `Immediate attention: ${out.slice(0, 5).map((item) => item.name).join(", ")}.` : "No out-of-stock items in current snapshot."].join("\n");
}
const askAssistant_createServerFn_handler = createServerRpc({
  id: "c291f2b264a8df20193c647ec8f8f26a302b159ba64d3c2e10c7ecf9b6a99e5a",
  name: "askAssistant",
  filename: "src/lib/ai.functions.ts"
}, (opts) => askAssistant.__executeServer(opts));
const askAssistant = createServerFn({
  method: "POST"
}).inputValidator((d) => d).handler(askAssistant_createServerFn_handler, async ({
  data
}) => {
  const apiKey = process.env.LOVABLE_API_KEY;
  let snap = null;
  let context = "";
  try {
    const {
      getInventorySnapshot
    } = await import("./ai.server-Dd78Y8Bb.js");
    snap = await getInventorySnapshot();
    if (snap) {
      context = `Live inventory snapshot (JSON):
${JSON.stringify(snap)}`;
    }
  } catch (e) {
    console.error("snapshot error", e);
  }
  if (!apiKey) {
    const latestQuestion = data.messages.at(-1)?.content ?? "";
    return {
      reply: offlineInventoryReply(snap, latestQuestion),
      error: null
    };
  }
  const systemPrompt = `You are the AI Inventory Assistant for a Government Office Inventory Management System. Your tone is formal, professional, concise, and clear - appropriate for government correspondence. Use the live inventory snapshot below as your source of truth. When recommending reorders, prioritize items that are out of stock or critically low (quantity at or below half of reorder level). Format responses with short paragraphs and bullet lists where helpful.

${context}`;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{
          role: "system",
          content: systemPrompt
        }, ...data.messages]
      })
    });
    if (!r.ok) {
      if (r.status === 429) {
        return {
          error: "Rate limit exceeded. Please try again shortly.",
          reply: ""
        };
      }
      if (r.status === 402) {
        return {
          error: "AI credits exhausted. Add credits in Settings -> Workspace -> Usage.",
          reply: ""
        };
      }
      const txt = await r.text();
      console.error("AI gateway error:", r.status, txt);
      return {
        error: "AI gateway error",
        reply: ""
      };
    }
    const j = await r.json();
    const reply = j.choices?.[0]?.message?.content ?? "";
    return {
      reply,
      error: null
    };
  } catch (e) {
    console.error(e);
    return {
      error: e instanceof Error ? e.message : "AI request failed",
      reply: ""
    };
  }
});
export {
  askAssistant_createServerFn_handler
};
