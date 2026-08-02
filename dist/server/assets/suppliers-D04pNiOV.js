import { r as reactExports, W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { u as useQuery } from "./useQuery-CPGv4dSv.js";
import { u as useAuth, b as useQueryClient, t as toast } from "./router-CfAHfNkT.js";
import { d as deleteSupplier, u as updateSupplier, c as createSupplier, l as listSuppliers } from "./data.functions-BJW9FjRX.js";
import { P as PageHeader } from "./AppShell-a1FTjCXc.js";
import { M as MobileCard, a as MobileCardRow } from "./MobileCard-BcxUBx43.js";
import { u as useIsMobile } from "./use-mobile-BiTvKiC1.js";
import { P as Plus } from "./plus-RZNd2DyP.js";
import { P as Pencil } from "./pencil-BuBrZQbc.js";
import { T as Trash2 } from "./trash-2-Cb4F0EVf.js";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-onWpx3op.js";
function Suppliers() {
  const {
    canWrite,
    isAdmin
  } = useAuth();
  const qc = useQueryClient();
  const {
    data: rows = []
  } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listSuppliers(),
    refetchInterval: 3e3
  });
  const [editing, setEditing] = reactExports.useState(null);
  const [open, setOpen] = reactExports.useState(false);
  async function del(id) {
    if (!confirm("Delete this supplier?")) return;
    try {
      await deleteSupplier({
        data: {
          id
        }
      });
      toast.success("Deleted");
      qc.invalidateQueries({
        queryKey: ["suppliers"]
      });
    } catch (e) {
      toast.error(e?.message ?? "Delete failed");
    }
  }
  const isMobileView = useIsMobile();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Suppliers", subtitle: `${rows.length} suppliers on file`, actions: canWrite && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
      setEditing(null);
      setOpen(true);
    }, className: "inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Add supplier"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-6 lg:p-8", children: [
      !isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card border border-border rounded-lg overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Contact" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Address" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Notes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          rows.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border hover:bg-muted/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-medium", children: s.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3", children: s.contact ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.address ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: s.notes ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-right", children: canWrite && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
                setEditing(s);
                setOpen(true);
              }, className: "p-1.5 rounded hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
              isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => del(s.id), className: "p-1.5 rounded hover:bg-destructive/10 text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
            ] }) })
          ] }, s.id)),
          rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, className: "p-12 text-center text-sm text-muted-foreground", children: "No suppliers yet." }) })
        ] })
      ] }) }),
      isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        rows.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MobileCard, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-base", children: s.name }),
            canWrite && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1 shrink-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
                setEditing(s);
                setOpen(true);
              }, className: "p-1.5 rounded hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
              isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => del(s.id), className: "p-1.5 rounded hover:bg-destructive/10 text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border pt-2 space-y-2", children: [
            s.contact && /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCardRow, { label: "Contact", value: s.contact }),
            s.address && /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCardRow, { label: "Address", value: s.address }),
            s.notes && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "pt-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider text-muted-foreground", children: "Notes" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm mt-1", children: s.notes })
            ] })
          ] })
        ] }, s.id)),
        rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg", children: "No suppliers yet." })
      ] })
    ] }),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx(SupDialog, { editing, onClose: () => setOpen(false), onSaved: () => {
      setOpen(false);
      qc.invalidateQueries({
        queryKey: ["suppliers"]
      });
    } })
  ] });
}
function SupDialog({
  editing,
  onClose,
  onSaved
}) {
  const [form, setForm] = reactExports.useState({
    name: editing?.name ?? "",
    contact: editing?.contact ?? "",
    address: editing?.address ?? "",
    notes: editing?.notes ?? ""
  });
  const [saving, setSaving] = reactExports.useState(false);
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateSupplier({
          data: {
            ...form,
            id: editing.id
          }
        });
      } else {
        await createSupplier({
          data: form
        });
      }
      setSaving(false);
      toast.success("Saved");
      onSaved();
    } catch (e2) {
      setSaving(false);
      toast.error(e2?.message ?? "Save failed");
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-foreground/30 backdrop-blur-sm grid place-items-center z-50 p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: save, className: "bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl", children: editing ? "Edit supplier" : "Add supplier" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Name" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { required: true, className: "dlg-input mt-1.5", value: form.name, onChange: (e) => setForm({
        ...form,
        name: e.target.value
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Contact" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "dlg-input mt-1.5", value: form.contact, onChange: (e) => setForm({
        ...form,
        contact: e.target.value
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Address" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "dlg-input mt-1.5", value: form.address, onChange: (e) => setForm({
        ...form,
        address: e.target.value
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Notes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 2, className: "dlg-input mt-1.5", value: form.notes, onChange: (e) => setForm({
        ...form,
        notes: e.target.value
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 rounded-md border border-input text-sm", children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { disabled: saving, className: "px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium", children: saving ? "Saving…" : "Save" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `.dlg-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.5rem .7rem;font-size:.875rem;outline:none}.dlg-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}` })
  ] }) });
}
export {
  Suppliers as component
};
