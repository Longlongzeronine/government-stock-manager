import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { listItems, listCategories, listSuppliers, createItem, updateItem, updateItemMonthlyQuantity, deleteItem, importItems } from "@/lib/data.functions";
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
        canEdit={isAdmin}
        onItemsChanged={() => qc.invalidateQueries({ queryKey: ["items"] })}
      />
      {open && (
        <ItemDialog
          editing={editing}
          cats={cats}
          sups={sups}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["items"] }); }}
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

const APP_CSE_PRODUCTS = [
  ["12191601-AL-E04", "ALCOHOL, Ethyl, 500 mL", "bottle", 4, 55.62], ["12191601-AL-E03", "ALCOHOL, Ethyl, 1 Gallon", "gallon", 0, 362.45],
  ["60121413-CB-P01", "CLEARBOOK, A4 size", "piece", 5, 35.52], ["60121413-CB-P02", "CLEARBOOK, Legal size", "piece", 2, 38.23], ["60121534-ER-P01", "ERASER, plastic/rubber", "piece", 0, 9.34],
  ["60121524-SP-G01", "SIGN PEN, Extra Fine Tip, Black", "piece", 5, 27.11], ["60121524-SP-G02", "SIGN PEN, Extra Fine Tip, Blue", "piece", 5, 27.11], ["60121524-SP-G03", "SIGN PEN, Extra Fine Tip, Red", "piece", 0, 27.11],
  ["60121524-SP-G04", "SIGN PEN, Fine Tip, Black", "piece", 5, 30.91], ["60121524-SP-G05", "SIGN PEN, Fine Tip, Blue", "piece", 5, 30.91], ["60121524-SP-G06", "SIGN PEN, Fine Tip, Red", "piece", 0, 30.91],
  ["60121524-SP-G07", "SIGN PEN, Medium Tip, Black", "piece", 12, 63.62], ["60121524-SP-G08", "SIGN PEN, Medium Tip, Blue", "piece", 12, 63.62], ["60121524-SP-G09", "SIGN PEN, Medium Tip, Red", "piece", 2, 63.62], ["60121124-WR-P01", "WRAPPING PAPER", "pack", 0, 163.62],
];

