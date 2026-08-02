import { r as reactExports, W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { u as useQuery } from "./useQuery-CPGv4dSv.js";
import { u as useAuth, b as useQueryClient, t as toast } from "./router-CfAHfNkT.js";
import { a as createTransaction, b as listTransactions, e as listItems } from "./data.functions-BJW9FjRX.js";
import { P as PageHeader } from "./AppShell-a1FTjCXc.js";
import { M as MobileCard, a as MobileCardRow } from "./MobileCard-BcxUBx43.js";
import { u as useIsMobile } from "./use-mobile-BiTvKiC1.js";
import { P as Plus } from "./plus-RZNd2DyP.js";
import { f as format } from "./format-PJEwTTZm.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-onWpx3op.js";
function Stock() {
  const {
    canWrite,
    user
  } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = reactExports.useState(false);
  const {
    data: txs = []
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => listTransactions({
      data: {
        limit: 200
      }
    }),
    refetchInterval: 3e3
  });
  const {
    data: items = []
  } = useQuery({
    queryKey: ["items"],
    queryFn: () => listItems(),
    refetchInterval: 3e3
  });
  const isMobileView = useIsMobile();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Stock Movement", subtitle: "Record stock in and stock out transactions", actions: canWrite && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setOpen(true), className: "inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Record movement"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-6 lg:p-8", children: [
      !isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card border border-border rounded-lg overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Item" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Type" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-right px-4 py-3", children: "Quantity" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Staff" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Remarks" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          txs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border hover:bg-muted/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 tabular-nums text-xs", children: format(new Date(t.created_at), "MMM d, yyyy HH:mm") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.item?.name ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-semibold px-2 py-0.5 rounded-md border ${t.type === "IN" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}`, children: t.type }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-4 py-2.5 text-right tabular-nums", children: [
              t.quantity,
              " ",
              t.item?.unit
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: t.staff_name ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-muted-foreground", children: t.remarks ?? "—" })
          ] }, t.id)),
          txs.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, className: "p-12 text-center text-sm text-muted-foreground", children: "No transactions recorded." }) })
        ] })
      ] }) }),
      isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        txs.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MobileCard, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-base", children: t.item?.name ?? "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1", children: format(new Date(t.created_at), "MMM d, yyyy HH:mm") })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `text-xs font-semibold px-2 py-1 rounded-md border shrink-0 ${t.type === "IN" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}`, children: t.type })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border pt-2 space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCardRow, { label: "Quantity", value: `${t.quantity} ${t.item?.unit ?? ""}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCardRow, { label: "Staff", value: t.staff_name ?? "—" }),
            t.remarks && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Remarks" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm mt-1", children: t.remarks })
            ] })
          ] })
        ] }, t.id)),
        txs.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg", children: "No transactions recorded." })
      ] })
    ] }),
    open && canWrite && /* @__PURE__ */ jsxRuntimeExports.jsx(MovementDialog, { items, userId: user?.id, userName: user?.user_metadata?.full_name || user?.email || "", onClose: () => setOpen(false), onSaved: () => {
      setOpen(false);
      qc.invalidateQueries({
        queryKey: ["transactions"]
      });
      qc.invalidateQueries({
        queryKey: ["items"]
      });
    } })
  ] });
}
function MovementDialog({
  items,
  userId,
  userName,
  onClose,
  onSaved
}) {
  const [form, setForm] = reactExports.useState({
    item_id: "",
    type: "IN",
    quantity: 1,
    remarks: ""
  });
  const [saving, setSaving] = reactExports.useState(false);
  async function save(e) {
    e.preventDefault();
    if (!form.item_id) return toast.error("Select an item");
    setSaving(true);
    try {
      await createTransaction({
        data: {
          item_id: form.item_id,
          type: form.type,
          quantity: Number(form.quantity),
          staff_id: userId,
          staff_name: userName,
          remarks: form.remarks || null
        }
      });
      setSaving(false);
      toast.success("Movement recorded");
      onSaved();
    } catch (e2) {
      setSaving(false);
      toast.error(e2?.message ?? "Save failed");
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-foreground/30 backdrop-blur-sm grid place-items-center z-50 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: save, className: "bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl", children: "Record Stock Movement" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Item" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { required: true, value: form.item_id, onChange: (e) => setForm({
        ...form,
        item_id: e.target.value
      }), className: "dlg-input mt-1.5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select item…" }),
        items.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: i.id, children: [
          i.name,
          " (",
          i.quantity,
          " ",
          i.unit,
          ")"
        ] }, i.id))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.type, onChange: (e) => setForm({
          ...form,
          type: e.target.value
        }), className: "dlg-input mt-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "IN", children: "Stock IN" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "OUT", children: "Stock OUT" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Quantity" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 1, required: true, value: form.quantity, onChange: (e) => setForm({
          ...form,
          quantity: e.target.value
        }), className: "dlg-input mt-1.5" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Remarks" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 2, value: form.remarks, onChange: (e) => setForm({
        ...form,
        remarks: e.target.value
      }), className: "dlg-input mt-1.5" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 rounded-md border border-input text-sm", children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: saving, className: "px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50", children: saving ? "Saving…" : "Record" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `.dlg-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.5rem .7rem;font-size:.875rem;outline:none}.dlg-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}` })
  ] }) });
}
export {
  Stock as component
};
