import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Sparkles, Send, User } from "lucide-react";
import { toast } from "sonner";
import { askAssistant } from "@/lib/ai.functions";

export const Route = createFileRoute("/_app/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — GovInventory" }] }),
  component: Assistant,
});

interface Msg { role: "user" | "assistant"; content: string; }

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Good day. I am the inventory assistant. I can analyze stock levels, suggest reorders, and produce summaries of recent activity. How may I assist you?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages(m => [...m, userMsg]); setInput(""); setLoading(true);
    try {
      const res: any = await askAssistant({ data: { messages: [...messages, userMsg] } });
      if (res?.error) toast.error(res.error);
      setMessages(m => [...m, { role: "assistant", content: res?.reply ?? "(no response)" }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Assistant unavailable");
    } finally { setLoading(false); }
  }

  const suggestions = [
    "Which items are low stock?",
    "What should we reorder this week?",
    "Show me a summary of the last 30 days of usage.",
    "Which items have the highest stock-out volume?",
  ];

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="AI Inventory Assistant" subtitle="Ask questions about your inventory, usage, and reorder priorities" />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 shrink-0 rounded-md grid place-items-center ${m.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <div className={`rounded-lg px-4 py-3 text-sm leading-relaxed border ${m.role === "user" ? "bg-secondary border-border" : "bg-card border-border"}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-muted-foreground pl-11">Analyzing inventory…</div>}
          {messages.length === 1 && (
            <div className="pt-4 grid sm:grid-cols-2 gap-2">
              {suggestions.map(s => (
                <button key={s} onClick={() => setInput(s)} className="text-left text-sm px-3 py-2 border border-border bg-card rounded-md hover:bg-accent">{s}</button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div className="border-t border-border bg-card p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about inventory, usage, or reorder priorities…"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm"
          />
          <button onClick={send} disabled={loading || !input.trim()} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium disabled:opacity-50">
            <Send className="h-4 w-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
