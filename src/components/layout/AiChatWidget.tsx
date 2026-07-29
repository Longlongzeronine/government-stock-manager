import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, User, X, MessageSquare, Bot } from "lucide-react";
import { toast } from "sonner";
import { askAssistant } from "@/lib/ai.functions";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "Which items are low stock?",
  "What should we reorder this week?",
  "Show me a summary of the last 30 days.",
  "Which items have the highest usage?",
];

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Good day. I am the inventory assistant. I can analyze stock levels, suggest reorders, and produce summaries of recent activity. How may I assist you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res: any = await askAssistant({ data: { messages: [...messages, userMsg] } });
      if (res?.error) toast.error(res.error);
      setMessages((m) => [...m, { role: "assistant", content: res?.reply ?? "(no response)" }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Assistant unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-all hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-7 w-7 -mt-0.5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary/15 grid place-items-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">AI Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`h-7 w-7 shrink-0 rounded-md grid place-items-center ${
                    m.role === "user"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {m.role === "user" ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-sm leading-relaxed max-w-[85%] ${
                    m.role === "user"
                      ? "bg-secondary border border-border"
                      : "bg-background border border-border"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-sm text-muted-foreground pl-9">Analyzing inventory…</div>
            )}
            {messages.length === 1 && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-left text-xs px-2.5 py-2 border border-border bg-card rounded-md hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask about inventory…"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-0"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}