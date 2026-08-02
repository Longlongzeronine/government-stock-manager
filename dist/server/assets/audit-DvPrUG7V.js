import { W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { u as useQuery } from "./useQuery-CPGv4dSv.js";
import { q as listAuditLogs } from "./data.functions-BJW9FjRX.js";
import { P as PageHeader } from "./AppShell-a1FTjCXc.js";
import { u as useAuth } from "./router-CfAHfNkT.js";
import { M as MobileCard, a as MobileCardRow } from "./MobileCard-BcxUBx43.js";
import { u as useIsMobile } from "./use-mobile-BiTvKiC1.js";
import { f as format } from "./format-PJEwTTZm.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-onWpx3op.js";
function Audit() {
  const {
    isAdmin
  } = useAuth();
  const {
    data: rows = []
  } = useQuery({
    queryKey: ["audit"],
    queryFn: () => listAuditLogs(),
    refetchInterval: 3e3
  });
  const isMobileView = useIsMobile();
  if (!isAdmin) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-sm text-muted-foreground", children: "Admin access required." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Audit Log", subtitle: "System activity, last 500 events" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-6 lg:p-8", children: [
      !isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card border border-border rounded-lg overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "When" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Actor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Action" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Table" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Row" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 tabular-nums text-xs", children: format(new Date(r.created_at), "MMM d, HH:mm:ss") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: r.actor_email ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 rounded border border-border bg-muted/50", children: r.action }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-mono text-xs", children: r.table_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-4 py-2.5 font-mono text-xs text-muted-foreground", children: [
              r.row_id?.slice(0, 8),
              "…"
            ] })
          ] }, r.id)),
          rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, className: "p-12 text-center text-sm text-muted-foreground", children: "No events." }) })
        ] })
      ] }) }),
      isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        rows.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MobileCard, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs px-2 py-0.5 rounded border border-border bg-muted/50 shrink-0", children: r.action }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground tabular-nums", children: format(new Date(r.created_at), "MMM d, HH:mm:ss") })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border pt-2 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCardRow, { label: "Actor", value: r.actor_email ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCardRow, { label: "Table", value: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono text-xs", children: r.table_name }) }),
            r.row_id && /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCardRow, { label: "Row", value: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono text-xs text-muted-foreground", children: [
              r.row_id.slice(0, 8),
              "…"
            ] }) })
          ] })
        ] }, r.id)),
        rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg", children: "No events." })
      ] })
    ] })
  ] });
}
export {
  Audit as component
};
