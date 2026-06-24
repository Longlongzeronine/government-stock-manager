import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MobileCard, MobileCardRow } from "@/components/common/MobileCard";
import { Plus, Search, Pencil, Trash2, Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { exportCSV, exportPDF, exportXLSX } from "@/lib/export";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Supplify" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    add: search.add === "1" || search.add === 1 || search.add === true,
  }),
  component: Inventory,
});

function Inventory() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 15;
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!searchParams.add || !isAdmin) return;
    setEditing(null);
    setOpen(true);
    navigate({ to: "/inventory", search: {} });
  }, [isAdmin, navigate, searchParams.add]);

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
      if (typeFilter && i.item_type !== typeFilter) return false;
      return true;
    });
  }, [items, search, catFilter, typeFilter]);

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
      Type: i.item_type === "material" ? "Material" : "Supply",
      Quantity: i.quantity,
      Unit: i.unit,
      UnitValue: Number(i.unit_value ?? 0),
      TotalCost: totalCost(i),
      StockNumber: i.stock_number ?? "",
      PropertyNumber: i.property_number ?? "",
      FundCluster: i.fund_cluster ?? "",
      ReorderLevel: i.reorder_level,
      Updated: i.updated_at ? format(new Date(i.updated_at), "yyyy-MM-dd") : "",
    }));
  }

  const isMobileView = useIsMobile();

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
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Type filter chips */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5 border border-border">
            {[
              { label: "All", value: "" },
              { label: "Supplies", value: "supply" },
              { label: "Materials", value: "material" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => { setTypeFilter(t.value); setPage(0); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  typeFilter === t.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search items…"
              className="pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-card w-full sm:w-64"
            />
          </div>
          {/* Category filter */}
          <select
            value={catFilter}
            onChange={(e) => { setCatFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 text-sm rounded-md border border-input bg-card w-full sm:w-auto"
          >
            <option value="">All categories</option>
            {cats.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Pagination (top) */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded border border-input bg-card disabled:opacity-50">Previous</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded border border-input bg-card disabled:opacity-50">Next</button>
          </div>
        </div>

        {/* Desktop Table View */}
        {!isMobileView && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th>Item</Th>
                  <Th>Category</Th>
                  <Th>Supplier</Th>
                  <Th>Type</Th>
                  <Th>Stock/Property No.</Th>
                  <Th className="text-right">Qty</Th>
                  <Th>Unit</Th>
                  <Th className="text-right">Unit Value</Th>
                  <Th className="text-right">Total Cost</Th>
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
                      {i.description && <div className="text-xs text-muted-foreground line-clamp-1">{i.description}</div>}
                    </Td>
                    <Td>{i.category?.name ?? "—"}</Td>
                    <Td>{i.supplier?.name ?? "—"}</Td>
                    <Td>
                      <TypeBadge itemType={i.item_type} />
                    </Td>
                    <Td>{i.stock_number || i.property_number || "—"}</Td>
                    <Td className="text-right tabular-nums font-medium">{i.quantity}</Td>
                    <Td>{i.unit}</Td>
                    <Td className="text-right tabular-nums">{money(i.unit_value)}</Td>
                    <Td className="text-right tabular-nums">{money(totalCost(i))}</Td>
                    <Td className="text-right tabular-nums">{i.reorder_level}</Td>
                    <Td>
                      <StatusBadge quantity={i.quantity} reorder={i.reorder_level} />
                    </Td>
                    <Td className="text-right">
                      {isAdmin && (
                        <div className="inline-flex gap-1">
                          <button onClick={() => { setEditing(i); setOpen(true); }} className="p-1.5 rounded hover:bg-accent" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => onDelete(i.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={12} className="p-12 text-center text-sm text-muted-foreground">
                      No items match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Card View */}
        {isMobileView && (
          <div className="space-y-3">
            {paged.map((i: any) => (
              <MobileCard key={i.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base">{i.name}</div>
                    {i.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{i.description}</div>}
                  </div>
                  <StatusBadge quantity={i.quantity} reorder={i.reorder_level} />
                </div>
                <div className="border-t border-border pt-2 space-y-2">
                  <MobileCardRow label="Category" value={i.category?.name ?? "—"} />
                  <MobileCardRow label="Supplier" value={i.supplier?.name ?? "—"} />
                  <MobileCardRow label="Type" value={<TypeBadge itemType={i.item_type} />} />
                  <MobileCardRow label="Stock/Property No." value={i.stock_number || i.property_number || "—"} />
                  <div className="grid grid-cols-2 gap-2">
                    <MobileCardRow label="Qty" value={`${i.quantity} ${i.unit}`} />
                    <MobileCardRow label="Unit Value" value={money(i.unit_value)} align="right" />
                    <MobileCardRow label="Total Cost" value={money(totalCost(i))} />
                    <MobileCardRow label="Reorder" value={i.reorder_level} align="right" />
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button onClick={() => { setEditing(i); setOpen(true); }} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md border border-input hover:bg-accent">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => onDelete(i.id)} className="px-3 py-2 text-sm rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </MobileCard>
            ))}
            {paged.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg">
                No items match your filters.
              </div>
            )}
          </div>
        )}

      </div>

      {open && (
        <ItemDialog
          editing={editing}
          cats={cats}
          sups={sups}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["items"] }); }}
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

function TypeBadge({ itemType }: { itemType: string }) {
  const isMaterial = itemType === "material";
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
      isMaterial
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
    }`}>
      {isMaterial ? "Material" : "Supply"}
    </span>
  );
}

function money(value: any) {
  return Number(value ?? 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });
}

function totalCost(item: any) {
  return Number(item.total_cost ?? Number(item.quantity ?? 0) * Number(item.unit_value ?? 0));
}

function ItemDialog({ editing, cats, sups, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    category_id: editing?.category_id ?? "",
    supplier_id: editing?.supplier_id ?? "",
    item_type: editing?.item_type ?? "supply",
    quantity: editing?.quantity ?? 0,
    unit: editing?.unit ?? "pcs",
    unit_value: editing?.unit_value ?? 0,
    stock_number: editing?.stock_number ?? "",
    property_number: editing?.property_number ?? "",
    fund_cluster: editing?.fund_cluster ?? "06",
    uacs_object_code: editing?.uacs_object_code ?? "",
    estimated_useful_life: editing?.estimated_useful_life ?? "",
    accountable_officer: editing?.accountable_officer ?? "",
    office: editing?.office ?? "",
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
      unit_value: Number(form.unit_value),
      stock_number: form.stock_number || null,
      property_number: form.property_number || null,
      fund_cluster: form.fund_cluster || "06",
      uacs_object_code: form.uacs_object_code || null,
      estimated_useful_life: form.estimated_useful_life || null,
      accountable_officer: form.accountable_officer || null,
      office: form.office || null,
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
      <form onSubmit={save} className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-xl">{editing ? "Edit item" : "Add new item"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" full>
            <input className="dlg-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Description" full>
            <textarea rows={2} className="dlg-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Category">
            <select className="dlg-input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">—</option>
              {cats.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </Field>
          <Field label="Type">
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="item_type" value="supply" checked={form.item_type === "supply"} onChange={() => setForm({ ...form, item_type: "supply" })} />
                <span className="text-sm">Supply</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="item_type" value="material" checked={form.item_type === "material"} onChange={() => setForm({ ...form, item_type: "material" })} />
                <span className="text-sm">Material</span>
              </label>
            </div>
          </Field>
          <Field label="Supplier">
            <select className="dlg-input" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">—</option>
              {sups.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </Field>
          <Field label="Quantity">
            <input type="number" min={0} className="dlg-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value as any })} />
          </Field>
          <Field label="Unit Value">
            <input type="number" min={0} step="0.01" className="dlg-input" value={form.unit_value} onChange={(e) => setForm({ ...form, unit_value: e.target.value as any })} />
          </Field>
          <Field label="Unit">
            <input className="dlg-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
          <Field label="Reorder level">
            <input type="number" min={0} className="dlg-input" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value as any })} />
          </Field>
          <Field label="Stock No.">
            <input className="dlg-input" value={form.stock_number} onChange={(e) => setForm({ ...form, stock_number: e.target.value })} />
          </Field>
          <Field label="Semi-Expendable Property No.">
            <input className="dlg-input" value={form.property_number} onChange={(e) => setForm({ ...form, property_number: e.target.value })} />
          </Field>
          <Field label="Fund Cluster">
            <input className="dlg-input" value={form.fund_cluster} onChange={(e) => setForm({ ...form, fund_cluster: e.target.value })} />
          </Field>
          <Field label="UACS Object Code">
            <input className="dlg-input" value={form.uacs_object_code} onChange={(e) => setForm({ ...form, uacs_object_code: e.target.value })} />
          </Field>
          <Field label="Estimated Useful Life">
            <input className="dlg-input" value={form.estimated_useful_life} onChange={(e) => setForm({ ...form, estimated_useful_life: e.target.value })} />
          </Field>
          <Field label="Accountable Officer">
            <input className="dlg-input" value={form.accountable_officer} onChange={(e) => setForm({ ...form, accountable_officer: e.target.value })} />
          </Field>
          <Field label="Office/Station" full>
            <input className="dlg-input" value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-input text-sm">Cancel</button>
          <button disabled={saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
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
      <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function ExportMenu({ rows, title }: { rows: any[]; title: string }) {
  const [open, setOpen] = useState(false);
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-accent">
        <Download className="h-4 w-4" /> Export
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-md shadow-lg z-10 overflow-hidden">
          <button onClick={() => { exportCSV(rows, title); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2">
            <FileText className="h-4 w-4" /> CSV
          </button>
          <button onClick={() => { exportXLSX(rows, title); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel (XLSX)
          </button>
          <button onClick={() => { exportPDF(title, cols, rows.map((r: any) => cols.map((c: any) => r[c])), title); setOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2">
            <FileText className="h-4 w-4" /> PDF
          </button>
        </div>
      )}
    </div>
  );
}
