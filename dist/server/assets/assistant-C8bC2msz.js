import { r as reactExports, W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { P as PageHeader, U as User, f as Sparkles, S as Send, g as askAssistant } from "./AppShell-a1FTjCXc.js";
import { t as toast } from "./router-CfAHfNkT.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./use-mobile-BiTvKiC1.js";
import "./index-onWpx3op.js";
function Assistant() {
  const [messages, setMessages] = reactExports.useState([{
    role: "assistant",
    content: "Good day. I am the inventory assistant. I can analyze stock levels, suggest reorders, and produce summaries of recent activity. How may I assist you?"
  }]);
  const [input, setInput] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const endRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);
  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = {
      role: "user",
      content: input.trim()
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await askAssistant({
        data: {
          messages: [...messages, userMsg]
        }
      });
      if (res?.error) toast.error(res.error);
      setMessages((m) => [...m, {
        role: "assistant",
        content: res?.reply ?? "(no response)"
      }]);
    } catch (e) {
      toast.error(e?.message ?? "Assistant unavailable");
    } finally {
      setLoading(false);
    }
  }
  const suggestions = ["Which items are low stock?", "What should we reorder this week?", "Show me a summary of the last 30 days of usage.", "Which items have the highest stock-out volume?"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-screen", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "AI Inventory Assistant", subtitle: "Ask questions about your inventory, usage, and reorder priorities" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl mx-auto space-y-4", children: [
      messages.map((m, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `h-8 w-8 shrink-0 rounded-md grid place-items-center ${m.role === "user" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`, children: m.role === "user" ? /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "h-4 w-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `rounded-lg px-4 py-3 text-sm leading-relaxed border ${m.role === "user" ? "bg-secondary border-border" : "bg-card border-border"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "whitespace-pre-wrap", children: m.content }) })
      ] }, i)),
      loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-muted-foreground pl-11", children: "Analyzing inventory…" }),
      messages.length === 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-4 grid sm:grid-cols-2 gap-2", children: suggestions.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setInput(s), className: "text-left text-sm px-3 py-2 border border-border bg-card rounded-md hover:bg-accent", children: s }, s)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: endRef })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border bg-card p-3 sm:p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-3xl mx-auto flex gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      }, placeholder: "Ask about inventory, usage, or reorder priorities…", className: "flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm min-w-0" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: send, disabled: loading || !input.trim(), className: "inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 sm:px-4 py-2.5 text-sm font-medium disabled:opacity-50 shrink-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-4 w-4" }),
        " Send"
      ] })
    ] }) })
  ] });
}
export {
  Assistant as component
};
