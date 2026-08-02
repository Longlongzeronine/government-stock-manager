import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { listItems, listCategories, listSuppliers, createItem, updateItem, updateItemMonthlyQuantity, deleteItem, importItems, createCategory } from "@/lib/data.functions";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MobileCard, MobileCardRow } from "@/components/common/MobileCard";
import { Plus, Search, Pencil, Trash2, Download, FileText, FileSpreadsheet, Clipboard, Printer, Loader2, LayoutGrid, Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { exportCSV, exportPDF, exportXLSX, exportAppCseXlsx } from "@/lib/export";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import QRCode from "qrcode";

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
    navigate({ to: "/inventory", search: {} as { add: boolean } });
  }, [isAdmin, navigate, searchParams.add]);

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => listItems(),
    refetchInterval: 3000,
  });
  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
    refetchInterval: 3000,
  });
  const { data: sups = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => listSuppliers(),
    refetchInterval: 3000,
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
    try {
      await deleteItem({ data: { id } });
      toast.success("Item deleted");
      qc.invalidateQueries({ queryKey: ["items"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  }

  function exportRows() {
    return filtered.map((i: any) => ({
      Name: i.name,
      Description: i.description ?? "",
      Category: i.category?.name ?? "",
      Supplier: i.supplier?.name ?? "",
      Type: i.item_type === "material" ? "Material" : "Supply",
      Classification: classificationLabel(i),
      AcquisitionCost: i.acquisition_cost ?? 0,
      Quantity: i.quantity,
      Unit: i.unit,
      ReorderLevel: i.reorder_level,
      Updated: i.updated_at ? format(new Date(i.updated_at), "yyyy-MM-dd") : "",
    }));
  }

  const isMobileView = useIsMobile();

  return (
    <>
      <SpreadsheetInventory
        items={items}
        cats={cats}
        sups={sups}
        canEdit={isAdmin}
        onItemsChanged={() => qc.invalidateQueries({ queryKey: ["items"] })}
        onCategoryCreated={() => qc.invalidateQueries({ queryKey: ["categories"] })}
      />
      {open && (
        <ItemDialog
          editing={editing}
          cats={cats}
          sups={sups}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["items"] }); }}
          onCategoryCreated={() => qc.invalidateQueries({ queryKey: ["categories"] })}
        />
      )}
      {false && <div>
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
                  <Th>Classification</Th>
                  <Th className="text-right">Cost</Th>
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
                      {i.description && <div className="text-xs text-muted-foreground line-clamp-1">{i.description}</div>}
                    </Td>
                    <Td>{i.category?.name ?? "—"}</Td>
                    <Td>{i.supplier?.name ?? "—"}</Td>
                    <Td>
                      <TypeBadge itemType={i.item_type} />
                    </Td>
                    <Td>
                      <ClassificationBadge item={i} />
                    </Td>
                    <Td className="text-right tabular-nums">{money(Number(i.acquisition_cost || 0))}</Td>
                    <Td className="text-right tabular-nums font-medium">{i.quantity}</Td>
                    <Td>{i.unit}</Td>
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
                    <td colSpan={11} className="p-12 text-center text-sm text-muted-foreground">
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
                  <MobileCardRow label="Classification" value={<ClassificationBadge item={i} />} />
                  <MobileCardRow label="Acquisition Cost" value={money(Number(i.acquisition_cost || 0))} />
                  <div className="grid grid-cols-2 gap-2">
                    <MobileCardRow label="Qty" value={`${i.quantity} ${i.unit}`} />
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

      {false && open && (
        <ItemDialog
          editing={editing}
          cats={cats}
          sups={sups}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["items"] }); }}
        />
      )}
      </div>}
    </>
  );
}

// Part I = items with PS-DBM barcode codes (imported from APP-CSE XLSX template)
// Part II = items without barcode codes (manually added or custom items)
// Items created within this window (24h) get a visible NEW badge so newly added/imported items are easy to spot.
const NEW_ITEM_WINDOW_MS = 24 * 60 * 60 * 1000;

