import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/stock")({
  head: () => ({ meta: [{ title: "Stock In / Out — GovInventory" }] }),
  component: Stock,
});

function Stock() {
  const { canWrite, user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: txs = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => (await supabase.from("transactions").select("*, item:items(id,name,unit)").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => (await supabase.from("items").select("id,name,quantity,unit").order("name")).data ?? [],
  });

  return (
    <div>
      <PageHeader
        title="Stock Movement"
        subtitle="Record stock in and stock out transactions"
        actions={canWrite && (
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Record movement
          </button>
        )}
      />
      <div className="p-6 lg:p-8">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Quantity</th>
                <th className="text-left px-4 py-3">Staff</th>
                <th className="text-left px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t: any) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-2.5 tabular-nums text-xs">{format(new Date(t.created_at), "MMM d, yyyy HH:mm")}</td>
                  <td className="px-4 py-2.5">{t.item?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${t.type === "IN" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}>{t.type}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{t.quantity} {t.item?.unit}</td>
                  <td className="px-4 py-2.5">{t.staff_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.remarks ?? "—"}</td>
                </tr>
              ))}
              {txs.length === 0 && (<tr><td colSpan={6} className="p-12 text-center text-sm text-muted-foreground">No transactions recorded.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {open && <MovementDialog items={items} userId={user?.id} userName={user?.user_metadata?.full_name || user?.email || ""}
        onClose={() => setOpen(false)}
        onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["transactions"] }); qc.invalidateQueries({ queryKey: ["items"] }); }} />}
    </div>
  );
}

function MovementDialog({ items, userId, userName, onClose, onSaved }: any) {
  const [form, setForm] = useState({ item_id: "", type: "IN", quantity: 1, remarks: "" });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.item_id) return toast.error("Select an item");
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      item_id: form.item_id, type: form.type, quantity: Number(form.quantity),
      staff_id: userId, staff_name: userName, remarks: form.remarks || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Movement recorded");
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm grid place-items-center z-50 p-4">
      <form onSubmit={save} className="bg-card border border-border rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-xl">Record Stock Movement</h2>
        <label className="block"><span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Item</span>
          <select required value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} className="dlg-input mt-1.5">
            <option value="">Select item…</option>
            {items.map((i: any) => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Type</span>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="dlg-input mt-1.5">
              <option value="IN">Stock IN</option><option value="OUT">Stock OUT</option>
            </select>
          </label>
          <label className="block"><span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Quantity</span>
            <input type="number" min={1} required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value as any })} className="dlg-input mt-1.5" />
          </label>
        </div>
        <label className="block"><span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Remarks</span>
          <textarea rows={2} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className="dlg-input mt-1.5" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-input text-sm">Cancel</button>
          <button disabled={saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{saving ? "Saving…" : "Record"}</button>
        </div>
        <style>{`.dlg-input{width:100%;border:1px solid var(--color-input);background:var(--color-card);border-radius:6px;padding:.5rem .7rem;font-size:.875rem;outline:none}.dlg-input:focus{border-color:var(--color-ring);box-shadow:0 0 0 3px color-mix(in oklab,var(--color-ring) 25%,transparent)}`}</style>
      </form>
    </div>
  );
}
