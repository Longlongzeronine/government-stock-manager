import { createServerFn } from "@tanstack/react-start";

interface Msg {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface InventorySnapshot {
  total_items: number;
  out_of_stock: number;
  low_stock_items: Array<{
    name: string;
    qty: number;
    unit: string;
    reorder: number;
    category?: string;
    supplier?: string;
  }>;
  recent_transactions: Array<{
    item?: string;
    type: string;
    qty: number;
    at: string;
  }>;
}

function serverEnv(name: string): string {
  const runtime = globalThis as typeof globalThis & {
    __WORKER_ENV__?: Record<string, unknown>;
    process?: { env?: Record<string, string | undefined> };
  };
  const workerValue = runtime.__WORKER_ENV__?.[name];
  if (typeof workerValue === "string" && workerValue.trim()) {
    return workerValue.trim();
  }
  return runtime.process?.env?.[name]?.trim() ?? "";
}

function validateMessages(value: unknown): Msg[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    throw new Error("Send between 1 and 30 chat messages.");
  }

  return value.map((message): Msg => {
    if (
      !message ||
      typeof message !== "object" ||
      !["user", "assistant"].includes((message as Msg).role) ||
      typeof (message as Msg).content !== "string" ||
      !(message as Msg).content.trim() ||
      (message as Msg).content.length > 8_000
    ) {
      throw new Error("Chat messages must have a valid role and non-empty text under 8,000 characters.");
    }
    return { role: (message as Msg).role, content: (message as Msg).content.trim() };
  });
}

function offlineInventoryReply(snapshot: InventorySnapshot | null, latestQuestion: string) {
  if (!snapshot) {
    return "Assistant is running in offline mode, but inventory data is unavailable. Check Supabase configuration.";
  }

  const low = snapshot.low_stock_items;
  const out = low.filter((item) => item.qty === 0);
  const critical = low.filter((item) => item.qty > 0 && item.qty <= Math.max(1, item.reorder / 2));
  const wantsReorder = /reorder|low|stock|out|critical|priority/i.test(latestQuestion);

  if (wantsReorder) {
    const lines = [
      `Inventory summary: ${snapshot.total_items} items, ${snapshot.out_of_stock} out of stock.`,
      "",
      "Reorder priorities:",
      ...low.slice(0, 10).map((item, index) => {
        const status = item.qty === 0 ? "out of stock" : "low stock";
        return `${index + 1}. ${item.name}: ${item.qty} ${item.unit} (${status}; reorder level ${item.reorder})`;
      }),
    ];
    if (low.length === 0) lines.push("No low-stock items found.");
    return lines.join("\n");
  }

  return [
    `Inventory summary: ${snapshot.total_items} items on record.`,
    `${snapshot.out_of_stock} items are out of stock.`,
    `${critical.length} items are critically low.`,
    `${snapshot.recent_transactions.length} recent transactions loaded.`,
    "",
    out.length
      ? `Immediate attention: ${out
          .slice(0, 5)
          .map((item) => item.name)
          .join(", ")}.`
      : "No out-of-stock items in current snapshot.",
  ].join("\n");
}

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!d || typeof d !== "object" || !("messages" in d)) {
      throw new Error("Chat messages are required.");
    }
    return { messages: validateMessages((d as { messages: unknown }).messages) };
  })
  .handler(async ({ data }) => {
    const apiKey = serverEnv("LOVABLE_API_KEY");
    let snap: InventorySnapshot | null = null;
    let context = "";
    try {
      const { getInventorySnapshot } = await import("@/server/ai.server");
      snap = (await getInventorySnapshot()) as InventorySnapshot | null;
      if (snap) {
        context = `Live inventory snapshot (JSON):\n${JSON.stringify(snap)}`;
      }
    } catch (e) {
      console.error("snapshot error", e);
    }

    if (!apiKey) {
      const latestQuestion = data.messages.at(-1)?.content ?? "";
      return { reply: offlineInventoryReply(snap, latestQuestion), error: null };
    }

    const systemPrompt = `You are the AI Inventory Assistant for a Government Office Inventory Management System. Your tone is formal, professional, concise, and clear - appropriate for government correspondence. Use the live inventory snapshot below as your source of truth. When recommending reorders, prioritize items that are out of stock or critically low (quantity at or below half of reorder level). Format responses with short paragraphs and bullet lists where helpful.\n\n${context}`;

    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...data.messages.filter((message) => message.role !== "system"),
          ],
        }),
      });

      if (!r.ok) {
        if (r.status === 429) {
          return {
            error: "Rate limit exceeded. Please try again shortly.",
            reply: "",
          };
        }
        if (r.status === 402) {
          return {
            error: "AI credits exhausted. Add credits in Settings -> Workspace -> Usage.",
            reply: "",
          };
        }
        const txt = await r.text();
        console.error("AI gateway error:", r.status, txt);
        return { error: "AI gateway error", reply: "" };
      }

      const j = (await r.json()) as ChatCompletionResponse;
      const reply = j.choices?.[0]?.message?.content ?? "";
      return { reply, error: null };
    } catch (e: unknown) {
      console.error(e);
      return {
        error: e instanceof Error ? e.message : "AI request failed",
        reply: "",
      };
    }
  });