const APP_CSE_PLAN = [
  ["12191601-AL-E04", "ALCOHOL, Ethyl, 500 mL", "bottle", 55.62, [4,4,4,0,4,4,4,4,4,4,4,4], "ALCOHOL OR ACETONE BASED ANTISEPTICS"],
  ["12191601-AL-E03", "ALCOHOL, Ethyl, 1 Gallon", "gallon", 362.45, Array(12).fill(0), "ALCOHOL OR ACETONE BASED ANTISEPTICS"],
  ["60121413-CB-P01", "CLEARBOOK, A4 size", "piece", 35.52, [5,0,0,5,0,0,5,0,0,5,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121413-CB-P02", "CLEARBOOK, Legal size", "piece", 38.23, [2,0,0,2,0,0,2,0,0,2,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121534-ER-P01", "ERASER, plastic/rubber", "piece", 9.34, Array(12).fill(0), "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G01", "SIGN PEN, Extra Fine Tip, Black", "piece", 27.11, [5,0,0,5,0,0,5,0,0,5,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G02", "SIGN PEN, Extra Fine Tip, Blue", "piece", 27.11, [5,0,0,5,0,0,5,0,0,0,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G03", "SIGN PEN, Extra Fine Tip, Red", "piece", 27.11, Array(12).fill(0), "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G04", "SIGN PEN, Fine Tip, Black", "piece", 30.91, [5,0,0,5,0,0,5,0,0,5,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G05", "SIGN PEN, Fine Tip, Blue", "piece", 30.91, [5,0,0,5,0,0,5,0,0,5,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G06", "SIGN PEN, Fine Tip, Red", "piece", 30.91, Array(12).fill(0), "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G07", "SIGN PEN, Medium Tip, Black", "piece", 63.62, [12,0,0,12,0,0,12,0,0,12,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G08", "SIGN PEN, Medium Tip, Blue", "piece", 63.62, [12,0,0,12,0,0,12,0,0,12,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121524-SP-G09", "SIGN PEN, Medium Tip, Red", "piece", 63.62, [2,0,0,2,0,0,2,0,0,2,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
  ["60121124-WR-P01", "WRAPPING PAPER", "pack", 163.62, [0,0,0,0,3,0,0,0,0,0,0,0], "ARTS AND CRAFTS EQUIPMENT AND ACCESSORIES AND SUPPLIES"],
] as const;

type PlanRow = { id: string; code: string; name: string; unit: string; price: number; months: number[]; category: string };

function SpreadsheetInventory({ items, canEdit, onItemsChanged }: any) {
  const headings = ["Jan", "Feb", "Mar", "Q1", "Q1\nAMOUNT", "April", "May", "June", "Q2", "Q2\nAMOUNT", "July", "Aug", "Sept", "Q3", "Q3\nAMOUNT", "Oct", "Nov", "Dec", "Q4", "Q4\nAMOUNT"];
  const peso = (value: number) => value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cells = (months: readonly number[], price: number) => [0, 3, 6, 9].flatMap((start) => {
    const quarter = months.slice(start, start + 3);
    const quantity = quarter.reduce((sum, value) => sum + value, 0);
    return [...quarter, quantity, peso(quantity * price)];
  });
  const [monthlyPlan, setMonthlyPlan] = useState<Record<string, number[]>>({});
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [qrItem, setQrItem] = useState<any | null>(null);
  const pageSize = 20;
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importInput = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const monthsFor = (item: any) => monthlyPlan[item.id] || ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map((month, index) => Number(item[`${month}_quantity`] ?? (index === 0 ? item.quantity : 0)) || 0);
  const total = items.reduce((sum: number, item: any) => sum + monthsFor(item).reduce((all, quantity) => all + quantity, 0) * Number(item.acquisition_cost || 0), 0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pagedItems = items.slice(page * pageSize, page * pageSize + pageSize);
  const inflation = total * 0.1;
  const grandTotal = total + inflation;
  const qrValue = qrItem ? qrItem.qr_code_value || qrItem.barcode_value || qrItem.id : "";
  const qrFullUrl = qrValue ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&format=svg&data=${encodeURIComponent(qrValue)}` : "";
  const [fields, setFields] = useState<Record<string, string>>(() => ({ ...APP_CSE_DEFAULT_FIELDS }));
  const [history, setHistory] = useState<Record<string, string[]>>({});

  useEffect(() => {
    try {
      setFields((current) => ({ ...current, ...JSON.parse(localStorage.getItem("app-cse-document-fields") || "{}") }));
      setHistory(JSON.parse(localStorage.getItem("app-cse-document-history") || "{}"));
    } catch {}
  }, []);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const goToPage = () => {
    const requestedPage = Number(pageInput);
    const nextPage = Number.isInteger(requestedPage) ? Math.min(totalPages, Math.max(1, requestedPage)) - 1 : page;
    setPage(nextPage);
    setPageInput(String(nextPage + 1));
  };

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
      const headerIndex = rows.findIndex((row) => row.some((cell) => /item|description|product|name/i.test(String(cell))) && row.some((cell) => /unit/i.test(String(cell))));
      const headers = (headerIndex >= 0 ? rows[headerIndex] : []).map((cell) => String(cell).trim().toLowerCase());
      const column = (...terms: string[]) => headers.findIndex((header) => terms.some((term) => header.includes(term)));
      const itemHeader = column("item", "description", "product", "name");
      const templateLayout = itemHeader === 0 && !headers[1] && !headers[2];
      const nameColumn = templateLayout ? 2 : itemHeader;
      const codeColumn = templateLayout ? 1 : column("code", "barcode", "sku");
      const unitColumn = column("unit");
      const quantityColumn = column("total quantity", "quantity", "qty");
      const priceColumn = column("unit price", "price", "cost");
      const toNumber = (value: unknown) => Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
      const imported = rows.slice(headerIndex >= 0 ? headerIndex + 1 : 0).map((row) => ({
        name: String(row[nameColumn >= 0 ? nameColumn : 0] || "").trim(),
        barcode_value: String(row[codeColumn] || "").trim(),
        unit: String(row[unitColumn] || "pcs").trim(),
        quantity: toNumber(row[quantityColumn]),
        acquisition_cost: toNumber(row[priceColumn]),
      })).filter((item) => item.name && !/^part\s+[ivx]/i.test(item.name) && !/^(total|item\s*&)/i.test(item.name));
      if (!imported.length) throw new Error("No product rows found. Use a sheet with Item and Unit columns.");
      const result = await importItems({ data: { items: imported } });
      onItemsChanged();
      toast.success(`Import complete: ${result.added} added, ${result.skipped} skipped`);
    } catch (error: any) {
      toast.error(error?.message ?? "XLSX import failed");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <main className="app-cse-shell">
      <section className="app-cse-sheet app-cse-template">
        <header className="app-cse-template-header">
          <p>APP-CSE 2026 FORM</p>
          <h1>ANNUAL PROCUREMENT PLAN - COMMON-USE SUPPLIES AND EQUIPMENT (APP-CSE) 2026 FORM</h1>
        </header>
        <section className="app-cse-template-copy">
          <h2>Introduction</h2>
          <p>This form contains common-use supplies and equipment carried by PS-DBM. The APP-CSE serves as the agency’s annual procurement request for its CSE requirements.</p>
          <h2>Reminders</h2>
          <ol><li>Provide all information accurately.</li><li>Use prescribed APP-CSE form format.</li><li>Signed and approved form must be uploaded with required supporting files.</li></ol>
          <strong>Note: APP-CSE for FY 2026 must be submitted on or before 31 August 2025.</strong>
        </section>
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
        {canEdit && <div className="app-cse-import"><input ref={importInput} type="file" accept=".xlsx,.xls" onChange={importXlsx} /><button disabled={importing} onClick={() => importInput.current?.click()}>{importing ? "Importing…" : "Import XLSX"}</button><span>Existing name/code: skip. New product: add.</span></div>}
        {canEdit && selected.size > 0 && <div className="app-cse-bulk-actions"><span><i />Selection mode · {selected.size} selected</span><button onClick={() => setSelected(new Set(items.map((item: any) => item.id)))}>Select all</button><button onClick={() => setSelected(new Set())}>Clear</button><button className="danger" onClick={deleteSelected}>Delete selected</button></div>}
        <nav className="app-cse-pagination app-cse-pagination-top" aria-label="Inventory pages, top">
          <span>Showing {items.length ? page * pageSize + 1 : 0}-{Math.min((page + 1) * pageSize, items.length)} of {items.length}</span>
          <button type="button" onClick={() => setPage((current) => Math.max(0, current - 10))} disabled={page === 0}>−10 pages</button>
          <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Previous</button>
          <label>Page <input type="number" min="1" max={totalPages} inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value)} onBlur={goToPage} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} aria-label={`Page number, 1 to ${totalPages}`} /> of {totalPages}</label>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page === totalPages - 1}>Next</button>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 10))} disabled={page === totalPages - 1}>+10 pages</button>
        </nav>
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
              {pagedItems.map((item: any, index: number) => {
                const months = monthsFor(item);
                const price = Number(item.acquisition_cost || 0);
                const quantity = months.reduce((sum, value) => sum + value, 0);
                const code = item.barcode_value || item.qr_code_value || "";
                const qrValue = item.qr_code_value || item.barcode_value || item.id;
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&format=svg&data=${encodeURIComponent(qrValue)}`;
                return <tr className={`app-cse-item ${selected.has(item.id) ? "is-selected" : ""}`} key={item.id} onPointerDown={() => startLongPress(item.id)} onPointerUp={cancelLongPress} onPointerLeave={cancelLongPress} onPointerCancel={cancelLongPress}><td>{canEdit && selected.size > 0 ? <input className="app-cse-select-box" type="checkbox" checked={selected.has(item.id)} onPointerDown={(event) => event.stopPropagation()} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.name}`} /> : page * pageSize + index + 1}{selected.has(item.id) && <i className="app-cse-selected-dot" />}</td><td><input disabled={!canEdit} defaultValue={code} placeholder={item.category?.name || "Code"} onBlur={(event) => saveItem(item, { barcode_value: event.target.value })} /></td><td><span className="app-cse-product"><button type="button" className="app-cse-qr-button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setQrItem(item); }} aria-label={`View QR code for ${item.name}`}><img src={qrUrl} alt="" title={qrValue} loading="lazy" /></button><span><input disabled={!canEdit} defaultValue={item.name} onBlur={(event) => saveItem(item, { name: event.target.value })} /><small>{item.description || item.category?.name || ""}</small></span></span></td><td><input disabled={!canEdit} defaultValue={item.unit} onBlur={(event) => saveItem(item, { unit: event.target.value })} /></td>{cells(months, price).map((value, cellIndex) => <td key={cellIndex}>{cellIndex % 5 < 3 ? <input disabled={!canEdit} type="number" min="0" value={value} onChange={(event) => saveMonthlyPlan(item.id, Math.floor(cellIndex / 5) * 3 + (cellIndex % 5), event.target.value)} /> : value}</td>)}<td>{quantity}</td><td><input disabled={!canEdit} type="number" min="0" step=".01" defaultValue={price} onBlur={(event) => saveItem(item, { acquisition_cost: Number(event.target.value) || 0 })} /></td><td>{peso(quantity * price)}</td></tr>;
              })}
              <tr className="app-cse-grand"><td colSpan={26}>TOTAL APP-CSE REQUIREMENT</td><td>{peso(total)}</td></tr>
            </tbody>
          </table>
        </div>

        <section className="app-cse-summary">
          <h2>PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)</h2>
          <p>A. TOTAL <output>₱ {peso(total)}</output></p><p>B. ADDITIONAL PROVISION FOR INFLATION (10% of TOTAL) <output>₱ {peso(inflation)}</output></p><p>C. ADDITIONAL PROVISION FOR TRANSPORT AND FREIGHT COST (If Applicable) <output>₱ 0.00</output></p><p>D. GRAND TOTAL (A + B + C) <output>₱ {peso(grandTotal)}</output></p><p>E. APPROVED BUDGET BY THE AGENCY HEAD / In Figures and Words:</p>
          <h2>PART II. OTHER ITEMS NOT AVAILABLE AT PS-DBM BUT ARE REGULARLY PURCHASED FROM OTHER SOURCES</h2>
          <p>Consistent with DBM Circular Letter No. 2011-6, agencies shall include regular non-PS-DBM requirements in their APP-CSE.</p>
          <p>A. TOTAL <output>₱ 0.00</output></p><p>B. ADDITIONAL PROVISION FOR INFLATION (10% of TOTAL) <output>₱ 0.00</output></p><p>C. ADDITIONAL PROVISION FOR TRANSPORT AND FREIGHT COST (If Applicable) <output>₱ 0.00</output></p><p>D. GRAND TOTAL (A + B + C) <output>₱ 0.00</output></p><p>E. APPROVED BUDGET BY THE AGENCY HEAD / In Figures and Words:</p>
        </section>
        <section className="app-cse-certification">
          <p>We hereby warrant that total amount reflected in this Annual Procurement Plan has been included in or is within approved budget for the year.</p>
          <div><article><span>Prepared by:</span>{field("preparedBy", "", "app-cse-signature-input")}<em>Property/Supply Officer</em></article><article><span>Certified Funds Available / Certified Appropriate Funds Available:</span>{field("certifiedBy", "", "app-cse-signature-input")}<em>Accountant / Budget Officer</em></article><article><span>Approved by:</span>{field("approvedBy", "", "app-cse-signature-input")}<em>Head of Office/Agency</em></article></div>
        </section>
      </section>
      {qrItem && <div className="app-cse-qr-modal" role="dialog" aria-modal="true" aria-label={`QR code for ${qrItem.name}`} onClick={() => setQrItem(null)}><article onClick={(event) => event.stopPropagation()}><button type="button" className="app-cse-qr-close" onClick={() => setQrItem(null)} aria-label="Close QR card">×</button><img src={qrFullUrl} alt={`QR code for ${qrItem.name}`} /><h2>{qrItem.name}</h2><p>{qrItem.description || "No description available."}</p><dl><div><dt>Code</dt><dd>{qrValue}</dd></div><div><dt>Stock</dt><dd>{qrItem.quantity ?? 0} {qrItem.unit || "units"}</dd></div><div><dt>Unit price</dt><dd>{peso(Number(qrItem.acquisition_cost || 0))}</dd></div></dl></article></div>}
    </main>
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

function StaticSpreadsheetInventory({ items, onAdd, canEdit }: any) {
  const [fields, setFields] = useState<Record<string, string>>(APP_CSE_DEFAULT_FIELDS);
  const [history, setHistory] = useState<Record<string, string[]>>({});
  useEffect(() => {
    try {
      setFields((current) => ({ ...current, ...JSON.parse(localStorage.getItem("app-cse-document-fields") || "{}") }));
      setHistory(JSON.parse(localStorage.getItem("app-cse-document-history") || "{}"));
    } catch {}
  }, []);
  const update = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const remember = (key: string) => {
    const value = fields[key]?.trim();
    const next = value ? { ...history, [key]: Array.from(new Set([value, ...(history[key] || [])])).slice(0, 20) } : history;
    localStorage.setItem("app-cse-document-fields", JSON.stringify(fields));
    localStorage.setItem("app-cse-document-history", JSON.stringify(next));
    setHistory(next);
  };
  const headings = ["Jan", "Feb", "Mar", "Q1", "Q1\nAMOUNT", "April", "May", "June", "Q2", "Q2\nAMOUNT", "July", "Aug", "Sept", "Q3", "Q3\nAMOUNT", "Oct", "Nov", "Dec", "Q4", "Q4\nAMOUNT"];
  const peso = (value: number) => value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cells = (months: readonly number[], price: number) => [0, 3, 6, 9].flatMap((start) => { const q = months.slice(start, start + 3), total = q.reduce((sum, value) => sum + value, 0); return [...q, total, peso(total * price)]; });
  const totalAmount = APP_CSE_PLAN.reduce((sum, [, , , price, months]) => sum + months.reduce((total, quantity) => total + quantity, 0) * price, 0);
  const groups = APP_CSE_PLAN.reduce<Record<string, typeof APP_CSE_PLAN[number][]>>((all, product) => { (all[product[5]] ||= []).push(product); return all; }, {});
  const field = (key: string, label: string, type = "text") => <label className="app-cse-doc-field" key={key}><span>{label}</span><input type={type} list={`app-cse-history-${key}`} value={fields[key] || ""} onChange={(event) => update(key, event.target.value)} onBlur={() => remember(key)} /><datalist id={`app-cse-history-${key}`}>{(history[key] || []).map((value) => <option key={value} value={value} />)}</datalist></label>;
  return <main className="app-cse-shell"><section className="app-cse-sheet"><h1>ANNUAL PROCUREMENT PLAN - COMMON-USE SUPPLIES AND EQUIPMENT (APP-CSE) 2026 FORM</h1><h2>TESDA Provincial Training Center - Davao del Norte · {items.length} local inventory records</h2><section className="app-cse-document-fields">{field("department", "Department/Bureau/Office")}{field("region", "Region / Organization Type")}{field("contact", "Contact Person")}{field("address", "Address")}{field("emailMobile", "E-mail / Mobile")}{field("position", "Position")}</section><div className="app-cse-actions">{canEdit && <button onClick={onAdd}>Add inventory item</button>}</div><div className="app-cse-table-wrap"><table className="app-cse-table"><thead><tr><th rowSpan={2} colSpan={3} className="c-item">Item &amp; Specifications</th><th rowSpan={2} className="c-unit">Unit of{`\n`}Measure</th><th colSpan={20}>Monthly Quantity Requirement</th><th rowSpan={2}>Total Quantity{`\n`}for the year</th><th rowSpan={2}>Unit Price{`\n`}as of May 14, 2025</th><th rowSpan={2}>Total Amount{`\n`}for the year</th></tr><tr>{headings.map((heading) => <th className="c-number" key={heading}>{heading}</th>)}</tr></thead><tbody><tr className="app-cse-part"><td colSpan={27}>PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)</td></tr>{Object.entries(groups).flatMap(([category, products]) => [<tr className="app-cse-category" key={category}><td colSpan={27}>{category}</td></tr>, ...products.map(([code, name, unit, price, months]) => { const total = months.reduce((sum, quantity) => sum + quantity, 0); return <tr className="app-cse-item" key={code}><td>{APP_CSE_PLAN.findIndex((product) => product[0] === code) + 1}</td><td>{code}</td><td>{name}</td><td>{unit}</td>{cells(months, price).map((value, index) => <td key={index}>{value}</td>)}<td>{total}</td><td>{peso(price)}</td><td>{peso(total * price)}</td></tr>; })])}<tr className="app-cse-grand"><td colSpan={26}>TOTAL APP-CSE REQUIREMENT</td><td>{peso(totalAmount)}</td></tr></tbody></table></div><section className="app-cse-signatures"><p>Prepared, certified, reviewed, and approved by:</p><div>{field("preparedBy", "Prepared by")}{field("supplyOfficer", "Property/Supply Officer")}{field("accountant", "Accountant/Budget Officer")}{field("approvedBy", "Head of Agency/Office")}{field("preparedDate", "Date", "date")}{field("supplyDate", "Date", "date")}{field("accountantDate", "Date", "date")}{field("approvedDate", "Date", "date")}</div></section></section></main>;
}

function LegacySpreadsheetInventory({ items, onAdd, onEdit, onDelete, canEdit }: any) {
  const headings = ["Jan", "Feb", "Mar", "Q1", "Q1\nAMOUNT", "April", "May", "June", "Q2", "Q2\nAMOUNT", "July", "Aug", "Sept", "Q3", "Q3\nAMOUNT", "Oct", "Nov", "Dec", "Q4", "Q4\nAMOUNT"];
  const peso = (value: number) => value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const quarterlyCells = (months: readonly number[], price: number) => [0, 3, 6, 9].flatMap((start) => { const quarter = months.slice(start, start + 3); const quantity = quarter.reduce((sum, value) => sum + value, 0); return [...quarter, quantity, peso(quantity * price)]; });
  const totalAmount = APP_CSE_PLAN.reduce((sum, [, , , price, months]) => sum + months.reduce((total, quantity) => total + quantity, 0) * price, 0);
  const groups = APP_CSE_PLAN.reduce<Record<string, typeof APP_CSE_PLAN[number][]>>((all, product) => { (all[product[5]] ||= []).push(product); return all; }, {});

  return <main className="app-cse-shell"><section className="app-cse-sheet"><h1>ANNUAL PROCUREMENT PLAN - COMMON-USE SUPPLIES AND EQUIPMENT (APP-CSE) 2026 FORM</h1><h2>TESDA Provincial Training Center - Davao del Norte · {items.length} local inventory records</h2><section className="app-cse-document-fields"><label className="app-cse-doc-field"><span>Department/Bureau/Office</span><output>TESDA PROVINCIAL TRAINING CENTER-DAVAO DEL NORTE</output></label><label className="app-cse-doc-field"><span>Region / Organization Type</span><output>XI / NATIONAL GOVERNMENT AGENCY</output></label><label className="app-cse-doc-field"><span>Contact Person</span><output>ENGR. JENY E. BUSCANO</output></label><label className="app-cse-doc-field"><span>Address</span><output>ENERGY PARK, BRGY. APOKON, TAGUM CITY</output></label><label className="app-cse-doc-field"><span>E-mail / Mobile</span><output>jebuscano@tesda.gov.ph / 09633771612</output></label><label className="app-cse-doc-field"><span>Position</span><output>TESD SPECIALIST II</output></label></section><div className="app-cse-actions">{canEdit && <button onClick={onAdd}>Add inventory item</button>}</div><div className="app-cse-table-wrap"><table className="app-cse-table"><thead><tr><th rowSpan={2} className="c-no">#</th><th rowSpan={2} className="c-code">PS-DBM Code</th><th rowSpan={2} className="c-item">Item &amp; Specifications</th><th rowSpan={2} className="c-unit">Unit of Measure</th><th colSpan={20}>Monthly Quantity Requirement</th><th rowSpan={2}>Total Quantity{`\n`}for year</th><th rowSpan={2}>Unit Price{`\n`}as of May 14, 2025</th><th rowSpan={2}>Total Amount{`\n`}for year</th></tr><tr>{headings.map((heading) => <th className="c-number" key={heading}>{heading}</th>)}</tr></thead><tbody><tr className="app-cse-part"><td colSpan={27}>PART I. AVAILABLE AT PS-DBM (MAIN WAREHOUSE AND DEPOTS)</td></tr>{Object.entries(groups).flatMap(([category, products]) => [<tr className="app-cse-category" key={category}><td colSpan={27}>{category}</td></tr>, ...products.map(([code, name, unit, price, months]) => { const total = months.reduce((sum, quantity) => sum + quantity, 0); return <tr className="app-cse-item" key={code}><td>{APP_CSE_PLAN.findIndex((product) => product[0] === code) + 1}</td><td>{code}</td><td>{name}</td><td>{unit}</td>{quarterlyCells(months, price).map((value, index) => <td key={index}>{value}</td>)}<td>{total}</td><td>{peso(price)}</td><td>{peso(total * price)}</td></tr>; })])}<tr className="app-cse-grand"><td colSpan={26}>TOTAL APP-CSE REQUIREMENT</td><td>{peso(totalAmount)}</td></tr></tbody></table></div></section></main>;

  const [rows, setRows] = useState(() => APP_CSE_PRODUCTS.map(([code, name, unit, quantity, price]) => ({ code, name, unit, quantity: String(quantity), price: String(price) })));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, string[]>>({});
  useEffect(() => { try { setFields(JSON.parse(localStorage.getItem("app-cse-document-fields") || "{}")); setHistory(JSON.parse(localStorage.getItem("app-cse-document-history") || "{}")); } catch {} }, []);
  const setField = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const saveFields = () => { const next = { ...history }; Object.entries(fields).forEach(([key, value]) => { if (value.trim()) next[key] = Array.from(new Set([value.trim(), ...(next[key] || [])])).slice(0, 20); }); localStorage.setItem("app-cse-document-fields", JSON.stringify(fields)); localStorage.setItem("app-cse-document-history", JSON.stringify(next)); setHistory(next); toast.success("Document fields saved"); };
  const update = (index: number, key: string, value: string) => setRows((current) => current.map((row, i) => i === index ? { ...row, [key]: value } : row));
  const displayRows = items.length ? items.map((item: any) => ({ id: item.id, code: item.category?.name || "—", name: item.name, unit: item.unit, quantity: String(item.quantity ?? 0), price: String(item.acquisition_cost ?? 0) })) : rows;
  const fieldNames = [["department", "Department/Office"], ["region", "Region"], ["fundCluster", "Fund Cluster"], ["contact", "Contact Person"], ["prepared", "Prepared By"], ["property", "Property/Supply Officer"], ["accountant", "Accountant/Budget Officer"], ["approved", "Approved By"]];
  return <main className="app-cse-shell"><section className="app-cse-sheet"><h1>Inventory procurement plan</h1><h2>{items.length} live inventory records · worksheet layout inspired by APP-CSE 2026</h2><section className="app-cse-document-fields">{fieldNames.map(([key, label]) => <label className="app-cse-doc-field" key={key}><span>{label}</span><input list={`history-${key}`} value={fields[key] || ""} onChange={(e) => setField(key, e.target.value)} /><datalist id={`history-${key}`}>{(history[key] || []).map((value) => <option key={value} value={value} />)}</datalist></label>)}<button type="button" onClick={saveFields}>Save details</button></section><div className="app-cse-actions">{canEdit && <button onClick={onAdd}>Add item</button>}</div><div className="app-cse-table-wrap"><table className="app-cse-table"><thead><tr><th>#</th><th>Category</th><th>Item &amp; Specifications</th><th>Unit</th><th>Qty</th><th>Total Qty</th><th>Unit Price</th><th>Total Amount</th><th>Actions</th></tr></thead><tbody>{displayRows.map((row: any, index: number) => { const qty = Number(row.quantity || 0), price = Number(row.price || 0), live = Boolean(row.id); return <tr className="app-cse-item editable" key={row.id || index}><td>{index + 1}</td><td><input readOnly={live} value={row.code} onChange={(e) => update(index, "code", e.target.value)} /></td><td><input readOnly={live} value={row.name} onChange={(e) => update(index, "name", e.target.value)} /></td><td><input readOnly={live} value={row.unit} onChange={(e) => update(index, "unit", e.target.value)} /></td><td><input readOnly={live} type="number" value={row.quantity} onChange={(e) => update(index, "quantity", e.target.value)} /></td><td>{qty}</td><td><input readOnly={live} type="number" step=".01" value={row.price} onChange={(e) => update(index, "price", e.target.value)} /></td><td>{money(qty * price)}</td><td>{live && canEdit && <span className="app-cse-row-actions"><button onClick={() => onEdit(row)}>Edit</button><button onClick={() => onDelete(row.id)}>Delete</button></span>}</td></tr>; })}</tbody></table></div></section></main>;
}

function CrudQrCatalog({ items, canEdit, onAdd, onEdit, onDelete }: any) {
  const [selected, setSelected] = useState<any | null>(null);
  const code = selected?.qr_code_value || selected?.barcode_value || selected?.id || "";
  const qrUrl = code ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=svg&data=${encodeURIComponent(code)}` : "";
  return <section className="inventory-crud"><div className="inventory-crud-head"><div><h2>Inventory Catalog</h2><p>Live database records. Create, edit, delete, and scan QR codes here.</p></div>{canEdit && <button onClick={onAdd}>Add item</button>}</div><div className="inventory-crud-grid"><div className="inventory-crud-table"><table><thead><tr><th>Item</th><th>Qty</th><th>Unit cost</th><th>QR</th>{canEdit && <th>Actions</th>}</tr></thead><tbody>{items.map((item: any) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.description || item.category?.name || "No item code"}</small></td><td>{item.quantity} {item.unit}</td><td>{money(Number(item.acquisition_cost || 0))}</td><td><button className="inventory-qr-button" onClick={() => setSelected(item)}>View QR</button></td>{canEdit && <td><button className="inventory-text-button" onClick={() => onEdit(item)}>Edit</button><button className="inventory-text-button danger" onClick={() => onDelete(item.id)}>Delete</button></td>}</tr>)}</tbody></table></div>{selected && <aside className="inventory-qr-card"><button className="inventory-qr-close" onClick={() => setSelected(null)}>×</button><h3>{selected.name}</h3><img src={qrUrl} alt={`QR code for ${selected.name}`} /><code>{code}</code><button onClick={() => navigator.clipboard?.writeText(code)}>Copy code</button></aside>}</div></section>;
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

function ItemDialog({ editing, cats, sups, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    description: editing?.description ?? "",
    category_id: editing?.category_id ?? "",
    supplier_id: editing?.supplier_id ?? "",
    item_type: editing?.item_type ?? "supply",
    acquisition_cost: editing?.acquisition_cost ?? 0,
    quantity: editing?.quantity ?? 0,
    unit: editing?.unit ?? "pieces",
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
      acquisition_cost: Number(form.acquisition_cost),
      reorder_level: Number(form.reorder_level),
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
      <form onSubmit={save} className="bg-card border border-border rounded-lg w-full max-w-xl p-6 space-y-4">
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
          <Field label="Acquisition cost">
            <input type="number" min={0} step="0.01" className="dlg-input" value={form.acquisition_cost} onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value as any })} />
          </Field>
          <Field label="Quantity">
            <input type="number" min={0} className="dlg-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value as any })} />
          </Field>
          <Field label="Unit">
            <input className="dlg-input" list="item-unit-options" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            <datalist id="item-unit-options"><option value="pieces" /><option value="gallon" /><option value="bottle" /><option value="pack" /><option value="box" /><option value="ream" /><option value="roll" /><option value="set" /><option value="unit" /><option value="ticket" /></datalist>
          </Field>
          <Field label="Reorder level">
            <input type="number" min={0} className="dlg-input" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value as any })} />
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