function SpreadsheetInventory({ items, cats, sups, canEdit, onItemsChanged, onCategoryCreated }: any) {
  const headings = ["Jan", "Feb", "Mar", "Q1", "Q1\nAMOUNT", "April", "May", "June", "Q2", "Q2\nAMOUNT", "July", "Aug", "Sept", "Q3", "Q3\nAMOUNT", "Oct", "Nov", "Dec", "Q4", "Q4\nAMOUNT"];
  const peso = (value: number) => value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cells = (months: readonly number[], price: number) => [0, 3, 6, 9].flatMap((start) => {
    const quarter = months.slice(start, start + 3);
    const quantity = quarter.reduce((sum, value) => sum + value, 0);
    return [...quarter, quantity, peso(quantity * price)];
  });
  const [monthlyPlan, setMonthlyPlan] = useState<Record<string, number[]>>({});
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [qrItem, setQrItem] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [compactSearch, setCompactSearch] = useState("");
  // NEW badges disappear once the user has seen them — persist seen item ids locally.
  const [seenNewIds, setSeenNewIds] = useState<Set<string>>(() => {
    try { return typeof window !== "undefined" ? new Set(JSON.parse(window.localStorage.getItem("app-cse-seen-new-items") || "[]")) : new Set(); } catch { return new Set(); }
  });
  const newSeenTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importInput = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [layout, setLayout] = useState<"template" | "compact">(() => {
    try { return (typeof window !== "undefined" && window.localStorage.getItem("app-cse-layout") === "compact") ? "compact" : "template"; } catch { return "template"; }
  });
  const [layoutOpen, setLayoutOpen] = useState(false);
  const layoutWrapRef = useRef<HTMLDivElement | null>(null);
  const chooseLayout = (next: "template" | "compact") => {
    setLayout(next);
    setLayoutOpen(false);
    try { window.localStorage.setItem("app-cse-layout", next); } catch {}
  };
  // Close the layout dropdown on outside click or Escape — no full-screen backdrop needed.
  useEffect(() => {
    if (!layoutOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (layoutWrapRef.current && !layoutWrapRef.current.contains(target)) setLayoutOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLayoutOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [layoutOpen]);
  const monthsFor = (item: any) => monthlyPlan[item.id] || ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map((month, index) => Number(item[`${month}_quantity`] ?? (index === 0 ? item.quantity : 0)) || 0);
  const isNewItem = (item: any) => !!item?.created_at && !seenNewIds.has(item.id) && Date.now() - new Date(item.created_at).getTime() < NEW_ITEM_WINDOW_MS;
  // Part I = items with barcode_value (PS-DBM catalog items from XLSX import)
  const part1Items = (items as any[]).filter((item: any) => item.barcode_value);
  // Part II = items without barcode_value (custom/manually added items)
  const part2Items = (items as any[]).filter((item: any) => !item.barcode_value);
  const part1Total = part1Items.reduce((sum: number, item: any) => sum + monthsFor(item).reduce((all, q) => all + q, 0) * Number(item.acquisition_cost || 0), 0);
  const planGroups = part1Items.reduce<Record<string, any[]>>((groups, item: any) => {
    const cat = item.category?.name || "PS-DBM SUPPLIES";
    (groups[cat] ||= []).push(item);
    return groups;
  }, {});
  const part2Total = part2Items.reduce((sum: number, item: any) => sum + monthsFor(item).reduce((all, quantity) => all + quantity, 0) * Number(item.acquisition_cost || 0), 0);
  const itemGroups = part2Items.reduce<Record<string, any[]>>((groups, item: any) => {
    const cat = item.category?.name || (item.item_type === "material" ? "MATERIALS" : "SUPPLIES");
    (groups[cat] ||= []).push(item);
    return groups;
  }, {});
  // ── Compact view: search + CRUD. Filtering only affects the compact layout; the official template stays full. ──
  const compactQuery = compactSearch.trim().toLowerCase();
  const compactMatches = (item: any) => !compactQuery || [item.name, item.description, item.barcode_value, item.qr_code_value, item.category?.name].some((value) => String(value || "").toLowerCase().includes(compactQuery));
  const compactPart1 = part1Items.filter(compactMatches);
  const compactPart2 = part2Items.filter(compactMatches);
  const compactGroups = compactPart1.reduce<Record<string, any[]>>((groups, item: any) => {
    const cat = item.category?.name || "PS-DBM SUPPLIES";
    (groups[cat] ||= []).push(item);
    return groups;
  }, {});
  const compactItemGroups = compactPart2.reduce<Record<string, any[]>>((groups, item: any) => {
    const cat = item.category?.name || (item.item_type === "material" ? "MATERIALS" : "SUPPLIES");
    (groups[cat] ||= []).push(item);
    return groups;
  }, {});
  const compactPart1Total = compactPart1.reduce((sum: number, item: any) => sum + monthsFor(item).reduce((all, q) => all + q, 0) * Number(item.acquisition_cost || 0), 0);
  const compactPart2Total = compactPart2.reduce((sum: number, item: any) => sum + monthsFor(item).reduce((all, q) => all + q, 0) * Number(item.acquisition_cost || 0), 0);
  const deleteSingleItem = async (item: any) => {
    if (!confirm(`Permanently delete "${item.name}" from the plan? This cannot be undone.`)) return;
    try {
      await deleteItem({ data: { id: item.id } });
      onItemsChanged();
      setSelected((current) => { const next = new Set(current); next.delete(item.id); return next; });
      toast.success("Item deleted");
    } catch (error: any) {
      toast.error(error?.message ?? "Delete failed");
    }
  };
  const part1Inflation = part1Total * 0.1;
  const part1GrandTotal = part1Total + part1Inflation;
  const part2Inflation = part2Total * 0.1;
  const part2GrandTotal = part2Total + part2Inflation;
  const qrValue = qrItem ? qrItem.qr_code_value || qrItem.barcode_value || qrItem.id : "";
  const [fields, setFields] = useState<Record<string, string>>(() => ({ ...APP_CSE_DEFAULT_FIELDS }));
  const [history, setHistory] = useState<Record<string, string[]>>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("app-cse-document-fields") || "{}");
      setFields((current) => {
        // Fill the Date Prepared field with today's date (e.g. 8-2-2026) if not set.
        const d = new Date();
        const today = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
        return { ...current, ...saved, preparedDate: saved.preparedDate || current.preparedDate || today };
      });
      setHistory(JSON.parse(localStorage.getItem("app-cse-document-history") || "{}"));
    } catch {}
  }, []);

  // Once a NEW badge has been visible for a moment, mark the item as seen so the badge disappears for good.
  useEffect(() => {
    const freshIds = (items as any[]).filter((item: any) => item?.id && !!item?.created_at && !seenNewIds.has(item.id) && Date.now() - new Date(item.created_at).getTime() < NEW_ITEM_WINDOW_MS && !newSeenTimersRef.current.has(item.id)).map((item: any) => item.id);
    if (!freshIds.length) return;
    freshIds.forEach((id: string) => {
      const timer = setTimeout(() => {
        newSeenTimersRef.current.delete(id);
        setSeenNewIds((current) => (current.has(id) ? current : new Set(current).add(id)));
      }, 4000);
      newSeenTimersRef.current.set(id, timer);
    });
  }, [items, seenNewIds]);

  // Persist seen item ids so the badge stays gone on future visits.
  useEffect(() => {
    try { localStorage.setItem("app-cse-seen-new-items", JSON.stringify([...seenNewIds])); } catch {}
  }, [seenNewIds]);

  // Clear pending timers on unmount.
  useEffect(() => () => {
    newSeenTimersRef.current.forEach((timer) => clearTimeout(timer));
    newSeenTimersRef.current.clear();
  }, []);

  const updateField = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const remember = (key: string) => {
    const value = fields[key]?.trim();
    const next = value ? { ...history, [key]: Array.from(new Set([value, ...(history[key] || [])])).slice(0, 20) } : history;
    localStorage.setItem("app-cse-document-fields", JSON.stringify(fields));
    localStorage.setItem("app-cse-document-history", JSON.stringify(next));
    setHistory(next);
  };
  const field = (key: string, label: string, className = "") => (
    <label className={className}>{label}<input list={`app-cse-history-${key}`} value={fields[key] || ""} onChange={(event) => updateField(key, event.target.value)} onBlur={() => remember(key)} /><datalist id={`app-cse-history-${key}`}>{(history[key] || []).map((value) => <option key={value} value={value} />)}</datalist></label>
  );
  const saveMonthlyPlan = async (id: string, index: number, value: string) => {
    const item = items.find((entry: any) => entry.id === id);
    const current = monthlyPlan[id] || (item ? monthsFor(item) : Array(12).fill(0));
    const next = { ...monthlyPlan, [id]: current.map((month, monthIndex) => monthIndex === index ? Math.max(0, Number(value) || 0) : month) };
    setMonthlyPlan(next);
    try {
      await updateItemMonthlyQuantity({ data: { id, month: index, quantity: next[id][index] } });
      onItemsChanged();
    } catch (error: any) {
      toast.error(error?.message ?? "Monthly quantity update failed");
    }
  };
  const saveItem = async (item: any, changes: Record<string, unknown>) => {
    try {
      await updateItem({ data: { ...item, ...changes } });
      onItemsChanged();
    } catch (error: any) {
      toast.error(error?.message ?? "Item update failed");
    }
  };
  const toggleSelected = (id: string) => setSelected((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const startLongPress = (id: string) => {
    if (!canEdit) return;
    pressTimer.current = setTimeout(() => toggleSelected(id), 550);
  };
  const cancelLongPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const deleteSelected = async () => {
    if (!selected.size || !confirm(`Permanently delete ${selected.size} inventory item(s)? This cannot be undone.`)) return;
    try {
      await Promise.all([...selected].map((id) => deleteItem({ data: { id } })));
      setSelected(new Set());
      onItemsChanged();
      toast.success("Selected inventory items deleted");
    } catch (error: any) {
      toast.error(error?.message ?? "Bulk delete failed");
    }
  };
  const importXlsx = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
      const toNumber = (value: unknown) => {
        if (typeof value === "number") return value || 0;
        const s = String(value ?? "").replace(/[^\d.,-]/g, "").replace(/,/g, "");
        return Number(s) || 0;
      };
      const toStr = (v: unknown) => String(v ?? "").trim();
      // ── Step 1: Find the sub-header row that contains month names ──
      const MONTH_PATTERNS = [/^jan/i, /^feb/i, /^mar/i, /^apr/i, /^may/i, /^jun/i, /^jul/i, /^aug/i, /^sep/i, /^oct/i, /^nov/i, /^dec/i, /^january/i, /^february/i, /^march/i, /^april/i, /^june/i, /^july/i, /^august/i, /^september/i, /^october/i, /^november/i, /^december/i];
      const monthColNames = ["jan_quantity", "feb_quantity", "mar_quantity", "apr_quantity", "may_quantity", "jun_quantity", "jul_quantity", "aug_quantity", "sep_quantity", "oct_quantity", "nov_quantity", "dec_quantity"];
      let subHeaderRow = -1;
      const monthIndices: number[] = [];
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const found: number[] = [];
        for (let c = 0; c < row.length; c++) {
          const cell = toStr(row[c]);
          if (MONTH_PATTERNS.some((p) => p.test(cell))) {
            found.push(c);
          }
        }
        if (found.length >= 6) { // At least 6 month names found
          subHeaderRow = r;
          // Map each month to its column index
          // Map month columns - use simple substring matching for full names like "April", "May", "June"
          const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
          for (let c = 0; c < row.length; c++) {
            const cell = toStr(row[c]).toLowerCase().trim();
            // Try exact match first
            const exactIdx = monthNames.findIndex((m) => cell === m);
            if (exactIdx >= 0) { monthIndices[exactIdx] = c; continue; }
            // Try full name match: "january" -> 0, "february" -> 1, etc.
            const fullIdx = monthNames.findIndex((m) => cell.startsWith(m));
            if (fullIdx >= 0) { monthIndices[fullIdx] = c; continue; }
          }
          break;
        }
      }
      if (subHeaderRow < 0) throw new Error("Could not find monthly columns (Jan–Dec) in the XLSX. Make sure you are importing the APP-CSE Template 2026.");
      // ── Step 2: Find the main header row (row before sub-header with "item" / "unit") ──
      let headerRow = -1;
      for (let r = subHeaderRow - 1; r >= Math.max(0, subHeaderRow - 5); r--) {
        const row = rows[r];
        const text = row.map(toStr).join(" ").toLowerCase();
        if (/item|specification|description/.test(text) && /unit/.test(text)) {
          headerRow = r;
          break;
        }
      }
      // ── Step 3: Determine fixed column positions from the SUB-HEADER row ──
      // APP-CSE Template sub-header: Col 0=#, Col 1=Code, Col 2=Item Name, Col 3=Unit, then months
      // IMPORTANT: Use sub-header row, NOT the main header (which has "Item & Specifications" merged across cols 0-2)
      const subHdrCells = rows[subHeaderRow].map(toStr);

      // Find code column: search for "code" or "barcode" in sub-header, else default to col 1
      let codeCol = 1;
      for (let c = 0; c < subHdrCells.length; c++) {
        if (/code|barcode|sku|ps-dbm|psdbm/i.test(subHdrCells[c])) { codeCol = c; break; }
      }
      // Find name column: search for "item" or "description" or "specification" in sub-header, else default to col 2
      let nameCol = 2;
      for (let c = 0; c < subHdrCells.length; c++) {
        if (/item|description|product|name|specification/i.test(subHdrCells[c])) { nameCol = c; break; }
      }
      // Find unit column: search for "unit" in sub-header, else default to col 3
      let unitCol = 3;
      for (let c = 0; c < subHdrCells.length; c++) {
        if (/^unit/i.test(subHdrCells[c])) { unitCol = c; break; }
      }
      // Find price column: search for "unit price" or "cost" in the MAIN header row
      // ("Unit Price as of May 14, 2025" lives in the main header, not the sub-header)
      let priceCol = -1;
      const mainHdrCells = headerRow >= 0 ? rows[headerRow].map(toStr) : subHdrCells;
      for (let c = 0; c < mainHdrCells.length; c++) {
        if (/unit\s*price|acquisition.*cost|^cost$/i.test(mainHdrCells[c])) { priceCol = c; break; }
      }
      // ── Step 4: Detect category / section header rows ──
      const isCategoryRow = (row: any[]): string | null => {
        // Deduplicate — merged cells may fill the same value across all columns
        const uniqueValues = Array.from(new Set(row.map((cell) => toStr(cell)).filter(Boolean)));
        // Category rows typically have 1-2 unique values (category name + maybe a number)
        if (uniqueValues.length === 0 || uniqueValues.length > 3) return null;
        const fullText = row.map(toStr).join(" ");
        // Check if the row contains a PART I / PART II header
        if (/part\s+[ivx]/i.test(fullText)) return null;
        // Check for section names — allow parentheses, quotes, commas, periods
        const text = uniqueValues.find((cell) => {
          const s = toStr(cell);
          // Must be at least 4 chars (allows short section headers like "FILMS")
          if (s.length < 4) return false;
          // Skip if it looks like a product row (has a product code)
          if (/^[A-Z0-9]{2,15}[-][A-Z0-9]{2,10}/.test(s)) return false;
          // Skip if it's just a number or short code
          if (/^\d+$/.test(s)) return false;
          // Skip if it looks like a summary/total row
          if (/^(a\.\s+total|b\.\s+additional|c\.\s+additional|d\.\s+grand|e\.\s+approved|total|grand\s+total|we\s+hereby|consistent\s+with)/i.test(s)) return false;
          // Skip rows that are just form field labels
          if (/^(date\s+prepared|department|bureau|office\s*:|region|organization|contact|position|address|e-?mail|telephone|mobile\s+nos|agency|fund|prepared\s+by|supply\s+officer|accountant|funds\s+available)/i.test(s)) return false;
          // Allow all-caps section names with punctuation
          if (/^[A-Z][A-Z\s,&\-\(\)\"\.\/]+$/.test(s)) return true;
          // Allow mixed-case section names like "Software (Note:"
          if (/^[A-Z][A-Za-z\s,\-]+(\([^)]*\))?\s*(Note:)?/i.test(s) && !/^[a-z]/.test(s)) return true;
          return false;
        });
        if (!text) return null;
        const cleaned = toStr(text).replace(/\(Note:[^)]*\)/gi, "").trim();
        return cleaned || null;
      };
      // ── Step 5: Known form-field / non-product patterns to skip ──
      const SKIP_NAMES = /^(date\s+prepared|department|bureau|office\s*:|region|organization|contact|position|address|e-?mail|telephone|mobile\s+nos|agency|fund|prepared\s+by|approved|supply\s+officer|accountant|property|total\s+amount|grand\s+total|a\.\s+total|b\.\s+additional|c\.\s+additional|d\.\s+grand|e\.\s+approved|we\s+hereby|part\s+[ivx]|monthly\s+quantity|unit\s+of\s+measure|unit\s+price|for\s+the\s+year|as\s+of|item\s*&|introduction|reminder|note:|annual\s+procurement|common-use|ps-dbm|head\s+of|prepared,|certified,|consistent\s+with|please\s+refer|please\s+indicate|note\s*\:|in\s+figures)/i;
      const isUuid = (c: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c);
      const isDateSerial = (c: string) => /^\d{4,6}$/.test(c) && Number(c) > 30000 && Number(c) < 60000;
      // ── Step 6: Parse data rows ──
      let currentCategory = "";
      let inPart2 = false; // track whether we're in PART II section
      const imported: any[] = [];
      const startRow = subHeaderRow + 1;
      for (let r = startRow; r < rows.length; r++) {
        const row = rows[r];
        const fullText = row.map(toStr).join(" ");
        // Skip completely empty rows
        if (!fullText.trim()) continue;
        // Check for PART I / PART II section markers
        // IMPORTANT: Check PART II FIRST to avoid partial match
        // Use \b word boundary to avoid issues with merged cells or leading whitespace
        // \bPART\s+II\b matches PART II but NOT PART III (the \b after II prevents this)
        if (/\bPART\s+II\b/i.test(fullText)) {
          inPart2 = true;
          currentCategory = "PART II - OTHER ITEMS";
          continue;
        }
        if (/\bPART\s+I(?!I)/i.test(fullText)) {
          inPart2 = false;
          currentCategory = "";
          continue;
        }
        // Detect category/section header rows
        const cat = isCategoryRow(row);
        if (cat) { currentCategory = cat; continue; }
        // Read item fields by fixed column positions
        // ── Determine name, code, unit from detected columns ──
        let name = toStr(row[nameCol]);
        // Fallback: if name is just a number or short number, scan for a proper text name
        if (!name || /^\d+$/.test(name) || name.length < 2) {
          // Try columns that might have the item name (skip col 0=#, col 1=code, look at wider columns)
          for (let c = 0; c < Math.min(row.length, 10); c++) {
            const cell = toStr(row[c]);
            if (cell.length >= 4 && !/^\d+$/.test(cell) && !/^[A-Z0-9]{2,15}[-][A-Z0-9]{2,10}/.test(cell) && !SKIP_NAMES.test(cell)) {
              // Only if it's not already used as code or category
              if (c !== codeCol) { name = cell; break; }
            }
          }
        }
        const rawCode = toStr(row[codeCol]);
        const unit = toStr(row[unitCol]) || "pcs";
        // Skip non-product rows
        if (!name || name.length < 2) continue;
        // Excel date serials (e.g. 45891 in the "Date Prepared:" footer) are not items
        if (isDateSerial(name)) continue;
        if (SKIP_NAMES.test(name)) continue;
        // A code column holding a form label (e.g. "Date Prepared:") is a footer row, not an item
        if (SKIP_NAMES.test(rawCode)) continue;
        if (isUuid(rawCode) || isDateSerial(rawCode)) continue;
        // Detect and skip summary/calculation rows
        if (/^(A\.|B\.|C\.|D\.|E\.)\s+/i.test(name)) continue;
        if (/^(total|grand\s+total|approved\s+budget)/i.test(name)) continue;
        // Read monthly quantities from the detected month columns
        const monthly: Record<string, number> = {};
        for (let m = 0; m < 12; m++) {
          const colIdx = monthIndices[m];
          monthly[monthColNames[m]] = colIdx != null ? toNumber(row[colIdx]) : 0;
        }
        // Try to read unit price from the detected price column
        const price = priceCol >= 0 ? toNumber(row[priceCol]) : 0;
        // Compute total quantity from monthly values
        const totalQty = Object.values(monthly).reduce((s, v) => s + v, 0);
        // For Part II items, keep the code in description but NOT as barcode_value
        // so they display in Part II (custom items) rather than Part I (PS-DBM catalog)
        const hasValidCode = rawCode && !isUuid(rawCode) && !isDateSerial(rawCode);
        if (inPart2 && hasValidCode) {
          // Store template code as part of description for Part II items
          const desc = `[${rawCode}] ${name}`;
          const item = {
            name,
            barcode_value: null,
            description: desc,
            unit,
            quantity: totalQty,
            acquisition_cost: price,
            category_name: currentCategory || "OTHER ITEMS",
            ...monthly,
          };
          imported.push(item);
        } else {
          const item = {
            name,
            barcode_value: hasValidCode ? rawCode : null,
            unit,
            quantity: totalQty,
            acquisition_cost: price,
            category_name: currentCategory || (inPart2 ? "OTHER ITEMS" : "PS-DBM SUPPLIES"),
            ...monthly,
          };
          imported.push(item);
        }
      }
      if (!imported.length) throw new Error("No product rows found. Use a sheet with Item and Unit columns.");
      const part1Count = imported.filter((i) => i.barcode_value).length;
      const part2Count = imported.filter((i) => !i.barcode_value).length;
      console.log(`[APP-CSE Import] Parsed ${imported.length} items total: ${part1Count} Part I (${imported.filter((i) => i.barcode_value).length} with barcode), ${part2Count} Part II (${imported.filter((i) => !i.barcode_value).length} without barcode)`);
      const result = await importItems({ data: { items: imported } });
      onItemsChanged();
      toast.success(`Import complete: ${result.added} added, ${result.updated || 0} updated, ${result.skipped} skipped (${part1Count} Part I, ${part2Count} Part II)`);
    } catch (error: any) {
      toast.error(error?.message ?? "XLSX import failed");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const toolbar = (
    <div className="app-cse-import">
      <input ref={importInput} type="file" accept=".xlsx,.xls" onChange={importXlsx} />
      {canEdit && <button className="app-cse-add" onClick={() => setAddOpen(true)} title="Add a new item to the list"><Plus className="h-4 w-4" /> Add item</button>}
      <button disabled={importing} onClick={() => importInput.current?.click()} title="Import APP-CSE XLSX file"><Upload className="h-4 w-4" /> {importing ? "Importing…" : "Import XLSX"}</button>
      <button className="app-cse-export-xlsx" onClick={() => exportAppCseXlsx(items, monthlyPlan, fields)} title="Download APP-CSE 2026 as XLSX"><FileSpreadsheet className="h-4 w-4" /> Export XLSX</button>
      <div className="app-cse-layout-wrap" ref={layoutWrapRef}>
        <button className="app-cse-layout-btn" onClick={() => setLayoutOpen((open) => !open)} title="Choose form layout"><LayoutGrid className="h-4 w-4" /> Layout</button>
        {layoutOpen && (
          <div className="app-cse-layout-menu">
            <button type="button" className={layout === "template" ? "is-active" : ""} onClick={() => chooseLayout("template")}>
              <span className="app-cse-layout-preview preview-template" aria-hidden="true" />
              <span className="app-cse-layout-label"><strong>Official Template</strong><small>Full APP-CSE 2026 spreadsheet</small></span>
              {layout === "template" && <Check className="app-cse-layout-check" />}
            </button>
            <button type="button" className={layout === "compact" ? "is-active" : ""} onClick={() => chooseLayout("compact")}>
              <span className="app-cse-layout-preview preview-compact" aria-hidden="true" />
              <span className="app-cse-layout-label"><strong>Compact View</strong><small>Easier to navigate, same data</small></span>
              {layout === "compact" && <Check className="app-cse-layout-check" />}
            </button>
          </div>
        )}
      </div>
      <span>Existing name/code: skip. New product: add.</span>
    </div>
  );
  const bulkActions = canEdit && selected.size > 0 ? (
    <div className="app-cse-bulk-actions"><span><i />Selection mode · {selected.size} selected</span><button onClick={() => setSelected(new Set(compactPart1.concat(compactPart2).map((item: any) => item.id)))}>Select all</button><button onClick={() => setSelected(new Set())}>Clear</button><button className="danger" onClick={deleteSelected}>Delete selected</button></div>
  ) : null;
  const agencyFields = (
    <section className="app-cse-agency">
      {field("department", "Department/Bureau/Office:")}
      {field("agencyCode", "Agency Code/UACS:")}
      {field("contact", "Contact Person:")}
      {field("region", "Region:")}
      {field("organizationType", "Organization Type:")}
      {field("position", "Position:")}
      {field("address", "Address:")}
      {field("email", "E-mail:")}
      {field("telephone", "Telephone/Mobile Nos:")}
    </section>
  );
  const summarySection = (
    <section className="app-cse-summary">
      <h2>PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)</h2>
      <p>A. TOTAL <output>₱ {peso(part1Total)}</output></p>
      <p>B. ADDITIONAL PROVISION FOR INFLATION (10% of TOTAL) <output>₱ {peso(part1Inflation)}</output></p>
      <p>C. ADDITIONAL PROVISION FOR TRANSPORT AND FREIGHT COST (If Applicable) <output>₱ -</output></p>
      <p>D. GRAND TOTAL (A + B+ C) <output>₱ {peso(part1GrandTotal)}</output></p>
      <p className="app-cse-approved-budget">E. APPROVED BUDGET BY THE AGENCY HEAD<br /><small>In Figures and Words:</small></p>
      <h2>PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES</h2>
      <p className="app-cse-part2-note">Consistent with Section 4.4 of Circular Letter No. 2011-6 and 2011-6, all agencies and concerned units are enjoined to include in the APP-CSE all supplies, commodities or materials and equipment which are consumed and needed in their day-to-day operations. This shall be one of the bases for the PS-DBM in expanding the Electronic Catalogue to include other products commonly purchased by government entities.</p>
      <p>A. TOTAL <output>₱ {peso(part2Total)}</output></p>
      <p>B. ADDITIONAL PROVISION FOR INFLATION (10% of TOTAL) <output>₱ {peso(part2Inflation)}</output></p>
      <p>C. ADDITIONAL PROVISION FOR TRANSPORT AND FREIGHT COST (If Applicable) <output>₱ -</output></p>
      <p>D. GRAND TOTAL (A + B+ C) <output>₱ {peso(part2GrandTotal)}</output></p>
      <p className="app-cse-approved-budget">E. APPROVED BUDGET BY THE AGENCY HEAD<br /><small>In Figures and Words:</small></p>
    </section>
  );
  const certificationSection = (
    <section className="app-cse-certification">
      <p>We hereby warrant that the total amount reflected in this Annual Procurement Plan to procure the listed common-use supplies, materials, and equipment has been included in or is within our approved budget for the year.</p>
      <div>
        <article>
          <span>Prepared by:</span>
          {field("preparedBy", "", "app-cse-signature-input")}
          <em>Property/Supply Officer</em>
          <div className="app-cse-date-prepared">
            <span>Date Prepared:</span>
            {field("preparedDate", "", "app-cse-signature-input")}
          </div>
        </article>
        <article>
          <span>Certified Funds Available / Certified Appropriate Funds Available:</span>
          {field("certifiedBy", "", "app-cse-signature-input")}
          <em>Accountant / Budget Officer</em>
        </article>
        <article>
          <span>Approved by:</span>
          {field("approvedBy", "", "app-cse-signature-input")}
          <em>Head of Office/Agency</em>
        </article>
      </div>
    </section>
  );
  const compactCategory = (category: string, categoryItems: any[]) => (
    <details className="app-cse-compact-category" key={category} open>
      <summary>{category} <em>{categoryItems.length} item{categoryItems.length === 1 ? "" : "s"}</em></summary>
      <div className="app-cse-compact-table-wrap">
        <table className="app-cse-compact-table">
          <thead><tr><th>#</th><th>Code</th><th>Item &amp; Specifications</th><th>Unit</th><th>Monthly Quantity (Jan–Dec)</th><th>Total Qty</th><th>Unit Price</th><th>Total Amount</th>{canEdit && <th>Actions</th>}</tr></thead>
          <tbody>
            {categoryItems.map((item: any, catIndex: number) => {
              const months = monthsFor(item);
              const price = Number(item.acquisition_cost || 0);
              const totalQty = months.reduce((sum, q) => sum + q, 0);
              const code = item.barcode_value || item.qr_code_value || "";
              const qrValue = item.qr_code_value || item.barcode_value || item.id;
              return (
                <tr key={item.id || code} className={`${selected.has(item.id) ? "is-selected" : ""}`} onPointerDown={() => startLongPress(item.id)} onPointerUp={cancelLongPress} onPointerLeave={cancelLongPress} onPointerCancel={cancelLongPress}>
                  <td>{canEdit && selected.size > 0 ? <input className="app-cse-select-box" type="checkbox" checked={selected.has(item.id)} onPointerDown={(event) => event.stopPropagation()} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.name}`} /> : catIndex + 1}{selected.has(item.id) && <i className="app-cse-selected-dot" />}</td>
                  <td><input disabled={!canEdit} defaultValue={code} placeholder={item.category?.name || "Code"} onBlur={(event) => saveItem(item, { barcode_value: event.target.value })} /></td>
                  <td>
                    <span className="app-cse-product">
                      {isNewItem(item) && <i className="app-cse-new-badge" title="Added in the last 24 hours">New</i>}
                      <button type="button" className="app-cse-qr-button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setQrItem(item); }} aria-label={`View QR code for ${item.name}`}><img src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&format=svg&data=${encodeURIComponent(qrValue)}`} alt="" title={qrValue} loading="lazy" /></button>
                      <span><input disabled={!canEdit} defaultValue={item.name} onBlur={(event) => saveItem(item, { name: event.target.value })} /><small>{item.description || ""}</small></span>
                    </span>
                  </td>
                  <td><input disabled={!canEdit} defaultValue={item.unit} onBlur={(event) => saveItem(item, { unit: event.target.value })} /></td>
                  <td>
                    <div className="app-cse-compact-months">
                      {months.map((value, m) => (
                        <label key={m}><span>{"JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT,NOV,DEC".split(",")[m]}</span><input disabled={!canEdit} type="number" min="0" value={value} onChange={(event) => saveMonthlyPlan(item.id, m, event.target.value)} /></label>
                      ))}
                    </div>
                  </td>
                  <td>{totalQty}</td>
                  <td><input disabled={!canEdit} type="number" min="0" step=".01" defaultValue={price} onBlur={(event) => saveItem(item, { acquisition_cost: Number(event.target.value) || 0 })} /></td>
                  <td>{peso(totalQty * price)}</td>
                  {canEdit && (
                    <td className="app-cse-compact-actions-cell">
                      <span className="app-cse-compact-actions">
                        <button type="button" className="app-cse-action-btn" title="Edit item" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setEditItem(item); }}><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" className="app-cse-action-btn danger" title="Delete item" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); deleteSingleItem(item); }}><Trash2 className="h-3.5 w-3.5" /></button>
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );

  return (
    <main className="app-cse-shell">
      {layout === "template" && (
      <section className="app-cse-sheet app-cse-template">
        <header className="app-cse-template-header">
          <p>APP-CSE 2026 FORM</p>
          <h1>ANNUAL PROCUREMENT PLAN - COMMON-USE SUPPLIES AND EQUIPMENT (APP-CSE) 2026 FORM</h1>
        </header>
        <section className="app-cse-template-copy">
          <h2>Introduction</h2>
          <p>This form contains the common-use supplies and equipment (CSE) being carried by the Procurement Service – Department of Budget and Management (PS-DBM) that shall be purchased by government agencies. Consistent with the DBM Circular Letter Nos. 2011-6 and 2011-6-A dated 25 August 2011 and 28 September 2011, respectively, the APP-CSE shall serve as the agency’s annual procurement request for all its CSE requirements. Only agencies with uploaded APP-CSE in the Modernized Philippine Government Electronic Procurement System (mPhilGEPS) will be able to purchase CSE from the PS-DBM. Note that the items listed on this form have been arranged in accordance with the United Nations Standard Products and Services Code (UNSPSC).</p>
          <h2>Reminders</h2>
          <ol>
            <li>The APP-CSE form must be accomplished using Microsoft Excel format. The APP-CSE shall be deemed incorrect or invalid if the form used is other than the prescribed format which is downloadable from the mPhilGEPS and Downloads page of PS-DBM website (www.ps-philgeps.gov.ph).</li>
            <li>All information must be provided accurately.</li>
            <li>Kindly refer to the CSE catalogue on the PS-DBM website (www.ps-philgeps.gov.ph) under the “What We Sell” tab for the detailed technical specifications and sample photo of the items.</li>
            <li>Do not delete, add, or revise any items or rows on this form, otherwise the form will be deemed invalid.</li>
            <li>For items not included on the list of PART II, a separate form with the file name APP-CSE 2026 Form - Other Items, can be fill-out through this link: https://forms.gle/ygzEaiJRnWqmdkkF6</li>
            <li>Once signed and approved by the Property/Supply Officer, Accountant/Budget Officer, and Head of the Agency/Office, kindly upload the soft copy of the APP-CSE in Microsoft Excel format as well as the original signed copy in Portable Document Format (PDF) to the agency’s mPhilGEPS account on or before the prescribed period or deadline. Any APP-CSE form that is unsigned or has incomplete signature shall be deemed invalid.</li>
            <li>Should there be changes in the agency’s CSE requirements, the agency may edit their uploaded APP-CSE directly on their mPhilGEPS account. However, the agency must ensure that a signed and approved copy of the supplemental APP-CSE form is available. Note that all CSE requirements in excess of the quantities indicated in the original APP-CSE form will not be served if not covered by a supplemental APP-CSE.</li>
            <li>Please be advised that modifications to product codes may be implemented without prior notification. Should such changes occur, it will be necessary for agencies with CSE requirements to edit and submit a Supplemental APP-CSE on their mPhilGEPS account.</li>
            <li>For further assistance or clarification, agencies may contact the Marketing and Sales Division of PS-DBM through its mobile numbers 0918-2954426 (Smart) or 0962-8255199 (Smart), or email appcse.helpdesk@ps-philgeps.gov.ph, or visit the PS-DBM website (www.ps-philgeps.gov.ph) for the guide on how to fill-out the APP-CSE.</li>
          </ol>
          <strong>Note: The APP-CSE for FY 2026 must be submitted on or before 31 August 2025.</strong>
        </section>
        {agencyFields}
        {toolbar}
        {bulkActions}
        <div className="app-cse-table-wrap">
          <table className="app-cse-table">
            <colgroup>
              <col className="app-cse-col-number" /><col className="app-cse-col-code" /><col className="app-cse-col-specification" /><col className="app-cse-col-unit" />
              {headings.map((heading) => <col className="app-cse-col-month" key={heading} />)}
              <col className="app-cse-col-total-quantity" /><col className="app-cse-col-unit-price" /><col className="app-cse-col-total-amount" />
            </colgroup>
            <thead><tr><th rowSpan={2} colSpan={3} className="c-item">Item &amp; Specifications</th><th rowSpan={2} className="c-unit">Unit of{`\n`}Measure</th><th colSpan={20}>Monthly Quantity Requirement</th><th rowSpan={2}>Total Quantity{`\n`}for the year</th><th rowSpan={2}>Unit Price as of May 14, 2025</th><th rowSpan={2}>Total Amount{`\n`}for the year</th></tr><tr>{headings.map((heading) => <th className="c-number" key={heading}>{heading}</th>)}</tr></thead>
            <tbody>
              <tr className="app-cse-part"><td colSpan={27}>PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)</td></tr>
              {Object.entries(planGroups).flatMap(([category, categoryItems]) => [
                <tr className="app-cse-category" key={category}><td colSpan={27}>{category}</td></tr>,
                ...categoryItems.map((item: any, catIndex: number) => {
                  const months = monthsFor(item);
                  const price = Number(item.acquisition_cost || 0);
                  const totalQty = months.reduce((sum, q) => sum + q, 0);
                  const code = item.barcode_value || item.qr_code_value || "";
                  const qrValue = item.qr_code_value || item.barcode_value || item.id;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&format=svg&data=${encodeURIComponent(qrValue)}`;
                  return <tr className={`app-cse-item ${selected.has(item.id) ? "is-selected" : ""}`} key={item.id || code} onPointerDown={() => startLongPress(item.id)} onPointerUp={cancelLongPress} onPointerLeave={cancelLongPress} onPointerCancel={cancelLongPress}><td>{canEdit && selected.size > 0 ? <input className="app-cse-select-box" type="checkbox" checked={selected.has(item.id)} onPointerDown={(event) => event.stopPropagation()} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.name}`} /> : catIndex + 1}{selected.has(item.id) && <i className="app-cse-selected-dot" />}</td><td><input disabled={!canEdit} defaultValue={code} placeholder={item.category?.name || "Code"} onBlur={(event) => saveItem(item, { barcode_value: event.target.value })} /></td><td><span className="app-cse-product">{isNewItem(item) && <i className="app-cse-new-badge" title="Added in the last 24 hours">New</i>}<button type="button" className="app-cse-qr-button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setQrItem(item); }} aria-label={`View QR code for ${item.name}`}><img src={qrUrl} alt="" title={qrValue} loading="lazy" /></button><span><input disabled={!canEdit} defaultValue={item.name} onBlur={(event) => saveItem(item, { name: event.target.value })} /><small>{item.description || ""}</small></span></span></td><td><input disabled={!canEdit} defaultValue={item.unit} onBlur={(event) => saveItem(item, { unit: event.target.value })} /></td>{cells(months, price).map((value, cellIndex) => <td key={cellIndex}>{cellIndex % 5 < 3 ? <input disabled={!canEdit} type="number" min="0" value={value} onChange={(event) => saveMonthlyPlan(item.id, Math.floor(cellIndex / 5) * 3 + (cellIndex % 5), event.target.value)} /> : value}</td>)}<td>{totalQty}</td><td><input disabled={!canEdit} type="number" min="0" step=".01" defaultValue={price} onBlur={(event) => saveItem(item, { acquisition_cost: Number(event.target.value) || 0 })} /></td><td>{peso(totalQty * price)}</td></tr>;
                })
              ])}
              <tr className="app-cse-part"><td colSpan={27}>PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES</td></tr>
              {Object.entries(itemGroups).flatMap(([category, categoryItems]) => [
                <tr className="app-cse-category" key={category}><td colSpan={27}>{category}</td></tr>,
                ...categoryItems.map((item: any, catIndex: number) => {
                  const months = monthsFor(item);
                  const price = Number(item.acquisition_cost || 0);
                  const quantity = months.reduce((sum, value) => sum + value, 0);
                  const code = item.barcode_value || item.qr_code_value || "";
                  const qrValue = item.qr_code_value || item.barcode_value || item.id;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&format=svg&data=${encodeURIComponent(qrValue)}`;
                  return <tr className={`app-cse-item ${selected.has(item.id) ? "is-selected" : ""}`} key={item.id} onPointerDown={() => startLongPress(item.id)} onPointerUp={cancelLongPress} onPointerLeave={cancelLongPress} onPointerCancel={cancelLongPress}><td>{canEdit && selected.size > 0 ? <input className="app-cse-select-box" type="checkbox" checked={selected.has(item.id)} onPointerDown={(event) => event.stopPropagation()} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.name}`} /> : catIndex + 1}{selected.has(item.id) && <i className="app-cse-selected-dot" />}</td><td><input disabled={!canEdit} defaultValue={code} placeholder={item.category?.name || "Code"} onBlur={(event) => saveItem(item, { barcode_value: event.target.value })} /></td><td><span className="app-cse-product">{isNewItem(item) && <i className="app-cse-new-badge" title="Added in the last 24 hours">New</i>}<button type="button" className="app-cse-qr-button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setQrItem(item); }} aria-label={`View QR code for ${item.name}`}><img src={qrUrl} alt="" title={qrValue} loading="lazy" /></button><span><input disabled={!canEdit} defaultValue={item.name} onBlur={(event) => saveItem(item, { name: event.target.value })} /><small>{item.description || ""}</small></span></span></td><td><input disabled={!canEdit} defaultValue={item.unit} onBlur={(event) => saveItem(item, { unit: event.target.value })} /></td>{cells(months, price).map((value, cellIndex) => <td key={cellIndex}>{cellIndex % 5 < 3 ? <input disabled={!canEdit} type="number" min="0" value={value} onChange={(event) => saveMonthlyPlan(item.id, Math.floor(cellIndex / 5) * 3 + (cellIndex % 5), event.target.value)} /> : value}</td>)}<td>{quantity}</td><td><input disabled={!canEdit} type="number" min="0" step=".01" defaultValue={price} onBlur={(event) => saveItem(item, { acquisition_cost: Number(event.target.value) || 0 })} /></td><td>{peso(quantity * price)}</td></tr>;
                })
              ])}
              <tr className="app-cse-grand"><td colSpan={26}>TOTAL APP-CSE REQUIREMENT (Part I + Part II)</td><td>{peso(part1Total + part2Total)}</td></tr>
            </tbody>
          </table>
        </div>

        {summarySection}
        {certificationSection}
      </section>
      )}
      {layout === "compact" && (
      <section className="app-cse-sheet app-cse-compact">
        <header className="app-cse-compact-header">
          <p>APP-CSE 2026 FORM — COMPACT VIEW</p>
          <h1>ANNUAL PROCUREMENT PLAN - COMMON-USE SUPPLIES AND EQUIPMENT (APP-CSE) 2026 FORM</h1>
          <small>Same data as the official template — organized for easier navigation.</small>
        </header>
        {toolbar}
        <div className="app-cse-compact-search">
          <Search className="app-cse-search-icon" />
          <input value={compactSearch} onChange={(event) => setCompactSearch(event.target.value)} placeholder="Search items by name, code, or category…" aria-label="Search items" />
          {compactSearch && <button type="button" className="app-cse-search-clear" onClick={() => setCompactSearch("")}>Clear</button>}
          <span className="app-cse-search-count">{compactPart1.length + compactPart2.length} of {items.length} items</span>
        </div>
        {bulkActions}
        {agencyFields}
        <section className="app-cse-compact-totals">
          <div><span>Part I total</span><strong>₱ {peso(compactPart1Total)}</strong></div>
          <div><span>Part II total</span><strong>₱ {peso(compactPart2Total)}</strong></div>
          <div className="grand"><span>Grand total</span><strong>₱ {peso(compactPart1Total + compactPart2Total)}</strong></div>
        </section>
        <section className="app-cse-compact-part">
          <h2>PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)</h2>
          {Object.entries(compactGroups).map(([category, categoryItems]) => compactCategory(category, categoryItems as any[]))}
          {Object.keys(compactGroups).length === 0 && <p className="app-cse-compact-empty">{compactQuery ? `No Part I items match "${compactSearch}".` : "No Part I items yet — import an XLSX or add items."}</p>}
        </section>
        <section className="app-cse-compact-part">
          <h2>PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES</h2>
          {Object.entries(compactItemGroups).map(([category, categoryItems]) => compactCategory(category, categoryItems as any[]))}
          {Object.keys(compactItemGroups).length === 0 && <p className="app-cse-compact-empty">{compactQuery ? `No Part II items match "${compactSearch}".` : "No Part II items yet — import an XLSX or add items."}</p>}
        </section>
        {summarySection}
        {certificationSection}
      </section>
      )}
      {(addOpen || editItem) && (
        <ItemDialog
          editing={editItem}
          cats={cats || []}
          sups={sups || []}
          onClose={() => { setAddOpen(false); setEditItem(null); }}
          onSaved={() => { setAddOpen(false); setEditItem(null); onItemsChanged(); }}
          onCategoryCreated={onCategoryCreated}
        />
      )}
      {qrItem && <QRLabelDialog item={qrItem} qrValue={qrValue} peso={peso} onClose={() => setQrItem(null)} />}
      <style>{`
@media print{body *{visibility:hidden!important}#inventory-print-label,#inventory-print-label *{visibility:visible!important}#inventory-print-label{position:fixed;left:0;top:0;width:76mm;max-width:none!important;border-color:#0f172a!important}}
`}</style>
    </main>
  );
}

