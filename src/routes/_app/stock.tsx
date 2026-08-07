import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listItems, listTransactions, createTransaction } from "@/lib/data.functions";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { MobileCard, MobileCardRow } from "@/components/common/MobileCard";
import { ArrowLeftRight, PackageCheck, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_app/stock")({
  head: () => ({ meta: [{ title: "Stock In / Out — Supplify" }] }),
  component: Stock,
});

function Stock() {
  const { canWrite, user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"all" | "issued">("issued");
  const [search, setSearch] = useState("");
  const { data: txs = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => listTransactions({ data: { limit: 200 } }),
    refetchInterval: 3000,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => listItems(),
    refetchInterval: 3000,
  });

  const isMobileView = useIsMobile();
  const issuedTransactions = useMemo(
    () =>
      txs.filter(
        (transaction: any) =>
          transaction.type === "OUT" &&
          (transaction.source_form_type === "RIS" ||
            String(transaction.remarks || "").startsWith("RIS ")),
      ),
    [txs],
  );
  const visibleTransactions = useMemo(() => {
    const source = view === "issued" ? issuedTransactions : txs;
    const needle = search.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((transaction: any) =>
      [
        transaction.item?.name,
        transaction.staff_name,
        transaction.remarks,
      ].some((value) => String(value || "").toLowerCase().includes(needle)),
    );
  }, [issuedTransactions, search, txs, view]);
  const totalIssued = issuedTransactions.reduce(
    (sum: number, transaction: any) => sum + Number(transaction.quantity),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Stock Movement"
        subtitle="Review issued RIS inventory and all stock movements"
        actions={
          canWrite && (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Record movement
            </button>
          )
        }
      />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard icon={PackageCheck} label="Issued RIS lines" value={issuedTransactions.length} />
          <SummaryCard icon={ArrowLeftRight} label="Total quantity issued" value={totalIssued} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button onClick={() => setView("issued")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "issued" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>Issued Transactions</button>
            <button onClick={() => setView("all")} className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "all" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>All Movements</button>
          </div>
          <div className="relative sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search RIS, item, office, or staff" className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm" />
          </div>
        </div>
        {/* Desktop Table View */}
        {!isMobileView && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Quantity</th>
                  <th className="text-left px-4 py-3">Staff</th>
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Office</th>
                  <th className="text-left px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((t: any) => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5 tabular-nums text-xs">
                      {format(new Date(t.created_at), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-2.5">{t.item?.name ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${t.type === "IN" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {t.quantity} {t.item?.unit}
                    </td>
                    <td className="px-4 py-2.5">{t.staff_name ?? "—"}</td>
                    <td className="px-4 py-2.5 font-medium">{transactionReference(t)}</td>
                    <td className="px-4 py-2.5">{transactionOffice(t)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.remarks ?? "—"}</td>
                  </tr>
                ))}
                {visibleTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-sm text-muted-foreground">
                      No transactions match this view.
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
            {visibleTransactions.map((t: any) => (
              <MobileCard key={t.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base">{t.item?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(t.created_at), "MMM d, yyyy HH:mm")}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-md border shrink-0 ${t.type === "IN" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}
                  >
                    {t.type}
                  </span>
                </div>
                <div className="border-t border-border pt-2 space-y-2">
                  <MobileCardRow 
                    label="Quantity" 
                    value={`${t.quantity} ${t.item?.unit ?? ""}`} 
                  />
                  <MobileCardRow label="Staff" value={t.staff_name ?? "—"} />
                  <MobileCardRow label="Reference" value={transactionReference(t)} />
                  <MobileCardRow label="Office" value={transactionOffice(t)} />
                  {t.remarks && (
                    <div className="pt-1">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">Remarks</span>
                      <p className="text-sm mt-1">{t.remarks}</p>
                    </div>
                  )}
                </div>
              </MobileCard>
            ))}
            {visibleTransactions.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground bg-card border border-border rounded-lg">
                No transactions recorded.
              </div>
            )}
          </div>
        )}
      </div>

      {open && canWrite && (
        <MovementDialog
          items={items}
          userId={user?.id}
          userName={user?.user_metadata?.full_name || user?.email || ""}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["transactions"] });
            qc.invalidateQueries({ queryKey: ["items"] });
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function transactionReference(transaction: any) {
  const firstPart = String(transaction.remarks || "")
    .split("|")[0]
    ?.trim();
  return firstPart || transaction.source_form_type || "—";
}

function transactionOffice(transaction: any) {
  const office = String(transaction.remarks || "")
    .split("|")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("office:"));
  return office ? office.slice(7).trim() : "—";
}

function MovementDialog({ items, userId, userName, onClose, onSaved }: any) {
  const [form, setForm] = useState({ item_id: "", type: "IN", quantity: 1, remarks: "" });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
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
          remarks: form.remarks || null,
        },
      });
      setSaving(false);
      toast.success("Movement recorded");
      onSaved();
    } catch (e: any) {
      setSaving(false);
      toast.error(e?.message ?? "Save failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <form
        onSubmit={save}
        className="bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4"
      >
        <h2 className="text-xl">Record Stock Movement</h2>
        <label className="block">
          <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
            Item
          </span>
          <select
            required
            value={form.item_id}
            onChange={(e) => setForm({ ...form, item_id: e.target.value })}
            className="dlg-input mt-1.5"
          >
            <option value="">Select item…</option>
            {items.map((i: any) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.quantity} {i.unit})
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Type
            </span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="dlg-input mt-1.5"
            >
              <option value="IN">Stock IN</option>
              <option value="OUT">Stock OUT</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Quantity
            </span>
            <input
              type="number"
              min={1}
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value as any })}
              className="dlg-input mt-1.5"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
            Remarks
          </span>
          <textarea
            rows={2}
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            className="dlg-input mt-1.5"
          />
        </label>
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
            {saving ? "Saving…" : "Record"}
          </button>
        </div>
        <style>{`.dlg-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.5rem .7rem;font-size:.875rem;outline:none}.dlg-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}`}</style>
      </form>
    </div>
  );
}
