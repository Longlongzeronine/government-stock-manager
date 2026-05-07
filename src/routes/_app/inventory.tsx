import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plus, Search, Pencil, Trash2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportCSV, exportPDF, exportXLSX } from "@/lib/export";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({ meta: [{ title: "Inventory — GovInventory" }] }),
  component: Inventory,
});

function Inventory() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () =>
      (
        await supabase
          .from("items")
          .select("*, category:categories(id,name), supplier:suppliers(id,name)")
          .order("name")
      ).data ?? [],
  });
  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
  const { data: sups = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data ?? [],
  });

  const filtered = useMemo(() => {
    return items.filter((i: any) => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter && i.category_id !== catFilter) return false;
      return true;
    });
  }, [items, search, catFilter]);

  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  async function onDelete(id: string) {
    if (!confirm("Delete this item permanently?")) return;
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Item deleted");
    qc.invalidateQueries({ queryKey: ["items"] });
  }

  function exportRows() {
    return filtered.map((i: any) => ({
      Name: i.name,
      Description: i.description ?? "",
      Category: i.category?.name ?? "",
      Supplier: i.supplier?.name ?? "",
      Quantity: i.quantity,
      Unit: i.unit,
      ReorderLevel: i.reorder_level,
      Updated: format(new Date(i.updated_at), "yyyy-MM-dd"),
    }));
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} items on record`}
        actions={
          <>
            <ExportMenu rows={exportRows()} title="Inventory Report" />
            {isAdmin && (
              <button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Add item
              </button>
            )}
          </>
        }
      />
      <div className="p-6 lg:p-8 space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search items…"
              className="pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-card w-72"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 text-sm rounded-md border border-input bg-card"
          >
            <option value="">All categories</option>
            {cats.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>Item</Th>
                <Th>Category</Th>
                <Th>Supplier</Th>
                <Th className="text-right">Qty</Th>
                <Th>Unit</Th>
                <Th className="text-right">Reorder</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {paged.map((i: any) => (
                <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                  <Td>
                    <div className="font-medium">{i.name}</div>
                    {i.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {i.description}
                      </div>
                    )}
                  </Td>
                  <Td>{i.category?.name ?? "—"}</Td>
                  <Td>{i.supplier?.name ?? "—"}</Td>
                  <Td className="text-right tabular-nums font-medium">{i.quantity}</Td>
                  <Td>{i.unit}</Td>
                  <Td className="text-right tabular-nums">{i.reorder_level}</Td>
                  <Td>
                    <StatusBadge quantity={i.quantity} reorder={i.reorder_level} />
                  </Td>
                  <Td className="text-right">
                    {isAdmin && (
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => {
                            setEditing(i);
                            setOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-accent"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(i.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-sm text-muted-foreground">
                    No items match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded border border-input bg-card disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border border-input bg-card disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {open && (
        <ItemDialog
          editing={editing}
          cats={cats}
          sups={sups}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["items"] });
          }}
        />
      )}
    </div>
  );
}

function Th({ children, className = "" }: any) {
  return <th className={`text-left font-medium px-4 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: any) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function ItemDialog({ editing, cats, sups, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    category_id: editing?.category_id ?? "",
    supplier_id: editing?.supplier_id ?? "",
    quantity: editing?.quantity ?? 0,
    unit: editing?.unit ?? "pcs",
    reorder_level: editing?.reorder_level ?? 10,
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      quantity: Number(form.quantity),
      reorder_level: Number(form.reorder_level),
    };
    const { error } = editing
      ? await supabase.from("items").update(payload).eq("id", editing.id)
      : await supabase.from("items").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Item updated" : "Item created");
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <form
        onSubmit={save}
        className="bg-card border border-border rounded-lg w-full max-w-xl p-6 space-y-4"
      >
        <h2 className="text-xl">{editing ? "Edit item" : "Add new item"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" full>
            <input
              className="dlg-input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Description" full>
            <textarea
              rows={2}
              className="dlg-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <select
              className="dlg-input"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">—</option>
              {cats.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Supplier">
            <select
              className="dlg-input"
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            >
              <option value="">—</option>
              {sups.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <input
              type="number"
              min={0}
              className="dlg-input"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value as any })}
            />
          </Field>
          <Field label="Unit">
            <input
              className="dlg-input"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </Field>
          <Field label="Reorder level">
            <input
              type="number"
              min={0}
              className="dlg-input"
              value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value as any })}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-input text-sm"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <style>{`.dlg-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.5rem .7rem;font-size:.875rem;outline:none}.dlg-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}`}</style>
      </form>
    </div>
  );
}

function Field({ label, children, full }: any) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ExportMenu({ rows, title }: { rows: any[]; title: string }) {
  const [open, setOpen] = useState(false);
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-accent"
      >
        <Download className="h-4 w-4" /> Export
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-md shadow-lg z-10 overflow-hidden">
          <button
            onClick={() => {
              exportCSV(rows, title);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={() => {
              exportXLSX(rows, title);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel (XLSX)
          </button>
          <button
            onClick={() => {
              exportPDF(
                title,
                cols,
                rows.map((r) => cols.map((c) => r[c])),
                title,
              );
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
          >
            <FileText className="h-4 w-4" /> PDF
          </button>
        </div>
      )}
    </div>
  );
}