function QRLabelDialog({ item, qrValue, peso, onClose }: { item: any; qrValue: string; peso: (v: number) => string; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrValue, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => active && setQrUrl(url))
      .catch(() => toast.error("Unable to generate this QR label."));
    return () => { active = false; };
  }, [qrValue]);

  function download() {
    const anchor = document.createElement("a");
    anchor.href = qrUrl;
    anchor.download = `${item.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-qr.png`;
    anchor.click();
  }

  async function copyCode() {
    await navigator.clipboard.writeText(qrValue);
    toast.success("Code copied");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-semibold">Inventory label</h2>
            <p className="text-xs text-muted-foreground">Print and attach this label to the item.</p>
          </div>
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted">Close</button>
        </div>
        <div className="p-5">
          <div id="inventory-print-label" className="mx-auto max-w-xs rounded-lg border-2 border-slate-900 bg-white p-4 text-center text-slate-950">
            <div className="text-xs font-bold uppercase tracking-wider">TESDA Inventory</div>
            <div className="mt-1 truncate text-base font-bold">{item.name}</div>
            {item.description && <div className="mt-0.5 text-[10px] text-slate-600">{item.description}</div>}
            {qrUrl ? (
              <img src={qrUrl} alt={`QR code for ${item.name}`} className="mx-auto mt-3 aspect-square w-52" />
            ) : (
              <div className="mx-auto mt-3 grid h-52 w-52 place-items-center bg-slate-100"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            )}
            <div className="mt-2 break-all font-mono text-[10px]">{qrValue}</div>
            <div className="mt-2 text-[10px] text-slate-600">Scan with the Supplify inventory scanner</div>
            {(item.quantity != null || item.acquisition_cost != null) && (
              <div className="mt-2 flex justify-center gap-4 border-t border-slate-200 pt-2 text-[10px] text-slate-600">
                {item.quantity != null && <span>Stock: {item.quantity} {item.unit || "units"}</span>}
                {item.acquisition_cost != null && <span>Price: {peso(Number(item.acquisition_cost || 0))}</span>}
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button onClick={() => void copyCode()} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-muted"><Clipboard className="h-4 w-4" /> Copy</button>
            <button onClick={download} disabled={!qrUrl} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"><Download className="h-4 w-4" /> Save</button>
            <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"><Printer className="h-4 w-4" /> Print</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const APP_CSE_DEFAULT_FIELDS: Record<string, string> = {
  department: "TESDA PROVINCIAL TRAINING CENTER-DAVAO DEL NORTE",
  agencyCode: "",
  region: "XI",
  organizationType: "NATIONAL GOVERNMENT AGENCY",
  contact: "ENGR. JENY E. BUSCANO",
  address: "ENERGY PARK, BRGY. APOKON, TAGUM CITY",
  email: "jebuscano@tesda.gov.ph",
  telephone: "09633771612",
  emailMobile: "jebuscano@tesda.gov.ph / 09633771612",
  position: "TESD SPECIALIST II",
  preparedBy: "ENGR. JENY E. BUSCANO",
  certifiedBy: "GINA MAY O. CALIMBAS",
  supplyOfficer: "ENGR. JENY E. BUSCANO",
  accountant: "",
  approvedBy: "ENGR. ALBERT N. MANINGO",
  preparedDate: "",
  supplyDate: "",
  accountantDate: "",
  approvedDate: "",
};

function CrudQrCatalog({ items, canEdit, onAdd, onEdit, onDelete }: any) {
  const [selected, setSelected] = useState<any | null>(null);
  const code = selected?.qr_code_value || selected?.barcode_value || selected?.id || "";
  const qrUrl = code ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=svg&data=${encodeURIComponent(code)}` : "";
  return <section className="inventory-crud"><div className="inventory-crud-head"><div><h2>Inventory Catalog</h2><p>Live database records. Create, edit, delete, and scan QR codes here.</p></div>{canEdit && <button onClick={onAdd}>Add item</button>}</div><div className="inventory-crud-grid"><div className="inventory-crud-table"><table><thead><tr><th>Item</th><th>Qty</th><th>Unit cost</th><th>QR</th>{canEdit && <th>Actions</th>}</tr></thead><tbody>{items.map((item: any) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.description || (item.barcode_value ? "" : "No item code")}</small></td><td>{item.quantity} {item.unit}</td><td>{money(Number(item.acquisition_cost || 0))}</td><td><button className="inventory-qr-button" onClick={() => setSelected(item)}>View QR</button></td>{canEdit && <td><button className="inventory-text-button" onClick={() => onEdit(item)}>Edit</button><button className="inventory-text-button danger" onClick={() => onDelete(item.id)}>Delete</button></td>}</tr>)}</tbody></table></div>{selected && <aside className="inventory-qr-card"><button className="inventory-qr-close" onClick={() => setSelected(null)}>×</button><h3>{selected.name}</h3><img src={qrUrl} alt={`QR code for ${selected.name}`} /><code>{code}</code><button onClick={() => navigator.clipboard?.writeText(code)}>Copy code</button></aside>}</div></section>;
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

function ClassificationBadge({ item }: { item: any }) {
  const label = classificationLabel(item);
  const tone =
    item.inventory_classification === "ppe"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      : item.inventory_classification === "semi_expendable_property"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";

  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${tone}`}>{label}</span>;
}

function classificationLabel(item: any) {
  if (item.inventory_classification === "ppe") return "PPE";
  if (item.inventory_classification === "semi_expendable_property") {
    return item.semi_expendable_tier === "high_value" ? "Semi-Exp. High" : "Semi-Exp. Low";
  }
  return "Expendable";
}

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value || 0);
}

