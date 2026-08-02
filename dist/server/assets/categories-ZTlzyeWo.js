import { r as reactExports, W as jsxRuntimeExports } from "./server-DkTiwXTO.js";
import { u as useQuery } from "./useQuery-CPGv4dSv.js";
import { u as useAuth, b as useQueryClient, t as toast } from "./router-CfAHfNkT.js";
import { n as deleteCategory, o as updateCategory, p as createCategory, m as listCategories } from "./data.functions-BJW9FjRX.js";
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
function Categories() {
  const {
    isAdmin
  } = useAuth();
  const qc = useQueryClient();
  const {
    data: cats = []
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
    refetchInterval: 3e3
  });
  const [editing, setEditing] = reactExports.useState(null);
  const [open, setOpen] = reactExports.useState(false);
  async function del(id) {
    if (!confirm("Delete this category?")) return;
    try {
      await deleteCategory({
        data: {
          id
        }
      });
      toast.success("Deleted");
      qc.invalidateQueries({
        queryKey: ["categories"]
      });
    } catch (e) {
      toast.error(e?.message ?? "Delete failed");
    }
  }
  const isMobileView = useIsMobile();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(PageHeader, { title: "Categories", subtitle: `${cats.length} categories`, actions: isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
      setEditing(null);
      setOpen(true);
    }, className: "inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
      " Add category"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 sm:p-6 lg:p-8", children: [
      !isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card border border-border rounded-lg overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { className: "bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "text-left px-4 py-3", children: "Description" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", {})
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          cats.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "border-t border-border hover:bg-muted/30", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 font-medium", children: c.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-muted-foreground", children: c.description ?? "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-3 text-right", children: isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
                setEditing(c);
                setOpen(true);
              }, className: "p-1.5 rounded hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => del(c.id), className: "p-1.5 rounded hover:bg-destructive/10 text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
            ] }) })
          ] }, c.id)),
          cats.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "p-12 text-center text-sm text-muted-foreground", children: "No categories yet." }) })
        ] })
      ] }) }),
      isMobileView && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-3", children: [
        cats.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(MobileCard, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-medium text-base", children: c.name }),
            isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1 shrink-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
                setEditing(c);
                setOpen(true);
              }, className: "p-1.5 rounded hover:bg-accent", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => del(c.id), className: "p-1.5 rounded hover:bg-destructive/10 text-destructive", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "h-3.5 w-3.5" }) })
            ] })
          ] }),
          c.description && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border pt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MobileCardRow, { label: "Description", value: c.description }) })
        ] }, c.id)),
        cats.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg", children: "No categories yet." })
      ] })
    ] }),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx(CatDialog, { editing, onClose: () => setOpen(false), onSaved: () => {
      setOpen(false);
      qc.invalidateQueries({
        queryKey: ["categories"]
      });
    } })
  ] });
}
function CatDialog({
  editing,
  onClose,
  onSaved
}) {
  const [form, setForm] = reactExports.useState({
    name: editing?.name ?? "",
    description: editing?.description ?? ""
  });
  const [saving, setSaving] = reactExports.useState(false);
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateCategory({
          data: {
            ...form,
            id: editing.id
          }
        });
      } else {
        await createCategory({
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
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl", children: editing ? "Edit category" : "Add category" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Name" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { required: true, className: "dlg-input mt-1.5", value: form.name, onChange: (e) => setForm({
        ...form,
        name: e.target.value
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs uppercase tracking-wider font-medium text-muted-foreground", children: "Description" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { rows: 3, className: "dlg-input mt-1.5", value: form.description, onChange: (e) => setForm({
        ...form,
        description: e.target.value
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
  Categories as component
};