const ITEM_MONTH_KEYS = ["jan_quantity", "feb_quantity", "mar_quantity", "apr_quantity", "may_quantity", "jun_quantity", "jul_quantity", "aug_quantity", "sep_quantity", "oct_quantity", "nov_quantity", "dec_quantity"] as const;
const ITEM_MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ItemDialog({ editing, cats, onClose, onSaved, onCategoryCreated }: any) {
  const [form, setForm] = useState<any>(() => ({
    barcode_value: editing?.barcode_value ?? "",
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    category_id: editing?.category_id ?? "",
    supplier_id: editing?.supplier_id ?? "",
    item_type: editing?.item_type ?? "supply",
    acquisition_cost: editing?.acquisition_cost ?? 0,
    unit: editing?.unit ?? "pieces",
    reorder_level: editing?.reorder_level ?? 10,
    ...Object.fromEntries(ITEM_MONTH_KEYS.map((key) => [key, Number(editing?.[key] ?? 0)])),
  }));
  const [localCats, setLocalCats] = useState<any[]>(() => cats || []);
  const [saving, setSaving] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const monthTotal = ITEM_MONTH_KEYS.reduce((sum, key) => sum + (Number(form[key]) || 0), 0);

  async function createCategoryInline() {
    const name = newCategory.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const created = await createCategory({ data: { name } });
      if (!created) return;
      setLocalCats((prev) => [created, ...prev.filter((c: any) => c.id !== created.id)]);
      setForm((current: any) => ({ ...current, category_id: created.id }));
      setNewCategory("");
      setAddingCategory(false);
      onCategoryCreated?.();
      toast.success(`Category "${name}" created`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      barcode_value: form.barcode_value?.trim() || null,
      name: form.name,
      description: form.description || null,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      item_type: form.item_type || "supply",
      acquisition_cost: Number(form.acquisition_cost) || 0,
      unit: form.unit,
      reorder_level: Number(form.reorder_level) || 10,
      quantity: monthTotal,
      ...Object.fromEntries(ITEM_MONTH_KEYS.map((key) => [key, Number(form[key]) || 0])),
    };
    try {
      if (editing) {
        await updateItem({ data: { ...payload, id: editing.id } });
      } else {
        await createItem({ data: payload });
      }
      setSaving(false);
      toast.success(editing ? "Item updated" : "Item created");
      onSaved();
    } catch (e: any) {
      setSaving(false);
      toast.error(e?.message ?? "Save failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <form onSubmit={save} className="bg-card border border-border rounded-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl">{editing ? "Edit item" : "Add new item"}</h2>
        <p className="text-xs text-muted-foreground">Fields match the APP-CSE 2026 template columns.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code">
            <input className="dlg-input" placeholder="PS-DBM code (e.g. 1234-5678)" value={form.barcode_value} onChange={(e) => setForm({ ...form, barcode_value: e.target.value })} />
          </Field>
          <Field label="Unit of Measure">
            <input className="dlg-input" list="item-unit-options" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <datalist id="item-unit-options"><option value="pieces" /><option value="gallon" /><option value="bottle" /><option value="pack" /><option value="box" /><option value="ream" /><option value="roll" /><option value="set" /><option value="unit" /><option value="ticket" /></datalist>
          </Field>
          <Field label="Item &amp; Specifications" full>
            <input className="dlg-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Unit Price">
            <input type="number" min={0} step="0.01" className="dlg-input" value={form.acquisition_cost} onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value as any })} />
          </Field>
          <Field label="Category">
            {addingCategory ? (
              <div className="flex gap-2">
                <input
                  className="dlg-input"
                  placeholder="New category name"
                  value={newCategory}
                  autoFocus
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createCategoryInline(); } }}
                />
                <button type="button" disabled={creatingCategory || !newCategory.trim()} onClick={createCategoryInline} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap disabled:opacity-50">
                  {creatingCategory ? "Creating…" : "Create"}
                </button>
                <button type="button" onClick={() => { setAddingCategory(false); setNewCategory(""); }} className="px-3 py-2 rounded-md border border-input text-sm whitespace-nowrap">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select className="dlg-input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">—</option>
                  {localCats.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <button type="button" onClick={() => setAddingCategory(true)} title="Create a new category" className="px-3 py-2 rounded-md border border-input text-sm whitespace-nowrap hover:bg-accent">+ New</button>
              </div>
            )}
          </Field>
          <div className="col-span-2">
            <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Monthly Quantity Requirement (Jan–Dec)</span>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ITEM_MONTH_KEYS.map((key, index) => (
                <label key={key} className="block">
                  <span className="text-[10px] uppercase text-muted-foreground">{ITEM_MONTH_LABELS[index]}</span>
                  <input type="number" min={0} className="dlg-input" value={form[key] ?? 0} onChange={(e) => setForm({ ...form, [key]: e.target.value as any })} />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Total quantity for the year: <strong>{monthTotal}</strong></p>
          </div>
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
